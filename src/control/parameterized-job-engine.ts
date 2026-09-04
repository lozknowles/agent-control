import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import type {ModelRegistry} from './model-registry.js';
import {nextSavedJobOccurrence, ParameterizedJobError, ParameterizedJobRegistry, ParameterizedRunStore, resolveParameters, SavedJobStore} from './parameterized-job-registry.js';
import {buildRepositoryContext, LocalRepositoryResolver, ReviewBaselineStore, validateRepositoryReview, type RepositoryResolver} from './repository-review-runtime.js';
import type {JobBudgetPolicy, ParameterizedJobRun, ParameterizedRunStatus, RepositoryReviewExecutor, SavedJob} from './parameterized-job-types.js';

function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function terminal(status: ParameterizedRunStatus) { return ['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS', 'FAILED', 'CANCELLED', 'DEGRADED'].includes(status); }
export interface ParameterizedJobEngineOptions {
  allowedRepositoryRoots: string[];
  allowedRepositoryRemotes?: string[];
  snapshotsRoot: string;
  nodeHealthy: (nodeId: string) => boolean | Promise<boolean>;
  clock?: () => Date;
}

export class ParameterizedJobEngine {
  private readonly active = new Map<string, AbortController>();
  private readonly clock: () => Date;
  constructor(
    readonly definitions: ParameterizedJobRegistry,
    readonly savedJobs: SavedJobStore,
    readonly runs: ParameterizedRunStore,
    readonly baselines: ReviewBaselineStore,
    readonly models: ModelRegistry,
    readonly executor: RepositoryReviewExecutor,
    readonly options: ParameterizedJobEngineOptions,
    readonly repositories: RepositoryResolver = new LocalRepositoryResolver(),
  ) { this.clock = options.clock ?? (() => new Date()); this.recoverInterruptedRuns(); }

  runNow(savedJobId: string, actor: string) { const job = this.savedJobs.get(savedJobId); if (!job.enabled) throw new ParameterizedJobError('saved_job_disabled', savedJobId); return this.createRun(job, {type: 'manual', actor}); }
  createRun(job: SavedJob, trigger: ParameterizedJobRun['trigger']) {
    const definition = this.definitions.resolve(job), scheduledFor = trigger.scheduledFor ?? this.clock().toISOString(), occurrenceId = trigger.type === 'schedule' ? hash(`${job.id}\n${scheduledFor}`) : randomUUID();
    const existing = this.runs.occurrence(occurrenceId); if (existing) return existing;
    const concurrent = this.runs.list(job.id).filter(run => !terminal(run.status));
    if (concurrent.length && job.concurrency === 'forbid-overlap') throw new ParameterizedJobError('saved_job_overlap_forbidden', concurrent[0].id);
    const at = this.clock().toISOString(), run: ParameterizedJobRun = {
      schema: 'agent-control.job-run/v1', id: randomUUID(), occurrenceId, savedJobId: job.id, definition, resolvedParameters: resolveParameters(definition, job.parameters), trigger,
      status: 'QUEUED', transitions: [{status: 'QUEUED', at}], requestedAt: at, workParcelIds: [], evidence: [], providerResponseIds: [], usage: {source: 'unavailable'}, errors: [], fallbackHistory: [], retryHistory: [], immutable: false,
    };
    return this.runs.add(run);
  }

  async tickSchedules(at = this.clock()) {
    const created: ParameterizedJobRun[] = [];
    for (const job of this.savedJobs.list().filter(item => item.enabled && item.schedule?.enabled)) {
      const schedule = job.schedule!, previous = this.runs.list(job.id).filter(run => run.trigger.type === 'schedule').map(run => run.trigger.scheduleCursor ?? run.trigger.scheduledFor).filter(Boolean).sort().at(-1);
      const cursor = previous ? new Date(previous) : new Date(job.updatedAt);
      let due = nextSavedJobOccurrence(job, cursor);
      if (!due || due > at) continue;
      if (schedule.missedRunPolicy === 'skip' && at.getTime() - due.getTime() > 60_000) {
        const skipped = this.createRun(job, {type: 'schedule', actor: 'scheduler', scheduledFor: due.toISOString()});
        created.push(this.cancel(skipped.id, 'scheduler:missed-schedule-skip'));
        continue;
      }
      const scheduledFor = due.toISOString(), scheduleCursor = schedule.missedRunPolicy === 'run-once-immediately' && due < at ? at.toISOString() : scheduledFor;
      try { created.push(this.createRun(job, {type: 'schedule', actor: 'scheduler', scheduledFor, scheduleCursor})); }
      catch (error) { if (!(error instanceof ParameterizedJobError && error.code === 'saved_job_overlap_forbidden')) throw error; }
    }
    return created;
  }

  async executeNext() {
    const queued = this.runs.list().filter(run => run.status === 'QUEUED').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    for (const run of queued) { const saved = run.savedJobId ? this.savedJobs.get(run.savedJobId) : undefined; if (saved?.concurrency !== 'allow' && this.active.has(saved?.id ?? '')) continue; await this.execute(run.id); return this.runs.get(run.id); }
    return undefined;
  }

  async execute(runId: string) {
    let run = this.mustRun(runId); if (run.status !== 'QUEUED') throw new ParameterizedJobError('job_run_not_queued', run.id);
    const saved = run.savedJobId ? this.savedJobs.get(run.savedJobId) : undefined, activeKey = saved?.id ?? run.id;
    if (this.active.has(activeKey) && saved?.concurrency !== 'allow') throw new ParameterizedJobError('saved_job_overlap_forbidden', activeKey);
    const controller = new AbortController(); this.active.set(activeKey, controller);
    const budgets = mergeBudgets(run.definition.budgets, saved?.budgets), timer = setTimeout(() => controller.abort('job_timeout'), budgets.timeoutMinutes * 60_000); timer.unref();
    try {
      run = this.transition(run, 'RESOLVING'); run.startedAt = this.clock().toISOString(); this.runs.update(run);
      const nodeId = String(run.resolvedParameters.node), repositoryPath = String(run.resolvedParameters.repository), requestedRef = String(run.resolvedParameters.ref ?? 'main');
      if (!await this.options.nodeHealthy(nodeId)) throw new ParameterizedJobError('execution_node_unavailable', nodeId);
      const repository = run.repository ? this.restoreFrozenRepository(run.repository) : await this.repositories.resolve({nodeId, repository: repositoryPath, requestedRef, comparisonSha: typeof run.resolvedParameters.compareAgainst === 'string' ? run.resolvedParameters.compareAgainst : undefined, allowedRoots: this.options.allowedRepositoryRoots, allowedRemotes: this.options.allowedRepositoryRemotes, snapshotsRoot: this.options.snapshotsRoot});
      if (run.resolvedParameters.scope === 'changes' && !repository.comparisonSha && saved) {
        const baseline = this.baselines.get(saved.id, repository.identity, requestedRef);
        if (baseline && isAncestor(repository.snapshotPath, baseline.sha, repository.reviewedSha)) repository.comparisonSha = baseline.sha;
      }
      run.repository = repository;
      const modelRole = saved?.routing?.modelRole ?? run.definition.routing.modelRole;
      const route = this.models.route({model: saved?.routing?.model, modelRole, accountProfile: saved?.routing?.accountProfile, nodeId, workloadNodeId: nodeId, requiredCapabilities: ['repository-review'], allowFallback: saved?.routing?.allowFallback ?? run.definition.routing.allowFallback});
      run.modelRoute = route; if (route.fallback) run.fallbackHistory.push({at: this.clock().toISOString(), reason: route.fallbackReason ?? 'primary unavailable', selectedModel: route.modelId});
      const context = buildRepositoryContext(repository, saved?.contextProfile ?? 'STANDARD', budgets.maximumInputTokens); run.context = context.summary;
      run = this.transition(run, 'RUNNING'); this.runs.update(run);
      let response;
      for (let attempt = 0; ; attempt++) {
        try {
          run.executionSequence = (run.executionSequence ?? 0) + 1;
          this.runs.update(run);
          const executionRun = structuredClone(run);
          executionRun.definition = {...executionRun.definition, budgets: structuredClone(budgets)};
          response = await this.executor.execute({run: executionRun, executionAttempt: run.executionSequence, route, instruction: run.definition.template.instruction, contextChunks: context.chunks, maximumOutputTokens: budgets.maximumOutputTokens, maximumCost: budgets.maxCost, signal: controller.signal});
          break;
        } catch (error) {
          const partial = error as Error & {workParcelIds?: string[]; evidence?: string[]; providerResponseIds?: string[]; usage?: ParameterizedJobRun['usage']}, parcelIds = partial.workParcelIds ?? [];
          run.workParcelIds = [...new Set([...run.workParcelIds, ...parcelIds])];
          run.evidence = [...new Set([...run.evidence, ...(partial.evidence ?? [])])]; run.providerResponseIds = [...new Set([...run.providerResponseIds, ...(partial.providerResponseIds ?? [])])]; if (partial.usage) run.usage = partial.usage;
          this.runs.update(run);
          if (controller.signal.aborted || attempt >= budgets.maximumRetries) throw error;
          run.retryHistory.push({at: this.clock().toISOString(), attempt: attempt + 1, reason: error instanceof Error ? error.message : String(error)});
          this.runs.update(run);
        }
      }
      if (!response.workParcelIds.length) throw new ParameterizedJobError('repository_review_work_parcel_missing');
      run.workParcelIds = [...new Set([...run.workParcelIds, ...response.workParcelIds])]; run.evidence = response.evidence; run.providerResponseIds = response.providerResponseIds; run.usage = response.usage; this.runs.update(run);
      if (budgets.maxCost !== undefined && response.usage.cost === undefined) throw new ParameterizedJobError('job_cost_budget_unenforceable');
      if (budgets.maxCost !== undefined && response.usage.cost! > budgets.maxCost) throw new ParameterizedJobError('job_cost_budget_exceeded');
      run = this.transition(run, 'VALIDATING'); this.runs.update(run); run.result = validateRepositoryReview(response.result, repository);
      run.status = run.result.verdict === 'PASS' ? 'SUCCEEDED' : run.result.verdict === 'PASS_WITH_FINDINGS' ? 'SUCCEEDED_WITH_FINDINGS' : run.result.verdict === 'REVIEW_REQUIRED' ? 'DEGRADED' : 'FAILED';
      this.executor.recordVerification?.(response.workParcelIds, run.result.verdict);
      run.completedAt = this.clock().toISOString(); run.transitions.push({status: run.status, at: run.completedAt, detail: run.result.verdict}); run.immutable = true;
      this.runs.update(run);
      if (['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS'].includes(run.status) && saved) this.baselines.advance(saved.id, repository, run.id, run.completedAt);
      return this.runs.get(run.id)!;
    } catch (error) {
      run = this.mustRun(runId); if (!terminal(run.status)) { const timeout = controller.signal.aborted && controller.signal.reason === 'job_timeout'; run.status = controller.signal.aborted && !timeout ? 'CANCELLED' : 'FAILED'; run.completedAt = this.clock().toISOString(); run.errors.push(timeout ? 'job_timeout_budget_exceeded' : error instanceof Error ? error.message : String(error)); run.transitions.push({status: run.status, at: run.completedAt, detail: run.errors.at(-1)}); run.immutable = true; this.runs.update(run); }
      return this.runs.get(run.id)!;
    } finally { clearTimeout(timer); this.active.delete(activeKey); }
  }

  cancel(runId: string, actor: string) { const run = this.mustRun(runId); if (terminal(run.status)) return run; this.active.get(run.savedJobId ?? run.id)?.abort(`cancelled_by:${actor}`); run.status = 'CANCELLED'; run.completedAt = this.clock().toISOString(); run.transitions.push({status: 'CANCELLED', at: run.completedAt, detail: `cancelled_by:${actor}`}); run.errors.push(`cancelled_by:${actor}`); run.immutable = true; this.runs.update(run); return this.mustRun(runId); }
  private recoverInterruptedRuns() {
    for (const run of this.runs.list().filter(item => ['RESOLVING', 'RUNNING', 'VALIDATING'].includes(item.status) && !item.immutable)) {
      run.status = 'QUEUED';
      run.transitions.push({status: 'QUEUED', at: this.clock().toISOString(), detail: 'controller_restart_resume'});
      this.runs.update(run);
    }
  }
  private restoreFrozenRepository(repository: NonNullable<ParameterizedJobRun['repository']>) {
    try {
      if (repository.snapshotKind === 'remote-immutable-archive') {
        if (!repository.bundlePath || !repository.bundleSha256 || createHash('sha256').update(fs.readFileSync(repository.bundlePath)).digest('hex') !== repository.bundleSha256 || !fs.statSync(repository.snapshotPath).isDirectory()) throw new Error('bundle_mismatch');
        return repository;
      }
      const actual = execFileSync('git', ['-C', repository.snapshotPath, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
      if (actual !== repository.reviewedSha) throw new Error('sha_mismatch');
      return repository;
    } catch { throw new ParameterizedJobError('frozen_repository_snapshot_unavailable', repository.reviewedSha); }
  }
  private transition(run: ParameterizedJobRun, status: ParameterizedRunStatus) { run.status = status; run.transitions.push({status, at: this.clock().toISOString()}); return run; }
  private mustRun(id: string) { const run = this.runs.get(id); if (!run) throw new ParameterizedJobError('job_run_missing', id); return run; }
}

function mergeBudgets(base: JobBudgetPolicy, overrides?: Partial<JobBudgetPolicy>): JobBudgetPolicy { return {...base, ...overrides}; }
function isAncestor(repository: string, prior: string, current: string) { try { execFileSync('git', ['-C', repository, 'merge-base', '--is-ancestor', prior, current], {stdio: 'ignore'}); return true; } catch { return false; } }

export function createParameterizedJobEngine(root: string, definitions: ParameterizedJobRegistry, models: ModelRegistry, executor: RepositoryReviewExecutor, options: Omit<ParameterizedJobEngineOptions, 'snapshotsRoot'> & {snapshotsRoot?: string}, repositories?: RepositoryResolver) {
  const jobsRoot = path.join(root, 'parameterized-jobs'); fs.mkdirSync(jobsRoot, {recursive: true});
  const savedJobs = new SavedJobStore(path.join(jobsRoot, 'saved-jobs.json'), definitions, options.clock), runs = new ParameterizedRunStore(path.join(jobsRoot, 'runs.json')), baselines = new ReviewBaselineStore(path.join(jobsRoot, 'review-baselines.json'));
  return new ParameterizedJobEngine(definitions, savedJobs, runs, baselines, models, executor, {...options, snapshotsRoot: options.snapshotsRoot ?? path.join(jobsRoot, 'snapshots')}, repositories);
}
