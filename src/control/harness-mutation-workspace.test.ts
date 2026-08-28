import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createToolHandlerRegistry} from './harness-dispatch.js';
import {parseMutationBenchmarkSuite} from './harness-mutation-benchmark.js';
import {MUTATION_TOOL_IDS, MutationWorkspace, fixtureContentSha256} from './harness-mutation-workspace.js';

const root = process.cwd(), suite = parseMutationBenchmarkSuite(JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'harness-mutation-jobs.json'), 'utf8')));

test('disposable workspace preserves fixture identity and exposes compact inspect then scoped mutation', async () => {
  const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), suite.tasks[0]);
  try {
    assert.equal(prepared.fixtureSha256, suite.fixtureSha256);
    assert.match(prepared.startingRevision, /^[a-f0-9]{40}$/);
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
    const recipe = {} as never;
    const search = await registry.invoke(MUTATION_TOOL_IDS.search, {query: 'DEFAULT_JOB_TIMEOUT_MS'}, recipe) as any;
    assert.ok(search.totalMatches >= 1);
    assert.ok(search.compactIndex.every((item: any) => Array.isArray(item.lines)));
    const read = await registry.invoke(MUTATION_TOOL_IDS.read, {path: 'src/constants.js', startLine: 1, endLine: 4}, recipe) as any;
    assert.match(read.content, /DEFAULT_JOB_TIMEOUT_MS/);
    assert.equal(read.content.startsWith('export const DEFAULT_JOB_TIMEOUT_MS'), true);
    assert.equal(read.content.includes('   1 | '), false);
    assert.equal(read.startLine, 1);
    assert.equal(read.endLine, 4);
    await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'replace', path: 'src/constants.js', oldText: '30_000', newText: '45_000'}]}, recipe);
    assert.deepEqual(prepared.workspace.changedFiles(), ['src/constants.js']);
    assert.match(prepared.workspace.diff(), /45_000/);
  } finally { prepared.workspace.cleanup(); }
});

test('mutation workspace rejects path escape, forbidden writes and duplicate replacement ambiguity', async () => {
  const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), suite.tasks[0]);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings()), recipe = {} as never;
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.read, {path: '../outside'}, recipe), /path_invalid/);
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'write', path: 'src/policy.js', content: 'unsafe'}]}, recipe), /scope_violation/);
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'replace', path: 'src/constants.js', oldText: "'FAILED'", newText: "'BROKEN'"}]}, recipe), /occurrences/);
  } finally { prepared.workspace.cleanup(); }
});

test('new allowlisted files become authoritative Git diff content and cleanup is bounded', async () => {
  const task = suite.tasks.find(item => item.id === 'MUT-003')!, prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
  const temporaryRoot = path.dirname(prepared.workspace.root);
  const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
  await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'write', path: 'test/human-takeover.test.js', content: "export const marker = 'test';\n"}]}, {} as never);
  assert.deepEqual(prepared.workspace.changedFiles(), ['test/human-takeover.test.js']);
  assert.match(prepared.workspace.diff(), /new file mode/);
  prepared.workspace.cleanup();
  assert.equal(fs.existsSync(temporaryRoot), false);
});

test('governed mutation preflight reports diff hygiene before public tests', async () => {
  const task = suite.tasks.find(item => item.id === 'MUT-003')!, prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
    await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'write', path: 'test/human-takeover.test.js', content: "const value = 1; \n"}]}, {} as never);
    const result = await registry.invoke(MUTATION_TOOL_IDS.test, {}, {resourceLimits: {maximumLatencyMs: 30_000}} as never) as any;
    assert.equal(result.passed, false);
    assert.equal(result.phase, 'git_diff_check');
    assert.match(result.stdout, /trailing whitespace/);
  } finally { prepared.workspace.cleanup(); }
});

test('atomic edit batches coordinate files and leave no partial mutation on validation failure', async () => {
  const task = suite.tasks.find(item => item.id === 'MUT-005')!, prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings()), recipe = {} as never;
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [
      {type: 'replace', path: 'src/constants.js', oldText: "'FAILED'", newText: "'BROKEN'", expectedOccurrences: 2},
      {type: 'replace', path: 'src/job-state.js', oldText: 'missing anchor', newText: 'never written'},
    ]}, recipe), /occurrences/);
    assert.equal(prepared.workspace.diff(), '');
    const result = await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [
      {type: 'replace', path: 'src/constants.js', oldText: "Object.freeze(['SUCCEEDED', 'FAILED'])", newText: "Object.freeze(['SUCCEEDED', 'FAILED', 'CANCELLED'])"},
      {type: 'replace', path: 'src/job-state.js', oldText: "RUNNING: ['VERIFICATION_PENDING', 'FAILED']", newText: "RUNNING: ['VERIFICATION_PENDING', 'FAILED', 'CANCELLED']"},
    ]}, recipe) as any;
    assert.equal(result.operations, 2);
    assert.deepEqual(result.paths, ['src/constants.js', 'src/job-state.js']);
    const inspected = await registry.invoke(MUTATION_TOOL_IDS.diff, {}, recipe) as any;
    assert.equal(inspected.complete, true);
    assert.match(inspected.content, /CANCELLED/);
  } finally { prepared.workspace.cleanup(); }
});

test('finish rejects an unblocked no-mutation claim but permits an explicit safe block', async () => {
  const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), suite.tasks[0]);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings()), recipe = {} as never;
    const rejected = await registry.invoke(MUTATION_TOOL_IDS.finish, {summary: 'done'}, recipe) as any;
    assert.equal(rejected.stopped, false);
    assert.equal(rejected.error, 'mutation_required_before_finish');
    const blocked = await registry.invoke(MUTATION_TOOL_IDS.finish, {blocked: true, reason: 'insufficient evidence'}, recipe) as any;
    assert.equal(blocked.stopped, true);
    assert.equal(blocked.blocked, true);
  } finally { prepared.workspace.cleanup(); }
});

test('finish requires a successful current preflight and edits invalidate earlier proof', async () => {
  const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), suite.tasks[0]);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings()), recipe = {resourceLimits: {maximumLatencyMs: 30_000}} as never;
    await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'replace', path: 'src/constants.js', oldText: '30_000', newText: '45_000'}]}, recipe);
    const unverified = await registry.invoke(MUTATION_TOOL_IDS.finish, {}, recipe) as any;
    assert.equal(unverified.error, 'successful_preflight_required_before_finish');
    const tested = await registry.invoke(MUTATION_TOOL_IDS.test, {}, recipe) as any;
    assert.equal(tested.passed, true);
    assert.equal((await registry.invoke(MUTATION_TOOL_IDS.finish, {}, recipe) as any).stopped, true);
    prepared.workspace.beginVerifierRepair();
    assert.equal((await registry.invoke(MUTATION_TOOL_IDS.finish, {}, recipe) as any).error, 'successful_preflight_required_before_finish');
    assert.equal((await registry.invoke(MUTATION_TOOL_IDS.test, {}, recipe) as any).passed, true);
    await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'replace', path: 'src/constants.js', oldText: '45_000', newText: '46_000'}]}, recipe);
    assert.equal((await registry.invoke(MUTATION_TOOL_IDS.finish, {}, recipe) as any).error, 'successful_preflight_required_before_finish');
  } finally { prepared.workspace.cleanup(); }
});

test('fixture content hash is deterministic and excludes no declared source', () => {
  assert.equal(fixtureContentSha256(path.join(root, suite.fixturePath)), fixtureContentSha256(path.join(root, suite.fixturePath)));
});
