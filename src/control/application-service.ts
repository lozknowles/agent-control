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
import {qualifyAccountProfile} from './account-profile-qualification.js';
import type {CodexNodeExecutionPort} from './codex-node-execution.js';
import type {ModelConfig, ModelRoutingConfig, ProviderConfig} from './config.js';
import type {ParameterizedJobEngine} from './parameterized-job-engine.js';
import {nextSavedJobOccurrence} from './parameterized-job-registry.js';
import type {SavedJob} from './parameterized-job-types.js';
import {legacyAttribution, type IdentityControlPlane, type WorkAttribution} from './identity-control-plane.js';
import type {FastExecutionLedgerPort} from './fast-execution.js';
import {RuntimeObservability} from './runtime-observability.js';
import type {TokenAwareBatonRuntime, TokenRoutingProjection} from './token-aware-baton-routing.js';
import type {GovernedRetrievalRuntime, RetrievalProjection} from './governed-retrieval.js';
import {projectLaneHistory, projectParameterizedRunHistory, type ExecutionHistoryEntry} from './execution-history.js';
import type {CapabilityCandidateClassification, CapabilityCandidateState, CapabilityIntelligenceStore} from './capability-intelligence.js';
import type {FrozenQualificationSuite, ModelIntelligenceLedger} from './model-intelligence.js';
import {projectDashboardCharacterCrew, type DashboardCharacterCrewProjection} from './dashboard-characters.js';
import {providerCatalogEventNarrative, type CatalogEvidenceAdjudicationInput, type ProviderCatalogRuntime} from './provider-catalog.js';
import {redactSensitiveValue} from './security-redaction.js';
import type {AdaptiveLeagueFilter, AdaptiveOrchestrationRuntime} from './adaptive-orchestration.js';
import type {ExecutionSessionMode, ExecutionSessionRuntime, ExecutionSessionSignal} from './execution-session.js';
import type {PoeBenchmarkProposalInput, PoeEvidenceResult, PoeObjectReference, PoeProjection, PoeRuntime} from './poe.js';
import type {CacheAwareExpertRuntime} from './cache-aware-expert.js';
import type {SkillLearningRuntime} from './skill-learning.js';
import type {EnergyTelemetryRuntime} from './energy-telemetry.js';
import type {DeterministicSkillRuntime} from './deterministic-skill.js';

export type ControlEventType =
  | 'social.activity'
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
  | 'provider.catalog_changed'
  | 'resource.node_changed'
  | 'system.paused_changed'
  | 'job.run_created'
  | 'job.run_cancelled'
  | 'job.run_authentication_resumed'
  | 'job.run_retried'
  | 'job.run_approved'
  | 'job.schedule_changed'
  | 'job.run_changed'
  | 'job.saved_changed'
  | 'work.parcel_created'
  | 'work.parcel_changed'
  | 'capability.intelligence_changed'
  | 'model.intelligence_changed'
  | 'provider.catalog_changed'
  | 'runtime.safety_changed'
  | 'cache.expert_invalidated'
  | 'skill.learning_changed'
  | 'energy.telemetry'
  | 'energy.routing_decision'
  | 'configuration.changed'
  | 'token.telemetry'
  | 'token.governor_transition'
  | 'token.context_lifecycle'
  | 'token.baton_created'
  | 'token.handoff_result'
  | 'retrieval.started'
  | 'retrieval.provider_selected'
  | 'retrieval.escalated'
  | 'retrieval.evidence'
  | 'retrieval.context_compiled'
  | 'retrieval.rehydrated'
  | 'retrieval.invalidated'
  | 'retrieval.fallback'
  | 'retrieval.failed'
  | 'execution.session_changed'
  | 'execution.session_output'
  | 'poe.conversation_changed'
  | 'poe.proposal_changed'
  | 'poe.speech_changed'
  | 'poe.interrupted'
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
  history: ExecutionHistoryEntry[];
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
  jobs: {total: number; enabled: number; queued: number; waiting: number; authenticationBlocked: number; reconnecting: number; cancelling: number; cleanupUncertain: number; disconnected: number; running: number; failed: number; succeeded: number; schedulesEnabled: number;};
  tokenAwareOutput: TokenAwareOutputMetrics;
  tokenBatonRouting: TokenRoutingProjection;
  retrieval: RetrievalProjection;
  harnessEfficiency: HarnessEfficiencyMetrics;
  characterCrew: DashboardCharacterCrewProjection;
  poe: Pick<PoeProjection, 'schema' | 'identity' | 'state' | 'voice' | 'observedAt'> | null;
  executionSessions: Array<{id: string; incarnation: string; state: string; adapterId: string; scope: {runId: string; jobId: string; jobVersion: string; stepId: string; workerId: string; nodeId: string; parcelId?: string; laneId?: string; crewRole?: string; providerId?: string; accountLabel?: string; modelId?: string}; command: string; cwd: string; pid?: number; capabilities: import('./execution-session.js').ExecutionSessionCapabilities; control: {owner: 'agent' | 'human'; actorId: string; generation: number; reconciliationRequired: boolean}; activeAttachments: Array<{id: string; actorId: string; mode: ExecutionSessionMode; attachedAt: string}>; createdAt: string; startedAt: string; updatedAt: string; endedAt?: string; exitCode?: number | null; exitSignal?: string | null; outputBytes: number; outputTruncated: boolean; lastOutputAt?: string; lastError?: string}>;
}

export class ControlEventBus {
  private nextId = 1;
  private readonly listeners = new Set<(event: ControlEvent) => void>();
  private readonly recentEvents: ControlEvent[] = [];
  emit(type: ControlEventType, payload: Record<string, unknown> = {}, laneId?: number, actor?: string) {
    const event: ControlEvent = {id: this.nextId++, at: new Date().toISOString(), type, laneId, actor, payload: redactSensitiveValue(payload)};
    this.recentEvents.push(event);
    if (this.recentEvents.length > 250) this.recentEvents.shift();
    appendEvent(`control.${type}`, {laneId, actor, payload: event.payload});
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
  private governedRetrieval?: GovernedRetrievalRuntime;
  private codexNodeExecution?: CodexNodeExecutionPort;
  private capabilityIntelligence?: CapabilityIntelligenceStore;
  private modelIntelligence?: ModelIntelligenceLedger;
  private qualificationSuite?: FrozenQualificationSuite;
  private providerCatalog?: ProviderCatalogRuntime;
  private adaptiveOrchestration?: AdaptiveOrchestrationRuntime;
  private executionSessions?: ExecutionSessionRuntime;
  private poe?: PoeRuntime;
  private cacheExperts?: CacheAwareExpertRuntime;
  private learnedSkills?: SkillLearningRuntime;
  private energyTelemetry?: EnergyTelemetryRuntime;
  private deterministicSkills?: DeterministicSkillRuntime;

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

  configureProjection(extras: {approvalCount?: () => number; resources?: Array<Omit<SystemProjection['resources'][number], 'health' | 'capacity' | 'active' | 'observedAt' | 'node'>>; services?: RegisteredService[]; contextStore?: ContextStore; jobRuntime?: JobRuntime; managedNodes?: ManagedNodeManager; tokenAwareOutput?: TokenAwareOutputService; tokenBatonRouting?: TokenAwareBatonRuntime; governedRetrieval?: GovernedRetrievalRuntime; codexNodeExecution?: CodexNodeExecutionPort; harnessEfficiency?: HarnessEfficiencyLedgerPort; workParcels?: WorkParcelCoordinator; modelRegistry?: ModelRegistry; parameterizedJobs?: ParameterizedJobEngine; identity?: IdentityControlPlane; defaultSessionId?: string; fastExecution?: FastExecutionLedgerPort; runtimeObservability?: RuntimeObservability; capabilityIntelligence?: CapabilityIntelligenceStore; modelIntelligence?: ModelIntelligenceLedger; qualificationSuite?: FrozenQualificationSuite; providerCatalog?: ProviderCatalogRuntime; adaptiveOrchestration?: AdaptiveOrchestrationRuntime; executionSessions?: ExecutionSessionRuntime; poe?: PoeRuntime; cacheExperts?: CacheAwareExpertRuntime; learnedSkills?: SkillLearningRuntime; deterministicSkills?:DeterministicSkillRuntime; energyTelemetry?: EnergyTelemetryRuntime}) {
    if (extras.approvalCount) this.approvalCount = extras.approvalCount;
    if (extras.resources) this.resourceRows = structuredClone(extras.resources);
    if (extras.services) this.serviceRows = structuredClone(extras.services);
    if (extras.contextStore) this.contextStore = extras.contextStore;
    if (extras.jobRuntime) this.jobRuntime = extras.jobRuntime;
    if (extras.managedNodes) this.managedNodes = extras.managedNodes;
    if (extras.tokenAwareOutput) this.tokenAwareOutput = extras.tokenAwareOutput;
    if (extras.tokenBatonRouting) this.tokenBatonRouting = extras.tokenBatonRouting;
    if (extras.governedRetrieval) this.governedRetrieval = extras.governedRetrieval;
    if (extras.codexNodeExecution) this.codexNodeExecution = extras.codexNodeExecution;
    if (extras.harnessEfficiency) this.harnessEfficiency = extras.harnessEfficiency;
    if (extras.workParcels) this.workParcels = extras.workParcels;
    if (extras.modelRegistry) this.modelRegistry = extras.modelRegistry;
    if (extras.parameterizedJobs) this.parameterizedJobs = extras.parameterizedJobs;
    if (extras.identity) this.identity = extras.identity;
    if (extras.defaultSessionId) this.defaultSessionId = extras.defaultSessionId;
    if (extras.fastExecution) this.fastExecution = extras.fastExecution;
    if (extras.runtimeObservability) this.runtimeObservability = extras.runtimeObservability;
    if (extras.capabilityIntelligence) this.capabilityIntelligence = extras.capabilityIntelligence;
    if (extras.modelIntelligence) this.modelIntelligence = extras.modelIntelligence;
    if (extras.qualificationSuite) this.qualificationSuite = structuredClone(extras.qualificationSuite);
    if (extras.providerCatalog) this.providerCatalog = extras.providerCatalog;
    if (extras.adaptiveOrchestration) this.adaptiveOrchestration = extras.adaptiveOrchestration;
    if (extras.executionSessions) this.executionSessions = extras.executionSessions;
    if (extras.poe) this.poe = extras.poe;
    if (extras.cacheExperts) this.cacheExperts = extras.cacheExperts;
    if (extras.learnedSkills) this.learnedSkills = extras.learnedSkills;
    if (extras.energyTelemetry) this.energyTelemetry = extras.energyTelemetry;
    if (extras.deterministicSkills) this.deterministicSkills=extras.deterministicSkills;
    return this;
  }

  snapshot(): SystemProjection {
    const observedAt = new Date().toISOString();
    const lanes = this.state.lanes.map(lane => this.projectLane(lane));
    const providerRows = this.providers?.list().map(provider => ({id: provider.id, name: provider.name, kind: provider.kind, health: this.providers?.health(provider.id)?.health ?? 'unknown', capabilities: [...provider.capabilities]})) ?? [];
    const workers = new Map((this.jobRuntime?.workers.list() ?? []).map(worker => [worker.id, worker]));
    const resourceRows = this.resourceRows.map(resource => { const worker = workers.get(resource.id), node = this.managedNodes?.get(resource.id); return {...resource, capabilities: node?.capabilities ?? resource.capabilities, health: node?.health ?? worker?.health ?? 'unknown', capacity: worker?.capacity, active: worker?.active, observedAt: node?.lastProbeAt ?? worker?.observedAt ?? null, ...(node ? {node} : {})}; });
    const degraded = this.state.lanes.some(lane => lane.status === 'error') || providerRows.some(provider => provider.health === 'offline') || resourceRows.some(resource => ['degraded', 'offline'].includes(resource.health));
    const jobRuns = this.jobRuntime?.ledger.list() ?? [], jobDefinitions = this.jobRuntime?.catalog.listJobs() ?? [], schedules = this.jobRuntime?.catalog.listSchedules() ?? [], savedJobs = this.parameterizedJobs?.savedJobs.list() ?? [], parameterizedRuns = this.parameterizedJobs?.runs.list() ?? [];
    const outstandingApprovals = this.approvalCount(), tokenBatonRouting = this.tokenRouting(), systems = this.systems();
    const models = this.modelRegistry?.list().map(model => ({id: model.id, provider: model.provider, enabled: model.enabled, qualificationState: model.qualification.state, accountAvailability: model.account?.availability, checkedAt: model.qualification.checkedAt})) ?? [];
    const modelBatches = this.modelIntelligence?.projection(observedAt).queue ?? [];
    const characterCrew = projectDashboardCharacterCrew({observedAt, paused: this.state.paused, lanes, runs: jobRuns, parameterizedRuns, parcels: this.workParcels?.list() ?? [], systems, models, modelBatches, tokenRouting: tokenBatonRouting, events: this.events.history(), outstandingApprovals});
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
      outstandingApprovals,
      lastRestorePoint: this.state.lastRestorePoint,
      observedAt,
      jobs: {
        total: jobDefinitions.length + savedJobs.length,
        enabled: jobDefinitions.filter(job => job.spec.enabled !== false).length + savedJobs.filter(job => job.enabled).length,
        queued: jobRuns.filter(run => run.status === 'QUEUED').length + parameterizedRuns.filter(run => run.status === 'QUEUED').length,
        waiting: jobRuns.filter(run => run.status === 'WAITING').length,
        authenticationBlocked: jobRuns.filter(run => run.status === 'AUTHENTICATION_BLOCKED').length + parameterizedRuns.filter(run => run.status === 'AUTHENTICATION_BLOCKED').length,
        reconnecting: jobRuns.filter(run => run.status === 'RECONNECTING').length + parameterizedRuns.filter(run => run.status === 'RECONNECTING').length,
        cancelling: jobRuns.filter(run => run.status === 'CANCELLING').length + parameterizedRuns.filter(run => run.status === 'CANCELLING').length,
        cleanupUncertain: jobRuns.filter(run => run.status === 'CLEANUP_UNCERTAIN').length,
        disconnected: jobRuns.filter(run => run.status === 'DISCONNECTED').length + parameterizedRuns.filter(run => run.status === 'DISCONNECTED').length,
        running: jobRuns.filter(run => ['RUNNING', 'VERIFYING'].includes(run.status)).length + parameterizedRuns.filter(run => ['RESOLVING', 'RUNNING', 'VALIDATING'].includes(run.status)).length,
        failed: jobRuns.filter(run => ['FAILED', 'DEGRADED'].includes(run.status)).length + parameterizedRuns.filter(run => ['FAILED', 'DEGRADED'].includes(run.status)).length,
        succeeded: jobRuns.filter(run => run.status === 'SUCCEEDED').length + parameterizedRuns.filter(run => ['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS'].includes(run.status)).length,
        schedulesEnabled: schedules.filter(schedule => this.jobRuntime?.ledger.schedule(schedule.metadata.id)?.enabled).length + savedJobs.filter(job => job.schedule?.enabled).length,
      },
      tokenAwareOutput: this.commandOutputMetrics(),
      tokenBatonRouting,
      retrieval: this.retrievalProjection(),
      harnessEfficiency: this.harnessEfficiencyMetrics(),
      characterCrew,
      poe: this.poe ? (({schema,identity,state,voice,observedAt})=>({schema,identity,state,voice,observedAt}))(this.poe.projection()) : null,
      executionSessions: this.executionSessionProjection(),
    };
  }

  jobs() { return this.mustJobRuntime().jobsProjection(); }
  job(id: string) { const values = this.jobs().filter(job => job.metadata.id === id); if (!values.length) throw new Error('job_missing'); return values.sort((a, b) => b.metadata.version.localeCompare(a.metadata.version))[0]; }
  runs(jobId?: string) { return this.mustJobRuntime().ledger.list(jobId); }
  run(id: string) { const value = this.mustJobRuntime().ledger.get(id); if (!value) throw new Error('run_missing'); return value; }
  createJobRun(id: string, parameters: Record<string, unknown>, actor: string, requestKey?: string) { const job = this.job(id); const run = this.mustJobRuntime().createRun(`${job.metadata.id}@${job.metadata.version}`, parameters, {type: 'manual', actor}, undefined, requestKey); this.events.emit('job.run_created', {runId: run.id, jobId: run.jobId, trigger: 'manual'}, undefined, actor); return run; }
  cancelJobRun(id: string, actor: string) { const run = this.mustJobRuntime().cancel(id, `cancelled_by:${actor}`); this.events.emit('job.run_cancelled', {runId: id}, undefined, actor); return run; }
  retryJobRun(id: string, actor: string) { const run = this.mustJobRuntime().retry(id); this.events.emit('job.run_retried', {sourceRunId: id, runId: run.id}, undefined, actor); return run; }
  approveJobRun(id: string, policy: string, actor: string) { if (!policy.trim()) throw new Error('approval_policy_required'); const run = this.mustJobRuntime().approve(id, policy, actor); this.events.emit('job.run_approved', {runId: id, approval: policy}, undefined, actor); return run; }
  schedules() { return this.mustJobRuntime().catalog.listSchedules().map(schedule => ({...schedule, state: this.mustJobRuntime().ledger.schedule(schedule.metadata.id)})); }
  setScheduleEnabled(id: string, enabled: boolean, actor: string) { const state = this.mustJobRuntime().setScheduleEnabled(id, enabled); this.events.emit('job.schedule_changed', {scheduleId: id, enabled}, undefined, actor); return state; }
  jobQueue() { return this.mustJobRuntime().queueProjection(); }
  workers() { return this.mustJobRuntime().workers.list(); }
  executionSessionProjection() { return (this.executionSessions?.list() ?? []).map(session => ({id: session.id, incarnation: session.incarnation, state: session.state, adapterId: session.adapterId, scope: structuredClone(session.scope), command: session.command, cwd: session.cwd, ...(session.pid === undefined ? {} : {pid: session.pid}), capabilities: structuredClone(session.capabilities), control: structuredClone(session.control), activeAttachments: session.attachments.filter(item => !item.detachedAt).map(item => ({id: item.id, actorId: item.actorId, mode: item.mode, attachedAt: item.attachedAt})), createdAt: session.createdAt, startedAt: session.startedAt, updatedAt: session.updatedAt, ...(session.endedAt ? {endedAt: session.endedAt} : {}), ...(session.exitCode === undefined ? {} : {exitCode: session.exitCode}), ...(session.exitSignal === undefined ? {} : {exitSignal: session.exitSignal}), outputBytes: session.outputBytes, outputTruncated: session.outputTruncated, ...(session.lastOutputAt ? {lastOutputAt: session.lastOutputAt} : {}), ...(session.lastError ? {lastError: session.lastError} : {})})); }
  poeRegression(){return this.mustPoe().regression();}
  poeKnowledge(){return this.mustPoe().knowledge();}
  poeKnowledgeSource(id:string){return this.mustPoe().knowledgeSource(id);}
  greetPoe(id:string,actor:string){return this.mustPoe().greeting(id,actor);}
  poeOperator(id:string,actor:string) {return this.mustPoe().operatorProjection(id,actor);}
  approvePoeOperator(id:string,proposalId:string,hash:string,actor:string) {return this.mustPoe().approveOperator(id,proposalId,hash,actor);}
  speakPoe(id:string,turnId:string,actor:string) {return this.mustPoe().speechForTurn(id,turnId,actor);}
  transcribePoe(id:string,bytes:Uint8Array,mime:string,actor:string) {return this.mustPoe().transcribeTurn(id,bytes,mime,actor);}
  poeProjection() { const projection=this.mustPoe().projection(); projection.conversations=projection.conversations.filter(item=>item.actorId==='web-operator'&&item.channel==='dashboard'); const ids=new Set(projection.conversations.map(item=>item.id)); projection.proposals=projection.proposals.filter(item=>ids.has(item.conversationId)); projection.activeConversationId=projection.conversations[0]?.id??null; return projection; }
  createPoeConversation(channel: 'dashboard'|'whatsapp'|'voice'|'mobile', actor: string) { return this.mustPoe().createConversation({actorId: actor, channel}); }
  poeConversation(id: string) { const conversation=this.mustPoe().conversation(id); if(conversation.actorId!=='web-operator'||conversation.channel!=='dashboard')throw new Error('poe_conversation_actor_mismatch'); return conversation; }
  async askPoe(id: string, text: string, actor: string, reference?: PoeObjectReference) { const conversation=this.mustPoe().conversation(id); if(conversation.actorId!==actor)throw new Error('poe_conversation_actor_mismatch'); return this.mustPoe().ask({conversationId:id,text,channel:conversation.channel,reference}); }
  proposePoeBenchmark(id: string, input: PoeBenchmarkProposalInput, actor: string) { const conversation=this.mustPoe().conversation(id); if(conversation.actorId!==actor)throw new Error('poe_conversation_actor_mismatch'); return this.mustPoe().proposeBenchmark(id,input); }
  revisePoeBenchmark(id: string, revision: number, changes: Partial<PoeBenchmarkProposalInput>, actor: string) { const current=this.mustPoe().proposal(id);if(this.mustPoe().conversation(current.conversationId).actorId!==actor)throw new Error('poe_conversation_actor_mismatch');return this.mustPoe().reviseBenchmark(id,revision,changes); }
  freezePoeBenchmark(id: string, revision: number, actor: string) { const current=this.mustPoe().proposal(id);if(this.mustPoe().conversation(current.conversationId).actorId!==actor)throw new Error('poe_conversation_actor_mismatch');return this.mustPoe().freezeBenchmark(id,revision); }
  approvePoeBenchmark(id: string, revision: number, frozenSha256: string, actor: string) { const current=this.mustPoe().proposal(id);if(this.mustPoe().conversation(current.conversationId).actorId!==actor)throw new Error('poe_conversation_actor_mismatch');return this.mustPoe().approveBenchmark(id,{revision,frozenSha256,actor}); }
  interruptPoe(id: string, actor: string, playbackTurnId?: string) { const conversation=this.mustPoe().conversation(id);if(conversation.actorId!==actor)throw new Error('poe_conversation_actor_mismatch');return this.mustPoe().bargeIn(id,actor,playbackTurnId); }
  async voicePoe(id: string, bytes: Uint8Array, mime: string, actor: string, speechEndedAt?: number) { const conversation=this.mustPoe().conversation(id); if(conversation.actorId!==actor)throw new Error('poe_conversation_actor_mismatch'); return this.mustPoe().voiceTurn({conversationId:id,bytes,mime,speechEndedAt}); }
  poeTranscript(id: string, actor: string) { const conversation=this.mustPoe().conversation(id); if(conversation.actorId!==actor)throw new Error('poe_conversation_actor_mismatch'); return this.mustPoe().transcript(id); }
  poeEvidence(reference?: PoeObjectReference): PoeEvidenceResult {
    const at=new Date().toISOString(), fact=(label:string,value:string|number|boolean|null,evidence:string[],limitation?:string)=>({label,value,authority:'AGENT_CONTROL' as const,observedAt:at,evidence,...(limitation?{limitation}:{})});
    if(!reference){const snapshot=this.snapshot();return{title:'Agent Control status',summary:snapshot.paused?'The control plane is paused. Nothing should be pretending otherwise.':'The control plane is active; downstream readiness remains independently assessed.',facts:[fact('Health',snapshot.health,['system.snapshot']),fact('Active work',snapshot.jobs.running,['job-ledger','work-parcel-ledger']),fact('Waiting work',snapshot.jobs.waiting,['job-ledger']),fact('Outstanding approvals',snapshot.outstandingApprovals,['approval-ledger']),fact('Managed systems',snapshot.resources.length,['resource-registry'])],related:[]};}
    try {
      if(reference.kind==='model'){const model=this.model(reference.id);return{reference,title:`Model ${model.id}`,summary:'Registry identity and qualification are authoritative; benchmark reputation remains separate.',facts:[fact('Provider',model.provider,[`model:${model.id}`]),fact('Provider model',model.providerModel,[`model:${model.id}`]),fact('Qualification',model.qualification.state,[`model:${model.id}:qualification`]),fact('Routing enabled',model.enabled!==false,[`model:${model.id}:routing`]),fact('Capabilities',model.capabilities.join(', ')||'none reported',[`model:${model.id}`])],related:[]};}
      if(reference.kind==='job'||reference.kind==='workflow'){const job=this.job(reference.id);return{reference,title:`Job ${job.metadata.name}`,summary:'This is the registered executable definition, not an inferred workflow.',facts:[fact('Identity',`${job.metadata.id}@${job.metadata.version}`,[`job:${job.metadata.id}`]),fact('Enabled',job.spec.enabled!==false,[`job:${job.metadata.id}`]),fact('Steps',job.spec.steps.length,[`job:${job.metadata.id}`]),fact('Latest run',job.latestRun?.status??'never run',[`job:${job.metadata.id}:runs`])],related:[]};}
      if(reference.kind==='run'){const run=this.run(reference.id),parcelId=run.trigger.parcelContext?.parcelId;return{reference,title:`Run ${run.id}`,summary:'The durable Run ledger is authoritative.',facts:[fact('Status',run.status,[`run:${run.id}`]),fact('Job',run.jobId,[`run:${run.id}`]),fact('Workers',run.selectedWorkers.join(', ')||'unassigned',[`run:${run.id}:placement`]),fact('Errors',run.errors.length,[`run:${run.id}:errors`])],related:parcelId?[{kind:'parcel',id:parcelId}]:[]};}
      if(reference.kind==='parcel'){const parcel=this.parcel(reference.id);return{reference,title:`Work Parcel ${parcel.id}`,summary:parcel.decision?.summary??'The parcel remains in progress; its ledger, not POE, determines completion.',facts:[fact('Status',parcel.status,[`parcel:${parcel.id}`]),fact('Objective',parcel.objective,[`parcel:${parcel.id}:objective`]),fact('Stages',parcel.stages.length,[`parcel:${parcel.id}:plan`]),fact('Invocations',parcel.audit.totals.invocations,[`parcel:${parcel.id}:audit`]),fact('Total tokens',parcel.audit.totals.totalTokens,[`parcel:${parcel.id}:accounting`],parcel.audit.totals.totalTokens===null?'Provider telemetry is incomplete.':undefined),fact('Cost',parcel.audit.totals.cost,[`parcel:${parcel.id}:accounting`],parcel.audit.totals.cost===null?'Cost is unavailable; no estimate is presented as exact.':undefined)],related:parcel.stages.filter(stage=>stage.runId).map(stage=>({kind:'run' as const,id:stage.runId!}))};}
      if(reference.kind==='lane'){const lane=this.lane(Number(reference.id));return{reference,title:`Lane ${lane.name}`,summary:'Lane state is projected from the authoritative workspace.',facts:[fact('Status',lane.status,[`lane:${lane.id}`]),fact('Task',lane.task,[`lane:${lane.id}:contract`]),fact('Model',lane.model,[`lane:${lane.id}:route`]),fact('Baton',`revision ${lane.baton.revision} · ${lane.baton.health}`,[`lane:${lane.id}:baton`])],related:[]};}
      if(reference.kind==='crew-member'){const member=this.snapshot().characterCrew.members.find(item=>item.id===reference.id);if(!member)throw new Error('poe_object_missing');return{reference,title:member.name,summary:member.summary,facts:[fact('Role',member.role,[`crew:${member.id}`]),fact('State',member.operationalState,[`crew:${member.id}:projection`]),fact('Freshness',member.freshness,[`crew:${member.id}:projection`]),fact('Activity authority',member.activity.source.authority,[`crew:${member.id}:projection`])],related:[]};}
      if(reference.kind==='governor-decision'){const decision=this.tokenRouting().decisions.find(item=>item.id===reference.id);if(!decision)throw new Error('poe_object_missing');return{reference,title:`Governor decision ${decision.id}`,summary:'This is the durable token-governor decision; POE does not replace or override it.',facts:[fact('State',decision.state,[`token-routing-decision:${decision.id}`]),fact('Action',decision.action,[`token-routing-decision:${decision.id}`]),fact('Reason',decision.reason,[`token-routing-decision:${decision.id}`]),fact('Context',decision.contextPercent===null?'unavailable':`${decision.contextPercent.toFixed(1)}%`,[`token-routing-decision:${decision.id}`],decision.contextPercent===null?'The provider did not expose current context occupancy.':undefined),fact('Outcome',decision.outcome,[`token-routing-decision:${decision.id}`]),fact('Target',decision.target?`${decision.target.providerId}/${decision.target.accountProfileId??'default'}/${decision.target.modelId}@${decision.target.nodeId??'unreported'}`:'none',[`token-routing-decision:${decision.id}`])],related:[{kind:'parcel',id:decision.parcelId},...(decision.batonId?[{kind:'baton' as const,id:decision.batonId}]:[])]};}
      if(reference.kind==='capability-manifest'){const projection=this.capabilityIntelligenceProjection(),observation=projection.capabilities.find(item=>item.id===reference.id||item.capabilityId===reference.id);if(!observation)throw new Error('poe_object_missing');return{reference,title:`Capability ${observation.capabilityId}`,summary:'Support, implementation and verification are separate claims in the capability ledger.',facts:[fact('Provider',observation.subject.providerId,[`capability:${observation.id}`]),fact('Model',observation.subject.modelId??'all/unspecified',[`capability:${observation.id}`]),fact('Support',observation.support,[`capability:${observation.id}`]),fact('Implementation',observation.implementation,[`capability:${observation.id}`]),fact('Verification',observation.verification,[`capability:${observation.id}`]),fact('Confidence',observation.confidence,[`capability:${observation.id}`]),fact('Limitations',observation.limitations.join('; ')||'none recorded',[`capability:${observation.id}`])],related:observation.subject.modelId?[{kind:'model',id:observation.subject.modelId}]:[]};}
      if(reference.kind==='baton'){const baton=this.tokenBatonRouting?.baton(reference.id);if(!baton)throw new Error('poe_object_missing');return{reference,title:`Baton ${baton.id}`,summary:'The sealed baton carries bounded continuation state; its hash and unresolved next action are authoritative.',facts:[fact('SHA-256',baton.sha256,[`token-baton:${baton.id}`]),fact('Source route',`${baton.providerId}/${baton.accountProfileId??'default'}/${baton.modelId}@${baton.nodeId??'unreported'}`,[`token-baton:${baton.id}`]),fact('Objective',baton.objective,[`token-baton:${baton.id}`]),fact('Completed items',baton.completedWork.length,[`token-baton:${baton.id}`]),fact('Unresolved issues',baton.unresolvedIssues.length,[`token-baton:${baton.id}`]),fact('Next action',baton.nextAction,[`token-baton:${baton.id}`]),fact('Parcel total tokens',baton.parcelTotals.totalTokens,[`token-baton:${baton.id}:accounting`],baton.parcelTotals.totalTokens===null?'Provider usage is incomplete.':undefined)],related:[{kind:'parcel',id:baton.parcelId}]};}
      if(reference.kind==='verification'){const lane=this.lane(Number(reference.id)),verification=lane.verification;return{reference,title:`Verification for lane ${lane.name}`,summary:'Claims and evidence remain distinct until the configured verification policy is satisfied.',facts:[fact('Phase',verification.phase,[`lane:${lane.id}:verification`]),fact('Claim',verification.claim??'none recorded',[`lane:${lane.id}:verification`]),fact('Required evidence',verification.policy.required.join(', ')||'none configured',[`lane:${lane.id}:verification-policy`]),fact('Evidence records',verification.evidence.length,[`lane:${lane.id}:verification`]),fact('Failures',verification.failureReasons.join('; ')||'none recorded',[`lane:${lane.id}:verification`])],related:[{kind:'lane',id:String(lane.id)}]};}
      if(reference.kind==='routing-decision'||reference.kind==='league-row'){const decision=reference.kind==='routing-decision'?this.adaptiveDecision(reference.id):null,row=reference.kind==='league-row'?this.adaptiveModelLeague().find(item=>`${item.route.providerId}/${item.route.accountProfileId??'default'}/${item.route.modelId}@${item.route.nodeId}`===reference.id||item.route.modelId===reference.id):null,value=decision??row;if(!value)throw new Error('poe_object_missing');return{reference,title:reference.kind==='routing-decision'?'Routing decision':'Model league row',summary:'The record is evidence-conditioned and is not regenerated from POE opinion.',facts:[fact('Identity',reference.id,[`${reference.kind}:${reference.id}`]),fact('Record',JSON.stringify(redactSensitiveValue(value)).slice(0,1200),[`${reference.kind}:${reference.id}`],'Focused safe projection; open the canonical Routing view for the complete record.')],related:[]};}
      if(reference.kind==='execution-session'){const session=this.executionSession(reference.id);return{reference,title:`Live Shell ${session.id}`,summary:'POE may explain or navigate to this session; attachment authority remains with Live Shell.',facts:[fact('State',session.state,[`execution-session:${session.id}`]),fact('Node',session.scope.nodeId,[`execution-session:${session.id}:scope`]),fact('Control owner',session.control.owner,[`execution-session:${session.id}:control`]),fact('Output bytes',session.outputBytes,[`execution-session:${session.id}:output`])],related:session.scope.parcelId?[{kind:'parcel',id:session.scope.parcelId}]:[]};}
      if(reference.kind==='benchmark'){const batch=this.modelIntelligenceProjection().queue.find(item=>item.id===reference.id);if(!batch)throw new Error('poe_object_missing');return{reference,title:`Benchmark ${batch.id}`,summary:'Frozen-suite state is reported without upgrading it to objective model truth.',facts:[fact('Status',batch.status,[`benchmark:${batch.id}`]),fact('Suite',`${batch.suiteId}@${batch.suiteVersion}`,[`benchmark:${batch.id}`]),fact('Candidates',batch.candidates.length,[`benchmark:${batch.id}`]),fact('Attempts',batch.attemptIds.length,[`benchmark:${batch.id}`])],related:[]};}
      if(reference.kind==='human-evaluation')return{reference,title:'Human evaluation',summary:'Human preference is recorded as HUMAN_EVALUATION, not objective truth.',facts:[],related:[],unavailable:'No focused human-evaluation record is available for this reference.'};
      return{reference,title:`${reference.kind} ${reference.id}`,summary:'No focused POE evidence adapter exists for this record type yet.',facts:[],related:[],unavailable:'The canonical record is unavailable through POE. Use its native Agent Control view; POE will not guess.'};
    } catch {return{reference,title:`${reference.kind} ${reference.id}`,summary:'The requested record could not be resolved.',facts:[],related:[],unavailable:'Agent Control has no authoritative record matching this reference.'};}
  }
  executionSession(id: string) { return this.mustExecutionSessions().get(id); }
  executionSessionEvents(id: string, after = 0) { return this.mustExecutionSessions().events(id, after); }
  executionSessionTranscript(id: string) { return {sessionId: id, content: this.mustExecutionSessions().transcript(id)}; }
  attachExecutionSession(id: string, mode: ExecutionSessionMode, actor: string) { return this.mustExecutionSessions().attach(id, mode, sessionAuthority(actor)); }
  detachExecutionSession(id: string, attachmentId: string, actor: string) { return this.mustExecutionSessions().detach(id, attachmentId, sessionAuthority(actor)); }
  inputExecutionSession(id: string, attachmentId: string, value: string, sensitive: boolean, actor: string) { return this.mustExecutionSessions().input(id, attachmentId, value, sessionAuthority(actor), sensitive); }
  resizeExecutionSession(id: string, attachmentId: string, columns: number, rows: number, actor: string) { return this.mustExecutionSessions().resize(id, attachmentId, columns, rows, sessionAuthority(actor)); }
  signalExecutionSession(id: string, attachmentId: string, signal: ExecutionSessionSignal, actor: string) { return this.mustExecutionSessions().signal(id, attachmentId, signal, sessionAuthority(actor)); }
  returnExecutionSessionControl(id: string, attachmentId: string, reconciliation: {summary: string; batonId?: string}, actor: string) { return this.mustExecutionSessions().returnControl(id, attachmentId, sessionAuthority(actor), reconciliation); }
  nodes() { return this.managedNodes?.list() ?? []; }
  resourceLocks() { return this.mustJobRuntime().locks.list(); }
  artifacts(runId?: string) { return this.mustJobRuntime().artifacts.list(runId).map(value => { const {storageRef: _storageRef, ...metadata} = value; return {...metadata, storage: 'agent-control-managed'}; }); }
  artifact(id: string) { const value = this.mustJobRuntime().artifacts.get(id); if (!value) throw new Error('artifact_missing'); const {storageRef: _storageRef, ...metadata} = value; return {...metadata, storage: 'agent-control-managed'}; }
  artifactContent(id: string) { const runtime = this.mustJobRuntime(), value = runtime.artifacts.get(id); if (!value) throw new Error('artifact_missing'); const {storageRef: _storageRef, ...metadata} = value; return {artifact: {...metadata, storage: 'agent-control-managed'}, content: runtime.artifacts.read(id)}; }
  commandOutputs() { return this.tokenAwareOutput?.list() ?? []; }
  commandOutputMetrics(): TokenAwareOutputMetrics { return this.tokenAwareOutput?.metrics() ?? {commandsObserved: 0, commandsCompacted: 0, rgSearchesCompacted: 0, originalOutputBytes: 0, returnedOutputBytes: 0, estimatedTokensOriginal: 0, estimatedTokensReturned: 0, estimatedTokensSaved: 0, contextTokensAvoided: 0, expansionRequests: 0, fullResultRequests: 0, expansionTokensReturned: 0, byJob: {}, byLane: {}, byAgentModel: {}}; }
  tokenRouting(): TokenRoutingProjection { return this.tokenBatonRouting?.projection() ?? {schema: 'agent-control.token-aware-baton-routing/v1', observedAt: new Date().toISOString(), policy: {continuePercent: 60, prepareBatonPercent: 75, compactPercent: 85, handoffPercent: 90, sampleRetention: 240}, threads: [], parcels: [], decisions: [], contextLifecycle: []}; }
  retrievalProjection(): RetrievalProjection { return this.governedRetrieval?.projection() ?? {schema:'agent-control.governed-retrieval/v1',observedAt:new Date().toISOString(),policy:{enabled:false,maximumCalls:4,maximumEvidenceItems:12,maximumEvidenceTokens:8192,minimumConfidence:.55,requiredCoverage:.6,contextPressurePercent:75,contextPressureEvidenceFraction:.5,allowedLocality:['LOCAL'],progression:['EXACT','LEXICAL','SEMANTIC','HYBRID']},attempts:[],packets:[],totals:{queries:0,escalations:0,evidenceCount:0,evidenceTokens:0,rawBytesAvoided:0,retrievalLatencyMs:0,contextTokensSaved:0}}; }
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
  capabilityIntelligenceProjection() { return this.mustCapabilityIntelligence().projection(); }
  modelIntelligenceProjection() { return this.mustModelIntelligence().projection(); }
  providerCatalogProjection() { return this.mustProviderCatalog().projection(); }
  async discoverProviderModels(providerId: string, actor: string) {
    const pending = this.mustProviderCatalog().discover(providerId), action = 'discovering'; this.events.emit('provider.catalog_changed', {providerId, action, stage: 'DISCOVER', narrative: providerCatalogEventNarrative({providerId, action})}, undefined, actor);
    try { const value = await pending, completedAction = 'discovered'; this.events.emit('provider.catalog_changed', {providerId, action: completedAction, stage: 'DISCOVERED', models: value.discovered, narrative: providerCatalogEventNarrative({providerId, action: completedAction, models: value.discovered})}, undefined, actor); return value; }
    catch (error) { this.events.emit('provider.catalog_changed', {providerId, action: 'discovery-failed'}, undefined, actor); throw error; }
  }
  async smokeProviderModel(providerId: string, canonicalModelId: string, actor: string) {
    const pending = this.mustProviderCatalog().smoke(providerId, canonicalModelId), action = 'smoke-testing'; this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action, stage: 'CAPABILITY_TESTING', narrative: providerCatalogEventNarrative({providerId, canonicalModelId, action})}, undefined, actor);
    try { const value = await pending, completedAction = 'smoke-tested'; this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action: completedAction, stage: value.status === 'PASS' ? 'CAPABILITY_CONFIRMED' : value.status, status: value.status, narrative: providerCatalogEventNarrative({providerId, canonicalModelId, action: completedAction, status: value.status})}, undefined, actor); return value; }
    catch (error) { this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action: 'smoke-failed'}, undefined, actor); throw error; }
  }
  async probeProviderModelCallability(providerId: string, canonicalModelId: string, actor: string) {
    const pending = this.mustProviderCatalog().probeCallability(providerId, canonicalModelId), action = 'callability-testing'; this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action, stage: 'TESTING_CALLABILITY', narrative: providerCatalogEventNarrative({providerId, canonicalModelId, action})}, undefined, actor);
    try { const value = await pending, completedAction = 'callability-tested'; this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action: completedAction, stage: value.status === 'PASS' ? 'CONFIRMED' : value.inferenceEndpointStatus === 'NOT_AVAILABLE' ? 'FAILED' : 'LIMITED', status: value.status, inferenceEndpointStatus: value.inferenceEndpointStatus, failureClass: value.failureClass, narrative: providerCatalogEventNarrative({providerId, canonicalModelId, action: completedAction, status: value.status, failureClass: value.failureClass})}, undefined, actor); return value; }
    catch (error) { this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action: 'callability-failed'}, undefined, actor); throw error; }
  }
  adjudicateProviderEvidence(providerId: string, canonicalModelId: string, input: CatalogEvidenceAdjudicationInput, actor: string) { const value = this.mustProviderCatalog().recordEvidenceAdjudication(providerId, canonicalModelId, input), action = 'evidence-adjudicated'; this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action, attribution: value.attribution, scoreDisposition: value.scoreDisposition, evidenceReference: value.evidenceReference, narrative: providerCatalogEventNarrative({providerId, canonicalModelId, action, status: value.attribution})}, undefined, actor); return value; }
  setProviderModelRoutingEligibility(providerId: string, canonicalModelId: string, enabled: boolean, actor: string) { const value = this.mustProviderCatalog().setRoutingEligibility(providerId, canonicalModelId, enabled); this.events.emit('provider.catalog_changed', {providerId, canonicalModelId, action: enabled ? 'routing-enabled' : 'routing-disabled'}, undefined, actor); return value; }
  runtimeSafetyDecisions(runId?: string) { return this.mustJobRuntime().safetyDecisions(runId); }
  discoverCapability(input: {id?: string; title: string; source: string; providerRuntime: string; claimedCapability: string; whyItMatters: string; agentControlEquivalent: string; evidence?: string[]}, actor: string) { const candidate = this.mustCapabilityIntelligence().discoverCandidate({...input, evidence: input.evidence ?? [], actor}); this.events.emit('capability.intelligence_changed', {candidateId: candidate.id, state: candidate.state}, undefined, actor); return candidate; }
  transitionCapability(id: string, input: {to: CapabilityCandidateState; reason: string; classification?: CapabilityCandidateClassification; experiment?: string; measuredOutcome?: string; finalDecision?: string; evidence?: string[]}, actor: string) { const candidate = this.mustCapabilityIntelligence().transitionCandidate(id, {...input, actor}); this.events.emit('capability.intelligence_changed', {candidateId: candidate.id, state: candidate.state}, undefined, actor); return candidate; }
  queueModelEvaluation(modelIds: string[], reason: string, actor: string) {
    if (!modelIds.length) throw new Error('model_evaluation_candidates_required'); const suite = this.mustQualificationSuite(), registry = this.mustModelRegistry();
    const candidates = modelIds.map(id => { const model = registry.list().find(item => item.id === id); if (!model) throw new Error('model_missing'); const provider = registry.provider(model.provider); if (!provider) throw new Error('provider_missing'); const nodeId = model.account?.providerExecutionNodeId ?? model.qualification.nodes[0] ?? model.nodes?.[0] ?? 'controller'; return {providerId: model.provider, ...(model.accountProfile ? {accountProfileId: model.accountProfile} : {}), modelId: model.id, providerModel: model.providerModel, runtimeId: provider.kind, runtimeVersion: null, modelVersion: null, nodeId}; });
    const batch = this.mustModelIntelligence().createBatch({suite, candidates, requestedBy: actor, reason}); this.providerCatalog?.markBenchmarkQueued(modelIds, batch.id); this.events.emit('model.intelligence_changed', {batchId: batch.id, status: batch.status}, undefined, actor); for (const modelId of modelIds) { const item = this.providerCatalog?.modelByRegistryId(modelId); if (item) this.events.emit('provider.catalog_changed', {providerId: item.providerId, canonicalModelId: item.canonicalModelId, action: 'benchmark-queued', stage: 'BENCHMARKING', batchId: batch.id, narrative: providerCatalogEventNarrative({providerId:item.providerId,canonicalModelId:item.canonicalModelId,action:'benchmark-queued'})}, undefined, actor); } return batch;
  }
  reconcileProviderBenchmark(batchId: string, status: string, actor: string) { const models = this.mustProviderCatalog().projection().models.filter(model=>model.benchmarkBatchIds.includes(batchId)); for (const model of models) { const action='benchmark-completed'; this.events.emit('provider.catalog_changed',{providerId:model.providerId,canonicalModelId:model.canonicalModelId,action,stage:model.qualificationStage,status,batchId,routingEligible:model.routingEligible,narrative:providerCatalogEventNarrative({providerId:model.providerId,canonicalModelId:model.canonicalModelId,action,status:model.qualificationStage})},undefined,actor); } return models.map(model=>({providerId:model.providerId,canonicalModelId:model.canonicalModelId,qualificationStage:model.qualificationStage,reviewState:model.reviewState,routingEligible:model.routingEligible})); }
  transitionModelRoute(routeKey: string, to: Parameters<ModelIntelligenceLedger['transition']>[0]['to'], reason: string, actor: string, approved = false, evidence: string[] = []) { const value = this.mustModelIntelligence().transition({routeKey, to, reason, actor, approved, evidence}); this.events.emit('model.intelligence_changed', {routeKey, state: value.to}, undefined, actor); return value; }
  modelProviders() { return this.mustModelRegistry().providersList(); }
  modelAccountProfiles() { return this.mustModelRegistry().accountProfilesList(); }
  models() { return this.mustModelRegistry().list().map(model => { const recent = (this.harnessEfficiency?.list() ?? []).filter(item => item.model === model.id && item.provider === model.provider).at(-1); return {...model, ...(recent ? {recentInvocation: {at: recent.completedAt ?? recent.startedAt, outcome: recent.finalJobResult, verifierResult: recent.verifierResult, latencyMs: recent.elapsedMs, inputTokens: recent.usage.inputTokens, outputTokens: recent.usage.outputTokens, cachedInputTokens: recent.usage.cachedInputTokens, cacheWriteTokens: recent.usage.cacheWriteTokens, totalTokens: recent.usage.totalProcessedTokens, providerReportedCost: recent.providerReportedCost, calculatedCost: recent.calculatedCost, currency: recent.currency}} : {})}; }); }
  jobDefinitions() { return this.mustParameterizedJobs().definitions.list(); }
  jobDefinition(id: string, version?: number) { return this.mustParameterizedJobs().definitions.get(id, version); }
  savedJobs() { return this.mustParameterizedJobs().savedJobs.list().map(job => ({...job, definitionResolved: this.mustParameterizedJobs().definitions.resolve(job), nextRun: nextSavedJobOccurrence(job, new Date())?.toISOString() ?? null, lastRun: this.mustParameterizedJobs().runs.list(job.id)[0] ?? null})); }
  savedJob(id: string) { return this.savedJobs().find(job => job.id === id) ?? (() => { throw new Error('saved_job_missing'); })(); }
  exportSavedJob(id: string) { return this.mustParameterizedJobs().savedJobs.export(id); }
  createSavedJob(input: Omit<SavedJob, 'schema' | 'revision' | 'createdAt' | 'updatedAt'>, actor: string) { const job = this.mustParameterizedJobs().savedJobs.create(input); this.events.emit('job.saved_changed', {savedJobId: job.id, action: 'created'}, undefined, actor); return job; }
  updateSavedJob(id: string, revision: number, changes: Partial<Omit<SavedJob, 'schema' | 'id' | 'revision' | 'createdAt'>>, actor: string) { const job = this.mustParameterizedJobs().savedJobs.update(id, revision, changes); this.events.emit('job.saved_changed', {savedJobId: id, action: 'updated', revision: job.revision}, undefined, actor); return job; }
  setSavedJobEnabled(id: string, enabled: boolean, revision: number, actor: string) { const job = this.mustParameterizedJobs().savedJobs.setEnabled(id, enabled, revision); this.events.emit('job.saved_changed', {savedJobId: id, action: enabled ? 'enabled' : 'disabled'}, undefined, actor); return job; }
  runSavedJob(id: string, actor: string, requestKey?: string, origin?: import('./request-origin.js').GovernedRequestOrigin) { const run = this.mustParameterizedJobs().runNow(id, actor, requestKey, origin); this.events.emit('job.run_created', {runId: run.id, savedJobId: id, trigger: 'manual'}, undefined, actor); return run; }
  parameterizedRuns(savedJobId?: string) {
    const jobs = this.mustParameterizedJobs(), savedJobs = jobs.savedJobs.list();
    const parcels = this.workParcels?.list() ?? [], tokenEvidence = this.tokenBatonRouting?.evidence();
    return jobs.runs.list(savedJobId).map(run => ({
      ...run,
      executionTranscript: jobs.transcripts?.metadata(run.id),
      executionHistory: projectParameterizedRunHistory({
        run,
        savedJob: savedJobs.find(job => job.id === run.savedJobId),
        parcels,
        tokenEvidence,
      }),
    }));
  }
  parameterizedRun(id: string) { const run = this.parameterizedRuns().find(item => item.id === id); if (!run) throw new Error('job_run_missing'); return run; }
  parameterizedRunTranscript(id: string) { const transcripts = this.mustParameterizedJobs().transcripts; if (!transcripts) throw new Error('execution_transcript_runtime_unavailable'); return transcripts.read(id); }
  cancelParameterizedRun(id: string, actor: string) { const run = this.mustParameterizedJobs().cancel(id, actor); this.events.emit('job.run_cancelled', {runId: id, savedJobId: run.savedJobId}, undefined, actor); return run; }
  resumeParameterizedRunAuthentication(id: string, actor: string) { const run = this.mustParameterizedJobs().resumeAuthentication(id, actor); this.events.emit('job.run_authentication_resumed', {runId: id, savedJobId: run.savedJobId, providerId: run.modelRoute?.providerId, accountProfileId: run.modelRoute?.accountProfileId, modelId: run.modelRoute?.modelId, nodeId: run.modelRoute?.providerExecutionNodeId}, undefined, actor); return run; }
  parameterizedSchedules() { return this.savedJobs().filter(job => job.schedule).map(job => ({savedJobId: job.id, name: job.name, schedule: job.schedule, nextRun: job.nextRun, lastRun: job.lastRun})); }
  model(id: string) { const value = this.models().find(model => model.id === id); if (!value) throw new Error('model_missing'); return value; }
  modelRoutes() { return this.mustModelRegistry().routes(); }
  reloadModels(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig, actor: string) { this.mustModelRegistry().reload(providers, models, routing); this.providerCatalog?.reloadProviders(providers); this.events.emit('configuration.changed', {kind: 'model-registry', models: models.length, restartRequired: false}, undefined, actor); return {models: this.models(), routes: this.modelRoutes()}; }
  routeModel(request: ModelRouteRequest) { return this.mustModelRegistry().route(request); }
  qualifyModel(id: string, nodeId: string) { return qualifyModel({registry: this.mustModelRegistry(), modelId: id, nodeId}); }
  qualifyModelAccount(providerId: string, accountProfileId: string) {
    return qualifyAccountProfile({registry: this.mustModelRegistry(), providerId, accountProfileId, nodeExecution: this.codexNodeExecution}).then(result => {
      this.events.emit('configuration.changed', {kind: 'model-account-qualification', providerId, accountProfileId, state: result.record.state, restartRequired: false}, undefined, 'account-qualification');
      return result;
    });
  }
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
  createSocialParcel(jobId:string,parameters:Record<string,unknown>,actor:string,requestKey:string,prompt?:string,origin?:import('./request-origin.js').GovernedRequestOrigin) {
    const job=this.job(jobId),parcel=this.mustWorkParcels().submitApprovedPlan(prompt??`Approved social task: ${job.metadata.id}`,actor,requestKey,{objective:job.metadata.name,planner:{kind:'deterministic',reason:'Explicit enrolled sender selected a hash-pinned approved template'},stages:[{id:'execute',name:job.metadata.name,job:`${job.metadata.id}@${job.metadata.version}`,parameters,dependsOn:[]}]},origin);
    this.events.emit('work.parcel_created',{parcelId:parcel.id,status:parcel.status},undefined,actor);return parcel;
  }
  parcel(id: string) { return this.mustWorkParcels().get(id); }
  adaptiveModelLeague(taskClass?: string, filter?: AdaptiveLeagueFilter) { return this.adaptiveOrchestration?.modelLeague(taskClass, undefined, filter) ?? []; }
  adaptiveWorkflowLeague(taskClass?: string, filter?: AdaptiveLeagueFilter) { return this.adaptiveOrchestration?.workflowLeague(taskClass, undefined, filter) ?? []; }
  adaptiveDecisions() { return this.adaptiveOrchestration?.decisions() ?? []; }
  cacheExpertRegistry() { const decisions = this.cacheExperts?.decisions() ?? []; return {schema: 'agent-control.cache-expert-registry-projection/v1', policy: this.cacheExperts?.policy ?? null, experts: this.cacheExperts?.records() ?? [], decisions: decisions.map(item => ({...item, humanReadable: this.cacheExperts!.humanReadable(item.id)})), observedAt: new Date().toISOString()}; }
  learnedSpecialists() { return this.learnedSkills?.projection() ?? {schema:'agent-control.learned-specialists/v1',observedAt:new Date().toISOString(),policy:null,candidates:[],specialists:[],routing:[]}; }
  deterministicSkillProjection(){return this.deterministicSkills?.projection()??{schema:'agent-control.deterministic-skills/v1',observedAt:new Date().toISOString(),policy:null,skills:[],decisions:[],executions:[]};}
  energyProjection() { return this.energyTelemetry?.projection() ?? {schema:'agent-control.energy-telemetry/v1',observedAt:new Date().toISOString(),baselines:[],executions:[],decisions:[],totals:{measuredExecutions:0,verifiedSuccessful:0,wholeNodeMeasurements:0}}; }
  invalidateCacheExperts(input: {providerId?: string; modelId?: string; sessionId?: string; cacheScopeId?: string; backendInstanceId?: string; reason?: string}, actor: string) {
    if (!this.cacheExperts) throw new Error('cache_experts_unconfigured');
    const filters=Object.fromEntries(Object.entries(input).filter(([key,value])=>key!=='reason'&&typeof value==='string'&&value.trim()).map(([key,value])=>[key,String(value).trim()]));
    if (!Object.keys(filters).length) throw new Error('cache_expert_invalidation_scope_required');
    const reason=String(input.reason??'').trim();if(!reason||reason.length>200)throw new Error('cache_expert_invalidation_reason_invalid');
    const count=this.cacheExperts.invalidate({...filters,reason} as Parameters<CacheAwareExpertRuntime['invalidate']>[0]);
    this.events.emit('cache.expert_invalidated',{count,reason,...filters},undefined,actor);return {count,reason,...filters};
  }
  adaptiveDecision(id: string) { if (!this.adaptiveOrchestration) throw new Error('adaptive_orchestration_unconfigured'); return this.adaptiveOrchestration.decision(id); }
  adaptiveReport(id: string) { if (!this.adaptiveOrchestration) throw new Error('adaptive_orchestration_unconfigured'); return this.adaptiveOrchestration.report(id); }
  adaptiveParcelReport(id: string) { const parcel = this.parcel(id), decisionId = parcel.audit.orchestrationDecisionId; if (!decisionId) throw new Error('adaptive_decision_missing'); return this.adaptiveReport(decisionId); }
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
  askParcelQuestion(id: string, input: {text: string; originatingStageId?: string; dependentStageIds: string[]; priority?: 'LOW'|'NORMAL'|'HIGH'|'URGENT'; consequence?: 'LOW'|'MEDIUM'|'HIGH'}, actor: string) { const parcel = this.mustWorkParcels().askQuestion(id, {...input, actor}); this.events.emit('work.parcel_changed', {parcelId: id, status: parcel.status, change: 'question-created'}, undefined, actor); return parcel; }
  answerParcelQuestion(id: string, questionId: string, answer: string, actor: string) { const parcel = this.mustWorkParcels().answerQuestion(id, questionId, answer, actor); this.events.emit('work.parcel_changed', {parcelId: id, status: parcel.status, change: 'question-answered'}, undefined, actor); return parcel; }
  steerParcel(id: string, input: {instruction: string; constraints?: string[]; affectedStageIds?: string[]; supersedes?: string[]}, actor: string) { const parcel = this.mustWorkParcels().steer(id, {...input, actor}); this.events.emit('work.parcel_changed', {parcelId: id, status: parcel.status, change: 'steering-amendment'}, undefined, actor); return parcel; }
  addParcelCriterion(id: string, input: {kind: Parameters<WorkParcelCoordinator['addCriterion']>[1]['kind']; description: string; stageId?: string; requiredEvidence?: string[]}, actor: string) { const value = this.mustWorkParcels().addCriterion(id, {...input, source: 'USER', sourceActor: actor}); this.events.emit('work.parcel_changed', {parcelId: id, status: value.parcel.status, change: 'criterion-added', criterionId: value.criterion.id}, undefined, actor); return value; }
  evaluateParcelCriterion(id: string, criterionId: string, input: {status: 'PASS' | 'FAIL'; evidence: string[]; detail?: string}, actor: string) { const parcel = this.mustWorkParcels().evaluateCriterion(id, criterionId, {...input, actor}); this.events.emit('work.parcel_changed', {parcelId: id, status: parcel.status, change: 'criterion-evaluated', criterionId}, undefined, actor); return parcel; }
  retrieveParcelContext(id: string, input: {query: string; limit?: number; types?: Parameters<WorkParcelCoordinator['retrieveContext']>[1]['types']; stageIds?: string[]}, actor: string) { const values = this.mustWorkParcels().retrieveContext(id, {...input, actor}); this.events.emit('work.parcel_changed', {parcelId: id, change: 'context-retrieved', resultCount: values.length}, undefined, actor); return values; }
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
      history: projectLaneHistory(lane, route),
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
  private mustCapabilityIntelligence() { if (!this.capabilityIntelligence) throw new Error('capability_intelligence_unconfigured'); return this.capabilityIntelligence; }
  private mustModelIntelligence() { if (!this.modelIntelligence) throw new Error('model_intelligence_unconfigured'); return this.modelIntelligence; }
  private mustProviderCatalog() { if (!this.providerCatalog) throw new Error('provider_catalog_unconfigured'); return this.providerCatalog; }
  private mustQualificationSuite() { if (!this.qualificationSuite) throw new Error('model_qualification_suite_unconfigured'); return this.qualificationSuite; }
  private mustExecutionSessions() { if (!this.executionSessions) throw new Error('execution_session_runtime_unconfigured'); return this.executionSessions; }
  private mustPoe() { if (!this.poe) throw new Error('poe_unconfigured'); return this.poe; }
}

function sessionAuthority(actor: string) { return {actorId: actor.startsWith('human:') ? actor : `human:${actor}`, roles: ['operator' as const]}; }
