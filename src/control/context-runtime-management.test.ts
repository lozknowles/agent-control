import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ContextRuntimeManager,
  assessContextRuntimeAdmission,
  classifyContextRuntimeFailure,
  createDurableContextCheckpoint,
  decideContextPressure,
  deriveContextBudget,
  resumeFromContextCheckpoint,
  selectRuntimeProfile,
  verifiedOutcomeEconomics,
  verifyDurableContextCheckpoint,
  type EvidenceReference,
  type RuntimeCandidate,
  type RuntimeOutcomeObservation,
  type WorkloadContextDemand,
} from './context-runtime-management.js';

const measured = (value: number | null, source = 'fixture') => ({value, authority: value === null ? 'UNKNOWN' as const : 'MEASURED' as const, source});
const workload = (overrides: Partial<WorkloadContextDemand> = {}): WorkloadContextDemand => ({
  taskClass: 'repository-repair', estimatedInputTokens: 4_000, estimatedToolResultTokens: 1_000, estimatedOutputTokens: 1_000,
  anticipatedTurns: 4, anticipatedToolCalls: 2, requiresDurableResume: false, reasoningDepth: 'MEDIUM', locality: 'LOCAL_ONLY',
  requiredFeatures: ['CHECKPOINT'], maximumProviderCharge: 0, ...overrides,
});
const candidate = (overrides: Partial<RuntimeCandidate> = {}): RuntimeCandidate => ({
  id: 'local-qwen', providerId: 'llama.cpp', modelId: 'qwen', workerId: 'p5000', runtimeId: 'llama-server', locality: 'LOCAL',
  supportedProfiles: ['CHAT','TOOL','AGENT','DEEP'], supportedFeatures: ['CHECKPOINT','COMPACTION','RETRIEVAL','REROUTE','KV_CACHE_QUANTISATION','FLASH_ATTENTION','REASONING_CONTROL'],
  configuredContextOptions: [8_192,16_384,32_768], modelContextLimitTokens: 32_768,
  modelFootprintBytes: measured(2_000_000_000), runtimeOverheadBytes: measured(200_000_000), contextBytesPerToken: measured(30_000),
  workerAvailableRamBytes: measured(40_000_000_000), workerAvailableVramBytes: measured(8_000_000_000), workerTotalVramBytes: measured(16_000_000_000),
  minimumRamSafetyReserveBytes: 2_000_000_000, minimumVramSafetyReserveBytes: 1_000_000_000,
  providerChargePerAttempt: 0, currency: 'USD', accelerator: 'GPU', qualificationEvidence: ['evidence:p5000'], ...overrides,
});

test('runtime profile selection describes work instead of mapping directly to context sizes', () => {
  assert.equal(selectRuntimeProfile(workload({anticipatedTurns: 1, anticipatedToolCalls: 0, reasoningDepth: 'LOW'})), 'CHAT');
  assert.equal(selectRuntimeProfile(workload({anticipatedTurns: 2, anticipatedToolCalls: 1, reasoningDepth: 'LOW'})), 'TOOL');
  assert.equal(selectRuntimeProfile(workload({anticipatedTurns: 8, anticipatedToolCalls: 5})), 'AGENT');
  assert.equal(selectRuntimeProfile(workload({anticipatedTurns: 20, anticipatedToolCalls: 12, requiresDurableResume: true})), 'DEEP');
  assert.equal(selectRuntimeProfile(workload({profile: 'TOOL', anticipatedTurns: 20})), 'TOOL');
});

test('context budget derives working demand reserve and the smallest feasible configured capacity', () => {
  const budget = deriveContextBudget(workload(), candidate());
  assert.equal(budget.profile, 'TOOL');
  assert.equal(budget.estimatedRequiredTokens, 6_000);
  assert.equal(budget.safetyReserveTokens, 1_200);
  assert.equal(budget.configuredCapacityTokens, 8_192);
  assert.equal(budget.currentUsageTokens, null);
  assert.equal(budget.authority.current, 'UNKNOWN');
});

test('admission jointly checks model footprint context KV memory worker availability and safety reserve', () => {
  const admitted = assessContextRuntimeAdmission(workload(), candidate());
  assert.equal(admitted.outcome, 'ADMITTED');
  assert.ok(admitted.requiredMemoryBytes! > 2_200_000_000);
  const modelTooLarge = assessContextRuntimeAdmission(workload(), candidate({modelFootprintBytes: measured(8_100_000_000)}));
  assert.equal(modelTooLarge.outcome, 'MODEL_MEMORY_INSUFFICIENT');
  const contextTooLarge = assessContextRuntimeAdmission(workload(), candidate({workerAvailableVramBytes: measured(2_300_000_000), minimumVramSafetyReserveBytes: 0}));
  assert.equal(contextTooLarge.outcome, 'CONTEXT_CAPACITY_INSUFFICIENT');
  const noReserve = assessContextRuntimeAdmission(workload(), candidate({workerAvailableVramBytes: measured(3_000_000_000)}));
  assert.equal(noReserve.outcome, 'SAFETY_RESERVE_VIOLATION');
});

test('admission fails honestly for insufficient context unsupported profile runtime feature and unknown telemetry', () => {
  assert.equal(assessContextRuntimeAdmission(workload({maximumAllowedTokens: 7_000}), candidate()).outcome, 'CONTEXT_CAPACITY_INSUFFICIENT');
  assert.equal(assessContextRuntimeAdmission(workload({profile: 'DEEP'}), candidate({supportedProfiles: ['CHAT','TOOL']})).outcome, 'PROFILE_UNSUPPORTED');
  assert.equal(assessContextRuntimeAdmission(workload({requiredFeatures: ['CHECKPOINT','FLASH_ATTENTION']}), candidate({supportedFeatures: ['CHECKPOINT']})).outcome, 'RUNTIME_FEATURE_UNSUPPORTED');
  assert.equal(assessContextRuntimeAdmission(workload(), candidate({workerAvailableVramBytes: measured(null)})).outcome, 'TELEMETRY_UNAVAILABLE');
});

test('budget and locality constraints exclude a runtime before execution', () => {
  assert.equal(assessContextRuntimeAdmission(workload(), candidate({providerChargePerAttempt: null})).outcome, 'BUDGET_EXCEEDED');
  assert.equal(assessContextRuntimeAdmission(workload(), candidate({providerChargePerAttempt: 1})).outcome, 'BUDGET_EXCEEDED');
  assert.equal(assessContextRuntimeAdmission(workload(), candidate({locality: 'EXTERNAL'})).outcome, 'LOCALITY_VIOLATION');
});

test('context pressure produces governed checkpoint compaction retrieval reroute and fail-closed actions', () => {
  const observation = (used: number | null) => ({at: '2026-09-29T00:00:00Z', configuredCapacityTokens: 10_000, currentUsageTokens: used, peakUsageTokens: used, inputTokens: used, generatedTokens: 100, cachedTokens: null, ramBytes: null, vramBytes: null, authority: used === null ? 'UNKNOWN' as const : 'MEASURED' as const, source: 'runtime'});
  assert.equal(decideContextPressure('AGENT', observation(4_000), ['CHECKPOINT','COMPACTION','RETRIEVAL'], 'CHECKPOINT_COMPACT_RETRIEVE').action, 'CONTINUE');
  assert.equal(decideContextPressure('AGENT', observation(7_000), ['CHECKPOINT'], 'CHECKPOINT_COMPACT_RETRIEVE').action, 'CHECKPOINT');
  assert.equal(decideContextPressure('AGENT', observation(8_500), ['CHECKPOINT','COMPACTION','RETRIEVAL'], 'CHECKPOINT_COMPACT_RETRIEVE').action, 'CHECKPOINT_COMPACT_RETRIEVE');
  assert.equal(decideContextPressure('AGENT', {...observation(4_000),projectedNextUsageTokens:11_000}, ['CHECKPOINT','COMPACTION','RETRIEVAL'], 'CHECKPOINT_COMPACT_RETRIEVE').reason, 'projected_next_turn_context_overflow');
  assert.equal(decideContextPressure('AGENT', observation(9_500), ['CHECKPOINT','REROUTE'], 'CHECKPOINT_REROUTE').action, 'CHECKPOINT_REROUTE');
  assert.equal(decideContextPressure('AGENT', observation(8_500), ['CHECKPOINT'], 'CHECKPOINT_COMPACT_RETRIEVE').action, 'TERMINATE');
  assert.equal(decideContextPressure('AGENT', observation(null), [], 'FAIL_CLOSED').level, 'UNKNOWN');
});

test('durable checkpoint keeps summaries distinct from original evidence and resumes after context reset', () => {
  const original: EvidenceReference = {id: 'evidence:requirements', kind: 'ORIGINAL_EVIDENCE', sha256: 'a'.repeat(64), source: 'frozen-task'};
  const tool: EvidenceReference = {id: 'tool:tests', kind: 'TOOL_RESULT', sha256: 'b'.repeat(64), source: 'independent-test-runner'};
  const verification: EvidenceReference = {id: 'verification:one', kind: 'VERIFICATION_RESULT', sha256: 'c'.repeat(64), source: 'independent-verifier'};
  const checkpoint = createDurableContextCheckpoint({jobId: 'job:one', objective: 'Repair the function and pass the frozen tests', constraints: ['do not change tests'], decisions: ['use bounded patch'], completedSteps: ['inspected requirements'], outstandingWork: ['implement','verify'], nextAction: 'implement the repair', budgetState: {remainingTokens: 8_000, remainingProviderCharge: 0, currency: 'USD'}, evidence: [original,tool], summary: {text: 'Requirements inspected; implementation remains.', kind: 'MODEL_GENERATED_SUMMARY', sourceEvidenceIds: [original.id,tool.id]}, verificationResults: [verification], parentCheckpointId: null}, '2026-09-29T00:00:00Z');
  assert.equal(verifyDurableContextCheckpoint(checkpoint), true);
  const resumed = resumeFromContextCheckpoint(checkpoint, [{id: 'retrieved:one', kind: 'RETRIEVED_STATE', sha256: 'd'.repeat(64), source: 'governed-retrieval'}]);
  assert.equal(resumed.objective, checkpoint.objective);
  assert.equal(resumed.context.authoritativeEvidence[0]?.kind, 'ORIGINAL_EVIDENCE');
  assert.equal(resumed.context.checkpointSummary.kind, 'MODEL_GENERATED_SUMMARY');
  assert.equal(resumed.checkpoint.sha256, checkpoint.sha256);
  assert.throws(() => verifyDurableContextCheckpoint({...checkpoint, nextAction: 'silently changed'}), /hash_invalid/);
});

test('checkpoint refuses unproven summaries and relabelled verification evidence', () => {
  const base = {jobId: 'j', objective: 'o', constraints: [], decisions: [], completedSteps: [], outstandingWork: ['x'], nextAction: 'x', budgetState: {remainingTokens: null, remainingProviderCharge: null, currency: null}, evidence: [] as EvidenceReference[], summary: {text: 'claim', kind: 'MODEL_GENERATED_SUMMARY' as const, sourceEvidenceIds: []}, verificationResults: [] as EvidenceReference[], parentCheckpointId: null};
  assert.throws(() => createDurableContextCheckpoint(base), /summary_provenance_required/);
  assert.throws(() => createDurableContextCheckpoint({...base, evidence: [{id:'e',kind:'ORIGINAL_EVIDENCE',sha256:'a'.repeat(64),source:'s'}], summary: {...base.summary, sourceEvidenceIds:['e']}, verificationResults:[{id:'v',kind:'TOOL_RESULT',sha256:'b'.repeat(64),source:'s'}]}), /verification_kind_invalid/);
});

test('verified history never treats provider completion as verified success and drives auditable rerouting', () => {
  const manager = new ContextRuntimeManager(undefined, () => '2026-09-29T00:00:00Z');
  const outcome = (candidateId: string, verification: RuntimeOutcomeObservation['verification'], durationMs: number): RuntimeOutcomeObservation => ({taskClass: 'repository-repair', candidateId, modelId: candidateId, workerId: 'w', runtimeId: 'r', profile: 'TOOL', configuredContextTokens: 16_384, providerReportedCompletion: true, verification, peakContextTokens: 8_000, repairs: verification === 'PASSED' ? 0 : 1, durationMs, providerCharge: 0, evidence: [`evidence:${candidateId}:${verification}`], observedAt: '2026-09-29T00:00:00Z'});
  manager.recordOutcome(outcome('a','FAILED',100)); manager.recordOutcome(outcome('a','FAILED',110)); manager.recordOutcome(outcome('b','PASSED',200));
  const history = manager.verifiedHistory('repository-repair');
  assert.equal(history.find(row => row.candidateId === 'a')?.providerCompletions, 2);
  assert.equal(history.find(row => row.candidateId === 'a')?.verifiedSuccesses, 0);
  assert.equal(manager.selectByVerifiedHistory(workload(), [candidate({id:'a'}),candidate({id:'b'})]).selected?.id, 'b');
});

test('unqualified or incompatible cheap routes are not selected by verified-history routing', () => {
  const manager = new ContextRuntimeManager();
  const result = manager.selectByVerifiedHistory(workload(), [candidate({id:'external-cheap',locality:'EXTERNAL',providerChargePerAttempt:0}),candidate({id:'local',providerChargePerAttempt:0})]);
  assert.equal(result.selected?.id, 'local');
  assert.deepEqual(result.considered.find(item => item.candidateId === 'external-cheap'), {candidateId:'external-cheap',outcome:'LOCALITY_VIOLATION',admitted:false});
});

test('telemetry event chain and verified history persist across restart', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-context-runtime-')), file = path.join(root,'state.json');
  try {
    const manager = new ContextRuntimeManager(file, () => '2026-09-29T00:00:00Z');
    manager.recordEvent('job:one','ADMISSION',{outcome:'ADMITTED'},['evidence:admission']);
    manager.recordEvent('job:one','PRESSURE',{percent:81},['evidence:telemetry']);
    manager.recordOutcome({taskClass:'repository-repair',candidateId:'a',modelId:'m',workerId:'w',runtimeId:'r',profile:'TOOL',configuredContextTokens:8192,providerReportedCompletion:true,verification:'PASSED',peakContextTokens:7000,repairs:1,durationMs:1000,providerCharge:0,evidence:['e'],observedAt:'2026-09-29T00:00:00Z'});
    assert.equal(manager.verifyChain(), true);
    const restored = new ContextRuntimeManager(file); assert.equal(restored.verifyChain(), true); assert.equal(restored.projection().events.length,2); assert.equal(restored.verifiedHistory()[0]?.verifiedSuccesses,1);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('failure classification separates context memory runtime tool routing quality and verification causes', () => {
  assert.equal(classifyContextRuntimeFailure({contextExhausted:true}), 'CONTEXT_EXHAUSTION');
  assert.equal(classifyContextRuntimeFailure({memoryInsufficient:true}), 'MEMORY_CAPACITY_FAILURE');
  assert.equal(classifyContextRuntimeFailure({runtimeMisconfigured:true}), 'RUNTIME_CONFIGURATION_FAILURE');
  assert.equal(classifyContextRuntimeFailure({toolFailed:true}), 'TOOL_FAILURE');
  assert.equal(classifyContextRuntimeFailure({routeUnavailable:true}), 'ROUTING_FAILURE');
  assert.equal(classifyContextRuntimeFailure({verificationFailed:true}), 'VERIFICATION_FAILURE');
  assert.equal(classifyContextRuntimeFailure({noProgress:true}), 'NO_PROGRESS');
  assert.equal(classifyContextRuntimeFailure({qualityFailed:true}), 'QUALITY_FAILURE');
  assert.equal(classifyContextRuntimeFailure({modelFailedOnFeasibleRuntime:true}), 'MODEL_CAPABILITY_FAILURE');
  assert.equal(classifyContextRuntimeFailure({budgetExceeded:true,contextExhausted:true}), 'BUDGET_EXCEEDED');
});

test('verified economics reports provider completion separately from independently verified success', () => {
  const base: RuntimeOutcomeObservation = {taskClass:'t',candidateId:'c',modelId:'m',workerId:'w',runtimeId:'r',profile:'AGENT',configuredContextTokens:8192,providerReportedCompletion:true,verification:'PASSED',peakContextTokens:7000,repairs:0,durationMs:1000,providerCharge:0,evidence:[],observedAt:'2026-09-29T00:00:00Z'};
  const value = verifiedOutcomeEconomics([base,{...base,verification:'FAILED',durationMs:2000}]);
  assert.equal(value.providerCompletionRate,1); assert.equal(value.verifiedSuccessRate,.5); assert.equal(value.falseSuccessRate,.5); assert.equal(value.providerChargePerVerifiedSuccess,0); assert.equal(value.timePerVerifiedSuccessMs,3000);
  assert.equal(verifiedOutcomeEconomics([{...base,providerCharge:null}]).providerChargePerVerifiedSuccess,null);
});
