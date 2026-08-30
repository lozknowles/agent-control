import path from 'node:path';
import {AgentControlService} from './control/application-service.js';
import {loadConfig} from './control/config.js';
import {discoverLinuxPtys, toPtyDiscoveries} from './control/linux-pty.js';
import {ProviderRegistry, providersFromConfig} from './control/providers.js';
import {PtyRegistry} from './control/pty.js';
import {startWebDashboard} from './control/web-server.js';
import {ContextStore} from './control/context.js';
import {WorkQueueStore} from './control/work-queue-store.js';
import {workQueueMetrics} from './control/work-observability.js';
import {defaultCapabilities, loadWorkspace, type LaneState, type WorkspaceState} from './state.js';
import {buildJobRuntime, startJobScheduler, startManagedNodeMonitoring} from './control/job-bootstrap.js';
import {FileCommandResultStore, TokenAwareOutputService} from './control/token-aware-output.js';
import {Trace} from './control/telemetry.js';

const now = () => new Date().toISOString();
const config = loadConfig();
function initialLane(id: number, name: string, cwd: string, priority: number, mode: 'auto' | 'manual'): LaneState {
  return {id, name, status: 'idle', model: 'unassigned', reasoning: 'medium', context: '0', lines: ['Ready.', 'Awaiting task...'], contract: {version: 2, laneId: id, goal: 'Await task', constraints: [], cwd, priority, mode, capabilities: defaultCapabilities(), resourceLocks: {}, modelLock: null, sharedTaskIds: [], updatedAt: now()}, baton: {version: 1, laneId: id, revision: 1, status: 'Await task', progress: [], hypothesis: '', evidence: [], changes: [], nextAction: 'Await command', openQuestions: [], model: 'unassigned', reasoning: 'medium', updatedAt: now()}, lease: {laneId: id, holder: null, acquiredAt: null, expiresAt: null}};
}
const configuredLanes = config.lanes.length ? config.lanes : [{id: 1, name: 'Primary', cwd: '.', priority: 1, mode: 'auto' as const}];
const initial: WorkspaceState = {version: 1, paused: false, lastRestorePoint: null, lanes: configuredLanes.map(item => initialLane(item.id, item.name, path.resolve(item.cwd ?? '.'), item.priority ?? 1, item.mode ?? 'auto'))};
const state = loadWorkspace(initial), ptys = new PtyRegistry(), providers = new ProviderRegistry();
for (const provider of providersFromConfig(config.providers)) providers.register(provider);
if (process.platform === 'linux') for (const discovery of toPtyDiscoveries(discoverLinuxPtys())) { const lane = state.lanes.find(item => discovery.cwd === item.contract.cwd || discovery.cwd.startsWith(`${item.contract.cwd}/`)); ptys.upsert(discovery, lane ? String(lane.id) : null); }
const queue = new WorkQueueStore().load();
const jobRuntime = buildJobRuntime(config);
const commandOutputRoot = path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control', 'command-output');
const tokenAwareOutput = new TokenAwareOutputService(new FileCommandResultStore(commandOutputRoot), {
  policy: config.tokenAwareOutput,
  telemetry: event => { const span = new Trace().span(event.name, {attributes: event.attributes}); span.end(true, event.attributes); },
});
const service = new AgentControlService(state, ptys, providers).configureProjection({
  approvalCount: () => workQueueMetrics(queue).humanReview,
  resources: config.resources.map(resource => ({id: resource.id, name: resource.name ?? resource.id, platform: resource.platform, transport: resource.transport.type, capabilities: [...resource.capabilities]})),
  contextStore: ContextStore.load(),
  jobRuntime,
  managedNodes: jobRuntime.managedNodes,
  tokenAwareOutput,
  harnessEfficiency: jobRuntime.harnessEfficiency,
});
startManagedNodeMonitoring(jobRuntime, snapshot => service.events.emit('resource.node_changed', {resourceId: snapshot.resourceId, state: snapshot.state, health: snapshot.health, currentWorkload: snapshot.currentWorkload}, undefined, 'managed-node-monitor'), error => service.events.emit('failure', {scope: 'managed-node-monitor', error: error.message}, undefined, 'managed-node-monitor'));
startJobScheduler(jobRuntime, (runId, status) => service.events.emit('job.run_changed', {runId, status}, undefined, 'job-scheduler'), 1000, error => service.events.emit('failure', {scope: 'job-scheduler', error: error.message}, undefined, 'job-scheduler'));
const host = process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1', port = Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310);
const server = startWebDashboard(service, {host, port, operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN, allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean)});
server.on('listening', () => process.stdout.write(`Agent Control ${service.version} web dashboard: http://${host}:${port} (${process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator authenticated' : 'observer only'})\n`));
server.on('error', error => { process.stderr.write(`Dashboard failed: ${error.message}\n`); process.exitCode = 1; });
