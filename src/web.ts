import {readPoeRegression} from './control/poe-regression.js';
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
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
import {ProviderCatalogRuntime, ProviderCatalogStore} from './control/provider-catalog.js';
import {AGENT_CONTROL_VERSION} from './version.js';
import {ExecutionSessionRuntime} from './control/execution-session.js';
import {PoeKnowledgeService} from './control/poe-knowledge.js';
import {PoeRegistrySource} from './control/poe-registry-source.js';
import {PoeOperatorRuntime} from './control/poe-operator.js';
import {PoeRuntime} from './control/poe.js';
import {RoutedPoeResponseModel} from './control/poe-model.js';
import {governedRequestOrigin} from './control/request-origin.js';
import {UxSessionAnnotationStore,UxSessionCaptureRuntime,UxSessionShareStore,UxSessionStore} from './control/ux-session.js';
import {CodexSessionAdapter,ImmutableSessionVault,SessionVaultRuntime} from './control/session-vault.js';

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
const codexHome=process.env.CODEX_HOME??path.join(process.env.HOME??process.cwd(),'.codex');
const sessionVault=new SessionVaultRuntime(new ImmutableSessionVault(path.join(stateRoot,'session-vault')),[new CodexSessionAdapter([path.join(codexHome,'sessions'),path.join(codexHome,'archived_sessions')],process.env.AGENT_CONTROL_NODE_ID??'controller')],{sensitivity:'RESTRICTED',redactSensitive:true});
const capabilityIntelligence = new CapabilityIntelligenceStore(path.join(stateRoot, 'capabilities', 'intelligence.json'));
registerAgentControlCoreCapabilities(capabilityIntelligence);
const modelIntelligence = new ModelIntelligenceLedger(path.join(stateRoot, 'models', 'intelligence.json'));
const qualificationSuite = loadFrozenQualificationSuite(path.resolve('config/qualification-suite-v1.json'));
const modelRegistry = new ModelRegistry(config.providers, config.models, config.modelRouting, new ModelQualificationStore(path.join(stateRoot, 'model-qualification.json')), new AccountProfileQualificationStore(path.join(stateRoot, 'account-profile-qualification.json')), process.env, capabilityIntelligence, modelIntelligence);
const providerCatalog = new ProviderCatalogRuntime(config.providers, new ProviderCatalogStore(path.join(stateRoot, 'models', 'provider-catalog.json')), modelRegistry, modelIntelligence);
const identity = new IdentityControlPlane(path.join(stateRoot, 'identity', 'control-plane.json'));
const fastExecution = new FileFastExecutionLedger(path.join(stateRoot, 'fast-execution', 'attempts.json'));
const contracts = new ContractExecutionRuntime(path.join(stateRoot, 'contracts', 'executions.json'));
const executionSessions = new ExecutionSessionRuntime(path.join(stateRoot, 'execution-sessions'), contracts);
const handoffs = new GovernedHandoffRuntime(contracts, path.join(stateRoot, 'contracts', 'handoffs.json'));
const tokenBatonRouting = new TokenAwareBatonRuntime(path.join(stateRoot, 'token-baton-routing', 'evidence.json'), config.tokenBatonRouting);
const codexNodeExecution = new ResourceCodexNodeExecutionPort(config.resources, process.env, undefined, undefined, executionSessions);
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
const jobRuntime = buildJobRuntime(config, stateRoot, undefined, undefined, modelRegistry, codexNodeExecution, executionSessions);
const governedRetrieval = buildGovernedRetrievalRuntime(config,stateRoot);
const parameterizedJobs = buildParameterizedJobRuntime(config, modelRegistry, jobRuntime.workParcels, stateRoot, tokenBatonRouting, contracts, handoffs, codexNodeExecution, governedRetrieval);
const uxSessions=new UxSessionStore(path.join(stateRoot,'ux-sessions','records'));
const uxSessionShares=new UxSessionShareStore(path.join(stateRoot,'ux-sessions','shares.json'));
const uxSessionAnnotations=new UxSessionAnnotationStore(path.join(stateRoot,'ux-sessions','annotations.json'));
const uxSessionCapture=new UxSessionCaptureRuntime(uxSessions,parameterizedJobs.runs,parameterizedJobs.savedJobs,jobRuntime.workParcels.store,tokenBatonRouting);
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
  providerCatalog,
  adaptiveOrchestration: jobRuntime.adaptiveOrchestration,
  executionSessions,
  cacheExperts: jobRuntime.cacheExperts,
  learnedSkills: jobRuntime.learnedSkills,
  deterministicSkills: jobRuntime.deterministicSkills,
  energyTelemetry: jobRuntime.energyTelemetry,
});
let poeSpeech: import('./control/social-voice-providers.js').SpeechProvider | undefined;
let poeRecognition: import('./control/social-voice-providers.js').SpeechRecognitionProvider | undefined;
let poeVoice: import('./control/social-voice-providers.js').VoiceIdentity | undefined;
if (process.env.AGENT_CONTROL_POE_VOICE_CONFIG) {
  try {
    const settings=JSON.parse(fs.readFileSync(process.env.AGENT_CONTROL_POE_VOICE_CONFIG,'utf8'));
    const {PrivateSpeechProvider}=await import('./control/speech-http-provider.js');
    if(!settings.speechUrl||!settings.tokenEnv||!settings.voice)throw new Error('poe_voice_configuration_invalid');
    const provider=new PrivateSpeechProvider(settings.voice.provider,settings.speechUrl,process.env[settings.tokenEnv]??'',settings.voice);
    poeSpeech=provider;poeRecognition=provider;poeVoice=settings.voice;
  } catch {process.stderr.write('Optional POE voice configuration unavailable; text conversation remains active.\n');}
}
const knowledge = new PoeKnowledgeService({root:process.cwd(),version:AGENT_CONTROL_VERSION,sources:JSON.parse(fs.readFileSync('config/poe-knowledge-sources.json','utf8')),configuration:()=>({jobs:jobRuntime.catalog.listJobs(),schedules:jobRuntime.catalog.listSchedules(),models:service.models(),routing:config.modelRouting}),live:category=>{
  const snapshot=service.snapshot();
  if(category==='voice')return {channel:'poe/dashboard',configured:Boolean(poeVoice&&poeSpeech&&poeRecognition),identity:poeVoice?.id??null,synthesisProvider:poeVoice?.provider??null,recognitionEngine:'Not established by this configuration; do not infer from the synthesis provider.',recognitionConfigured:Boolean(poeRecognition),synthesisConfigured:Boolean(poeSpeech),streaming:poeSpeech?.capabilities().streaming??false,readiness:'CONFIGURED_NOT_A_HEALTH_PROBE',whatsapp:'SEPARATE_CHANNEL_NOT_OBSERVED'};
  if(category==='regression')return readPoeRegression(process.env.AGENT_CONTROL_POE_REGRESSION_FILE);
  if(category==='crew')return snapshot.characterCrew.members.map(member=>({id:member.id,name:member.name,role:member.role,state:member.operationalState,summary:member.summary,freshness:member.freshness}));
  if(category==='models')return {models:service.models(),providers:snapshot.providers,routing:config.modelRouting,learnedSpecialists:service.learnedSpecialists(),deterministicSkills:service.deterministicSkillProjection()};
  if(category==='lanes')return {systems:service.systems(),lanes:snapshot.lanes.map(lane=>({id:lane.id,name:lane.name,status:lane.status,model:lane.model,baton:lane.baton}))};
  if(category==='work')return service.parcels().slice(-20).map(parcel=>({id:parcel.id,status:parcel.status,stages:parcel.stages.map(stage=>({id:stage.id,name:stage.name,job:stage.job,status:stage.status,runId:stage.runId,route:stage.actualRoute})),verification:parcel.context?.criteria.map(c=>({id:c.id,status:c.status,evidence:c.evidence}))}));
  if(category==='handoffs')return {handoffs:service.runtime().handoffs,decisions:service.tokenRouting().decisions.slice(-12)};
  throw new Error('knowledge_category_unavailable');
}});
const operator = new PoeOperatorRuntime({knowledge,registries:process.env.AGENT_CONTROL_POE_REGISTRY_SOURCES?JSON.parse(fs.readFileSync(process.env.AGENT_CONTROL_POE_REGISTRY_SOURCES,'utf8')).map((config:import('./control/poe-registry-source.js').RegistrySourceConfig)=>new PoeRegistrySource(config)):[],runtime:jobRuntime,parcels:jobRuntime.workParcels,
  file:path.join(stateRoot,'poe','operator.json'),
  registrations:JSON.parse(fs.readFileSync(path.resolve('config/poe-operator-jobs.json'),'utf8')),
  topics:JSON.parse(fs.readFileSync(path.resolve('config/poe-system-topics.json'),'utf8')),
  sources:{systems:()=>service.systems(),savedJobs:()=>service.savedJobs(),parameterizedSchedules:()=>service.parameterizedSchedules(),overview:()=>service.poeEvidence(),resolve:reference=>service.poeEvidence(reference)}});
const poe = new PoeRuntime({operator,regression:()=>readPoeRegression(process.env.AGENT_CONTROL_POE_REGRESSION_FILE),
  file:path.join(stateRoot,'poe','conversations.json'),
  evidence:{overview:()=>service.poeEvidence(),resolve:reference=>service.poeEvidence(reference)},
  sessionVault,
  ...(process.env.AGENT_CONTROL_POE_STATUS_MODEL_ROLE?{responseModel:new RoutedPoeResponseModel(modelRegistry,codexNodeExecution,{status:process.env.AGENT_CONTROL_POE_STATUS_MODEL_ROLE,reasoning:process.env.AGENT_CONTROL_POE_REASONING_MODEL_ROLE??process.env.AGENT_CONTROL_POE_STATUS_MODEL_ROLE})}:{}),
  benchmark:{submit:({proposal,actor,requestKey,plan})=>{
    const identityReference=createHash('sha256').update(`poe:${actor}`).digest('hex');
    const origin=governedRequestOrigin({channel:'poe/dashboard',modality:'dashboard',receivedAt:new Date().toISOString(),authentication:'dashboard-bearer',actorId:actor,authority:[`conversation:${proposal.conversationId}`,`proposal:${proposal.id}`,`frozen-sha256:${proposal.frozenSha256}`],messageReference:requestKey,identityReference,request:`${proposal.decision}\n\n${proposal.objective}`});
    const parcel=jobRuntime.workParcels.submitApprovedPlan(origin.request,actor,requestKey,plan,origin);return{parcelId:parcel.id};
  }},
  speech:poeSpeech,recognition:poeRecognition,voice:poeVoice,
  onEvent:event=>service.events.emit(event.type==='conversation.changed'?'poe.conversation_changed':event.type==='proposal.changed'?'poe.proposal_changed':event.type==='speech.changed'?'poe.speech_changed':'poe.interrupted',{conversationId:event.conversationId,proposalId:event.proposalId,state:event.state,detail:event.detail,observedAt:event.at},undefined,'poe'),
});
service.configureProjection({poe});
const modelEvaluationExecutor = new ProviderNeutralModelEvaluationExecutor(modelRegistry, capabilityIntelligence, codexNodeExecution, fetch, event => service.events.emit('model.intelligence_changed', {batchId: event.batchId, providerId: event.candidate.providerId, accountProfileId: event.candidate.accountProfileId ?? null, modelId: event.candidate.modelId, providerModel: event.candidate.providerModel, nodeId: event.candidate.nodeId, taskId: event.taskId, phase: event.phase, detail: event.detail, observedAt: event.at}, undefined, 'model-evaluation-runtime'));
const modelEvaluation = new ModelEvaluationCoordinator(modelIntelligence, qualificationSuite, modelEvaluationExecutor, {agentControlVersion: AGENT_CONTROL_VERSION, adapterVersion: 'provider-neutral-v1', promptVersion: qualificationSuite.version});
startModelEvaluationScheduler(modelEvaluation, (batchId, status) => { service.events.emit('model.intelligence_changed', {batchId, status}, undefined, 'model-evaluation-runtime'); service.reconcileProviderBenchmark(batchId,status,'model-evaluation-runtime'); }, 1_000, error => service.events.emit('failure', {scope: 'model-evaluation-runtime', error: error.message}, undefined, 'model-evaluation-runtime'));
tokenBatonRouting.subscribe(event => service.events.emit(event.type === 'telemetry' ? 'token.telemetry' : event.type === 'governor.transition' ? 'token.governor_transition' : event.type === 'context.lifecycle' ? 'token.context_lifecycle' : event.type === 'baton.created' ? 'token.baton_created' : 'token.handoff_result', {threadId: event.threadId, parcelId: event.parcelId, observedAt: event.at}, undefined, 'token-baton-runtime'));
executionSessions.subscribe((event, session) => service.events.emit(event.type === 'output' ? 'execution.session_output' : 'execution.session_changed', {sessionId: session.id, runId: session.scope.runId, stepId: session.scope.stepId, workerId: session.scope.workerId, nodeId: session.scope.nodeId, eventType: event.type, sequence: event.sequence, state: session.state, observedAt: event.at}, undefined, event.actorId));
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
      socialVoice=new SocialVoiceCoordinator(path.join(stateRoot,'messaging','social-voice.sqlite'),new OpenWASocialProvider(openwa),openwaExecutionPort(openwa),speech,speech,settings.voice,Date.now,event=>service.events.emit('social.activity',{event}),{
        ask:async({actor,identityReference,text,modality})=>{
          const conversationId=`poe-whatsapp:${createHash('sha256').update(identityReference).digest('hex')}`;
          try{poe.conversation(conversationId);}catch{poe.createConversation({id:conversationId,actorId:actor,channel:'whatsapp'});}
          const result=await poe.ask({conversationId,text,channel:'whatsapp',modality,contentTrust:modality==='voice'?'UNTRUSTED_DATA':'OPERATOR_REQUEST'});
          return{conversationId,turnId:result.turn.id,text:result.turn.text};
        },
        interrupt:({actor,conversationId,turnId})=>poe.bargeIn(conversationId,actor,turnId),
      });
      openwa.social=socialVoice;socialTimer=setInterval(()=>void socialVoice?.tick().catch(()=>{}),1000);socialTimer.unref();
      } catch {process.stderr.write('Optional Social & Voice configuration unavailable; existing WhatsApp remains active.\n');}
    }
    openwa.start();
  } catch { process.stderr.write('Optional OpenWA adapter unavailable; dashboard and jobs remain active. Check private integration configuration.\n'); }
}
const server = startWebDashboard(service, {host, port, openwa, socialVoice, operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN, allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean), configFile: configurationFile,uxSessions,uxSessionShares,uxSessionAnnotations,sessionVault});
server.on('close',()=>{if(socialTimer)clearInterval(socialTimer);openwa?.close();uxSessionCapture.dispose();});
server.on('listening', () => process.stdout.write(`Agent Control ${service.version} web dashboard: http://${host}:${port} (${process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator authenticated' : 'observer only'})\n`));
server.on('error', error => { process.stderr.write(`Dashboard failed: ${error.message}\n`); process.exitCode = 1; });
