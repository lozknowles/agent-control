import assert from 'node:assert/strict';
import test from 'node:test';
import {ModelRegistry} from './model-registry.js';
import {qualifyModel} from './model-qualification.js';
import type {FetchLike} from './openai-compatible-provider.js';

const providers = [{id: 'external', kind: 'openai-compatible' as const, baseUrl: 'https://models.example/v1', wireApi: 'responses' as const, auth: {type: 'bearer-env' as const, env: 'QUALIFICATION_TEST_KEY'}}];
const models = [{id: 'fast', provider: 'external', providerModel: 'vendor/fast', capabilities: ['coding','reasoning'], qualification: {state: 'UNTESTED' as const}}];
const original = process.env.QUALIFICATION_TEST_KEY;
test.afterEach(() => { if (original === undefined) delete process.env.QUALIFICATION_TEST_KEY; else process.env.QUALIFICATION_TEST_KEY = original; });

test('qualification proves bounded checks and persists exact provider/model/node identity', async () => {
  process.env.QUALIFICATION_TEST_KEY = 'qualification-secret'; let call = 0;
  const outputs = ['AGENT_CONTROL_MODEL_OK', '{"code":"function add(a,b){return a+b}"}', '6'];
  const fetcher: FetchLike = async () => new Response(JSON.stringify({model: 'vendor/fast', output_text: outputs[call++], usage: {input_tokens: 10, output_tokens: 2, total_tokens: 12}}), {status: 200});
  const registry = new ModelRegistry(providers, models, {roles: {}}), result = await qualifyModel({registry, modelId: 'fast', nodeId: 'controller', fetcher, version: 'qual-test-v1'});
  assert.equal(result.record.state, 'QUALIFIED'); assert.equal(result.record.version, 'qual-test-v1'); assert.deepEqual(result.record.nodes, ['controller']); assert.equal(result.evidence.providerId, 'external'); assert.equal(result.evidence.providerModel, 'vendor/fast'); assert.equal(result.evidence.checks.length, 3); assert.ok(result.evidence.checks.every(check => check.usage.totalTokens === 12)); assert.ok(result.record.capabilities.includes('coding')); assert.ok(result.record.capabilities.includes('reasoning')); assert.ok(result.record.capabilities.includes('usage-accounting')); assert.equal(result.record.capabilities.includes('tool-use'), false);
  assert.equal(JSON.stringify(result).includes('qualification-secret'), false);
});

test('qualification failure is durable, sanitized, and cannot be routed', async () => {
  process.env.QUALIFICATION_TEST_KEY = 'sk-super-secret-value';
  const registry = new ModelRegistry(providers, models, {roles: {coding: {primary: 'fast'}}});
  const result = await qualifyModel({registry, modelId: 'fast', nodeId: 'controller', fetcher: async () => new Response('', {status: 401}), version: 'qual-failed-v1'});
  assert.equal(result.record.state, 'FAILED'); assert.match(result.record.detail ?? '', /provider_authentication_failed/); assert.equal(JSON.stringify(result).includes('sk-super-secret-value'), false);
  assert.throws(() => registry.route({modelRole: 'coding', nodeId: 'controller'}), /model_route_unavailable/);
});
