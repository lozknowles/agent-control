import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {emptyConfig} from './config.js';
import {createInvocationObservation} from './harness-efficiency.js';
import {buildJobRuntime, runJobSchedulerTick} from './job-bootstrap.js';

test('production bootstrap wires persistent telemetry and configured harness policy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-harness-bootstrap-'));
  try {
    const config = {...emptyConfig(), harnessEfficiency: {routingMode: 'observe' as const, profiles: {THIN: {maximumInitialContextTokens: 2_048}}}};
    const first = buildJobRuntime(config, root, path.join(root, 'manifests'));
    assert.equal(first.harnessProfiles.THIN.maximumInitialContextTokens, 2_048);
    assert.equal(first.harnessProfileRouter.route({taskId: 'bounded', complexity: .1, risk: 'low', knownExactTargets: true, estimatedFiles: 1, deterministicVerifier: true, ambiguity: .1, architectural: false}).appliedProfile, 'STANDARD');
    assert.throws(() => first.contextPacketBuilder.build('THIN', [{id: 'required', kind: 'task_context', estimatedTokens: 2_049, required: true, relevance: 1, provenanceIds: ['fixture']}]), /required_budget_exceeded/);
    first.harnessEfficiency.record(createInvocationObservation({id: 'inv-bootstrap', jobId: 'job-bootstrap', taskId: 'task-bootstrap', laneId: 'lane-bootstrap', model: 'model-fixture', provider: 'provider-fixture', harnessProfile: 'STANDARD', executionStrategy: 'fixture', startedAt: '2026-08-27T10:00:00.000Z', completedAt: '2026-08-27T10:00:01.000Z', recipeFingerprint: 'recipe-bootstrap'}));
    const reloaded = buildJobRuntime(config, root, path.join(root, 'manifests'));
    assert.equal(reloaded.harnessEfficiency.list()[0].id, 'inv-bootstrap');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('scheduler boundary reports an unexpected tick failure and remains callable', async () => {
  let calls = 0; const failures: string[] = [], changes: string[] = [];
  const runtime = {async tickSchedules() { calls++; if (calls === 1) throw new Error('scheduler_fixture_failure'); return []; }, async tick() { return undefined; }};
  await runJobSchedulerTick(runtime, (runId, status) => changes.push(`${runId}:${status}`), error => failures.push(error.message));
  await runJobSchedulerTick(runtime, (runId, status) => changes.push(`${runId}:${status}`), error => failures.push(error.message));
  assert.deepEqual(failures, ['scheduler_fixture_failure']);
  assert.equal(calls, 2);
  assert.deepEqual(changes, []);
});
