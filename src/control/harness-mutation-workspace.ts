import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {ExecutionRecipe, ToolDefinition} from './adaptive-harness.js';
import type {ToolHandlerBinding} from './harness-dispatch.js';
import type {MutationBenchmarkTask} from './harness-mutation-benchmark.js';
import {LocalCommandExecutor} from './repository-search.js';
import type {StructuredChatToolSchema} from './structured-chat-loop-provider.js';

export const MUTATION_TOOL_IDS = Object.freeze({
  read: 'mutation.repository.read',
  search: 'mutation.repository.search',
  replace: 'mutation.repository.replace',
  write: 'mutation.repository.write',
  test: 'mutation.repository.test',
  finish: 'mutation.finish',
});

export const MUTATION_TOOL_SCHEMAS: StructuredChatToolSchema[] = [
  {id: MUTATION_TOOL_IDS.read, description: 'Read one authorised repository file or a bounded line range. Input: path, optional startLine/endLine.', inputSchema: {type: 'object', properties: {path: {type: 'string'}, startLine: {type: 'integer'}, endLine: {type: 'integer'}}, required: ['path'], additionalProperties: false}},
  {id: MUTATION_TOOL_IDS.search, description: 'Literal compact repository search. Returns file and line indexes; use read to expand selected files.', inputSchema: {type: 'object', properties: {query: {type: 'string'}, paths: {type: 'array', items: {type: 'string'}}, caseSensitive: {type: 'boolean'}}, required: ['query'], additionalProperties: false}},
  {id: MUTATION_TOOL_IDS.replace, description: 'Replace an exact string in one task-authorised file. Input oldText/newText and optional expectedOccurrences.', inputSchema: {type: 'object', properties: {path: {type: 'string'}, oldText: {type: 'string'}, newText: {type: 'string'}, expectedOccurrences: {type: 'integer'}}, required: ['path', 'oldText', 'newText'], additionalProperties: false}},
  {id: MUTATION_TOOL_IDS.write, description: 'Write complete bounded content to one task-authorised file. Intended for a new test or a small full-file correction.', inputSchema: {type: 'object', properties: {path: {type: 'string'}, content: {type: 'string'}}, required: ['path', 'content'], additionalProperties: false}},
  {id: MUTATION_TOOL_IDS.test, description: 'Run the fixture public Node test suite. It accepts no command, arguments or shell input.', inputSchema: {type: 'object', additionalProperties: false}},
  {id: MUTATION_TOOL_IDS.finish, description: 'Stop the attempt after testing or when safely blocked. This is not verifier acceptance.', inputSchema: {type: 'object', properties: {summary: {type: 'string'}, blocked: {type: 'boolean'}, reason: {type: 'string'}}, additionalProperties: false}},
];

export const MUTATION_TOOL_DEFINITIONS: ToolDefinition[] = [
  {id: MUTATION_TOOL_IDS.read, risk: 'read', capabilities: ['repository.read.bounded']},
  {id: MUTATION_TOOL_IDS.search, risk: 'read', capabilities: ['repository.search.compact']},
  {id: MUTATION_TOOL_IDS.replace, risk: 'write', capabilities: ['repository.mutate.bounded']},
  {id: MUTATION_TOOL_IDS.write, risk: 'write', capabilities: ['repository.mutate.bounded']},
  {id: MUTATION_TOOL_IDS.test, risk: 'read', capabilities: ['repository.verify.public']},
  {id: MUTATION_TOOL_IDS.finish, risk: 'read', capabilities: ['execution.stop.typed']},
];

export interface MutationWorkspaceCounters {
  repositoryReads: number;
  repositorySearches: number;
  mutationsAttempted: number;
  verifierFacingTests: number;
  toolCalls: number;
  toolIds: string[];
}

export interface PreparedMutationWorkspace {
  workspace: MutationWorkspace;
  startingRevision: string;
  fixtureSha256: string;
}

export class MutationWorkspace {
  readonly root: string;
  private readonly temporaryRoot: string;
  private readonly command = new LocalCommandExecutor();
  private counters: MutationWorkspaceCounters = emptyCounters();

  private constructor(root: string, temporaryRoot: string, readonly task: MutationBenchmarkTask, readonly signal?: AbortSignal) {
    this.root = fs.realpathSync(root);
    this.temporaryRoot = fs.realpathSync(temporaryRoot);
  }

  static prepare(fixtureRoot: string, task: MutationBenchmarkTask, signal?: AbortSignal): PreparedMutationWorkspace {
    const authoritativeFixture = fs.realpathSync(fixtureRoot);
    const fixtureSha256 = fixtureContentSha256(authoritativeFixture);
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-mutation-'));
    const root = path.join(temporaryRoot, 'workspace');
    fs.cpSync(authoritativeFixture, root, {recursive: true, errorOnExist: true, verbatimSymlinks: true});
    execGit(root, ['init', '--quiet']);
    execGit(root, ['config', 'user.name', 'Agent Control Mutation Fixture']);
    execGit(root, ['config', 'user.email', 'fixture.invalid@agent-control.invalid']);
    execGit(root, ['add', '--all']);
    execGit(root, ['commit', '--quiet', '-m', 'Frozen mutation fixture']);
    const startingRevision = execGit(root, ['rev-parse', 'HEAD']).trim();
    return {workspace: new MutationWorkspace(root, temporaryRoot, task, signal), startingRevision, fixtureSha256};
  }

  toolBindings(): ToolHandlerBinding[] {
    return [
      {toolId: MUTATION_TOOL_IDS.read, handler: async input => this.read(input)},
      {toolId: MUTATION_TOOL_IDS.search, handler: async input => this.search(input)},
      {toolId: MUTATION_TOOL_IDS.replace, handler: async input => this.replace(input)},
      {toolId: MUTATION_TOOL_IDS.write, handler: async input => this.write(input)},
      {toolId: MUTATION_TOOL_IDS.test, handler: (_input, recipe) => this.test(recipe)},
      {toolId: MUTATION_TOOL_IDS.finish, handler: async input => this.finish(input)},
    ];
  }

  resetCounters() { this.counters = emptyCounters(); }
  getCounters(): MutationWorkspaceCounters { return structuredClone(this.counters); }
  changedFiles(): string[] { return lines(execGit(this.root, ['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD'])).sort(); }
  diff(): string { return execGit(this.root, ['diff', '--binary', '--no-ext-diff', '--no-color', 'HEAD']); }
  diffSha256(): string { return createHash('sha256').update(this.diff()).digest('hex'); }
  statusSummary() { return {changedFiles: this.changedFiles(), diffSha256: this.diffSha256()}; }

  cleanup() {
    const allowedParent = fs.realpathSync(os.tmpdir());
    const relative = path.relative(allowedParent, this.temporaryRoot);
    if (!relative.startsWith('agent-control-mutation-') || relative.includes(path.sep) || path.isAbsolute(relative)) throw new Error('mutation_workspace_cleanup_boundary_invalid');
    fs.rmSync(this.temporaryRoot, {recursive: true, force: true});
  }

  private read(input: unknown) {
    this.record(MUTATION_TOOL_IDS.read); this.counters.repositoryReads++;
    const value = object(input, ['path', 'startLine', 'endLine']);
    const file = this.authorizeExistingFile(value.path);
    const content = readText(file, 512_000), all = content.split(/\r?\n/);
    const startLine = value.startLine === undefined ? 1 : integer(value.startLine, 1, Math.max(1, all.length));
    const endLine = value.endLine === undefined ? Math.min(all.length, startLine + 399) : integer(value.endLine, startLine, Math.min(all.length, startLine + 399));
    const selected = all.slice(startLine - 1, endLine).map((line, index) => `${String(startLine + index).padStart(4, ' ')} | ${line}`).join('\n');
    return {path: this.relative(file), startLine, endLine, totalLines: all.length, complete: startLine === 1 && endLine === all.length, content: selected};
  }

  private search(input: unknown) {
    this.record(MUTATION_TOOL_IDS.search); this.counters.repositorySearches++;
    const value = object(input, ['query', 'paths', 'caseSensitive']);
    if (typeof value.query !== 'string' || !value.query.length || value.query.length > 512 || value.query.includes('\0')) throw new Error('mutation_search_query_invalid');
    if (value.caseSensitive !== undefined && typeof value.caseSensitive !== 'boolean') throw new Error('mutation_search_case_invalid');
    const requested = value.paths === undefined ? ['.'] : stringArray(value.paths, 32);
    const files = requested.flatMap(item => this.filesUnder(this.authorizeExisting(item))).filter((item, index, values) => values.indexOf(item) === index).sort();
    const needle = value.caseSensitive ? value.query : value.query.toLowerCase();
    const matches: Array<{path: string; lines: number[]; matches: number}> = [];
    let totalMatches = 0;
    for (const file of files.slice(0, 500)) {
      const content = readText(file, 512_000), lineNumbers: number[] = [];
      for (const [index, line] of content.split(/\r?\n/).entries()) {
        const haystack = value.caseSensitive ? line : line.toLowerCase();
        let offset = 0, count = 0;
        while ((offset = haystack.indexOf(needle, offset)) >= 0) { count++; offset += Math.max(1, needle.length); }
        if (count) { lineNumbers.push(index + 1); totalMatches += count; }
      }
      if (lineNumbers.length) matches.push({path: this.relative(file), lines: lineNumbers.slice(0, 100), matches: lineNumbers.length});
    }
    return {query: value.query, filesSearched: Math.min(files.length, 500), filesWithMatches: matches.length, totalMatches, compactIndex: matches.slice(0, 100), completeIndex: matches.length <= 100};
  }

  private replace(input: unknown) {
    this.record(MUTATION_TOOL_IDS.replace); this.counters.mutationsAttempted++;
    const value = object(input, ['path', 'oldText', 'newText', 'expectedOccurrences']);
    const file = this.authorizeWritable(value.path, false);
    if (typeof value.oldText !== 'string' || !value.oldText.length || value.oldText.length > 65_536 || typeof value.newText !== 'string' || value.newText.length > 131_072) throw new Error('mutation_replace_text_invalid');
    const expected = value.expectedOccurrences === undefined ? 1 : integer(value.expectedOccurrences, 1, 1_000);
    const content = readText(file, 512_000), occurrences = countOccurrences(content, value.oldText);
    if (occurrences !== expected) throw new Error(`mutation_replace_occurrences:${occurrences}:${expected}`);
    const updated = content.split(value.oldText).join(value.newText);
    if (Buffer.byteLength(updated, 'utf8') > 512_000) throw new Error('mutation_file_size_limit');
    atomicWrite(file, updated);
    return {ok: true, path: this.relative(file), occurrences, ...this.statusSummary()};
  }

  private write(input: unknown) {
    this.record(MUTATION_TOOL_IDS.write); this.counters.mutationsAttempted++;
    const value = object(input, ['path', 'content']);
    const file = this.authorizeWritable(value.path, true);
    if (typeof value.content !== 'string' || Buffer.byteLength(value.content, 'utf8') > 131_072 || value.content.includes('\0')) throw new Error('mutation_write_content_invalid');
    fs.mkdirSync(path.dirname(file), {recursive: true});
    atomicWrite(file, value.content);
    execGit(this.root, ['add', '--intent-to-add', '--', this.relative(file)]);
    return {ok: true, path: this.relative(file), bytes: Buffer.byteLength(value.content, 'utf8'), ...this.statusSummary()};
  }

  private async test(recipe: ExecutionRecipe) {
    this.record(MUTATION_TOOL_IDS.test); this.counters.verifierFacingTests++;
    const tests = fs.readdirSync(path.join(this.root, 'test')).filter(name => name.endsWith('.test.js')).sort().map(name => path.join('test', name));
    const result = await this.command.execute({command: process.execPath, args: ['--test', ...tests], cwd: this.root, timeoutMs: Math.min(60_000, recipe.resourceLimits.maximumLatencyMs ?? 60_000), maxCaptureBytesPerStream: 32_768, backend: 'disposable-mutation-workspace', signal: this.signal});
    return {passed: result.exitCode === 0 && !result.timedOut && !result.cancelled, exitCode: result.exitCode, timedOut: result.timedOut, cancelled: result.cancelled, stdout: result.stdout, stderr: result.stderr, ...this.statusSummary()};
  }

  private finish(input: unknown) {
    this.record(MUTATION_TOOL_IDS.finish);
    const value = object(input ?? {}, ['summary', 'blocked', 'reason']);
    if (value.summary !== undefined && (typeof value.summary !== 'string' || value.summary.length > 2_048)) throw new Error('mutation_finish_summary_invalid');
    if (value.blocked !== undefined && typeof value.blocked !== 'boolean') throw new Error('mutation_finish_blocked_invalid');
    if (value.reason !== undefined && (typeof value.reason !== 'string' || value.reason.length > 512)) throw new Error('mutation_finish_reason_invalid');
    return {stopped: true, blocked: value.blocked === true, summaryRecorded: typeof value.summary === 'string', ...this.statusSummary()};
  }

  private authorizeExisting(value: unknown) {
    const relative = validRelative(value);
    const resolved = path.resolve(this.root, relative);
    if (!fs.existsSync(resolved)) throw new Error('mutation_workspace_path_missing');
    const real = fs.realpathSync(resolved);
    this.assertInside(real);
    if (this.relative(real).split('/').some(part => ['.git', 'node_modules'].includes(part))) throw new Error('mutation_workspace_path_denied');
    return real;
  }

  private authorizeExistingFile(value: unknown) {
    const file = this.authorizeExisting(value);
    if (!fs.statSync(file).isFile()) throw new Error('mutation_workspace_file_required');
    return file;
  }

  private authorizeWritable(value: unknown, allowMissing: boolean) {
    const relative = validRelative(value);
    if (!this.task.allowedFiles.includes(relative)) throw new Error(`mutation_scope_violation:${relative}`);
    const resolved = path.resolve(this.root, relative);
    this.assertInside(resolved);
    if (fs.existsSync(resolved)) {
      const real = fs.realpathSync(resolved); this.assertInside(real);
      if (!fs.statSync(real).isFile() || fs.lstatSync(resolved).isSymbolicLink()) throw new Error('mutation_workspace_write_target_invalid');
      return real;
    }
    if (!allowMissing) throw new Error('mutation_workspace_path_missing');
    const parent = fs.realpathSync(path.dirname(resolved)); this.assertInside(parent);
    return resolved;
  }

  private filesUnder(target: string): string[] {
    if (fs.statSync(target).isFile()) return [target];
    const output: string[] = [];
    for (const entry of fs.readdirSync(target, {withFileTypes: true})) {
      if (['.git', 'node_modules'].includes(entry.name) || entry.isSymbolicLink()) continue;
      const child = path.join(target, entry.name);
      if (entry.isDirectory()) output.push(...this.filesUnder(child));
      else if (entry.isFile() && fs.statSync(child).size <= 512_000 && !binaryFile(child)) output.push(child);
    }
    return output;
  }

  private assertInside(value: string) {
    const relative = path.relative(this.root, value);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('mutation_workspace_path_outside');
  }
  private relative(value: string) { return path.relative(this.root, value).split(path.sep).join('/'); }
  private record(toolId: string) { this.counters.toolCalls++; this.counters.toolIds.push(toolId); }
}

export function fixtureContentSha256(root: string): string {
  const authoritative = fs.realpathSync(root), hash = createHash('sha256');
  for (const file of walk(authoritative).sort()) {
    const relative = path.relative(authoritative, file).split(path.sep).join('/');
    hash.update(relative).update('\0').update(fs.readFileSync(file)).update('\0');
  }
  return hash.digest('hex');
}

function walk(root: string): string[] {
  const output: string[] = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    if (['.git', 'node_modules'].includes(entry.name) || entry.isSymbolicLink()) continue;
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walk(child)); else if (entry.isFile()) output.push(child);
  }
  return output;
}
function execGit(cwd: string, args: string[]): string { return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000}); }
function readText(file: string, maximumBytes: number) { const stat = fs.statSync(file); if (stat.size > maximumBytes || binaryFile(file)) throw new Error('mutation_workspace_text_file_limit'); return fs.readFileSync(file, 'utf8'); }
function binaryFile(file: string) { return fs.readFileSync(file).subarray(0, 8_192).includes(0); }
function atomicWrite(file: string, content: string) { const temporary = `${file}.agent-control-tmp`; fs.writeFileSync(temporary, content, {encoding: 'utf8', mode: 0o600}); fs.renameSync(temporary, file); }
function countOccurrences(content: string, needle: string) { let count = 0, offset = 0; while ((offset = content.indexOf(needle, offset)) >= 0) { count++; offset += needle.length; } return count; }
function object(value: unknown, fields: string[]) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('mutation_tool_input_invalid'); const result = value as Record<string, unknown>; if (Object.keys(result).some(key => !fields.includes(key))) throw new Error('mutation_tool_input_unknown_field'); return result; }
function stringArray(value: unknown, maximum: number): string[] { if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string')) throw new Error('mutation_tool_paths_invalid'); return value as string[]; }
function integer(value: unknown, minimum: number, maximum: number) { if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new Error('mutation_tool_integer_invalid'); return Number(value); }
function validRelative(value: unknown): string { if (typeof value !== 'string' || !value.length || value.length > 512 || value.includes('\0') || path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || value.split(/[\\/]/).includes('..')) throw new Error('mutation_workspace_path_invalid'); return value.split('\\').join('/'); }
function lines(value: string) { return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean); }
function emptyCounters(): MutationWorkspaceCounters { return {repositoryReads: 0, repositorySearches: 0, mutationsAttempted: 0, verifierFacingTests: 0, toolCalls: 0, toolIds: []}; }
