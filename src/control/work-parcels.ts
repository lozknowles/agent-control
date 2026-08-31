import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {HarnessEfficiencyLedgerPort, ModelInvocationObservation} from './harness-efficiency.js';
import type {JobRuntime} from './job-runtime.js';
import type {RunRecord} from './job-types.js';
import type {SystemReadiness} from './system-readiness.js';

export type ParcelStatus = 'PLANNING' | 'QUEUED' | 'RUNNING' | 'WAITING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type ParcelStageStatus = 'QUEUED' | 'BLOCKED' | 'RUNNING' | 'WAITING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export interface WorkParcelPlanStage {
  id: string; name: string; job: string; dependsOn?: string[]; parameters?: Record<string, unknown>;
  requestedRoute?: {provider?: string; model?: string; profile?: 'THIN' | 'STANDARD' | 'DEEP'; reason: string};
}
export interface WorkParcelPlan {objective: string; planner: {kind: 'deterministic' | 'reasoning-model'; provider?: string; model?: string; reason: string}; stages: WorkParcelPlanStage[];}
export interface WorkParcelStage extends WorkParcelPlanStage {
  dependsOn: string[]; parameters: Record<string, unknown>; status: ParcelStageStatus; runId?: string; waitingReason?: string; error?: string;
  baton?: {schema: 'agent-control.work-parcel-baton/v1'; artifactIds: string[]; outputTypes: string[]};
  actualRoute?: {workers: string[]; provider?: string; model?: string; profile?: string; reason: string};
  startedAt?: string; endedAt?: string;
}
export interface WorkParcelTelemetry {freshInputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null; totalTokens: number | null; cost: number | null; currency: string | null; elapsedMs: number;}
export interface WorkParcelDecision {outcome: 'IN_PROGRESS' | 'COMPLETE' | 'FAIL_CLOSED' | 'CANCELLED'; title: string; summary: string; evidence: string[]; blockedStages: string[]; authority: 'Agent Control';}
export interface WorkParcelInvocationAudit {id: string; stageId: string; runId: string | null; route: string; provider: string; model: string; node: string | null; profile: string; startedAt: string; completedAt: string | null; elapsedMs: number | null; freshInputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null; totalTokens: number | null; providerReportedCost: number | null; calculatedCost: number | null; costBasis: 'provider-reported' | 'calculated' | 'unavailable'; currency: string | null; costAccounting?: ModelInvocationObservation['costAccounting']; verifierResult: string; outcome: string;}
export interface WorkParcelAuditEvent {id: string; at: string; type: 'task.received' | 'task.classified' | 'target.resolving' | 'target.found' | 'readiness.checked' | 'planning.started' | 'planning.failed' | 'plan.selected' | 'route.requested' | 'stage.dispatched' | 'stage.failed' | 'route.resolved' | 'invocation.completed' | 'route.changed' | 'verification.completed'; stageId?: string; summary: string; detail: string;}
export interface WorkParcelAudit {schema: 'agent-control.work-parcel-audit/v1'; recordedAt: string; classification: string; selectedExecution: 'Work Parcel'; planningRationale: string; planner: {kind: string; provider: string | null; model: string | null}; alternatives: Array<{stageId: string; candidate: string; eligible: boolean; reasons: string[]}>; timeline: WorkParcelAuditEvent[]; invocations: WorkParcelInvocationAudit[]; totals: {models: string[]; invocations: number; freshInputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null; totalTokens: number | null; providerReportedCost: number | null; calculatedCost: number | null; cost: number | null; costBasis: 'provider-reported' | 'calculated' | 'unavailable'; currency: string | null; modelExecutionMs: number; wallClockMs: number};}
export interface WorkParcel {id: string; prompt: string; objective: string; actor: string; status: ParcelStatus; planner: WorkParcelPlan['planner']; stages: WorkParcelStage[]; createdAt: string; updatedAt: string; endedAt?: string; telemetry: WorkParcelTelemetry; decision?: WorkParcelDecision; audit: WorkParcelAudit; provenance: Array<{at: string; type: string; detail: string}>;}
export interface WorkParcelPlanner {plan(prompt: string): Promise<WorkParcelPlan> | WorkParcelPlan;}
export type ReasoningPlanProposer = (input: {prompt: string; jobs: Array<{id: string; name: string; version: string; description?: string}>}) => Promise<unknown>;

interface Snapshot {version: 1; parcels: WorkParcel[];}
const terminalRun = new Set(['SUCCEEDED', 'FAILED', 'DEGRADED', 'CANCELLED', 'MISSED', 'DISCONNECTED']);
const failedRun = new Set(['FAILED', 'DEGRADED', 'CANCELLED', 'MISSED', 'DISCONNECTED']);
const now = () => new Date().toISOString();
function writeAtomic(file: string, value: unknown) { fs.mkdirSync(path.dirname(file), {recursive: true}); const temporary = `${file}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, file); }

export class WorkParcelStore {
  private readonly values = new Map<string, WorkParcel>();
  constructor(readonly file: string) { if (fs.existsSync(file)) { const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot; if (parsed.version !== 1) throw new Error('unsupported_work_parcel_snapshot'); for (const parcel of parsed.parcels) this.values.set(parcel.id, parcel); } }
  add(parcel: WorkParcel) { if (this.values.has(parcel.id)) throw new Error('work_parcel_exists'); this.values.set(parcel.id, structuredClone(parcel)); this.save(); return this.get(parcel.id)!; }
  get(id: string) { const value = this.values.get(id); return value ? structuredClone(value) : undefined; }
  list() { return [...this.values.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(value => structuredClone(value)); }
  update(parcel: WorkParcel) { if (!this.values.has(parcel.id)) throw new Error('work_parcel_missing'); parcel.updatedAt = now(); this.values.set(parcel.id, structuredClone(parcel)); this.save(); return this.get(parcel.id)!; }
  private save() { writeAtomic(this.file, {version: 1, parcels: this.list()} satisfies Snapshot); }
}

export class CatalogNaturalLanguagePlanner implements WorkParcelPlanner {
  constructor(private readonly runtime: JobRuntime, private readonly complex?: WorkParcelPlanner) {}
  async plan(prompt: string) {
    const normalized = prompt.trim(); if (!normalized) throw new Error('work_parcel_prompt_required');
    const jobs = this.runtime.catalog.listJobs(), mentioned = jobs.filter(job => normalized.toLowerCase().includes(job.metadata.id.toLowerCase()));
    if (mentioned.length === 1) return {objective: normalized, planner: {kind: 'deterministic' as const, reason: `Prompt named registered Job ${mentioned[0].metadata.id}`}, stages: [{id: 'execute', name: mentioned[0].metadata.name, job: `${mentioned[0].metadata.id}@${mentioned[0].metadata.version}`, requestedRoute: {reason: 'Use normal Agent Control placement and routing'}}]};
    if (/(?:\b(?:evaluate|qualify|benchmark|test)\b.*\bfreetoken\b|\bfreetoken\b.*\b(?:evaluate|qualify|benchmark|test)\b)/i.test(normalized)) return freeTokenEvaluationPlan(normalized);
    if (!this.complex) throw new Error('work_parcel_reasoning_planner_unconfigured');
    return this.complex.plan(normalized);
  }
}

/** Adapts a model call into plan data only; validation and execution remain Agent Control responsibilities. */
export class ReasoningModelWorkParcelPlanner implements WorkParcelPlanner {
  constructor(private readonly runtime: JobRuntime, private readonly provider: string, private readonly model: string, private readonly propose: ReasoningPlanProposer) {}
  async plan(prompt: string): Promise<WorkParcelPlan> {
    const jobs = this.runtime.catalog.listJobs().map(job => ({id: job.metadata.id, name: job.metadata.name, version: job.metadata.version, description: job.metadata.description}));
    const raw = await this.propose({prompt, jobs}); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('work_parcel_reasoning_plan_invalid');
    const value = raw as {objective?: unknown; stages?: unknown}; if (!Array.isArray(value.stages)) throw new Error('work_parcel_reasoning_plan_invalid');
    const stages = value.stages.map(item => { if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('work_parcel_reasoning_plan_invalid'); const stage = item as Record<string, unknown>, allowed = new Set(['id','name','job','dependsOn','parameters','requestedRoute']); if (Object.keys(stage).some(key => !allowed.has(key)) || !['id','name','job'].every(key => typeof stage[key] === 'string')) throw new Error('work_parcel_reasoning_plan_invalid'); return structuredClone(stage) as unknown as WorkParcelPlanStage; });
    return {objective: typeof value.objective === 'string' && value.objective.trim() ? value.objective : prompt, planner: {kind: 'reasoning-model', provider: this.provider, model: this.model, reason: 'Reasoning model proposed registered Job references; Agent Control validation is authoritative'}, stages};
  }
}

export function validateWorkParcelPlan(plan: WorkParcelPlan, runtime: JobRuntime) {
  if (!plan.objective.trim() || !plan.stages.length) throw new Error('work_parcel_plan_empty');
  const ids = new Set<string>();
  for (const stage of plan.stages) { if (!/^[a-z0-9][a-z0-9-]*$/.test(stage.id) || ids.has(stage.id)) throw new Error('work_parcel_stage_id_invalid'); if (typeof stage.name !== 'string' || !stage.name.trim() || typeof stage.job !== 'string' || !Array.isArray(stage.dependsOn ?? []) || (stage.dependsOn ?? []).some(value => typeof value !== 'string') || (stage.parameters !== undefined && (!stage.parameters || typeof stage.parameters !== 'object' || Array.isArray(stage.parameters)))) throw new Error('work_parcel_stage_invalid'); if (stage.requestedRoute && (typeof stage.requestedRoute.reason !== 'string' || (stage.requestedRoute.provider !== undefined && typeof stage.requestedRoute.provider !== 'string') || (stage.requestedRoute.model !== undefined && typeof stage.requestedRoute.model !== 'string') || (stage.requestedRoute.profile !== undefined && !['THIN','STANDARD','DEEP'].includes(stage.requestedRoute.profile)))) throw new Error('work_parcel_route_invalid'); ids.add(stage.id); if (!runtime.catalog.job(stage.job)) throw new Error(`work_parcel_job_missing:${stage.job}`); }
  for (const stage of plan.stages) for (const dependency of stage.dependsOn ?? []) if (!ids.has(dependency) || dependency === stage.id) throw new Error(`work_parcel_dependency_invalid:${stage.id}:${dependency}`);
  const visiting = new Set<string>(), visited = new Set<string>(), byId = new Map(plan.stages.map(stage => [stage.id, stage]));
  const visit = (id: string) => { if (visiting.has(id)) throw new Error('work_parcel_dependency_cycle'); if (visited.has(id)) return; visiting.add(id); for (const dependency of byId.get(id)?.dependsOn ?? []) visit(dependency); visiting.delete(id); visited.add(id); }; for (const id of ids) visit(id);
  return structuredClone(plan);
}

export class WorkParcelCoordinator {
  private readonly planning = new Set<string>();
  constructor(readonly runtime: JobRuntime, readonly store: WorkParcelStore, readonly planner: WorkParcelPlanner, private readonly efficiency?: HarnessEfficiencyLedgerPort) {}
  async submit(prompt: string, actor: string) {
    const plan = validateWorkParcelPlan(await this.planner.plan(prompt), this.runtime), at = now();
    return this.store.add({id: `parcel-${randomUUID()}`, prompt, objective: plan.objective, actor, status: 'QUEUED', planner: plan.planner, stages: plan.stages.map(stage => ({...stage, dependsOn: [...(stage.dependsOn ?? [])], parameters: structuredClone(stage.parameters ?? {}), status: 'QUEUED'})), createdAt: at, updatedAt: at, telemetry: emptyTelemetry(), audit: createDecisionAudit(prompt, plan, this.runtime, at), provenance: [{at, type: 'submitted', detail: `Natural-language request accepted; planner=${plan.planner.kind}`} ]});
  }
  accept(prompt: string, actor: string, systems: SystemReadiness[] = []) {
    if (!prompt.trim()) throw new Error('work_parcel_prompt_required');
    const at = now(), target = systems.find(system => new RegExp(`\\b${escapeRegExp(system.id)}\\b`, 'i').test(prompt) || new RegExp(`\\b${escapeRegExp(system.name)}\\b`, 'i').test(prompt));
    const timeline: WorkParcelAuditEvent[] = [event(at, 'task.received', 'Natural-language task accepted', 'Verbatim prompt retained before planning'), event(at, 'task.classified', 'Task queued for governed planning', 'Registered Job selection remains authoritative')];
    if (target) timeline.push(event(at, 'target.resolving', `Resolving target: ${target.name}`, target.id), event(at, 'target.found', 'Target found', `${target.type}:${target.id}`), event(at, 'readiness.checked', `Execution state: ${target.execution}`, `Reachability: ${target.reachable}; Authentication: ${target.authentication}; Capabilities: ${target.capabilities.join(', ') || 'none reported'}`));
    timeline.push(event(at, 'planning.started', 'Selecting registered Job', 'Planner may only select Jobs present in the canonical catalog'));
    const blocked = target && ['AUTH REQUIRED','OFFLINE','DEGRADED','UNKNOWN'].includes(target.execution) ? `BLOCKED — ${target.name} ${target.blockingReason ?? target.execution.toLowerCase()}` : null;
    const parcel = this.store.add({id: `parcel-${randomUUID()}`, prompt, objective: prompt, actor, status: blocked ? 'FAILED' : 'PLANNING', planner: {kind: 'deterministic', reason: blocked ?? 'Planning pending'}, stages: [], createdAt: at, updatedAt: at, ...(blocked ? {endedAt: at} : {}), telemetry: emptyTelemetry(), audit: planningAudit(at, timeline, blocked), provenance: [{at, type: 'submitted', detail: 'Natural-language request durably accepted before planning'}, ...(blocked ? [{at, type: 'readiness.blocked', detail: blocked}] : [])]});
    if (!blocked) this.startPlanning(parcel.id);
    return parcel;
  }
  get(id: string) { let value = this.store.get(id); if (!value) throw new Error('work_parcel_missing'); if (this.captureLiveRoutes(value)) value = this.store.update(value); return this.withTelemetry(value); }
  list() { return this.store.list().map(value => { if (this.captureLiveRoutes(value)) value = this.store.update(value); return this.withTelemetry(value); }); }
  cancel(id: string, actor: string) { const parcel = this.get(id); for (const stage of parcel.stages) if (stage.runId && !['SUCCEEDED','FAILED','CANCELLED'].includes(stage.status)) this.runtime.cancel(stage.runId, `parcel_cancelled_by:${actor}`); for (const stage of parcel.stages) if (!['SUCCEEDED','FAILED'].includes(stage.status)) stage.status = 'CANCELLED'; parcel.status = 'CANCELLED'; parcel.endedAt = now(); parcel.provenance.push({at: now(), type: 'cancelled', detail: actor}); return this.store.update(parcel); }
  async tick() {
    for (const stored of this.store.list().filter(parcel => ['PLANNING','QUEUED','RUNNING','WAITING'].includes(parcel.status)).reverse()) {
      if (stored.status === 'PLANNING') { this.startPlanning(stored.id); return this.get(stored.id); }
      const before = JSON.stringify({status: stored.status, stages: stored.stages.map(stage => [stage.status, stage.runId, stage.waitingReason, stage.error])}), parcel = this.reconcile(stored); if (['SUCCEEDED','FAILED','CANCELLED'].includes(parcel.status)) { this.store.update(parcel); return this.get(parcel.id); }
      const ready = parcel.stages.find(stage => stage.status === 'QUEUED' && stage.dependsOn.every(id => parcel.stages.find(item => item.id === id)?.status === 'SUCCEEDED'));
      if (ready) {
        try { const run = this.runtime.createRun(ready.job, ready.parameters, {type: 'manual', actor: `work-parcel:${parcel.id}`}); ready.runId = run.id; ready.status = 'RUNNING'; ready.startedAt = now(); parcel.status = 'RUNNING'; parcel.provenance.push({at: now(), type: 'stage.started', detail: `${ready.id}:${run.id}`}); appendAudit(parcel, {at: ready.startedAt, type: 'stage.dispatched', stageId: ready.id, summary: `${ready.name} dispatched`, detail: `Job ${ready.job}; Run ${run.id}; requested route ${routeRequestLabel(ready)}`}); }
        catch (error) { const detail = error instanceof Error ? error.message : String(error); ready.status = 'FAILED'; ready.error = `dispatch_failed:${detail}`; ready.endedAt = now(); parcel.status = 'FAILED'; parcel.endedAt = ready.endedAt; parcel.provenance.push({at: ready.endedAt, type: 'stage.dispatch_failed', detail: `${ready.id}:${detail}`}); appendAudit(parcel, {at: ready.endedAt, type: 'stage.failed', stageId: ready.id, summary: `${ready.name} failed before dispatch`, detail}); }
        this.store.update(parcel); return this.get(parcel.id);
      }
      this.store.update(parcel); if (before !== JSON.stringify({status: parcel.status, stages: parcel.stages.map(stage => [stage.status, stage.runId, stage.waitingReason, stage.error])})) return this.get(parcel.id);
    }
    return undefined;
  }
  private startPlanning(id: string) { if (this.planning.has(id)) return; this.planning.add(id); void this.completePlanning(id).finally(() => this.planning.delete(id)); }
  private async completePlanning(id: string) {
    const pending = this.store.get(id); if (!pending || pending.status !== 'PLANNING') return;
    try {
      const plan = validateWorkParcelPlan(await this.planner.plan(pending.prompt), this.runtime), decided = createDecisionAudit(pending.prompt, plan, this.runtime, now());
      pending.objective = plan.objective; pending.planner = plan.planner; pending.stages = plan.stages.map(stage => ({...stage, dependsOn: [...(stage.dependsOn ?? [])], parameters: structuredClone(stage.parameters ?? {}), status: 'QUEUED'})); pending.status = 'QUEUED'; pending.audit = {...decided, timeline: [...pending.audit.timeline, ...decided.timeline.filter(item => !['task.received','task.classified'].includes(item.type))]}; pending.provenance.push({at: now(), type: 'planned', detail: `Registered stages selected; planner=${plan.planner.kind}`}); this.store.update(pending);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error); pending.status = 'FAILED'; pending.endedAt = now(); pending.provenance.push({at: pending.endedAt, type: 'planning.failed', detail}); pending.audit.timeline.push(event(pending.endedAt, 'planning.failed', 'Planning failed closed', detail)); this.store.update(pending);
    }
  }
  private reconcile(parcel: WorkParcel) {
    for (const stage of parcel.stages) if (stage.runId && !['SUCCEEDED','FAILED','CANCELLED'].includes(stage.status)) {
      const run = this.runtime.ledger.get(stage.runId); if (!run) { stage.status = 'FAILED'; stage.error = 'run_missing_after_restart'; continue; }
      stage.status = run.status === 'SUCCEEDED' ? 'SUCCEEDED' : failedRun.has(run.status) ? 'FAILED' : run.status === 'WAITING' ? 'WAITING' : 'RUNNING';
      stage.waitingReason = run.steps.find(step => step.waitingReason)?.waitingReason; stage.error = run.errors.at(-1) ?? run.steps.find(step => step.error)?.error;
      const resolvedRoute = routeFor(run, this.invocations(run.id)), previousRoute = actualRouteLabel(stage);
      if (resolvedRoute.workers.length || resolvedRoute.provider || resolvedRoute.model) {
        stage.actualRoute = resolvedRoute;
        const detail = actualRouteLabel(stage);
        if (detail !== previousRoute && !parcel.audit.timeline.some(event => event.type === 'route.resolved' && event.stageId === stage.id && event.detail === detail)) appendAudit(parcel, {at: now(), type: 'route.resolved', stageId: stage.id, summary: `${stage.name} actual route recorded`, detail});
      }
      if (terminalRun.has(run.status)) { stage.endedAt = run.endedAt ?? now(); stage.baton = {schema: 'agent-control.work-parcel-baton/v1', artifactIds: [...run.artifacts], outputTypes: run.artifacts.map(id => this.runtime.artifacts.get(id)?.type ?? 'unknown')}; }
    }
    const failed = parcel.stages.filter(stage => stage.status === 'FAILED');
    if (failed.length) for (const stage of parcel.stages.filter(stage => stage.status === 'QUEUED' && stage.dependsOn.some(id => failed.some(item => item.id === id)))) { stage.status = 'BLOCKED'; stage.waitingReason = `Upstream gate failed: ${stage.dependsOn.filter(id => failed.some(item => item.id === id)).join(', ')}`; }
    let propagated = true; while (propagated) { propagated = false; for (const stage of parcel.stages.filter(stage => stage.status === 'QUEUED' && stage.dependsOn.some(id => parcel.stages.find(item => item.id === id)?.status === 'BLOCKED'))) { stage.status = 'BLOCKED'; stage.waitingReason = 'Blocked by downstream dependency chain'; propagated = true; } }
    if (parcel.stages.every(stage => stage.status === 'SUCCEEDED')) { parcel.status = 'SUCCEEDED'; parcel.endedAt = now(); }
    else if (parcel.stages.every(stage => ['SUCCEEDED','FAILED','BLOCKED','CANCELLED'].includes(stage.status)) && failed.length) { parcel.status = 'FAILED'; parcel.endedAt = now(); }
    else parcel.status = parcel.stages.some(stage => stage.status === 'WAITING') ? 'WAITING' : parcel.stages.some(stage => stage.status === 'RUNNING') ? 'RUNNING' : 'QUEUED';
    parcel.telemetry = this.telemetry(parcel); this.syncAudit(parcel); return parcel;
  }
  private invocations(runId: string) { return (this.efficiency?.list() ?? []).filter(item => item.runId === runId); }
  private telemetry(parcel: WorkParcel) { const records = parcel.stages.flatMap(stage => stage.runId ? this.invocations(stage.runId) : []); return aggregateTelemetry(records, parcel.createdAt, parcel.endedAt); }
  private captureLiveRoutes(parcel: WorkParcel) {
    let changed = false;
    for (const stage of parcel.stages) {
      if (!stage.runId || ['SUCCEEDED','FAILED','CANCELLED'].includes(stage.status)) continue;
      const run = this.runtime.ledger.get(stage.runId); if (!run) continue;
      const resolved = routeFor(run, this.invocations(run.id)); if (!resolved.workers.length && !resolved.provider && !resolved.model) continue;
      const previous = actualRouteLabel(stage); stage.actualRoute = resolved; const detail = actualRouteLabel(stage);
      if (detail !== previous) { changed = true; if (!parcel.audit.timeline.some(event => event.type === 'route.resolved' && event.stageId === stage.id && event.detail === detail)) appendAudit(parcel, {at: now(), type: 'route.resolved', stageId: stage.id, summary: `${stage.name} actual route recorded`, detail}); }
    }
    return changed;
  }
  private withTelemetry(parcel: WorkParcel) { parcel.audit ??= legacyAudit(parcel); parcel.telemetry = this.telemetry(parcel); this.syncAudit(parcel); parcel.decision = explainParcelDecision(parcel); return parcel; }
  private syncAudit(parcel: WorkParcel) {
    const records = parcel.stages.flatMap(stage => stage.runId ? this.invocations(stage.runId).map(record => ({stage, record})) : []);
    parcel.audit.invocations = records.map(({stage, record}) => invocationAudit(stage, record));
    for (const {stage, record} of records) if (record.completedAt && !parcel.audit.timeline.some(event => event.type === 'invocation.completed' && event.detail.includes(record.id))) appendAudit(parcel, {at: record.completedAt, type: 'invocation.completed', stageId: stage.id, summary: `${record.provider} / ${record.model} invocation completed`, detail: `${record.id}; ${record.usage.totalProcessedTokens === null ? 'tokens not reported' : `${record.usage.totalProcessedTokens} tokens`}; ${record.providerReportedCost === null ? 'provider cost not reported' : `provider cost ${record.providerReportedCost} ${record.currency ?? ''}`.trim()}`});
    const ordered = [...records].sort((a, b) => Date.parse(a.record.startedAt) - Date.parse(b.record.startedAt)); for (let index = 1; index < ordered.length; index++) { const before = ordered[index - 1], after = ordered[index]; if (`${before.record.provider}/${before.record.model}/${before.record.harnessProfile}` === `${after.record.provider}/${after.record.model}/${after.record.harnessProfile}`) continue; const id = `route-change:${before.record.id}:${after.record.id}`; if (!parcel.audit.timeline.some(event => event.id === id)) parcel.audit.timeline.push({id, at: after.record.startedAt, type: 'route.changed', stageId: after.stage.id, summary: `${before.record.provider}/${before.record.model} → ${after.record.provider}/${after.record.model}`, detail: `Observed execution strategy ${after.record.executionStrategy}; previous verifier ${before.record.verifierResult}; incremental provider cost ${after.record.providerReportedCost === null ? 'not reported' : `${after.record.providerReportedCost} ${after.record.currency ?? ''}`.trim()}`}); }
    parcel.audit.totals = auditTotals(parcel.audit.invocations, parcel.createdAt, parcel.endedAt);
  }
}

function createDecisionAudit(prompt: string, plan: WorkParcelPlan, runtime: JobRuntime, at: string): WorkParcelAudit {
  const classification = plan.planner.kind === 'reasoning-model' ? 'Complex task requiring a bounded reasoning planner' : plan.stages.length > 1 ? 'Deterministic multi-stage governed workflow' : 'Registered Job request';
  const alternatives: WorkParcelAudit['alternatives'] = [];
  for (const stage of plan.stages) {
    const definition = runtime.catalog.job(stage.job); if (!definition) continue;
    for (const step of definition.spec.steps) {
      const placement = runtime.workers.resolve(step.requires);
      if (placement.worker) alternatives.push({stageId: stage.id, candidate: placement.worker.id, eligible: true, reasons: placement.rationale.reasons});
      for (const rejected of placement.rationale.rejected) alternatives.push({stageId: stage.id, candidate: rejected.workerId, eligible: false, reasons: rejected.reasons});
    }
  }
  const timeline: WorkParcelAuditEvent[] = [
    {id: `audit-${randomUUID()}`, at, type: 'task.received', summary: 'Task received', detail: prompt},
    {id: `audit-${randomUUID()}`, at, type: 'task.classified', summary: `Classified: ${classification}`, detail: `Observable inputs: ${plan.stages.length} stage(s); planner=${plan.planner.kind}`},
    {id: `audit-${randomUUID()}`, at, type: 'plan.selected', summary: 'Work Parcel selected', detail: plan.planner.reason},
    ...plan.stages.map(stage => ({id: `audit-${randomUUID()}`, at, type: 'route.requested' as const, stageId: stage.id, summary: `${stage.name} route requested`, detail: routeRequestLabel(stage)})),
  ];
  return {schema: 'agent-control.work-parcel-audit/v1', recordedAt: at, classification, selectedExecution: 'Work Parcel', planningRationale: plan.planner.reason, planner: {kind: plan.planner.kind, provider: plan.planner.provider ?? null, model: plan.planner.model ?? null}, alternatives, timeline, invocations: [], totals: auditTotals([], at)};
}

function legacyAudit(parcel: WorkParcel): WorkParcelAudit {
  const at = parcel.createdAt, classification = 'Legacy parcel created before durable routing audit';
  return {schema: 'agent-control.work-parcel-audit/v1', recordedAt: now(), classification, selectedExecution: 'Work Parcel', planningRationale: parcel.planner.reason, planner: {kind: parcel.planner.kind, provider: parcel.planner.provider ?? null, model: parcel.planner.model ?? null}, alternatives: [], timeline: [{id: `audit-${randomUUID()}`, at, type: 'task.received', summary: 'Legacy task retained', detail: 'Original prompt and execution evidence preserved; unavailable decision-time alternatives were not reconstructed'}], invocations: [], totals: auditTotals([], parcel.createdAt, parcel.endedAt)};
}

function appendAudit(parcel: WorkParcel, event: Omit<WorkParcelAuditEvent, 'id'>) { parcel.audit.timeline.push({id: `audit-${randomUUID()}`, ...event}); }
function event(at: string, type: WorkParcelAuditEvent['type'], summary: string, detail: string): WorkParcelAuditEvent { return {id: `audit-${randomUUID()}`, at, type, summary, detail}; }
function planningAudit(at: string, timeline: WorkParcelAuditEvent[], blocked: string | null): WorkParcelAudit { return {schema: 'agent-control.work-parcel-audit/v1', recordedAt: at, classification: blocked ? 'Target readiness blocked before dispatch' : 'Planning in progress', selectedExecution: 'Work Parcel', planningRationale: blocked ?? 'Resolving registered Jobs and governed execution readiness', planner: {kind: 'pending', provider: null, model: null}, alternatives: [], timeline, invocations: [], totals: auditTotals([], at, blocked ? at : undefined)}; }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function routeRequestLabel(stage: WorkParcelPlanStage) { const route = stage.requestedRoute; return route ? `Requested provider ${route.provider ?? 'policy-selected'}; model ${route.model ?? 'policy-selected'}; profile ${route.profile ?? 'policy-selected'}; ${route.reason}` : 'Normal Agent Control placement and routing policy'; }
function actualRouteLabel(stage: WorkParcelStage) { const route = stage.actualRoute; return route ? `Workers ${route.workers.join(', ') || 'none'}; provider ${route.provider ?? 'no model'}; model ${route.model ?? 'no model'}; profile ${route.profile ?? 'control action'}; ${route.reason}` : 'Actual route not reported'; }
function invocationAudit(stage: WorkParcelStage, record: ModelInvocationObservation): WorkParcelInvocationAudit { return {id: record.id, stageId: stage.id, runId: record.runId, route: record.executionStrategy, provider: record.provider, model: record.model, node: stage.actualRoute?.workers[0] ?? null, profile: record.harnessProfile, startedAt: record.startedAt, completedAt: record.completedAt, elapsedMs: record.elapsedMs, freshInputTokens: record.usage.freshInputTokens, cachedInputTokens: record.usage.cachedInputTokens, outputTokens: record.usage.outputTokens, reasoningTokens: record.usage.reasoningTokens, totalTokens: record.usage.totalProcessedTokens, providerReportedCost: record.providerReportedCost, calculatedCost: record.calculatedCost, costBasis: record.providerReportedCost !== null ? 'provider-reported' : record.calculatedCost !== null ? 'calculated' : 'unavailable', currency: record.currency, ...(record.costAccounting ? {costAccounting: structuredClone(record.costAccounting)} : {}), verifierResult: record.verifierResult, outcome: record.outcome}; }
function auditTotals(records: WorkParcelInvocationAudit[], start: string, end?: string): WorkParcelAudit['totals'] {
  const complete = (selector: (record: WorkParcelInvocationAudit) => number | null) => records.length > 0 && records.every(record => selector(record) !== null) ? records.reduce((sum, record) => sum + (selector(record) ?? 0), 0) : null;
  const provider = complete(record => record.providerReportedCost), calculated = complete(record => record.calculatedCost), currencies = [...new Set(records.map(record => record.currency).filter((value): value is string => Boolean(value)))];
  return {models: [...new Set(records.map(record => record.model))], invocations: records.length, freshInputTokens: complete(record => record.freshInputTokens), cachedInputTokens: complete(record => record.cachedInputTokens), outputTokens: complete(record => record.outputTokens), reasoningTokens: complete(record => record.reasoningTokens), totalTokens: complete(record => record.totalTokens), providerReportedCost: provider, calculatedCost: calculated, cost: provider ?? calculated, costBasis: provider !== null ? 'provider-reported' : calculated !== null ? 'calculated' : 'unavailable', currency: currencies.length === 1 ? currencies[0] : null, modelExecutionMs: records.reduce((sum, record) => sum + (record.elapsedMs ?? 0), 0), wallClockMs: Math.max(0, Date.parse(end ?? now()) - Date.parse(start))};
}

export function explainParcelDecision(parcel: WorkParcel): WorkParcelDecision {
  const failed = parcel.stages.find(stage => stage.status === 'FAILED'), blocked = parcel.stages.filter(stage => stage.status === 'BLOCKED').map(stage => stage.name);
  if (failed) {
    const error = failed.error ?? 'The Job failed without a more specific verified reason', capacity = error.match(/freetoken_capacity_gate_failed:free_vram_mib=(\d+):required=(\d+)/), asset = /freetoken_asset_gate_failed/.test(error);
    if (capacity) { const free = Number(capacity[1]), required = Number(capacity[2]); return {outcome: 'FAIL_CLOSED', title: 'Why Agent Control stopped', summary: `The ${failed.name} safety gate measured ${free.toLocaleString('en-GB')} MiB free VRAM, below the required ${required.toLocaleString('en-GB')} MiB. Agent Control stopped before installation, server launch, benchmarking or provider qualification.`, evidence: [`Measured free VRAM: ${free} MiB`, `Minimum safe threshold: ${required} MiB`, 'Provider/model request: none; the deterministic safety gate stopped first', `Failed Job: ${failed.job}`, `Run: ${failed.runId ?? 'not recorded'}`], blockedStages: blocked, authority: 'Agent Control'}; }
    if (asset) return {outcome: 'FAIL_CLOSED', title: 'Why Agent Control stopped', summary: `The ${failed.name} safety gate found no compatible checkpoint. Agent Control preserved the existing assets and blocked every dependent stage.`, evidence: [error, `Failed Job: ${failed.job}`, `Run: ${failed.runId ?? 'not recorded'}`], blockedStages: blocked, authority: 'Agent Control'};
    return {outcome: 'FAIL_CLOSED', title: 'Why Agent Control stopped', summary: `${failed.name} failed, so Agent Control blocked dependent work instead of continuing without verified prerequisites.`, evidence: [error, `Failed Job: ${failed.job}`, `Run: ${failed.runId ?? 'not recorded'}`], blockedStages: blocked, authority: 'Agent Control'};
  }
  if (parcel.status === 'SUCCEEDED') return {outcome: 'COMPLETE', title: 'Why Agent Control completed', summary: 'Every planned Job completed through the normal Agent Control verification boundary.', evidence: parcel.stages.map(stage => `${stage.name}: ${stage.status}`), blockedStages: [], authority: 'Agent Control'};
  if (parcel.status === 'CANCELLED') return {outcome: 'CANCELLED', title: 'Why Agent Control stopped', summary: 'The parcel was cancelled through the Agent Control operator boundary.', evidence: parcel.provenance.filter(item => item.type === 'cancelled').map(item => item.detail), blockedStages: blocked, authority: 'Agent Control'};
  if (parcel.status === 'FAILED') { const detail = [...parcel.provenance].reverse().find(item => ['planning.failed','readiness.blocked'].includes(item.type))?.detail ?? [...parcel.audit.timeline].reverse().find(item => item.type === 'planning.failed')?.detail ?? 'Planning failed before a registered Job could be dispatched'; return {outcome: 'FAIL_CLOSED', title: 'Why Agent Control stopped', summary: 'Agent Control retained the request and stopped before dispatch because planning or target readiness failed.', evidence: [detail], blockedStages: blocked, authority: 'Agent Control'}; }
  if (parcel.status === 'PLANNING') return {outcome: 'IN_PROGRESS', title: 'What Agent Control is doing', summary: 'Resolving targets, readiness and registered Jobs before dispatch.', evidence: parcel.audit.timeline.slice(-3).map(item => item.summary), blockedStages: blocked, authority: 'Agent Control'};
  const active = parcel.stages.find(stage => ['RUNNING','WAITING'].includes(stage.status)); return {outcome: 'IN_PROGRESS', title: 'What Agent Control is doing', summary: active ? `${active.name} is ${active.status.toLowerCase()}.` : 'The parcel is waiting for its next eligible Job.', evidence: active?.waitingReason ? [active.waitingReason] : [], blockedStages: blocked, authority: 'Agent Control'};
}

function routeFor(run: RunRecord, invocations: ModelInvocationObservation[]) { const last = invocations.at(-1); return {workers: [...run.selectedWorkers], provider: last?.provider, model: last?.model, profile: last?.harnessProfile, reason: run.steps.flatMap(step => step.placement?.reasons ?? []).join(', ') || 'Normal Agent Control placement; no model invocation reported'}; }
function emptyTelemetry(): WorkParcelTelemetry { return {freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, cost: null, currency: null, elapsedMs: 0}; }
function aggregateTelemetry(records: ModelInvocationObservation[], start: string, end?: string): WorkParcelTelemetry { const sum = (selector: (record: ModelInvocationObservation) => number | null) => records.length && records.every(record => selector(record) !== null) ? records.reduce((total, record) => total + (selector(record) ?? 0), 0) : null; const providerCost = sum(record => record.providerReportedCost), calculated = sum(record => record.calculatedCost); return {freshInputTokens: sum(record => record.usage.freshInputTokens), cachedInputTokens: sum(record => record.usage.cachedInputTokens), outputTokens: sum(record => record.usage.outputTokens), reasoningTokens: sum(record => record.usage.reasoningTokens), totalTokens: sum(record => record.usage.totalProcessedTokens), cost: providerCost ?? calculated, currency: records.length && records.every(record => record.currency === records[0].currency) ? records[0].currency : null, elapsedMs: Math.max(0, Date.parse(end ?? now()) - Date.parse(start))}; }

export function freeTokenEvaluationPlan(objective: string): WorkParcelPlan { return {objective, planner: {kind: 'deterministic', reason: 'Safety-constrained built-in qualification routine selected from explicit FreeToken objective'}, stages: [
  {id: 'inventory', name: 'A · Safety and asset inventory', job: 'freetoken-inventory@1.0.0', requestedRoute: {profile: 'THIN', reason: 'Deterministic host inspection; no model required'}},
  {id: 'gate', name: 'B · Compatibility and capacity gate', job: 'freetoken-readiness-gate@1.0.0', dependsOn: ['inventory'], requestedRoute: {profile: 'THIN', reason: 'Fail-closed resource and asset validation'}},
  {id: 'isolated', name: 'C · Isolated FreeToken qualification', job: 'freetoken-isolated-qualification@1.0.0', dependsOn: ['gate'], requestedRoute: {profile: 'STANDARD', reason: 'Isolated port and environment only after gate passes'}},
  {id: 'benchmark', name: 'D · Comparative benchmark', job: 'freetoken-comparative-benchmark@1.0.0', dependsOn: ['isolated'], requestedRoute: {profile: 'STANDARD', reason: 'Compare the same prompt/model only after endpoint verification'}},
  {id: 'provider', name: 'E · Agent Control provider qualification', job: 'freetoken-provider-qualification@1.0.0', dependsOn: ['benchmark'], requestedRoute: {profile: 'DEEP', reason: 'Register no production route; qualification evidence only'}},
]}; }
