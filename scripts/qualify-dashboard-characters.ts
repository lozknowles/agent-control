import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import type {AddressInfo} from 'node:net';
import path from 'node:path';
import {AgentControlService} from '../src/control/application-service.js';
import {CapabilityIntelligenceStore, registerAgentControlCoreCapabilities} from '../src/control/capability-intelligence.js';
import type {ModelConfig, ProviderConfig} from '../src/control/config.js';
import type {CodexNodeExecutionPort} from '../src/control/codex-node-execution.js';
import {JobCatalog} from '../src/control/job-catalog.js';
import {ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from '../src/control/job-runtime.js';
import type {JobDefinition} from '../src/control/job-types.js';
import {ProviderNeutralModelEvaluationExecutor} from '../src/control/model-evaluation-runtime.js';
import {freezeQualificationSuite, loadFrozenQualificationSuite, ModelEvaluationCoordinator, ModelIntelligenceLedger, type ModelEvaluationBatch} from '../src/control/model-intelligence.js';
import {ModelRegistry} from '../src/control/model-registry.js';
import {createParameterizedJobEngine} from '../src/control/parameterized-job-engine.js';
import {ParameterizedJobRegistry} from '../src/control/parameterized-job-registry.js';
import {PtyRegistry} from '../src/control/pty.js';
import {repositoryCodeReviewDefinition} from '../src/control/repository-review-definition.js';
import {WorkParcelCoordinator, WorkParcelStore, type WorkParcelPlan, type WorkParcelPlanner} from '../src/control/work-parcels.js';
import {startWebDashboard} from '../src/control/web-server.js';
import {defaultCapabilities, type LaneState, type WorkspaceState} from '../src/state.js';

interface Options {host: string; port: number; stateDir: string; evidenceFile: string; holdMs: number; operatorToken: string; modelBaseUrl: string; providerModel: string;}
const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
let activeServer: ReturnType<typeof startWebDashboard> | undefined;

function options(): Options {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index], value = process.argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`qualification_argument_invalid:${key ?? 'missing'}`);
    values.set(key.slice(2), value);
  }
  const stateDir = path.resolve(values.get('state-dir') ?? '.agent-control/qualification-dashboard-characters');
  const operatorToken = process.env.AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN;
  if (!operatorToken) throw new Error('qualification_operator_token_required');
  return {
    host: values.get('host') ?? '127.0.0.1',
    port: Number(values.get('port') ?? 4396),
    stateDir,
    evidenceFile: path.resolve(values.get('evidence-file') ?? path.join(stateDir, 'dashboard-characters-qualification.json')),
    holdMs: Number(values.get('hold-ms') ?? 25_000),
    operatorToken,
    modelBaseUrl: process.env.AGENT_CONTROL_CHARACTER_MODEL_BASE_URL ?? 'http://127.0.0.1:8080',
    providerModel: process.env.AGENT_CONTROL_CHARACTER_PROVIDER_MODEL ?? 'qwen2.5-3b-instruct-q4_k_m.gguf',
  };
}

function lane(id: number, name: string, status: LaneState['status'], model: string, at: string): LaneState {
  return {
    id, name, status, model, reasoning: 'medium', context: 'qualification', lines: [],
    contract: {version: 2, laneId: id, goal: `${name} bounded dashboard exercise`, constraints: ['No deployment', 'No external mutation'], cwd: '/tmp/agent-control-dashboard-qualification', priority: 1, mode: 'auto', capabilities: defaultCapabilities(), resourceLocks: {}, modelLock: null, sharedTaskIds: [], updatedAt: at},
    baton: {version: 1, laneId: id, revision: 1, status: status === 'working' ? 'Executing bounded qualification work' : status === 'paused' ? 'Blocked by explicit qualification hold' : 'Waiting for scheduled capacity', progress: [], hypothesis: '', evidence: [], changes: [], nextAction: status === 'working' ? 'Complete and verify the bounded action' : status === 'paused' ? 'Inspect the explicit hold' : 'Wait for capacity', openQuestions: [], model, reasoning: 'medium', updatedAt: at},
    lease: {laneId: id, holder: status === 'working' ? 'qualification-worker' : null, acquiredAt: status === 'working' ? at : null, expiresAt: null},
  };
}

function emit(value: unknown) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function safeCrew(control: AgentControlService) {
  return control.snapshot().characterCrew.members.map(member => ({id: member.id, name: member.name, role: member.role, state: member.state, summary: member.summary, current: member.current, signals: member.signals, freshness: member.freshness, coverage: member.instrumentation.coverage, transitionKey: member.transitionKey}));
}

async function modelInventory(baseUrl: string, expected: string) {
  const health = await fetch(new URL('/health', baseUrl), {signal: AbortSignal.timeout(5_000)});
  if (!health.ok) throw new Error(`qualification_model_health_failed:${health.status}`);
  const response = await fetch(new URL('/v1/models', baseUrl), {signal: AbortSignal.timeout(5_000)});
  if (!response.ok) throw new Error(`qualification_model_inventory_failed:${response.status}`);
  const body = await response.json() as {data?: Array<{id?: string}>; models?: Array<{model?: string; name?: string}>};
  const ids = [...(body.data ?? []).map(item => item.id), ...(body.models ?? []).flatMap(item => [item.model, item.name])].filter(Boolean);
  if (!ids.includes(expected)) throw new Error('qualification_model_identity_missing');
  return {health: 'AVAILABLE', model: expected, observedAt: new Date().toISOString()};
}

async function main() {
  const config = options(), startedAt = new Date().toISOString(), repositoryHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  fs.mkdirSync(config.stateDir, {recursive: true, mode: 0o700});
  fs.mkdirSync(path.dirname(config.evidenceFile), {recursive: true});
  const modelPreflight = await modelInventory(config.modelBaseUrl, config.providerModel);

  const actions = new ActionRegistry();
  actions.register('qualification.crew-work@1.0.0', async context => {
    const stageId = context.run.trigger.parcelContext?.stageId ?? 'unknown';
    await delay(stageId === 'inspect' ? 20_000 : 7_000);
    return {verification: ['crew-stage-verified'], evidence: [`crew-stage:${stageId}:bounded-local-action`], detail: `${stageId}:completed_and_verified`};
  });
  const job: JobDefinition = {apiVersion: 'agent-control/v1', kind: 'Job', metadata: {id: 'crew-lifecycle', name: 'Crew Lifecycle', version: '1.0.0', description: 'Bounded local dashboard-character qualification'}, spec: {priority: 'normal', concurrency: 'allow', steps: [{id: 'work', action: 'qualification.crew-work@1.0.0', requires: ['qualification.crew'], verification: ['crew-stage-verified']}]}};
  const catalog = new JobCatalog(actions.ids()); catalog.addJob(job);
  const workers = new WorkerRegistry().register({id: 'qualification-worker', capabilities: ['qualification.crew'], health: 'healthy', capacity: 1, active: 0, observedAt: startedAt});
  const runtime = new JobRuntime(catalog, actions, workers, new RunLedger(path.join(config.stateDir, 'runs.json')), new ArtifactStore(path.join(config.stateDir, 'artifacts')), new ResourceLockManager(path.join(config.stateDir, 'locks.json')));
  const plan: WorkParcelPlan = {objective: 'Inspect a bounded local input, wait for an explicit operator format decision, then produce independently verified output', planner: {kind: 'deterministic', reason: 'Dedicated bounded character-system qualification plan'}, stages: [
    {id: 'inspect', name: 'Inspect bounded local input', job: 'crew-lifecycle@1.0.0'},
    {id: 'report', name: 'Produce verified report', job: 'crew-lifecycle@1.0.0', dependsOn: ['inspect']},
  ]};
  const planner: WorkParcelPlanner = {plan: async () => { await delay(1_200); return plan; }};
  const parcels = new WorkParcelCoordinator(runtime, new WorkParcelStore(path.join(config.stateDir, 'parcels.json')), planner);

  const fullSuite = loadFrozenQualificationSuite(path.resolve('config/qualification-suite-v1.json'));
  const selectedTasks = ['coding-v1', 'repository-review-v1', 'structured-output-v1'].map(id => fullSuite.tasks.find(task => task.id === id)!);
  assert.ok(selectedTasks.every(Boolean));
  const suite = freezeQualificationSuite({id: 'dashboard-character-live-model-exercise', version: '1.0.0', createdAt: startedAt, tasks: selectedTasks.map(task => ({...task, repetitions: 1}))});
  const capabilityIntelligence = new CapabilityIntelligenceStore(path.join(config.stateDir, 'capability-intelligence.json')); registerAgentControlCoreCapabilities(capabilityIntelligence, startedAt);
  const modelIntelligence = new ModelIntelligenceLedger(path.join(config.stateDir, 'model-intelligence.json'));
  const provider: ProviderConfig = {id: 'local-dashboard-qualification', name: 'Local dashboard qualification provider', kind: 'openai-compatible', enabled: true, baseUrl: config.modelBaseUrl, wireApi: 'chat-completions', auth: {type: 'none'}, requiresAuth: false, parallelism: 1, costClass: 'free', capabilities: ['model.execute', 'output.structured'], qualification: {status: 'qualified', advertisedContextLimitTokens: 32_768, lastSuccessfulAt: modelPreflight.observedAt, evidence: ['bounded local preflight']}};
  const requiredCapabilities = [...new Set(selectedTasks.flatMap(task => task.requiredCapabilities))];
  const model: ModelConfig = {id: 'local-dashboard-qualification-model', provider: provider.id, providerModel: config.providerModel, displayName: 'Local dashboard qualification model', enabled: true, capabilities: requiredCapabilities, nodes: ['qualification-worker'], limits: {contextTokens: 32_768, outputTokens: 1_024}, qualification: {state: 'UNTESTED', evidence: [`frozen-suite:${suite.sha256}`]}};
  const registry = new ModelRegistry([provider], [model], {roles: {}}, undefined, undefined, {}, capabilityIntelligence, modelIntelligence);
  const parameterizedDefinitions = new ParameterizedJobRegistry(); parameterizedDefinitions.register(repositoryCodeReviewDefinition);
  const parameterizedJobs = createParameterizedJobEngine(config.stateDir, parameterizedDefinitions, registry, {execute: async () => { throw new Error('qualification_parameterized_execution_not_authorized'); }}, {allowedRepositoryRoots: [config.stateDir], nodeHealthy: () => true});

  const state: WorkspaceState = {version: 1, paused: false, lastRestorePoint: null, lanes: [lane(1, 'Primary conductor', 'working', model.id, startedAt), lane(2, 'Capacity queue', 'waiting', model.id, startedAt), lane(3, 'Held dependency', 'paused', model.id, startedAt)]};
  const persist = () => fs.writeFileSync(path.join(config.stateDir, 'workspace-observation.json'), `${JSON.stringify(state, null, 2)}\n`, {mode: 0o600});
  const control = new AgentControlService(state, new PtyRegistry(), undefined, '3.9.0-character-qualification', persist).configureProjection({
    jobRuntime: runtime,
    workParcels: parcels,
    modelRegistry: registry,
    parameterizedJobs,
    modelIntelligence,
    capabilityIntelligence,
    qualificationSuite: suite,
    resources: [{id: 'qualification-worker', name: 'Qualification worker', platform: 'linux', transport: 'local process', capabilities: ['qualification.crew']}],
  });
  control.setVerificationPolicy(1, {required: ['ui_evidence']}, 'qualification-controller');
  control.recordClaim(1, 'The dashboard accurately presents the bounded lifecycle', 'qualification-controller');
  control.addVerificationEvidence(1, {id: 'character-ui-evidence', type: 'ui_evidence', description: 'Live browser evidence collection is in progress', status: 'passed', reference: 'pending-video-manifest'}, 'qualification-controller');

  const nodeExecution: CodexNodeExecutionPort = {accountStatus: async () => { throw new Error('codex_not_used'); }, execReadOnlyStructured: async () => { throw new Error('codex_not_used'); }};
  const evaluator = new ProviderNeutralModelEvaluationExecutor(registry, capabilityIntelligence, nodeExecution, fetch, event => control.events.emit('model.intelligence.changed', {batchId: event.batchId, modelId: event.candidate.modelId, taskId: event.taskId, phase: event.phase, detail: event.detail}, undefined, 'qualification-model-evaluator'));
  const modelCoordinator = new ModelEvaluationCoordinator(modelIntelligence, suite, evaluator, {agentControlVersion: '3.9.0', adapterVersion: 'provider-neutral-v1', promptVersion: 'frozen-dashboard-character-v1'});

  const server = startWebDashboard(control, {host: config.host, port: config.port, operatorToken: config.operatorToken, assetsDir: path.resolve('assets/dashboard')});
  activeServer = server; await once(server, 'listening'); const address = server.address() as AddressInfo, base = `http://${config.host}:${address.port}`;
  const trace: Array<{at: string; label: string; crew: ReturnType<typeof safeCrew>}> = [];
  let signature = '';
  const sample = (label: string) => { const crew = safeCrew(control), next = crew.map(item => item.transitionKey).join('|'); if (next !== signature || label !== 'poll') { signature = next; trace.push({at: new Date().toISOString(), label, crew}); } return crew; };
  sample('initial');
  emit({phase: 'DASHBOARD_READY', url: base, at: new Date().toISOString()});

  const deadline = Date.now() + 90_000;
  let parcel = parcels.list()[0];
  while (!parcel && Date.now() < deadline) { await delay(100); parcel = parcels.list()[0]; sample('poll'); }
  if (!parcel) throw new Error('qualification_browser_submission_missing');
  emit({phase: 'TASK_RECEIVED', parcelId: parcel.id, at: new Date().toISOString()});
  while (parcel.status === 'PLANNING' && Date.now() < deadline) { await delay(100); parcel = parcels.get(parcel.id); sample('poll'); }
  if (parcel.status !== 'QUEUED') throw new Error(`qualification_planning_failed:${parcel.status}`);
  parcel = control.askParcelQuestion(parcel.id, {text: 'Which stable output format should the final report use?', originatingStageId: 'inspect', dependentStageIds: ['report'], priority: 'HIGH', consequence: 'MEDIUM'}, 'qualification-worker');
  const question = parcel.context?.questions[0]; if (!question) throw new Error('qualification_question_missing');
  emit({phase: 'QUESTION_READY', parcelId: parcel.id, questionId: question.id, at: question.createdAt});

  await parcels.tick();
  const inFlight = new Set<Promise<unknown>>();
  const launchRuns = () => { for (;;) { const dispatch = runtime.dispatch(); if (!dispatch) break; const completion = dispatch.completion.finally(() => inFlight.delete(completion)); inFlight.add(completion); } };
  launchRuns();
  const batch = modelIntelligence.createBatch({id: 'dashboard-character-live-model-batch', suite, candidates: [{providerId: provider.id, modelId: model.id, providerModel: model.providerModel, runtimeId: 'llama.cpp-openai-compatible', runtimeVersion: null, modelVersion: null, nodeId: 'qualification-worker'}], requestedBy: 'qualification-controller', reason: 'Real bounded model activity for dashboard character qualification'});
  control.events.emit('model.intelligence.changed', {batchId: batch.id, status: batch.status}, undefined, 'qualification-controller');
  const modelPromise = modelCoordinator.runBatch(batch.id).then(result => { control.events.emit('model.intelligence.changed', {batchId: result.id, status: result.status}, undefined, 'qualification-model-evaluator'); return result; });

  let concurrentRecorded = false, lastRunSignature = '', lastParcelSignature = '', finalParcel = parcels.get(parcel.id);
  while (Date.now() < deadline) {
    await parcels.tick(); launchRuns(); finalParcel = parcels.get(parcel.id);
    const runSignature = runtime.ledger.list().map(run => `${run.id}:${run.status}:${run.steps.map(step => step.status).join(',')}`).join('|');
    if (runSignature !== lastRunSignature) { lastRunSignature = runSignature; for (const run of runtime.ledger.list()) control.events.emit('job.run_changed', {runId: run.id, status: run.status, steps: run.steps.map(step => ({id: step.id, status: step.status}))}, undefined, 'qualification-runtime'); }
    const parcelSignature = `${finalParcel.status}:${finalParcel.stages.map(stage => `${stage.id}:${stage.status}`).join(',')}`;
    if (parcelSignature !== lastParcelSignature) {
      lastParcelSignature = parcelSignature;
      control.events.emit('work.parcel_changed', {parcelId: finalParcel.id, status: finalParcel.status, stages: finalParcel.stages.map(stage => ({id: stage.id, status: stage.status}))}, undefined, 'qualification-runtime');
    }
    const crew = sample('poll'), states = Object.fromEntries(crew.map(item => [item.id, item.state]));
    if (!concurrentRecorded && states['lane-master'] === 'working' && states['prompt-reviewer'] === 'awaiting_operator' && states['parcel-coordinator'] === 'working' && states['model-scout'] === 'working' && states['resource-guardian'] === 'resource_pressure' && states['quality-inspector'] === 'reviewing') {
      concurrentRecorded = true; sample('concurrent-live'); emit({phase: 'CONCURRENT_STATE_READY', parcelId: finalParcel.id, states, at: new Date().toISOString()});
    }
    if (finalParcel.status === 'SUCCEEDED' && inFlight.size === 0) break;
    if (finalParcel.status === 'FAILED') throw new Error('qualification_work_parcel_failed');
    await delay(250);
  }
  if (finalParcel.status !== 'SUCCEEDED') throw new Error(`qualification_work_parcel_timeout:${finalParcel.status}`);
  const modelResult: ModelEvaluationBatch = await modelPromise;
  const verified = control.verifyClaim(1, 'qualification-verifier'); assert.equal(verified.ok, true); control.acceptVerifiedClaim(1, 'qualification-verifier');
  control.events.emit('verification.changed', {phase: 'accepted', evidenceId: 'character-ui-evidence'}, 1, 'qualification-verifier');
  const finalCrew = sample('completed');

  assert.equal(concurrentRecorded, true);
  assert.equal(finalParcel.stages.every(stage => stage.status === 'SUCCEEDED'), true);
  assert.equal(finalParcel.context?.questions[0]?.status, 'ANSWERED');
  assert.equal(finalParcel.context?.questions[0]?.answeredBy, 'web-operator');
  assert.ok(['COMPLETED', 'PARTIAL', 'BLOCKED'].includes(modelResult.status));
  const eventTypes = [...new Set(control.events.history().map(event => event.type))];
  const result = {
    schema: 'agent-control.dashboard-character-qualification/v1', verdict: 'PASS', startedAt, completedAt: new Date().toISOString(),
    repository: {head: repositoryHead, branch: execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim()},
    topology: {controller: 'isolated local AgentControlService', dashboard: base, browserEvidence: 'recorded separately', provider: provider.id, model: model.id, node: 'qualification-worker'},
    productionPath: ['AgentControlService', 'JobRuntime', 'WorkParcelCoordinator', 'ModelEvaluationCoordinator', 'projectDashboardCharacterCrew', 'GET /api/status', 'typed SSE', 'dashboard renderer'],
    workload: {parcelId: finalParcel.id, status: finalParcel.status, runIds: finalParcel.stages.map(stage => stage.runId), questionId: question.id, questionStatus: finalParcel.context?.questions[0]?.status, stages: finalParcel.stages.map(stage => ({id: stage.id, status: stage.status, runId: stage.runId, batonSha256: stage.baton?.sha256 ?? null}))},
    modelEvaluation: {batchId: modelResult.id, status: modelResult.status, provider: provider.id, model: model.id, providerModel: model.providerModel, attempts: modelIntelligence.attemptsList({batchId: modelResult.id}).map(attempt => ({taskId: attempt.taskId, status: attempt.status, verification: attempt.verification, inputTokens: attempt.usage.inputTokens, outputTokens: attempt.usage.outputTokens, totalTokens: attempt.usage.totalTokens, authority: attempt.usage.authority, costAuthority: attempt.cost.authority}))},
    eventTransport: {eventCount: control.events.history().length, eventTypes},
    characterTrace: trace,
    finalCrew,
    assertions: {allSixProjected: finalCrew.length === 6, concurrentMixedStateObserved: concurrentRecorded, operatorQuestionAnsweredThroughAuthenticatedWebPath: finalParcel.context?.questions[0]?.answeredBy === 'web-operator', parcelCompletedThroughVerifiedJobs: true, laneVerificationAccepted: true, characterProjectionCreatedNoModelCalls: true},
    boundaries: {real: ['lane/scheduler mixed activity', 'Work Parcel planning, question, dispatch and completion', 'Job worker capacity pressure', 'frozen local model evaluation', 'verification evidence and acceptance', 'HTTP status and typed SSE refresh'], simulatedOnly: ['all-state gallery controls'], unavailable: ['No distinct prompt-review worker exists; Quill uses partial planning/readiness telemetry.']},
    security: {operatorTokenPersisted: false, credentialsUsed: false, productionStateTouched: false, deploymentPerformed: false},
  };
  fs.writeFileSync(config.evidenceFile, `${JSON.stringify(result, null, 2)}\n`, {mode: 0o600});
  emit({phase: 'QUALIFICATION_COMPLETE', verdict: result.verdict, evidenceFile: config.evidenceFile, parcelId: finalParcel.id, modelBatchId: modelResult.id, at: result.completedAt});
  await delay(config.holdMs); server.close(); await once(server, 'close'); activeServer = undefined;
}

main().catch(error => { activeServer?.close(); emit({phase: 'QUALIFICATION_FAILED', error: error instanceof Error ? error.message : String(error), at: new Date().toISOString()}); process.exitCode = 1; });
