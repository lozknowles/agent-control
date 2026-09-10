import assert from 'node:assert/strict';
import test from 'node:test';
import {decideParallelReviewGate, type ParallelReviewLaneResult} from './parallel-review-gate.js';

const bundle = 'a'.repeat(64);
function lane(laneId: string, outcome: ParallelReviewLaneResult['outcome'], unresolvedCriteria: string[] = []): ParallelReviewLaneResult {
  return {laneId, laneName: `${laneId} review lane`, providerId: laneId, modelId: laneId, immutableBundleSha256: bundle, outcome, unresolvedCriteria, evidence: [`evidence:${laneId}`], usage: {inputTokens: 10, outputTokens: 2, totalTokens: 12, cost: null, currency: null}, completedAt: `2026-09-10T20:00:0${laneId.length}Z`};
}

test('one passing parallel lane suppresses Sol escalation', () => {
  const decision = decideParallelReviewGate([lane('luna','QUALITY_FAILED',['lease']), lane('qwen','PASSED'), lane('glm','QUALITY_FAILED',['cache'])]);
  assert.equal(decision.action, 'ACCEPT_VERIFIED_LANE');
  assert.equal(decision.selectedLaneId, 'qwen');
  assert.match(decision.reason, /sol_not_invoked/);
  assert.equal(decision.usage.totalTokens, 36);
});

test('Sol is eligible only when every first-wave lane fails', () => {
  const decision = decideParallelReviewGate([lane('luna','QUALITY_FAILED',['lease']), lane('qwen','SCHEMA_FAILED',['schema']), lane('glm','PROVIDER_FAILED',['provider'])]);
  assert.equal(decision.action, 'BATON_TO_SOL');
  assert.deepEqual(decision.sourceLaneIds, ['glm','luna','qwen']);
  assert.deepEqual(decision.unresolvedCriteria, ['lease','provider','schema']);
});

test('fan-in fails closed for duplicate lanes or different immutable bundles', () => {
  assert.throws(() => decideParallelReviewGate([lane('luna','QUALITY_FAILED'), lane('luna','QUALITY_FAILED')]), /lane_identity/);
  assert.throws(() => decideParallelReviewGate([lane('luna','QUALITY_FAILED'), {...lane('qwen','QUALITY_FAILED'), immutableBundleSha256: 'b'.repeat(64)}]), /bundle_mismatch/);
});
