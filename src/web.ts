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
const service = new AgentControlService(state, ptys, providers).configureProjection({
  approvalCount: () => workQueueMetrics(queue).humanReview,
  resources: config.resources.map(resource => ({id: resource.id, name: resource.name ?? resource.id, platform: resource.platform, transport: resource.transport.type, capabilities: [...resource.capabilities]})),
  contextStore: ContextStore.load(),
});
const host = process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1', port = Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310);
const server = startWebDashboard(service, {host, port, operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN, allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean)});
server.on('listening', () => process.stdout.write(`Agent Control ${service.version} web dashboard: http://${host}:${port} (${process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator authenticated' : 'observer only'})\n`));
server.on('error', error => { process.stderr.write(`Dashboard failed: ${error.message}\n`); process.exitCode = 1; });
