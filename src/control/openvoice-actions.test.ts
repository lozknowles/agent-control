import assert from 'node:assert/strict';
import test from 'node:test';
import {ActionFailure, ActionRegistry} from './job-runtime.js';
import {registerOpenVoiceActions, type OpenVoiceActionName} from './openvoice-actions.js';

test('OpenVoice Actions are explicit control-owned registrations', () => {
  const registry = registerOpenVoiceActions(new ActionRegistry(), async action => ({ok: true, reportPath: `/evidence/${action}.json`, report: {ok: true, action}}));
  const expected = [
    'openvoice.v2.preflight@1.0.0',
    'openvoice.v2.install@1.0.0',
    'openvoice.v2.cpu-qualify@1.0.0',
    'openvoice.v2.gpu-qualify@1.0.0',
    'openvoice.v2.compare@1.0.0',
    'openvoice.v2.hygiene@1.0.0',
  ];
  assert.deepEqual([...registry.ids()].filter(id => id.startsWith('openvoice.')), expected);
  for (const id of expected) assert.equal(registry.kind(id), 'control');
});

test('OpenVoice Action emits only JSON evidence and named verification', async () => {
  const seen: OpenVoiceActionName[] = [];
  const registry = registerOpenVoiceActions(new ActionRegistry(), async action => { seen.push(action); return {ok: true, reportPath: '/evidence/cpu.json', report: {ok: true, device: 'cpu', sampleHashes: ['abc']}}; });
  const output = await registry.handler('openvoice.v2.cpu-qualify@1.0.0')({signal: new AbortController().signal} as never);
  assert.deepEqual(seen, ['qualify-cpu']);
  assert.deepEqual(output.verification, ['openvoice-cpu-smoke-pass']);
  assert.equal(output.artifacts?.[0].name, 'report');
  assert.equal((output.artifacts?.[0].value as {device: string}).device, 'cpu');
});

test('OpenVoice Action failure does not become successful evidence', async () => {
  const registry = registerOpenVoiceActions(new ActionRegistry(), async () => { throw new ActionFailure('guard_failed', 'verification'); });
  await assert.rejects(() => registry.handler('openvoice.v2.gpu-qualify@1.0.0')({signal: new AbortController().signal} as never), /guard_failed/);
});
