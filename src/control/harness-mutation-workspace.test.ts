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
    await registry.invoke(MUTATION_TOOL_IDS.replace, {path: 'src/constants.js', oldText: '30_000', newText: '45_000'}, recipe);
    assert.deepEqual(prepared.workspace.changedFiles(), ['src/constants.js']);
    assert.match(prepared.workspace.diff(), /45_000/);
  } finally { prepared.workspace.cleanup(); }
});

test('mutation workspace rejects path escape, forbidden writes and duplicate replacement ambiguity', async () => {
  const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), suite.tasks[0]);
  try {
    const registry = createToolHandlerRegistry(prepared.workspace.toolBindings()), recipe = {} as never;
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.read, {path: '../outside'}, recipe), /path_invalid/);
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.write, {path: 'src/policy.js', content: 'unsafe'}, recipe), /scope_violation/);
    await assert.rejects(() => registry.invoke(MUTATION_TOOL_IDS.replace, {path: 'src/constants.js', oldText: "'FAILED'", newText: "'BROKEN'"}, recipe), /occurrences/);
  } finally { prepared.workspace.cleanup(); }
});

test('new allowlisted files become authoritative Git diff content and cleanup is bounded', async () => {
  const task = suite.tasks.find(item => item.id === 'MUT-003')!, prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
  const temporaryRoot = path.dirname(prepared.workspace.root);
  const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
  await registry.invoke(MUTATION_TOOL_IDS.write, {path: 'test/human-takeover.test.js', content: "export const marker = 'test';\n"}, {} as never);
  assert.deepEqual(prepared.workspace.changedFiles(), ['test/human-takeover.test.js']);
  assert.match(prepared.workspace.diff(), /new file mode/);
  prepared.workspace.cleanup();
  assert.equal(fs.existsSync(temporaryRoot), false);
});

test('fixture content hash is deterministic and excludes no declared source', () => {
  assert.equal(fixtureContentSha256(path.join(root, suite.fixturePath)), fixtureContentSha256(path.join(root, suite.fixturePath)));
});
