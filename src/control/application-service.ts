import {appendEvent, batonHealth, checkpoint, saveWorkspace, touchBaton, type LaneState, type Mode, type VerificationEvidence, type VerificationPolicy, type WorkspaceState} from '../state.js';
import {ControlPlane} from '../control-plane.js';
import {requestSelfRoute, type SelfRouteRequest} from './dashboard.js';
import type {ProviderRegistry} from './providers.js';
import type {PtyRegistry} from './pty.js';
import {VerificationService} from './verification.js';
import type {RouteDecision} from './routing.js';
import type {ContextStore} from './context.js';
import type {JobRuntime} from './job-runtime.js';
import type {ManagedNodeManager, ManagedNodeSnapshot} from './managed-node.js';
import type {OutputAuthorityScope, OutputExpansionRequest, TokenAwareOutputMetrics, TokenAwareOutputService} from './token-aware-output.js';
import {MemoryHarnessEfficiencyLedger, type HarnessEfficiencyLedgerPort, type HarnessEfficiencyMetrics} from './harness-efficiency.js';
import {AGENT_CONTROL_VERSION} from '../version.js';
import type {WorkParcelCoordinator} from './work-parcels.js';
import {probeProvider} from './provider-health.js';
import {deriveSystemReadiness, type RegisteredService, type SystemReadiness} from './system-readiness.js';
import type {ModelRegistry, ModelRouteRequest} from './model-registry.js';
import {qualifyModel} from './model-qualification.js';
import type {ModelConfig, ModelRoutingConfig, ProviderConfig} from './config.js';
import type {ParameterizedJobEngine} from './parameterized-job-engine.js';
import {nextSavedJobOccurrence} from './parameterized-job-registry.js';
import type {SavedJob} from './parameterized-job-types.js';
import {legacyAttribution, type IdentityControlPlane, type WorkAttribution} from './identity-control-plane.js';
import type {FastExecutionLedgerPort} from './fast-execution.js';
import {RuntimeObservability} from './runtime-observability.js';
import type {TokenAwareBatonRuntime, TokenRoutingProjection} from './token-aware-baton-routing.js';

export type ControlEventType =
  | 'system.snapshot'
  | 'lane.status_changed'
  | 'lane.priority_changed'
  | 'lane.mode_changed'
  | 'lane.task_changed'
  | 'lane.handoff'
  | 'lane.clone'
  | 'lane.reroute_requested'
  | 'ownership.human_takeover'
  | 'ownership.returned'
  | 'verification.changed'
  | 'provider.health_changed'
  | 'resource.node_changed'
  | 'system.paused_changed'
  | 'job.run_created'
  | 'job.run_cancelled'
  | 'job.run_retried'
  | 'job.run_approved'
  | 'job.schedule_changed'
  | 'job.run_changed'
  | 'job.saved_changed'
  | 'work.parcel_created'
  | 'work.parcel_changed'
  | 'configuration.changed'
  | 'token.telemetry'
  | 'token.governor_transition'
  | 'token.baton_created'
  | 'token.handoff_result'
  | 'failure';

export interface ControlEvent {id: number; at: string; type: ControlEventType; laneId?: number; actor?: string; payload: Record<string, unknown>;}
export type OperatorRole = 'observer' | 'operator';

export interface LaneProjection {
  id: number;
  name: string;
  mode: Mode;
  priority: number;
  status: LaneState['status'];
  task: string;
  model: string;
  reasoning: string;
  executionTarget?: string;
  elapsedMs: number;
  routeReason?: string;
  confidence?: number;
  lease: LaneState['lease'];
  ptys: Array<{id: string; command: string; cwd: string; recovery: string; owner: string; observers: number}>;
  sharedTaskIds: string[];
  baton: {revision: number; status: string; nextAction: string; ancestry: string[]; health: string; evidence: string[]; contextSourceIds: string[]};
  git?: LaneState['contract']['git'];
  verification: NonNullable<LaneState['verification']>;
  contextSources: Array<{id: string; type: string; url?: string; localRef?: string; description: string; classification: string; accessibility: string}>;
  lastMeaningfulActivity: string;
  warnings: string[];
}

export interface SystemProjection {
  schema: 'agent-control.system-status/v1';
  authority: 'AgentControlService';
  version: string;
  health: 'healthy' | 'degraded';
  paused: boolean;
  scheduler: {nextLaneId: number | null; waiting: number; active: number; paused: number};
  lanes: LaneProjection[];
  providers: Array<{id: string; name: string; kind: string; health: string; capabilities: string[]}>;
  resources: Array<{id: string; name: string; platform: string; transport: string; capabilities: string[]; health: 'unknown' | 'healthy' | 'degraded' | 'offline'; capacity?: number; active?: number; observedAt: string | null; node?: ManagedNodeSnapshot}>;
  outstandingApprovals: number;
  lastRestorePoint: string | null;
  observedAt: string;
  jobs: {total: number; enabled: number; queued: number; waiting: number; running: number; failed: number; succeeded: number; schedulesEnabled: number;};
  tokenAwareOutput: TokenAwareOutputMetrics;
  tokenBatonRouting: TokenRoutingProjection;
  harnessEfficiency: HarnessEfficiencyMetrics;
}

export class ControlEventBus {
  private nextId = 1;
  private readonly listeners = new Set<(event: ControlEvent) => void>();
  private readonly recentEvents: ControlEvent[] = [];
  emit(type: ControlEventType, payload: Record<string, unknown> = {}, laneId?: number, actor?: string) {
    const event: ControlEvent = {id: this.nextId++, at: new Date().toISOString(), type, laneId, actor, payload};
    this.recentEvents.push(event);
    if (this.recentEvents.length > 250) this.recentEvents.shift();
    appendEvent(`control.${type}`, {laneId, actor, payload});
    for (const listener of this.listeners) listener(event);
    return event;
  }
  subscribe(listener: (event: ControlEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  history(afterId = 0) { return this.recentEvents.filter(event => event.id > afterId); }
}

export class AgentControlService {
  readonly plane: ControlPlane;
  readonly verification: VerificationService;
  readonly events = new ControlEventBus();
  private readonly routeDecisions = new Map<number, RouteDecision>();
  private approvalCount: () => number = () => 0;
  private resourceRows: Array<Omit<SystemProjection['resources'][number], 'health' | 'capacity' | 'active' | 'observedAt' | 'node'>> = [];
  private serviceRows: RegisteredService[] = [];
  private contextStore?: ContextStore;
  private jobRuntime?: JobRuntime;
  private managedNodes?: ManagedNodeManager;
  private tokenAwareOutput?: TokenAwareOutputService;
  private harnessEfficiency?: HarnessEfficiencyLedgerPort;
  private workParcels?: WorkParcelCoordinator;
  private modelRegistry?: ModelRegistry;
  private parameterizedJobs?: ParameterizedJobEngine;
  private identity?: IdentityControlPlane;
  private defaultSessionId?: string;
  private fastExecution?: FastExecutionLedgerPort;
  private runtimeObservability?: RuntimeObservability;
  private tokenBatonRouting?: TokenAwareBatonRuntime;

  constructor(
    readonly state: WorkspaceState,
    readonly ptys: PtyRegistry,
    readonly providers?: ProviderRegistry,
    readonly version = AGENT_CONTROL_VERSION,
    private readonly persist: (state: WorkspaceState) => void = saveWorkspace,
  ) {
    this.plane = new ControlPlane(state);
    this.verification = new VerificationService(state, persist);
  }

  configureProjection(extras: {approvalCount?: () => number; resources?: Array<Omit<SystemProjection['resources'][number], 'health' | 'capacity' | 'active' | 'observedAt' | 'node'>>; services?: RegisteredService[]; contextStore?: ContextStore; jobRuntime?: JobRuntime; managedNodes?: ManagedNodeManager; tokenAwareOutput?: TokenAwareOutputService; tokenBatonRouting?: TokenAwareBatonRuntime; harnessEfficiency?: HarnessEfficiencyLedgerPort; workParcels?: WorkParcelCoordinator; modelRegistry?: ModelRegistry; parameterizedJobs?: ParameterizedJobEngine; identity?: IdentityControlPlane; defaultSessionId?: string; fastExecution?: FastExecutionLedgerPort; runtimeObservability?: RuntimeObservability}) {
    if (extras.approvalCount) this.approvalCount = extras.approvalCount;
    if (extras.resources) this.resourceRows = structuredClone(extras.resources);
    if (extras.services) this.serviceRows = structuredClone(extras.services);
    if (extras.contextStore) this.contextStore = extras.contextStore;
    if (extras.jobRuntime) this.jobRuntime = extras.jobRuntime;
    if (extras.managedNodes) this.managedNodes = extras.managedNodes;
    if (extras.tokenAwareOutput) this.tokenAwareOutput = extras.tokenAwareOutput;
    if (extras.tokenBatonRouting) this.tokenBatonRouting = extras.tokenBatonRouting;
    if (extras.harnessEfficiency) this.harnessEfficiency = extras.harnessEfficiency;
    if (extras.workParcels) this.workParcels = extras.workParcels;
    if (extras.modelRegistry) this.modelRegistry = extras.modelRegistry;
    if (extras.parameterizedJobs) this.parameterizedJobs = extras.parameterizedJobs;
    if (extras.identity) this.identity = extras.identity;
    if (extras.defaultSessionId) this.defaultSessionId = extras.defaultSessionId;
    if (extras.fastExecution) this.fastExecution = extras.fastExecution;
    if (extras.runtimeObservability) this.runtimeObservability = extras.runtimeObservability;
    return this;
  }

  snapshot(): SystemProjection {
    const lanes = this.state.lanes.map(lane => this.projectLane(lane));
    const providerRows = this.providers?.list().map(provider => ({id: provider.id, name: provider.name, kind: provider.kind, health: this.providers?.health(provider.id)?.health ?? 'unknown', capabilities: [...provider.capabilities]})) ?? [];
    const workers = new Map((this.jobRuntime?.workers.list() ?? []).map(worker => [worker.id, worker]));
    const resourceRows = this.resourceRows.map(resource => { const worker = workers.get(resource.id), node = this.managedNodes?.get(resource.id); return {...resource, capabilities: node?.capabilities ?? resource.capabilities, health: node?.health ?? worker?.health ?? 'unknown', capacity: worker?.capacity, active: worker?.active, observedAt: node?.lastProbeAt ?? worker?.observedAt ?? null, ...(node ? {node} : {})}; });
    const degraded = this.state.lanes.some(lane => lane.status === 'error') || providerRows.some(provider => provider.health === 'offline') || resourceRows.some(resource => ['degraded', 'offline'].includes(resource.health));
    const jobRuns = this.jobRuntime?.ledger.list() ?? [], jobDefinitions = this.jobRuntime?.catalog.listJobs() ?? [], schedules = this.jobRuntime?.catalog.listSchedules() ?? [], savedJobs = this.parameterizedJobs?.savedJobs.list() ?? [], parameterizedRuns = this.parameterizedJobs?.runs.list() ?? [];
    return {
      schema: 'agent-control.system-status/v1',
      authority: 'AgentControlService',
      version: this.version,
      health: degraded ? 'degraded' : 'healthy',
      paused: this.state.paused,
      scheduler: {nextLaneId: this.plane.chooseNextLane()?.id ?? null, waiting: lanes.filter(lane => lane.status === 'waiting').length, active: lanes.filter(lane => lane.status === 'working').length, paused: lanes.filter(lane => lane.status === 'paused').length},
      lanes,
      providers: providerRows,
      resources: structuredClone(resourceRows),
      outstandingApprovals: this.approvalCount(),
      lastRestorePoint: this.state.lastRestorePoint,
      observedAt: new Date().toISOString(),
      jobs: {total: jobDefinitions.length + savedJobs.length, enabled: jobDefinitions.filter(job => job.spec.enabled !== false).length + savedJobs.filter(job => job.enabled).length, queued: jobRuns.filter(run => run.status === 'QUEUED').length + parameterizedRuns.filter(run => run.status === 'QUEUED').length, waiting: jobRuns.filter(run => run.status === 'WAITING').length, running: jobRuns.filter(run => ['RUNNING', 'VERIFYING'].includes(run.status)).length + parameterizedRuns.filter(run => ['RESOLVING', 'RUNNING', 'VALIDATING'].includes(run.status)).length, failed: jobRuns.filter(run => ['FAILED', 'DEGRADED', 'DISCONNECTED'].includes(run.status)).length + parameterizedRuns.filter(run => ['FAILED', 'DEGRADED'].includes(run.status)).length, succeeded: jobRuns.filter(run => run.status === 'SUCCEEDED').length + parameterizedRuns.filter(run => ['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS'].includes(run.status)).length, schedulesEnabled: schedules.filter(schedule => this.jobRuntime?.ledger.schedule(schedule.metadata.id)?.enabled).length + savedJobs.filter(job => job.schedule?.enabled).length},
      tokenAwareOutput: this.commandOutputMetrics(),
      tokenBatonRouting: this.tokenRouting(),
      harnessEfficiency: this.harnessEfficiencyMetrics(),
    };
  }

  jobs() { return this.mustJobRuntime().jobsProjection(); }
  job(id: string) { const values = this.jobs().filter(job => job.metadata.id === id); if (!values.length) throw new Error('job_missing'); return values.sort((a, b) => b.metadata.version.localeCompare(a.metadata.version))[0]; }
  runs(jobId?: string) { return this.mustJobRuntime().ledger.list(jobId); }
  run(id: string) { const value = this.mustJobRuntime().ledger.get(id); if (!value) throw new Error('run_missing'); return value; }
  createJobRun(id: string, parameters: Record<string, unknown>, actor: string) { const job = this.job(id); const run = this.mustJobRuntime().createRun(`${job.metadata.id}@${job.metadata.version}`, parameters, {type: 'manual', actor}); this.events.emit('job.run_created', {runId: run.id, jobId: run.jobId, trigger: 'manual'}, undefined, actor); return run; }
  cancelJobRun(id: string, actor: string) { const run = this.mustJobRuntime().cancel(id, `cancelled_by:${actor}`); this.events.emit('job.run_cancelled', {runId: id}, undefined, actor); return run; }
  retryJobRun(id: string, actor: string) { const run = this.mustJobRuntime().retry(id); this.events.emit('job.run_retried', {sourceRunId: id, runId: run.id}, undefined, actor); return run; }
  approveJobRun(id: string, policy: string, actor: string) { if (!policy.trim()) throw new Error('approval_policy_required'); const run = this.mustJobRuntime().approve(id, policy); this.events.emit('job.run_approved', {runId: id, approval: policy}, undefined, actor); return run; }
  schedules() { return this.mustJobRuntime().catalog.listSchedules().map(schedule => ({...schedule, state: this.mustJobRuntime().ledger.schedule(schedule.metadata.id)})); }
  setScheduleEnabled(id: string, enabled: boolean, actor: string) { const state = this.mustJobRuntime().setScheduleEnabled(id, enabled); this.events.emit('job.schedule_changed', {scheduleId: id, enabled}, undefined, actor); return state; }
  jobQueue() { return this.mustJobRuntime().queueProjection(); }
  workers() { return this.mustJobRuntime().workers.list(); }
  nodes() { return this.managedNodes?.list() ?? []; }
  resourceLocks() { return this.mustJobRuntime().locks.list(); }
  artifacts(runId?: string) { return this.mustJobRuntime().artifacts.list(runId).map(value => { const {storageRef: _storageRef, ...metadata} = value; return {...metadata, storage: 'agent-control-managed'}; }); }
  artifact(id: string) { const value = this.mustJobRuntime().artifacts.get(id); if (!value) throw new Error('artifact_missing'); const {storageRef: _storageRef, ...metadata} = value; return {...metadata, storage: 'agent-control-managed'}; }
  commandOutputs() { return this.tokenAwareOutput?.list() ?? []; }
  commandOutputMetrics(): TokenAwareOutputMetrics { return this.tokenAwareOutput?.metrics() ?? {commandsObserved: 0, commandsCompacted: 0, rgSearchesCompacted: 0, originalOutputBytes: 0, returnedOutputBytes: 0, estimatedTokensOriginal: 0, estimatedTokensReturned: 0, estimatedTokensSaved: 0, contextTokensAvoided: 0, expansionRequests: 0, fullResultRequests: 0, expansionTokensReturned: 0, byJob: {}, byLane: {}, byAgentModel: {}}; }
  tokenRouting(): TokenRoutingProjection { return this.tokenBatonRouting?.projection() ?? {schema: 'agent-control.token-aware-baton-routing/v1', observedAt: new Date().toISOString(), policy: {prepareBatonPercent: 75, compactPercent: 85, handoffPercent: 90, sampleRetention: 240}, threads: [], parcels: [], decisions: []}; }
  harnessEfficiencyMetrics(): HarnessEfficiencyMetrics { return this.harnessEfficiency?.metrics() ?? new MemoryHarnessEfficiencyLedger().metrics(); }
  modelInvocations(options: {limit?: number; runId?: string; jobId?: string} = {}) {
    const limit = Math.min(1_000, Math.max(1, Number.isSafeInteger(options.limit) ? options.limit! : 200));
    const records = (this.harnessEfficiency?.list() ?? []).filter(record => (!options.runId || record.runId === options.runId) && (!options.jobId || record.jobId === options.jobId));
    return records.slice(-limit);
  }
  sessions() { return this.mustIdentity().listSessions(); }
  session(id: string) { return this.mustIdentity().session(id); }
  contextTransfers(sessionId?: string) { return this.mustIdentity().listContextTransfers(sessionId); }
  delegations(sessionId?: string) { return this.mustIdentity().listDelegations(sessionId); }
  executionProvenance() { return this.mustIdentity().listExecutions(); }
  executionChain(runId: string) { return {chain: this.mustIdentity().reconstruct(runId), aggregate: this.mustIdentity().aggregate(runId)}; }
  fastExecutionAttempts() { return this.fastExecution?.list() ?? []; }
  runtime() { return this.runtimeObservability?.snapshot() ?? new RuntimeObservability().snapshot(); }
  modelProviders() { return this.mustModelRegistry().providersList(); }
  models() { return this.mustModelRegistry().list().map(model => { const recent = (this.harnessEfficiency?.list() ?? []).filter(item => item.model === model.id && item.provider === model.provider).at(-1); return {...model, ...(recent ? {recentInvocation: {at: recent.completedAt ?? recent.startedAt, outcome: recent.finalJobResult, verifierResult: recent.verifierResult, latencyMs: recent.elapsedMs, inputTokens: recent.usage.inputTokens, outputTokens: recent.usage.outputTokens, cachedInputTokens: recent.usage.cachedInputTokens, totalTokens: recent.usage.totalProcessedTokens, providerReportedCost: recent.providerReportedCost, calculatedCost: recent.calculatedCost, currency: recent.currency}} : {})}; }); }
  jobDefinitions() { return this.mustParameterizedJobs().definitions.list(); }
  jobDefinition(id: string, version?: number) { return this.mustParameterizedJobs().definitions.get(id, version); }
  savedJobs() { return this.mustParameterizedJobs().savedJobs.list().map(job => ({...job, definitionResolved: this.mustParameterizedJobs().definitions.resolve(job), nextRun: nextSavedJobOccurrence(job, new Date())?.toISOString() ?? null, lastRun: this.mustParameterizedJobs().runs.list(job.id)[0] ?? null})); }
  savedJob(id: string) { return this.savedJobs().find(job => job.id === id) ?? (() => { throw new Error('saved_job_missing'); })(); }
  exportSavedJob(id: string) { return this.mustParameterizedJobs().savedJobs.export(id); }
  createSavedJob(input: Omit<SavedJob, 'schema' | 'revision' | 'createdAt' | 'updatedAt'>, actor: string) { const job = this.mustParameterizedJobs().savedJobs.create(input); this.events.emit('job.saved_changed', {savedJobId: job.id, action: 'created'}, undefined, actor); return job; }
  updateSavedJob(id: string, revision: number, changes: Partial<Omit<SavedJob, 'schema' | 'id' | 'revision' | 'createdAt'>>, actor: string) { const job = this.mustParameterizedJobs().savedJobs.update(id, revision, changes); this.events.emit('job.saved_changed', {savedJobId: id, action: 'updated', revision: job.revision}, undefined, actor); return job; }
  setSavedJobEnabled(id: string, enabled: boolean, revision: number, actor: string) { const job = this.mustParameterizedJobs().savedJobs.setEnabled(id, enabled, revision); this.events.emit('job.saved_changed', {savedJobId: id, action: enabled ? 'enabled' : 'disabled'}, undefined, actor); return job; }
  runSavedJob(id: string, actor: string) { const run = this.mustParameterizedJobs().runNow(id, actor); this.events.emit('job.run_created', {runId: run.id, savedJobId: id, trigger: 'manual'}, undefined, actor); return run; }
  parameterizedRuns(savedJobId?: string) { return this.mustParameterizedJobs().runs.list(savedJobId); }
  parameterizedRun(id: string) { const run = this.mustParameterizedJobs().runs.get(id); if (!run) throw new Error('job_run_missing'); return run; }
  cancelParameterizedRun(id: string, actor: string) { const run = this.mustParameterizedJobs().cancel(id, actor); this.events.emit('job.run_cancelled', {runId: id, savedJobId: run.savedJobId}, undefined, actor); return run; }
  parameterizedSchedules() { return this.savedJobs().filter(job => job.schedule).map(job => ({savedJobId: job.id, name: job.name, schedule: job.schedule, nextRun: job.nextRun, lastRun: job.lastRun})); }
  model(id: string) { const value = this.models().find(model => model.id === id); if (!value) throw new Error('model_missing'); return value; }
  modelRoutes() { return this.mustModelRegistry().routes(); }
  reloadModels(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig, actor: string) { this.mustModelRegistry().reload(providers, models, routing); this.events.emit('configuration.changed', {kind: 'model-registry', models: models.length, restartRequired: false}, undefined, actor); return {models: this.models(), routes: this.modelRoutes()}; }
  routeModel(request: ModelRouteRequest) { return this.mustModelRegistry().route(request); }
  qualifyModel(id: string, nodeId: string) { return qualifyModel({registry: this.mustModelRegistry(), modelId: id, nodeId}); }
  systems(): SystemReadiness[] { return [...deriveSystemReadiness({providers: this.providers, resources: this.resourceRows, services: this.serviceRows, managedNodes: this.managedNodes, workers: this.jobRuntime?.workers.list() ?? [], runs: this.jobRuntime?.ledger.list() ?? [], invocations: this.harnessEfficiency?.list() ?? []}), ...(this.runtimeObservability?.systems() ?? [])].sort((a,b)=>a.name.localeCompare(b.name)); }
  system(id: string) { const value = this.systems().find(item => item.id === id); if (!value) throw new Error('system_missing'); return value; }
  async checkSystem(id: string, actor: string) {
    if (this.managedNodes?.resource(id)) { const snapshot = await this.managedNodes.poll(id); this.events.emit('resource.node_changed', {resourceId: id, state: snapshot.state, health: snapshot.health, currentWorkload: snapshot.currentWorkload}, undefined, actor); return this.system(id); }
    const provider = this.providers?.get(id); if (provider) { const result = await probeProvider(provider); this.providers!.setHealth(id, result.health, result.detail, result.latencyMs); this.events.emit('provider.health_changed', {providerId: id, health: result.health, detail: result.detail, latencyMs: result.latencyMs}, undefined, actor); return this.system(id); }
    if (this.serviceRows.some(item => item.id === id)) throw new Error('system_check_unavailable');
    if (this.resourceRows.some(item => item.id === id)) throw new Error('system_check_unavailable');
    throw new Error('system_missing');
  }
  parcels() { return this.mustWorkParcels().list(); }
  parcel(id: string) { return this.mustWorkParcels().get(id); }
  async submitNaturalTask(prompt: string, actor: string) {
    let attribution: WorkAttribution;
    if (this.identity && this.defaultSessionId) {
      this.identity.authorize(this.defaultSessionId, actor, 'parcel.create');
      attribution = {schema: 'agent-control.work-attribution/v1', actorId: actor, sessionId: this.defaultSessionId, authority: this.identity.session(this.defaultSessionId).participants.find(value => value.actorId === actor)?.capabilities ?? [], createdAt: new Date().toISOString(), legacy: false};
    } else attribution = legacyAttribution(actor, `parcel-pending:${prompt}`);
    let parcel = this.mustWorkParcels().accept(prompt, actor, this.systems(), attribution);
    const finalAttribution: WorkAttribution = {...attribution, parcelId: parcel.id}; parcel.attribution = finalAttribution; parcel = this.mustWorkParcels().store.update(parcel);
    this.events.emit('work.parcel_created', {parcelId: parcel.id, status: parcel.status, actorId: finalAttribution.actorId, sessionId: finalAttribution.sessionId}, undefined, actor); return parcel;
  }
  cancelParcel(id: string, actor: string) { const parcel = this.mustWorkParcels().cancel(id, actor); this.events.emit('work.parcel_changed', {parcelId: id, status: parcel.status}, undefined, actor); return parcel; }
  expandCommandOutput(handle: string, request: OutputExpansionRequest, scope: OutputAuthorityScope) { return this.mustTokenAwareOutput().expand(handle, request, scope); }

  lane(id: number) { return this.projectLane(this.mustLane(id)); }
  latestRoute(id: number) { return this.routeDecisions.get(id) ?? this.mustLane(id).routing; }
  allRoutes() { return this.state.lanes.flatMap(lane => { const decision = this.latestRoute(lane.id); return decision ? [{laneId: lane.id, decision}] : []; }); }
  recordRoute(id: number, decision: RouteDecision) { const lane = this.mustLane(id); this.routeDecisions.set(id, decision); lane.routing = structuredClone(decision); this.persist(this.state); this.events.emit('lane.reroute_requested', {selected: decision.selected.id, rationale: decision.rationale}, id, 'router'); return decision; }

  setVerificationPolicy(id: number, policy: VerificationPolicy, actor: string) { const value = this.verification.setPolicy(id, policy); this.events.emit('verification.changed', {phase: value.phase, required: value.policy.required}, id, actor); return value; }
  recordClaim(id: number, claim: string, actor: string) { const value = this.verification.claim(id, claim); this.events.emit('verification.changed', {phase: value.phase, claimRecorded: true}, id, actor); return value; }
  addVerificationEvidence(id: number, input: Omit<VerificationEvidence, 'id' | 'createdAt'> & {id?: string; createdAt?: string}, actor: string) { const value = this.verification.addEvidence(id, input); this.events.emit('verification.changed', {phase: this.mustLane(id).verification?.phase, evidenceId: value.id, evidenceType: value.type, status: value.status}, id, actor); return value; }
  verifyClaim(id: number, actor: string) { const value = this.verification.verify(id); this.events.emit('verification.changed', {phase: value.verification.phase, ok: value.ok, reasons: value.reasons}, id, actor); return value; }
  acceptVerifiedClaim(id: number, actor: string) { const value = this.verification.accept(id, actor); this.events.emit('verification.changed', {phase: value.phase, acceptedBy: actor}, id, actor); return value; }

  pauseLane(id: number, actor: string) {
    const lane = this.mustLane(id);
    lane.status = 'paused';
    touchBaton(lane, {status: `Paused by ${actor}`, nextAction: 'Await explicit resume'});
    this.persist(this.state);
    this.events.emit('lane.status_changed', {status: lane.status}, id, actor);
    return this.lane(id);
  }

  resumeLane(id: number, actor: string) {
    const lane = this.mustLane(id);
    if (this.state.paused) throw new Error('system_paused');
    const humanOwned = this.ptySessions(lane).some(session => session.owner.startsWith('human'));
    if (humanOwned) throw new Error('human_owns_pty');
    lane.status = lane.contract.goal === 'Await task' ? 'idle' : 'waiting';
    touchBaton(lane, {status: `Resume requested by ${actor}`, nextAction: 'Scheduler revalidates lease and execution'});
    this.persist(this.state);
    this.events.emit('lane.status_changed', {status: lane.status}, id, actor);
    return this.lane(id);
  }

  setPriority(id: number, priority: number, actor: string) {
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new Error('priority_out_of_range');
    const lane = this.mustLane(id), previous = lane.contract.priority;
    lane.contract.priority = priority;
    lane.contract.updatedAt = new Date().toISOString();
    this.persist(this.state);
    this.events.emit('lane.priority_changed', {previous, priority}, id, actor);
    return this.lane(id);
  }

  setMode(id: number, mode: Mode, actor: string) {
    if (!['auto', 'manual'].includes(mode)) throw new Error('invalid_lane_mode');
    const lane = this.mustLane(id), previous = lane.contract.mode;
    lane.contract.mode = mode;
    lane.contract.updatedAt = new Date().toISOString();
    this.persist(this.state);
    this.events.emit('lane.mode_changed', {previous, mode}, id, actor);
    return this.lane(id);
  }

  submitTask(id: number, goal: string, actor: string) {
    if (!goal.trim()) throw new Error('task_goal_required');
    const lane = this.mustLane(id);
    lane.contract.goal = goal.trim();
    lane.contract.updatedAt = new Date().toISOString();
    lane.status = 'waiting';
    lane.lines.push(`> ${goal.trim()}`);
    touchBaton(lane, {status: 'Task accepted; capability resolution pending', nextAction: 'Resolve capabilities and acquire resource leases'});
    this.persist(this.state);
    this.events.emit('lane.task_changed', {goal: lane.contract.goal}, id, actor);
    return this.lane(id);
  }

  requestReroute(id: number, actor: string, reason: string, confidence = .8): SelfRouteRequest {
    const lane = this.mustLane(id), request = requestSelfRoute(id, 'substitute', reason, confidence);
    touchBaton(lane, {status: 'SUBSTITUTE requested', nextAction: 'Router must qualify and select a replacement'});
    this.persist(this.state);
    this.events.emit('lane.reroute_requested', {reason: request.reason, confidence: request.confidence, requiresApproval: request.requiresApproval}, id, actor);
    return request;
  }

  handoff(fromId: number, toId: number, holder: string, actor: string) {
    this.plane.handoff(fromId, toId, holder);
    this.events.emit('lane.handoff', {fromId, toId, holder}, toId, actor);
    return this.lane(toId);
  }

  clone(fromId: number, toId: number, holder: string, actor: string) {
    this.plane.clone(fromId, toId, holder);
    this.events.emit('lane.clone', {fromId, toId, holder}, toId, actor);
    return this.lane(toId);
  }

  cancelLane(id: number, actor: string) {
    const lane = this.mustLane(id);
    lane.status = 'cancelled';
    touchBaton(lane, {status: `Cancellation requested by ${actor}`, nextAction: 'Execution provider confirms cancellation; retain evidence'});
    this.persist(this.state);
    this.events.emit('lane.status_changed', {status: lane.status, executionCancellation: 'requested'}, id, actor);
    return this.lane(id);
  }

  humanTakeover(id: number, actor: string) {
    const lane = this.mustLane(id), sessions = this.ptys.list().filter(session => session.laneId === String(id));
    for (const session of sessions) this.ptys.humanTakeover(session.id, `human:${actor}`);
    lane.status = 'paused';
    touchBaton(lane, {status: `Human takeover by ${actor}`, nextAction: 'Human explicitly returns ownership'});
    this.persist(this.state);
    this.events.emit('ownership.human_takeover', {sessionIds: sessions.map(session => session.id)}, id, actor);
    return this.lane(id);
  }

  returnOwnership(id: number, actor: string, agentId: string) {
    if (!agentId.trim()) throw new Error('agent_id_required');
    const lane = this.mustLane(id), sessions = this.ptys.list().filter(session => session.laneId === String(id));
    for (const session of sessions) {
      const owner = this.ptys.attached(session.id).find(item => item.access === 'own');
      if (!owner?.actorId.startsWith('human:')) throw new Error('human_takeover_not_active');
      this.ptys.transferControl(session.id, owner.actorId, agentId);
    }
    lane.status = 'waiting';
    touchBaton(lane, {status: `Ownership returned by ${actor}`, nextAction: 'Scheduler revalidates lease before execution'});
    this.persist(this.state);
    this.events.emit('ownership.returned', {sessionIds: sessions.map(session => session.id), agentId}, id, actor);
    return this.lane(id);
  }

  setSystemPaused(paused: boolean, actor: string) {
    if (paused && !this.state.paused) for (const lane of this.state.lanes) { lane.statusBeforeSystemPause = lane.status; lane.status = 'paused'; }
    if (!paused && this.state.paused) for (const lane of this.state.lanes) {
      const humanOwnsPty = this.ptys.list().filter(session => session.laneId === String(lane.id)).some(session => this.ptys.attached(session.id).some(attachment => attachment.access === 'own' && attachment.actorId.startsWith('human:')));
      if (!['cancelled', 'error'].includes(lane.status)) lane.status = humanOwnsPty ? 'paused' : lane.statusBeforeSystemPause ?? 'paused';
      lane.statusBeforeSystemPause = undefined;
    }
    this.state.paused = paused;
    checkpoint(this.state, paused ? 'pause-all' : 'resume-all');
    this.events.emit('system.paused_changed', {paused}, undefined, actor);
    return this.snapshot();
  }

  private projectLane(lane: LaneState): LaneProjection {
    const route = this.routeDecisions.get(lane.id) ?? lane.routing, health = batonHealth(lane.baton);
    const contextSources = (lane.baton.contextSourceIds ?? []).map(id => this.contextStore?.getSource(id)).filter((source): source is NonNullable<typeof source> => Boolean(source)).map(source => ({id: source.id, type: source.type, url: source.url, localRef: source.localRef, description: source.description, classification: source.classification, accessibility: source.accessibility}));
    const executionTarget = lane.contract.resourceLocks?.host ?? lane.contract.resourceLocks?.provider ?? lane.contract.resourceLocks?.model ?? undefined;
    const elapsedMs = lane.status === 'working' && lane.lease.acquiredAt ? Math.max(0, Date.now() - Date.parse(lane.lease.acquiredAt)) : 0;
    return {
      id: lane.id, name: lane.name, mode: lane.contract.mode, priority: lane.contract.priority, status: lane.status, task: lane.contract.goal,
      model: lane.model, reasoning: lane.reasoning, executionTarget, elapsedMs, routeReason: route?.rationale.map(item => item.detail).join('; '),
      lease: {...lane.lease}, ptys: this.ptySessions(lane), sharedTaskIds: [...lane.contract.sharedTaskIds],
      baton: {revision: lane.baton.revision, status: lane.baton.status, nextAction: lane.baton.nextAction, ancestry: lane.baton.progress.filter(item => /handoff|clone/i.test(item)), health: health.label, evidence: [...lane.baton.evidence], contextSourceIds: [...(lane.baton.contextSourceIds ?? [])]},
      git: lane.contract.git ? {...lane.contract.git, dirtyFiles: [...(lane.contract.git.dirtyFiles ?? [])]} : undefined,
      verification: structuredClone(lane.verification ?? {phase: 'unclaimed', policy: {required: []}, evidence: [], failureReasons: []}),
      contextSources,
      lastMeaningfulActivity: lane.baton.updatedAt,
      warnings: [lane.lease.holder && Date.parse(lane.lease.expiresAt ?? '') <= Date.now() ? 'lease_expired' : '', health.label === 'STALE' ? 'baton_stale' : ''].filter(Boolean),
    };
  }

  private ptySessions(lane: LaneState) {
    return this.ptys.list().filter(session => session.laneId === String(lane.id)).map(session => {
      const attachments = this.ptys.attached(session.id);
      return {id: session.id, command: session.command, cwd: session.cwd, recovery: session.recovery, owner: attachments.find(item => item.access === 'own')?.actorId ?? 'unowned', observers: attachments.filter(item => item.access === 'observe').length};
    });
  }
  private mustLane(id: number) { const lane = this.state.lanes.find(item => item.id === id); if (!lane) throw new Error('lane_missing'); return lane; }
  private mustJobRuntime() { if (!this.jobRuntime) throw new Error('job_runtime_unconfigured'); return this.jobRuntime; }
  private mustTokenAwareOutput() { if (!this.tokenAwareOutput) throw new Error('token_aware_output_unconfigured'); return this.tokenAwareOutput; }
  private mustWorkParcels() { if (!this.workParcels) throw new Error('work_parcels_unconfigured'); return this.workParcels; }
  private mustModelRegistry() { if (!this.modelRegistry) throw new Error('model_registry_unconfigured'); return this.modelRegistry; }
  private mustIdentity() { if (!this.identity) throw new Error('identity_control_plane_unconfigured'); return this.identity; }
  private mustParameterizedJobs() { if (!this.parameterizedJobs) throw new Error('parameterized_jobs_unconfigured'); return this.parameterizedJobs; }
}
