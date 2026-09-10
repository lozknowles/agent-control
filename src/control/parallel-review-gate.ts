export type ParallelReviewOutcome = 'PASSED' | 'QUALITY_FAILED' | 'SCHEMA_FAILED' | 'PROVIDER_FAILED';

export interface ParallelReviewLaneResult {
  laneId: string;
  laneName: string;
  providerId: string;
  modelId: string;
  immutableBundleSha256: string;
  outcome: ParallelReviewOutcome;
  unresolvedCriteria: string[];
  evidence: string[];
  usage: {inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; cost: number | null; currency: string | null};
  completedAt: string;
}

export interface ParallelReviewGateDecision {
  action: 'ACCEPT_VERIFIED_LANE' | 'BATON_TO_SOL';
  reason: string;
  selectedLaneId: string | null;
  sourceLaneIds: string[];
  immutableBundleSha256: string;
  unresolvedCriteria: string[];
  evidence: string[];
  usage: {inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; cost: number | null; currency: string | null};
}

/** Provider-neutral fan-in gate. It never invokes the fallback unless every first-wave lane failed. */
export function decideParallelReviewGate(results: ParallelReviewLaneResult[]): ParallelReviewGateDecision {
  if (results.length < 2) throw new Error('parallel_review_gate_requires_multiple_lanes');
  const laneIds = new Set(results.map(item => item.laneId));
  if (laneIds.size !== results.length || results.some(item => !item.laneId.trim() || !item.laneName.trim())) throw new Error('parallel_review_lane_identity_invalid');
  const bundles = new Set(results.map(item => item.immutableBundleSha256));
  if (bundles.size !== 1 || results.some(item => !/^[a-f0-9]{64}$/.test(item.immutableBundleSha256))) throw new Error('parallel_review_immutable_bundle_mismatch');
  const passed = results.filter(item => item.outcome === 'PASSED').sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.laneId.localeCompare(b.laneId));
  const usage = aggregateUsage(results);
  const evidence = [...new Set(results.flatMap(item => item.evidence))].sort();
  if (passed.length) return {
    action: 'ACCEPT_VERIFIED_LANE',
    reason: `${passed.length}_of_${results.length}_first_wave_lanes_passed;sol_not_invoked`,
    selectedLaneId: passed[0].laneId,
    sourceLaneIds: results.map(item => item.laneId).sort(),
    immutableBundleSha256: results[0].immutableBundleSha256,
    unresolvedCriteria: [], evidence, usage,
  };
  return {
    action: 'BATON_TO_SOL',
    reason: `all_${results.length}_first_wave_lanes_failed_independent_gate`,
    selectedLaneId: null,
    sourceLaneIds: results.map(item => item.laneId).sort(),
    immutableBundleSha256: results[0].immutableBundleSha256,
    unresolvedCriteria: [...new Set(results.flatMap(item => item.unresolvedCriteria))].sort(),
    evidence, usage,
  };
}

function aggregateUsage(results: ParallelReviewLaneResult[]): ParallelReviewGateDecision['usage'] {
  const sum = (select: (item: ParallelReviewLaneResult) => number | null) => results.every(item => select(item) !== null) ? results.reduce((total, item) => total + (select(item) ?? 0), 0) : null;
  const currencies = [...new Set(results.map(item => item.usage.currency).filter((value): value is string => value !== null))];
  return {inputTokens: sum(item => item.usage.inputTokens), outputTokens: sum(item => item.usage.outputTokens), totalTokens: sum(item => item.usage.totalTokens), cost: sum(item => item.usage.cost), currency: currencies.length === 1 ? currencies[0] : null};
}
