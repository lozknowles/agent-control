import path from 'node:path';
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
import {buildJobRuntime, buildParameterizedJobRuntime, startJobScheduler, startManagedNodeMonitoring, startParameterizedJobScheduler} from './control/job-bootstrap.js';
import {FileCommandResultStore, TokenAwareOutputService} from './control/token-aware-output.js';
import {Trace} from './control/telemetry.js';
import {ModelQualificationStore, ModelRegistry} from './control/model-registry.js';
import {IdentityControlPlane} from './control/identity-control-plane.js';
import {FileFastExecutionLedger} from './control/fast-execution.js';
import {ContractExecutionRuntime} from './control/contract-runtime.js';
import {GovernedHandoffRuntime} from './control/handoff-runtime.js';
import {ProviderModelLifecycleRegistry} from './control/provider-lifecycle.js';
import {RuntimeObservability} from './control/runtime-observability.js';
import {TokenAwareBatonRuntime} from './control/token-aware-baton-routing.js';

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
const modelRegistry = new ModelRegistry(config.providers, config.models, config.modelRouting, new ModelQualificationStore(path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control', 'model-qualification.json')));
const stateRoot = path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control');
const identity = new IdentityControlPlane(path.join(stateRoot, 'identity', 'control-plane.json'));
const fastExecution = new FileFastExecutionLedger(path.join(stateRoot, 'fast-execution', 'attempts.json'));
const contracts = new ContractExecutionRuntime(path.join(stateRoot, 'contracts', 'executions.json'));
const handoffs = new GovernedHandoffRuntime(contracts, path.join(stateRoot, 'contracts', 'handoffs.json'));
const tokenBatonRouting = new TokenAwareBatonRuntime(path.join(stateRoot, 'token-baton-routing', 'evidence.json'), config.tokenBatonRouting);
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
const parameterizedJobs = buildParameterizedJobRuntime(config, modelRegistry, jobRuntime.workParcels, stateRoot, tokenBatonRouting);
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
  harnessEfficiency: jobRuntime.harnessEfficiency,
  workParcels: jobRuntime.workParcels,
  modelRegistry,
  parameterizedJobs,
  identity,
  defaultSessionId,
  fastExecution,
  runtimeObservability,
});
tokenBatonRouting.subscribe(event => service.events.emit(event.type === 'telemetry' ? 'token.telemetry' : event.type === 'governor.transition' ? 'token.governor_transition' : event.type === 'baton.created' ? 'token.baton_created' : 'token.handoff_result', {threadId: event.threadId, parcelId: event.parcelId, observedAt: event.at}, undefined, 'token-baton-runtime'));
startManagedNodeMonitoring(jobRuntime, snapshot => service.events.emit('resource.node_changed', {resourceId: snapshot.resourceId, state: snapshot.state, health: snapshot.health, currentWorkload: snapshot.currentWorkload}, undefined, 'managed-node-monitor'), error => service.events.emit('failure', {scope: 'managed-node-monitor', error: error.message}, undefined, 'managed-node-monitor'));
startJobScheduler(jobRuntime, (id, status) => id.startsWith('parcel-') ? service.events.emit('work.parcel_changed', {parcelId: id, status}, undefined, 'job-scheduler') : service.events.emit('job.run_changed', {runId: id, status}, undefined, 'job-scheduler'), 1000, error => service.events.emit('failure', {scope: 'job-scheduler', error: error.message}, undefined, 'job-scheduler'));
startParameterizedJobScheduler(parameterizedJobs, (runId, status) => service.events.emit('job.run_changed', {runId, status, kind: 'parameterized'}, undefined, 'parameterized-job-scheduler'), 1000, error => service.events.emit('failure', {scope: 'parameterized-job-scheduler', error: error.message}, undefined, 'parameterized-job-scheduler'));
const host = process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1', port = Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310);
const server = startWebDashboard(service, {host, port, operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN, allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean), configFile: configurationFile});
server.on('listening', () => process.stdout.write(`Agent Control ${service.version} web dashboard: http://${host}:${port} (${process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator authenticated' : 'observer only'})\n`));
server.on('error', error => { process.stderr.write(`Dashboard failed: ${error.message}\n`); process.exitCode = 1; });
