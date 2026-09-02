import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {GovernedHandoffRuntime, HandoffRequest} from './handoff-runtime.js';

export const TOKEN_BATON_ROUTING_SCHEMA = 'agent-control.token-aware-baton-routing/v1' as const;
export type TelemetryAuthority = 'authoritative' | 'estimated' | 'unavailable';
export type GovernorState = 'CONTINUE' | 'PREPARE_BATON' | 'COMPACT' | 'HANDOFF';
export type RoutingAction = 'CONTINUE' | 'COMPACT_AND_CONTINUE' | 'BATON_AND_HANDOFF';
export type RemainingWork = 'DIFFICULT' | 'BOUNDED' | 'MECHANICAL';
export type ReasoningState = 'UNFINISHED' | 'COMPLETE';

export interface TokenGovernorPolicy {
  prepareBatonPercent: number;
  compactPercent: number;
  handoffPercent: number;
  sampleRetention: number;
}

export const DEFAULT_TOKEN_GOVERNOR_POLICY: TokenGovernorPolicy = Object.freeze({prepareBatonPercent: 75, compactPercent: 85, handoffPercent: 90, sampleRetention: 240});

export interface TokenAmounts {inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;}
export interface ContextOccupancy {tokens: number | null; limitTokens: number | null; authority: TelemetryAuthority; source: string;}
export interface CostEstimate {amount: number | null; currency: string | null; authority: TelemetryAuthority; source: string;}
export interface TokenTelemetrySample {
  threadId: string;
  parcelId: string;
  agentId: string;
  providerId: string;
  modelId: string;
  observedAt?: string;
  elapsedMs: number;
  active?: boolean;
  cumulative: Partial<TokenAmounts>;
  context?: Partial<ContextOccupancy>;
  cost?: Partial<CostEstimate>;
}

export interface TokenTelemetryPoint {
  at: string;
  elapsedMs: number;
  cumulative: TokenAmounts;
  context: ContextOccupancy;
  contextPercent: number | null;
  cost: CostEstimate;
}

export interface ThreadTokenRecord {
  id: string;
  parcelId: string;
  agentId: string;
  providerId: string;
  modelId: string;
  startedAt: string;
  updatedAt: string;
  active: boolean;
  recoverable: boolean;
  governor: {state: GovernorState; currentThreshold: number | null; nextThreshold: number | null; reason: string};
  latest: TokenTelemetryPoint;
  samples: TokenTelemetryPoint[];
  batonId?: string;
}

export interface ParcelTokenTotals {
  parcelId: string;
  threads: string[];
  byModel: Array<{providerId: string; modelId: string; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; cost: number | null; currency: string | null}>;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
  currency: string | null;
}

export interface VerifiedBaton {
  schema: 'agent-control.token-baton/v1';
  id: string;
  threadId: string;
  parcelId: string;
  providerId: string;
  modelId: string;
  objective: string;
  completedWork: string[];
  decisions: string[];
  filesChanged: string[];
  git: {sha: string; dirty: boolean; diffSummary: string};
  testsAndEvidence: string[];
  unresolvedIssues: string[];
  nextAction: string;
  tokenState: TokenTelemetryPoint;
  parcelTotals: ParcelTokenTotals;
  createdAt: string;
  sha256: string;
}

export interface BatonInput extends Omit<VerifiedBaton, 'schema' | 'id' | 'tokenState' | 'parcelTotals' | 'createdAt' | 'sha256'> {}
export interface TokenRoutingDecision {
  id: string;
  at: string;
  threadId: string;
  parcelId: string;
  state: GovernorState;
  action: RoutingAction;
  reason: string;
  contextPercent: number | null;
  target?: {providerId: string; modelId: string};
  batonId?: string;
  outcome: 'RECORDED' | 'SUCCEEDED' | 'FAILED';
}

export interface TokenRoutingCandidate {providerId: string; modelId: string; estimatedCost: number | null; qualified: boolean; capabilities: string[];}
export interface RoutingAssessment {remainingWork: RemainingWork; reasoningState: ReasoningState; requiredCapabilities: string[]; candidates: TokenRoutingCandidate[];}
export interface TokenRoutingEvent {type: 'telemetry' | 'governor.transition' | 'baton.created' | 'handoff.result'; threadId: string; parcelId: string; at: string;}
export interface TokenRoutingProjection {schema: typeof TOKEN_BATON_ROUTING_SCHEMA; observedAt: string; policy: TokenGovernorPolicy; threads: ThreadTokenRecord[]; parcels: ParcelTokenTotals[]; decisions: TokenRoutingDecision[];}

interface Snapshot {schema: typeof TOKEN_BATON_ROUTING_SCHEMA; policy: TokenGovernorPolicy; threads: ThreadTokenRecord[]; batons: VerifiedBaton[]; decisions: TokenRoutingDecision[];}
const emptyAmounts = (): TokenAmounts => ({inputTokens: null, outputTokens: null, totalTokens: null});
const emptyContext = (): ContextOccupancy => ({tokens: null, limitTokens: null, authority: 'unavailable', source: 'provider_not_reported'});
const emptyCost = (): CostEstimate => ({amount: null, currency: null, authority: 'unavailable', source: 'provider_not_reported'});
const now = () => new Date().toISOString();
const validNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const clone = <T>(value: T): T => structuredClone(value);

export function normalizeGovernorPolicy(input: Partial<TokenGovernorPolicy> = {}): TokenGovernorPolicy {
  const value = {...DEFAULT_TOKEN_GOVERNOR_POLICY, ...input};
  for (const key of ['prepareBatonPercent', 'compactPercent', 'handoffPercent'] as const) if (!Number.isFinite(value[key]) || value[key] <= 0 || value[key] >= 100) throw new Error(`token_governor_${key}_invalid`);
  if (!(value.prepareBatonPercent < value.compactPercent && value.compactPercent < value.handoffPercent)) throw new Error('token_governor_threshold_order_invalid');
  if (!Number.isSafeInteger(value.sampleRetention) || value.sampleRetention < 2 || value.sampleRetention > 10_000) throw new Error('token_governor_sample_retention_invalid');
  return value;
}

export function governorFor(contextPercent: number | null, policy: TokenGovernorPolicy): ThreadTokenRecord['governor'] {
  if (contextPercent === null) return {state: 'CONTINUE', currentThreshold: null, nextThreshold: policy.prepareBatonPercent, reason: 'current_context_unavailable'};
  if (contextPercent >= policy.handoffPercent) return {state: 'HANDOFF', currentThreshold: policy.handoffPercent, nextThreshold: null, reason: 'context_handoff_threshold_reached'};
  if (contextPercent >= policy.compactPercent) return {state: 'COMPACT', currentThreshold: policy.compactPercent, nextThreshold: policy.handoffPercent, reason: 'context_compaction_threshold_reached'};
  if (contextPercent >= policy.prepareBatonPercent) return {state: 'PREPARE_BATON', currentThreshold: policy.prepareBatonPercent, nextThreshold: policy.compactPercent, reason: 'context_baton_preparation_threshold_reached'};
  return {state: 'CONTINUE', currentThreshold: null, nextThreshold: policy.prepareBatonPercent, reason: 'context_within_policy'};
}

export class TokenAwareBatonRuntime {
  private readonly threads = new Map<string, ThreadTokenRecord>();
  private readonly batons = new Map<string, VerifiedBaton>();
  private readonly decisions: TokenRoutingDecision[] = [];
  private readonly listeners = new Set<(event: TokenRoutingEvent) => void>();
  readonly policy: TokenGovernorPolicy;

  constructor(readonly file?: string, policy: Partial<TokenGovernorPolicy> = {}, private readonly clock: () => string = now) {
    this.policy = normalizeGovernorPolicy(policy); this.load();
  }

  subscribe(listener: (event: TokenRoutingEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  thread(id: string) { const value = this.threads.get(id); if (!value) throw new Error('token_thread_missing'); return clone(value); }
  baton(id: string) { const value = this.batons.get(id); if (!value) throw new Error('token_baton_missing'); return clone(value); }

  observe(input: TokenTelemetrySample): ThreadTokenRecord {
    if (!input.threadId || !input.parcelId || !input.agentId || !input.providerId || !input.modelId || !validNumber(input.elapsedMs)) throw new Error('token_telemetry_identity_invalid');
    const at = input.observedAt ?? this.clock(); if (Number.isNaN(Date.parse(at))) throw new Error('token_telemetry_timestamp_invalid');
    const prior = this.threads.get(input.threadId), cumulative = mergeAmounts(prior?.latest.cumulative ?? emptyAmounts(), input.cumulative);
    const context = mergeContext(prior?.latest.context ?? emptyContext(), input.context), cost = mergeCost(prior?.latest.cost ?? emptyCost(), input.cost);
    const contextPercent = context.tokens === null || context.limitTokens === null || context.limitTokens === 0 ? null : Math.min(100, context.tokens / context.limitTokens * 100);
    const latest: TokenTelemetryPoint = {at, elapsedMs: input.elapsedMs, cumulative, context, contextPercent, cost};
    if (prior && (prior.parcelId !== input.parcelId || prior.agentId !== input.agentId || prior.providerId !== input.providerId || prior.modelId !== input.modelId)) throw new Error('token_thread_identity_changed');
    const governor = governorFor(contextPercent, this.policy), active = input.active ?? prior?.active ?? true;
    const record: ThreadTokenRecord = prior ? {...prior, updatedAt: at, active, latest, governor, samples: [...prior.samples, latest].slice(-this.policy.sampleRetention)} : {id: input.threadId, parcelId: input.parcelId, agentId: input.agentId, providerId: input.providerId, modelId: input.modelId, startedAt: at, updatedAt: at, active, recoverable: true, governor, latest, samples: [latest]};
    this.threads.set(record.id, record);
    this.save(); this.emit({type: 'telemetry', threadId: record.id, parcelId: record.parcelId, at});
    if (!prior || prior.governor.state !== governor.state) this.record(record, actionFor(governor.state), governor.reason, 'RECORDED');
    return clone(record);
  }

  assess(threadId: string, assessment: RoutingAssessment): TokenRoutingDecision {
    const thread = this.thread(threadId), state = thread.governor.state, pressure = thread.latest.contextPercent;
    let action: RoutingAction = state === 'COMPACT' || state === 'HANDOFF' ? 'COMPACT_AND_CONTINUE' : 'CONTINUE', reason = thread.governor.reason, target: TokenRoutingDecision['target'];
    if (state === 'HANDOFF' && assessment.reasoningState === 'COMPLETE' && ['BOUNDED', 'MECHANICAL'].includes(assessment.remainingWork)) {
      const currentCost = thread.latest.cost.amount;
      const eligible = assessment.candidates.filter(candidate => candidate.qualified && assessment.requiredCapabilities.every(capability => candidate.capabilities.includes(capability)) && candidate.providerId + '/' + candidate.modelId !== thread.providerId + '/' + thread.modelId && (currentCost === null || candidate.estimatedCost === null || candidate.estimatedCost < currentCost));
      const selected = eligible.sort((a, b) => (a.estimatedCost ?? Infinity) - (b.estimatedCost ?? Infinity) || `${a.providerId}/${a.modelId}`.localeCompare(`${b.providerId}/${b.modelId}`))[0];
      if (selected) { action = 'BATON_AND_HANDOFF'; target = {providerId: selected.providerId, modelId: selected.modelId}; reason = 'context_handoff_threshold_and_bounded_work_on_qualified_lower_cost_route'; }
      else reason = assessment.reasoningState === 'COMPLETE' ? 'context_high_no_qualified_cheaper_route' : 'difficult_reasoning_remains_on_current_model';
    }
    if (assessment.reasoningState === 'UNFINISHED' && state === 'HANDOFF') { action = 'COMPACT_AND_CONTINUE'; reason = 'difficult_reasoning_remains_on_current_model'; }
    return this.record(thread, action, reason, 'RECORDED', target);
  }

  createBaton(input: BatonInput): VerifiedBaton {
    const thread = this.thread(input.threadId);
    if (thread.parcelId !== input.parcelId || thread.providerId !== input.providerId || thread.modelId !== input.modelId) throw new Error('token_baton_provenance_mismatch');
    for (const [field, value] of Object.entries({objective: input.objective, nextAction: input.nextAction, gitSha: input.git?.sha})) if (typeof value !== 'string' || !value.trim()) throw new Error(`token_baton_${field}_required`);
    for (const value of [input.completedWork, input.decisions, input.filesChanged, input.testsAndEvidence, input.unresolvedIssues]) if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('token_baton_array_invalid');
    const createdAt = this.clock(), id = `token-baton:${randomUUID()}`, withoutHash = {schema: 'agent-control.token-baton/v1' as const, id, ...clone(input), tokenState: clone(thread.latest), parcelTotals: this.parcel(thread.parcelId), createdAt};
    const baton: VerifiedBaton = {...withoutHash, sha256: digest(withoutHash)};
    this.batons.set(id, baton); const stored = this.threads.get(thread.id)!; stored.batonId = id; this.threads.set(stored.id, stored); this.save(); this.emit({type: 'baton.created', threadId: thread.id, parcelId: thread.parcelId, at: createdAt}); return clone(baton);
  }

  async handoff(threadId: string, batonId: string, target: {providerId: string; modelId: string}, execute: () => Promise<void>): Promise<TokenRoutingDecision> {
    const thread = this.thread(threadId), baton = this.baton(batonId); if (baton.threadId !== thread.id) throw new Error('token_handoff_baton_thread_mismatch');
    this.record(thread, 'BATON_AND_HANDOFF', 'verified_baton_ready_for_explicit_handoff', 'RECORDED', target, batonId);
    try { await execute(); const original = this.threads.get(thread.id)!; original.recoverable = true; this.threads.set(original.id, original); this.save(); return this.record(thread, 'BATON_AND_HANDOFF', 'handoff_completed_original_thread_recoverable', 'SUCCEEDED', target, batonId); }
    catch (error) { const original = this.threads.get(thread.id)!; original.recoverable = true; original.governor = {...original.governor, state: 'CONTINUE', reason: 'handoff_failed_resume_original_thread'}; this.threads.set(original.id, original); this.save(); return this.record(thread, 'CONTINUE', `handoff_failed_resume_original_thread:${message(error)}`, 'FAILED', target, batonId); }
  }

  async governedHandoff(threadId: string, batonId: string, target: {providerId: string; modelId: string}, handoffs: GovernedHandoffRuntime, request: Omit<HandoffRequest, 'baton' | 'reason'>, executeDestination?: (result: Awaited<ReturnType<GovernedHandoffRuntime['request']>>) => Promise<void>) {
    return this.handoff(threadId, batonId, target, async () => {
      const result = await handoffs.request({...request, reason: 'Token governor approved verified baton handoff', baton: {tokenBatonId: batonId, tokenBatonSha256: this.baton(batonId).sha256}});
      if (result.status !== 'COMPLETED') throw new Error(`governed_handoff_not_completed:${result.status}`);
      await executeDestination?.(result);
    });
  }

  parcel(parcelId: string): ParcelTokenTotals {
    const threads = [...this.threads.values()].filter(thread => thread.parcelId === parcelId), byModel = new Map<string, ParcelTokenTotals['byModel'][number]>();
    for (const thread of threads) {
      const key = `${thread.providerId}\u0000${thread.modelId}`, existing = byModel.get(key);
      if (!existing) {
        byModel.set(key, {providerId: thread.providerId, modelId: thread.modelId, ...clone(thread.latest.cumulative), cost: thread.latest.cost.amount, currency: thread.latest.cost.currency});
        continue;
      }
      existing.inputTokens = sum(existing.inputTokens, thread.latest.cumulative.inputTokens); existing.outputTokens = sum(existing.outputTokens, thread.latest.cumulative.outputTokens); existing.totalTokens = sum(existing.totalTokens, thread.latest.cumulative.totalTokens); existing.cost = sum(existing.cost, thread.latest.cost.amount); existing.currency = existing.currency ?? thread.latest.cost.currency; byModel.set(key, existing);
    }
    const values = [...byModel.values()];
    return {parcelId, threads: threads.map(thread => thread.id).sort(), byModel: clone(values), inputTokens: aggregate(values.map(value => value.inputTokens)), outputTokens: aggregate(values.map(value => value.outputTokens)), totalTokens: aggregate(values.map(value => value.totalTokens)), cost: aggregate(values.map(value => value.cost)), currency: [...new Set(values.map(value => value.currency).filter((value): value is string => Boolean(value)))].length === 1 ? values.find(value => value.currency)?.currency ?? null : null};
  }

  projection(): TokenRoutingProjection { const parcels = [...new Set([...this.threads.values()].map(thread => thread.parcelId))].sort().map(id => this.parcel(id)); return {schema: TOKEN_BATON_ROUTING_SCHEMA, observedAt: this.clock(), policy: clone(this.policy), threads: [...this.threads.values()].sort((a,b) => a.id.localeCompare(b.id)).map(clone), parcels, decisions: this.decisions.map(clone)}; }
  evidence() { return {schema: TOKEN_BATON_ROUTING_SCHEMA, policy: clone(this.policy), threads: [...this.threads.values()].map(clone), batons: [...this.batons.values()].map(clone), decisions: this.decisions.map(clone)} satisfies Snapshot; }

  private record(thread: ThreadTokenRecord, action: RoutingAction, reason: string, outcome: TokenRoutingDecision['outcome'], target?: TokenRoutingDecision['target'], batonId?: string) { const decision: TokenRoutingDecision = {id: `token-route:${randomUUID()}`, at: this.clock(), threadId: thread.id, parcelId: thread.parcelId, state: thread.governor.state, action, reason, contextPercent: thread.latest.contextPercent, ...(target ? {target} : {}), ...(batonId ? {batonId} : {}), outcome}; this.decisions.push(decision); this.save(); this.emit({type: outcome === 'RECORDED' ? 'governor.transition' : 'handoff.result', threadId: thread.id, parcelId: thread.parcelId, at: decision.at}); return clone(decision); }
  private emit(event: TokenRoutingEvent) { for (const listener of this.listeners) listener(event); }
  private load() { if (!this.file || !fs.existsSync(this.file)) return; const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Snapshot; if (parsed.schema !== TOKEN_BATON_ROUTING_SCHEMA) throw new Error('token_routing_snapshot_unsupported'); normalizeGovernorPolicy(parsed.policy); for (const item of parsed.threads ?? []) this.threads.set(item.id, item); for (const item of parsed.batons ?? []) this.batons.set(item.id, item); this.decisions.push(...(parsed.decisions ?? [])); }
  private save() { if (!this.file) return; fs.mkdirSync(path.dirname(this.file), {recursive: true, mode: 0o700}); const temporary = `${this.file}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(this.evidence(), null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, this.file); }
}

function mergeAmounts(previous: TokenAmounts, input: Partial<TokenAmounts>): TokenAmounts { const next = {inputTokens: valid(input.inputTokens) ?? previous.inputTokens, outputTokens: valid(input.outputTokens) ?? previous.outputTokens, totalTokens: valid(input.totalTokens) ?? previous.totalTokens}; if (next.totalTokens === null && next.inputTokens !== null && next.outputTokens !== null) next.totalTokens = next.inputTokens + next.outputTokens; for (const [name, value] of Object.entries(next)) if (value !== null && previous[name as keyof TokenAmounts] !== null && value < previous[name as keyof TokenAmounts]!) throw new Error(`token_telemetry_cumulative_${name}_decreased`); return next; }
function mergeContext(previous: ContextOccupancy, input?: Partial<ContextOccupancy>): ContextOccupancy { if (!input) return previous; const authority = input.authority ?? previous.authority, tokens = valid(input.tokens) ?? previous.tokens, limitTokens = valid(input.limitTokens) ?? previous.limitTokens; if (authority === 'authoritative' && (tokens === null || limitTokens === null)) throw new Error('token_context_authoritative_values_required'); return {tokens, limitTokens, authority, source: input.source ?? previous.source}; }
function mergeCost(previous: CostEstimate, input?: Partial<CostEstimate>): CostEstimate { if (!input) return previous; return {amount: valid(input.amount) ?? previous.amount, currency: input.currency ?? previous.currency, authority: input.authority ?? previous.authority, source: input.source ?? previous.source}; }
function valid(value: unknown) { return validNumber(value) ? value : null; }
function actionFor(state: GovernorState): RoutingAction { return state === 'CONTINUE' || state === 'PREPARE_BATON' ? 'CONTINUE' : 'COMPACT_AND_CONTINUE'; }
function sum(left: number | null, right: number | null) { return left === null || right === null ? null : left + right; }
function aggregate(values: Array<number | null>) { return values.length && values.every((value): value is number => value !== null) ? values.reduce((total, value) => total + value, 0) : null; }
function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function message(error: unknown) { return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, '_').slice(0, 160); }
