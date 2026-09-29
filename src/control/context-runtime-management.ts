import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const CONTEXT_RUNTIME_SCHEMA = 'agent-control.context-runtime-management/v1' as const;

export type RuntimeProfileName = 'CHAT' | 'TOOL' | 'AGENT' | 'DEEP';
export type RuntimeFeature = 'CHECKPOINT' | 'COMPACTION' | 'RETRIEVAL' | 'REROUTE' | 'KV_CACHE_QUANTISATION' | 'FLASH_ATTENTION' | 'REASONING_CONTROL';
export type OverflowStrategy = 'FAIL_CLOSED' | 'CHECKPOINT_COMPACT_RETRIEVE' | 'CHECKPOINT_REROUTE';
export type AdmissionOutcome = 'ADMITTED' | 'MODEL_MEMORY_INSUFFICIENT' | 'CONTEXT_CAPACITY_INSUFFICIENT' | 'SAFETY_RESERVE_VIOLATION' | 'WORKER_PRESSURE' | 'PROFILE_UNSUPPORTED' | 'RUNTIME_FEATURE_UNSUPPORTED' | 'BUDGET_EXCEEDED' | 'LOCALITY_VIOLATION' | 'TELEMETRY_UNAVAILABLE';
export type ContextFailureClass = 'MODEL_CAPABILITY_FAILURE' | 'CONTEXT_EXHAUSTION' | 'MEMORY_CAPACITY_FAILURE' | 'RUNTIME_CONFIGURATION_FAILURE' | 'TOOL_FAILURE' | 'ROUTING_FAILURE' | 'VERIFICATION_FAILURE' | 'NO_PROGRESS' | 'QUALITY_FAILURE' | 'BUDGET_EXCEEDED';
export type ContextPressureLevel = 'NORMAL' | 'PREPARE_CHECKPOINT' | 'COMPACT' | 'REROUTE' | 'EXHAUSTED' | 'UNKNOWN';
export type ContextManagementAction = 'CONTINUE' | 'CHECKPOINT' | 'CHECKPOINT_COMPACT_RETRIEVE' | 'CHECKPOINT_REROUTE' | 'TERMINATE';
export type EvidenceKind = 'ORIGINAL_EVIDENCE' | 'TOOL_RESULT' | 'MODEL_GENERATED_SUMMARY' | 'CHECKPOINT_STATE' | 'RETRIEVED_STATE' | 'VERIFICATION_RESULT';
export type MeasurementAuthority = 'MEASURED' | 'DECLARED' | 'DERIVED' | 'UNKNOWN';

export interface NumericMeasurement {
  value: number | null;
  authority: MeasurementAuthority;
  source: string;
  observedAt?: string;
}

export interface WorkloadContextDemand {
  taskClass: string;
  profile?: RuntimeProfileName;
  estimatedInputTokens: number;
  estimatedToolResultTokens: number;
  estimatedOutputTokens: number;
  anticipatedTurns: number;
  anticipatedToolCalls: number;
  requiresDurableResume: boolean;
  reasoningDepth: 'LOW' | 'MEDIUM' | 'HIGH';
  maximumAllowedTokens?: number;
  maximumProviderCharge?: number;
  locality: 'LOCAL_ONLY' | 'EXTERNAL_ALLOWED';
  requiredFeatures?: RuntimeFeature[];
  overflowStrategy?: OverflowStrategy;
}

export interface RuntimeProfilePolicy {
  name: RuntimeProfileName;
  description: string;
  minimumSafetyReserveTokens: number;
  reserveRatio: number;
  checkpointPercent: number;
  compactPercent: number;
  reroutePercent: number;
  maximumRepairs: number;
  retrieval: 'NONE' | 'ON_DEMAND' | 'REQUIRED';
}

export const RUNTIME_PROFILE_POLICIES: Record<RuntimeProfileName, RuntimeProfilePolicy> = Object.freeze({
  CHAT: {name: 'CHAT', description: 'Short conversational work with no durable continuation requirement.', minimumSafetyReserveTokens: 512, reserveRatio: .15, checkpointPercent: 75, compactPercent: 86, reroutePercent: 94, maximumRepairs: 0, retrieval: 'NONE'},
  TOOL: {name: 'TOOL', description: 'Bounded tool execution with result and verification headroom.', minimumSafetyReserveTokens: 1_024, reserveRatio: .20, checkpointPercent: 70, compactPercent: 84, reroutePercent: 92, maximumRepairs: 1, retrieval: 'ON_DEMAND'},
  AGENT: {name: 'AGENT', description: 'Multi-turn governed work with checkpoint and retrieval support.', minimumSafetyReserveTokens: 2_048, reserveRatio: .25, checkpointPercent: 65, compactPercent: 80, reroutePercent: 90, maximumRepairs: 2, retrieval: 'REQUIRED'},
  DEEP: {name: 'DEEP', description: 'Long complex work with early checkpointing and larger safety reserve.', minimumSafetyReserveTokens: 4_096, reserveRatio: .30, checkpointPercent: 60, compactPercent: 76, reroutePercent: 88, maximumRepairs: 3, retrieval: 'REQUIRED'},
});

export interface RuntimeCandidate {
  id: string;
  providerId: string;
  modelId: string;
  workerId: string;
  runtimeId: string;
  locality: 'LOCAL' | 'EXTERNAL';
  supportedProfiles: RuntimeProfileName[];
  supportedFeatures: RuntimeFeature[];
  configuredContextOptions: number[];
  modelContextLimitTokens: number;
  modelFootprintBytes: NumericMeasurement;
  runtimeOverheadBytes: NumericMeasurement;
  contextBytesPerToken: NumericMeasurement;
  workerAvailableRamBytes: NumericMeasurement;
  workerAvailableVramBytes: NumericMeasurement;
  workerTotalVramBytes: NumericMeasurement;
  minimumRamSafetyReserveBytes: number;
  minimumVramSafetyReserveBytes: number;
  providerChargePerAttempt: number | null;
  currency: string | null;
  accelerator: 'GPU' | 'CPU' | 'HYBRID';
  qualificationEvidence: string[];
}

export interface ContextBudget {
  schema: 'agent-control.context-budget/v1';
  profile: RuntimeProfileName;
  estimatedRequiredTokens: number;
  maximumAllowedTokens: number;
  configuredCapacityTokens: number;
  currentUsageTokens: number | null;
  peakUsageTokens: number | null;
  safetyReserveTokens: number;
  pressurePercent: number | null;
  overflowStrategy: OverflowStrategy;
  authority: {estimate: MeasurementAuthority; current: MeasurementAuthority; peak: MeasurementAuthority};
}

export interface RuntimeAdmissionDecision {
  schema: 'agent-control.context-runtime-admission/v1';
  candidateId: string;
  profile: RuntimeProfileName;
  outcome: AdmissionOutcome;
  admitted: boolean;
  contextBudget: ContextBudget;
  requiredMemoryBytes: number | null;
  availableMemoryBytes: number | null;
  safetyReserveBytes: number;
  reasons: string[];
  evidence: string[];
}

export interface ContextPressureObservation {
  at: string;
  configuredCapacityTokens: number | null;
  currentUsageTokens: number | null;
  peakUsageTokens: number | null;
  projectedNextUsageTokens?: number | null;
  inputTokens: number | null;
  generatedTokens: number | null;
  cachedTokens: number | null;
  ramBytes: number | null;
  vramBytes: number | null;
  authority: MeasurementAuthority;
  source: string;
}

export interface ContextPressureDecision {
  level: ContextPressureLevel;
  action: ContextManagementAction;
  pressurePercent: number | null;
  reason: string;
  requiresCheckpoint: boolean;
}

export interface EvidenceReference {
  id: string;
  kind: EvidenceKind;
  sha256: string;
  source: string;
}

export interface DurableContextCheckpoint {
  schema: 'agent-control.context-checkpoint/v1';
  id: string;
  jobId: string;
  objective: string;
  constraints: string[];
  decisions: string[];
  completedSteps: string[];
  outstandingWork: string[];
  nextAction: string;
  budgetState: {remainingTokens: number | null; remainingProviderCharge: number | null; currency: string | null};
  evidence: EvidenceReference[];
  summary: {text: string; kind: 'MODEL_GENERATED_SUMMARY' | 'CHECKPOINT_STATE'; sourceEvidenceIds: string[]};
  verificationResults: EvidenceReference[];
  parentCheckpointId: string | null;
  createdAt: string;
  sha256: string;
}

export interface RuntimeOutcomeObservation {
  taskClass: string;
  candidateId: string;
  modelId: string;
  workerId: string;
  runtimeId: string;
  profile: RuntimeProfileName;
  configuredContextTokens: number;
  providerReportedCompletion: boolean;
  verification: 'PASSED' | 'FAILED' | 'UNAVAILABLE';
  peakContextTokens: number | null;
  repairs: number;
  durationMs: number;
  providerCharge: number | null;
  evidence: string[];
  observedAt: string;
}

export interface VerifiedHistoryRow {
  key: string;
  taskClass: string;
  candidateId: string;
  profile: RuntimeProfileName;
  attempts: number;
  providerCompletions: number;
  verifiedSuccesses: number;
  verificationFailures: number;
  medianContextTokens: number | null;
  p90ContextTokens: number | null;
  medianDurationMs: number;
  repairRate: number;
  totalProviderCharge: number | null;
  evidence: string[];
}

export interface ContextRuntimeEvent {
  id: string;
  sequence: number;
  at: string;
  type: 'ADMISSION' | 'PRESSURE' | 'CHECKPOINT' | 'COMPACTION' | 'RETRIEVAL' | 'REROUTE' | 'VERIFICATION' | 'TERMINAL';
  jobId: string;
  detail: Record<string, unknown>;
  evidence: string[];
  previousHash: string | null;
  sha256: string;
}

interface ContextRuntimeSnapshot {
  schema: typeof CONTEXT_RUNTIME_SCHEMA;
  events: ContextRuntimeEvent[];
  outcomes: RuntimeOutcomeObservation[];
}

function integer(name: string, value: number, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`context_runtime_invalid:${name}`);
  return value;
}

function money(name: string, value: number | undefined) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`context_runtime_invalid:${name}`);
  return value;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value: unknown) { return createHash('sha256').update(stable(value)).digest('hex'); }
function unique<T>(values: T[]): T[] { return [...new Set(values)]; }
function median(values: number[]) { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)]! : null; }
function p90(values: number[]) { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.ceil(sorted.length * .9) - 1]! : null; }

export function selectRuntimeProfile(workload: WorkloadContextDemand): RuntimeProfileName {
  validateWorkload(workload);
  if (workload.profile) return workload.profile;
  if (workload.requiresDurableResume || workload.reasoningDepth === 'HIGH' || workload.anticipatedTurns >= 16 || workload.anticipatedToolCalls >= 12) return 'DEEP';
  if (workload.anticipatedTurns >= 5 || workload.anticipatedToolCalls >= 4 || workload.estimatedToolResultTokens >= 4_096) return 'AGENT';
  if (workload.anticipatedToolCalls > 0 || workload.anticipatedTurns > 1) return 'TOOL';
  return 'CHAT';
}

export function deriveContextBudget(workload: WorkloadContextDemand, candidate: RuntimeCandidate, usage: {current?: number | null; peak?: number | null; authority?: MeasurementAuthority} = {}): ContextBudget {
  validateWorkload(workload); validateCandidate(candidate);
  const profile = selectRuntimeProfile(workload), policy = RUNTIME_PROFILE_POLICIES[profile];
  const recurringToolTokens = Math.ceil(workload.estimatedToolResultTokens * Math.min(workload.anticipatedTurns, Math.max(1, workload.anticipatedToolCalls)) / Math.max(1, workload.anticipatedToolCalls));
  const estimatedRequiredTokens = integer('estimated_required', workload.estimatedInputTokens + recurringToolTokens + workload.estimatedOutputTokens, 1);
  const safetyReserveTokens = Math.max(policy.minimumSafetyReserveTokens, Math.ceil(estimatedRequiredTokens * policy.reserveRatio));
  const maximumAllowedTokens = Math.min(workload.maximumAllowedTokens ?? candidate.modelContextLimitTokens, candidate.modelContextLimitTokens);
  const desired = estimatedRequiredTokens + safetyReserveTokens;
  const options = unique(candidate.configuredContextOptions).sort((a, b) => a - b).filter(value => value <= maximumAllowedTokens);
  const configuredCapacityTokens = options.find(value => value >= desired) ?? options.at(-1) ?? 0;
  const currentUsageTokens = usage.current ?? null, peakUsageTokens = usage.peak ?? null;
  const pressurePercent = currentUsageTokens === null || configuredCapacityTokens === 0 ? null : Math.min(100, currentUsageTokens / configuredCapacityTokens * 100);
  return {schema: 'agent-control.context-budget/v1', profile, estimatedRequiredTokens, maximumAllowedTokens, configuredCapacityTokens, currentUsageTokens, peakUsageTokens, safetyReserveTokens, pressurePercent, overflowStrategy: workload.overflowStrategy ?? (profile === 'CHAT' ? 'FAIL_CLOSED' : 'CHECKPOINT_COMPACT_RETRIEVE'), authority: {estimate: 'DERIVED', current: currentUsageTokens === null ? 'UNKNOWN' : usage.authority ?? 'MEASURED', peak: peakUsageTokens === null ? 'UNKNOWN' : usage.authority ?? 'MEASURED'}};
}

export function assessContextRuntimeAdmission(workload: WorkloadContextDemand, candidate: RuntimeCandidate): RuntimeAdmissionDecision {
  const contextBudget = deriveContextBudget(workload, candidate), profile = contextBudget.profile, reasons: string[] = [], evidence = [...candidate.qualificationEvidence];
  let outcome: AdmissionOutcome = 'ADMITTED';
  if (!candidate.supportedProfiles.includes(profile)) { outcome = 'PROFILE_UNSUPPORTED'; reasons.push(`profile_not_supported:${profile}`); }
  const missingFeatures = unique(workload.requiredFeatures ?? []).filter(feature => !candidate.supportedFeatures.includes(feature));
  if (outcome === 'ADMITTED' && missingFeatures.length) { outcome = 'RUNTIME_FEATURE_UNSUPPORTED'; reasons.push(...missingFeatures.map(feature => `runtime_feature_not_supported:${feature}`)); }
  if (outcome === 'ADMITTED' && workload.locality === 'LOCAL_ONLY' && candidate.locality !== 'LOCAL') { outcome = 'LOCALITY_VIOLATION'; reasons.push('external_runtime_excluded_by_local_only_policy'); }
  if (outcome === 'ADMITTED' && workload.maximumProviderCharge !== undefined && (candidate.providerChargePerAttempt === null || candidate.providerChargePerAttempt > workload.maximumProviderCharge)) { outcome = 'BUDGET_EXCEEDED'; reasons.push(candidate.providerChargePerAttempt === null ? 'provider_charge_unknown' : `provider_charge_above_budget:${candidate.providerChargePerAttempt}:${workload.maximumProviderCharge}`); }
  const requiredWithReserve = contextBudget.estimatedRequiredTokens + contextBudget.safetyReserveTokens;
  if (outcome === 'ADMITTED' && (contextBudget.configuredCapacityTokens < requiredWithReserve || contextBudget.maximumAllowedTokens < requiredWithReserve)) { outcome = 'CONTEXT_CAPACITY_INSUFFICIENT'; reasons.push(`usable_context_below_requirement:${contextBudget.configuredCapacityTokens}:${requiredWithReserve}`); }
  const components = [candidate.modelFootprintBytes, candidate.runtimeOverheadBytes, candidate.contextBytesPerToken];
  const requiredMemoryBytes = components.some(item => item.value === null) ? null : Math.ceil(candidate.modelFootprintBytes.value! + candidate.runtimeOverheadBytes.value! + candidate.contextBytesPerToken.value! * contextBudget.configuredCapacityTokens);
  const availableMeasurement = candidate.accelerator === 'CPU' ? candidate.workerAvailableRamBytes : candidate.workerAvailableVramBytes;
  const availableMemoryBytes = availableMeasurement.value;
  const safetyReserveBytes = candidate.accelerator === 'CPU' ? candidate.minimumRamSafetyReserveBytes : candidate.minimumVramSafetyReserveBytes;
  if (outcome === 'ADMITTED' && (requiredMemoryBytes === null || availableMemoryBytes === null)) { outcome = 'TELEMETRY_UNAVAILABLE'; reasons.push('admission_memory_telemetry_unknown'); }
  if (outcome === 'ADMITTED' && candidate.modelFootprintBytes.value! + candidate.runtimeOverheadBytes.value! > availableMemoryBytes!) { outcome = 'MODEL_MEMORY_INSUFFICIENT'; reasons.push('model_and_runtime_do_not_fit_available_memory'); }
  if (outcome === 'ADMITTED' && requiredMemoryBytes! > availableMemoryBytes!) { outcome = 'CONTEXT_CAPACITY_INSUFFICIENT'; reasons.push('model_fits_but_selected_context_does_not_fit'); }
  if (outcome === 'ADMITTED' && requiredMemoryBytes! + safetyReserveBytes > availableMemoryBytes!) { outcome = 'SAFETY_RESERVE_VIOLATION'; reasons.push(`memory_safety_reserve_not_preserved:${safetyReserveBytes}`); }
  if (outcome === 'ADMITTED' && candidate.workerTotalVramBytes.value !== null && candidate.accelerator !== 'CPU' && availableMemoryBytes! / candidate.workerTotalVramBytes.value < .08) { outcome = 'WORKER_PRESSURE'; reasons.push('worker_free_vram_below_eight_percent'); }
  if (outcome === 'ADMITTED') reasons.push('model_runtime_context_and_safety_reserve_fit_observed_worker');
  return {schema: 'agent-control.context-runtime-admission/v1', candidateId: candidate.id, profile, outcome, admitted: outcome === 'ADMITTED', contextBudget, requiredMemoryBytes, availableMemoryBytes, safetyReserveBytes, reasons, evidence};
}

export function decideContextPressure(profileName: RuntimeProfileName, observation: ContextPressureObservation, features: RuntimeFeature[], overflowStrategy: OverflowStrategy): ContextPressureDecision {
  const profile = RUNTIME_PROFILE_POLICIES[profileName];
  if (observation.configuredCapacityTokens === null || observation.currentUsageTokens === null || observation.configuredCapacityTokens <= 0) return {level: 'UNKNOWN', action: 'CONTINUE', pressurePercent: null, reason: 'context_occupancy_unavailable', requiresCheckpoint: false};
  const pressurePercent = Math.min(100, observation.currentUsageTokens / observation.configuredCapacityTokens * 100);
  if (observation.projectedNextUsageTokens !== undefined && observation.projectedNextUsageTokens !== null && observation.projectedNextUsageTokens >= observation.configuredCapacityTokens) {
    if (features.includes('CHECKPOINT') && features.includes('COMPACTION') && features.includes('RETRIEVAL')) return {level: 'COMPACT', action: 'CHECKPOINT_COMPACT_RETRIEVE', pressurePercent, reason: 'projected_next_turn_context_overflow', requiresCheckpoint: true};
    if (overflowStrategy === 'CHECKPOINT_REROUTE' && features.includes('CHECKPOINT') && features.includes('REROUTE')) return {level: 'REROUTE', action: 'CHECKPOINT_REROUTE', pressurePercent, reason: 'projected_next_turn_requires_reroute', requiresCheckpoint: true};
    return {level: 'EXHAUSTED', action: 'TERMINATE', pressurePercent, reason: 'projected_next_turn_cannot_continue_safely', requiresCheckpoint: true};
  }
  if (pressurePercent >= 100) return {level: 'EXHAUSTED', action: 'TERMINATE', pressurePercent, reason: 'context_capacity_exhausted', requiresCheckpoint: true};
  if (pressurePercent >= profile.reroutePercent) {
    if (overflowStrategy === 'CHECKPOINT_REROUTE' && features.includes('CHECKPOINT') && features.includes('REROUTE')) return {level: 'REROUTE', action: 'CHECKPOINT_REROUTE', pressurePercent, reason: 'context_reroute_threshold_reached', requiresCheckpoint: true};
    if (features.includes('CHECKPOINT') && features.includes('COMPACTION') && features.includes('RETRIEVAL')) return {level: 'REROUTE', action: 'CHECKPOINT_COMPACT_RETRIEVE', pressurePercent, reason: 'reroute_unavailable_compact_with_durable_state', requiresCheckpoint: true};
    return {level: 'REROUTE', action: 'TERMINATE', pressurePercent, reason: 'safe_overflow_strategy_unavailable', requiresCheckpoint: true};
  }
  if (pressurePercent >= profile.compactPercent) {
    if (features.includes('CHECKPOINT') && features.includes('COMPACTION') && features.includes('RETRIEVAL')) return {level: 'COMPACT', action: 'CHECKPOINT_COMPACT_RETRIEVE', pressurePercent, reason: 'context_compaction_threshold_reached', requiresCheckpoint: true};
    return {level: 'COMPACT', action: 'TERMINATE', pressurePercent, reason: 'compaction_required_but_unsupported', requiresCheckpoint: true};
  }
  if (pressurePercent >= profile.checkpointPercent) return {level: 'PREPARE_CHECKPOINT', action: features.includes('CHECKPOINT') ? 'CHECKPOINT' : 'CONTINUE', pressurePercent, reason: features.includes('CHECKPOINT') ? 'context_checkpoint_threshold_reached' : 'checkpoint_unsupported_monitor_only', requiresCheckpoint: features.includes('CHECKPOINT')};
  return {level: 'NORMAL', action: 'CONTINUE', pressurePercent, reason: 'context_within_profile_policy', requiresCheckpoint: false};
}

export function createDurableContextCheckpoint(input: Omit<DurableContextCheckpoint, 'schema' | 'id' | 'createdAt' | 'sha256'>, at = new Date().toISOString()): DurableContextCheckpoint {
  if (!input.jobId.trim() || !input.objective.trim() || !input.nextAction.trim()) throw new Error('context_checkpoint_required_field_missing');
  const allEvidence = [...input.evidence, ...input.verificationResults];
  for (const item of allEvidence) if (!item.id.trim() || !item.source.trim() || !/^[a-f0-9]{64}$/.test(item.sha256) || !['ORIGINAL_EVIDENCE','TOOL_RESULT','MODEL_GENERATED_SUMMARY','CHECKPOINT_STATE','RETRIEVED_STATE','VERIFICATION_RESULT'].includes(item.kind)) throw new Error('context_checkpoint_evidence_invalid');
  if (input.verificationResults.some(item => item.kind !== 'VERIFICATION_RESULT')) throw new Error('context_checkpoint_verification_kind_invalid');
  if (input.summary.kind === 'MODEL_GENERATED_SUMMARY' && input.summary.sourceEvidenceIds.length === 0) throw new Error('context_checkpoint_summary_provenance_required');
  const known = new Set(allEvidence.map(item => item.id)); if (input.summary.sourceEvidenceIds.some(id => !known.has(id))) throw new Error('context_checkpoint_summary_source_missing');
  const base = {schema: 'agent-control.context-checkpoint/v1' as const, id: `context-checkpoint:${randomUUID()}`, ...structuredClone(input), createdAt: at};
  return {...base, sha256: digest(base)};
}

export function verifyDurableContextCheckpoint(checkpoint: DurableContextCheckpoint) {
  const {sha256, ...base} = checkpoint;
  if (digest(base) !== sha256) throw new Error('context_checkpoint_hash_invalid');
  return true;
}

export function resumeFromContextCheckpoint(checkpoint: DurableContextCheckpoint, retrieved: EvidenceReference[] = []) {
  verifyDurableContextCheckpoint(checkpoint);
  if (retrieved.some(item => item.kind !== 'RETRIEVED_STATE' && item.kind !== 'ORIGINAL_EVIDENCE' && item.kind !== 'TOOL_RESULT')) throw new Error('context_checkpoint_retrieval_kind_invalid');
  return {jobId: checkpoint.jobId, objective: checkpoint.objective, constraints: [...checkpoint.constraints], decisions: [...checkpoint.decisions], completedSteps: [...checkpoint.completedSteps], outstandingWork: [...checkpoint.outstandingWork], nextAction: checkpoint.nextAction, budgetState: structuredClone(checkpoint.budgetState), checkpoint: {id: checkpoint.id, sha256: checkpoint.sha256}, context: {checkpointSummary: structuredClone(checkpoint.summary), authoritativeEvidence: checkpoint.evidence.filter(item => item.kind !== 'MODEL_GENERATED_SUMMARY'), retrieved: structuredClone(retrieved)}, verificationResults: structuredClone(checkpoint.verificationResults)};
}

export function classifyContextRuntimeFailure(input: {budgetExceeded?: boolean; verificationFailed?: boolean; toolFailed?: boolean; routeUnavailable?: boolean; noProgress?: boolean; qualityFailed?: boolean; contextExhausted?: boolean; memoryInsufficient?: boolean; runtimeMisconfigured?: boolean; modelFailedOnFeasibleRuntime?: boolean}): ContextFailureClass {
  if (input.budgetExceeded) return 'BUDGET_EXCEEDED';
  if (input.verificationFailed) return 'VERIFICATION_FAILURE';
  if (input.toolFailed) return 'TOOL_FAILURE';
  if (input.routeUnavailable) return 'ROUTING_FAILURE';
  if (input.contextExhausted) return 'CONTEXT_EXHAUSTION';
  if (input.memoryInsufficient) return 'MEMORY_CAPACITY_FAILURE';
  if (input.runtimeMisconfigured) return 'RUNTIME_CONFIGURATION_FAILURE';
  if (input.noProgress) return 'NO_PROGRESS';
  if (input.qualityFailed) return 'QUALITY_FAILURE';
  return 'MODEL_CAPABILITY_FAILURE';
}

export class ContextRuntimeManager {
  private events: ContextRuntimeEvent[] = [];
  private outcomes: RuntimeOutcomeObservation[] = [];
  constructor(readonly file?: string, private readonly clock = () => new Date().toISOString()) { this.load(); }

  recordEvent(jobId: string, type: ContextRuntimeEvent['type'], detail: Record<string, unknown>, evidence: string[] = []) {
    if (!jobId.trim()) throw new Error('context_runtime_event_job_required');
    const base = {id: `context-event:${randomUUID()}`, sequence: this.events.length + 1, at: this.clock(), type, jobId, detail: structuredClone(detail), evidence: unique(evidence), previousHash: this.events.at(-1)?.sha256 ?? null};
    const event: ContextRuntimeEvent = {...base, sha256: digest(base)}; this.events.push(event); this.save(); return structuredClone(event);
  }

  recordOutcome(outcome: RuntimeOutcomeObservation) {
    if (!outcome.taskClass.trim() || !outcome.candidateId.trim() || !Number.isFinite(outcome.durationMs) || outcome.durationMs < 0 || !Number.isSafeInteger(outcome.repairs) || outcome.repairs < 0) throw new Error('context_runtime_outcome_invalid');
    if (outcome.providerCharge !== null && (!Number.isFinite(outcome.providerCharge) || outcome.providerCharge < 0)) throw new Error('context_runtime_provider_charge_invalid');
    this.outcomes.push(structuredClone(outcome)); this.save(); return structuredClone(outcome);
  }

  verifiedHistory(taskClass?: string): VerifiedHistoryRow[] {
    const groups = new Map<string, RuntimeOutcomeObservation[]>();
    for (const item of this.outcomes.filter(value => !taskClass || value.taskClass === taskClass)) { const key = `${item.taskClass}|${item.candidateId}|${item.profile}`; groups.set(key, [...(groups.get(key) ?? []), item]); }
    return [...groups.entries()].map(([key, rows]) => {
      const charges = rows.map(row => row.providerCharge); const chargeKnown = charges.every(value => value !== null);
      const contexts = rows.map(row => row.peakContextTokens).filter((value): value is number => value !== null);
      return {key, taskClass: rows[0]!.taskClass, candidateId: rows[0]!.candidateId, profile: rows[0]!.profile, attempts: rows.length, providerCompletions: rows.filter(row => row.providerReportedCompletion).length, verifiedSuccesses: rows.filter(row => row.verification === 'PASSED').length, verificationFailures: rows.filter(row => row.verification === 'FAILED').length, medianContextTokens: median(contexts), p90ContextTokens: p90(contexts), medianDurationMs: median(rows.map(row => row.durationMs)) ?? 0, repairRate: rows.reduce((sum, row) => sum + row.repairs, 0) / rows.length, totalProviderCharge: chargeKnown ? charges.reduce<number>((sum, value) => sum + value!, 0) : null, evidence: unique(rows.flatMap(row => row.evidence))};
    }).sort((a, b) => a.key.localeCompare(b.key));
  }

  selectByVerifiedHistory(workload: WorkloadContextDemand, candidates: RuntimeCandidate[]) {
    const admissions = candidates.map(candidate => ({candidate, decision: assessContextRuntimeAdmission(workload, candidate)})), eligible = admissions.filter(item => item.decision.admitted), history = this.verifiedHistory(workload.taskClass);
    const scored = eligible.map(item => { const row = history.find(value => value.candidateId === item.candidate.id && value.profile === item.decision.profile), verifiedRate = row?.attempts ? row.verifiedSuccesses / row.attempts : 0, falseSuccessRate = row?.providerCompletions ? row.verificationFailures / row.providerCompletions : 0; return {...item, row, verifiedRate, falseSuccessRate}; }).sort((a, b) => b.verifiedRate - a.verifiedRate || a.falseSuccessRate - b.falseSuccessRate || (a.row?.medianDurationMs ?? Infinity) - (b.row?.medianDurationMs ?? Infinity) || (a.candidate.providerChargePerAttempt ?? Infinity) - (b.candidate.providerChargePerAttempt ?? Infinity) || a.candidate.id.localeCompare(b.candidate.id));
    return {selected: scored[0]?.candidate ?? null, selectedAdmission: scored[0]?.decision ?? null, considered: admissions.map(item => ({candidateId: item.candidate.id, outcome: item.decision.outcome, admitted: item.decision.admitted})), reason: scored[0] ? 'compatible_route_selected_from_independently_verified_task_class_history' : 'no_admissible_runtime'};
  }

  projection() { return {schema: CONTEXT_RUNTIME_SCHEMA, observedAt: this.clock(), events: structuredClone(this.events), outcomes: structuredClone(this.outcomes), history: this.verifiedHistory()}; }
  verifyChain() { let previous: string | null = null; this.events.forEach((event, index) => { const {sha256, ...base} = event; if (event.sequence !== index + 1 || event.previousHash !== previous || digest(base) !== sha256) throw new Error('context_runtime_event_chain_invalid'); previous = sha256; }); return true; }

  private save() { if (!this.file) return; fs.mkdirSync(path.dirname(this.file), {recursive: true}); const temp = `${this.file}.tmp`; fs.writeFileSync(temp, JSON.stringify({schema: CONTEXT_RUNTIME_SCHEMA, events: this.events, outcomes: this.outcomes} satisfies ContextRuntimeSnapshot, null, 2) + '\n', {mode: 0o600}); fs.renameSync(temp, this.file); }
  private load() { if (!this.file || !fs.existsSync(this.file)) return; const value = JSON.parse(fs.readFileSync(this.file, 'utf8')) as ContextRuntimeSnapshot; if (value.schema !== CONTEXT_RUNTIME_SCHEMA || !Array.isArray(value.events) || !Array.isArray(value.outcomes)) throw new Error('context_runtime_snapshot_invalid'); this.events = value.events; this.outcomes = value.outcomes; this.verifyChain(); }
}

export function verifiedOutcomeEconomics(rows: RuntimeOutcomeObservation[]) {
  const verified = rows.filter(row => row.verification === 'PASSED'), completions = rows.filter(row => row.providerReportedCompletion), allKnown = rows.every(row => row.providerCharge !== null), totalCharge = allKnown ? rows.reduce((sum, row) => sum + row.providerCharge!, 0) : null;
  return {attempts: rows.length, providerCompletions: completions.length, verifiedSuccesses: verified.length, providerCompletionRate: rows.length ? completions.length / rows.length : null, verifiedSuccessRate: rows.length ? verified.length / rows.length : null, falseSuccessRate: completions.length ? rows.filter(row => row.providerReportedCompletion && row.verification === 'FAILED').length / completions.length : null, providerChargePerCompletion: totalCharge !== null && completions.length ? totalCharge / completions.length : null, providerChargePerVerifiedSuccess: totalCharge !== null && verified.length ? totalCharge / verified.length : null, timePerVerifiedSuccessMs: verified.length ? rows.reduce((sum, row) => sum + row.durationMs, 0) / verified.length : null};
}

function validateWorkload(workload: WorkloadContextDemand) {
  if (!workload.taskClass.trim()) throw new Error('context_runtime_invalid:task_class');
  integer('estimated_input_tokens', workload.estimatedInputTokens); integer('estimated_tool_result_tokens', workload.estimatedToolResultTokens); integer('estimated_output_tokens', workload.estimatedOutputTokens); integer('anticipated_turns', workload.anticipatedTurns, 1); integer('anticipated_tool_calls', workload.anticipatedToolCalls);
  if (workload.maximumAllowedTokens !== undefined) integer('maximum_allowed_tokens', workload.maximumAllowedTokens, 1); money('maximum_provider_charge', workload.maximumProviderCharge);
}

function validateCandidate(candidate: RuntimeCandidate) {
  if (![candidate.id, candidate.providerId, candidate.modelId, candidate.workerId, candidate.runtimeId].every(value => value.trim())) throw new Error('context_runtime_invalid:candidate_identity');
  integer('model_context_limit', candidate.modelContextLimitTokens, 1); if (!candidate.configuredContextOptions.length) throw new Error('context_runtime_invalid:context_options'); candidate.configuredContextOptions.forEach(value => integer('configured_context_option', value, 1));
  for (const [name, measurement] of Object.entries({modelFootprint: candidate.modelFootprintBytes, runtimeOverhead: candidate.runtimeOverheadBytes, contextBytesPerToken: candidate.contextBytesPerToken, availableRam: candidate.workerAvailableRamBytes, availableVram: candidate.workerAvailableVramBytes, totalVram: candidate.workerTotalVramBytes})) if (measurement.value !== null && (!Number.isFinite(measurement.value) || measurement.value < 0)) throw new Error(`context_runtime_invalid:${name}`);
  integer('minimum_ram_reserve', candidate.minimumRamSafetyReserveBytes); integer('minimum_vram_reserve', candidate.minimumVramSafetyReserveBytes);
}
