import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {ResourceConfig} from './config.js';
import {effectiveParameters, nextCronOccurrence, type JobCatalog} from './job-catalog.js';
import {jobPriorityRank, type ActionFailureClass, type ActionHandler, type ActionOutput, type AgentActionHandler, type ArtifactRecord, type PlacementRationale, type RecoveryFailureKind, type RetryPolicy, type RunRecord, type RunStatus, type ScheduleState, type StepAttempt, type StepStatus, type WorkerRegistration} from './job-types.js';
import type {HarnessEfficiencyLedgerPort, InvocationFinalResult} from './harness-efficiency.js';
import {OwnedProcessManager, type ExecutionCleanupReport} from './owned-process.js';

function writeJsonAtomic(file: string, value: unknown) { fs.mkdirSync(path.dirname(file), {recursive: true}); const temporary = `${file}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, file); }
function now() { return new Date().toISOString(); }
const ACTIVE_RUNS: RunStatus[] = ['SCHEDULED', 'QUEUED', 'WAITING', 'AUTHENTICATION_BLOCKED', 'RECONNECTING', 'RUNNING', 'VERIFYING', 'CANCELLING', 'CLEANUP_UNCERTAIN', 'DISCONNECTED'];
const TERMINAL_STEPS: StepStatus[] = ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED'];
const EXECUTION_OWNED_STEPS: StepStatus[] = ['DISPATCHED', 'RUNNING', 'VERIFYING', 'CANCEL_PENDING', 'CLEANUP_UNCERTAIN'];

export class ActionFailure extends Error {
  readonly recoveryKind: RecoveryFailureKind;
  constructor(message: string, readonly failureClass: ActionFailureClass, readonly retryable = false, recoveryKind?: RecoveryFailureKind) {
    super(message); this.name = 'ActionFailure';
    this.recoveryKind = recoveryKind ?? (failureClass === 'authentication' ? 'authentication-required' : failureClass === 'configuration' ? 'permanent-configuration' : retryable ? 'transient-transport' : 'execution');
  }
}
class StepTimeoutError extends Error { constructor(readonly timeoutSeconds: number, readonly elapsedMs: number) { super(`step_timeout:${timeoutSeconds}s:${elapsedMs}ms`); this.name = 'StepTimeoutError'; } }
export class ActionRegistry {
  private readonly actions = new Map<string, {kind: 'control'; handler: ActionHandler} | {kind: 'agent'; handler: AgentActionHandler}>();
  /** Existing deterministic/control-plane Actions remain explicitly outside model execution. */
  register(id: string, handler: ActionHandler) { return this.registerControl(id, handler); }
  registerControl(id: string, handler: ActionHandler) { this.assertRegistration(id); this.actions.set(id, {kind: 'control', handler}); return this; }
  /** Model-backed Actions can only be registered through an adaptive-harness handler. */
  registerAgent(id: string, handler: AgentActionHandler) { this.assertRegistration(id); if (handler.path !== 'adaptive-harness') throw new Error('agent_action_must_use_adaptive_harness'); this.actions.set(id, {kind: 'agent', handler}); return this; }
  has(id: string) { return this.actions.has(id); }
  ids() { return new Set(this.actions.keys()); }
  kind(id: string) { return this.resolve(id).kind; }
  resolve(id: string) { const action = this.actions.get(id); if (!action) throw new ActionFailure(`action_not_registered:${id}`, 'configuration'); return action; }
  handler(id: string): ActionHandler { const action = this.resolve(id); return action.kind === 'control' ? action.handler : context => action.handler.execute(context); }
  private assertRegistration(id: string) { if (!/^[a-z0-9][a-z0-9._-]*@\d+\.\d+\.\d+$/.test(id)) throw new Error('invalid_action_id'); if (this.actions.has(id)) throw new Error('action_exists'); }
}

export class WorkerRegistry {
  private readonly workers = new Map<string, WorkerRegistration>();
  register(worker: WorkerRegistration) { if (this.workers.has(worker.id)) throw new Error('worker_exists'); this.workers.set(worker.id, structuredClone(worker)); return this; }
  upsert(worker: WorkerRegistration) { this.workers.set(worker.id, structuredClone(worker)); return this; }
  observe(worker: Omit<WorkerRegistration, 'active'>) { const current = this.workers.get(worker.id); this.workers.set(worker.id, structuredClone({...worker, active: current?.active ?? 0})); return this; }
  list() { return [...this.workers.values()].map(worker => structuredClone(worker)); }
  setHealth(id: string, health: WorkerRegistration['health']) { const worker = this.workers.get(id); if (!worker) throw new Error('worker_missing'); worker.health = health; worker.observedAt = now(); }
  resolve(required: string[], at = new Date()): {worker?: WorkerRegistration; rationale: PlacementRationale} {
    const eligible: WorkerRegistration[] = [], rejected: PlacementRationale['rejected'] = [];
    for (const worker of this.workers.values()) {
      const reasons: string[] = [];
      if (worker.health !== 'healthy') reasons.push(`health:${worker.health}`);
      if (worker.active >= worker.capacity) reasons.push('capacity_exhausted');
      for (const capability of required) {
        if (worker.blockedCapabilities?.includes(capability)) reasons.push(`workload_blocked:${capability}`);
        if (!worker.capabilities.includes(capability)) reasons.push(`missing:${capability}`);
        const expiry = worker.capabilityExpiresAt?.[capability]; if (expiry && Date.parse(expiry) <= at.getTime()) reasons.push(`expired:${capability}`);
      }
      if (reasons.length) rejected.push({workerId: worker.id, reasons}); else eligible.push(worker);
    }
    eligible.sort((a, b) => a.active - b.active || b.capacity - a.capacity || a.id.localeCompare(b.id));
    const worker = eligible[0];
    return {worker: worker ? structuredClone(worker) : undefined, rationale: {selected: worker?.id, eligible: eligible.map(item => item.id), rejected, reasons: worker ? required.map(capability => `satisfies:${capability}`).concat(['healthy', 'available']) : ['no_eligible_worker']}};
  }
  claim(id: string) { const worker = this.workers.get(id); if (!worker || worker.health !== 'healthy' || worker.active >= worker.capacity) throw new Error('worker_not_claimable'); worker.active++; }
  release(id: string) { const worker = this.workers.get(id); if (worker) worker.active = Math.max(0, worker.active - 1); }
  schedulerCapacity() { return Math.max(1, Math.min(32, [...this.workers.values()].filter(worker => worker.health === 'healthy').reduce((total, worker) => total + worker.capacity, 0))); }
  static fromConfig(resources: ResourceConfig[]) { const registry = new WorkerRegistry(); for (const resource of resources) registry.register({id: resource.id, capabilities: [...resource.capabilities], health: 'unknown', capacity: Number(resource.metadata?.capacity ?? 1), active: 0, labels: Object.fromEntries(Object.entries(resource.metadata ?? {}).map(([key, value]) => [key, String(value)])), observedAt: now()}); return registry; }
}

interface LockSnapshot {version: 1; locks: Array<{resource: string; runId: string; stepId: string; acquiredAt: string}>;}
export class ResourceLockManager {
  private readonly locks = new Map<string, {resource: string; runId: string; stepId: string; acquiredAt: string}>();
  constructor(readonly file: string) { if (fs.existsSync(file)) { const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as LockSnapshot; if (snapshot.version !== 1) throw new Error('unsupported_resource_lock_snapshot'); for (const lock of snapshot.locks) this.locks.set(lock.resource, lock); } }
  acquire(resources: string[], runId: string, stepId: string) { const blocked: Array<{resource: string; runId: string; stepId: string; acquiredAt: string}> = []; for (const resource of resources) { const lock = this.locks.get(resource); if (lock && (lock.runId !== runId || lock.stepId !== stepId)) blocked.push(lock); } if (blocked.length) return {ok: false as const, blocked}; for (const resource of resources) this.locks.set(resource, {resource, runId, stepId, acquiredAt: now()}); this.save(); return {ok: true as const}; }
  release(runId: string, stepId?: string) { for (const [resource, lock] of this.locks) if (lock.runId === runId && (!stepId || lock.stepId === stepId)) this.locks.delete(resource); this.save(); }
  list() { return [...this.locks.values()].map(lock => ({...lock})); }
  private save() { writeJsonAtomic(this.file, {version: 1, locks: this.list()} satisfies LockSnapshot); }
}

interface ArtifactSnapshot {version: 1; artifacts: ArtifactRecord[];}
export class ArtifactStore {
  private readonly records = new Map<string, ArtifactRecord>();
  private readonly metadataFile: string;
  private readonly objectDir: string;
  constructor(readonly root: string) { this.metadataFile = path.join(root, 'artifacts.json'); this.objectDir = path.join(root, 'objects'); if (fs.existsSync(this.metadataFile)) { const snapshot = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8')) as ArtifactSnapshot; if (snapshot.version !== 1) throw new Error('unsupported_artifact_snapshot'); for (const record of snapshot.artifacts) this.records.set(record.id, record); } }
  create(run: RunRecord, stepId: string, workerId: string, declaration: {name: string; type: string; schema: string; version: string; retention?: string}, value: unknown) {
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`), sha256 = createHash('sha256').update(bytes).digest('hex'), id = `artifact-${randomUUID()}`, objectFile = path.join(this.objectDir, `${id}.json`);
    fs.mkdirSync(this.objectDir, {recursive: true}); fs.writeFileSync(objectFile, bytes, {mode: 0o600});
    const step = run.steps.find(item => item.id === stepId)!;
    const record: ArtifactRecord = {id, runId: run.id, stepId, name: declaration.name, type: declaration.type, schema: declaration.schema, version: declaration.version, createdAt: now(), size: bytes.length, sha256, storageRef: objectFile, retention: declaration.retention ?? 'run-history', provenance: {jobId: run.jobId, jobVersion: run.jobVersion, action: step.action, workerId}};
    this.records.set(id, record); this.save(); return structuredClone(record);
  }
  get(id: string) { const record = this.records.get(id); return record ? structuredClone(record) : undefined; }
  read(id: string) { const record = this.records.get(id); if (!record) throw new Error('artifact_missing'); const bytes = fs.readFileSync(record.storageRef); if (createHash('sha256').update(bytes).digest('hex') !== record.sha256) throw new Error('artifact_checksum_mismatch'); return JSON.parse(bytes.toString('utf8')); }
  list(runId?: string) { return [...this.records.values()].filter(record => !runId || record.runId === runId).map(record => structuredClone(record)); }
  private save() { writeJsonAtomic(this.metadataFile, {version: 1, artifacts: this.list()} satisfies ArtifactSnapshot); }
}

interface LedgerSnapshot {version: 1; runs: RunRecord[]; schedules: ScheduleState[];}
export class RunLedger {
  private readonly runs = new Map<string, RunRecord>(); private readonly schedules = new Map<string, ScheduleState>(); private readonly eventsFile: string;
  constructor(readonly file: string) { this.eventsFile = path.join(path.dirname(file), 'run-events.jsonl'); if (fs.existsSync(file)) { const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as LedgerSnapshot; if (snapshot.version !== 1) throw new Error('unsupported_run_ledger'); for (const run of snapshot.runs) this.runs.set(run.id, run); for (const schedule of snapshot.schedules ?? []) this.schedules.set(schedule.scheduleId, schedule); } }
  add(run: RunRecord) { if (this.runs.has(run.id)) throw new Error('run_exists'); run.updatedAt = run.requestedAt; this.runs.set(run.id, structuredClone(run)); this.record(run.id, 'run.created', run.status); return this.get(run.id)!; }
  update(run: RunRecord, event = 'run.updated', evidence?: Record<string, unknown>) { if (!this.runs.has(run.id)) throw new Error('run_missing'); run.updatedAt = now(); this.runs.set(run.id, structuredClone(run)); this.record(run.id, event, run.status, evidence); return this.get(run.id)!; }
  get(id: string) { const run = this.runs.get(id); return run ? structuredClone(run) : undefined; }
  list(jobId?: string) { return [...this.runs.values()].filter(run => !jobId || run.jobId === jobId).sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)).map(run => structuredClone(run)); }
  schedule(id: string) { const state = this.schedules.get(id); return state ? structuredClone(state) : undefined; }
  saveSchedule(state: ScheduleState) { this.schedules.set(state.scheduleId, structuredClone(state)); this.save(); return this.schedule(state.scheduleId)!; }
  scheduleStates() { return [...this.schedules.values()].map(state => structuredClone(state)); }
  recoverFailClosed() { const changed: string[] = []; for (const run of this.runs.values()) { let dirty = false; for (const step of run.steps) if (['DISPATCHED', 'RUNNING', 'VERIFYING'].includes(step.status)) { step.status = 'FAILED'; step.error = 'execution_identity_unproven_after_restart'; step.endedAt = now(); dirty = true; } if (dirty || ['RUNNING', 'VERIFYING'].includes(run.status)) { run.status = 'DISCONNECTED'; run.errors.push('execution_identity_unproven_after_restart'); run.provenance.push({type: 'recovery', at: now(), detail: 'Fail closed: original execution identity not proven'}); changed.push(run.id); } } if (changed.length) this.save(); return changed; }
  private record(runId: string, type: string, status: string, evidence?: Record<string, unknown>) { fs.mkdirSync(path.dirname(this.file), {recursive: true}); fs.appendFileSync(this.eventsFile, `${JSON.stringify({at: now(), runId, type, status, ...(evidence ? {evidence} : {})})}\n`, {mode: 0o600}); this.save(); }
  private save() { writeJsonAtomic(this.file, {version: 1, runs: this.list(), schedules: this.scheduleStates()} satisfies LedgerSnapshot); }
}

export interface JobRuntimeOptions {now?: () => Date; approval?: (policy: string, run: RunRecord) => boolean; efficiency?: HarnessEfficiencyLedgerPort; defaultRecoveryDeadlineSeconds?: number;}
export interface JobDispatch {runId: string; completion: Promise<RunRecord | undefined>;}
export class JobRuntime {
  private readonly controllers = new Map<string, AbortController>();
  private readonly clock: () => Date;
  constructor(readonly catalog: JobCatalog, readonly actions: ActionRegistry, readonly workers: WorkerRegistry, readonly ledger: RunLedger, readonly artifacts: ArtifactStore, readonly locks: ResourceLockManager, options: JobRuntimeOptions = {}) { this.clock = options.now ?? (() => new Date()); this.approval = options.approval ?? (() => false); this.efficiency = options.efficiency; this.defaultRecoveryDeadlineSeconds = options.defaultRecoveryDeadlineSeconds ?? 900; }
  private readonly approval: (policy: string, run: RunRecord) => boolean;
  private readonly efficiency?: HarnessEfficiencyLedgerPort;
  private readonly defaultRecoveryDeadlineSeconds: number;

  createRun(jobReference: string, parameters: Record<string, unknown>, trigger: RunRecord['trigger'], scheduledAt?: string) {
    const job = this.catalog.job(jobReference); if (!job) throw new Error('job_missing'); if (job.spec.enabled === false) throw new Error('job_disabled');
    const active = this.ledger.list(job.metadata.id).filter(run => ACTIVE_RUNS.includes(run.status));
    const runId = `run-${randomUUID()}`, replaced = job.spec.concurrency === 'replace-running' ? active[0] : undefined;
    if (job.spec.concurrency === 'replace-running') for (const existing of active) this.cancel(existing.id, `replaced_by_run:${runId}`, runId);
    const retryOfRunId = trigger.type === 'retry' ? trigger.id : undefined;
    const run: RunRecord = {id: runId, jobId: job.metadata.id, jobVersion: job.metadata.version, trigger: structuredClone(trigger), requestedAt: this.clock().toISOString(), scheduledAt, status: 'QUEUED', priority: job.spec.priority, concurrency: job.spec.concurrency, parameters: effectiveParameters(job, parameters), steps: job.spec.steps.map(step => { const retry = step.retry ?? job.spec.retry; return {id: step.id, action: step.action, status: (step.dependsOn?.length ? 'WAITING_FOR_DEPENDENCY' : 'QUEUED'), dependsOn: [...(step.dependsOn ?? [])], capabilityRequest: {requires: step.requires.map(id => ({id}))}, resources: [...(step.resources ?? [])], attempts: [], artifactIds: [], approval: step.approval, ...(retry ? {remainingRetryBudget: retry.attempts} : {}), verification: {required: [...(step.verification ?? [])], passed: [], failed: []}}; }), artifacts: [], errors: [], effectiveJob: structuredClone(job), selectedWorkers: [], approvals: [], provenance: [{type: 'trigger', at: this.clock().toISOString(), detail: `${trigger.type}:${trigger.actor}`} ], ...((replaced || retryOfRunId) ? {lineage: {...(replaced ? {replacesRunId: replaced.id} : {}), ...(retryOfRunId ? {retryOfRunId} : {})}} : {})};
    if (active.length && job.spec.concurrency === 'no-overlap') run.provenance.push({type: 'concurrency', at: now(), detail: `Waiting for active run ${active[0].id}`});
    const created = this.ledger.add(run);
    if (retryOfRunId) this.linkPriorRun(retryOfRunId, 'retriedByRunId', created.id);
    return created;
  }

  async tick() {
    return (this.dispatch()?.completion ?? Promise.resolve(undefined));
  }

  schedulerConcurrencyLimit() { return this.workers.schedulerCapacity(); }

  dispatch(): JobDispatch | undefined {
    const runs = this.ledger.list().filter(run => ['QUEUED', 'WAITING', 'RECONNECTING', 'RUNNING'].includes(run.status)).sort((a, b) => jobPriorityRank[b.priority] - jobPriorityRank[a.priority] || Date.parse(a.requestedAt) - Date.parse(b.requestedAt));
    for (const run of runs) {
      const activeSibling = this.ledger.list(run.jobId).find(other => other.id !== run.id && ['RUNNING', 'VERIFYING'].includes(other.status));
      if (activeSibling && ['no-overlap', 'queue'].includes(run.concurrency)) continue;
      const step = this.nextRunnableStep(run); if (!step) { this.finalizeRun(run); continue; }
      return {runId: run.id, completion: this.executeStep(run, step.id).then(() => this.ledger.get(run.id))};
    }
    return undefined;
  }

  async tickSchedules(at = this.clock()) {
    const created: RunRecord[] = [];
    for (const schedule of this.catalog.listSchedules()) {
      let state = this.ledger.schedule(schedule.metadata.id) ?? {scheduleId: schedule.metadata.id, enabled: schedule.spec.enabled ?? false, missedCount: 0, updatedAt: at.toISOString()};
      if (!state.nextScheduledAt) { state.nextScheduledAt = nextCronOccurrence(schedule.spec.cron, schedule.spec.timezone, new Date(at.getTime() - 60000)).toISOString(); state.updatedAt = at.toISOString(); this.ledger.saveSchedule(state); }
      if (!state.enabled || Date.parse(state.nextScheduledAt) > at.getTime()) continue;
      const scheduledAt = state.nextScheduledAt, lag = at.getTime() - Date.parse(scheduledAt);
      try {
        if (lag > 60000 && schedule.spec.missedRunPolicy === 'skip') { const missed = this.createRun(schedule.spec.job, schedule.spec.parameters ?? {}, {type: 'schedule', id: schedule.metadata.id, actor: 'agent-control-scheduler'}, scheduledAt); missed.status = 'MISSED'; missed.endedAt = at.toISOString(); missed.errors.push('missed_schedule_policy:skip'); missed.provenance.push({type: 'schedule', at: at.toISOString(), detail: 'Occurrence recorded but skipped by missed-run policy'}); this.ledger.update(missed, 'run.missed'); state.missedCount++; state.lastRunId = missed.id; state.lastError = undefined; }
        else { const run = this.createRun(schedule.spec.job, schedule.spec.parameters ?? {}, {type: 'schedule', id: schedule.metadata.id, actor: 'agent-control-scheduler'}, scheduledAt); created.push(run); state.lastRunId = run.id; state.lastError = undefined; }
      } catch (error) { state.lastFailureAt = at.toISOString(); state.lastError = error instanceof Error ? error.message : String(error); }
      state.previousScheduledAt = scheduledAt; state.nextScheduledAt = nextCronOccurrence(schedule.spec.cron, schedule.spec.timezone, at).toISOString(); state.updatedAt = at.toISOString(); this.ledger.saveSchedule(state);
    }
    return created;
  }

  setScheduleEnabled(id: string, enabled: boolean) { const definition = this.catalog.schedule(id); if (!definition) throw new Error('schedule_missing'); const at = this.clock(), current = this.ledger.schedule(id); return this.ledger.saveSchedule({scheduleId: id, enabled, previousScheduledAt: current?.previousScheduledAt, nextScheduledAt: enabled ? nextCronOccurrence(definition.spec.cron, definition.spec.timezone, at).toISOString() : current?.nextScheduledAt, lastRunId: current?.lastRunId, lastSuccessAt: current?.lastSuccessAt, lastFailureAt: current?.lastFailureAt, lastError: current?.lastError, missedCount: current?.missedCount ?? 0, updatedAt: at.toISOString()}); }
  approve(runId: string, policy: string) { const run = this.mustRun(runId), waiting = run.steps.filter(step => step.status === 'WAITING_FOR_APPROVAL' && step.approval === policy); if (!waiting.length) throw new Error('approval_policy_not_waiting'); if (!run.approvals.includes(policy)) run.approvals.push(policy); for (const step of waiting) { step.status = 'QUEUED'; step.waitingReason = undefined; } return this.ledger.update(run, 'run.approved'); }
  cancel(runId: string, reason = 'operator_cancelled', replacedByRunId?: string) {
    const run = this.mustRun(runId); if (!ACTIVE_RUNS.includes(run.status)) return run;
    if (['CLEANUP_UNCERTAIN', 'DISCONNECTED'].includes(run.status) && !this.controllers.has(runId)) return run;
    if (replacedByRunId) run.lineage = {...run.lineage, replacedByRunId};
    const controller = this.controllers.get(runId);
    if (controller) {
      if (run.status === 'CANCELLING') return run;
      controller.abort(reason);
      for (const step of run.steps) if (EXECUTION_OWNED_STEPS.includes(step.status)) { step.status = 'CANCEL_PENDING'; step.waitingReason = 'Termination requested; verifying worker process-tree cleanup'; }
      run.status = 'CANCELLING'; run.errors.push(reason); run.provenance.push({type: 'cancellation', at: now(), detail: 'Abort requested; terminal state and resource release await verified cleanup'});
      return this.ledger.update(run, 'run.cancel_requested', replacedByRunId ? {replacedByRunId} : undefined);
    }
    for (const step of run.steps) if (!TERMINAL_STEPS.includes(step.status)) { step.status = 'CANCELLED'; step.endedAt = now(); }
    run.status = 'CANCELLED'; run.endedAt = now(); run.errors.push(reason); this.finalizeCancelledEfficiency(run, reason); this.locks.release(run.id);
    return this.ledger.update(run, 'run.cancelled', replacedByRunId ? {replacedByRunId} : undefined);
  }
  retry(runId: string) { const source = this.mustRun(runId); if (!['FAILED', 'DEGRADED', 'CANCELLED'].includes(source.status)) throw new Error('run_not_retryable'); const reference = `${source.jobId}@${source.jobVersion}`; if (!this.catalog.job(reference)) this.catalog.addJob(source.effectiveJob); return this.createRun(reference, source.parameters, {type: 'retry', id: source.id, actor: 'operator'}); }
  jobsProjection() { return this.catalog.listJobs().map(job => { const runs = this.ledger.list(job.metadata.id), latest = runs[0], schedules = this.catalog.listSchedules().filter(schedule => schedule.spec.job === `${job.metadata.id}@${job.metadata.version}`).map(schedule => ({...schedule, state: this.ledger.schedule(schedule.metadata.id)})); return {...job, latestRun: latest, schedules}; }); }
  queueProjection() { return this.ledger.list().flatMap(run => run.steps.filter(step => ['QUEUED', 'WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'AUTHENTICATION_BLOCKED', 'RECONNECTING', 'RETRY_PENDING', 'CANCEL_PENDING', 'CLEANUP_UNCERTAIN'].includes(step.status)).map(step => ({runId: run.id, jobId: run.jobId, priority: run.priority, stepId: step.id, status: step.status, reason: step.waitingReason, eligibleWorkers: step.placement?.eligible ?? [], missingCapabilities: step.placement?.rejected.flatMap(item => item.reasons.filter(reason => reason.startsWith('missing:'))) ?? [], scheduledAt: run.scheduledAt, queuedAt: run.requestedAt, nextAttemptAt: step.nextAttemptAt, recoveryDeadlineAt: step.recoveryDeadlineAt, remainingRetryBudget: step.remainingRetryBudget})) ); }

  private nextRunnableStep(run: RunRecord) {
    let changed = false;
    const wait = (step: RunRecord['steps'][number], status: StepStatus, reason: string) => { if (step.status !== status || step.waitingReason !== reason) { step.status = status; step.waitingReason = reason; changed = true; } };
    for (const step of run.steps) {
      if (TERMINAL_STEPS.includes(step.status)) continue;
      if (EXECUTION_OWNED_STEPS.includes(step.status) || ['AUTHENTICATION_BLOCKED', 'RECONNECTING'].includes(step.status)) return undefined;
      const dependencies = step.dependsOn.map(id => run.steps.find(candidate => candidate.id === id));
      if (dependencies.some(dependency => dependency?.status === 'FAILED' || dependency?.status === 'CANCELLED')) { if (step.status !== 'CANCELLED' || step.error !== 'upstream_failed') { step.status = 'CANCELLED'; step.error = 'upstream_failed'; changed = true; } continue; }
      if (!dependencies.every(dependency => dependency?.status === 'SUCCEEDED')) { wait(step, 'WAITING_FOR_DEPENDENCY', `Waiting for ${dependencies.filter(item => item?.status !== 'SUCCEEDED').map(item => item?.id).join(', ')}`); continue; }
      if (step.status === 'RETRY_PENDING' && Date.parse(step.nextAttemptAt ?? '') > this.clock().getTime()) continue;
      if (step.approval && !run.approvals.includes(step.approval) && !this.approval(step.approval, run)) { wait(step, 'WAITING_FOR_APPROVAL', `Approval required: ${step.approval}`); continue; }
      if (!['WAITING_FOR_RESOURCE', 'WAITING_FOR_WORKER'].includes(step.status)) { if (step.status !== 'QUEUED' || step.waitingReason !== undefined) changed = true; step.status = 'QUEUED'; step.waitingReason = undefined; }
      if (changed) this.ledger.update(run, 'run.dependencies_reconciled');
      return step;
    }
    if (changed) { run.status = run.steps.some(step => step.status === 'AUTHENTICATION_BLOCKED') ? 'AUTHENTICATION_BLOCKED' : run.steps.some(step => ['RECONNECTING', 'RETRY_PENDING'].includes(step.status) && step.attempts.at(-1)?.recoveryKind === 'transient-transport') ? 'RECONNECTING' : 'WAITING'; this.ledger.update(run, run.status === 'RECONNECTING' ? 'run.reconnecting' : run.status === 'AUTHENTICATION_BLOCKED' ? 'run.authentication_blocked' : 'run.waiting'); }
    return undefined;
  }

  private async executeStep(run: RunRecord, stepId: string) {
    const step = run.steps.find(item => item.id === stepId)!;
    const lock = this.locks.acquire(step.resources, run.id, step.id);
    if (!lock.ok) { const reason = `Held by ${lock.blocked.map(item => `${item.resource}:${item.runId}`).join(', ')}`, changed = step.status !== 'WAITING_FOR_RESOURCE' || step.waitingReason !== reason || run.status !== 'WAITING'; step.status = 'WAITING_FOR_RESOURCE'; step.waitingReason = reason; run.status = 'WAITING'; if (changed) this.ledger.update(run, 'step.waiting_resource'); return; }
    const required = step.capabilityRequest.requires.map(item => item.id), resolution = this.workers.resolve(required, this.clock()), previousPlacement = JSON.stringify(step.placement); step.placement = resolution.rationale;
    if (!resolution.worker) { const reason = `No worker satisfies ${required.join(', ')}`, changed = step.status !== 'WAITING_FOR_WORKER' || step.waitingReason !== reason || run.status !== 'WAITING' || previousPlacement !== JSON.stringify(resolution.rationale); step.status = 'WAITING_FOR_WORKER'; step.waitingReason = reason; run.status = 'WAITING'; this.locks.release(run.id, step.id); if (changed) this.ledger.update(run, 'step.waiting_worker'); return; }
    const worker = resolution.worker, controller = new AbortController(), ownedExecution = new OwnedProcessManager(), definition = run.effectiveJob.spec.steps.find(item => item.id === step.id)!, retry = definition.retry ?? run.effectiveJob.spec.retry ?? {attempts: 0, backoffSeconds: 0}, attemptStartedAt = this.clock().toISOString();
    this.controllers.set(run.id, controller); this.workers.claim(worker.id); step.status = 'RUNNING'; step.waitingReason = undefined; step.nextAttemptAt = undefined; step.startedAt ??= attemptStartedAt; run.startedAt ??= step.startedAt; run.status = 'RUNNING';
    if (!run.selectedWorkers.includes(worker.id)) run.selectedWorkers.push(worker.id);
    if (retry.attempts > 0) { step.recoveryDeadlineAt ??= new Date(this.clock().getTime() + (retry.overallDeadlineSeconds ?? this.defaultRecoveryDeadlineSeconds) * 1000).toISOString(); step.remainingRetryBudget = Math.max(0, retry.attempts - step.attempts.length); }
    const attempt: StepAttempt = {attempt: step.attempts.length + 1, startedAt: attemptStartedAt, workerId: worker.id}; step.attempts.push(attempt); this.ledger.update(run, 'step.dispatched');
    const timeoutSeconds = definition.timeoutSeconds, wallStartedAt = Date.now();
    let timeoutTimer: NodeJS.Timeout | undefined, timedOut = false, safeToReleaseWorker = true;
    try {
      const inputs = this.inputArtifacts(run, step.id), action = this.actions.resolve(step.action);
      run.provenance.push({type: 'action-dispatch', at: this.clock().toISOString(), detail: `${action.kind}:${step.action}${action.kind === 'agent' ? ':adaptive-harness' : ''}`});
      const actionContext = {run: structuredClone(run), step: structuredClone(step), worker, parameters: structuredClone(run.parameters), inputArtifacts: inputs, readArtifact: (id: string) => this.artifacts.read(id), signal: controller.signal, ownedExecution};
      const invocation = Promise.resolve().then(() => action.kind === 'control' ? action.handler(actionContext) : action.handler.execute(actionContext)).then(
        output => timedOut ? new Promise<never>(() => undefined) : output,
        error => timedOut ? new Promise<never>(() => undefined) : Promise.reject(error),
      );
      const output = timeoutSeconds === undefined ? await invocation : await Promise.race([
        invocation,
        new Promise<never>((_resolve, reject) => {
          timeoutTimer = setTimeout(() => {
            timedOut = true;
            const error = new StepTimeoutError(timeoutSeconds, Date.now() - wallStartedAt);
            controller.abort(error);
            reject(error);
          }, timeoutSeconds * 1000);
        }),
      ]);
      attempt.efficiencyInvocationIds = [...(output.efficiencyInvocationIds ?? [])];
      if (action.kind === 'agent' && output.executionState !== 'verification-pending') throw new ActionFailure('agent_action_missing_verification_boundary', 'verification');
      if (controller.signal.aborted) throw new ActionFailure('execution_cancelled', 'execution');
      this.recordActionOutput(run, step.id, worker.id, output); step.status = 'VERIFYING'; run.status = 'VERIFYING'; if (attempt.efficiencyInvocationIds.length) this.efficiency?.setPhase(attempt.efficiencyInvocationIds, 'verification'); this.ledger.update(run, 'step.verifying');
      const requiredVerification = step.verification?.required ?? [], passed = new Set(output.verification ?? []); step.verification!.passed = requiredVerification.filter(item => passed.has(item)); step.verification!.failed = requiredVerification.filter(item => !passed.has(item));
      if (step.verification!.failed.length) throw new ActionFailure(`verification_failed:${step.verification!.failed.join(',')}`, 'verification');
      if (attempt.efficiencyInvocationIds.length && requiredVerification.length) this.efficiency?.markVerification(attempt.efficiencyInvocationIds, 'PASS');
      step.status = 'SUCCEEDED'; step.endedAt = this.clock().toISOString(); attempt.endedAt = step.endedAt; attempt.outcome = output.detail ?? 'completed_and_verified'; run.provenance.push(...(output.evidence ?? []).map(detail => ({type: 'evidence', at: now(), detail}))); this.locks.release(run.id, step.id); this.ledger.update(run, 'step.succeeded'); this.finalizeRun(run);
    } catch (error) {
      const errorInvocationIds = efficiencyInvocationIds(error); if (!attempt.efficiencyInvocationIds?.length && errorInvocationIds.length) attempt.efficiencyInvocationIds = errorInvocationIds;
      const partialOutput = partialActionOutput(error); if (partialOutput) this.recordActionOutput(run, step.id, worker.id, partialOutput);
      if (error instanceof StepTimeoutError) {
        const cleanup = await ownedExecution.terminateAll('step_timeout'); attempt.cleanup = cleanup; step.cleanup = cleanup;
        if (cleanup.outcome !== 'confirmed') {
          safeToReleaseWorker = false; this.markCleanupUncertain(run, step, attempt, cleanup, `step_timeout:${error.timeoutSeconds}s`); return;
        }
        const endedAt = this.clock().toISOString(), terminalReason = 'step_timeout';
        step.status = 'TIMED_OUT'; step.endedAt = endedAt; step.error = `${terminalReason}:${error.timeoutSeconds}s`; attempt.endedAt = endedAt; attempt.outcome = step.error; attempt.retryable = false; attempt.errorClass = 'execution'; attempt.timeoutSeconds = error.timeoutSeconds; attempt.elapsedMs = error.elapsedMs; attempt.terminalReason = terminalReason;
        this.cancelDependents(run, step.id); run.status = 'FAILED'; run.endedAt = endedAt; run.errors.push(`${step.id}:execution:${step.error}`);
        const timeoutEvidence = {jobId: run.jobId, runId: run.id, stepId: step.id, timeoutSeconds: error.timeoutSeconds, elapsedMs: error.elapsedMs, terminalReason};
        const ids = this.invocationIds(run, step.id); if (ids.length) { this.efficiency?.finalizePending(ids, 'FAILED', step.error, terminalReason, endedAt); this.efficiency?.markVerification(ids, 'FAIL', 'FAILED'); }
        run.provenance.push({type: 'step-timeout', at: endedAt, detail: JSON.stringify(timeoutEvidence)}); this.locks.release(run.id, step.id); this.ledger.update(run, 'step.timed_out', timeoutEvidence); return;
      }
      if (controller.signal.aborted) {
        const cleanup = await ownedExecution.terminateAll('execution_cancelled'); attempt.cleanup = cleanup; step.cleanup = cleanup;
        if (cleanup.outcome !== 'confirmed') { safeToReleaseWorker = false; this.markCleanupUncertain(run, step, attempt, cleanup, 'execution_cancelled'); return; }
        step.status = 'CANCELLED'; step.waitingReason = undefined; step.endedAt = this.clock().toISOString(); attempt.endedAt = step.endedAt; attempt.outcome = 'execution_cancelled'; run.status = 'CANCELLED'; run.endedAt = step.endedAt; if (!run.errors.includes('execution_cancelled')) run.errors.push('execution_cancelled'); this.finalizeCancelledEfficiency(run, 'execution_cancelled'); this.locks.release(run.id, step.id); this.ledger.update(run, 'run.cancellation_confirmed', {cleanup: cleanup.outcome}); return;
      }
      const failure = error instanceof ActionFailure ? error : new ActionFailure(error instanceof Error ? error.message : String(error), 'execution', true);
      attempt.endedAt = this.clock().toISOString(); attempt.outcome = failure.message; attempt.retryable = failure.retryable; attempt.errorClass = failure.failureClass; attempt.recoveryKind = failure.recoveryKind; step.error = safeFailureMessage(failure.message); this.locks.release(run.id, step.id);
      if (attempt.efficiencyInvocationIds?.length) { this.efficiency?.finalizePending(attempt.efficiencyInvocationIds, 'FAILED', failure.message, 'executor_failure', attempt.endedAt); this.efficiency?.markVerification(attempt.efficiencyInvocationIds, 'FAIL'); }
      if (failure.recoveryKind === 'authentication-required') {
        step.status = 'AUTHENTICATION_BLOCKED'; step.waitingReason = 'Authentication requires human action for the sealed account profile'; step.remainingRetryBudget = Math.max(0, retry.attempts - step.attempts.length + 1); run.status = 'AUTHENTICATION_BLOCKED'; run.errors.push(`${step.id}:authentication:human_action_required`); this.ledger.update(run, 'step.authentication_blocked', {recoveryKind: failure.recoveryKind});
      } else {
        const retryAt = this.nextRetryAt(step, retry);
        if (failure.retryable && step.attempts.length <= retry.attempts && retryAt) {
          step.status = 'RETRY_PENDING'; step.nextAttemptAt = retryAt; step.remainingRetryBudget = Math.max(0, retry.attempts - step.attempts.length + 1); step.waitingReason = `${failure.recoveryKind}; retry ${step.attempts.length}/${retry.attempts} at ${retryAt}`;
          run.status = ['transient-transport', 'expired-enrolment'].includes(failure.recoveryKind) ? 'RECONNECTING' : 'QUEUED';
          this.ledger.update(run, run.status === 'RECONNECTING' ? 'step.reconnect_pending' : 'step.retry_pending', {recoveryKind: failure.recoveryKind, nextAttemptAt: retryAt, recoveryDeadlineAt: step.recoveryDeadlineAt, remainingRetryBudget: step.remainingRetryBudget});
        } else {
          step.status = 'FAILED'; step.endedAt = this.clock().toISOString(); step.remainingRetryBudget = Math.max(0, retry.attempts - step.attempts.length + 1); this.cancelDependents(run, step.id); run.errors.push(`${step.id}:${failure.failureClass}:${safeFailureMessage(failure.message)}${failure.retryable && !retryAt ? ':recovery_deadline_exhausted' : ''}`); run.status = failure.failureClass === 'verification' ? 'DEGRADED' : 'FAILED'; run.endedAt = step.endedAt; const ids = this.invocationIds(run); if (ids.length) { this.efficiency?.finalizePending(ids, 'FAILED', failure.message, 'executor_failure', run.endedAt); this.efficiency?.markVerification(ids, 'FAIL', run.status); } this.ledger.update(run, 'step.failed', {recoveryKind: failure.recoveryKind, recoveryDeadlineAt: step.recoveryDeadlineAt, remainingRetryBudget: step.remainingRetryBudget});
        }
      }
    } finally { if (timeoutTimer) clearTimeout(timeoutTimer); if (controller.signal.aborted && !attempt.cleanup) { const cleanup = await ownedExecution.terminateAll('execution_aborted'); attempt.cleanup = cleanup; step.cleanup = cleanup; if (cleanup.outcome !== 'confirmed') safeToReleaseWorker = false; } if (safeToReleaseWorker) this.workers.release(worker.id); this.controllers.delete(run.id); }
  }

  private nextRetryAt(step: RunRecord['steps'][number], retry: RetryPolicy) {
    const exponent = Math.max(0, step.attempts.length - 1), multiplied = retry.backoffSeconds * Math.pow(retry.backoffMultiplier ?? 1, exponent), delaySeconds = Math.min(multiplied, retry.maxBackoffSeconds ?? multiplied), candidate = new Date(this.clock().getTime() + delaySeconds * 1000);
    const deadline = Date.parse(step.recoveryDeadlineAt ?? '');
    return Number.isFinite(deadline) && candidate.getTime() > deadline ? undefined : candidate.toISOString();
  }
  private markCleanupUncertain(run: RunRecord, step: RunRecord['steps'][number], attempt: StepAttempt, cleanup: ExecutionCleanupReport, reason: string) {
    const at = this.clock().toISOString(); step.status = 'CLEANUP_UNCERTAIN'; step.waitingReason = `Worker cleanup ${cleanup.outcome}; resource lease retained pending reconciliation`; step.error = `${reason}:cleanup_${cleanup.outcome}`; step.cleanup = cleanup; attempt.endedAt = at; attempt.outcome = step.error; attempt.terminalReason = 'cleanup_unproven'; run.status = 'CLEANUP_UNCERTAIN'; run.errors.push(`${step.id}:cleanup:${cleanup.outcome}`); run.provenance.push({type: 'cleanup-uncertain', at, detail: `outcome=${cleanup.outcome};processes=${cleanup.processes.length};resource-lock=retained`}); this.ledger.update(run, 'step.cleanup_uncertain', {cleanupOutcome: cleanup.outcome, processCount: cleanup.processes.length, resourceLockReleased: false});
  }
  private finalizeCancelledEfficiency(run: RunRecord, reason: string) { const ids = this.invocationIds(run); if (ids.length) { this.efficiency?.finalizePending(ids, 'CANCELLED', reason, reason, run.endedAt); this.efficiency?.markVerification(ids, 'FAIL', 'CANCELLED'); } }
  private inputArtifacts(run: RunRecord, stepId: string) { const definition = run.effectiveJob.spec.steps.find(step => step.id === stepId)!; return Object.values(definition.inputs ?? {}).map(reference => { const [sourceStep, artifactName] = reference.split('.'); const source = run.steps.find(step => step.id === sourceStep); const record = source?.artifactIds.map(id => this.artifacts.get(id)).find(item => item?.name === artifactName); if (!record) throw new ActionFailure(`input_artifact_missing:${reference}`, 'configuration'); this.artifacts.read(record.id); return record; }); }
  private recordActionOutput(run: RunRecord, stepId: string, workerId: string, output: ActionOutput) { const definition = run.effectiveJob.spec.steps.find(step => step.id === stepId)!, step = run.steps.find(item => item.id === stepId)!; for (const produced of output.artifacts ?? []) { const declaration = definition.outputs?.find(item => item.name === produced.name); if (!declaration) throw new ActionFailure(`undeclared_artifact:${produced.name}`, 'configuration'); if (produced.type && produced.type !== declaration.type || produced.schema && produced.schema !== declaration.schema || produced.version && produced.version !== declaration.version) throw new ActionFailure(`artifact_contract_mismatch:${produced.name}`, 'verification'); const artifact = this.artifacts.create(run, stepId, workerId, {...declaration, retention: produced.retention ?? declaration.retention}, produced.value); step.artifactIds.push(artifact.id); run.artifacts.push(artifact.id); } }
  private cancelDependents(run: RunRecord, failedStepId: string) { const blocked = new Set([failedStepId]); let changed = true; while (changed) { changed = false; for (const step of run.steps) if (!TERMINAL_STEPS.includes(step.status) && step.dependsOn.some(id => blocked.has(id))) { step.status = 'CANCELLED'; step.error = 'upstream_failed'; step.endedAt = this.clock().toISOString(); blocked.add(step.id); changed = true; } } }
  private invocationIds(run: RunRecord, stepId?: string) { const retained = run.steps.filter(step => !stepId || step.id === stepId).flatMap(step => step.attempts.flatMap(attempt => attempt.efficiencyInvocationIds ?? [])); const discovered = this.efficiency?.list().filter(item => item.runId === run.id && (!stepId || item.stepId === stepId)).map(item => item.id) ?? []; return [...new Set([...retained, ...discovered])]; }
  private linkPriorRun(id: string, field: 'retriedByRunId', value: string) { const prior = this.ledger.get(id); if (!prior) throw new Error('retry_source_missing'); prior.lineage = {...prior.lineage, [field]: value}; this.ledger.update(prior, 'run.lineage_linked', {[field]: value}); }
  private finalizeRun(run: RunRecord) { if (run.steps.some(step => step.status === 'FAILED')) return; if (run.steps.some(step => !TERMINAL_STEPS.includes(step.status))) { const status: RunStatus = run.steps.some(step => step.status === 'AUTHENTICATION_BLOCKED') ? 'AUTHENTICATION_BLOCKED' : run.steps.some(step => step.status === 'CLEANUP_UNCERTAIN') ? 'CLEANUP_UNCERTAIN' : run.steps.some(step => step.status === 'CANCEL_PENDING') ? 'CANCELLING' : run.steps.some(step => step.status === 'RETRY_PENDING' && ['transient-transport', 'expired-enrolment'].includes(step.attempts.at(-1)?.recoveryKind ?? '')) ? 'RECONNECTING' : run.steps.some(step => ['WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(step.status)) ? 'WAITING' : 'RUNNING'; if (run.status !== status) { run.status = status; this.ledger.update(run, status === 'RECONNECTING' ? 'run.reconnecting' : status === 'AUTHENTICATION_BLOCKED' ? 'run.authentication_blocked' : status === 'CANCELLING' ? 'run.cancelling' : status === 'CLEANUP_UNCERTAIN' ? 'run.cleanup_uncertain' : status === 'WAITING' ? 'run.waiting' : 'run.continuing'); } return; } run.status = run.steps.every(step => step.status === 'SUCCEEDED') ? 'SUCCEEDED' : 'DEGRADED'; run.endedAt = this.clock().toISOString(); const ids = run.steps.flatMap(step => step.attempts.flatMap(attempt => attempt.efficiencyInvocationIds ?? [])); if (ids.length) this.efficiency?.markFinalResult(ids, run.status as Exclude<InvocationFinalResult, 'UNKNOWN'>); this.locks.release(run.id); if (run.trigger.type === 'schedule' && run.trigger.id) { const state = this.ledger.schedule(run.trigger.id); if (state) { if (run.status === 'SUCCEEDED') state.lastSuccessAt = run.endedAt; else state.lastFailureAt = run.endedAt; state.updatedAt = run.endedAt; this.ledger.saveSchedule(state); } } this.ledger.update(run, 'run.finished'); }
  private mustRun(id: string) { const run = this.ledger.get(id); if (!run) throw new Error('run_missing'); return run; }
}

export function createJobRuntime(root: string, catalog: JobCatalog, actions: ActionRegistry, workers: WorkerRegistry, options?: JobRuntimeOptions) { const jobsRoot = path.join(root, 'jobs'); const ledger = new RunLedger(path.join(jobsRoot, 'run-ledger.json')); ledger.recoverFailClosed(); return new JobRuntime(catalog, actions, workers, ledger, new ArtifactStore(path.join(jobsRoot, 'artifact-store')), new ResourceLockManager(path.join(jobsRoot, 'resource-locks.json')), options); }

function efficiencyInvocationIds(error: unknown): string[] { const value = error as {efficiencyInvocationIds?: unknown}; return Array.isArray(value?.efficiencyInvocationIds) ? value.efficiencyInvocationIds.filter((item): item is string => typeof item === 'string') : []; }
function partialActionOutput(error: unknown): ActionOutput | undefined { const value = error as {partialActionOutput?: unknown}; return value?.partialActionOutput && typeof value.partialActionOutput === 'object' ? value.partialActionOutput as ActionOutput : undefined; }
function safeFailureMessage(value: string) { return String(value).replace(/(?:bearer\s+|sk-)[A-Za-z0-9._-]{8,}/gi, '[REDACTED]').replace(/(password|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*\S+/gi, '$1=[REDACTED]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED_ACCOUNT]').slice(0, 2048); }
