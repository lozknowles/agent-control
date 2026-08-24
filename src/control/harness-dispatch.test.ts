import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {AdaptiveHarness, SkillCatalog, ToolPolicy, type HarnessCandidate, type RecipeRequest, type ToolDefinition} from './adaptive-harness.js';
import {WorkCoordinator} from './work-coordinator.js';
import {
  AdaptiveWorkDispatch,
  FileRecipeDispatchStore,
  HarnessDispatcher,
  MemoryRecipeDispatchStore,
  ToolHandlerRegistry,
  type ToolPolicyAuditEvent,
} from './harness-dispatch.js';
import {WorkExecutor} from './work-executor.js';
import {WorkQueue, type WorkItem} from './work-queue.js';

const toolDefinitions: ToolDefinition[] = [
  {id: 'repository.read', risk: 'read', capabilities: ['repository.read']},
  {id: 'repository.edit', risk: 'write', capabilities: ['repository.write']},
  {id: 'browser.read', risk: 'read', capabilities: ['browser.read']},
];
const toolPolicy = () => new ToolPolicy(toolDefinitions);
const authority = {laneId: 'lane-1', leaseGeneration: 4, ownershipGeneration: 8, owner: 'agent' as const};
const candidate: HarnessCandidate = {
  route: {
    id: 'route-1', providerId: 'provider-1', modelId: 'model-1', workerId: 'worker-1', local: true,
    health: 'healthy', qualified: true, qualificationReason: 'fixture-qualified', capabilities: ['coding'],
    pricing: {currency: 'TEST', billing: 'free', inputPerMillionTokens: 0, outputPerMillionTokens: 0, fixedPerRequest: 0, effectiveFrom: '2026-08-24'},
    performance: {startupLatencyMs: 1, inputTokensPerSecond: 1000, outputTokensPerSecond: 1000, historicalSuccessRate: .99, expectedQuality: .9, confidence: .95, contextLimitTokens: 32000, source: 'measured', sampleSize: 10},
  },
  workerCapabilities: ['git'], modelCapabilities: ['coding'],
  promptProfiles: [{id: 'safe-code', version: '1', description: 'fixture'}],
  availableSkillIds: [], availableToolIds: ['repository.read', 'repository.edit'], runtime: {temperature: 0},
};
const request = (): RecipeRequest => ({
  taskId: 'task-1', taskType: 'code', requiredCapabilities: ['coding'], requiredTools: ['repository.read'], approvedRisks: ['read'],
  intent: 'NORMAL', inputTokens: 100, outputTokens: 100,
  context: {tier: 2, sourceIds: ['baton-1'], evidenceIds: ['test-1'], estimatedTokens: 50},
  authority: {...authority}, verification: {requiredEvidence: ['test_result'], requireIndependentCheck: true},
  escalation: {minimumConfidence: .7, maximumAttempts: 2, onFailure: 'review'},
});
const plan = () => ({request: request(), candidates: [candidate], placement: {workerId: 'worker-1', reason: 'scheduler selected capability-compatible worker'}});

test('default dispatch builds an inspectable recipe and only exposes policy-gated tools', async () => {
  const policy = toolPolicy(), store = new MemoryRecipeDispatchStore(), audits: ToolPolicyAuditEvent[] = [];
  const handlers = new ToolHandlerRegistry().register('repository.read', async input => ({read: input}));
  const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, handlers, () => ({authority: {...authority}, workerId: 'worker-1', availableToolIds: ['repository.read']}), store, event => audits.push(event));
  const result = await dispatcher.dispatch(plan(), {execute: async (recipe, tools) => ({resultRef: JSON.stringify(await tools.invoke('repository.read', recipe.taskId))})});
  assert.equal(result.accepted, false);
  assert.match(result.recipe.id, /^recipe-/);
  assert.equal(store.get(result.recipe.id)?.phase, 'EXECUTED');
  assert.equal(store.get(result.recipe.id)?.workerPlacement.reason.includes('scheduler'), true);
  assert.deepEqual(audits.map(event => [event.toolId, event.allowed]), [['repository.read', true]]);
});

test('tool omitted from recipe cannot reach its raw handler', async () => {
  const policy = toolPolicy();
  let bypassed = false;
  const handlers = new ToolHandlerRegistry()
    .register('repository.read', async () => 'ok')
    .register('repository.edit', async () => { bypassed = true; });
  const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, handlers, () => ({authority: {...authority}, workerId: 'worker-1'}));
  await assert.rejects(() => dispatcher.dispatch(plan(), {execute: async (_recipe, tools) => ({resultRef: String(await tools.invoke('repository.edit'))})}), /tool_policy_denied:tool_not_granted/);
  assert.equal(bypassed, false);
});

test('live ownership change immediately fences a retained recipe gateway', async () => {
  const policy = toolPolicy();
  let live: RecipeRequest['authority'] = {...authority};
  let calls = 0;
  const handlers = new ToolHandlerRegistry().register('repository.read', async () => ++calls);
  const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, handlers, () => ({authority: {...live}, workerId: 'worker-1'}));
  await assert.rejects(() => dispatcher.dispatch(plan(), {execute: async (_recipe, tools) => {
    await tools.invoke('repository.read');
    live = {...live, ownershipGeneration: 9, owner: 'human'};
    await tools.invoke('repository.read');
    return {};
  }}), /tool_policy_denied:human_owns_execution/);
  assert.equal(calls, 1);
});

test('recipe identity survives store restart without granting stale authority', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-recipes-'));
  const file = path.join(directory, 'recipes.json');
  try {
    const policy = toolPolicy(), firstStore = new FileRecipeDispatchStore(file);
    const handlers = new ToolHandlerRegistry().register('repository.read', async () => 'ok');
    const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, handlers, () => ({authority: {...authority}, workerId: 'worker-1'}), firstStore);
    const result = await dispatcher.dispatch(plan(), {execute: async (_recipe, tools) => ({resultRef: String(await tools.invoke('repository.read'))})});
    const restored = new FileRecipeDispatchStore(file).get(result.recipe.id);
    assert.equal(restored?.fingerprint, result.recipe.fingerprint);
    assert.equal(policy.authorize(result.recipe, 'repository.read', {...authority, leaseGeneration: 5}).reason, 'stale_lease_generation');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('WorkExecutor normal agent path requires AdaptiveHarness and stops at verification', async () => {
  const policy = toolPolicy(), handlers = new ToolHandlerRegistry().register('repository.read', async () => 'read');
  const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, handlers, () => ({authority: {...authority}, workerId: 'worker-1'}));
  const adaptive = new AdaptiveWorkDispatch(dispatcher, async work => ({
    plan: {...plan(), request: {...request(), taskId: work.id}},
    executor: {execute: async (_recipe, tools) => ({resultRef: String(await tools.invoke('repository.read'))})},
  }));
  const queue = new WorkQueue();
  const work: WorkItem = {id: 'task-queue', type: 'code', class: 'priority', status: 'queued', capabilities: {requires: [{id: 'coding'}]}, createdAt: new Date().toISOString(), batchable: false, preemptible: true, dependsOn: [], attempts: 0, maxAttempts: 1};
  queue.enqueue(work);
  const executor = new WorkExecutor(new WorkCoordinator(queue), adaptive);
  const resource = {id: 'worker-1', type: 'host' as const, health: 'healthy' as const, capabilities: [{id: 'coding', kind: 'harness' as const}]};
  const event = await executor.step([resource], [{resourceId: 'worker-1', busy: 0, capacity: 1}]);
  assert.equal(event.kind, 'verification');
  assert.equal(queue.get(work.id)?.status, 'verification-pending');
});
