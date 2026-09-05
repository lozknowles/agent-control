import type {LaneState} from '../state.js';
import type {RouteDecision} from './routing.js';
import type {ParameterizedJobRun, SavedJob} from './parameterized-job-types.js';
import {DEFAULT_TOKEN_GOVERNOR_POLICY, governorFor, type TokenGovernorPolicy, type VerifiedBaton, type TokenRoutingDecision, type ThreadTokenRecord} from './token-aware-baton-routing.js';
import type {WorkParcel} from './work-parcels.js';

export type ExecutionHistoryActor = 'OPERATOR' | 'SYSTEM EVENT' | 'AGENT / PROVIDER' | 'TOOL / ACTION' | 'GOVERNOR' | 'BATON' | 'ERROR';
export type ExecutionHistoryOutcome = 'INFO' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RECOMMENDED' | 'UNAVAILABLE';

export interface ExecutionHistoryTelemetry {
  inputTokens: number | null;
  freshInputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  contextTokens: number | null;
  contextLimitTokens: number | null;
  contextPercent: number | null;
  contextAuthority: 'authoritative' | 'estimated' | 'unavailable';
  cost: number | null;
  currency: string | null;
  costAuthority: 'authoritative' | 'estimated' | 'unavailable';
  governorState: string | null;
}

export interface ExecutionHistoryEntry {
  id: string;
  at: string;
  actor: ExecutionHistoryActor;
  type: string;
  title: string;
  content: string;
  outcome: ExecutionHistoryOutcome;
  jobRunId?: string;
  workParcelId?: string;
  laneId?: number;
  provider?: string;
  accountLabel?: string;
  model?: string;
  route?: string;
  evidenceRefs?: string[];
  telemetry?: ExecutionHistoryTelemetry;
}

export interface ExecutionHistoryProjection {
  schema: 'agent-control.execution-history/v1';
  jobRunId: string;
  savedJobId: string | null;
  jobName: string;
  workParcelIds: string[];
  entries: ExecutionHistoryEntry[];
  retention: {mode: 'derived-durable'; maximumEntries: number; source: string};
}

export interface TokenHistoryEvidence {
  policy?: TokenGovernorPolicy;
  threads: ThreadTokenRecord[];
  batons: VerifiedBaton[];
  decisions: TokenRoutingDecision[];
}

const MAX_ENTRIES = 160;
const SECRET_VALUE = /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g;
const AUTH_VALUE = /\bbearer\s+[^\s,;]+|\b(?:authorization|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|password|secret)\s*[:=]\s*[^\s,;]+/gi;
const CODEX_PATH = /\bCODEX_HOME\s*[:=]\s*[^\s,;]+|[A-Za-z]:\\Users\\[^\s]+\\(?:\.local\\share\\agent-control\\)?codex-profiles\\[^\s]+/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function safeHistoryText(value: unknown, maximum = 1_600) {
  const text = String(value ?? '').replace(SECRET_VALUE, '[REDACTED]').replace(AUTH_VALUE, '[REDACTED]').replace(CODEX_PATH, '[REDACTED]').replace(EMAIL, '[REDACTED]').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

export function projectParameterizedRunHistory(input: {run: ParameterizedJobRun; savedJob?: SavedJob; parcels: WorkParcel[]; tokenEvidence?: TokenHistoryEvidence}): ExecutionHistoryProjection {
  const {run, savedJob} = input, parcels = input.parcels.filter(parcel => run.workParcelIds.includes(parcel.id));
  const parcelIds = new Set(run.workParcelIds), threads = (input.tokenEvidence?.threads ?? []).filter(thread => parcelIds.has(thread.parcelId));
  const batons = (input.tokenEvidence?.batons ?? []).filter(baton => parcelIds.has(baton.parcelId));
  const decisions = (input.tokenEvidence?.decisions ?? []).filter(decision => parcelIds.has(decision.parcelId));
  const entries: ExecutionHistoryEntry[] = [];
  const add = (entry: ExecutionHistoryEntry) => entries.push({...entry, title: safeHistoryText(entry.title, 240), content: safeHistoryText(entry.content), accountLabel: entry.accountLabel ? safeHistoryText(entry.accountLabel, 120) : undefined, route: entry.route ? safeHistoryText(entry.route, 320) : undefined, evidenceRefs: entry.evidenceRefs?.map(value => safeHistoryText(value, 256))});
  const jobName = savedJob?.name ?? run.definition.displayName;

  add({id: `${run.id}:requested`, at: run.requestedAt, actor: 'OPERATOR', type: 'JOB_REQUEST', title: `${jobName} requested`, content: `${run.definition.description} Scope ${String(run.resolvedParameters.scope ?? 'configured')}; requested ref ${String(run.resolvedParameters.ref ?? 'configured')}.`, outcome: 'INFO', jobRunId: run.id});
  for (const transition of run.transitions) add({id: `${run.id}:transition:${transition.at}:${transition.status}`, at: transition.at, actor: transition.status === 'FAILED' ? 'ERROR' : 'SYSTEM EVENT', type: `JOB_${transition.status}`, title: transitionTitle(transition.status), content: transition.detail ? transitionDetail(transition.detail) : transitionSummary(transition.status), outcome: transitionOutcome(transition.status), jobRunId: run.id});

  if (run.repository) add({id: `${run.id}:repository`, at: run.startedAt ?? run.requestedAt, actor: 'TOOL / ACTION', type: 'REPOSITORY_SNAPSHOT', title: 'Immutable repository revision resolved', content: `${run.repository.name} at ${run.repository.reviewedSha}; requested ref ${run.repository.requestedRef}; ${run.repository.dirty ? 'frozen dirty state recorded' : 'snapshot clean'}.`, outcome: 'SUCCEEDED', jobRunId: run.id, evidenceRefs: [run.repository.reviewedSha]});
  if (run.context) add({id: `${run.id}:context`, at: run.startedAt ?? run.requestedAt, actor: 'TOOL / ACTION', type: 'CONTEXT_COMPILED', title: `${run.context.profile} review context compiled`, content: `${run.context.chunks.length} bounded chunk(s), ${run.context.files.length} file(s), ${run.context.omittedFiles.length} omitted file(s). Provider input is represented by the governed instruction and frozen context manifest; raw repository context is not duplicated into transcript storage.`, outcome: 'SUCCEEDED', jobRunId: run.id, evidenceRefs: run.context.chunks.map(chunk => chunk.sha256)});
  if (run.modelRoute) {
    const route = routeLabel(run);
    add({id: `${run.id}:route`, at: run.startedAt ?? run.requestedAt, actor: 'SYSTEM EVENT', type: 'ROUTE_SELECTED', title: 'Qualified provider route selected', content: `${route}. Qualification ${run.modelRoute.qualificationVersion}; fallback ${run.modelRoute.fallback ? `yes — ${run.modelRoute.fallbackReason ?? 'reason unavailable'}` : 'no'}.`, outcome: 'SUCCEEDED', jobRunId: run.id, provider: run.modelRoute.providerId, accountLabel: run.modelRoute.accountLabel ?? undefined, model: run.modelRoute.modelId, route});
    add({id: `${run.id}:provider-request`, at: run.startedAt ?? run.requestedAt, actor: 'AGENT / PROVIDER', type: 'PROVIDER_REQUEST', title: 'Read-only structured review requested', content: `${run.definition.template.instruction.split('\n')[0]} Input used ${run.context?.chunks.length ?? 0} frozen context chunk(s). Credentials, environment values, hidden reasoning, and raw prompt payloads are not retained in this human-readable projection.`, outcome: run.status === 'RUNNING' ? 'RUNNING' : 'INFO', jobRunId: run.id, provider: run.modelRoute.providerId, accountLabel: run.modelRoute.accountLabel ?? undefined, model: run.modelRoute.modelId, route});
  }

  for (const parcel of parcels) {
    for (const event of parcel.audit.timeline) add({id: `${run.id}:parcel:${event.id}`, at: event.at, actor: parcelActor(event.type), type: `PARCEL_${event.type.toUpperCase().replaceAll('.', '_')}`, title: event.summary, content: event.detail, outcome: parcelEventOutcome(event.type), jobRunId: run.id, workParcelId: parcel.id});
  }

  for (const thread of threads) {
    const first = thread.samples[0], last = thread.latest, route = threadRoute(thread);
    const policy = input.tokenEvidence?.policy ?? DEFAULT_TOKEN_GOVERNOR_POLICY, firstGovernor = governorFor(first.contextPercent, policy).state, lastGovernor = governorFor(last.contextPercent, policy).state;
    add({id: `${run.id}:telemetry-start:${thread.id}`, at: first.at, actor: 'SYSTEM EVENT', type: 'TELEMETRY_STARTED', title: first.context.authority === 'unavailable' ? 'Live token measurement pending provider completion' : 'Live token measurement started', content: telemetryText(first, firstGovernor, true), outcome: first.context.authority === 'unavailable' ? 'UNAVAILABLE' : 'INFO', jobRunId: run.id, workParcelId: thread.parcelId, provider: thread.providerId, accountLabel: thread.accountLabel, model: thread.modelId, route, telemetry: telemetry(first, firstGovernor)});
    if (last.at !== first.at || last.cumulative.totalTokens !== first.cumulative.totalTokens) add({id: `${run.id}:telemetry-end:${thread.id}`, at: last.at, actor: 'SYSTEM EVENT', type: 'TELEMETRY_RECORDED', title: 'Provider usage and context estimate recorded', content: telemetryText(last, lastGovernor, false), outcome: 'SUCCEEDED', jobRunId: run.id, workParcelId: thread.parcelId, provider: thread.providerId, accountLabel: thread.accountLabel, model: thread.modelId, route, telemetry: telemetry(last, lastGovernor)});
  }

  for (const decision of decisions) add(governorEntry(run.id, decision, threads.find(thread => thread.id === decision.threadId)));
  for (const baton of batons) add({id: `${run.id}:baton:${baton.id}`, at: baton.createdAt, actor: 'BATON', type: 'BATON_CREATED', title: 'Verified baton created and sealed', content: `Objective: ${baton.objective}. Next action: ${baton.nextAction}. SHA-256 ${baton.sha256}. Creation does not by itself mean dispatch, acceptance, destination execution, or completed handoff.`, outcome: 'SUCCEEDED', jobRunId: run.id, workParcelId: baton.parcelId, provider: baton.providerId, accountLabel: baton.accountLabel, model: baton.modelId, evidenceRefs: [baton.id, baton.sha256]});

  if (run.providerResponseIds.length || run.evidence.some(value => value.startsWith('provider_response_'))) {
    const refs = [...new Set([...run.providerResponseIds, ...run.evidence.filter(value => value.startsWith('provider_response_'))])];
    const schemaError = run.errors.find(value => /repository_review_provider_(?:json|schema)_invalid/.test(value)), failedSchema = Boolean(schemaError);
    const diagnostic = schemaError?.startsWith('repository_review_provider_schema_invalid:') ? ` Safe failing constraints: ${schemaError.split(':').slice(1).join(':')}.` : failedSchema ? ' This historical record predates path-level schema diagnostics, so the exact rejected field is unavailable.' : '';
    add({id: `${run.id}:provider-response`, at: run.completedAt ?? run.transitions.at(-1)?.at ?? run.requestedAt, actor: failedSchema ? 'ERROR' : 'AGENT / PROVIDER', type: failedSchema ? 'PROVIDER_RESPONSE_REJECTED' : 'PROVIDER_RESPONSE', title: failedSchema ? 'Provider output rejected by the validation boundary' : 'Provider output recorded', content: failedSchema ? `The provider returned output and accounting evidence was retained, but the response did not satisfy the repository-review schema. Agent Control failed closed.${diagnostic} Raw rejected output is not exposed through the transcript.` : run.result ? run.result.executiveSummary : 'Provider response evidence was retained by hash; no validated human-readable result is available.', outcome: failedSchema ? 'FAILED' : 'SUCCEEDED', jobRunId: run.id, provider: run.modelRoute?.providerId, accountLabel: run.modelRoute?.accountLabel ?? undefined, model: run.modelRoute?.modelId, evidenceRefs: refs});
  }

  if (run.usage.totalTokens !== undefined || run.usage.cost !== undefined) {
    const parcelTotal = sumParcelUsage(parcels);
    const reconciled = parcelTotal.totalTokens === run.usage.totalTokens && amountsEqual(parcelTotal.cost, run.usage.cost ?? null);
    const parcelInput = parcelTotal.inputTokens === null
      ? `${number(parcelTotal.freshInputTokens)} reported/fresh input; cached-input component unavailable`
      : `${number(parcelTotal.inputTokens)} input (${number(parcelTotal.freshInputTokens)} fresh + ${number(parcelTotal.cachedInputTokens)} cached)`;
    const jobInput = run.usage.freshInputTokens === undefined || run.usage.cachedInputTokens === undefined ? `${number(run.usage.inputTokens)} input; fresh/cache split unavailable` : `${number(run.usage.inputTokens)} input (${number(run.usage.freshInputTokens)} fresh + ${number(run.usage.cachedInputTokens)} cached)`;
    add({id: `${run.id}:ledger`, at: run.completedAt ?? run.transitions.at(-1)?.at ?? run.requestedAt, actor: 'SYSTEM EVENT', type: 'LEDGER_RECONCILIATION', title: reconciled ? 'Job and Work Parcel accounting reconcile' : 'Accounting reconciliation incomplete', content: `Job ledger: ${jobInput} + ${number(run.usage.outputTokens)} output = ${number(run.usage.totalTokens)} total; ${money(run.usage.cost ?? null, run.usage.currency ?? null)}. Work Parcel ledger: ${parcelInput} + ${number(parcelTotal.outputTokens)} output = ${number(parcelTotal.totalTokens)} total; ${money(parcelTotal.cost, parcelTotal.currency)}.`, outcome: reconciled ? 'SUCCEEDED' : 'UNAVAILABLE', jobRunId: run.id, evidenceRefs: run.workParcelIds});
  }

  const ordered = entries.sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id)).slice(-MAX_ENTRIES);
  return {schema: 'agent-control.execution-history/v1', jobRunId: run.id, savedJobId: run.savedJobId ?? null, jobName, workParcelIds: [...run.workParcelIds], entries: ordered, retention: {mode: 'derived-durable', maximumEntries: MAX_ENTRIES, source: 'Job Run + Work Parcel audit + token/governor/baton evidence'}};
}

export function projectLaneHistory(lane: LaneState, route?: RouteDecision): ExecutionHistoryEntry[] {
  const at = lane.contract.updatedAt || lane.baton.updatedAt;
  const entries: ExecutionHistoryEntry[] = [{id: `lane:${lane.id}:objective`, at, actor: 'OPERATOR', type: 'LANE_OBJECTIVE', title: `${lane.name} objective`, content: safeHistoryText(lane.contract.goal), outcome: lane.contract.goal === 'Await task' ? 'UNAVAILABLE' : 'INFO', laneId: lane.id}];
  lane.lines.forEach((line, index) => entries.push({id: `lane:${lane.id}:line:${index}`, at, actor: line.startsWith('>') ? 'OPERATOR' : 'SYSTEM EVENT', type: 'LANE_ACTIVITY', title: line.startsWith('>') ? 'Task instruction' : 'Lane activity', content: safeHistoryText(line.replace(/^>\s*/, '')), outcome: 'INFO', laneId: lane.id}));
  entries.push({id: `lane:${lane.id}:baton:${lane.baton.revision}`, at: lane.baton.updatedAt, actor: 'BATON', type: 'LANE_BATON_STATE', title: `Baton revision ${lane.baton.revision}`, content: `${lane.baton.status}. Next action: ${lane.baton.nextAction}. This is lane baton state, not proof of a completed provider handoff.`, outcome: 'INFO', laneId: lane.id});
  if (route) entries.push({id: `lane:${lane.id}:route`, at, actor: 'SYSTEM EVENT', type: 'LANE_ROUTE', title: 'Lane route selected', content: route.rationale.map(item => item.detail).join('; '), outcome: 'INFO', laneId: lane.id, provider: route.selected.providerId, model: route.selected.model, route: route.selected.id});
  if (lane.verification?.failureReasons.length) entries.push({id: `lane:${lane.id}:verification-error`, at, actor: 'ERROR', type: 'VERIFICATION_FAILED', title: 'Verification failed closed', content: lane.verification.failureReasons.join('; '), outcome: 'FAILED', laneId: lane.id});
  return entries.map(entry => ({...entry, title: safeHistoryText(entry.title, 240), content: safeHistoryText(entry.content), route: entry.route ? safeHistoryText(entry.route, 320) : undefined})).sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id)).slice(-MAX_ENTRIES);
}

function governorEntry(runId: string, decision: TokenRoutingDecision, thread?: ThreadTokenRecord): ExecutionHistoryEntry {
  const route = thread ? threadRoute(thread) : undefined;
  let type = 'GOVERNOR_DECISION', title = `Governor ${decision.state}: ${decision.action}`, outcome: ExecutionHistoryOutcome = 'INFO';
  let clarification = '';
  if (decision.state === 'HANDOFF' && decision.action !== 'BATON_AND_HANDOFF') { type = 'HANDOFF_RECOMMENDED'; title = 'Handoff threshold reached; handoff not performed'; outcome = 'RECOMMENDED'; clarification = ' HANDOFF is the governor recommendation state; the selected action retained continuation on the current route.'; }
  if (decision.action === 'BATON_AND_HANDOFF' && decision.outcome === 'RECORDED') { type = 'HANDOFF_REQUESTED'; title = 'Governed handoff requested'; outcome = 'RECOMMENDED'; clarification = ' A request is not proof of dispatch, acceptance, destination execution, or completion.'; }
  if (decision.action === 'BATON_AND_HANDOFF' && decision.outcome === 'SUCCEEDED') { type = 'HANDOFF_COMPLETED'; title = 'Governed handoff completed'; outcome = 'SUCCEEDED'; }
  if (decision.outcome === 'FAILED') { type = 'HANDOFF_FAILED'; title = 'Governed handoff failed; source remains recoverable'; outcome = 'FAILED'; clarification = ' The handoff is not marked complete and the source thread remains recoverable.'; }
  return {id: `${runId}:governor:${decision.id}`, at: decision.at, actor: 'GOVERNOR', type, title, content: `State ${decision.state}; action ${decision.action}; outcome ${decision.outcome}; reason ${decision.reason}.${clarification}`, outcome, jobRunId: runId, workParcelId: decision.parcelId, provider: thread?.providerId, accountLabel: thread?.accountLabel, model: thread?.modelId, route, evidenceRefs: [decision.id, ...(decision.batonId ? [decision.batonId] : [])]};
}

function telemetry(point: ThreadTokenRecord['latest'], governorState: string): ExecutionHistoryTelemetry { return {inputTokens: point.cumulative.inputTokens, freshInputTokens: point.cumulative.freshInputTokens, cachedInputTokens: point.cumulative.cachedInputTokens, outputTokens: point.cumulative.outputTokens, totalTokens: point.cumulative.totalTokens, contextTokens: point.context.tokens, contextLimitTokens: point.context.limitTokens, contextPercent: point.contextPercent, contextAuthority: point.context.authority, cost: point.cost.amount, currency: point.cost.currency, costAuthority: point.cost.authority, governorState}; }
function telemetryText(point: ThreadTokenRecord['latest'], governorState: string, initial: boolean) { const context = point.context.tokens === null ? `current context unavailable (${point.context.source})` : `${number(point.context.tokens)} / ${number(point.context.limitTokens)} tokens, ${point.contextPercent === null ? 'percentage unavailable' : `${point.contextPercent.toFixed(2)}% displayed`}, ${point.context.authority}`; const clamp = point.context.authority === 'estimated' && point.context.tokens !== null && point.context.limitTokens !== null && point.context.tokens > point.context.limitTokens ? ' The displayed percentage is an Agent Control estimate clamped at 100%, not an exact provider-reported occupancy.' : ''; return `${initial ? 'Initial sample' : 'Latest sample'}: ${context}.${clamp} Lifetime usage: ${number(point.cumulative.inputTokens)} input (${number(point.cumulative.freshInputTokens)} fresh + ${number(point.cumulative.cachedInputTokens)} cached), ${number(point.cumulative.outputTokens)} output, ${number(point.cumulative.totalTokens)} total. Cached input remains part of total input and is not subtracted from context occupancy. Cost ${money(point.cost.amount, point.cost.currency)} (${point.cost.authority}). Governor ${governorState}.`; }
function routeLabel(run: ParameterizedJobRun) { const route = run.modelRoute!; return `${route.providerId} / ${route.accountLabel ?? route.accountProfileId ?? 'default account'} / ${route.modelId} @ ${route.providerExecutionNodeId}`; }
function threadRoute(thread: ThreadTokenRecord) { return `${thread.providerId} / ${thread.accountLabel ?? thread.accountProfileId ?? 'default account'} / ${thread.modelId} @ ${thread.providerExecutionNodeId ?? thread.nodeId ?? 'controller'}`; }
function transitionTitle(status: ParameterizedJobRun['status']) { return ({QUEUED: 'Job queued', SCHEDULED: 'Job scheduled', RESOLVING: 'Resolving immutable target and route', RUNNING: 'Provider execution started', VALIDATING: 'Independent validation started', SUCCEEDED: 'Job completed successfully', SUCCEEDED_WITH_FINDINGS: 'Job completed with validated findings', FAILED: 'Job failed closed', CANCELLED: 'Job cancelled', DEGRADED: 'Job completed with degraded verification'} as Record<string, string>)[status] ?? status; }
function transitionSummary(status: ParameterizedJobRun['status']) { return ({QUEUED: 'Awaiting the governed scheduler.', RESOLVING: 'Resolving the immutable repository revision, execution node, provider route, and bounded context.', RUNNING: 'The selected provider is executing the read-only structured review.', VALIDATING: 'Agent Control is validating provider output independently.', SUCCEEDED: 'The validated result passed.', SUCCEEDED_WITH_FINDINGS: 'The validated result contains findings.', FAILED: 'Agent Control stopped and retained evidence.', CANCELLED: 'Execution stopped through the governed cancellation path.', DEGRADED: 'Verification could not fully accept the result.'} as Record<string, string>)[status] ?? status; }
function transitionDetail(detail: string) { if (detail.startsWith('repository_review_provider_schema_invalid')) { const paths = detail.split(':').slice(1).join(':'); return `Provider output existed but did not satisfy the required repository-review schema${paths ? ` at ${paths}` : ''}; Agent Control failed closed and retained accounting/evidence hashes.`; } return detail.replaceAll('_', ' '); }
function transitionOutcome(status: ParameterizedJobRun['status']): ExecutionHistoryOutcome { if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED'; if (status === 'SUCCEEDED' || status === 'SUCCEEDED_WITH_FINDINGS') return 'SUCCEEDED'; if (status === 'RUNNING' || status === 'VALIDATING') return 'RUNNING'; return 'INFO'; }
function parcelActor(type: string): ExecutionHistoryActor { if (type.includes('invocation')) return 'AGENT / PROVIDER'; if (type.includes('failed')) return 'ERROR'; if (type.includes('verification') || type.includes('route')) return 'SYSTEM EVENT'; return 'TOOL / ACTION'; }
function parcelEventOutcome(type: string): ExecutionHistoryOutcome { return type.includes('failed') ? 'FAILED' : type.includes('completed') || type.includes('found') || type.includes('resolved') ? 'SUCCEEDED' : 'INFO'; }
function sumParcelUsage(parcels: WorkParcel[]) { const sum = (values: Array<number | null>) => values.length && values.every((value): value is number => value !== null) ? values.reduce((total, value) => total + value, 0) : null; const currencies = [...new Set(parcels.map(parcel => parcel.telemetry.currency).filter((value): value is string => Boolean(value)))]; const freshInputTokens = sum(parcels.map(parcel => parcel.telemetry.freshInputTokens)); const cachedInputTokens = sum(parcels.map(parcel => parcel.telemetry.cachedInputTokens)); const recordedInput = sum(parcels.map(parcel => parcel.telemetry.inputTokens === undefined ? parcel.telemetry.freshInputTokens === null || parcel.telemetry.cachedInputTokens === null ? null : parcel.telemetry.freshInputTokens + parcel.telemetry.cachedInputTokens : parcel.telemetry.inputTokens)); return {freshInputTokens, cachedInputTokens, inputTokens: recordedInput, outputTokens: sum(parcels.map(parcel => parcel.telemetry.outputTokens)), totalTokens: sum(parcels.map(parcel => parcel.telemetry.totalTokens)), cost: sum(parcels.map(parcel => parcel.telemetry.cost)), currency: currencies.length === 1 ? currencies[0] : null}; }
function number(value?: number | null) { return value === null || value === undefined ? 'unavailable' : value.toLocaleString('en-GB'); }
function money(value: number | null, currency: string | null) { return value === null ? 'unavailable' : `${value.toFixed(6)} ${currency ?? ''}`.trim(); }
function amountsEqual(left: number | null, right: number | null) { return left === right || left !== null && right !== null && Math.abs(left - right) < 1e-12; }
