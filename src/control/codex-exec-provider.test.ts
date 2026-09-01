import assert from 'node:assert/strict';
import test from 'node:test';
import {AdaptiveHarness, SkillCatalog, ToolPolicy, type RecipeRequest} from './adaptive-harness.js';
import {CodexExecProviderFactory, runCodexWithRegisteredModel} from './codex-exec-provider.js';
import fs from 'node:fs';
import {HarnessDispatcher, ToolHandlerRegistry} from './harness-dispatch.js';

const provider = {id: 'codex-chatgpt', name: 'Codex with ChatGPT plan', kind: 'cli' as const, requiresAuth: true, parallelism: 1, costClass: 'included' as const, capabilities: ['structured-output', 'tool-request']};

function factory(overrides: Partial<ConstructorParameters<typeof CodexExecProviderFactory>[0]> = {}) {
  return new CodexExecProviderFactory({provider, workerId: 'windows-worker', modelId: 'qualified-codex-model', cwd: process.cwd(), workerCapabilities: ['platform.windows'], modelCapabilities: ['structured-output', 'tool-request'], availableToolIds: ['qualification.return-data'], qualificationEvidence: ['official-codex-exec-contract'], health: 'healthy', authProbe: async () => ({mode: 'chatgpt'}), runner: async request => ({threadId: 'thr_fixture', finalMessage: JSON.stringify({tool: request.grantedToolIds[0], input_json: JSON.stringify({value: 'safe'})}), usage: {input_tokens: 10, output_tokens: 5}, observedItemTypes: ['agent_message']}), ...overrides});
}

test('Codex ChatGPT-plan factory returns data only through the ToolPolicy gateway', async () => {
  let invocations = 0;
  const result = await factory().executor('Return safe data').execute({tools: [{id: 'qualification.return-data'}], resourceLimits: {}} as never, {invoke: async (id, input) => { invocations++; assert.equal(id, 'qualification.return-data'); assert.deepEqual(input, {value: 'safe'}); return {marker: 'CODEX-CHATGPT-OK'}; }});
  assert.equal(invocations, 1);
  assert.match(result.resultRef ?? '', /CODEX-CHATGPT-OK/);
  assert.ok(result.evidence?.includes('auth_mode:chatgpt'));
  assert.ok(result.evidence?.includes('capability_envelope:read-only'));
  assert.equal(result.invocations?.[0].usage.inputTokens, 10);
  assert.equal(result.invocations?.[0].usage.freshInputTokens, null);
  assert.deepEqual(factory().candidate().runtime, {sandbox: 'read-only', ephemeral: true});
});

test('Codex usage retains nested cache and reasoning details for normalisation', async () => {
  const result = await factory({runner: async request => ({threadId: 'thr_nested', finalMessage: JSON.stringify({tool: request.grantedToolIds[0], input_json: '{}'}), usage: {input_tokens: 100, input_tokens_details: {cached_tokens: 70}, output_tokens: 20, output_tokens_details: {reasoning_tokens: 8}, total_tokens: 120}, observedItemTypes: ['agent_message']})}).executor('Return safe data').execute({tools: [{id: 'qualification.return-data'}], resourceLimits: {}} as never, {invoke: async () => ({marker: 'SAFE'})});
  assert.equal(result.invocations?.[0].usage.freshInputTokens, 30);
  assert.equal(result.invocations?.[0].usage.cachedInputTokens, 70);
  assert.equal(result.invocations?.[0].usage.reasoningTokens, 8);
});

test('Codex fallback fails closed for missing ChatGPT auth and opaque file changes', async () => {
  let invoked = false;
  const noAuth = factory({authProbe: async () => { throw new Error('codex_chatgpt_auth_required'); }});
  await assert.rejects(() => noAuth.executor('test').execute({tools: [{id: 'qualification.return-data'}], resourceLimits: {}} as never, {invoke: async () => { invoked = true; }}), /chatgpt_auth_required/);
  const fileChange = factory({runner: async () => ({finalMessage: '{"tool":"qualification.return-data","input_json":"{}"}', observedItemTypes: ['file_change']})});
  await assert.rejects(() => fileChange.executor('test').execute({tools: [{id: 'qualification.return-data'}], resourceLimits: {}} as never, {invoke: async () => { invoked = true; }}), /capability_envelope_violation/);
  assert.equal(invoked, false);
});

test('an ungranted Codex return request is passed to the gateway and denied there', async () => {
  const ungranted = factory({runner: async () => ({finalMessage: '{"tool":"not.granted","input_json":"{}"}', observedItemTypes: ['agent_message']})});
  await assert.rejects(() => ungranted.executor('test').execute({tools: [{id: 'qualification.return-data'}], resourceLimits: {}} as never, {invoke: async id => { throw new Error(`tool_policy_denied:tool_not_granted:${id}`); }}), /tool_policy_denied:tool_not_granted:not.granted/);
});

test('Codex ChatGPT-plan execution is fenced by live Agent Control ownership', async () => {
  const authority = {laneId: 'lane-codex', leaseGeneration: 2, ownershipGeneration: 4, owner: 'agent' as const};
  let live: RecipeRequest['authority'] = {...authority};
  let handlerCalls = 0;
  const policy = new ToolPolicy([{id: 'qualification.return-data', risk: 'read', capabilities: ['structured-output']}]);
  const tools = new ToolHandlerRegistry().register('qualification.return-data', async () => ++handlerCalls);
  const dispatcher = new HarnessDispatcher(new AdaptiveHarness(new SkillCatalog(), policy), policy, tools, () => ({authority: {...live}, workerId: 'windows-worker', availableToolIds: ['qualification.return-data'], approvedRisks: ['read']}));
  const codex = factory();
  const request: RecipeRequest = {taskId: 'codex-plan-task', taskType: 'qualification', requiredCapabilities: ['structured-output', 'tool-request'], requiredTools: ['qualification.return-data'], approvedRisks: ['read'], intent: 'NORMAL', inputTokens: 16, outputTokens: 16, context: {tier: 1, sourceIds: [], evidenceIds: [], estimatedTokens: 8}, authority, verification: {requiredEvidence: ['returned-data'], requireIndependentCheck: true}, escalation: {minimumConfidence: .7, maximumAttempts: 1, onFailure: 'review'}};
  live = {...live, ownershipGeneration: 5, owner: 'human'};
  await assert.rejects(() => dispatcher.dispatch({request, candidates: [codex.candidate()], placement: {workerId: 'windows-worker', reason: 'selected by scheduler'}}, codex.executor('return data')), /tool_policy_denied:human_owns_execution/);
  assert.equal(handlerCalls, 0);
});

test('registered external model runs with an isolated Codex provider config', async () => {
  const secret = 'external-secret-not-persisted'; let observed = false;
  const result = await runCodexWithRegisteredModel(
    {command: 'codex', cwd: process.cwd(), modelId: 'ignored', instruction: 'test', grantedToolIds: ['qualification.return-data'], timeoutMs: 1_000},
    {id: 'external', kind: 'openai-compatible', baseUrl: 'https://models.example/v1', wireApi: 'responses', auth: {type: 'bearer-env', env: 'EXTERNAL_TEST_KEY'}},
    {id: 'fast', provider: 'external', providerModel: 'vendor/fast', capabilities: ['coding']},
    {EXTERNAL_TEST_KEY: secret},
    async request => { observed = true; assert.equal(request.modelId, 'vendor/fast'); assert.equal(request.loadUserConfig, true); const config = fs.readFileSync(`${request.environment?.CODEX_HOME}/config.toml`, 'utf8'); assert.match(config, /model_provider = "agent_control_external"/); assert.match(config, /wire_api = "responses"/); assert.equal(config.includes(secret), false); return {finalMessage: 'ok', observedItemTypes: ['agent_message']}; },
  );
  assert.equal(observed, true); assert.equal(result.finalMessage, 'ok');
});
