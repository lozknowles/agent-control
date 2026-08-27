import blessed from 'blessed';
import path from 'node:path';
import {appendEvent, batonHealth, defaultCapabilities, loadWorkspace, saveWorkspace, type LaneState, type WorkspaceState} from './state.js';
import {loadConfig} from './control/config.js';
import {PtyRegistry} from './control/pty.js';
import {buildPtyRows} from './control/dashboard.js';
import {discoverLinuxPtys, toPtyDiscoveries} from './control/linux-pty.js';
import {laneAccent, meter, compactPath, tag, statusColor} from './ui/theme.js';
import {ProviderRegistry, providersFromConfig} from './control/providers.js';
import {probeProvider} from './control/provider-health.js';
import {proveResponsesProvider} from './control/responses-client.js';
import {WorkQueueStore} from './control/work-queue-store.js';
import {workQueueMetrics} from './control/work-observability.js';
import {injectDemoWork} from './control/work-demo.js';
import {controlRoomView} from './ui/control-room.js';
import {AndroidRecovery, type AndroidRecoveryState} from './control/android-recovery.js';
import {AgentControlService} from './control/application-service.js';
import {startWebDashboard} from './control/web-server.js';
import {ContextStore} from './control/context.js';
import {buildJobRuntime, startJobScheduler, startManagedNodeMonitoring} from './control/job-bootstrap.js';
import {FileCommandResultStore, TokenAwareOutputService} from './control/token-aware-output.js';
import {Trace} from './control/telemetry.js';

const now = () => new Date().toISOString();
const config = loadConfig();

function lane(id: number, name: string, cwd: string, priority = 1, mode: 'auto' | 'manual' = 'auto'): LaneState {
  return {
    id, name, status: 'idle', model: 'unassigned', reasoning: 'medium', context: '0', lines: ['Ready.', 'Awaiting task...'],
    contract: {version: 2, laneId: id, goal: 'Await task', constraints: [], cwd, priority, mode, capabilities: defaultCapabilities(), resourceLocks: {}, modelLock: null, sharedTaskIds: [], updatedAt: now()},
    baton: {version: 1, laneId: id, revision: 1, status: 'Await task', progress: [], hypothesis: '', evidence: [], changes: [], nextAction: 'Await command', openQuestions: [], model: 'unassigned', reasoning: 'medium', updatedAt: now()},
    lease: {laneId: id, holder: null, acquiredAt: null, expiresAt: null},
  };
}

const configuredLanes = config.lanes.length ? config.lanes : [{id: 1, name: 'Primary', cwd: '.', priority: 1, mode: 'auto' as const}];
const initial: WorkspaceState = {version: 1, paused: false, lastRestorePoint: null, lanes: configuredLanes.map(item => lane(item.id, item.name, path.resolve(item.cwd ?? '.'), item.priority, item.mode))};
const state = loadWorkspace(initial), lanes = state.lanes, ptys = new PtyRegistry(), providers = new ProviderRegistry();
for (const provider of providersFromConfig(config.providers)) providers.register(provider);
const queueStore = new WorkQueueStore();
let workQueue = queueStore.load();
const jobRuntime = buildJobRuntime(config);
const commandOutputRoot = path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control', 'command-output');
const tokenAwareOutput = new TokenAwareOutputService(new FileCommandResultStore(commandOutputRoot), {
  policy: config.tokenAwareOutput,
  telemetry: event => { const span = new Trace().span(event.name, {attributes: event.attributes}); span.end(true, event.attributes); },
});
const control = new AgentControlService(state, ptys, providers).configureProjection({
  approvalCount: () => workQueueMetrics(workQueue).humanReview,
  resources: config.resources.map(resource => ({id: resource.id, name: resource.name ?? resource.id, platform: resource.platform, transport: resource.transport.type, capabilities: [...resource.capabilities]})),
  contextStore: ContextStore.load(),
  jobRuntime,
  managedNodes: jobRuntime.managedNodes,
  tokenAwareOutput,
});
startManagedNodeMonitoring(jobRuntime, snapshot => control.events.emit('resource.node_changed', {resourceId: snapshot.resourceId, state: snapshot.state, health: snapshot.health, currentWorkload: snapshot.currentWorkload}, undefined, 'managed-node-monitor'));
startJobScheduler(jobRuntime, (runId, status) => control.events.emit('job.run_changed', {runId, status}, undefined, 'job-scheduler'));
const androidResource = config.resources.find(resource => resource.platform === 'android' && resource.android);
let androidState: AndroidRecoveryState | undefined = androidResource ? {resourceId: androidResource.id, state: 'offline', detail: 'not probed', recovered: false} : undefined;
let androidAuto = false;

function androidController(auto = androidAuto) {
  if (!androidResource) return null;
  const credentialName = androidResource.android?.credentialEnv;
  const token = credentialName ? process.env[credentialName] ?? '' : '';
  return new AndroidRecovery(androidResource, token, auto);
}

function matchingLane(cwd: string) {
  return lanes.find(item => cwd === item.contract.cwd || cwd.startsWith(`${item.contract.cwd}/`));
}
function refreshPtys() {
  if (process.platform !== 'linux') return;
  for (const discovery of toPtyDiscoveries(discoverLinuxPtys())) {
    const match = matchingLane(discovery.cwd);
    ptys.upsert(discovery, match ? String(match.id) : null);
  }
}
refreshPtys();

if (process.env.AGENT_CONTROL_WEB_ENABLED !== '0') {
  const web = startWebDashboard(control, {
    host: process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1',
    port: Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310),
    operatorToken: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN,
    allowedOrigins: process.env.AGENT_CONTROL_WEB_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean),
  });
  web.on('listening', () => appendEvent('web.listening', {host: process.env.AGENT_CONTROL_WEB_HOST ?? '127.0.0.1', port: Number(process.env.AGENT_CONTROL_WEB_PORT ?? 4310), mutations: process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN ? 'operator-authenticated' : 'disabled'}));
  web.on('error', error => appendEvent('web.failure', {message: error.message}));
}

const screen = blessed.screen({smartCSR: true, fullUnicode: true, title: 'Agent Control 3.1.0', mouse: true});
let active = 0;
const box = (options: any) => { const value = blessed.box({tags: true, border: 'line', style: {border: {fg: 'gray'}}, ...options}); screen.append(value); return value; };
const header = box({top: 0, left: 0, width: '100%', height: 4});
const laneBoxes = lanes.map((_, index) => box({top: 4, left: `${index * (100 / lanes.length)}%`, width: `${100 / lanes.length}%`, height: '48%-4', scrollable: true, keys: true, vi: true, scrollbar: {ch: '|'}}));
const activity = blessed.log({parent: screen, top: '48%', left: 0, width: '30%', height: '38%-1', border: 'line', tags: true, scrollable: true, label: ' ACTIVITY ', style: {border: {fg: 'gray'}}});
const overview = box({top: '48%', left: '30%', width: '25%', height: '19%', label: ' LANES ', wrap: false});
const messages = box({top: '67%', left: '30%', width: '25%', height: '19%-1', label: ' BATON ', wrap: false});
const workPanel = box({top: '48%', left: '55%', width: '23%', height: '38%-1', label: ' WORK QUEUE ', wrap: false});
const tools = box({top: '48%', left: '78%', width: '22%', height: '38%-1', label: ' RESOURCES ', wrap: false});
const input = blessed.textbox({parent: screen, bottom: 2, left: 0, width: '100%', height: 3, border: 'line', inputOnFocus: true, keys: true, prompt: '  > ', style: {border: {fg: 'gray'}}});
const footer = blessed.box({parent: screen, bottom: 0, left: 0, width: '100%', height: 2, tags: true});
const icon = (health?: string) => health === 'healthy' ? '{green-fg}*{/green-fg}' : health === 'degraded' ? '{red-fg}!{/red-fg}' : health === 'offline' ? '{red-fg}x{/red-fg}' : '{gray-fg}o{/gray-fg}';
const short = (value: string, size: number) => value.length <= size ? value : `${value.slice(0, Math.max(1, size - 3))}...`;

function render() {
  const selected = lanes[active], unassigned = ptys.list().filter(item => item.laneId === null).length, total = ptys.list().length;
  const metrics = workQueueMetrics(workQueue), outputMetrics = control.commandOutputMetrics(), view = controlRoomView(metrics, androidState), activeCount = lanes.filter(item => item.status === 'working').length, waiting = lanes.filter(item => item.status === 'waiting').length;
  header.setContent(` {cyan-fg}{bold}AGENT CONTROL 3.1.0{/bold}{/cyan-fg}   ${tag(activeCount ? 'running' : 'ready', `${activeCount} ACTIVE`)}   ${tag(waiting ? 'waiting' : 'ready', `${waiting} WAITING`)}   |   ${tag(metrics.humanReview ? 'review' : 'ready', `${metrics.ready} READY / ${metrics.humanReview} REVIEW`)}   |   {gray-fg}TOKENS AVOIDED ${outputMetrics.contextTokensAvoided} · PTY ${total - unassigned}/${total}{/gray-fg}`);
  lanes.forEach((item, index) => {
    const color = laneAccent(index), health = batonHealth(item.baton), laneColor = statusColor(item.status), healthColor = statusColor(health.label), context = Math.max(0, Math.min(100, Number.parseFloat(item.context) || 0));
    laneBoxes[index].style.border.fg = index === active ? color : 'gray';
    laneBoxes[index].setLabel(` {${color}-fg}${index === active ? '* ' : ''}${item.id} ${item.name}{/${color}-fg} `);
    const base = `{${laneColor}-fg}${item.status.toUpperCase()}{/${laneColor}-fg}  {gray-fg}${item.contract.mode.toUpperCase()}{/gray-fg}\n{bold}${short(item.contract.goal, 38)}{/bold}\n{gray-fg}Worker{/gray-fg} ${short(`${item.model} ${item.reasoning}`, 30)}\n{gray-fg}Baton r${item.baton.revision}{/gray-fg} {${healthColor}-fg}${health.label}{/${healthColor}-fg}\n{gray-fg}Context{/gray-fg} ${context.toFixed(0).padStart(3)}% ${meter(context / 100, 10)}`;
    const quiet = !['working', 'active', 'running'].includes(item.status);
    const detail = `\n{gray-fg}Capabilities{/gray-fg} ${short(item.contract.capabilities.requires.map(value => value.id).join(', ') || 'unconstrained', 28)}\n{gray-fg}Path{/gray-fg} ${short(compactPath(item.contract.cwd), 34)}\n\n${item.lines.slice(-8).join('\n')}`;
    laneBoxes[index].setContent(base + (quiet ? '\n\n{gray-fg}Idle lane - select or assign work to expand activity.{/gray-fg}' : detail));
  });
  overview.setContent(lanes.map((item, index) => `${index === active ? '{cyan-fg}>{/cyan-fg}' : ' '} ${item.id} ${short(item.name, 12).padEnd(12)} ${tag(item.status, item.status.toUpperCase())}`).join('\n'));
  const health = batonHealth(selected.baton);
  messages.setContent(`${selected.name}  r${selected.baton.revision} ${tag(health.label, health.label)}\n{gray-fg}Goal{/gray-fg} ${short(selected.contract.goal, 28)}\n{gray-fg}State{/gray-fg} ${short(selected.baton.status, 26)}\n{gray-fg}Next{/gray-fg} ${short(selected.baton.nextAction, 27)}`);
  const jobRuns = jobRuntime.ledger.list(), jobQueued = jobRuntime.queueProjection();
  workPanel.setContent(`${view.queue}\n\n{cyan-fg}JOBS{/cyan-fg} ${jobRuntime.catalog.listJobs().length}  {yellow-fg}Q ${jobQueued.length}{/yellow-fg}  {green-fg}OK ${jobRuns.filter(run => run.status === 'SUCCEEDED').length}{/green-fg}\n${jobRuns.slice(0, 2).map(run => ` ${short(run.jobId, 13).padEnd(13)} ${tag(run.status, run.status)}`).join('\n')}`);
  const providerRows = providers.list().map(provider => { const status = providers.health(provider.id); return `${icon(status?.health)} ${short(provider.name, 13)} ${tag(status?.health ?? 'unknown', status?.health ?? 'unknown')}\n  {gray-fg}${short(status?.detail ?? '', 24)}{/gray-fg}`; });
  const nodeRows = control.snapshot().resources.filter(resource => resource.node).map(resource => `${icon(resource.health)} ${short(resource.name, 12)} ${tag(resource.node!.state, resource.node!.state)}\n  {gray-fg}${short(resource.node!.currentWorkload ?? `load ${resource.node!.cpu?.load.one ?? '--'}`, 24)}{/gray-fg}`);
  tools.setContent([`{cyan-fg}MANAGED NODES{/cyan-fg}`, ...(nodeRows.length ? nodeRows : ['{gray-fg}UNCONFIGURED{/gray-fg}']), '', `{cyan-fg}ANDROID RECOVERY{/cyan-fg} ${androidAuto ? '{magenta-fg}AUTO{/magenta-fg}' : '{gray-fg}MANUAL{/gray-fg}'}`, view.resources, '', `{cyan-fg}PROVIDERS{/cyan-fg}`, ...(providerRows.length ? providerRows : ['{gray-fg}UNCONFIGURED{/gray-fg}'])].join('\n'));
  footer.setContent(' Tab Lane  I Command  T PTYs  J Jobs  W Queue  G Providers  X Android  P Pause  Q Quit');
  screen.render();
}

async function refreshProviders() {
  if (!providers.list().length) { activity.log('Providers: UNCONFIGURED'); return; }
  activity.log('Provider probes started');
  await Promise.all(providers.list().map(async provider => { providers.setHealth(provider.id, 'unknown', 'PROBING'); render(); const result = await probeProvider(provider); providers.setHealth(provider.id, result.health, `${result.detail} ${result.latencyMs}ms`); control.events.emit('provider.health_changed', {providerId: provider.id, health: result.health, detail: result.detail, latencyMs: result.latencyMs}, undefined, 'provider-probe'); activity.log(`${provider.name}: ${result.health} ${result.detail} ${result.latencyMs}ms`); render(); }));
}
function probeAndroid() {
  const controller = androidController(false);
  if (!controller) { activity.log('Android resource: UNCONFIGURED'); render(); return; }
  androidState = controller.probe(); activity.log(`Android ${androidState.resourceId}: ${androidState.state} - ${androidState.detail}`); appendEvent('resource.android.probe', androidState); render();
}
function recoverAndroid() {
  const controller = androidController(true);
  if (!controller) { activity.log('Android recovery: UNCONFIGURED'); return; }
  activity.log('Configured Android recovery started'); androidState = controller.recover(); activity.log(`Android recovery: ${androidState.state} - ${androidState.detail}`); appendEvent('resource.android.recovery-result', androidState); render();
}
async function proveResponses() {
  const provider = providers.list().find(item => item.wireApi === 'responses');
  if (!provider) { activity.log('Responses provider: UNCONFIGURED'); return; }
  if (providers.health(provider.id)?.health !== 'healthy') { activity.log('Responses proof blocked: provider not healthy'); return; }
  try { const result = await proveResponsesProvider(provider); activity.log(`Responses proof ${result.ok ? 'PASS' : 'FAIL'} HTTP ${result.status} ${result.latencyMs}ms`); popup(`RESPONSES - ${result.ok ? 'PASS' : 'FAIL'}`, `${result.text}\n\nHTTP ${result.status}  ${result.latencyMs}ms`); }
  catch (error) { activity.log(`Responses proof ERROR: ${error instanceof Error ? error.message : String(error)}`); }
}
function popup(title: string, content: string) { const value = blessed.box({parent: screen, label: ` ${title} `, border: 'line', tags: true, scrollable: true, keys: true, width: '72%', height: '58%', top: 'center', left: 'center', content, style: {border: {fg: 'cyan'}}}); value.focus(); value.key(['escape', 'q', 'enter'], () => { value.destroy(); laneBoxes[active].focus(); render(); }); screen.render(); }
function ptyPopup() { refreshPtys(); popup('LIVE PTYs', buildPtyRows(ptys.list(), id => ptys.attached(id)).map(row => `${row.sessionId} ${row.laneId === null ? 'UNASSIGNED' : `lane ${row.laneId}`}\n ${row.command}\n ${row.cwd}`).join('\n\n')); }
function queuePopup() { const items = workQueue.all(); popup('WORK QUEUE DETAIL', items.length ? items.map(item => `${tag(item.status, item.status.toUpperCase())}  ${item.id}  ${item.class}\n ${item.type}${item.batchKey ? `  batch:${item.batchKey}` : ''}${item.claimedBy ? `  -> ${item.claimedBy}` : ''}${item.dependsOn.length ? `\n waits:${item.dependsOn.join(',')}` : ''}${item.checkpoint ? `\n checkpoint ${JSON.stringify(item.checkpoint)}` : ''}`).join('\n\n') : 'Queue is empty.'); }
function jobsPopup() { const jobs = jobRuntime.jobsProjection(), queue = jobRuntime.queueProjection(); popup('JOBS / SCHEDULES / RUNS', jobs.length ? jobs.map(job => `${job.metadata.name}  v${job.metadata.version}\n ${job.latestRun ? tag(job.latestRun.status, job.latestRun.status) : tag('ready', 'NEVER RUN')}  ${job.schedules.map(schedule => `${schedule.spec.cron} ${schedule.spec.timezone} ${schedule.state?.enabled ? 'ENABLED' : 'DISABLED'}`).join(', ') || 'MANUAL'}\n ${queue.filter(item => item.jobId === job.metadata.id).map(item => `${item.stepId}: ${item.status} ${item.reason ?? ''}`).join('\n ')}`).join('\n\n') : 'Job catalog is empty.'); }
function demoQueue() { const added = injectDemoWork(workQueue); queueStore.save(workQueue); activity.log(added ? `Demo queue injected: ${added} isolated items` : 'Demo queue already present'); appendEvent('work.demo.inject', {added}); render(); }

screen.key(['tab'], () => { active = (active + 1) % lanes.length; laneBoxes[active].focus(); render(); });
screen.key(['q', 'C-c'], () => { saveWorkspace(state); queueStore.save(workQueue); process.exit(0); });
screen.key(['i', 'enter'], () => input.focus());
screen.key(['g'], () => void refreshProviders());
screen.key(['y'], () => void proveResponses());
screen.key(['t'], ptyPopup); screen.key(['w'], queuePopup); screen.key(['j'], jobsPopup); screen.key(['d'], demoQueue); screen.key(['x'], probeAndroid); screen.key(['z'], recoverAndroid);
screen.key(['a'], () => { androidAuto = !androidAuto; activity.log(`Android recovery mode: ${androidAuto ? 'AUTO' : 'MANUAL'}`); appendEvent('resource.android.recovery-mode', {auto: androidAuto}); if (androidAuto) { const controller = androidController(true); if (controller) { androidState = controller.probe(); if (androidState.state === 'node-degraded') androidState = controller.recover(); } } render(); });
screen.key(['r'], () => { const selected = lanes[active]; control.requestReroute(selected.id, 'tui-operator', `Capability re-resolution requested from current ${selected.model}`, .8); render(); });
screen.key(['p'], () => { control.setSystemPaused(!state.paused, 'tui-operator'); render(); });
input.on('submit', value => { const text = value.trim(); if (text) control.submitTask(lanes[active].id, text, 'tui-operator'); input.clearValue(); render(); });

render(); laneBoxes[0].focus(); probeAndroid(); void refreshProviders();
