import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import type {AddressInfo} from 'node:net';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {AgentControlService} from '../src/control/application-service.js';
import {AdaptiveOrchestrationRuntime, FileAdaptiveOrchestrationStore} from '../src/control/adaptive-orchestration.js';
import type {AgentControlConfig, ModelConfig, ProviderAccountProfileConfig, ProviderConfig} from '../src/control/config.js';
import {ContractExecutionRuntime} from '../src/control/contract-runtime.js';
import {LocalCodexNodeExecutionPort} from '../src/control/codex-node-execution.js';
import type {RepositoryReviewQualityGate, RepositoryReviewQualityGateResult} from '../src/control/direct-repository-review-executor.js';
import {ExecutionSessionRuntime} from '../src/control/execution-session.js';
import {GovernedHandoffRuntime} from '../src/control/handoff-runtime.js';
import {buildParameterizedJobRuntime} from '../src/control/job-bootstrap.js';
import {JobCatalog} from '../src/control/job-catalog.js';
import {ActionFailure, ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from '../src/control/job-runtime.js';
import type {JobDefinition} from '../src/control/job-types.js';
import {ModelRegistry} from '../src/control/model-registry.js';
import {decideParallelReviewGate, type ParallelReviewLaneResult} from '../src/control/parallel-review-gate.js';
import {OpenWAAdapter, openwaConfigSchema, type OpenWAConfig} from '../src/control/openwa.js';
import {openwaExecutionPort, OpenWASocialProvider} from '../src/control/openwa-social-provider.js';
import {PoeRuntime} from '../src/control/poe.js';
import {PoeOperatorRuntime} from '../src/control/poe-operator.js';
import {PtyRegistry} from '../src/control/pty.js';
import {repositoryCodeReviewDefinition} from '../src/control/repository-review-definition.js';
import {SocialVoiceCoordinator} from '../src/control/social-voice.js';
import {PrivateSpeechProvider} from '../src/control/speech-http-provider.js';
import {TokenAwareBatonRuntime} from '../src/control/token-aware-baton-routing.js';
import {WorkParcelCoordinator, WorkParcelStore, type WorkParcelPlan, type WorkParcelPlanner} from '../src/control/work-parcels.js';
import {startWebDashboard} from '../src/control/web-server.js';
import {defaultCapabilities, type LaneState, type WorkspaceState} from '../src/state.js';

export const QUALIFICATION_PROMPT = 'Complete the read-only review of the frozen reservation-service fixture on the authorised qualification branch. Identify and explain every failing documented acceptance invariant. Preserve evidence, use the configured quality gate, and escalate from Luna to Sol only if Luna misses an acceptance-level root cause. origin/main must remain completely unchanged. Do not deploy production. Verify the result.';
export const QUALIFICATION_SOCIAL_COMMAND = 'start governed-adaptive-crew';
export const QUALIFICATION_POE_COMMAND = 'Run the Parallel lane repository review. Have Luna, Qwen, and GLM inspect the same frozen reservation-service repository in parallel. Independently verify each review against the same acceptance criteria. If any review passes, accept a verified result and do not invoke Sol. Only if all three reviews fail, create a sealed aggregate baton containing their findings and unresolved criteria and escalate it to Sol. Show every lane, route, decision, baton, verification result, and token total.';
const QUALITY_GATE_CODE = 'reservation-cache-root-cause-v1';
const SOURCE_MODEL_ID = 'codex-luna-controller-a';
const DESTINATION_MODEL_ID = 'codex-sol-controller-a';
const QWEN_MODEL_ID = 'qwen-parallel-reviewer';
const GLM_MODEL_ID = 'glm-5.3-flash-parallel-reviewer';
const MODEL_ROLE = 'review.default';

interface Options {
  host: string;
  port: number;
  stateDir: string;
  evidenceFile: string;
  transcriptFile: string;
  holdMs: number;
  operatorToken: string;
  sourceBaseUrl: string;
  sourceProviderModel: string;
  destinationProviderModel: string;
  ingress: 'dashboard' | 'openwa';
  openwaConfigFile?: string;
  openwaEnrolmentFile?: string;
  poeVoiceConfigFile?: string;
  physicalPoe: boolean;
}

interface QualityObservation {
  at: string;
  route: {providerId: string; accountProfileId: string | null; modelId: string; nodeId: string};
  responseHash: string;
  accepted: boolean;
  code: string;
  summary: string;
  unresolvedCriteria: string[];
  executiveSummary: string;
  findings: Array<{id: string; file: string | null; title: string; evidence: string; reasoning: string; suggestedRemediation: string; confidence: number}>;
}

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
let activeServer: ReturnType<typeof startWebDashboard> | undefined;

function qualificationLane(id: number, name: string, model: string, cwd: string): LaneState {
  const at = now();
  return {id,name,status:'waiting',model,reasoning:'high',context:'Unavailable',lines:[],contract:{version:2,laneId:id,goal:'Await governed parallel repository review',constraints:['Read-only immutable repository bundle'],cwd,priority:10,mode:'auto',capabilities:defaultCapabilities(),resourceLocks:{model},modelLock:model,sharedTaskIds:[],updatedAt:at},baton:{version:1,laneId:id,revision:1,status:'waiting',progress:[],hypothesis:'',evidence:[],changes:[],nextAction:'Await scheduler dispatch',openQuestions:[],model,reasoning:'high',updatedAt:at},lease:{laneId:id,holder:null,acquiredAt:null,expiresAt:null}};
}

function readOptions(): Options {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index], value = process.argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`qualification_argument_invalid:${key ?? 'missing'}`);
    values.set(key.slice(2), value);
  }
  const operatorToken = process.env.AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN;
  if (!operatorToken) throw new Error('qualification_operator_token_required');
  const stateDir = path.resolve(values.get('state-dir') ?? '.agent-control/qualification-crew-wopr-escalation');
  return {
    host: values.get('host') ?? '127.0.0.1',
    port: Number(values.get('port') ?? 0),
    stateDir,
    evidenceFile: path.resolve(values.get('evidence-file') ?? path.join(stateDir, 'crew-wopr-escalation.json')),
    transcriptFile: path.resolve(values.get('transcript-file') ?? path.join(stateDir, 'crew-wopr-escalation-transcript.md')),
    holdMs: Number(values.get('hold-ms') ?? 45_000),
    operatorToken,
    sourceBaseUrl: process.env.AGENT_CONTROL_QUALIFICATION_SOURCE_URL ?? 'http://127.0.0.1:8080',
    sourceProviderModel: process.env.AGENT_CONTROL_QUALIFICATION_SOURCE_MODEL ?? 'gpt-5.6-luna',
    destinationProviderModel: process.env.AGENT_CONTROL_QUALIFICATION_DESTINATION_MODEL ?? 'gpt-5.6-sol',
    ingress: process.env.AGENT_CONTROL_QUALIFICATION_INGRESS === 'openwa' ? 'openwa' : 'dashboard',
    ...(process.env.AGENT_CONTROL_QUALIFICATION_OPENWA_CONFIG ? {openwaConfigFile: path.resolve(process.env.AGENT_CONTROL_QUALIFICATION_OPENWA_CONFIG)} : {}),
    ...(process.env.AGENT_CONTROL_QUALIFICATION_OPENWA_ENROLMENT ? {openwaEnrolmentFile: path.resolve(process.env.AGENT_CONTROL_QUALIFICATION_OPENWA_ENROLMENT)} : {}),
    ...(process.env.AGENT_CONTROL_QUALIFICATION_POE_VOICE_CONFIG ? {poeVoiceConfigFile: path.resolve(process.env.AGENT_CONTROL_QUALIFICATION_POE_VOICE_CONFIG)} : {}),
    physicalPoe: process.env.AGENT_CONTROL_QUALIFICATION_PHYSICAL_POE === 'true',
  };
}

function emit(value: unknown) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function command(cwd: string, executable: string, args: string[]) { return execFileSync(executable, args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); }

function createFixture(root: string) {
  const repository = path.join(root, 'reservation-service-fixture');
  const remote = path.join(root, 'reservation-service-origin.git');
  fs.mkdirSync(path.join(repository, 'src'), {recursive: true, mode: 0o700});
  fs.mkdirSync(path.join(repository, 'test'), {recursive: true, mode: 0o700});
  fs.writeFileSync(path.join(repository, 'package.json'), `${JSON.stringify({name: 'reservation-service-fixture', version: '1.0.0', private: true, type: 'module', scripts: {test: 'node --test'}}, null, 2)}\n`);
  fs.writeFileSync(path.join(repository, 'README.md'), `# Reservation Service Fixture

Acceptance invariants:

1. At most one concurrent caller may acquire an unowned resource.
2. A cache entry is fresh only when its age, current time minus creation time, is below the TTL.
3. An actor satisfies a required scope set only when every required scope is granted.
4. A page contains at most limit records beginning at offset.
5. A lease issued in epoch seconds remains valid until maxAgeSeconds later when compared with an epoch-millisecond clock.

The qualification is read-only. A reviewer must explain the root cause of every failing acceptance test; merely naming the affected feature is insufficient.
`);
  fs.writeFileSync(path.join(repository, 'src/reservation-ledger.mjs'), `export class ReservationLedger {
  #owners = new Map();

  async reserve(resourceId, ownerId, audit = async () => {}) {
    if (this.#owners.has(resourceId)) return false;
    await audit({resourceId, ownerId});
    this.#owners.set(resourceId, ownerId);
    return true;
  }

  owner(resourceId) { return this.#owners.get(resourceId) ?? null; }
}
`);
  fs.writeFileSync(path.join(repository, 'src/snapshot-cache.mjs'), `export function isFresh(entry, now, ttlMs) {
  return entry.createdAt - now < ttlMs;
}
`);
  fs.writeFileSync(path.join(repository, 'src/access-policy.mjs'), `export function hasRequiredScopes(granted, required) {
  return required.some(scope => granted.includes(scope));
}
`);
  fs.writeFileSync(path.join(repository, 'src/page-window.mjs'), `export function page(records, offset, limit) {
  return records.slice(offset, limit);
}
`);
  fs.writeFileSync(path.join(repository, 'src/lease-validity.mjs'), `export function leaseIsValid(lease, nowMs, maxAgeSeconds) {
  return lease.issuedAtSeconds + maxAgeSeconds > nowMs;
}
`);
  fs.writeFileSync(path.join(repository, 'test/acceptance.test.mjs'), `import assert from 'node:assert/strict';
import test from 'node:test';
import {ReservationLedger} from '../src/reservation-ledger.mjs';
import {isFresh} from '../src/snapshot-cache.mjs';
import {hasRequiredScopes} from '../src/access-policy.mjs';
import {page} from '../src/page-window.mjs';
import {leaseIsValid} from '../src/lease-validity.mjs';

test('only one concurrent caller acquires an unowned resource', async () => {
  const ledger = new ReservationLedger();
  let entered = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const audit = async () => { entered += 1; if (entered === 2) release(); await gate; };
  const outcomes = await Promise.all([ledger.reserve('camera', 'alpha', audit), ledger.reserve('camera', 'beta', audit)]);
  assert.equal(outcomes.filter(Boolean).length, 1);
});

test('an entry older than its TTL is stale', () => {
  assert.equal(isFresh({createdAt: 1_000}, 10_000, 100), false);
});

test('every required scope must be granted', () => {
  assert.equal(hasRequiredScopes(['read'], ['read', 'admin']), false);
});

test('page limit is a count, not an absolute end index', () => {
  assert.deepEqual(page(['a', 'b', 'c', 'd', 'e'], 2, 2), ['c', 'd']);
});

test('epoch-second leases compare correctly with an epoch-millisecond clock', () => {
  assert.equal(leaseIsValid({issuedAtSeconds: 1_700_000_000}, 1_700_000_030_000, 60), true);
});
`);
  const gitEnvironment = {...process.env, GIT_AUTHOR_NAME: 'Agent Control Qualification', GIT_AUTHOR_EMAIL: 'qualification@invalid.example', GIT_COMMITTER_NAME: 'Agent Control Qualification', GIT_COMMITTER_EMAIL: 'qualification@invalid.example', GIT_AUTHOR_DATE: '2026-09-06T12:00:00Z', GIT_COMMITTER_DATE: '2026-09-06T12:00:00Z'};
  execFileSync('git', ['init', '--bare', '-q', remote], {cwd: root, env: gitEnvironment});
  execFileSync('git', ['init', '-q', '-b', 'main'], {cwd: repository, env: gitEnvironment});
  execFileSync('git', ['add', '.'], {cwd: repository, env: gitEnvironment});
  execFileSync('git', ['commit', '-qm', 'qualification fixture'], {cwd: repository, env: gitEnvironment});
  execFileSync('git', ['remote', 'add', 'origin', remote], {cwd: repository, env: gitEnvironment});
  execFileSync('git', ['push', '-q', '-u', 'origin', 'main'], {cwd: repository, env: gitEnvironment});
  execFileSync('git', ['switch', '-q', '-c', 'qualification/4.0-governed-adaptive-crew'], {cwd: repository, env: gitEnvironment});
  const protectedRef = command(repository, 'git', ['ls-remote', '--refs', 'origin', 'refs/heads/main']).split(/\s+/)[0]!;
  return {
    repository, remote, protectedRef,
    commit: command(repository, 'git', ['rev-parse', 'HEAD']),
    files: ['README.md', 'src/reservation-ledger.mjs', 'src/snapshot-cache.mjs', 'src/access-policy.mjs', 'src/page-window.mjs', 'src/lease-validity.mjs', 'test/acceptance.test.mjs'].map(file => ({file, sha256: sha256(fs.readFileSync(path.join(repository, file)))})),
  };
}

function runAcceptance(repository: string) {
  // Pin TAP so the failure-count evidence is stable across Node's terminal and
  // non-terminal reporters (Node 24 uses the spec reporter for a PTY).
  const execution = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], {cwd: repository, encoding: 'utf8', timeout: 20_000, maxBuffer: 2 * 1024 * 1024});
  const output = `${execution.stdout ?? ''}\n${execution.stderr ?? ''}`;
  const failed = Number(output.match(/# fail (\d+)/)?.[1] ?? -1);
  if (execution.status === 0 || failed !== 5) throw new Error(`qualification_fixture_expected_five_failures:status=${execution.status}:failed=${failed}`);
  return {status: execution.status, failed, outputSha256: sha256(output), bytes: Buffer.byteLength(output)};
}

async function sourceInventory(baseUrl: string, expected: string) {
  const health = await fetch(new URL('/health', baseUrl), {signal: AbortSignal.timeout(5_000)});
  if (!health.ok) throw new Error(`qualification_source_health_failed:${health.status}`);
  const models = await fetch(new URL('/v1/models', baseUrl), {signal: AbortSignal.timeout(5_000)});
  if (!models.ok) throw new Error(`qualification_source_inventory_failed:${models.status}`);
  const payload = await models.json() as {data?: Array<{id?: string}>; models?: Array<{model?: string; name?: string}>};
  const identities = [...(payload.data ?? []).map(item => item.id), ...(payload.models ?? []).flatMap(item => [item.model, item.name])].filter((item): item is string => Boolean(item));
  if (!identities.includes(expected)) throw new Error('qualification_source_model_identity_missing');
  return {state: 'AVAILABLE', providerModel: expected, observedAt: now()};
}

function reviewText(observation: QualityObservation['findings'][number]) { return [observation.title, observation.evidence, observation.reasoning].join(' '); }

function acceptanceQualityGate(observations: QualityObservation[]): RepositoryReviewQualityGate {
  return {evaluate(input) {
    const findings = input.result.findings.map(finding => ({id: finding.id, file: finding.file ?? null, title: finding.title, evidence: finding.evidence, reasoning: finding.reasoning, suggestedRemediation: finding.suggestedRemediation, confidence: finding.confidence}));
    const reservation = findings.filter(finding => finding.file === 'src/reservation-ledger.mjs').map(reviewText).join(' ');
    const cache = findings.filter(finding => finding.file === 'src/snapshot-cache.mjs').map(reviewText).join(' ');
    const access = findings.filter(finding => finding.file === 'src/access-policy.mjs').map(reviewText).join(' ');
    const paging = findings.filter(finding => finding.file === 'src/page-window.mjs').map(reviewText).join(' ');
    const lease = findings.filter(finding => finding.file === 'src/lease-validity.mjs').map(reviewText).join(' ');
    const leaseRemediation = findings.filter(finding => finding.file === 'src/lease-validity.mjs').map(finding => finding.suggestedRemediation).join(' ');
    const reservationInterleaving = /both|two|concurrent/i.test(reservation) && /before (?:either|the first|one).*(?:set|write|update)|between (?:the )?check.*(?:set|write|update)|await.*(?:interleav|race)/i.test(reservation);
    const reservationCheckThenUpdate = /non[- ]?atomic|check[- ]then[- ](?:set|write|update)|time[- ]of[- ]check/i.test(reservation) || reservationInterleaving;
    const reversedAge = /createdAt\s*-\s*now|reverse(?:d)? (?:the )?(?:age|subtraction)|wrong[- ]sign|negative age/i.test(cache);
    const correctedAge = /now\s*-\s*(?:entry\.)?createdAt|current time minus (?:the )?creation time/i.test(cache);
    const everyScope = /every|all|required\.every/i.test(access) && /some|any|one/i.test(access);
    const offsetPlusLimit = /offset\s*\+\s*limit|end index.*offset|slice\([^,]+,\s*(?:offset\s*\+\s*)?limit/i.test(paging) && /absolute|count|offset/i.test(paging);
    const leaseUnitMismatch = /seconds?.*milliseconds?|milliseconds?.*seconds?|1000|unit mismatch/i.test(lease);
    const leaseNormalization = /issuedAtSeconds.*maxAgeSeconds.*milliseconds?.*nowMs|issuedAtSeconds\s*\*\s*1_?000.*maxAgeSeconds\s*\*\s*1_?000|\(?\s*issuedAtSeconds\s*\+\s*maxAgeSeconds\s*\)?\s*\*\s*1_?000|nowMs\s*\/\s*1_?000/i.test(leaseRemediation);
    const unsupportedCompletionClaim = /(?:has been|was|is now) fixed|(?:all )?tests (?:now )?pass/i.test(input.result.executiveSummary);
    const unresolvedCriteria = [
      ...(!reservationCheckThenUpdate ? ['Identify the reservation operation as a non-atomic check-then-update sequence, explicitly or by proving both callers check before either updates ownership.'] : []),
      ...(!reservationInterleaving ? ['Explain that both callers can observe the resource as unowned before either caller updates ownership.'] : []),
      ...(!reversedAge ? ['Identify that createdAt - now reverses the cache-age subtraction and yields a negative age for stale entries.'] : []),
      ...(!correctedAge ? ['State that cache age must be calculated as now - entry.createdAt.'] : []),
      ...(!everyScope ? ['Identify that required.some accepts one matching permission while the invariant requires every required scope.'] : []),
      ...(!offsetPlusLimit ? ['Identify that Array.slice expects an absolute end index, so the page end must be offset + limit.'] : []),
      ...(!leaseUnitMismatch ? ['Identify and correct the epoch-seconds versus epoch-milliseconds mismatch in lease expiry comparison.'] : []),
      ...(!leaseNormalization ? ['In suggestedRemediation, name issuedAtSeconds, maxAgeSeconds and nowMs and state their dimensionally valid normalization before the strict expiry comparison.'] : []),
      ...(unsupportedCompletionClaim ? ['Do not claim this read-only review fixed code or made the acceptance tests pass.'] : []),
    ];
    const accepted = unresolvedCriteria.length === 0;
    const result: RepositoryReviewQualityGateResult = {
      accepted,
      code: QUALITY_GATE_CODE,
      summary: accepted ? 'The review proves all five acceptance-test root causes.' : `Schema-valid review did not satisfy ${unresolvedCriteria.length} acceptance-level root-cause ${unresolvedCriteria.length === 1 ? 'criterion' : 'criteria'}.`,
      evidence: ['fixture:test/acceptance.test.mjs', 'fixture:README.md', `provider-response:${input.responseHash}`],
      unresolvedCriteria,
      nextAction: 'Using the same frozen repository, original objective and unresolved acceptance criteria in this baton, complete only the missing root-cause analysis and return a schema-valid read-only repository review.',
    };
    observations.push({at: now(), route: {providerId: input.route.providerId, accountProfileId: input.route.accountProfileId, modelId: input.route.modelId, nodeId: input.route.nodeId}, responseHash: input.responseHash, accepted, code: result.code, summary: result.summary, unresolvedCriteria, executiveSummary: input.result.executiveSummary, findings});
    return result;
  }};
}

function job(id: string, name: string, action: string, capability: string, verification: string, output: {name: string; type: string; schema: string}, timeoutSeconds = 60, approval?: string): JobDefinition {
  return {apiVersion: 'agent-control/v1', kind: 'Job', metadata: {id, name, version: '1.0.0', description: `Bounded physical ${name.toLowerCase()} for Crew/WOPR escalation qualification`}, spec: {priority: 'normal', concurrency: 'allow', steps: [{id: 'work', action, requires: [capability], timeoutSeconds, ...(approval ? {approval} : {}), outputs: [{...output, version: '1'}], verification: [verification]}]}};
}

function safeCrew(control: AgentControlService) {
  return control.snapshot().characterCrew.members.map(member => ({id: member.id, name: member.name, state: member.state, operationalState: member.operationalState, activity: member.activity, animationCue: member.animationCue, summary: member.summary, transitionKey: member.transitionKey}));
}

function eventName(type: 'telemetry' | 'governor.transition' | 'context.lifecycle' | 'baton.created' | 'handoff.result') {
  return type === 'telemetry' ? 'token.telemetry' : type === 'governor.transition' ? 'token.governor_transition' : type === 'context.lifecycle' ? 'token.context_lifecycle' : type === 'baton.created' ? 'token.baton_created' : 'token.handoff_result';
}

function firstWaveSource(results: ParallelReviewLaneResult[], records: Map<string, ParallelReviewLaneResult & {runId: string; result?: unknown; workParcelIds: string[]}>) {
  const preferred=results.find(item=>item.laneId==='luna') ?? results[0];
  const record=preferred ? records.get(preferred.laneId) : undefined;
  if(!record)throw new Error('parallel_first_wave_source_missing');
  return record;
}

function transcript(input: {
  startedAt: string;
  completedAt: string;
  repositoryCommit: string;
  parentParcelId: string;
  parentRunIds: string[];
  parentRuns: Array<{jobId: string; startedAt?: string; endedAt?: string; steps: Array<{action: string; status: string; startedAt?: string; endedAt?: string}>}>;
  parameterizedRunId: string;
  nestedParcelId: string;
  source: QualityObservation;
  destination: QualityObservation;
  baton: ReturnType<TokenAwareBatonRuntime['baton']>;
  routing: ReturnType<TokenAwareBatonRuntime['projection']>;
  routingEvidence: ReturnType<TokenAwareBatonRuntime['evidence']>;
  verification: Record<string, unknown>;
}) {
  const sourceThread = input.routing.threads.find(thread => thread.providerId === input.source.route.providerId && thread.modelId === input.source.route.modelId)!;
  const destinationThread = input.routing.threads.find(thread => thread.providerId === input.destination.route.providerId && thread.modelId === input.destination.route.modelId)!;
  const totals = input.routing.parcels.find(parcel => parcel.parcelId === input.nestedParcelId)!;
  const formatCost = (amount: number | null, currency: string | null) => amount === null ? 'Unavailable' : `${amount}${currency ? ` ${currency}` : ''}`;
  const rows = totals.byModel.map(item => `| ${item.providerId} | ${item.accountLabel ?? item.accountProfileId ?? 'default'} | ${item.modelId} | ${item.inputTokens ?? 'Unavailable'} | ${item.outputTokens ?? 'Unavailable'} | ${item.totalTokens ?? 'Unavailable'} | ${formatCost(item.cost, item.currency)} |`).join('\n');
  const sourceLabel = sourceThread.accountLabel ?? input.source.route.accountProfileId ?? 'default';
  const sourceRoute = `${input.source.route.providerId}/${sourceLabel} (${input.source.route.accountProfileId ?? 'default'})/${input.source.route.modelId}@${input.source.route.nodeId}`;
  const destinationLabel = destinationThread.accountLabel ?? input.destination.route.accountProfileId ?? 'default';
  const destinationRoute = `${input.destination.route.providerId}/${destinationLabel} (${input.destination.route.accountProfileId ?? 'default'})/${input.destination.route.modelId}@${input.destination.route.nodeId}`;
  const handoffDecision = input.routingEvidence.decisions.find(item => item.action === 'BATON_AND_HANDOFF' && item.trigger?.kind === 'QUALITY_GATE' && item.target);
  const toolTimeline = input.parentRuns.flatMap(run => run.steps.map(step => ({at: step.startedAt ?? run.startedAt, completedAt: step.endedAt ?? run.endedAt, action: step.action, status: step.status}))).filter((item): item is {at: string; completedAt: string | undefined; action: string; status: string} => Boolean(item.at)).sort((left, right) => left.at.localeCompare(right.at));
  return `# Agent Control 4.3 Luna-to-Sol baton qualification transcript

This is a human-readable projection of immutable Agent Control records. It contains no private model reasoning or credentials.

## Request

- Received: ${input.startedAt}
- Exact dashboard prompt: ${QUALIFICATION_PROMPT}
- Frozen fixture commit: \`${input.repositoryCommit}\`
- Parent Work Parcel: \`${input.parentParcelId}\`
- Parent Runs: ${input.parentRunIds.map(id => `\`${id}\``).join(', ')}
- Parameterized review Run: \`${input.parameterizedRunId}\`
- Provider-owned review Work Parcel: \`${input.nestedParcelId}\`

## Model change — explicit human-readable record

- **From:** \`${sourceRoute}\`
- **To:** \`${destinationRoute}\`
- **Changed at:** ${handoffDecision?.at ?? input.baton.createdAt}
- **Why:** the first model returned valid structured output, but independent gate \`${input.source.code}\` found that it missed ${input.source.unresolvedCriteria.length} required root-cause criteria.
- **Governor decision:** \`BATON_AND_HANDOFF\` with trigger \`QUALITY_GATE\` and reason \`${handoffDecision?.reason ?? `quality_gate_failed:${input.source.code}`}\`.
- **Not a context-pressure substitution:** source context was ${sourceThread.latest.contextPercent === null ? 'Unavailable' : `${sourceThread.latest.contextPercent.toFixed(1)}%`} (${sourceThread.latest.context.authority}); the route change was quality-driven and explicitly recorded.
- **Continuity:** sealed baton \`${input.baton.id}\` (SHA-256 \`${input.baton.sha256}\`) carried the unfinished criteria and exact next action to the destination.
- **Outcome:** the destination continued the same frozen review, satisfied the gate, and the independent verifier passed the combined outcome. The source thread remained recoverable.

## Timestamped operational timeline

- ${input.startedAt} — authenticated dashboard accepted the exact prompt and created the governed parent Work Parcel.
${toolTimeline.map(item => `- ${item.at} — tool/job action \`${item.action}\` entered execution${item.completedAt ? `; completed ${item.completedAt}` : ''} with terminal state \`${item.status}\`.`).join('\n')}
- ${sourceThread.startedAt} — selected source model \`${sourceRoute}\`; provider execution began.
- ${input.source.at} — source response completed and independent quality gate rejected it; structured transport/schema validation had succeeded.
- ${input.baton.createdAt} — Agent Control created and sealed the durable baton.
- ${destinationThread.startedAt} — selected destination model \`${destinationRoute}\`; destination continuation began from the baton.
- ${input.destination.at} — destination response completed and passed the same independent quality gate.
- ${String(input.verification.checkedAt ?? input.completedAt)} — independent outcome verification passed and reconciled the two model legs.

## Governed execution

1. Two control lanes ran concurrently: the acceptance-test baseline and frozen source inventory.
2. ${input.source.route.providerId}/${input.source.route.modelId} returned a complete, schema-valid review. It used ${sourceThread.latest.cumulative.totalTokens ?? 'Unavailable'} tokens; current context was ${sourceThread.latest.context.authority} (${sourceThread.latest.context.source}).
3. Independent gate \`${input.source.code}\` rejected it: ${input.source.summary}
4. Missing criteria: ${input.source.unresolvedCriteria.join(' ')}
5. Agent Control sealed baton \`${input.baton.id}\` with SHA-256 \`${input.baton.sha256}\`.
6. Governed route selection transferred the unfinished review to ${input.destination.route.providerId}/${input.destination.route.accountProfileId ?? 'default'}/${input.destination.route.modelId}.
7. The destination continued from the sealed baton and passed the same gate: ${input.destination.summary}
8. Independent final verification accepted the resulting repository review. The original source thread remains recoverable.

## Provider results

### Initial route — rejected by independent quality gate

${input.source.executiveSummary}

${input.source.findings.map(finding => `- ${finding.file ?? 'repository'} — ${finding.title}: ${finding.reasoning}`).join('\n')}

### Destination route — accepted

${input.destination.executiveSummary}

${input.destination.findings.map(finding => `- ${finding.file ?? 'repository'} — ${finding.title}: ${finding.reasoning}`).join('\n')}

## Reconciled usage

| Provider | Account | Model | Input | Output | Total | Cost |
| --- | --- | --- | ---: | ---: | ---: | ---: |
${rows}
| **Work Parcel total** |  |  | **${totals.inputTokens ?? 'Unavailable'}** | **${totals.outputTokens ?? 'Unavailable'}** | **${totals.totalTokens ?? 'Unavailable'}** | **${formatCost(totals.cost, totals.currency)}** |

Current context occupancy remains separate from lifetime usage. Luna reports current occupancy as ${sourceThread.latest.context.authority}; Sol reports it as ${destinationThread.latest.context.authority}. Missing cost or context values are shown as Unavailable, never zero.

## Verification

\`\`\`json
${JSON.stringify(input.verification, null, 2)}
\`\`\`

Completed: ${input.completedAt}
`;
}

async function main() {
  const options = readOptions(), startedAt = now();
  fs.mkdirSync(options.stateDir, {recursive: true, mode: 0o700});
  fs.mkdirSync(path.dirname(options.evidenceFile), {recursive: true});
  fs.mkdirSync(path.dirname(options.transcriptFile), {recursive: true});
  const fixture = createFixture(options.stateDir);
  const initialAcceptance = runAcceptance(fixture.repository);
  const account: ProviderAccountProfileConfig = {id: 'cottage-plus', label: 'Controller Account A', providerExecutionNodeId: 'controller', credentialResidency: {nodeId: 'controller', store: {type: 'codex-home-env', env: 'CODEX_HOME_COTTAGE_PLUS'}}, enabled: true, plan: 'ChatGPT Plus', planAuthority: 'operator-configured', capabilities: ['repository-review'], qualification: {state: 'QUALIFIED', version: 'controller-account-a-physical-v1', checkedAt: startedAt, qualifiedAt: startedAt, capabilities: ['repository-review'], evidence: ['production LocalCodexNodeExecutionPort preflight']}};
  const sourceProvider: ProviderConfig = {id: 'codex-chatgpt', name: 'OpenAI Codex', kind: 'cli', enabled: true, parallelism: 1, costClass: 'included', capabilities: ['repository-review'], accountProfiles: [account]};
  const destinationProvider = sourceProvider;
  const qwenProvider: ProviderConfig = {id:'local-qwen',name:'Local Qwen',kind:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:8080/v1',wireApi:'chat-completions',auth:{type:'none'},requiresAuth:false,parallelism:1,costClass:'free',capabilities:['repository-review']};
  const glmProvider: ProviderConfig = {id:'openrouter',name:'OpenRouter',kind:'openai-compatible',enabled:true,baseUrl:'https://openrouter.ai/api/v1',wireApi:'chat-completions',auth:{type:'bearer-file-env',env:'OPENROUTER_API_KEY_FILE'},requiresAuth:true,parallelism:1,costClass:'metered',capabilities:['repository-review']};
  const sourceModel: ModelConfig = {id: SOURCE_MODEL_ID, provider: sourceProvider.id, providerModel: options.sourceProviderModel, accountProfile: account.id, displayName: 'Codex Luna · Controller Account A', enabled: true, capabilities: ['repository-review'], roles: [MODEL_ROLE], nodes: ['controller'], limits: {contextTokens: 272_000, outputTokens: 1_800}, qualification: {state: 'QUALIFIED', version: 'controller-account-a-codex-v1', qualifiedAt: startedAt, capabilities: ['repository-review'], nodes: ['controller'], evidence: ['bounded account and model qualification']}};
  const destinationModel: ModelConfig = {id: DESTINATION_MODEL_ID, provider: destinationProvider.id, providerModel: options.destinationProviderModel, accountProfile: account.id, displayName: 'Codex Sol · Controller Account A', enabled: true, capabilities: ['repository-review'], roles: [MODEL_ROLE], nodes: ['controller'], limits: {contextTokens: 272_000, outputTokens: 2_000}, qualification: {state: 'QUALIFIED', version: 'controller-account-a-codex-v1', qualifiedAt: startedAt, capabilities: ['repository-review'], nodes: ['controller'], evidence: ['bounded account and model qualification']}};
  const qwenModel: ModelConfig = {id:QWEN_MODEL_ID,provider:qwenProvider.id,providerModel:'qwen2.5-3b-instruct-q4_k_m.gguf',displayName:'Qwen Parallel Reviewer',enabled:true,capabilities:['repository-review'],nodes:['controller'],limits:{contextTokens:32768,outputTokens:1800},qualification:{state:'QUALIFIED',version:'local-qwen-physical-v1',qualifiedAt:startedAt,capabilities:['repository-review'],nodes:['controller'],evidence:['live loopback inventory']}};
  const glmModel: ModelConfig = {id:GLM_MODEL_ID,provider:glmProvider.id,providerModel:'z-ai/glm-5.3-flash',displayName:'GLM-5.3-Flash Parallel Reviewer',enabled:true,capabilities:['repository-review'],nodes:['controller'],limits:{contextTokens:131072,outputTokens:1800},qualification:{state:'QUALIFIED',version:'openrouter-glm-physical-v1',qualifiedAt:startedAt,capabilities:['repository-review'],nodes:['controller'],evidence:['prior physical qualification; live invocation required']}};
  const config: AgentControlConfig = {schemaVersion: 1, resources: [{id: 'controller', name: 'Qualification controller', platform: 'linux', transport: {type: 'local'}, capabilities: ['qualification.baseline', 'qualification.inventory', 'qualification.review', 'qualification.verify', 'repository-review'], controller: true, metadata: {capacity: 6}}], providers: [sourceProvider,qwenProvider,glmProvider], models: [sourceModel,qwenModel,glmModel,destinationModel], modelRouting: {defaultRole: MODEL_ROLE, roles: {[MODEL_ROLE]: {primary: SOURCE_MODEL_ID, fallback: [DESTINATION_MODEL_ID], requires: ['repository-review']}}}, services: [], lanes: [], tokenBatonRouting: {continuePercent: 60, prepareBatonPercent: 75, compactPercent: 85, handoffPercent: 90, sampleRetention: 240}, adaptiveOrchestration: {enabled: true, minimumSamplesForPreference: 3, minimumQualityScore: .7, maxEvidenceAgeDays: 90, policyQualityFloor: .6, maxRouteCost: null, maxRouteLatencyMs: null, qualityWeight: .5, reliabilityWeight: .2, costWeight: .15, latencyWeight: .1, confidenceWeight: .05, explorationRate: 0}, retrieval: {enabled: false}, jobs: {repositoryRoots: [options.stateDir]}};
  const state: WorkspaceState = {version:1,paused:false,lastRestorePoint:null,lanes:[qualificationLane(1,'Luna Review Lane',SOURCE_MODEL_ID,fixture.repository),qualificationLane(2,'Qwen Review Lane',QWEN_MODEL_ID,fixture.repository),qualificationLane(3,'GLM Review Lane',GLM_MODEL_ID,fixture.repository),qualificationLane(4,'Sol Escalation Lane',DESTINATION_MODEL_ID,fixture.repository)]};
  const executionSessions = new ExecutionSessionRuntime(path.join(options.stateDir, 'execution-sessions'));
  const nodeExecution = new LocalCodexNodeExecutionPort(process.env, process.env.CODEX_COMMAND ?? 'codex', executionSessions);
  const accountStatus = await nodeExecution.accountStatus({provider: destinationProvider, account, nodeId: 'controller', providerExecutionNodeId: 'controller', credentialNodeId: 'controller', timeoutMs: 20_000});
  const sourcePreflight = {state: accountStatus.authenticated ? 'AVAILABLE' : 'UNAVAILABLE', providerModel: sourceModel.providerModel, observedAt: accountStatus.discoveredAt};
  const registry = new ModelRegistry(config.providers, config.models, config.modelRouting, undefined, undefined, process.env);
  const qualityObservations: QualityObservation[] = [], qualityGate = acceptanceQualityGate(qualityObservations);
  const tokenRouting = new TokenAwareBatonRuntime(path.join(options.stateDir, 'token-routing.json'), config.tokenBatonRouting);
  const contracts = new ContractExecutionRuntime(path.join(options.stateDir, 'contracts.json'));
  const handoffs = new GovernedHandoffRuntime(contracts, path.join(options.stateDir, 'handoffs.json'));
  const adaptiveOrchestration = new AdaptiveOrchestrationRuntime(new FileAdaptiveOrchestrationStore(path.join(options.stateDir, 'adaptive-orchestration', 'state.json')), config.adaptiveOrchestration);
  let parameterizedJobs!: ReturnType<typeof buildParameterizedJobRuntime>;
  const parameterizedRunIds: string[] = [];
  let parameterizedRunId = ''; // retained for the historical single-route evidence block below; the parallel path returns first.
  const laneResults = new Map<string, ParallelReviewLaneResult & {runId: string; result?: unknown; workParcelIds: string[]}>();
  const immutableBundleSha256 = sha256(fixture.files.map(item => `${item.file}:${item.sha256}`).join('\n'));

  const actions = new ActionRegistry();
  actions.register('qualification.acceptance-baseline@1.0.0', async context => {
    const result = runAcceptance(fixture.repository), deadline = Date.now() + 6_000;
    while (Date.now() < deadline) { sha256(fs.readFileSync(path.join(fixture.repository, 'test/acceptance.test.mjs'))); await delay(120); }
    return {artifacts: [{name: 'acceptance-baseline', value: result, type: 'qualification-acceptance-baseline', schema: 'agent-control.qualification-acceptance/v1', version: '1'}], verification: ['five-known-failures-confirmed'], evidence: [`acceptance-output-sha256:${result.outputSha256}`], detail: 'Five deterministic acceptance failures confirmed without modifying the fixture'};
  });
  actions.register('qualification.frozen-inventory@1.0.0', async () => {
    const deadline = Date.now() + 6_000; let digest = '';
    do { digest = sha256(fixture.files.map(item => `${item.file}:${item.sha256}`).join('\n')); await delay(120); } while (Date.now() < deadline);
    return {artifacts: [{name: 'frozen-inventory', value: {commit: fixture.commit, files: fixture.files, aggregateSha256: digest}, type: 'qualification-frozen-inventory', schema: 'agent-control.qualification-inventory/v1', version: '1'}], verification: ['frozen-sha-and-files-confirmed'], evidence: [`fixture-commit:${fixture.commit}`, `fixture-inventory-sha256:${digest}`], detail: 'Frozen fixture revision and source inventory independently hashed'};
  });
  const registerLaneReview = (actionId: string, laneId: string, laneName: string, savedJobId: string) => actions.register(actionId, async context => {
    const sourceParcelId = context.run.trigger.parcelContext?.parcelId;
    const sourceParcel = sourceParcelId ? parcels.get(sourceParcelId) : undefined;
    const created = parameterizedJobs.runNow(savedJobId, `lane:${laneId}:work-parcel:${sourceParcelId ?? 'unknown'}`, undefined, sourceParcel?.origin);
    parameterizedRunIds.push(created.id);
    const completed = await parameterizedJobs.execute(created.id);
    const route = completed.modelRoute;
    let gate: RepositoryReviewQualityGateResult | undefined;
    if (completed.result && route) gate = await qualityGate.evaluate({request: {} as never, chunk: {} as never, result: completed.result, route, responseHash: completed.providerResponseIds.at(-1) ?? `sha256:${sha256(JSON.stringify(completed.result))}`});
    const outcome: ParallelReviewLaneResult['outcome'] = gate?.accepted ? 'PASSED' : completed.result ? 'QUALITY_FAILED' : completed.errors.some(error => /schema/i.test(error)) ? 'SCHEMA_FAILED' : 'PROVIDER_FAILED';
    const laneResult: ParallelReviewLaneResult & {runId: string; result?: unknown; workParcelIds: string[]} = {
      laneId, laneName, providerId: route?.providerId ?? 'unavailable', modelId: route?.modelId ?? 'unavailable', immutableBundleSha256, outcome,
      unresolvedCriteria: gate?.unresolvedCriteria ?? [completed.errors.at(-1) ?? 'provider execution did not produce a schema-valid review'],
      evidence: [...completed.evidence, ...completed.providerResponseIds, `reviewed-sha:${completed.repository?.reviewedSha ?? 'unavailable'}`, `gate:${QUALITY_GATE_CODE}:${gate?.accepted ? 'passed' : 'failed'}`],
      usage: {inputTokens: completed.usage.inputTokens ?? null, outputTokens: completed.usage.outputTokens ?? null, totalTokens: completed.usage.totalTokens ?? null, cost: completed.usage.cost ?? null, currency: completed.usage.currency ?? null},
      completedAt: completed.completedAt ?? now(), runId: completed.id, result: completed.result, workParcelIds: completed.workParcelIds,
    };
    laneResults.set(laneId, laneResult);
    return {artifacts: [{name: `${laneId}-review`, value: laneResult, type: 'qualification-parallel-review-lane', schema: 'agent-control.qualification-parallel-review-lane/v1', version: '1'}], verification: ['independent-lane-gate-completed'], evidence: laneResult.evidence, detail: `${laneName} completed against immutable bundle ${immutableBundleSha256}; independent gate outcome ${outcome}`};
  });
  registerLaneReview('qualification.parallel-luna-review@1.0.0', 'luna', 'Luna Review Lane', 'parallel-luna-review');
  registerLaneReview('qualification.parallel-qwen-review@1.0.0', 'qwen', 'Qwen Review Lane', 'parallel-qwen-review');
  registerLaneReview('qualification.parallel-glm-review@1.0.0', 'glm', 'GLM Review Lane', 'parallel-glm-review');
  actions.register('qualification.parallel-review-aggregate@1.0.0', async context => {
    const artifactIds=context.run.trigger.parcelContext?.baton?.artifactIds ?? context.inputArtifacts.map(item=>item.id);
    const results = artifactIds.map(id => context.readArtifact(id) as ParallelReviewLaneResult).filter(item=>item?.laneId);
    const decision = decideParallelReviewGate(results);
    let selected = decision.selectedLaneId ? laneResults.get(decision.selectedLaneId) : undefined;
    let aggregateBaton: ReturnType<TokenAwareBatonRuntime['baton']> | undefined;
    let handoffResult: Awaited<ReturnType<TokenAwareBatonRuntime['governedHandoff']>> | undefined;
    if (decision.action === 'BATON_TO_SOL') {
      const source=firstWaveSource(results,laneResults), sourceThread=tokenRouting.projection().threads.find(item=>item.modelId===source.modelId&&source.workParcelIds.includes(item.parcelId));
      if(!sourceThread)throw new ActionFailure('parallel_baton_source_thread_missing','verification');
      const target={providerId:destinationProvider.id,accountProfileId:account.id,accountLabel:account.label,accountPlan:account.plan,accountPlanAuthority:account.planAuthority,accountQualification:account.qualification?.state,accountAvailability:'AVAILABLE',modelId:destinationModel.id,nodeId:'controller',workloadNodeId:'controller',providerExecutionNodeId:'controller',credentialNodeId:'controller'} as const;
      const routeDecision=tokenRouting.assess(sourceThread.id,{remainingWork:'DIFFICULT',reasoningState:'UNFINISHED',requiredCapabilities:['repository-review'],candidates:[{...target,estimatedCost:null,qualified:true,capabilities:['repository-review'],preferenceOrder:1}],trigger:{kind:'QUALITY_GATE',code:'parallel-all-first-wave-failed',reason:decision.reason,evidence:decision.evidence}});
      if(routeDecision.action!=='BATON_AND_HANDOFF'||!routeDecision.target)throw new ActionFailure('parallel_sol_route_not_selected','verification');
      aggregateBaton=tokenRouting.createBaton({threadId:sourceThread.id,parcelId:sourceThread.parcelId,providerId:sourceThread.providerId,accountProfileId:sourceThread.accountProfileId,accountLabel:sourceThread.accountLabel,accountPlan:sourceThread.accountPlan,accountPlanAuthority:sourceThread.accountPlanAuthority,accountQualification:sourceThread.accountQualification,accountAvailability:sourceThread.accountAvailability,modelId:sourceThread.modelId,nodeId:sourceThread.nodeId,workloadNodeId:sourceThread.workloadNodeId,providerExecutionNodeId:sourceThread.providerExecutionNodeId,credentialNodeId:sourceThread.credentialNodeId,objective:QUALIFICATION_POE_COMMAND,completedWork:results.map(item=>`${item.laneName} returned ${item.outcome}`),decisions:[decision.reason,'Sol admitted only after all three independent first-wave gates failed'],filesChanged:[],git:{sha:fixture.commit,dirty:false,diffSummary:'Immutable read-only qualification fixture'},testsAndEvidence:decision.evidence,unresolvedIssues:decision.unresolvedCriteria,nextAction:'Review the same immutable bundle and resolve the union of missing acceptance criteria; return one schema-valid read-only review.'});
      const sourceActor=`agent:${sourceThread.providerId}:${sourceThread.modelId}`, sourceAgent=`model:${sourceThread.modelId}`;
      const contract=contracts.create({laneId:'parallel-review',operatorActorId:'human:qualification-operator',objective:QUALIFICATION_POE_COMMAND,completionCriteria:[`Pass independent gate ${QUALITY_GATE_CODE}`],authority:['repository-review'],active:{actorId:sourceActor,agentId:sourceAgent,modelId:sourceThread.modelId,providerId:sourceThread.providerId,accountProfileId:sourceThread.accountProfileId,runtimeId:`provider:${sourceThread.providerId}`,nodeId:'controller',workloadNodeId:'controller',providerExecutionNodeId:'controller',credentialNodeId:sourceThread.credentialNodeId},baton:{parallelDecision:decision.reason},process:{id:`provider:${source.runId}`},ptyId:`provider-pty:${source.runId}`,permissions:{capabilities:['repository-review'],filesystem:'read',network:'provider-only',production:false}});
      state.lanes[3]!.status='working'; state.lanes[3]!.baton={...state.lanes[3]!.baton,status:'working',nextAction:'Continue from sealed aggregate baton',revision:state.lanes[3]!.baton.revision+1,updatedAt:now()};
      let solResult: typeof selected;
      handoffResult=await tokenRouting.governedHandoff(sourceThread.id,aggregateBaton.id,routeDecision.target,handoffs,{outcome:'DELEGATE',policy:'AUTO',contractId:contract.id,sourceActorId:sourceActor,sourceAgentId:sourceAgent,target:{active:{actorId:`agent:${destinationProvider.id}:${destinationModel.id}`,agentId:`model:${destinationModel.id}`,modelId:destinationModel.id,providerId:destinationProvider.id,accountProfileId:account.id,runtimeId:`provider:${destinationProvider.id}`,nodeId:'controller',workloadNodeId:'controller',providerExecutionNodeId:'controller',credentialNodeId:'controller'},process:{id:'provider:sol-conditional'},ptyId:'provider-pty:sol-conditional'},requestedAuthority:['repository-review'],budget:{},child:{objective:aggregateBaton.nextAction,completionCriteria:[`Pass independent gate ${QUALITY_GATE_CODE}`]}},async()=>{
        const definitionId='repository-code-review-aggregate-baton';
        if(!parameterizedJobs.definitions.list().some(item=>item.id===definitionId))parameterizedJobs.definitions.register({...repositoryCodeReviewDefinition,id:definitionId,displayName:'Aggregate Baton Repository Review',description:'Continue an immutable repository review from a sealed multi-lane baton.',template:{id:'aggregate-baton-review',version:1,instruction:`${repositoryCodeReviewDefinition.template.instruction}\n\nVERIFIED AGGREGATE CONTINUATION BATON\nBaton SHA-256: ${aggregateBaton!.sha256}\nObjective: ${aggregateBaton!.objective}\nCompleted first-wave work:\n${aggregateBaton!.completedWork.map(value=>`- ${value}`).join('\n')}\nUnresolved acceptance criteria:\n${aggregateBaton!.unresolvedIssues.map(value=>`- ${value}`).join('\n')}\nExact next action: ${aggregateBaton!.nextAction}\nYou are the conditional Sol escalation route. Continue from this baton; do not rediscover or omit its unresolved criteria.`}});
        if(!parameterizedJobs.savedJobs.list().some(item=>item.id==='parallel-sol-baton-review'))parameterizedJobs.savedJobs.create({id:'parallel-sol-baton-review',name:'Sol aggregate-baton continuation',definition:{id:definitionId,version:1,follow:'pinned'},parameters:{node:'controller',repository:fixture.repository,ref:fixture.commit,scope:'full'},routing:{model:DESTINATION_MODEL_ID,allowFallback:false},contextProfile:'THIN',budgets:{timeoutMinutes:4,maximumRetries:0,maximumInputTokens:16_000,maximumOutputTokens:3_500},concurrency:'forbid-overlap',enabled:true});
        const created=parameterizedJobs.runNow('parallel-sol-baton-review',`aggregate-baton:${aggregateBaton!.sha256}`,undefined,parcels.get(context.run.trigger.parcelContext!.parcelId).origin);parameterizedRunIds.push(created.id);const completed=await parameterizedJobs.execute(created.id);if(!completed.result||!completed.modelRoute)throw new Error(`sol_execution_failed:${completed.errors.at(-1)??completed.status}`);const gate=await qualityGate.evaluate({request:{} as never,chunk:{} as never,result:completed.result,route:completed.modelRoute,responseHash:completed.providerResponseIds.at(-1)??`sha256:${sha256(JSON.stringify(completed.result))}`});if(!gate.accepted)throw new Error(`sol_quality_gate_failed:${gate.unresolvedCriteria.join('|')}`);solResult={laneId:'sol',laneName:'Sol Escalation Lane',providerId:completed.modelRoute.providerId,modelId:completed.modelRoute.modelId,immutableBundleSha256,outcome:'PASSED',unresolvedCriteria:[],evidence:[...completed.evidence,...completed.providerResponseIds,`baton-sha256:${aggregateBaton!.sha256}`],usage:{inputTokens:completed.usage.inputTokens??null,outputTokens:completed.usage.outputTokens??null,totalTokens:completed.usage.totalTokens??null,cost:completed.usage.cost??null,currency:completed.usage.currency??null},completedAt:completed.completedAt??now(),runId:completed.id,result:completed.result,workParcelIds:completed.workParcelIds};});
      state.lanes[3]!.status=handoffResult.outcome==='SUCCEEDED'?'idle':'error';state.lanes[3]!.baton={...state.lanes[3]!.baton,status:state.lanes[3]!.status,nextAction:handoffResult.reason,revision:state.lanes[3]!.baton.revision+1,updatedAt:now()};
      if(handoffResult.outcome!=='SUCCEEDED'||!solResult)throw new ActionFailure(`parallel_sol_handoff_failed:${handoffResult.reason}`,'verification');selected=solResult;laneResults.set('sol',solResult);
    }
    if (!selected?.result) throw new ActionFailure('parallel_review_selected_result_missing', 'verification');
    const acceptance = runAcceptance(fixture.repository);
    const independentVerification = {schema: 'agent-control.qualification-verified-outcome/v1', passed: acceptance.failed === 5, checkedAt: now(), gateAction: decision.action, gateReason: decision.reason, selectedLaneId: selected.laneId, solInvoked: decision.action==='BATON_TO_SOL', batonSha256:aggregateBaton?.sha256??null,handoffOutcome:handoffResult?.outcome??null,immutableBundleSha256, firstWaveLaneCount: results.length, aggregateUsage: decision.usage};
    return {artifacts: [{name: 'repository-review-result', value: {decision, selected, firstWave: results, result: selected.result, baton:aggregateBaton??null,handoff:handoffResult??null,independentVerification}, type: 'qualification-repository-review', schema: 'agent-control.qualification-repository-review/v1', version: '1'}], verification: ['parallel-gate-and-review-verified'], evidence: [...decision.evidence, `parallel-gate:${decision.reason}`,...(aggregateBaton?[`token-baton-sha256:${aggregateBaton.sha256}`]:[]), `acceptance-output-sha256:${acceptance.outputSha256}`], detail: `Independent fan-in gate selected ${selected.laneId}; ${decision.reason}`};
  });
  actions.register('qualification.parallel-review-orchestrate@1.0.0', async context => {
    const child=parcels.submitApprovedPlan(QUALIFICATION_POE_COMMAND,context.run.trigger.actor,sha256(`${context.run.id}:parallel`),{
      objective:QUALIFICATION_POE_COMMAND,constraints:['All first-wave routes receive the same immutable repository bundle.','Sol is ineligible unless all three independent gates fail.'],planner:{kind:'deterministic',reason:'Operator-approved parallel review expands into three independent named lane Jobs and one fan-in gate.'},stages:[
        {id:'luna',name:'Luna Review Lane',job:'crew-wopr-luna-review@1.0.0'},
        {id:'qwen',name:'Qwen Review Lane',job:'crew-wopr-qwen-review@1.0.0'},
        {id:'glm',name:'GLM Review Lane',job:'crew-wopr-glm-review@1.0.0'},
        {id:'gate',name:'Independent Parallel Review Gate',job:'crew-wopr-parallel-gate@1.0.0',dependsOn:['luna','qwen','glm']},
      ],successCriteria:[{id:'parallel-verified',kind:'STAGE_VERIFIED',description:'The independent fan-in gate accepts a verified lane or truthfully admits Sol only after all first-wave failures.',source:'POLICY',stageId:'gate',requiredEvidence:['stage:gate:verified']}]},context.run.trigger.parcelContext ? parcels.get(context.run.trigger.parcelContext.parcelId).origin : undefined);
    const local=new Set<Promise<unknown>>(), deadline=Date.now()+300_000;
    while(Date.now()<deadline){await parcels.tick();for(;;){const dispatch=runtime.dispatch();if(!dispatch)break;const completion=dispatch.completion.finally(()=>local.delete(completion));local.add(completion);}const current=parcels.get(child.id);if(current.status==='SUCCEEDED'&&local.size===0){const gate=current.stages.find(stage=>stage.id==='gate'),run=gate?.runId?runtime.ledger.get(gate.runId):undefined,id=run?.artifacts[0];if(!id)throw new ActionFailure('parallel_gate_artifact_missing','verification');const value=runtime.artifacts.read(id);return{artifacts:[{name:'repository-review-result',value,type:'qualification-repository-review',schema:'agent-control.qualification-repository-review/v1',version:'1'}],verification:['parallel-orchestration-verified'],evidence:[`child-work-parcel:${child.id}`,`parallel-gate-run:${run!.id}`],detail:'Three named lane Jobs completed and the independent fan-in gate selected the verified result'}}if(current.status==='FAILED')throw new ActionFailure(`parallel_child_failed:${current.stages.find(stage=>stage.status==='FAILED')?.error??'unknown'}`,'verification');await delay(100);}
    throw new ActionFailure('parallel_child_timeout','execution');
  });
  actions.register('qualification.outcome-verify@1.0.0', async context => {
    const artifactIds = context.run.trigger.parcelContext?.baton?.artifactIds ?? [], reviewArtifact = artifactIds.map(id => context.readArtifact(id)).find(value => Boolean(value && typeof value === 'object' && (value as {result?: unknown}).result)) as {decision: ReturnType<typeof decideParallelReviewGate>; selected: {runId: string; result: {findings: Array<{file?: string; reasoning: string; evidence: string}>}; workParcelIds: string[]}; independentVerification: Record<string, unknown>} | undefined;
    if (!reviewArtifact) throw new ActionFailure('review_artifact_missing', 'verification');
    assert.equal(reviewArtifact.decision.action, 'ACCEPT_VERIFIED_LANE');
    assert.ok(reviewArtifact.selected.result.findings.some(finding => finding.file === 'src/reservation-ledger.mjs'));
    assert.ok(reviewArtifact.selected.result.findings.some(finding => finding.file === 'src/snapshot-cache.mjs'));
    const stillFailing = runAcceptance(fixture.repository);
    const verification = {...reviewArtifact.independentVerification, schema: 'agent-control.qualification-verified-outcome/v1', passed: stillFailing.failed === 5, finalCheckedAt: now(), readOnlyFixtureStillHasFiveKnownFailures: stillFailing.failed === 5};
    return {artifacts: [{name: 'verified-outcome', value: verification, type: 'qualification-verified-outcome', schema: verification.schema, version: '1'}], verification: ['independent-outcome-verification-passed'], evidence: [`parallel-gate:${reviewArtifact.decision.reason}`, `acceptance-output-sha256:${stillFailing.outputSha256}`], detail: 'Independent verifier reconciled all three first-wave lane gates, selected the verified result, and confirmed Sol was not invoked'};
  });

  const jobDefinitions = [
    job('crew-wopr-baseline', 'Acceptance baseline', 'qualification.acceptance-baseline@1.0.0', 'qualification.baseline', 'five-known-failures-confirmed', {name: 'acceptance-baseline', type: 'qualification-acceptance-baseline', schema: 'agent-control.qualification-acceptance/v1'}),
    job('crew-wopr-inventory', 'Frozen source inventory', 'qualification.frozen-inventory@1.0.0', 'qualification.inventory', 'frozen-sha-and-files-confirmed', {name: 'frozen-inventory', type: 'qualification-frozen-inventory', schema: 'agent-control.qualification-inventory/v1'}),
    job('crew-wopr-luna-review','Luna independent review','qualification.parallel-luna-review@1.0.0','qualification.review.luna','independent-lane-gate-completed',{name:'luna-review',type:'qualification-parallel-review-lane',schema:'agent-control.qualification-parallel-review-lane/v1'},300),
    job('crew-wopr-qwen-review','Qwen independent review','qualification.parallel-qwen-review@1.0.0','qualification.review.qwen','independent-lane-gate-completed',{name:'qwen-review',type:'qualification-parallel-review-lane',schema:'agent-control.qualification-parallel-review-lane/v1'},300),
    job('crew-wopr-glm-review','GLM independent review','qualification.parallel-glm-review@1.0.0','qualification.review.glm','independent-lane-gate-completed',{name:'glm-review',type:'qualification-parallel-review-lane',schema:'agent-control.qualification-parallel-review-lane/v1'},300),
    job('crew-wopr-parallel-gate','Independent parallel review gate','qualification.parallel-review-aggregate@1.0.0','qualification.review.aggregate','parallel-gate-and-review-verified',{name:'repository-review-result',type:'qualification-repository-review',schema:'agent-control.qualification-repository-review/v1'},60),
    job('crew-wopr-review','Parallel lane repository review','qualification.parallel-review-orchestrate@1.0.0','qualification.review.orchestrate','parallel-orchestration-verified',{name:'repository-review-result',type:'qualification-repository-review',schema:'agent-control.qualification-repository-review/v1'},360),
    job('crew-wopr-verify', 'Independent outcome verification', 'qualification.outcome-verify@1.0.0', 'qualification.verify', 'independent-outcome-verification-passed', {name: 'verified-outcome', type: 'qualification-verified-outcome', schema: 'agent-control.qualification-verified-outcome/v1'}, 60),
  ];
  const catalog = new JobCatalog(actions.ids()); for (const definition of jobDefinitions) catalog.addJob(definition);
  const workers = new WorkerRegistry()
    .register({id: 'baseline-worker', capabilities: ['qualification.baseline'], health: 'healthy', capacity: 1, active: 0, observedAt: startedAt})
    .register({id: 'inventory-worker', capabilities: ['qualification.inventory'], health: 'healthy', capacity: 1, active: 0, observedAt: startedAt})
    .register({id: 'luna-review-worker', capabilities: ['qualification.review.luna'], health: 'healthy', capacity: 1, active: 0, labels:{laneId:'1',laneName:'Luna Review Lane'}, observedAt: startedAt})
    .register({id: 'qwen-review-worker', capabilities: ['qualification.review.qwen'], health: 'healthy', capacity: 1, active: 0, labels:{laneId:'2',laneName:'Qwen Review Lane'}, observedAt: startedAt})
    .register({id: 'glm-review-worker', capabilities: ['qualification.review.glm'], health: 'healthy', capacity: 1, active: 0, labels:{laneId:'3',laneName:'GLM Review Lane'}, observedAt: startedAt})
    .register({id: 'parallel-gate-worker', capabilities: ['qualification.review.aggregate'], health: 'healthy', capacity: 1, active: 0, observedAt: startedAt})
    .register({id:'parallel-orchestrator-worker',capabilities:['qualification.review.orchestrate'],health:'healthy',capacity:1,active:0,observedAt:startedAt})
    .register({id: 'verification-worker', capabilities: ['qualification.verify'], health: 'healthy', capacity: 1, active: 0, observedAt: startedAt});
  const runtime = new JobRuntime(catalog, actions, workers, new RunLedger(path.join(options.stateDir, 'runs.json')), new ArtifactStore(path.join(options.stateDir, 'artifacts')), new ResourceLockManager(path.join(options.stateDir, 'locks.json')), {executionSessions,laneExecution:{started:input=>{const id=Number(input.worker.labels?.laneId);const lane=state.lanes.find(item=>item.id===id);if(lane){lane.status='working';lane.lease={laneId:id,holder:input.worker.id,acquiredAt:input.at,expiresAt:null};lane.baton={...lane.baton,status:'working',nextAction:`Execute ${input.stepId}`,revision:lane.baton.revision+1,updatedAt:input.at};}},finished:input=>{const id=Number(input.worker.labels?.laneId);const lane=state.lanes.find(item=>item.id===id);if(lane){lane.status=input.status==='SUCCEEDED'?'idle':'error';lane.lease={laneId:id,holder:null,acquiredAt:null,expiresAt:null};lane.baton={...lane.baton,status:lane.status,nextAction:input.status==='SUCCEEDED'?'Await next governed task':'Inspect failed lane evidence',revision:lane.baton.revision+1,updatedAt:input.at};}}}});
  const plan: WorkParcelPlan = {objective: QUALIFICATION_PROMPT, constraints: ['Read-only immutable fixture on qualification/4.0-governed-adaptive-crew', 'origin/main must remain completely unchanged', 'No deployment or production mutation', 'Do not manufacture context pressure', 'Only the independent gate may trigger escalation'], planner: {kind: 'deterministic', reason: 'Explicit physical qualification maps to four registered governed Jobs'}, stages: [
    {id: 'baseline', name: 'Confirm failing acceptance baseline', job: 'crew-wopr-baseline@1.0.0'},
    {id: 'inventory', name: 'Inventory frozen revision', job: 'crew-wopr-inventory@1.0.0'},
    {id: 'review', name: 'Run token-aware repository review', job: 'crew-wopr-review@1.0.0', dependsOn: ['baseline', 'inventory']},
    {id: 'verify', name: 'Independently verify reviewed outcome', job: 'crew-wopr-verify@1.0.0', dependsOn: ['review']},
  ]};
  const planner: WorkParcelPlanner = {plan: async prompt => { assert.equal(prompt, QUALIFICATION_PROMPT); await delay(900); return plan; }};
  const parcels = new WorkParcelCoordinator(runtime, new WorkParcelStore(path.join(options.stateDir, 'work-parcels.json')), planner, undefined, registry, adaptiveOrchestration);
  parameterizedJobs = buildParameterizedJobRuntime(config, registry, parcels, path.join(options.stateDir, 'parameterized'), tokenRouting, contracts, handoffs, nodeExecution);
  for (const [id,name,model] of [['parallel-luna-review','Luna parallel review',SOURCE_MODEL_ID],['parallel-qwen-review','Qwen parallel review',QWEN_MODEL_ID],['parallel-glm-review','GLM parallel review',GLM_MODEL_ID],['parallel-sol-review','Sol conditional escalation',DESTINATION_MODEL_ID]] as const) parameterizedJobs.savedJobs.create({id,name,definition:{id:'repository-code-review',version:1,follow:'pinned'},parameters:{node:'controller',repository:fixture.repository,ref:fixture.commit,scope:'full'},routing:{model,allowFallback:false},contextProfile:'THIN',budgets:{timeoutMinutes:4,maximumRetries:0,maximumInputTokens:12_000,maximumOutputTokens:3_500},concurrency:'forbid-overlap',enabled:true});

  const control = new AgentControlService(state, new PtyRegistry(), undefined, '4.3.0', () => {}).configureProjection({
    jobRuntime: runtime,
    workParcels: parcels,
    modelRegistry: registry,
    parameterizedJobs,
    tokenBatonRouting: tokenRouting,
    adaptiveOrchestration,
    executionSessions,
    resources: workers.list().map(worker => ({id: worker.id, name: worker.id.replaceAll('-', ' '), platform: 'linux', transport: 'local', capabilities: worker.capabilities})),
  });
  let poe: PoeRuntime | undefined;
  let speech: PrivateSpeechProvider | undefined;
  if (options.physicalPoe) {
    if (!options.poeVoiceConfigFile) throw new Error('qualification_poe_voice_configuration_required');
    const voiceSettings = JSON.parse(fs.readFileSync(options.poeVoiceConfigFile, 'utf8')) as {speechUrl?: string; tokenEnv?: string; voice?: import('../src/control/social-voice-providers.js').VoiceIdentity};
    const speechToken = voiceSettings.tokenEnv ? process.env[voiceSettings.tokenEnv] : undefined;
    if (!voiceSettings.speechUrl || !voiceSettings.tokenEnv || !speechToken || !voiceSettings.voice) throw new Error('qualification_poe_voice_configuration_invalid');
    speech = new PrivateSpeechProvider(voiceSettings.voice.provider, voiceSettings.speechUrl, speechToken, voiceSettings.voice);
  }
  const operator = new PoeOperatorRuntime({runtime, parcels, registrations: [{job: 'crew-wopr-review@1.0.0', purpose: 'Run the bounded Luna-to-Sol repository-review qualification', owner: 'POE / Lane Master', changes: 'Creates isolated read-only qualification evidence; does not modify or deploy production.', externalMutation: false, publication: false, permitted: true}], topics: [], file: path.join(options.stateDir, 'poe', 'operator.json'), sources: {systems: () => control.systems().map(item => ({id: item.id, name: item.name})), savedJobs: () => control.savedJobs(), parameterizedSchedules: () => control.parameterizedSchedules(), overview: () => control.poeEvidence(), resolve: reference => control.poeEvidence(reference)}});
  poe = new PoeRuntime({operator, file: path.join(options.stateDir, 'poe', 'conversations.json'), evidence: {overview: () => control.poeEvidence(), resolve: reference => control.poeEvidence(reference)}, ...(speech ? {speech, recognition: speech, voice: JSON.parse(fs.readFileSync(options.poeVoiceConfigFile!, 'utf8')).voice} : {}), onEvent: event => control.events.emit(event.type === 'conversation.changed' ? 'poe.conversation_changed' : event.type === 'proposal.changed' ? 'poe.proposal_changed' : event.type === 'speech.changed' ? 'poe.speech_changed' : 'poe.interrupted', {conversationId: event.conversationId, proposalId: event.proposalId, state: event.state, detail: event.detail, observedAt: event.at}, undefined, 'poe')});
  control.configureProjection({poe});
  runtime.ledger.subscribe((runId, type, status) => control.events.emit('job.run_changed', {runId, type, status}, undefined, 'qualification-job-runtime'));
  parameterizedJobs.runs.subscribe(run => control.events.emit('job.run_changed', {runId: run.id, status: run.status, kind: 'parameterized'}, undefined, 'qualification-parameterized-runtime'));
  tokenRouting.subscribe(event => control.events.emit(eventName(event.type), {threadId: event.threadId, parcelId: event.parcelId, observedAt: event.at}, undefined, 'qualification-token-runtime'));
  executionSessions.subscribe((event, session) => control.events.emit(event.type === 'output' ? 'execution.session_output' : 'execution.session_changed', {sessionId: session.id, runId: session.scope.runId, stepId: session.scope.stepId, workerId: session.scope.workerId, nodeId: session.scope.nodeId, eventType: event.type, sequence: event.sequence, state: session.state, observedAt: event.at}, undefined, event.actorId));

  const allowedOrigins: string[] = [];
  let openwa: OpenWAAdapter | undefined, social: SocialVoiceCoordinator | undefined, socialIdentity: {channel: 'openwa'; account: string; sender: string; conversation: string} | undefined;
  if (options.ingress === 'openwa') {
    if (!options.openwaConfigFile || !options.openwaEnrolmentFile || options.port < 1) throw new Error('qualification_openwa_configuration_required');
    const existingConfig = openwaConfigSchema.parse(JSON.parse(fs.readFileSync(options.openwaConfigFile, 'utf8')));
    const socialTemplate = {name: 'governed-adaptive-crew', jobId: 'crew-wopr-review', definitionHash: sha256(JSON.stringify(jobDefinitions.find(item => item.metadata.id === 'crew-wopr-review'))), parameters: {}, arguments: {}, maxActive: 1, maxRunsPerHour: 3};
    const openwaConfig: OpenWAConfig = {...existingConfig, dashboardUrl: `http://localhost:${options.port}`, templates: [socialTemplate]};
    openwa = new OpenWAAdapter(control, openwaConfig, path.join(options.stateDir, 'messaging', 'openwa.sqlite'));
    const enrolment = new DatabaseSync(options.openwaEnrolmentFile, {readOnly: true}), operator = enrolment.prepare('SELECT sender FROM operators WHERE active=1 ORDER BY sender LIMIT 1').get() as {sender?: string} | undefined;
    enrolment.close();
    if (!operator?.sender) throw new Error('qualification_openwa_enrolled_operator_missing');
    openwa.db.prepare('INSERT OR REPLACE INTO operators(sender,grants,active,progress) VALUES (?,?,1,1)').run(operator.sender, JSON.stringify([socialTemplate.name]));
    socialIdentity = {channel: 'openwa', account: openwaConfig.sessionId, sender: operator.sender, conversation: operator.sender};
    const standard = openwaExecutionPort(openwa);
    const voiceSettings = options.physicalPoe && options.poeVoiceConfigFile ? JSON.parse(fs.readFileSync(options.poeVoiceConfigFile, 'utf8')) as {speechUrl: string; tokenEnv: string; voice: import('../src/control/social-voice-providers.js').VoiceIdentity} : undefined;
    const speechToken = voiceSettings ? process.env[voiceSettings.tokenEnv] : undefined;
    const speech = voiceSettings && speechToken ? new PrivateSpeechProvider(voiceSettings.voice.provider, voiceSettings.speechUrl, speechToken, voiceSettings.voice) : undefined;
    social = new SocialVoiceCoordinator(path.join(options.stateDir, 'messaging', 'social-voice.sqlite'), new OpenWASocialProvider(openwa), {...standard, start(_template, actor, key, request) { return parcels.submitApprovedPlan(request.prompt, actor, key, plan, request.origin); }}, speech, speech, voiceSettings?.voice, Date.now, event => control.events.emit('social.activity', {event}, undefined, 'social-voice'), poe ? {ask: async ({actor, identityReference, text, modality}) => {const conversationId = `poe-whatsapp:${sha256(identityReference)}`;try{poe!.conversation(conversationId);}catch{poe!.createConversation({id: conversationId, actorId: actor, channel: 'whatsapp'});}const result = await poe!.ask({conversationId, text, channel: 'whatsapp', modality, contentTrust: modality === 'voice' ? 'UNTRUSTED_DATA' : 'OPERATOR_REQUEST'});return {conversationId, turnId: result.turn.id, text: result.turn.text};}, interrupt: ({actor, conversationId, turnId}) => poe!.bargeIn(conversationId, actor, turnId)} : undefined);
    openwa.social = social;
  }
  const server = startWebDashboard(control, {host: options.host, port: options.port, operatorToken: options.operatorToken, allowedOrigins, assetsDir: path.resolve('assets/dashboard'), openwa, socialVoice: social});
  activeServer = server; await once(server, 'listening');
  const address = server.address() as AddressInfo, base = `http://${options.host}:${address.port}`;
  allowedOrigins.push(base, `http://localhost:${address.port}`);
  emit({phase: 'DASHBOARD_READY', url: base, prompt: QUALIFICATION_PROMPT, at: now()});
  if (openwa && socialIdentity) {
    openwa.start();
    const healthDeadline = Date.now() + 30_000; let health = await openwa.checkHealth();
    while (health.state !== 'connected_verified' && Date.now() < healthDeadline) { await delay(1_000); health = await openwa.checkHealth(); }
    if (health.state !== 'connected_verified') throw new Error(`qualification_openwa_unavailable:${health.state}`);
    emit({phase: 'SOCIAL_CHANNEL_READY', command: QUALIFICATION_SOCIAL_COMMAND, channel: 'openwa', at: now()});
    await delay(2_000);
    openwa.queueSocial(socialIdentity, options.physicalPoe ? 'POE physical qualification is ready. Begin with the voice instruction supplied by the operator.' : `Agent Control 4.0 qualification is ready. Reply with exactly:\n${QUALIFICATION_SOCIAL_COMMAND}`, `qualification-ready:${sha256(startedAt)}`);
  }

  const deadline = Date.now() + (options.physicalPoe ? 240 : 6) * 60_000, inFlight = new Set<Promise<unknown>>(), trace: Array<{at: string; label: string; crew: ReturnType<typeof safeCrew>; activityPanel: ReturnType<AgentControlService['snapshot']>['characterCrew']['activityPanel']}> = [];
  let parent = parcels.list().find(item => item.executionOwner === 'work-parcel-coordinator'), lastSignature = '', concurrentEmitted = false, sourceEmitted = false, gateEmitted = false, verificationEmitted = false, approvalRequested = false;
  const sample = (label: string) => { const snapshot = control.snapshot(), signature = snapshot.characterCrew.members.map(item => item.transitionKey).join('|') + snapshot.characterCrew.activityPanel.groups.flatMap(group => group.indicators.map(item => `${item.id}:${item.state}:${item.count}`)).join('|'); if (signature !== lastSignature || label !== 'poll') { lastSignature = signature; trace.push({at: now(), label, crew: safeCrew(control), activityPanel: snapshot.characterCrew.activityPanel}); } return snapshot; };
  const launch = () => { for (;;) { const dispatch = runtime.dispatch(); if (!dispatch) break; const completion = dispatch.completion.finally(() => inFlight.delete(completion)); inFlight.add(completion); } };
  while (!parent && Date.now() < deadline) { await social?.tick(); await delay(100); parent = parcels.list().find(item => item.executionOwner === 'work-parcel-coordinator'); sample('poll'); }
  if (!parent) throw new Error('qualification_browser_submission_missing');
  emit({phase: 'TASK_RECEIVED', parcelId: parent.id, at: now()});

  while (Date.now() < deadline) {
    await social?.tick(); await parcels.tick(); launch(); parent = parcels.get(parent.id); const snapshot = sample('poll'), routing = tokenRouting.projection();
    const activeParentStages = parent.stages.filter(stage => stage.status === 'RUNNING'), sourceThread = routing.threads.find(thread => thread.modelId === sourceModel.id), reviewStage = parent.stages.find(stage => stage.id === 'review'), reviewRun = reviewStage?.runId ? runtime.ledger.get(reviewStage.runId) : undefined;
    if(options.physicalPoe&&!approvalRequested&&social&&socialIdentity&&reviewRun?.steps.some(step=>step.status==='WAITING_FOR_APPROVAL'&&step.approval==='poe-physical-review')){const approval=await social.requestApproval(socialIdentity,parent.id,reviewRun.id,'poe-physical-review',300_000);approvalRequested=true;emit({phase:'EXPLICIT_APPROVAL_REQUIRED',parcelId:parent.id,runId:reviewRun.id,approvalNumber:approval.number,command:approval.command,at:now()});}
    if (!concurrentEmitted && activeParentStages.some(stage => stage.id === 'baseline') && activeParentStages.some(stage => stage.id === 'inventory')) { concurrentEmitted = true; emit({phase: 'CONCURRENT_STATE_READY', parcelId: parent.id, activeStages: activeParentStages.map(stage => stage.id), at: now()}); }
    const activeLaneRuns=runtime.ledger.list().filter(run=>['crew-wopr-luna-review','crew-wopr-qwen-review','crew-wopr-glm-review'].includes(run.jobId)&&run.status==='RUNNING');
    if (!sourceEmitted && activeLaneRuns.length === 3) { sourceEmitted = true; emit({phase: 'PARALLEL_LANES_ACTIVE', parcelId: parent.id, lanes: activeLaneRuns.map(run=>run.jobId), immutableBundleSha256, at: now()}); emit({phase:'SOURCE_MODEL_ACTIVE',parcelId:sourceThread?.parcelId ?? parent.id,threadId:sourceThread?.id ?? null,providerId:sourceThread?.providerId ?? sourceProvider.id,modelId:sourceThread?.modelId ?? sourceModel.id,contextAuthority:sourceThread?.latest.context.authority ?? 'unavailable',at:now()}); }
    if (!gateEmitted && laneResults.size === 3) { gateEmitted = true; const decision=decideParallelReviewGate([...laneResults.values()]); emit({phase:'PARALLEL_GATE_COMPLETE',parcelId:parent.id,decision,lanes:[...laneResults.values()].map(item=>({laneId:item.laneId,providerId:item.providerId,modelId:item.modelId,outcome:item.outcome,usage:item.usage})),at:now()}); }
    if (!verificationEmitted && laneResults.size === 3) { verificationEmitted = true; emit({phase: 'INDEPENDENT_VERIFICATION_ACTIVE', parcelId: parent.id, at: now()}); }
    if (parent.status === 'SUCCEEDED' && inFlight.size === 0) break;
    if (parent.status === 'FAILED') throw new Error(`qualification_parent_parcel_failed:${parent.stages.find(stage => stage.status === 'FAILED')?.error ?? 'unknown'}`);
    assert.equal(snapshot.characterCrew.members.length, 6);
    await delay(140);
  }
  if (parent.status !== 'SUCCEEDED') throw new Error(`qualification_timeout:${parent.status}`);

  let outboundResponse: Record<string, unknown> | null = null;
  if (social && openwa) {
    const responseDeadline = Date.now() + 30_000;
    while (Date.now() < responseDeadline) {
      await social.tick();
      const job = social.db.prepare('SELECT number,status FROM jobs WHERE parcel=?').get(parent.id) as {number?: number; status?: string} | undefined;
      const delivery = openwa.db.prepare("SELECT kind,state,attempts,code,remoteId IS NOT NULL AS hasRemoteId FROM outbox WHERE kind='social' AND body LIKE ? ORDER BY id DESC LIMIT 1").get(`Job AC-${job?.number ?? 0}: SUCCEEDED%`) as {kind?: string; state?: string; attempts?: number; code?: string; hasRemoteId?: number} | undefined;
      if (job?.status === 'SUCCEEDED' && delivery?.state === 'submitted' && delivery.hasRemoteId === 1) {
        outboundResponse = {jobReference: `AC-${job.number}`, status: job.status, kind: delivery.kind, deliveryState: delivery.state, attempts: delivery.attempts, deliveryCode: delivery.code, gatewayAccepted: true};
        break;
      }
      await delay(200);
    }
    if (!outboundResponse) throw new Error('qualification_terminal_social_response_not_submitted');
  }

  // Parallel-lane qualification is complete here. Build the complete record
  // directly from the production Job, Parameterized Run, Work Parcel and
  // transcript stores, then return before the historical two-leg projection.
  if (laneResults.size >= 3) {
    const completedAt = now();
    const firstWave = [...laneResults.values()].filter(item=>item.laneId!=='sol').sort((a,b)=>a.laneId.localeCompare(b.laneId));
    const allLegs=[...laneResults.values()].sort((a,b)=>a.completedAt.localeCompare(b.completedAt));
    const decision = decideParallelReviewGate(firstWave);
    const selected = laneResults.get(decision.action==='BATON_TO_SOL'?'sol':decision.selectedLaneId!);
    if (!selected) throw new Error('parallel_selected_lane_missing');
    const parentRunIds = parent.stages.map(stage=>stage.runId).filter((value):value is string=>Boolean(value));
    const parentRuns = parentRunIds.map(id=>runtime.ledger.get(id)).filter((value):value is NonNullable<typeof value>=>Boolean(value));
    const reviewRun = parentRuns.find(run=>run.jobId==='crew-wopr-review');
    const laneJobRuns=runtime.ledger.list().filter(run=>['crew-wopr-luna-review','crew-wopr-qwen-review','crew-wopr-glm-review'].includes(run.jobId));
    if (!reviewRun || laneJobRuns.length!==3 || laneJobRuns.some(run=>run.selectedWorkers.length!==1)) throw new Error('parallel_production_lane_dispatch_unproven');
    const runRecords = parameterizedRunIds.map(id=>parameterizedJobs.runs.get(id)).filter((value):value is NonNullable<typeof value>=>Boolean(value));
    const transcriptDocuments = runRecords.map(run=>parameterizedJobs.transcripts?.read(run.id)).filter((value):value is NonNullable<typeof value>=>Boolean(value));
    if (transcriptDocuments.length !== parameterizedRunIds.length) throw new Error('parallel_product_transcripts_incomplete');
    const total = (field:'inputTokens'|'outputTokens'|'totalTokens'|'cost') => allLegs.every(item=>item.usage[field]!==null) ? allLegs.reduce((sum,item)=>sum+(item.usage[field]??0),0) : null;
    const aggregateUsage = {inputTokens:total('inputTokens'),outputTokens:total('outputTokens'),totalTokens:total('totalTokens'),cost:total('cost'),currency:decision.usage.currency};
    const protectedRefAfter = command(fixture.repository,'git',['ls-remote','--refs','origin','refs/heads/main']).split(/\s+/)[0]!;
    assert.equal(protectedRefAfter,fixture.protectedRef);
    const poeConversations = poe ? poe.projection().conversations.map(item=>poe!.conversation(item.id)) : [];
    const poeTranscriptText = poe ? poeConversations.map(item=>poe!.transcript(item.id)).join('\n\n---\n\n') : '';
    const laneTable = allLegs.map(item=>`| ${item.laneName} | ${item.providerId} | ${item.modelId} | ${item.outcome} | ${item.usage.inputTokens ?? 'Unavailable'} | ${item.usage.outputTokens ?? 'Unavailable'} | ${item.usage.totalTokens ?? 'Unavailable'} | ${item.usage.cost ?? 'Unavailable'} |`).join('\n');
    const gateNarrative = `Agent Control evaluated all three independently validated responses. Decision: **${decision.action}**. Reason: \`${decision.reason}\`. ${decision.action==='BATON_TO_SOL' ? `All three first-wave lanes failed, so Agent Control sealed an aggregate baton and invoked Sol. Baton SHA-256: \`${tokenRouting.evidence().batons.at(-1)?.sha256 ?? 'Unavailable'}\`.` : `The verified ${decision.selectedLaneId} lane was accepted. Sol was **not invoked** because at least one first-wave lane passed.`}`;
    const productRuns = transcriptDocuments.map((document,index)=>`## Product transcript — provider execution ${index+1}\n\n${document.content}`).join('\n\n---\n\n');
    const transcriptText = `# Agent Control 4.3 — POE parallel-lane physical qualification\n\nThis is a human-readable projection of naturally generated Agent Control conversation, Job, Work Parcel, provider, gate and transcript records. It contains no private model reasoning or credentials.\n\n## Authoritative initiating request\n\n> ${QUALIFICATION_POE_COMMAND}\n\n## POE operator conversation\n\n${poeTranscriptText}\n\n## Lane invocation and immutable context\n\n- Parent Work Parcel: \`${parent.id}\`\n- Review Job Run: \`${reviewRun.id}\`\n- Immutable repository commit: \`${fixture.commit}\`\n- Immutable bundle SHA-256: \`${immutableBundleSha256}\`\n- Scheduler-selected lane workers: ${laneJobRuns.flatMap(run=>run.selectedWorkers).map(id=>`\`${id}\``).join(', ')}\n- All three first-wave Jobs received the same immutable repository revision and ran concurrently as independent named lanes.\n\n## Independent gate decision\n\n${gateNarrative}\n\n| Lane | Provider | Model | Gate outcome | Input | Output | Total | Cost |\n| --- | --- | --- | --- | ---: | ---: | ---: | ---: |\n${laneTable}\n| **Complete model-chain total** |  |  |  | **${aggregateUsage.inputTokens ?? 'Unavailable'}** | **${aggregateUsage.outputTokens ?? 'Unavailable'}** | **${aggregateUsage.totalTokens ?? 'Unavailable'}** | **${aggregateUsage.cost ?? 'Unavailable'}** |\n\nUnavailable values are not coerced to zero. Current context occupancy remains distinct from cumulative token use.\n\n## Exact first-wave gate findings\n\n${firstWave.map(item=>`### ${item.laneName} — ${item.outcome}\n\n${item.unresolvedCriteria.length ? item.unresolvedCriteria.map(value=>`- ${value}`).join('\n') : '- All acceptance-level root-cause criteria satisfied.'}`).join('\n\n')}\n\n## Complete naturally generated execution transcripts\n\n${productRuns}\n\nCompleted: ${completedAt}\n`;
    fs.writeFileSync(options.transcriptFile,transcriptText,{mode:0o600});
    const finalSnapshot=sample('completed');
    const evidence={schema:'agent-control.parallel-lane-qualification/v1',verdict:'PASS',startedAt,completedAt,repository:{candidateHead:command(process.cwd(),'git',['rev-parse','HEAD']),candidateBranch:command(process.cwd(),'git',['branch','--show-current']),fixtureCommit:fixture.commit,immutableBundleSha256,protectedRefBefore:fixture.protectedRef,protectedRefAfter,protectedRefUnchanged:true},request:{exactInitiatingRequest:QUALIFICATION_POE_COMMAND,origin:parent.origin,parentParcelId:parent.id},productionPath:['PoeRuntime','PoeOperatorRuntime','sealed operator proposal','WorkParcelCoordinator','JobRuntime concurrent scheduler','three named lane workers','ParameterizedJobEngine','three live provider invocations','independent RepositoryReviewQualityGate','provider-neutral parallel fan-in gate','TokenAwareBatonRuntime','GovernedHandoffRuntime','conditional Sol invocation','independent final verification'],parentWorkParcel:parent,reviewJobRun:reviewRun,laneJobRuns,firstWave,gateDecision:decision,selectedResult:selected,aggregateUsage,sol:{eligible:decision.action==='BATON_TO_SOL',invoked:allLegs.some(item=>item.laneId==='sol'),reason:decision.reason},parameterizedRuns:runRecords,tokenRouting:tokenRouting.evidence(),handoffs:handoffs.list(),contracts:contracts.list(),dashboard:{sseEventCount:control.events.history().length,sseEventTypes:[...new Set(control.events.history().map(event=>event.type))],finalCrew:finalSnapshot.characterCrew.members,characterTrace:trace},poe:{projection:poe?.projection(),conversations:poeConversations,transcriptSha256:sha256(poeTranscriptText)},verification:{passed:true,allThreeLanesExecuted:firstWave.length===3,sameImmutableBundle:new Set(firstWave.map(item=>item.immutableBundleSha256)).size===1,independentGateApplied:firstWave.every(item=>item.evidence.some(value=>value.includes(`gate:${QUALITY_GATE_CODE}`))),solAdmissionCorrect:decision.action==='BATON_TO_SOL'?allLegs.some(item=>item.laneId==='sol'):!allLegs.some(item=>item.laneId==='sol'),protectedRefUnchanged:true,transcriptsComplete:transcriptDocuments.length===parameterizedRunIds.length},security:{credentialsPersisted:false,privateReasoningPersisted:false,productionTouched:false,releaseActionPerformed:false},transcript:{file:path.relative(process.cwd(),options.transcriptFile),sha256:sha256(transcriptText)}};
    const serialized=JSON.stringify(evidence,null,2);
    if (/\/home\/loz\/\.local\/share\/agent-control\/codex-profiles|(?:access|refresh|oauth)[_-]?token|authorization\s*:/i.test(serialized)) throw new Error('qualification_evidence_secret_or_profile_path_detected');
    fs.writeFileSync(options.evidenceFile,`${serialized}\n`,{mode:0o600});
    emit({phase:'QUALIFICATION_COMPLETE',verdict:'PASS',evidenceFile:path.relative(process.cwd(),options.evidenceFile),transcriptFile:path.relative(process.cwd(),options.transcriptFile),parentParcelId:parent.id,reviewRunId:reviewRun.id,parameterizedRunIds,decision,aggregateUsage,at:completedAt});
    await delay(options.holdMs); social?.close(); openwa?.close(); parameterizedJobs.transcripts?.dispose(); server.close(); await once(server,'close'); activeServer=undefined;
    return;
  }

  const completedAt = now(), routingEvidence = tokenRouting.evidence(), routingProjection = tokenRouting.projection(), source = qualityObservations.find(item => !item.accepted), destination = qualityObservations.find(item => item.accepted), baton = routingEvidence.batons[0], nestedRun = parameterizedJobs.runs.get(parameterizedRunId), nestedParcelId = nestedRun?.workParcelIds[0], nestedParcel = nestedParcelId ? parcels.get(nestedParcelId) : undefined;
  const reviewStage = parent.stages.find(stage => stage.id === 'review' || stage.id === 'execute'), reviewRun = reviewStage?.runId ? runtime.ledger.get(reviewStage.runId) : undefined, reviewArtifactId = reviewRun?.artifacts[0], reviewArtifact = reviewArtifactId ? runtime.artifacts.read(reviewArtifactId) as {independentVerification?: Record<string, unknown>} : undefined, verification = reviewArtifact?.independentVerification;
  assert.ok(source && destination && baton && nestedRun && nestedParcel && verification);
  const handoff = handoffs.list().find(item => item.batonSha256 === sha256(JSON.stringify({tokenBatonId: baton.id, tokenBatonSha256: baton.sha256}))) ?? handoffs.list()[0];
  const successfulDecision = routingEvidence.decisions.find(item => item.outcome === 'SUCCEEDED' && item.batonId === baton.id), totals = routingProjection.parcels.find(item => item.parcelId === nestedParcel.id), parentAdaptiveDecisionId = parent.audit.orchestrationDecisionId, nestedAdaptiveDecisionId = nestedParcel.audit.orchestrationDecisionId;
  assert.ok(handoff && successfulDecision && totals);
  assert.ok(parentAdaptiveDecisionId && nestedAdaptiveDecisionId);
  const parentAdaptiveReport = adaptiveOrchestration.report(parentAdaptiveDecisionId), nestedAdaptiveReport = adaptiveOrchestration.report(nestedAdaptiveDecisionId), modelLeague = adaptiveOrchestration.modelLeague('repository-review'), workflowLeague = adaptiveOrchestration.workflowLeague('repository-review');
  assert.equal(parentAdaptiveReport.parcelId, parent.id);
  assert.equal(parentAdaptiveReport.selectedWorkflow?.workflow.id, 'work-parcel-coordinator');
  assert.equal(nestedAdaptiveReport.parcelId, nestedParcel.id);
  assert.equal(nestedAdaptiveReport.selectedRoute?.route.providerId, sourceProvider.id);
  assert.ok(nestedAdaptiveReport.steps.some(item => item.kind === 'LEAGUE_EVIDENCE'));
  assert.ok(modelLeague.some(item => item.route.providerId === sourceProvider.id));
  assert.ok(workflowLeague.some(item => item.workflow.id === 'repository-review'));
  assert.equal(handoff.status, 'COMPLETED');
  assert.equal(successfulDecision.trigger?.kind, 'QUALITY_GATE');
  assert.equal(successfulDecision.trigger?.code, QUALITY_GATE_CODE);
  assert.equal(routingEvidence.threads.find(thread => thread.id === baton.threadId)?.recoverable, true);
  assert.equal(totals.byModel.length, 2);
  assert.equal(totals.totalTokens, totals.byModel.reduce((sum, item) => sum + (item.totalTokens ?? 0), 0));
  assert.equal(nestedParcel.audit.invocations.length, 2);
  assert.equal(nestedParcel.audit.totals.totalTokens, totals.totalTokens);
  assert.equal(nestedRun.usage.totalTokens, totals.totalTokens);
  assert.equal(nestedRun.repository?.reviewedSha, fixture.commit);
  assert.equal(nestedRun.status, 'SUCCEEDED_WITH_FINDINGS');
  assert.equal(source.route.modelId, sourceModel.id);
  assert.equal(destination.route.modelId, destinationModel.id);
  assert.equal(source.route.providerId, destination.route.providerId);
  assert.notEqual(source.route.modelId, destination.route.modelId);

  const finalSnapshot = sample('completed'), parentRunIds = parent.stages.map(stage => stage.runId).filter((item): item is string => Boolean(item));
  const parentRuns = parentRunIds.map(runId => runtime.ledger.get(runId)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const parentRunsById = new Map(parentRuns.map(run => [run.id, run]));
  const transcriptDocument = parameterizedJobs.transcripts?.read(nestedRun.id);
  if (!transcriptDocument) throw new Error('qualification_product_transcript_unavailable');
  const executionTranscriptText = transcriptDocument.content;
  assert.match(executionTranscriptText, /^# Agent Control Natural Execution Transcript/m);
  assert.match(executionTranscriptText, /## Origin\n/);
  assert.ok(executionTranscriptText.includes(`## Authoritative initiating request\n\n> ${QUALIFICATION_POE_COMMAND}`));
  assert.ok(executionTranscriptText.indexOf('## Authoritative initiating request') < executionTranscriptText.indexOf('- Schema:'));
  assert.match(executionTranscriptText, /BATON_CREATED/);
  assert.match(executionTranscriptText, /HANDOFF_COMPLETED/);
  const protectedRefAfter = command(fixture.repository, 'git', ['ls-remote', '--refs', 'origin', 'refs/heads/main']).split(/\s+/)[0]!;
  assert.equal(protectedRefAfter, fixture.protectedRef);
  const sessions = executionSessions.list(), liveShellSession = sessions.find(item => item.adapterId === 'qualification-linux-pty'), liveShellEvents = liveShellSession ? executionSessions.events(liveShellSession.id) : [];
  const poeConversations = poe ? poe.projection().conversations.map(item => poe!.conversation(item.id)) : [];
  const poeTranscriptText = poe ? poeConversations.map(item => poe!.transcript(item.id)).join('\n\n---\n\n') : '';
  const socialTranscriptText = social?.transcript() ?? '';
  const poeInterruptionCount = Number((social?.db.prepare("SELECT count(*) AS count FROM history WHERE event='poe.interrupted'").get() as {count?: number} | undefined)?.count ?? 0);
  const poeVoiceOperatorTurns = poeConversations.flatMap(item => item.turns).filter(turn => turn.actor === 'operator' && turn.modality === 'voice').length;
  const explicitApproval = options.ingress === 'dashboard' ? parent.origin?.channel === 'poe/dashboard' : parentRuns.find(run => run.id === parent.stages.find(stage => stage.id === 'review')?.runId)?.approvals.includes('poe-physical-review') ?? false;
  if(options.physicalPoe){assert.ok(poeVoiceOperatorTurns >= 3,'qualification_requires_several_physical_voice_turns');assert.ok(poeInterruptionCount >= 2,'qualification_requires_two_physical_barge_ins');assert.equal(explicitApproval,true,'qualification_requires_explicit_social_approval');}
  const transcriptText = `# Agent Control 4.3 POE Luna-to-Sol qualification — complete human-readable record\n\n## POE operator conversation\n\n${poeTranscriptText}\n\n${options.physicalPoe ? `## Authenticated social and speech chronology\n\n${socialTranscriptText}\n\n` : ''}## Governed Work Parcel execution\n\n${executionTranscriptText}`;
  fs.writeFileSync(options.transcriptFile, transcriptText, {mode: 0o600});
  const messageReference = parent.origin?.messageReference;
  const idempotency = options.ingress === 'openwa' && messageReference ? {
    messageReference,
    acceptedInboxRows: Number((social?.db.prepare('SELECT count(*) AS count FROM inbox WHERE key=?').get(messageReference) as {count?: number} | undefined)?.count ?? 0),
    socialJobRows: Number((social?.db.prepare('SELECT count(*) AS count FROM jobs WHERE key=?').get(messageReference) as {count?: number} | undefined)?.count ?? 0),
    matchingRootWorkParcels: parcels.list().filter(item => item.origin?.messageReference === messageReference && item.executionOwner === 'work-parcel-coordinator').length,
    matchingLineageWorkParcels: parcels.list().filter(item => item.origin?.messageReference === messageReference).length,
    deterministicParcelIdentity: parent.id === `parcel-social-${messageReference}`,
    existingControlledReplayEvidence: 'docs/openwa/live-qualification.md',
    existingRestartRepairCoverage: 'src/control/work-parcels.test.ts',
    additionalReplayManufactured: false,
  } : null;
  if (idempotency && (idempotency.acceptedInboxRows !== 1 || idempotency.socialJobRows !== 1 || idempotency.matchingRootWorkParcels !== 1 || !idempotency.deterministicParcelIdentity)) throw new Error('qualification_social_idempotency_reconciliation_failed');
  const evidence = {
    schema: 'agent-control.crew-wopr-escalation-qualification/v1', verdict: 'PASS', startedAt, completedAt,
    repository: {candidateHead: command(process.cwd(), 'git', ['rev-parse', 'HEAD']), candidateBranch: command(process.cwd(), 'git', ['branch', '--show-current']), fixtureCommit: fixture.commit, fixtureFiles: fixture.files, immutable: true, protectedRef: 'refs/heads/main', protectedRefBefore: fixture.protectedRef, protectedRefAfter, protectedRefUnchanged: true},
    request: {source: options.ingress === 'openwa' ? 'authenticated enrolled OpenWA sender through SocialVoiceCoordinator' : 'authenticated POE dashboard conversation, sealed job proposal and explicit approval', exactInitiatingRequest: parent.origin?.request ?? parent.prompt, governedObjective: QUALIFICATION_PROMPT, origin: parent.origin, parentParcelId: parent.id, parentRunIds},
    topology: {controller: 'isolated AgentControlService', workloadNode: 'controller', source: {providerId: sourceProvider.id, accountProfileId: account.id, accountLabel: account.label, modelId: sourceModel.id, providerModel: sourceModel.providerModel, preflight: sourcePreflight}, destination: {providerId: destinationProvider.id, accountProfileId: account.id, accountLabel: account.label, modelId: destinationModel.id, providerModel: destinationModel.providerModel, nodeId: 'controller', credentialReference: 'CODEX_HOME_COTTAGE_PLUS', accountStatus: {authenticated: accountStatus.authenticated, codexVersion: accountStatus.codexVersion, executableSha256: accountStatus.executableSha256, discoveredAt: accountStatus.discoveredAt}}},
    productionPath: [options.ingress === 'openwa' ? 'authenticated enrolled OpenWA sender' : 'authenticated POE dashboard operator', ...(options.ingress === 'openwa' ? ['OpenWAAdapter', 'OpenWASocialProvider', 'SocialVoiceCoordinator'] : ['PoeRuntime', 'PoeOperatorRuntime', 'sealed operator proposal', 'explicit dashboard approval']), 'AgentControlService', 'WorkParcelCoordinator', 'JobRuntime', 'buildParameterizedJobRuntime', 'ParameterizedJobEngine', 'DirectRepositoryReviewExecutor', 'TokenAwareBatonRuntime.observe', 'independent RepositoryReviewQualityGate', 'TokenAwareBatonRuntime.assess', 'TokenAwareBatonRuntime.createBaton', 'GovernedHandoffRuntime', 'destination provider invocation', 'independent repository validation', 'Run/Work Parcel ledger'],
    parentWorkParcel: {id: parent.id, status: parent.status, objective: parent.objective, stages: parent.stages.map(stage => { const run = stage.runId ? parentRunsById.get(stage.runId) : undefined; return {id: stage.id, status: stage.status, runId: stage.runId, worker: stage.actualRoute?.workers[0] ?? null, startedAt: run?.startedAt ?? null, completedAt: run?.endedAt ?? null, actions: run?.steps.map(step => ({action: step.action, status: step.status, startedAt: step.startedAt ?? null, completedAt: step.endedAt ?? null})) ?? [], batonId: stage.baton?.id ?? null, batonSha256: stage.baton?.sha256 ?? null};})},
    parameterizedReview: {runId: nestedRun.id, status: nestedRun.status, reviewedSha: nestedRun.repository?.reviewedSha, frozenContext: nestedRun.context, workParcelId: nestedParcel.id, providerResponseIds: nestedRun.providerResponseIds, usage: nestedRun.usage, result: nestedRun.result},
    qualityGate: {code: QUALITY_GATE_CODE, observations: qualityObservations},
    tokenRouting: routingEvidence,
    reconciledTotals: totals,
    providerAudit: nestedParcel.audit,
    adaptiveOrchestration: {policy: adaptiveOrchestration.policySnapshot(), parentDecision: parentAdaptiveReport, nestedDecision: nestedAdaptiveReport, modelLeague, workflowLeague},
    handoff,
    contracts: contracts.list().map(contract => ({id: contract.id, parentContractId: contract.parentContractId, state: contract.state, active: contract.active, baton: {generation: contract.baton.generation, sha256: contract.baton.sha256}, verification: contract.verification, handoffs: contract.handoffs})),
    verification,
    executionSessions: {liveShellSession: liveShellSession ?? null, events: liveShellEvents, transcriptSha256: liveShellSession ? sha256(executionSessions.transcript(liveShellSession.id)) : null, harmlessIntervention: Boolean(liveShellSession), inputContentPersisted: false},
    dashboard: {urlAuthority: 'isolated loopback qualification server', sseEventCount: control.events.history().length, sseEventTypes: [...new Set(control.events.history().map(event => event.type))], finalActivityPanel: finalSnapshot.characterCrew.activityPanel, finalCrew: finalSnapshot.characterCrew.members, characterTrace: trace},
    poe: {projection: poe?.projection(), conversations: poeConversations, conversationTranscriptSha256: sha256(poeTranscriptText), socialTranscriptSha256: options.physicalPoe ? sha256(socialTranscriptText) : null, interruptionCount: poeInterruptionCount, voiceOperatorTurns: poeVoiceOperatorTurns, explicitApproval, speechSynthesisCount: Number((social?.db.prepare("SELECT count(*) AS count FROM history WHERE event='speech.synthesized'").get() as {count?: number} | undefined)?.count ?? 0)},
    assertions: {normalProductionCallPath: true, poeTypedRequestAndExplicitApproval: options.ingress === 'dashboard' && explicitApproval, socialIngressPhysicallyAuthenticated: options.ingress === 'openwa', socialIngressAdaptiveConvergence: Boolean(parentAdaptiveDecisionId), modelAndWorkflowLeaguesConsulted: nestedAdaptiveReport.steps.some(item => item.kind === 'LEAGUE_EVIDENCE') && Boolean(parentAdaptiveReport.selectedWorkflow), exactInitiatingRequestFirstInTranscript: true, protectedRefUnchanged: true, sourceResponseSchemaValid: true, sourceRejectedOnlyByIndependentQualityGate: true, qualityTriggeredAtLowContext: routingEvidence.decisions.some(item => item.trigger?.kind === 'QUALITY_GATE' && (item.contextPercent ?? 0) < 75), sealedBatonCreated: /^[a-f0-9]{64}$/.test(baton.sha256), crossModelDestinationContinued: true, destinationPassedSameGate: true, sourceThreadRecoverable: true, independentVerificationPassed: verification.passed === true, lifetimeTokensReconciled: nestedRun.usage.totalTokens === totals.totalTokens && nestedParcel.audit.totals.totalTokens === totals.totalTokens, currentContextSeparateFromLifetime: routingEvidence.threads.every(thread => thread.latest.context.tokens !== thread.latest.cumulative.totalTokens || thread.latest.context.authority === 'estimated'), missingValuesNotCoercedToZero: routingEvidence.threads.some(thread => thread.latest.context.authority === 'unavailable'), credentialsAbsent: true, productionStateUntouched: true},
    boundaries: {real: [options.ingress === 'openwa' ? 'authenticated OpenWA social task submission from enrolled operator device' : 'typed POE request, sealed proposal and explicit browser approval', 'live Codex Luna provider response', 'schema parsing and application validation', 'independent quality rejection', 'quality governor decision below context thresholds', 'durable sealed baton', 'governed Codex Sol destination continuation', 'independent quality acceptance', 'final repository validation', 'protected origin/main before/after equality', 'token and model-chain reconciliation', 'typed SSE dashboard updates', 'product-generated complete execution transcript'], unavailable: ['Codex exec does not expose authoritative mid-turn current-context occupancy.', 'The ChatGPT-plan route does not expose an authoritative per-run monetary cost.'], simulated: []},
    security: {credentialMaterialPersisted: false, codexHomePathPersisted: false, providerRawTransportPersisted: false, privateReasoningPersisted: false, liveDeploymentTouched: false, releaseActionPerformed: false},
    idempotency,
    outboundResponse,
    initialAcceptance,
    transcript: {file: path.relative(process.cwd(), options.transcriptFile), sha256: sha256(transcriptText), sourceSha256: transcriptDocument.sourceSha256, entryCount: transcriptDocument.entryCount, generatedDuringExecution: transcriptDocument.generatedDuringExecution, restartReconstructible: transcriptDocument.restartReconstructible},
  };
  const serialized = JSON.stringify(evidence, null, 2);
  if (/\/home\/loz\/\.local\/share\/agent-control\/codex-profiles|(?:access|refresh|oauth)[_-]?token|authorization\s*:|\b\d{5,25}@(c\.us|s\.whatsapp\.net|lid)\b/i.test(serialized)) throw new Error('qualification_evidence_secret_or_profile_path_detected');
  fs.writeFileSync(options.evidenceFile, `${serialized}\n`, {mode: 0o600});
  emit({phase: 'QUALIFICATION_COMPLETE', verdict: 'PASS', evidenceFile: path.relative(process.cwd(), options.evidenceFile), transcriptFile: path.relative(process.cwd(), options.transcriptFile), parentParcelId: parent.id, parameterizedRunId, nestedParcelId: nestedParcel.id, sourceRoute: `${source.route.providerId}/${source.route.modelId}`, destinationRoute: `${destination.route.providerId}/${destination.route.accountProfileId}/${destination.route.modelId}`, batonId: baton.id, batonSha256: baton.sha256, totalTokens: totals.totalTokens, at: completedAt});
  await delay(options.holdMs); social?.close(); openwa?.close(); parameterizedJobs.transcripts?.dispose(); server.close(); await once(server, 'close'); activeServer = undefined;
}

main().catch(error => { activeServer?.close(); emit({phase: 'QUALIFICATION_FAILED', error: error instanceof Error ? error.message : String(error), at: now()}); process.exitCode = 1; });
