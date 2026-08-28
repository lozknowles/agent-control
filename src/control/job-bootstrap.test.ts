import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {emptyConfig} from './config.js';
import {createInvocationObservation} from './harness-efficiency.js';
import {buildJobRuntime} from './job-bootstrap.js';

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
