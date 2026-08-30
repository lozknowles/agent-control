import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {JobCatalog} from './job-catalog.js';
import {ActionFailure, ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from './job-runtime.js';
import type {JobDefinition} from './job-types.js';
import {createInvocationObservation, MemoryHarnessEfficiencyLedger} from './harness-efficiency.js';
import {CatalogNaturalLanguagePlanner, explainParcelDecision, ReasoningModelWorkParcelPlanner, validateWorkParcelPlan, WorkParcelCoordinator, WorkParcelStore, type WorkParcel, type WorkParcelPlan} from './work-parcels.js';

const job = (id: string, action: string, output = true): JobDefinition => ({apiVersion: 'agent-control/v1', kind: 'Job', metadata: {id, name: id, version: '1.0.0'}, spec: {priority: 'normal', concurrency: 'queue', steps: [{id: 'work', action, requires: ['qualification.local'], outputs: output ? [{name: 'result', type: 'application/json', schema: `${id}/v1`, version: '1.0.0'}] : undefined, verification: output ? ['passed'] : []}]}});
function setup(failSecond = false, blockFirst = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-parcel-')), actions = new ActionRegistry();
  let releaseFirst = () => {}; const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
  actions.register('one@1.0.0', async () => { if (blockFirst) await firstGate; return {artifacts: [{name: 'result', value: {one: true}}], verification: ['passed']}; });
  actions.register('two@1.0.0', async () => { if (failSecond) throw new ActionFailure('controlled_failure', 'verification'); return {artifacts: [{name: 'result', value: {two: true}}], verification: ['passed']}; });
  actions.register('three@1.0.0', async () => ({artifacts: [{name: 'result', value: {three: true}}], verification: ['passed']}));
  const catalog = new JobCatalog(actions.ids()); for (const [id, action] of [['one-job','one@1.0.0'],['two-job','two@1.0.0'],['three-job','three@1.0.0']]) catalog.addJob(job(id, action));
  const workers = new WorkerRegistry().register({id: 'host', capabilities: ['qualification.local'], health: 'healthy', capacity: 1, active: 0, observedAt: new Date().toISOString()});
  const runtime = new JobRuntime(catalog, actions, workers, new RunLedger(path.join(root, 'runs.json')), new ArtifactStore(path.join(root, 'artifacts')), new ResourceLockManager(path.join(root, 'locks.json')), {approval: () => true});
  const plan: WorkParcelPlan = {objective: 'test objective', planner: {kind: 'reasoning-model', provider: 'test', model: 'planner', reason: 'test'}, stages: [{id: 'one', name: 'One', job: 'one-job@1.0.0'}, {id: 'two', name: 'Two', job: 'two-job@1.0.0', dependsOn: ['one']}, {id: 'three', name: 'Three', job: 'three-job@1.0.0', dependsOn: ['two']}]};
  const planner = {plan: () => plan}, storeFile = path.join(root, 'parcels.json'), coordinator = new WorkParcelCoordinator(runtime, new WorkParcelStore(storeFile), planner);
  return {root, runtime, planner, storeFile, coordinator, plan, releaseFirst};
}

test('natural-language parcel runs dependent Jobs sequentially and retains typed batons', async () => {
  const {coordinator, runtime} = setup(); const parcel = await coordinator.submit('do the test', 'operator');
  assert.equal(parcel.audit.schema, 'agent-control.work-parcel-audit/v1'); assert.match(parcel.audit.classification, /Complex|governed|Registered/); assert.equal(parcel.audit.planner.model, 'planner'); assert.ok(parcel.audit.alternatives.some(item => item.candidate === 'host' && item.eligible));
  for (let count = 0; count < 3; count++) { await coordinator.tick(); await runtime.tick(); await coordinator.tick(); }
  const result = coordinator.get(parcel.id); assert.equal(result.status, 'SUCCEEDED'); assert.deepEqual(result.stages.map(stage => stage.status), ['SUCCEEDED','SUCCEEDED','SUCCEEDED']);
  assert.ok(result.stages.every(stage => stage.baton?.schema === 'agent-control.work-parcel-baton/v1' && stage.baton.artifactIds.length === 1)); assert.equal(result.prompt, 'do the test');
});

test('actual worker route becomes durable while execution is still running', async () => {
  const {coordinator, runtime, releaseFirst} = setup(false, true), parcel = await coordinator.submit('inspect live route', 'operator');
  await coordinator.tick(); const execution = runtime.tick(); await new Promise(resolve => setImmediate(resolve));
  const active = coordinator.get(parcel.id); assert.equal(active.status, 'RUNNING'); assert.deepEqual(active.stages[0].actualRoute?.workers, ['host']); assert.match(active.stages[0].actualRoute?.reason ?? '', /satisfies/); assert.ok(active.audit.timeline.some(item => item.type === 'route.resolved' && /Workers host/.test(item.detail)));
  const restored = new WorkParcelCoordinator(runtime, new WorkParcelStore(path.join(path.dirname(coordinator.store.file), 'parcels.json')), coordinator.planner).get(parcel.id); assert.deepEqual(restored.stages[0].actualRoute?.workers, ['host']);
  releaseFirst(); await execution;
});

test('failed gate blocks every downstream stage and survives coordinator restart', async () => {
  const {coordinator, runtime, planner, storeFile} = setup(true); const parcel = await coordinator.submit('do the test', 'operator');
  await coordinator.tick(); await runtime.tick(); await coordinator.tick(); await runtime.tick(); await coordinator.tick();
  const restarted = new WorkParcelCoordinator(runtime, new WorkParcelStore(storeFile), planner), result = restarted.get(parcel.id);
  assert.equal(result.status, 'FAILED'); assert.deepEqual(result.stages.map(stage => stage.status), ['SUCCEEDED','FAILED','BLOCKED']); assert.match(result.stages[2].waitingReason ?? '', /dependency|Upstream|Blocked/i);
  assert.equal(result.decision?.outcome, 'FAIL_CLOSED'); assert.match(result.decision?.summary ?? '', /blocked dependent work/); assert.deepEqual(result.decision?.blockedStages, ['Three']);
});

test('complex plans fail closed on unknown Jobs, cycles and absent reasoning planner', async () => {
  const {runtime, plan} = setup();
  assert.throws(() => validateWorkParcelPlan({...plan, stages: [{id: 'bad', name: 'Bad', job: 'missing@1.0.0'}]}, runtime), /work_parcel_job_missing/);
  assert.throws(() => validateWorkParcelPlan({...plan, stages: [{id: 'a', name: 'A', job: 'one-job@1.0.0', dependsOn: ['b']}, {id: 'b', name: 'B', job: 'two-job@1.0.0', dependsOn: ['a']}]}, runtime), /dependency_cycle/);
  await assert.rejects(() => new CatalogNaturalLanguagePlanner(runtime).plan('an ambiguous complex objective'), /reasoning_planner_unconfigured/);
});

test('capacity failures explain the measurement, policy threshold and undispatched work', () => {
  const parcel = {
    id: 'parcel-capacity', prompt: 'qualify FreeToken', objective: 'qualify FreeToken', actor: 'operator', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'FAILED',
    planner: {kind: 'deterministic', reason: 'matched workflow'},
    stages: [
      {id: 'gate', name: 'Capacity gate', job: 'gate@1.0.0', dependsOn: [], parameters: {}, status: 'FAILED', error: 'freetoken_capacity_gate_failed:free_vram_mib=1256:required=8192'},
      {id: 'install', name: 'Install FreeToken', job: 'install@1.0.0', dependsOn: ['gate'], parameters: {}, status: 'BLOCKED'},
    ], telemetry: {freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, cost: null, currency: null, elapsedMs: 0}, provenance: [],
  } as unknown as WorkParcel;
  const decision = explainParcelDecision(parcel);
  assert.equal(decision.outcome, 'FAIL_CLOSED');
  assert.match(decision.summary, /1,256 MiB.*8,192 MiB/);
  assert.deepEqual(decision.blockedStages, ['Install FreeToken']);
  assert.match(decision.evidence.join(' '), /Provider\/model request: none/);
});

test('reasoning model proposes data against a bounded catalog and Agent Control validates it', async () => {
  const {runtime} = setup(); let offered: string[] = [];
  const reasoning = new ReasoningModelWorkParcelPlanner(runtime, 'provider-a', 'model-a', async input => { offered = input.jobs.map(job => job.id); return {stages: [{id: 'execute', name: 'Execute', job: 'one-job@1.0.0'}]}; });
  const plan = validateWorkParcelPlan(await new CatalogNaturalLanguagePlanner(runtime, reasoning).plan('complex objective with no named job'), runtime);
  assert.deepEqual([...offered].sort(), ['one-job','two-job','three-job'].sort()); assert.equal(plan.planner.kind, 'reasoning-model'); assert.equal(plan.planner.provider, 'provider-a');
});

test('durable audit records model changes and complete hierarchical invocation accounting', async () => {
  const {runtime, planner, storeFile} = setup(), ledger = new MemoryHarnessEfficiencyLedger(), coordinator = new WorkParcelCoordinator(runtime, new WorkParcelStore(storeFile), planner, ledger);
  const parcel = await coordinator.submit('audit two routes', 'operator'); await coordinator.tick(); const runId = coordinator.get(parcel.id).stages[0].runId!;
  const price = {currency: 'USD', freshInputPerMillionTokens: 1, cachedInputPerMillionTokens: .2, outputPerMillionTokens: 2, source: 'test'} as const;
  ledger.record(createInvocationObservation({id: 'inv-a', jobId: 'one-job', runId, taskId: parcel.id, laneId: 'analysis', model: 'glm-5.3-flash', provider: 'openrouter', harnessProfile: 'STANDARD', executionStrategy: 'ox', startedAt: '2026-08-30T10:00:00Z', completedAt: '2026-08-30T10:00:02Z', rawUsage: {input_tokens: 100, input_tokens_details: {cached_tokens: 20}, output_tokens: 10, output_tokens_details: {reasoning_tokens: 2}, total_tokens: 110}, providerReportedCost: .01, pricing: price, recipeFingerprint: 'a'}));
  ledger.record(createInvocationObservation({id: 'inv-b', jobId: 'one-job', runId, taskId: parcel.id, laneId: 'analysis', model: 'gpt-5.6', provider: 'openai', harnessProfile: 'DEEP', executionStrategy: 'escalation', startedAt: '2026-08-30T10:00:03Z', completedAt: '2026-08-30T10:00:07Z', rawUsage: {input_tokens: 200, input_tokens_details: {cached_tokens: 40}, output_tokens: 20, output_tokens_details: {reasoning_tokens: 4}, total_tokens: 220}, providerReportedCost: .03, pricing: price, recipeFingerprint: 'b'}));
  await runtime.tick(); await coordinator.tick(); const result = coordinator.get(parcel.id);
  assert.deepEqual(result.audit.totals.models, ['glm-5.3-flash', 'gpt-5.6']); assert.equal(result.audit.totals.invocations, 2); assert.equal(result.audit.totals.totalTokens, 330); assert.equal(result.audit.totals.providerReportedCost, .04); assert.equal(result.audit.totals.costBasis, 'provider-reported'); assert.equal(result.audit.totals.modelExecutionMs, 6000);
  assert.ok(result.audit.timeline.some(item => item.type === 'route.changed' && /glm-5.3-flash.*gpt-5.6/.test(item.summary))); assert.ok(result.audit.timeline.some(item => item.type === 'invocation.completed'));
  const restored = new WorkParcelCoordinator(runtime, new WorkParcelStore(storeFile), planner, ledger).get(parcel.id); assert.equal(restored.audit.totals.totalTokens, 330); assert.equal(restored.audit.invocations[0].freshInputTokens, 80);
});
