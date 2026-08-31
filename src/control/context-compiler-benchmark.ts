export type ContextCompilerVariant = 'DIRECT_LUNA' | 'DIRECT_SOL' | 'E2B_CLOUD' | 'E4B_CLOUD' | 'ADAPTIVE';

export interface ContextCompilerBenchmarkObservation {
  taskId: string;
  variant: ContextCompilerVariant;
  verified: boolean;
  cloudInputTokens: number;
  cloudOutputTokens: number;
  lunaTokens: number;
  solTokens: number;
  localTokens: number;
  latencyMs: number;
  apiCost: number;
  currency: string;
  escalationCount: number;
  gemmaConfidence?: number;
  gemmaOfferedLocalResult?: boolean;
  localVerificationPassed?: boolean;
  originalContextTokens?: number;
  contextPacketTokens?: number;
  missingEvidenceIds?: string[];
}

export interface ContextCompilerVariantMetrics {
  tasks: number;
  verifiedOutcomes: number;
  verifiedSuccessRate: number;
  totalCloudInputTokens: number;
  totalCloudOutputTokens: number;
  solTokens: number;
  lunaTokens: number;
  localModelTokens: number;
  endToEndLatencyMs: number;
  apiCost: number;
  currency: string | null;
  escalationFrequency: number;
  falseConfidenceRate: number | null;
  contextReductionRatio: number | null;
  costPerVerifiedOutcome: number | null;
  solTokensPerVerifiedOutcome: number | null;
  missingEvidenceCases: number;
}

export interface ContextCompilerBenchmarkReport {
  schema: 'agent-control.context-compiler-benchmark/v1';
  corpusId: string;
  corpusSha256: string;
  expectedTaskIds: string[];
  complete: boolean;
  missingCells: Array<{taskId: string; variant: ContextCompilerVariant}>;
  byVariant: Record<ContextCompilerVariant, ContextCompilerVariantMetrics>;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_RUN';
  reason: string;
  observedAt: string;
}

export const CONTEXT_COMPILER_VARIANTS: ContextCompilerVariant[] = ['DIRECT_LUNA', 'DIRECT_SOL', 'E2B_CLOUD', 'E4B_CLOUD', 'ADAPTIVE'];

const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator : null;
function aggregate(records: ContextCompilerBenchmarkObservation[]): ContextCompilerVariantMetrics {
  const verifiedOutcomes = records.filter(record => record.verified).length;
  const confident = records.filter(record => record.gemmaOfferedLocalResult && record.gemmaConfidence !== undefined);
  const falseConfidence = confident.filter(record => record.localVerificationPassed === false).length;
  const reductions = records.filter(record => record.originalContextTokens !== undefined && record.contextPacketTokens !== undefined && record.originalContextTokens! > 0).map(record => 1 - record.contextPacketTokens! / record.originalContextTokens!);
  const currencies = [...new Set(records.filter(record => record.apiCost > 0).map(record => record.currency))];
  const apiCost = records.reduce((sum, record) => sum + record.apiCost, 0);
  const solTokens = records.reduce((sum, record) => sum + record.solTokens, 0);
  return {
    tasks: records.length,
    verifiedOutcomes,
    verifiedSuccessRate: records.length ? verifiedOutcomes / records.length : 0,
    totalCloudInputTokens: records.reduce((sum, record) => sum + record.cloudInputTokens, 0),
    totalCloudOutputTokens: records.reduce((sum, record) => sum + record.cloudOutputTokens, 0),
    solTokens,
    lunaTokens: records.reduce((sum, record) => sum + record.lunaTokens, 0),
    localModelTokens: records.reduce((sum, record) => sum + record.localTokens, 0),
    endToEndLatencyMs: records.reduce((sum, record) => sum + record.latencyMs, 0),
    apiCost,
    currency: currencies.length === 1 ? currencies[0] : null,
    escalationFrequency: records.length ? records.filter(record => record.escalationCount > 0).length / records.length : 0,
    falseConfidenceRate: confident.length ? falseConfidence / confident.length : null,
    contextReductionRatio: reductions.length ? reductions.reduce((sum, value) => sum + value, 0) / reductions.length : null,
    costPerVerifiedOutcome: ratio(apiCost, verifiedOutcomes),
    solTokensPerVerifiedOutcome: ratio(solTokens, verifiedOutcomes),
    missingEvidenceCases: records.filter(record => (record.missingEvidenceIds?.length ?? 0) > 0).length,
  };
}

const empty = () => aggregate([]);
export function buildContextCompilerBenchmark(corpusId: string, corpusSha256: string, expectedTaskIds: string[], observations: ContextCompilerBenchmarkObservation[], observedAt = new Date().toISOString()): ContextCompilerBenchmarkReport {
  const expected = [...new Set(expectedTaskIds)].sort();
  if (!expected.length) throw new Error('context_compiler_benchmark_corpus_empty');
  const cells = new Set<string>();
  for (const record of observations) {
    if (!expected.includes(record.taskId)) throw new Error(`context_compiler_benchmark_task_unknown:${record.taskId}`);
    const cell = `${record.taskId}:${record.variant}`;
    if (cells.has(cell)) throw new Error(`context_compiler_benchmark_duplicate:${cell}`);
    cells.add(cell);
    const numeric = [record.cloudInputTokens, record.cloudOutputTokens, record.lunaTokens, record.solTokens, record.localTokens, record.latencyMs, record.apiCost, record.escalationCount];
    if (numeric.some(value => !Number.isFinite(value) || value < 0)) throw new Error(`context_compiler_benchmark_metric_invalid:${cell}`);
  }
  const missingCells = expected.flatMap(taskId => CONTEXT_COMPILER_VARIANTS.filter(variant => !cells.has(`${taskId}:${variant}`)).map(variant => ({taskId, variant})));
  const byVariant = Object.fromEntries(CONTEXT_COMPILER_VARIANTS.map(variant => [variant, observations.some(record => record.variant === variant) ? aggregate(observations.filter(record => record.variant === variant)) : empty()])) as Record<ContextCompilerVariant, ContextCompilerVariantMetrics>;
  let verdict: ContextCompilerBenchmarkReport['verdict'] = observations.length ? 'PARTIAL' : 'NOT_RUN', reason = observations.length ? 'benchmark_matrix_incomplete' : 'no_live_model_observations';
  if (!missingCells.length) {
    const adaptive = byVariant.ADAPTIVE, luna = byVariant.DIRECT_LUNA, sol = byVariant.DIRECT_SOL;
    const baselineQuality = Math.max(luna.verifiedSuccessRate, sol.verifiedSuccessRate), correctnessPreserved = adaptive.verifiedSuccessRate >= baselineQuality;
    const cloudInputImproved = adaptive.totalCloudInputTokens <= Math.min(luna.totalCloudInputTokens, sol.totalCloudInputTokens) * .9;
    const solImproved = adaptive.solTokensPerVerifiedOutcome !== null && sol.solTokensPerVerifiedOutcome !== null && adaptive.solTokensPerVerifiedOutcome <= sol.solTokensPerVerifiedOutcome * .9;
    const costImproved = adaptive.costPerVerifiedOutcome !== null && luna.costPerVerifiedOutcome !== null && sol.costPerVerifiedOutcome !== null && adaptive.costPerVerifiedOutcome <= Math.min(luna.costPerVerifiedOutcome, sol.costPerVerifiedOutcome) * .9;
    const evidenceSafe = adaptive.missingEvidenceCases === 0;
    if (correctnessPreserved && evidenceSafe && (cloudInputImproved || solImproved || costImproved)) { verdict = 'PASS'; reason = 'adaptive_local_preprocessing_improves_verified_efficiency'; }
    else if (!evidenceSafe) { verdict = 'FAIL'; reason = 'context_compiler_removed_required_evidence'; }
    else {
      const selectedUseful = (['E2B_CLOUD', 'E4B_CLOUD'] as ContextCompilerVariant[]).some(variant => byVariant[variant].verifiedSuccessRate >= baselineQuality && byVariant[variant].missingEvidenceCases === 0 && byVariant[variant].totalCloudInputTokens < luna.totalCloudInputTokens);
      verdict = selectedUseful ? 'PARTIAL' : 'FAIL';
      reason = selectedUseful ? 'local_preprocessing_useful_only_for_selected_variants' : !correctnessPreserved ? 'adaptive_correctness_degraded' : 'no_material_efficiency_improvement';
    }
  }
  return {schema: 'agent-control.context-compiler-benchmark/v1', corpusId, corpusSha256, expectedTaskIds: expected, complete: missingCells.length === 0, missingCells, byVariant, verdict, reason, observedAt};
}
