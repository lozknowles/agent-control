import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildGlancesRuntime, validateNode, type GlancesNode} from './glances-integration.js';
const node: GlancesNode = {id: 'test-node', address: '100.70.1.2', platform: 'linux', python: 'python3', allowed: ['100.70.1.2'], transport: {type: 'ssh', host: 'test-node'}};
test('inventory rejects shell operands and non-tailnet addresses', () => {
  for (const invalid of [{...node, id: '-bad'}, {...node, address: '0.0.0.0'}, {...node, allowed: ['100.999.1.2']}, {...node, python: 'python;id'}, {...node, transport: {type: 'ssh', host: '-oProxyCommand=bad'}}]) assert.throws(() => validateNode(invalid as GlancesNode));
});
test('change waits for named approval; actual adapter report produces evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glances-test-'));
  let calls = 0;
  try {
    const runtime = buildGlancesRuntime([node], root, async (command, args, input) => {
      calls++; assert.equal(command, 'ssh'); assert.ok(args.includes('BatchMode=yes'));
      assert.ok(input.includes("operation_not_allowed"));
      return {status: 0, stdout: JSON.stringify({schema: 'agent-control.glances-operation/v1', operation: 'install'}), stderr: ''};
    });
    const run = runtime.createRun('glances-test-node-change@1.0.0', {operation: 'install'}, {type: 'manual', actor: 'test'});
    await runtime.tick(); assert.equal(calls, 0);
    assert.equal(runtime.ledger.get(run.id)?.steps[0].status, 'WAITING_FOR_APPROVAL');
    runtime.approve(run.id, 'monitoring.glances.change'); await runtime.tick();
    assert.equal(calls, 1); assert.equal(runtime.ledger.get(run.id)?.status, 'SUCCEEDED');
    assert.equal(runtime.ledger.get(run.id)?.artifacts.length, 1);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
test('remote failure and malformed evidence cannot pass qualification', async () => {
  for (const result of [{status: 255, stdout: '', stderr: 'Permission denied'}, {status: 0, stdout: '{}', stderr: ''}]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glances-test-'));
    try {
      const runtime = buildGlancesRuntime([node], root, async () => result);
      const run = runtime.createRun('glances-test-node-inspect@1.0.0', {operation: 'inspect'}, {type: 'manual', actor: 'test'});
      await runtime.tick(); assert.ok(['FAILED', 'DEGRADED'].includes(runtime.ledger.get(run.id)!.status));
    } finally { fs.rmSync(root, {recursive: true, force: true}); }
  }
});
