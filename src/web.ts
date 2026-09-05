import path from 'node:path';
import fs from 'node:fs';
import type {OpenWAAdapter} from './control/openwa.js';
import {AgentControlService} from './control/application-service.js';
import {configPath, loadConfig} from './control/config.js';
import {discoverLinuxPtys, toPtyDiscoveries} from './control/linux-pty.js';
import {ProviderRegistry, providersFromConfig} from './control/providers.js';
import {PtyRegistry} from './control/pty.js';
import {startWebDashboard} from './control/web-server.js';
import {ContextStore} from './control/context.js';
import {WorkQueueStore} from './control/work-queue-store.js';
import {workQueueMetrics} from './control/work-observability.js';
import {defaultCapabilities, loadWorkspace, type LaneState, type WorkspaceState} from './state.js';
import {buildGovernedRetrievalRuntime, buildJobRuntime, buildParameterizedJobRuntime, startJobScheduler, startManagedNodeMonitoring, startParameterizedJobScheduler} from './control/job-bootstrap.js';
import {ResourceCodexNodeExecutionPort} from './control/codex-node-execution.js';
import {FileCommandResultStore, TokenAwareOutputService} from './control/token-aware-output.js';
import {Trace} from './control/telemetry.js';
import {AccountProfileQualificationStore, ModelQualificationStore, ModelRegistry} from './control/model-registry.js';
import {IdentityControlPlane} from './control/identity-control-plane.js';
import {FileFastExecutionLedger} from './control/fast-execution.js';
import {ContractExecutionRuntime} from './control/contract-runtime.js';
import {GovernedHandoffRuntime} from './control/handoff-runtime.js';
import {ProviderModelLifecycleRegistry} from './control/provider-lifecycle.js';
import {RuntimeObservability} from './control/runtime-observability.js';
import {TokenAwareBatonRuntime} from './control/token-aware-baton-routing.js';
import {CapabilityIntelligenceStore, registerAgentControlCoreCapabilities} from './control/capability-intelligence.js';
import {loadFrozenQualificationSuite, ModelEvaluationCoordinator, ModelIntelligenceLedger} from './control/model-intelligence.js';
import {ProviderNeutralModelEvaluationExecutor, startModelEvaluationScheduler} from './control/model-evaluation-runtime.js';
import {AGENT_CONTROL_VERSION} from './version.js';

const now = () => new Date().toISOString();
const configurationFile = configPath(), config = loadConfig(configurationFile);
function initialLane(id: number, name: string, cwd: string, priority: number, mode: 'auto' | 'manual'): LaneState {
  return {id, name, status: 'idle', model: 'unassigned', reasoning: 'medium', context: '0', lines: ['Ready.', 'Awaiting task...'], contract: {version: 2, laneId: id, goal: 'Await task', constraints: [], cwd, priority, mode, capabilities: defaultCapabilities(), resourceLocks: {}, modelLock: null, sharedTaskIds: [], updatedAt: now()}, baton: {version: 1, laneId: id, revision: 1, status: 'Await task', progress: [], hypothesis: '', evidence: [], changes: [], nextAction: 'Await command', openQuestions: [], model: 'unassigned', reasoning: 'medium', updatedAt: now()}, lease: {laneId: id, holder: null, acquiredAt: null, expiresAt: null}};
}
const configuredLanes = config.lanes.length ? config.lanes : [{id: 1, name: 'Primary', cwd: '.', priority: 1, mode: 'auto' as const}];
const initial: WorkspaceState = {version: 1, paused: false, lastRestorePoint: null, lanes: configuredLanes.map(item => initialLane(item.id, item.name, path.resolve(item.cwd ?? '.'), item.priority ?? 1, item.mode ?? 'auto'))};
const state = loadWorkspace(initial), ptys = new PtyRegistry(), providers = new ProviderRegistry();
for (const provider of providersFromConfig(config.providers)) providers.register(provider);
if (process.platform === 'linux') for (const discovery of toPtyDiscoveries(discoverLinuxPtys())) { const lane = state.lanes.find(item => discovery.cwd === item.contract.cwd || discovery.cwd.startsWith(`${item.contract.cwd}/`)); ptys.upsert(discovery, lane ? String(lane.id) : null); }
const queue = new WorkQueueStore().load();
const stateRoot = path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control');
const capabilityIntelligence = new CapabilityIntelligenceStore(path.join(stateRoot, 'capabilities', 'intelligence.json'));
registerAgentControlCoreCapabilities(capabilityIntelligence);
const modelIntelligence = new ModelIntelligenceLedger(path.join(stateRoot, 'models', 'intelligence.json'));
const qualificationSuite = loadFrozenQualificationSuite(path.resolve('config/qualification-suite-v1.json'));
const modelRegistry = new ModelRegistry(config.providers, config.models, config.modelRouting, new ModelQualificationStore(path.join(stateRoot, 'model-qualification.json')), new AccountProfileQualificationStore(path.join(stateRoot, 'account-profile-qualification.json')), process.env, capabilityIntelligence, modelIntelligence);
const identity = new IdentityControlPlane(path.join(stateRoot, 'identity', 'control-plane.json'));
const fastExecution = new FileFastExecutionLedger(path.join(stateRoot, 'fast-execution', 'attempts.json'));
const contracts = new ContractExecutionRuntime(path.join(stateRoot, 'contracts', 'executions.json'));
const handoffs = new GovernedHandoffRuntime(contracts, path.join(stateRoot, 'contracts', 'handoffs.json'));
const tokenBatonRouting = new TokenAwareBatonRuntime(path.join(stateRoot, 'token-baton-routing', 'evidence.json'), config.tokenBatonRouting);
const codexNodeExecution = new ResourceCodexNodeExecutionPort(config.resources);
const providerLifecycle = new ProviderModelLifecycleRegistry(path.join(stateRoot, 'models', 'lifecycle.json'));
const remoteTokenEnvironment = process.env.AGENT_CONTROL_ACP_REMOTE_TOKEN_ENV?.trim();
const runtimeObservability = new RuntimeObservability({contracts, handoffs, providerLifecycle, acpSessionDirectory:path.join(stateRoot,'acp'), remoteAcp:{enabled:process.env.AGENT_CONTROL_ACP_REMOTE_ENABLED==='true',authenticationConfigured:Boolean(remoteTokenEnvironment&&process.env[remoteTokenEnvironment]),loopback:['127.0.0.1','::1','localhost'].includes((process.env.AGENT_CONTROL_ACP_REMOTE_HOST??'127.0.0.1').toLowerCase())}});
identity.registerActor({id: 'web-operator', type: 'human', displayName: 'Authenticated web operator', principalId: 'operator:web', authenticationSource: 'dashboard-bearer', roles: ['operator'], capabilities: [], metadata: {surface: 'dashboard'}});
const defaultSessionId = 'session:web-operator';
try { identity.session(defaultSessionId); }
catch (error) {
  if (!(error instanceof Error) || error.message !== 'session_missing') throw error;
  identity.createSession({id: defaultSessionId, creatorActorId: 'web-operator', mode: 'operator-controlled', permissions: {capabilities: ['session.observe', 'session.manage', 'parcel.create', 'parcel.execute', 'parcel.approve', 'agent.delegate', 'model.invoke', 'node.execute'], allowedModels: config.models.map(model => model.id), allowedNodes: config.resources.map(resource => resource.id), filesystem: 'none', network: 'provider-only', production: false}, contextPolicy: 'compiled', visibility: 'operator', metadata: {surface: 'dashboard'}});
}
const jobRuntime = buildJobRuntime(config, stateRoot, undefined, undefined, modelRegistry);
const governedRetrieval = buildGovernedRetrievalRuntime(config,stateRoot);
const parameterizedJobs = buildParameterizedJobRuntime(config, modelRegistry, jobRuntime.workParcels, stateRoot, tokenBatonRouting, contracts, handoffs, codexNodeExecution, governedRetrieval);
const commandOutputRoot = path.resolve(stateRoot, 'command-output');
const tokenAwareOutput = new TokenAwareOutputService(new FileCommandResultStore(commandOutputRoot), {
  policy: config.tokenAwareOutput,
  telemetry: event => { const span = new Trace().span(event.name, {attributes: event.attributes}); span.end(true, event.attributes); },
});
const service = new AgentControlService(state, ptys, providers).configureProjection({
  approvalCount: () => workQueueMetrics(queue).humanReview,
  resources: config.resources.map(resource => ({id: resource.id, name: resource.name ?? resource.id, platform: resource.platform, transport: resource.transport.type, capabilities: [...resource.capabilities]})),
  services: config.services.map(service => ({id: service.id, name: service.name ?? service.id, healthUrl: service.healthUrl, optional: Boolean(service.optional), requiresAuth: Boolean(service.requiresAuth), credentialConfigured: !service.requiresAuth || Boolean((service.credentialEnv && process.env[service.credentialEnv]) || (service.credentialFileEnv && process.env[service.credentialFileEnv]))})),
  contextStore: ContextStore.load(),
  jobRuntime,
  managedNodes: jobRuntime.managedNodes,
  tokenAwareOutput,
  tokenBatonRouting,
  governedRetrieval,
  codexNodeExecution,
  harnessEfficiency: jobRuntime.harnessEfficiency,
  workParcels: jobRuntime.workParcels,
  modelRegistry,
  parameterizedJobs,
  identity,
  defaultSessionId,
  fastExecution,
  runtimeObservability,
  capabilityIntelligence,
  modelIntelligence,
  qualificationSuite,
});
const modelEvaluationExecutor = new ProviderNeutralModelEvaluationExecutor(modelRegistry, capabilityIntelligence, codexNodeExecution, fetch, event => service.events.emit('model.intelligence_changed', {batchId: event.batchId, modelId: event.candidate.modelId, taskId: event.taskId, phase: event.phase, detail: event.detail, observedAt: event.at}, undefined, 'model-evaluation-runtime'));
const modelEvaluation = new ModelEvaluationCoordinator(modelIntelligence, qualificationSuite, modelEvaluationExecutor, {agentControlVersion: AGENT_CONTROL_VERSION, adapterVersion: 'provider-neutral-v1', promptVersion: qualificationSuite.version});
startModelEvaluationScheduler(modelEvaluation, (batchId, status) => service.events.emit('model.intelligence_changed', {batchId, status}, undefined, 'model-evaluation-runtime'), 1_000, error => service.events.emit('failure', {scope: 'model-evaluation-runtime', error: error.message}, undefined, 'model-evaluation-runtime'));
tokenBatonRouting.subscribe(event => service.events.emit(event.type === 'telemetry' ? 'token.telemetry' : event.type === 'governor.transition' ? 'token.governor_transition' : event.type === 'context.lifecycle' ? 'token.context_lifecycle' : event.type === 'baton.created' ? 'token.baton_created' : 'token.handoff_result', {threadId: event.threadId, parcelId: event.parcelId, observedAt: event.at}, undefined, 'token-baton-runtime'));
governedRetrieval.subscribe(event=>service.events.emit(event.type,{parcelId:event.parcelId,intentId:event.intentId,providerId:event.providerId,strategy:event.strategy,observedAt:event.at},undefined,'retrieval-runtime'));
jobRuntime.safety?.subscribe?.(decision=>service.events.emit('runtime.safety_changed',{decisionId:decision.id,runId:decision.runId,stepId:decision.stepId,outcome:decision.outcome,policyId:decision.policyId},undefined,'runtime-safety-supervisor'));
startManagedNodeMonitoring(jobRuntime, snapshot => service.events.emit('resource.node_changed', {resourceId: snapshot.resourceId, state: snapshot.state, health: snapshot.health, currentWorkload: snapshot.currentWorkload}, undefined, 'managed-node-monitor'), error => service.events.emit('failure', {scope: 'managed-node-monitor', error: error.message}, undefined, 'managed-node-monitor'));
startJobScheduler(jobRuntime, (id, status) => id.startsWith('parcel-') ? service.events.emit('work.parcel_changed', {parcelId: id, status}, undefined, 'job-scheduler') : service.events.emit('job.run_changed', {runId: id, status}, undefined, 'job-scheduler'), 1000, error => service.events.emit('failure', {scope: 'job-scheduler', error: error.message}, undefined, 'job-scheduler'));
startParameterizedJobScheduler(parameterizedJobs, (runId, status) => service.events.emit('job.run_changed', {runId, status, kind: 'parameterized'}, undefined, 'parameterized-job-scheduler'), 1000, error => service.events.emit('failure', {scope: 'parameterized-job-scheduler', error: error.message}, undefined, 'parameterized-job-scheduler'));
const host = process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1', port = Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310);
let openwa: OpenWAAdapter | undefined;
let socialVoice: import('./control/social-voice.js').SocialVoiceCoordinator | undefined;
let socialTimer: ReturnType<typeof setInterval> | undefined;
jobRuntime.ledger.subscribe((runId,type,status)=>service.events.emit('job.run_changed',{runId,type,status},undefined,'run-ledger'));
parameterizedJobs.runs.subscribe(run=>service.events.emit('job.run_changed',{runId:run.id,status:run.status,kind:'parameterized'},undefined,'parameterized-run-store'));
if (process.env.AGENT_CONTROL_OPENWA_CONFIG) {
  try {
    if (!process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN) throw new Error('operator_auth_required');
    const {OpenWAAdapter, openwaConfigSchema} = await import('./control/openwa.js');
    openwa = new OpenWAAdapter(service, openwaConfigSchema.parse(JSON.parse(fs.readFileSync(process.env.AGENT_CONTROL_OPENWA_CONFIG, 'utf8'))), path.join(stateRoot,'messaging','openwa.sqlite'));
    if(process.env.AGENT_CONTROL_SOCIAL_VOICE_CONFIG){
      try {
      const settings=JSON.parse(fs.readFileSync(process.env.AGENT_CONTROL_SOCIAL_VOICE_CONFIG,'utf8'));
      const {SocialVoiceCoordinator}=await import('./control/social-voice.js');
      const {OpenWASocialProvider,openwaExecutionPort}=await import('./control/openwa-social-provider.js');
      const {PrivateSpeechProvider}=await import('./control/speech-http-provider.js');
      const speech=settings.speechUrl?new PrivateSpeechProvider(settings.voice.provider,settings.speechUrl,process.env[settings.tokenEnv]??'',settings.voice):undefined;
      socialVoice=new SocialVoiceCoordinator(path.join(stateRoot,'messaging','social-voice.sqlite'),new OpenWASocialProvider(openwa),openwaExecutionPort(openwa),speech,speech,settings.voice,Date.now,event=>service.events.emit('social.activity',{event}));
      openwa.social=socialVoice;socialTimer=setInterval(()=>void socialVoice?.tick().catch(()=>{}),1000);socialTimer.unref();
      } catch {process.stderr.write('Optional Social & Voice configuration unavailable; existing WhatsApp remains active.\n');}
    }
    openwa.start();
  } catch { process.stderr.write('Optional OpenWA adapter unavailable; dashboard and jobs remain active. Check private integration configuration.\n'); }
}
const server = startWebDashboard(service, {host, port, openwa, socialVoice, operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN, allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean), configFile: configurationFile});
server.on('close',()=>{if(socialTimer)clearInterval(socialTimer);openwa?.close();});
server.on('listening', () => process.stdout.write(`Agent Control ${service.version} web dashboard: http://${host}:${port} (${process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator authenticated' : 'observer only'})\n`));
server.on('error', error => { process.stderr.write(`Dashboard failed: ${error.message}\n`); process.exitCode = 1; });
