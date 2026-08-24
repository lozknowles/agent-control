import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {ResourceConfig} from './config.js';
import {effectiveParameters, nextCronOccurrence, type JobCatalog} from './job-catalog.js';
import {jobPriorityRank, type ActionFailureClass, type ActionHandler, type ActionOutput, type ArtifactRecord, type PlacementRationale, type RunRecord, type RunStatus, type ScheduleState, type StepAttempt, type StepStatus, type WorkerRegistration} from './job-types.js';

function writeJsonAtomic(file: string, value: unknown) { fs.mkdirSync(path.dirname(file), {recursive: true}); const temporary = `${file}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, file); }
function now() { return new Date().toISOString(); }
const ACTIVE_RUNS: RunStatus[] = ['SCHEDULED', 'QUEUED', 'RUNNING', 'VERIFYING', 'DISCONNECTED'];
const TERMINAL_STEPS: StepStatus[] = ['SUCCEEDED', 'FAILED', 'CANCELLED'];

export class ActionFailure extends Error {constructor(message: string, readonly failureClass: ActionFailureClass, readonly retryable = false) { super(message); this.name = 'ActionFailure'; }}
export class ActionRegistry {
  private readonly handlers = new Map<string, ActionHandler>();
  register(id: string, handler: ActionHandler) { if (!/^[a-z0-9][a-z0-9._-]*@\d+\.\d+\.\d+$/.test(id)) throw new Error('invalid_action_id'); if (this.handlers.has(id)) throw new Error('action_exists'); this.handlers.set(id, handler); return this; }
  has(id: string) { return this.handlers.has(id); }
  ids() { return new Set(this.handlers.keys()); }
  handler(id: string) { const handler = this.handlers.get(id); if (!handler) throw new ActionFailure(`action_not_registered:${id}`, 'configuration'); return handler; }
}

export class WorkerRegistry {
  private readonly workers = new Map<string, WorkerRegistration>();
  register(worker: WorkerRegistration) { if (this.workers.has(worker.id)) throw new Error('worker_exists'); this.workers.set(worker.id, structuredClone(worker)); return this; }
  upsert(worker: WorkerRegistration) { this.workers.set(worker.id, structuredClone(worker)); return this; }
  list() { return [...this.workers.values()].map(worker => structuredClone(worker)); }
  setHealth(id: string, health: WorkerRegistration['health']) { const worker = this.workers.get(id); if (!worker) throw new Error('worker_missing'); worker.health = health; worker.observedAt = now(); }
  resolve(required: string[], at = new Date()): {worker?: WorkerRegistration; rationale: PlacementRationale} {
    const eligible: WorkerRegistration[] = [], rejected: PlacementRationale['rejected'] = [];
    for (const worker of this.workers.values()) {
      const reasons: string[] = [];
      if (worker.health !== 'healthy') reasons.push(`health:${worker.health}`);
      if (worker.active >= worker.capacity) reasons.push('capacity_exhausted');
      for (const capability of required) {
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
  add(run: RunRecord) { if (this.runs.has(run.id)) throw new Error('run_exists'); this.runs.set(run.id, structuredClone(run)); this.record(run.id, 'run.created', run.status); return this.get(run.id)!; }
  update(run: RunRecord, event = 'run.updated') { if (!this.runs.has(run.id)) throw new Error('run_missing'); this.runs.set(run.id, structuredClone(run)); this.record(run.id, event, run.status); return this.get(run.id)!; }
  get(id: string) { const run = this.runs.get(id); return run ? structuredClone(run) : undefined; }
  list(jobId?: string) { return [...this.runs.values()].filter(run => !jobId || run.jobId === jobId).sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)).map(run => structuredClone(run)); }
  schedule(id: string) { const state = this.schedules.get(id); return state ? structuredClone(state) : undefined; }
  saveSchedule(state: ScheduleState) { this.schedules.set(state.scheduleId, structuredClone(state)); this.save(); return this.schedule(state.scheduleId)!; }
  scheduleStates() { return [...this.schedules.values()].map(state => structuredClone(state)); }
  recoverFailClosed() { const changed: string[] = []; for (const run of this.runs.values()) { let dirty = false; for (const step of run.steps) if (['DISPATCHED', 'RUNNING', 'VERIFYING'].includes(step.status)) { step.status = 'FAILED'; step.error = 'execution_identity_unproven_after_restart'; step.endedAt = now(); dirty = true; } if (dirty || ['RUNNING', 'VERIFYING'].includes(run.status)) { run.status = 'DISCONNECTED'; run.errors.push('execution_identity_unproven_after_restart'); run.provenance.push({type: 'recovery', at: now(), detail: 'Fail closed: original execution identity not proven'}); changed.push(run.id); } } if (changed.length) this.save(); return changed; }
  private record(runId: string, type: string, status: string) { fs.mkdirSync(path.dirname(this.file), {recursive: true}); fs.appendFileSync(this.eventsFile, `${JSON.stringify({at: now(), runId, type, status})}\n`, {mode: 0o600}); this.save(); }
  private save() { writeJsonAtomic(this.file, {version: 1, runs: this.list(), schedules: this.scheduleStates()} satisfies LedgerSnapshot); }
}

export interface JobRuntimeOptions {now?: () => Date; approval?: (policy: string, run: RunRecord) => boolean;}
export class JobRuntime {
  private readonly controllers = new Map<string, AbortController>();
  private readonly clock: () => Date;
  constructor(readonly catalog: JobCatalog, readonly actions: ActionRegistry, readonly workers: WorkerRegistry, readonly ledger: RunLedger, readonly artifacts: ArtifactStore, readonly locks: ResourceLockManager, options: JobRuntimeOptions = {}) { this.clock = options.now ?? (() => new Date()); this.approval = options.approval ?? (() => false); }
  private readonly approval: (policy: string, run: RunRecord) => boolean;

  createRun(jobReference: string, parameters: Record<string, unknown>, trigger: RunRecord['trigger'], scheduledAt?: string) {
    const job = this.catalog.job(jobReference); if (!job) throw new Error('job_missing'); if (job.spec.enabled === false) throw new Error('job_disabled');
    const active = this.ledger.list(job.metadata.id).filter(run => ACTIVE_RUNS.includes(run.status));
    if (job.spec.concurrency === 'replace-running') for (const run of active) this.cancel(run.id, 'replaced_by_new_run');
    const run: RunRecord = {id: `run-${randomUUID()}`, jobId: job.metadata.id, jobVersion: job.metadata.version, trigger: structuredClone(trigger), requestedAt: this.clock().toISOString(), scheduledAt, status: 'QUEUED', priority: job.spec.priority, concurrency: job.spec.concurrency, parameters: effectiveParameters(job, parameters), steps: job.spec.steps.map(step => ({id: step.id, action: step.action, status: (step.dependsOn?.length ? 'WAITING_FOR_DEPENDENCY' : 'QUEUED'), dependsOn: [...(step.dependsOn ?? [])], capabilityRequest: {requires: step.requires.map(id => ({id}))}, resources: [...(step.resources ?? [])], attempts: [], artifactIds: [], approval: step.approval, verification: {required: [...(step.verification ?? [])], passed: [], failed: []}})), artifacts: [], errors: [], effectiveJob: structuredClone(job), selectedWorkers: [], approvals: [], provenance: [{type: 'trigger', at: this.clock().toISOString(), detail: `${trigger.type}:${trigger.actor}`} ]};
    if (active.length && job.spec.concurrency === 'no-overlap') run.provenance.push({type: 'concurrency', at: now(), detail: `Waiting for active run ${active[0].id}`});
    return this.ledger.add(run);
  }

  async tick() {
    const runs = this.ledger.list().filter(run => ['QUEUED', 'RUNNING'].includes(run.status)).sort((a, b) => jobPriorityRank[b.priority] - jobPriorityRank[a.priority] || Date.parse(a.requestedAt) - Date.parse(b.requestedAt));
    for (const run of runs) {
      const activeSibling = this.ledger.list(run.jobId).find(other => other.id !== run.id && ['RUNNING', 'VERIFYING'].includes(other.status));
      if (activeSibling && ['no-overlap', 'queue'].includes(run.concurrency)) continue;
      const step = this.nextRunnableStep(run); if (!step) { this.finalizeRun(run); continue; }
      await this.executeStep(run, step.id); return this.ledger.get(run.id)!;
    }
    return undefined;
  }

  async tickSchedules(at = this.clock()) {
    const created: RunRecord[] = [];
    for (const schedule of this.catalog.listSchedules()) {
      let state = this.ledger.schedule(schedule.metadata.id) ?? {scheduleId: schedule.metadata.id, enabled: schedule.spec.enabled ?? false, missedCount: 0, updatedAt: at.toISOString()};
      if (!state.nextScheduledAt) state.nextScheduledAt = nextCronOccurrence(schedule.spec.cron, schedule.spec.timezone, new Date(at.getTime() - 60000)).toISOString();
      if (!state.enabled || Date.parse(state.nextScheduledAt) > at.getTime()) { state.updatedAt = at.toISOString(); this.ledger.saveSchedule(state); continue; }
      const scheduledAt = state.nextScheduledAt, lag = at.getTime() - Date.parse(scheduledAt);
      if (lag > 60000 && schedule.spec.missedRunPolicy === 'skip') { const missed = this.createRun(schedule.spec.job, schedule.spec.parameters ?? {}, {type: 'schedule', id: schedule.metadata.id, actor: 'agent-control-scheduler'}, scheduledAt); missed.status = 'MISSED'; missed.endedAt = at.toISOString(); missed.errors.push('missed_schedule_policy:skip'); missed.provenance.push({type: 'schedule', at: at.toISOString(), detail: 'Occurrence recorded but skipped by missed-run policy'}); this.ledger.update(missed, 'run.missed'); state.missedCount++; state.lastRunId = missed.id; state.previousScheduledAt = scheduledAt; state.nextScheduledAt = nextCronOccurrence(schedule.spec.cron, schedule.spec.timezone, at).toISOString(); state.updatedAt = at.toISOString(); this.ledger.saveSchedule(state); continue; }
      const run = this.createRun(schedule.spec.job, schedule.spec.parameters ?? {}, {type: 'schedule', id: schedule.metadata.id, actor: 'agent-control-scheduler'}, scheduledAt); created.push(run); state.lastRunId = run.id; state.previousScheduledAt = scheduledAt; state.nextScheduledAt = nextCronOccurrence(schedule.spec.cron, schedule.spec.timezone, at).toISOString(); state.updatedAt = at.toISOString(); this.ledger.saveSchedule(state);
    }
    return created;
  }

  setScheduleEnabled(id: string, enabled: boolean) { const definition = this.catalog.schedule(id); if (!definition) throw new Error('schedule_missing'); const at = this.clock(), current = this.ledger.schedule(id); return this.ledger.saveSchedule({scheduleId: id, enabled, previousScheduledAt: current?.previousScheduledAt, nextScheduledAt: enabled ? nextCronOccurrence(definition.spec.cron, definition.spec.timezone, at).toISOString() : current?.nextScheduledAt, lastRunId: current?.lastRunId, lastSuccessAt: current?.lastSuccessAt, lastFailureAt: current?.lastFailureAt, missedCount: current?.missedCount ?? 0, updatedAt: at.toISOString()}); }
  approve(runId: string, policy: string) { const run = this.mustRun(runId), waiting = run.steps.filter(step => step.status === 'WAITING_FOR_APPROVAL' && step.approval === policy); if (!waiting.length) throw new Error('approval_policy_not_waiting'); if (!run.approvals.includes(policy)) run.approvals.push(policy); for (const step of waiting) { step.status = 'QUEUED'; step.waitingReason = undefined; } return this.ledger.update(run, 'run.approved'); }
  cancel(runId: string, reason = 'operator_cancelled') { const run = this.mustRun(runId), controller = this.controllers.get(runId); controller?.abort(reason); for (const step of run.steps) if (!TERMINAL_STEPS.includes(step.status)) { step.status = 'CANCELLED'; step.endedAt = now(); } run.status = 'CANCELLED'; run.endedAt = now(); run.errors.push(reason); if (!controller) this.locks.release(run.id); else run.provenance.push({type: 'cancellation', at: now(), detail: 'Execution abort requested; resource lock retained until handler returns'}); return this.ledger.update(run, 'run.cancelled'); }
  retry(runId: string) { const source = this.mustRun(runId); if (!['FAILED', 'DEGRADED', 'CANCELLED', 'DISCONNECTED'].includes(source.status)) throw new Error('run_not_retryable'); return this.createRun(`${source.jobId}@${source.jobVersion}`, source.parameters, {type: 'retry', id: source.id, actor: 'operator'}); }
  jobsProjection() { return this.catalog.listJobs().map(job => { const runs = this.ledger.list(job.metadata.id), latest = runs[0], schedules = this.catalog.listSchedules().filter(schedule => schedule.spec.job === `${job.metadata.id}@${job.metadata.version}`).map(schedule => ({...schedule, state: this.ledger.schedule(schedule.metadata.id)})); return {...job, latestRun: latest, schedules}; }); }
  queueProjection() { return this.ledger.list().flatMap(run => run.steps.filter(step => ['QUEUED', 'WAITING_FOR_WORKER', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE', 'WAITING_FOR_APPROVAL', 'RETRY_PENDING'].includes(step.status)).map(step => ({runId: run.id, jobId: run.jobId, priority: run.priority, stepId: step.id, status: step.status, reason: step.waitingReason, eligibleWorkers: step.placement?.eligible ?? [], missingCapabilities: step.placement?.rejected.flatMap(item => item.reasons.filter(reason => reason.startsWith('missing:'))) ?? [], scheduledAt: run.scheduledAt, queuedAt: run.requestedAt})) ); }

  private nextRunnableStep(run: RunRecord) {
    for (const step of run.steps) {
      if (TERMINAL_STEPS.includes(step.status)) continue;
      if (['DISPATCHED', 'RUNNING', 'VERIFYING'].includes(step.status)) return undefined;
      const dependencies = step.dependsOn.map(id => run.steps.find(candidate => candidate.id === id));
      if (dependencies.some(dependency => dependency?.status === 'FAILED' || dependency?.status === 'CANCELLED')) { step.status = 'CANCELLED'; step.error = 'upstream_failed'; continue; }
      if (!dependencies.every(dependency => dependency?.status === 'SUCCEEDED')) { step.status = 'WAITING_FOR_DEPENDENCY'; step.waitingReason = `Waiting for ${dependencies.filter(item => item?.status !== 'SUCCEEDED').map(item => item?.id).join(', ')}`; continue; }
      if (step.status === 'RETRY_PENDING' && Date.parse(step.nextAttemptAt ?? '') > this.clock().getTime()) continue;
      if (step.approval && !run.approvals.includes(step.approval) && !this.approval(step.approval, run)) { step.status = 'WAITING_FOR_APPROVAL'; step.waitingReason = `Approval required: ${step.approval}`; continue; }
      step.status = 'QUEUED'; step.waitingReason = undefined; return step;
    }
    this.ledger.update(run, 'run.dependencies_reconciled'); return undefined;
  }

  private async executeStep(run: RunRecord, stepId: string) {
    const step = run.steps.find(item => item.id === stepId)!;
    const lock = this.locks.acquire(step.resources, run.id, step.id);
    if (!lock.ok) { step.status = 'WAITING_FOR_RESOURCE'; step.waitingReason = `Held by ${lock.blocked.map(item => `${item.resource}:${item.runId}`).join(', ')}`; this.ledger.update(run, 'step.waiting_resource'); return; }
    const required = step.capabilityRequest.requires.map(item => item.id), resolution = this.workers.resolve(required, this.clock()); step.placement = resolution.rationale;
    if (!resolution.worker) { step.status = 'WAITING_FOR_WORKER'; step.waitingReason = `No worker satisfies ${required.join(', ')}`; this.locks.release(run.id, step.id); this.ledger.update(run, 'step.waiting_worker'); return; }
    const worker = resolution.worker, controller = new AbortController(); this.controllers.set(run.id, controller); this.workers.claim(worker.id); step.status = 'RUNNING'; step.startedAt ??= this.clock().toISOString(); run.startedAt ??= step.startedAt; run.status = 'RUNNING'; if (!run.selectedWorkers.includes(worker.id)) run.selectedWorkers.push(worker.id); const attempt: StepAttempt = {attempt: step.attempts.length + 1, startedAt: this.clock().toISOString(), workerId: worker.id}; step.attempts.push(attempt); this.ledger.update(run, 'step.dispatched');
    try {
      const inputs = this.inputArtifacts(run, step.id), output = await this.actions.handler(step.action)({run: structuredClone(run), step: structuredClone(step), worker, parameters: structuredClone(run.parameters), inputArtifacts: inputs, readArtifact: id => this.artifacts.read(id), signal: controller.signal});
      if (controller.signal.aborted) throw new ActionFailure('execution_cancelled', 'execution');
      this.recordActionOutput(run, step.id, worker.id, output); step.status = 'VERIFYING'; run.status = 'VERIFYING'; this.ledger.update(run, 'step.verifying');
      const requiredVerification = step.verification?.required ?? [], passed = new Set(output.verification ?? []); step.verification!.passed = requiredVerification.filter(item => passed.has(item)); step.verification!.failed = requiredVerification.filter(item => !passed.has(item));
      if (step.verification!.failed.length) throw new ActionFailure(`verification_failed:${step.verification!.failed.join(',')}`, 'verification');
      step.status = 'SUCCEEDED'; step.endedAt = this.clock().toISOString(); attempt.endedAt = step.endedAt; attempt.outcome = output.detail ?? 'completed_and_verified'; run.provenance.push(...(output.evidence ?? []).map(detail => ({type: 'evidence', at: now(), detail}))); this.locks.release(run.id, step.id); this.ledger.update(run, 'step.succeeded'); this.finalizeRun(run);
    } catch (error) {
      if (controller.signal.aborted) { step.status = 'CANCELLED'; step.endedAt = this.clock().toISOString(); attempt.endedAt = step.endedAt; attempt.outcome = 'execution_cancelled'; run.status = 'CANCELLED'; run.endedAt = step.endedAt; run.errors.push('execution_cancelled'); this.locks.release(run.id, step.id); this.ledger.update(run, 'run.cancellation_confirmed'); return; }
      const failure = error instanceof ActionFailure ? error : new ActionFailure(error instanceof Error ? error.message : String(error), 'execution', true), definition = run.effectiveJob.spec.steps.find(item => item.id === step.id)!, retry = definition.retry ?? run.effectiveJob.spec.retry ?? {attempts: 0, backoffSeconds: 0};
      attempt.endedAt = this.clock().toISOString(); attempt.outcome = failure.message; attempt.retryable = failure.retryable; attempt.errorClass = failure.failureClass; step.error = failure.message; this.locks.release(run.id, step.id);
      if (failure.retryable && step.attempts.length <= retry.attempts) { step.status = 'RETRY_PENDING'; step.nextAttemptAt = new Date(this.clock().getTime() + retry.backoffSeconds * 1000).toISOString(); step.waitingReason = `${failure.failureClass}; retry ${step.attempts.length}/${retry.attempts}`; run.status = 'QUEUED'; this.ledger.update(run, 'step.retry_pending'); }
      else { step.status = 'FAILED'; step.endedAt = this.clock().toISOString(); this.cancelDependents(run, step.id); run.errors.push(`${step.id}:${failure.failureClass}:${failure.message}`); run.status = failure.failureClass === 'verification' ? 'DEGRADED' : 'FAILED'; run.endedAt = step.endedAt; this.ledger.update(run, 'step.failed'); }
    } finally { this.workers.release(worker.id); this.controllers.delete(run.id); }
  }

  private inputArtifacts(run: RunRecord, stepId: string) { const definition = run.effectiveJob.spec.steps.find(step => step.id === stepId)!; return Object.values(definition.inputs ?? {}).map(reference => { const [sourceStep, artifactName] = reference.split('.'); const source = run.steps.find(step => step.id === sourceStep); const record = source?.artifactIds.map(id => this.artifacts.get(id)).find(item => item?.name === artifactName); if (!record) throw new ActionFailure(`input_artifact_missing:${reference}`, 'configuration'); this.artifacts.read(record.id); return record; }); }
  private recordActionOutput(run: RunRecord, stepId: string, workerId: string, output: ActionOutput) { const definition = run.effectiveJob.spec.steps.find(step => step.id === stepId)!, step = run.steps.find(item => item.id === stepId)!; for (const produced of output.artifacts ?? []) { const declaration = definition.outputs?.find(item => item.name === produced.name); if (!declaration) throw new ActionFailure(`undeclared_artifact:${produced.name}`, 'configuration'); if (produced.type && produced.type !== declaration.type || produced.schema && produced.schema !== declaration.schema || produced.version && produced.version !== declaration.version) throw new ActionFailure(`artifact_contract_mismatch:${produced.name}`, 'verification'); const artifact = this.artifacts.create(run, stepId, workerId, {...declaration, retention: produced.retention ?? declaration.retention}, produced.value); step.artifactIds.push(artifact.id); run.artifacts.push(artifact.id); } }
  private cancelDependents(run: RunRecord, failedStepId: string) { const blocked = new Set([failedStepId]); let changed = true; while (changed) { changed = false; for (const step of run.steps) if (!TERMINAL_STEPS.includes(step.status) && step.dependsOn.some(id => blocked.has(id))) { step.status = 'CANCELLED'; step.error = 'upstream_failed'; step.endedAt = this.clock().toISOString(); blocked.add(step.id); changed = true; } } }
  private finalizeRun(run: RunRecord) { if (run.steps.some(step => step.status === 'FAILED')) return; if (run.steps.some(step => !TERMINAL_STEPS.includes(step.status))) { run.status = 'RUNNING'; this.ledger.update(run, 'run.continuing'); return; } run.status = run.steps.every(step => step.status === 'SUCCEEDED') ? 'SUCCEEDED' : 'DEGRADED'; run.endedAt = this.clock().toISOString(); this.locks.release(run.id); if (run.trigger.type === 'schedule' && run.trigger.id) { const state = this.ledger.schedule(run.trigger.id); if (state) { if (run.status === 'SUCCEEDED') state.lastSuccessAt = run.endedAt; else state.lastFailureAt = run.endedAt; state.updatedAt = run.endedAt; this.ledger.saveSchedule(state); } } this.ledger.update(run, 'run.finished'); }
  private mustRun(id: string) { const run = this.ledger.get(id); if (!run) throw new Error('run_missing'); return run; }
}

export function createJobRuntime(root: string, catalog: JobCatalog, actions: ActionRegistry, workers: WorkerRegistry, options?: JobRuntimeOptions) { const jobsRoot = path.join(root, 'jobs'); const ledger = new RunLedger(path.join(jobsRoot, 'run-ledger.json')); ledger.recoverFailClosed(); return new JobRuntime(catalog, actions, workers, ledger, new ArtifactStore(path.join(jobsRoot, 'artifact-store')), new ResourceLockManager(path.join(jobsRoot, 'resource-locks.json')), options); }
