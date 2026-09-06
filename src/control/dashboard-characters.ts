export const DASHBOARD_CHARACTER_CREW_SCHEMA = 'agent-control.dashboard-character-crew/v1' as const;
export const DASHBOARD_CHARACTER_STALE_AFTER_MS = 120_000;

export const DASHBOARD_CHARACTER_STATES = [
  'idle',
  'queued',
  'working',
  'reviewing',
  'waiting',
  'awaiting_operator',
  'blocked',
  'resource_pressure',
  'recovering',
  'handing_over',
  'completed',
  'failed',
  'cancelling',
  'cancelled',
  'offline',
  'stale',
  'unknown',
] as const;

export type DashboardCharacterState = typeof DASHBOARD_CHARACTER_STATES[number];
export type DashboardCharacterId = 'lane-master' | 'prompt-reviewer' | 'parcel-coordinator' | 'model-scout' | 'resource-guardian' | 'quality-inspector';
export type DashboardCharacterFreshness = 'current' | 'stale' | 'unknown';
export type DashboardCharacterCoverage = 'live' | 'partial' | 'unavailable';

export interface DashboardCharacterSignal {
  state: DashboardCharacterState;
  label: string;
  count: number;
}

export interface DashboardCharacterProjection {
  id: DashboardCharacterId;
  name: string;
  role: string;
  area: string;
  identityColor: string;
  accessory: string;
  state: DashboardCharacterState;
  stateLabel: string;
  summary: string;
  reason: string;
  nextAction: string;
  counts: {active: number; queued: number; waiting: number; blocked: number; completed: number; failed: number};
  signals: DashboardCharacterSignal[];
  current: string | null;
  elapsedMs: number | null;
  lastUpdatedAt: string | null;
  freshness: DashboardCharacterFreshness;
  instrumentation: {coverage: DashboardCharacterCoverage; source: string; limitation: string | null};
  navigation: {view: 'jobs' | 'lanes' | 'systems' | 'models'; target: string; tab?: string};
  transitionKey: string;
}

export interface DashboardCharacterCrewProjection {
  schema: typeof DASHBOARD_CHARACTER_CREW_SCHEMA;
  observedAt: string;
  staleAfterMs: number;
  members: DashboardCharacterProjection[];
}

interface LaneSource {
  id?: string | number;
  name?: string;
  status: string;
  elapsedMs?: number;
  lastMeaningfulActivity?: string | null;
  model?: string;
  executionTarget?: string;
  baton?: {status?: string; nextAction?: string};
  verification?: {phase?: string};
}

interface RunStepSource {
  status: string;
  waitingReason?: string;
  error?: string;
  startedAt?: string;
  endedAt?: string;
}

interface RunSource {
  id?: string;
  status: string;
  requestedAt?: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
  completedAt?: string;
  errors?: string[];
  steps?: RunStepSource[];
  modelRoute?: {providerId?: string; modelId?: string; accountLabel?: string | null};
  recovery?: {state?: string; reason?: string; observedAt?: string};
}

interface ParcelStageSource {
  status: string;
  waitingReason?: string;
  error?: string;
  startedAt?: string;
  endedAt?: string;
  actualRoute?: {provider?: string; model?: string; accountLabel?: string; accountProfile?: string};
}

interface ParcelSource {
  id?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  stages: ParcelStageSource[];
  context?: {questions?: Array<{status: string; text?: string}>};
  audit?: {timeline?: Array<{type: string; at: string; detail?: string}>};
}

interface SystemSource {
  id?: string;
  name?: string;
  execution: string;
  blockingReason?: string | null;
  active?: number | null;
  capacity?: number | null;
  lastCheckAt?: string | null;
  lastSuccessfulProbeAt?: string | null;
  node?: {lastProbeAt?: string | null; state?: string; currentWorkload?: string | null; memory?: {totalBytes?: number | null; availableBytes?: number | null}; storage?: Array<{usedPercent?: number}>; warnings?: string[]};
}

interface ModelSource {
  id?: string;
  provider?: string;
  enabled?: boolean;
  qualificationState?: string;
  accountAvailability?: string | null;
  checkedAt?: string | null;
}

interface ModelBatchSource {id?: string; status: string; createdAt?: string | null; startedAt?: string | null; completedAt?: string | null;}
interface TokenThreadSource {id: string; parcelId: string; active: boolean; updatedAt?: string; governor?: {state?: string; reason?: string};}
interface TokenDecisionSource {threadId: string; parcelId: string; at: string; action: string; outcome: string; reason?: string; target?: {providerId?: string; modelId?: string; accountLabel?: string; accountProfileId?: string};}

export interface DashboardCharacterSource {
  observedAt: string;
  paused?: boolean;
  lanes?: LaneSource[];
  runs?: RunSource[];
  parameterizedRuns?: RunSource[];
  parcels?: ParcelSource[];
  systems?: SystemSource[];
  models?: ModelSource[];
  modelBatches?: ModelBatchSource[];
  tokenRouting?: {threads?: TokenThreadSource[]; decisions?: TokenDecisionSource[]};
  outstandingApprovals?: number;
  staleAfterMs?: number;
}

interface CharacterIdentity {
  id: DashboardCharacterId;
  name: string;
  role: string;
  area: string;
  identityColor: string;
  accessory: string;
  navigation: DashboardCharacterProjection['navigation'];
}

const identities: Record<DashboardCharacterId, CharacterIdentity> = {
  'lane-master': {id: 'lane-master', name: 'Cadence', role: 'Lane Master', area: 'Lanes, queue and capacity', identityColor: '#4f8cff', accessory: 'conductor baton and three-lane crown', navigation: {view: 'lanes', target: '#lane-list'}},
  'prompt-reviewer': {id: 'prompt-reviewer', name: 'Quill', role: 'Master Prompt Reviewer', area: 'Task entry and readiness', identityColor: '#a879ff', accessory: 'document visor and marking quill', navigation: {view: 'jobs', target: '#natural-task-prompt'}},
  'parcel-coordinator': {id: 'parcel-coordinator', name: 'Relay', role: 'Work Parcel Coordinator', area: 'Work Parcels and handovers', identityColor: '#35c7be', accessory: 'parcel harness and relay baton', navigation: {view: 'jobs', target: '#parcel-list'}},
  'model-scout': {id: 'model-scout', name: 'Lumen', role: 'Model Scout', area: 'Models and qualification', identityColor: '#ff9b4a', accessory: 'survey lens and signal dish', navigation: {view: 'models', target: '#models-list'}},
  'resource-guardian': {id: 'resource-guardian', name: 'Rook', role: 'Resource Guardian', area: 'Systems and resources', identityColor: '#55c979', accessory: 'shield frame and pressure gauge', navigation: {view: 'systems', target: '#systems-list'}},
  'quality-inspector': {id: 'quality-inspector', name: 'Verity', role: 'Quality Inspector', area: 'Validation and run evidence', identityColor: '#e3b84e', accessory: 'inspection lens and check seal', navigation: {view: 'jobs', target: '#run-history', tab: 'runs'}},
};

const labels: Record<DashboardCharacterState, string> = {
  idle: 'Idle', queued: 'Queued', working: 'Working', reviewing: 'Reviewing', waiting: 'Waiting', awaiting_operator: 'Awaiting operator', blocked: 'Blocked', resource_pressure: 'Resource pressure', recovering: 'Recovering', handing_over: 'Handing over', completed: 'Completed', failed: 'Failed', cancelling: 'Cancelling', cancelled: 'Cancelled', offline: 'Offline', stale: 'Stale', unknown: 'Unknown',
};

const activeStates = new Set(['RUNNING', 'RESOLVING', 'VERIFYING', 'VALIDATING']);
const queuedStates = new Set(['PLANNING', 'QUEUED', 'SCHEDULED', 'WAITING_FOR_WORKER']);
const waitingStates = new Set(['WAITING', 'WAITING_FOR_DEPENDENCY', 'WAITING_FOR_RESOURCE']);
const operatorStates = new Set(['WAITING_FOR_APPROVAL', 'AUTHENTICATION_BLOCKED']);
const recoveringStates = new Set(['RECONNECTING', 'RETRY_PENDING']);
const cancellationStates = new Set(['CANCELLING', 'CANCEL_PENDING']);
const blockedStates = new Set(['BLOCKED', 'CLEANUP_UNCERTAIN', 'DISCONNECTED']);

function timestamp(value: string | null | undefined): number | null {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

function latest(values: Array<string | null | undefined>): string | null {
  let selected: string | null = null;
  let selectedTime = -Infinity;
  for (const value of values) {
    const parsed = timestamp(value);
    if (parsed !== null && parsed > selectedTime) { selected = value!; selectedTime = parsed; }
  }
  return selected;
}

function first(values: Array<string | null | undefined>, fallback: string): string {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() ?? fallback;
}

function ageMs(start: string | null | undefined, nowMs: number): number | null {
  const parsed = timestamp(start);
  return parsed === null ? null : Math.max(0, nowMs - parsed);
}

function isStale(value: string | null, nowMs: number, threshold: number): boolean {
  const parsed = timestamp(value);
  return parsed === null || nowMs - parsed >= threshold;
}

function count(statuses: string[], accepted: Set<string>): number { return statuses.filter(status => accepted.has(status)).length; }
function signal(state: DashboardCharacterState, label: string, value: number): DashboardCharacterSignal | null { return value > 0 ? {state, label, count: value} : null; }
function compactSignals(values: Array<DashboardCharacterSignal | null>): DashboardCharacterSignal[] { return values.filter((value): value is DashboardCharacterSignal => value !== null); }

function makeCharacter(identity: CharacterIdentity, input: Omit<DashboardCharacterProjection, keyof CharacterIdentity | 'stateLabel' | 'transitionKey'>): DashboardCharacterProjection {
  const transitionKey = [input.state, input.lastUpdatedAt ?? 'none', input.counts.active, input.counts.queued, input.counts.waiting, input.counts.blocked, input.counts.completed, input.counts.failed].join(':');
  return {...identity, ...input, stateLabel: labels[input.state], transitionKey};
}

function laneMaster(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const lanes = source.lanes ?? [], runs = [...(source.runs ?? []), ...(source.parameterizedRuns ?? [])], laneStatuses = lanes.map(item => item.status.toUpperCase()), runStatuses = runs.map(item => item.status.toUpperCase());
  const working = count(laneStatuses, new Set(['WORKING'])) + count(runStatuses, activeStates), queued = count(laneStatuses, new Set(['WAITING'])) + count(runStatuses, queuedStates), waiting = count(runStatuses, waitingStates), failed = count(laneStatuses, new Set(['ERROR'])) + count(runStatuses, new Set(['FAILED', 'DEGRADED']));
  const cancelling = lanes.filter(item => item.status === 'cancelled' && /request|confirm|cleanup/i.test(`${item.baton?.status ?? ''} ${item.baton?.nextAction ?? ''}`)).length + count(runStatuses, cancellationStates), cancelled = lanes.filter(item => item.status === 'cancelled' && !/request|confirm|cleanup/i.test(`${item.baton?.status ?? ''} ${item.baton?.nextAction ?? ''}`)).length + count(runStatuses, new Set(['CANCELLED']));
  const recovering = count(runStatuses, recoveringStates), operator = count(runStatuses, operatorStates) + (source.outstandingApprovals ?? 0), paused = laneStatuses.filter(status => status === 'PAUSED').length, blocked = paused + count(runStatuses, blockedStates);
  const handoff = latestActiveHandoff(source), updatedAt = latest([...lanes.map(item => item.lastMeaningfulActivity), ...runs.map(runUpdatedAt), handoff?.at]);
  let state: DashboardCharacterState = 'idle';
  if (source.paused) state = 'blocked';
  else if (handoff) state = 'handing_over';
  else if (working > 0) state = isStale(updatedAt, nowMs, staleAfterMs) ? 'stale' : 'working';
  else if (cancelling > 0) state = 'cancelling';
  else if (recovering > 0) state = 'recovering';
  else if (operator > 0) state = 'awaiting_operator';
  else if (blocked > 0) state = 'blocked';
  else if (waiting > 0) state = 'waiting';
  else if (queued > 0) state = 'queued';
  else if (failed > 0) state = 'failed';
  else if (cancelled > 0) state = 'cancelled';
  const summary = working > 0 ? `${working} active execution${working === 1 ? '' : 's'}; ${queued + waiting} waiting; ${blocked} blocked.` : source.paused ? 'Scheduling is paused; no new lane work may start.' : `${lanes.length} lane${lanes.length === 1 ? '' : 's'}; ${queued + waiting} waiting; ${blocked} blocked.`;
  const activeLane = lanes.find(item => item.status.toUpperCase() === 'WORKING');
  const activeRun = runs.find(item => activeStates.has(item.status.toUpperCase()));
  const current = activeLane ? [activeLane.name ?? (activeLane.id !== undefined ? `Lane ${activeLane.id}` : 'active lane'), activeLane.model, activeLane.executionTarget].filter(Boolean).join(' · ') : activeRun ? [activeRun.id, activeRun.modelRoute?.providerId, activeRun.modelRoute?.accountLabel, activeRun.modelRoute?.modelId].filter(Boolean).join(' · ') : null;
  const reason = state === 'stale' ? 'Active work is retained, but its latest authoritative update is stale.' : source.paused ? 'Agent Control is globally paused.' : first(runs.flatMap(item => item.steps?.map(step => step.waitingReason ?? step.error) ?? []), state === 'idle' ? 'No lane or Job is actively executing.' : 'Canonical lane and scheduler state selected this presentation.');
  const nextAction = state === 'awaiting_operator' ? 'Open the waiting Run or approval.' : state === 'blocked' ? 'Inspect the blocked lane or Run evidence.' : state === 'stale' ? 'Reconcile the execution before changing its status.' : 'Open Lanes for authoritative activity and controls.';
  return makeCharacter(identities['lane-master'], {state, summary, reason, nextAction, counts: {active: working, queued, waiting, blocked, completed: count(runStatuses, new Set(['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS'])), failed}, signals: compactSignals([signal('working', 'active', working), signal('queued', 'queued', queued), signal('waiting', 'waiting', waiting), signal('blocked', 'blocked', blocked), signal('recovering', 'retrying', recovering), signal('awaiting_operator', 'operator', operator), signal('failed', 'failed', failed)]), current, elapsedMs: maximumElapsed([...lanes.map(item => item.elapsedMs), ...runs.filter(run => activeStates.has(run.status)).map(run => ageMs(run.startedAt ?? run.requestedAt, nowMs))]), lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: lanes.length || runs.length ? 'live' : 'unavailable', source: 'canonical lane, scheduler and Run state', limitation: lanes.length || runs.length ? null : 'No lanes or Job runtime are configured.'}});
}

function promptReviewer(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const parcels = source.parcels ?? [], planning = parcels.filter(item => item.status === 'PLANNING'), queued = parcels.filter(item => item.status === 'QUEUED'), openQuestions = parcels.flatMap(item => item.context?.questions ?? []).filter(item => item.status === 'OPEN'), planningFailures = parcels.filter(item => item.audit?.timeline?.some(event => event.type === 'planning.failed'));
  const updatedAt = latest([...planning.map(item => item.updatedAt), ...queued.map(item => item.updatedAt), ...parcels.map(item => item.updatedAt)]);
  let state: DashboardCharacterState = openQuestions.length ? 'awaiting_operator' : planning.length ? 'reviewing' : queued.length ? 'queued' : planningFailures.length ? 'failed' : 'idle';
  if ((planning.length || queued.length) && isStale(updatedAt, nowMs, staleAfterMs)) state = 'stale';
  const summary = openQuestions.length ? `${openQuestions.length} explicit operator question${openQuestions.length === 1 ? '' : 's'} await an answer.` : planning.length ? `${planning.length} task prompt${planning.length === 1 ? ' is' : 's are'} in planning or readiness checks.` : 'Task entry is ready; no prompt is currently being planned.';
  return makeCharacter(identities['prompt-reviewer'], {state, summary, reason: openQuestions[0]?.text?.trim() || (planning.length ? 'Work Parcel planning is the only live prompt-readiness signal.' : 'There is no dedicated prompt-review agent or separate prompt-quality telemetry.'), nextAction: openQuestions.length ? 'Open Work Parcels and answer the recorded question.' : planning.length ? 'Open Work Parcels to inspect the plan and readiness evidence.' : 'Enter an objective with constraints and required evidence.', counts: {active: planning.length, queued: queued.length, waiting: openQuestions.length, blocked: 0, completed: parcels.filter(item => item.status === 'SUCCEEDED').length, failed: planningFailures.length}, signals: compactSignals([signal('reviewing', 'planning', planning.length), signal('queued', 'queued', queued.length), signal('awaiting_operator', 'questions', openQuestions.length), signal('failed', 'planning failures', planningFailures.length)]), current: planning[0]?.id ?? queued[0]?.id ?? null, elapsedMs: maximumElapsed(planning.map(item => ageMs(item.createdAt, nowMs))), lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: 'partial', source: 'Work Parcel planning and durable questions', limitation: 'Agent Control has no separately instrumented prompt-review worker; this character reports planning/readiness only.'}});
}

function parcelCoordinator(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const parcels = source.parcels ?? [], statuses = parcels.map(item => item.status), stages = parcels.flatMap(item => item.stages), stageStatuses = stages.map(item => item.status), runs = [...(source.runs ?? []), ...(source.parameterizedRuns ?? [])], runStatuses = runs.map(item => item.status), openQuestions = parcels.flatMap(item => item.context?.questions ?? []).filter(item => item.status === 'OPEN');
  const active = statuses.filter(item => item === 'RUNNING').length, queued = statuses.filter(item => ['PLANNING', 'QUEUED'].includes(item)).length, waiting = statuses.filter(item => item === 'WAITING').length, blocked = stageStatuses.filter(item => item === 'BLOCKED').length + count(runStatuses, blockedStates), failed = statuses.filter(item => item === 'FAILED').length, completed = statuses.filter(item => item === 'SUCCEEDED').length;
  const cancelling = count(runStatuses, cancellationStates), recovering = count(runStatuses, recoveringStates), handoff = latestActiveHandoff(source), activeParcels = parcels.filter(item => ['RUNNING', 'WAITING', 'PLANNING', 'QUEUED'].includes(item.status)), updatedAt = latest([...activeParcels.map(item => item.updatedAt), handoff?.at, ...parcels.map(item => item.updatedAt)]);
  let state: DashboardCharacterState = 'idle';
  if (handoff) state = 'handing_over';
  else if (active > 0) state = 'working';
  else if (cancelling > 0) state = 'cancelling';
  else if (recovering > 0) state = 'recovering';
  else if (openQuestions.length > 0) state = 'awaiting_operator';
  else if (blocked > 0) state = 'blocked';
  else if (waiting > 0) state = 'waiting';
  else if (queued > 0) state = 'queued';
  else if (failed > 0) state = 'failed';
  else if (statuses.includes('CANCELLED')) state = 'cancelled';
  else if (completed > 0) state = 'completed';
  if (activeParcels.length && isStale(updatedAt, nowMs, staleAfterMs)) state = 'stale';
  const activeStage = stages.find(item => ['RUNNING', 'WAITING'].includes(item.status)), route = activeStage?.actualRoute, routeLabel = route ? [route.provider, route.accountLabel ?? route.accountProfile, route.model].filter(Boolean).join(' / ') : '';
  const reason = state === 'stale' ? 'Active parcel state has not received a fresh authoritative update.' : handoff ? handoff.reason ?? 'A recorded baton handoff is in progress.' : first(stages.map(item => item.waitingReason ?? item.error), active ? 'A Work Parcel stage is executing.' : 'No Work Parcel is active.');
  const nextAction = state === 'awaiting_operator' ? 'Answer the durable Parcel question.' : state === 'blocked' || state === 'failed' ? 'Open the Parcel timeline and underlying Run evidence.' : state === 'stale' ? 'Reconcile the active Run before dispatching more work.' : 'Open Work Parcels for dependencies, batons and evidence.';
  return makeCharacter(identities['parcel-coordinator'], {state, summary: active ? `${active} parcel${active === 1 ? '' : 's'} moving; ${waiting + queued} waiting; ${blocked} blocked.` : `${parcels.length} parcel${parcels.length === 1 ? '' : 's'} tracked; ${completed} completed; ${failed} failed.`, reason, nextAction, counts: {active, queued, waiting, blocked, completed, failed}, signals: compactSignals([signal('working', 'active', active), signal('queued', 'queued', queued), signal('waiting', 'waiting', waiting), signal('blocked', 'blocked', blocked), signal('recovering', 'retrying', recovering), signal('awaiting_operator', 'questions', openQuestions.length), signal('failed', 'failed', failed)]), current: [activeParcels[0]?.id, routeLabel].filter(Boolean).join(' · ') || null, elapsedMs: maximumElapsed(activeParcels.map(item => ageMs(item.createdAt, nowMs))), lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: parcels.length ? 'live' : 'unavailable', source: 'durable Work Parcel, stage, baton and routing state', limitation: parcels.length ? null : 'No Work Parcels have been recorded.'}});
}

function modelScout(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const models = source.models ?? [], batches = source.modelBatches ?? [], running = batches.filter(item => item.status === 'RUNNING'), queued = batches.filter(item => item.status === 'QUEUED'), blockedBatches = batches.filter(item => ['BLOCKED', 'PARTIAL'].includes(item.status)), qualified = models.filter(item => item.enabled !== false && ['QUALIFIED', 'PREFERRED'].includes(item.qualificationState ?? '') && !['UNAVAILABLE', 'AUTHENTICATION_REQUIRED', 'DISABLED'].includes(item.accountAvailability ?? '')), unavailable = models.filter(item => item.enabled === false || ['UNAVAILABLE', 'AUTHENTICATION_REQUIRED', 'DISABLED'].includes(item.accountAvailability ?? ''));
  const updatedAt = latest([...running.map(item => item.startedAt ?? item.createdAt), ...queued.map(item => item.createdAt), ...batches.map(item => item.completedAt ?? item.startedAt ?? item.createdAt), ...models.map(item => item.checkedAt)]);
  let state: DashboardCharacterState = running.length ? 'working' : queued.length ? 'queued' : blockedBatches.length ? 'blocked' : models.length === 0 ? 'unknown' : qualified.length === 0 ? 'blocked' : 'idle';
  if (running.length && isStale(updatedAt, nowMs, staleAfterMs)) state = 'stale';
  const summary = running.length ? `${running.length} frozen model evaluation${running.length === 1 ? '' : 's'} running; ${queued.length} queued.` : `${qualified.length} of ${models.length} configured model route${models.length === 1 ? '' : 's'} currently qualified.`;
  return makeCharacter(identities['model-scout'], {state, summary, reason: models.length ? (blockedBatches.length ? 'A qualification batch is blocked or partial; its evidence remains authoritative.' : 'Registry qualification and frozen evaluation state drive this view.') : 'No model registry entries are available to inspect.', nextAction: running.length || queued.length ? 'Open Models to inspect the frozen evaluation queue.' : qualified.length ? 'Open Models to compare qualification and benchmark evidence.' : 'Configure and qualify a model route before automatic selection.', counts: {active: running.length, queued: queued.length, waiting: 0, blocked: blockedBatches.length + unavailable.length, completed: qualified.length, failed: batches.filter(item => item.status === 'FAILED').length}, signals: compactSignals([signal('working', 'evaluating', running.length), signal('queued', 'queued', queued.length), signal('blocked', 'unavailable', unavailable.length + blockedBatches.length), signal('completed', 'qualified', qualified.length)]), current: running[0]?.id ?? ([qualified[0]?.provider, qualified[0]?.id].filter(Boolean).join(' / ') || null), elapsedMs: maximumElapsed(running.map(item => ageMs(item.startedAt ?? item.createdAt, nowMs))), lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: models.length || batches.length ? 'live' : 'unavailable', source: 'model registry and frozen qualification ledger', limitation: models.length || batches.length ? null : 'The model registry or intelligence projection has no entries.'}});
}

function resourceGuardian(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const systems = source.systems ?? [], execution = systems.map(item => item.execution), available = execution.filter(item => item === 'AVAILABLE').length, busy = execution.filter(item => item === 'BUSY').length, degraded = execution.filter(item => item === 'DEGRADED').length, auth = execution.filter(item => item === 'AUTH REQUIRED').length, offline = execution.filter(item => item === 'OFFLINE').length, unknown = execution.filter(item => item === 'UNKNOWN').length;
  const memoryPressure = systems.filter(item => { const total = item.node?.memory?.totalBytes, availableBytes = item.node?.memory?.availableBytes; return typeof total === 'number' && total > 0 && typeof availableBytes === 'number' && availableBytes / total < .1; }).length, storagePressure = systems.filter(item => item.node?.storage?.some(value => typeof value.usedPercent === 'number' && value.usedPercent >= 90)).length, pressure = busy + degraded + memoryPressure + storagePressure;
  const updatedAt = latest(systems.flatMap(item => [item.node?.lastProbeAt, item.lastCheckAt, item.lastSuccessfulProbeAt])), active = systems.reduce((total, item) => total + (typeof item.active === 'number' ? item.active : item.node?.currentWorkload ? 1 : 0), 0), supposedlyLive = systems.some(item => ['AVAILABLE', 'BUSY', 'DEGRADED'].includes(item.execution));
  let state: DashboardCharacterState = systems.length === 0 ? 'unknown' : pressure > 0 ? 'resource_pressure' : active > 0 ? 'working' : auth > 0 ? 'awaiting_operator' : offline > 0 && available === 0 ? 'offline' : unknown === systems.length ? 'unknown' : 'idle';
  if (supposedlyLive && isStale(updatedAt, nowMs, staleAfterMs)) state = 'stale';
  const reason = state === 'stale' ? 'The last readiness observation is stale; no failure is inferred.' : first(systems.filter(item => item.execution !== 'AVAILABLE').map(item => item.blockingReason), state === 'idle' ? 'No resource pressure is reported.' : 'Canonical readiness and capacity observations selected this presentation.');
  const nextAction = auth ? 'Open Systems and resolve the recorded authentication requirement.' : state === 'offline' || state === 'stale' || state === 'resource_pressure' ? 'Open Systems for the source measurement and readiness blocker.' : 'Open Systems for current capacity and probe evidence.';
  const currentSystem = systems.find(item => item.node?.currentWorkload) ?? systems.find(item => ['BUSY', 'DEGRADED', 'OFFLINE', 'AUTH REQUIRED'].includes(item.execution));
  return makeCharacter(identities['resource-guardian'], {state, summary: `${available} available; ${busy} busy; ${degraded} degraded; ${offline} offline; ${unknown} unknown.`, reason, nextAction, counts: {active, queued: 0, waiting: busy, blocked: degraded + auth + offline, completed: available, failed: offline}, signals: compactSignals([signal('working', 'active workloads', active), signal('resource_pressure', 'pressure', pressure), signal('awaiting_operator', 'auth required', auth), signal('offline', 'offline', offline), signal('unknown', 'unknown', unknown)]), current: [currentSystem?.name ?? currentSystem?.id, currentSystem?.node?.currentWorkload].filter(Boolean).join(' · ') || null, elapsedMs: null, lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: systems.length ? 'live' : 'unavailable', source: 'canonical Systems readiness and managed-node measurements', limitation: systems.length ? null : 'No machines, providers or services are configured.'}});
}

function qualityInspector(source: DashboardCharacterSource, nowMs: number, staleAfterMs: number): DashboardCharacterProjection {
  const runs = [...(source.runs ?? []), ...(source.parameterizedRuns ?? [])], statuses = runs.map(item => item.status), steps = runs.flatMap(item => item.steps ?? []), stepStatuses = steps.map(item => item.status), lanePhases = (source.lanes ?? []).map(item => item.verification?.phase ?? '');
  const reviewing = count(statuses, new Set(['VERIFYING', 'VALIDATING'])) + count(stepStatuses, new Set(['VERIFYING'])) + lanePhases.filter(item => ['claimed', 'evidence_collected'].includes(item)).length, queued = count(statuses, new Set(['QUEUED', 'SCHEDULED', 'RUNNING', 'RESOLVING'])), cancelling = count(statuses, cancellationStates) + count(stepStatuses, cancellationStates), blocked = count(statuses, blockedStates) + count(stepStatuses, blockedStates), completed = count(statuses, new Set(['SUCCEEDED', 'SUCCEEDED_WITH_FINDINGS'])) + lanePhases.filter(item => ['verified', 'accepted'].includes(item)).length, failed = count(statuses, new Set(['FAILED', 'DEGRADED'])) + count(stepStatuses, new Set(['FAILED', 'TIMED_OUT'])), cancelled = count(statuses, new Set(['CANCELLED']));
  const activeRuns = runs.filter(item => activeStates.has(item.status) || item.steps?.some(step => activeStates.has(step.status))), updatedAt = latest(runs.map(runUpdatedAt));
  let state: DashboardCharacterState = reviewing > 0 ? 'reviewing' : cancelling > 0 ? 'cancelling' : blocked > 0 ? 'blocked' : failed > 0 ? 'failed' : cancelled > 0 ? 'cancelled' : completed > 0 ? 'completed' : queued > 0 ? 'queued' : 'idle';
  if (activeRuns.length && isStale(updatedAt, nowMs, staleAfterMs)) state = 'stale';
  const reason = state === 'stale' ? 'A non-terminal Run lacks a fresh authoritative update; failure is not inferred.' : first([...steps.map(item => item.waitingReason ?? item.error), ...runs.flatMap(item => item.errors ?? [])], reviewing ? 'Independent validation or evidence collection is active.' : 'No validation failure is currently recorded.');
  const nextAction = ['failed', 'blocked', 'stale'].includes(state) ? 'Open Run evidence and the exact failing or missing check.' : reviewing ? 'Open the active Run to follow verification evidence.' : 'Open Run History for durable validation evidence.';
  const currentRun = activeRuns[0];
  return makeCharacter(identities['quality-inspector'], {state, summary: reviewing ? `${reviewing} validation check${reviewing === 1 ? '' : 's'} active; ${failed} failed; ${blocked} blocked.` : `${completed} verified outcome${completed === 1 ? '' : 's'}; ${failed} failed; ${blocked} blocked.`, reason, nextAction, counts: {active: reviewing, queued, waiting: 0, blocked, completed, failed}, signals: compactSignals([signal('reviewing', 'validating', reviewing), signal('queued', 'awaiting checks', queued), signal('blocked', 'blocked', blocked), signal('failed', 'failed', failed), signal('completed', 'verified', completed)]), current: currentRun ? [currentRun.id, currentRun.modelRoute?.providerId, currentRun.modelRoute?.accountLabel, currentRun.modelRoute?.modelId].filter(Boolean).join(' · ') || null : null, elapsedMs: maximumElapsed(activeRuns.map(item => ageMs(item.startedAt ?? item.requestedAt, nowMs))), lastUpdatedAt: updatedAt, freshness: state === 'stale' ? 'stale' : updatedAt ? 'current' : 'unknown', instrumentation: {coverage: runs.length || lanePhases.some(Boolean) ? 'live' : 'unavailable', source: 'Run, step and independent verification state', limitation: runs.length || lanePhases.some(Boolean) ? null : 'No Run or verification evidence has been recorded.'}});
}

function runUpdatedAt(run: RunSource): string | null | undefined { return run.updatedAt ?? run.completedAt ?? run.endedAt ?? run.startedAt ?? run.requestedAt ?? run.recovery?.observedAt; }
function maximumElapsed(values: Array<number | null | undefined>): number | null { const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)); return finite.length ? Math.max(...finite) : null; }

function latestActiveHandoff(source: DashboardCharacterSource): TokenDecisionSource | null {
  const activeThreads = new Set((source.tokenRouting?.threads ?? []).filter(item => item.active).map(item => item.id));
  const latestByThread = new Map<string, TokenDecisionSource>();
  for (const decision of [...(source.tokenRouting?.decisions ?? [])].reverse()) {
    if (decision.action !== 'BATON_AND_HANDOFF' || !activeThreads.has(decision.threadId) || latestByThread.has(decision.threadId)) continue;
    latestByThread.set(decision.threadId, decision);
  }
  return [...latestByThread.values()].filter(item => item.outcome === 'RECORDED').sort((left, right) => (timestamp(right.at) ?? 0) - (timestamp(left.at) ?? 0))[0] ?? null;
}

export function projectDashboardCharacterCrew(source: DashboardCharacterSource): DashboardCharacterCrewProjection {
  const nowMs = timestamp(source.observedAt) ?? Date.now(), staleAfterMs = source.staleAfterMs ?? DASHBOARD_CHARACTER_STALE_AFTER_MS;
  return {
    schema: DASHBOARD_CHARACTER_CREW_SCHEMA,
    observedAt: source.observedAt,
    staleAfterMs,
    members: [laneMaster(source, nowMs, staleAfterMs), promptReviewer(source, nowMs, staleAfterMs), parcelCoordinator(source, nowMs, staleAfterMs), modelScout(source, nowMs, staleAfterMs), resourceGuardian(source, nowMs, staleAfterMs), qualityInspector(source, nowMs, staleAfterMs)],
  };
}
