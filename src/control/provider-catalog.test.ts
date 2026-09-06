import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type {ProviderConfig} from './config.js';
import {ModelIntelligenceLedger, type ModelIntelligenceProjection} from './model-intelligence.js';
import {ModelRegistry} from './model-registry.js';
import {
  defaultProviderAdapterRegistry,
  NvidiaHostedProviderAdapter,
  ProviderCatalogRuntime,
  ProviderCatalogStore,
} from './provider-catalog.js';
import {SecureProviderCredentialStore} from './provider-credential-store.js';

const syntheticCredential = () => ['nvapi', 'fixture', 'B'.repeat(24)].join('-');
const at = '2026-09-06T10:00:00.000Z';

function setup(t: test.TestContext, fetcher: typeof fetch) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-provider-catalog-')), environment: NodeJS.ProcessEnv = {AGENT_CONTROL_STATE_DIR: root}, provider: ProviderConfig = {
    id: 'nvidia-hosted', name: 'NVIDIA hosted models', kind: 'openai-compatible', adapter: 'nvidia-hosted-v1', baseUrl: 'https://integrate.api.nvidia.com/v1', wireApi: 'chat-completions', enabled: true,
    auth: {type: 'provider-secure-store', reference: 'provider:nvidia-hosted'}, discovery: {enabled: true, path: 'models'}, requiresAuth: true,
  };
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  new SecureProviderCredentialStore(path.join(root, 'credentials', 'providers')).set('provider:nvidia-hosted', syntheticCredential());
  const intelligence = new ModelIntelligenceLedger(path.join(root, 'model-intelligence.json'), () => at), registry = new ModelRegistry([provider], [], {roles: {}}, undefined, undefined, environment, undefined, intelligence), store = new ProviderCatalogStore(path.join(root, 'provider-catalog.json'), () => at), runtime = new ProviderCatalogRuntime([provider], store, registry, intelligence, defaultProviderAdapterRegistry(), environment, fetcher, () => at);
  return {root, provider, registry, store, runtime};
}

function modelListResponse() {
  return new Response(JSON.stringify({object: 'list', data: [
    {id: 'vendor/model-a', owned_by: 'vendor', context_length: 8192, input_modalities: ['text'], output_modalities: ['text'], supported_parameters: ['stream', 'tools', 'response_format']},
    {id: 'vendor/model-unknown', owned_by: 'vendor'},
  ]}), {status: 200, headers: {'content-type': 'application/json', 'x-ratelimit-limit-requests': '40', 'x-ratelimit-remaining-requests': '39'}});
}

test('authenticated generic discovery creates unqualified routing-disabled models and preserves unknown metadata', async t => {
  let authorization = '', endpoint = '';
  const {root, registry, runtime} = setup(t, async (input, init) => { endpoint = String(input); authorization = new Headers(init?.headers).get('authorization') ?? ''; return modelListResponse(); });
  const result = await runtime.discover('nvidia-hosted');
  assert.equal(endpoint, 'https://integrate.api.nvidia.com/v1/models');
  assert.equal(authorization, `Bearer ${syntheticCredential()}`);
  assert.equal(result.discovered, 2);
  const projection = runtime.projection(), model = projection.models.find(item => item.canonicalModelId === 'vendor/model-unknown')!;
  assert.equal(projection.providers[0].credentialStatus, 'CONFIGURED');
  assert.equal(projection.providers[0].credentialReference, 'secure-store');
  assert.equal(projection.providers[0].rateLimit.requestsLimit, 40);
  assert.equal(model.reviewState, 'UNQUALIFIED');
  assert.equal(model.routingEligible, false);
  assert.deepEqual(model.metadata.contextLimitTokens, {value: null, authority: 'UNKNOWN'});
  assert.deepEqual(model.metadata.costClassification, {value: null, authority: 'UNKNOWN'});
  const registered = registry.model(model.registryModelId)!; assert.equal(registered.routingEligible, false); assert.equal(registered.qualification?.state, 'UNTESTED');
  assert.throws(() => registry.route({model: registered.id, nodeId: 'controller'}), /model_route_unavailable/);
  assert.equal(registry.route({model: registered.id, nodeId: 'controller', purpose: 'QUALIFICATION'}).modelId, registered.id);
  const durable = fs.readFileSync(path.join(root, 'provider-catalog.json'), 'utf8');
  assert.equal(durable.includes(syntheticCredential()), false);
  assert.equal(JSON.stringify(projection).includes(syntheticCredential()), false);
});

test('each successful catalogue refresh returns omitted metadata to UNKNOWN instead of preserving a stale claim', async t => {
  let call = 0;
  const {runtime} = setup(t, async () => {
    call++;
    return call === 1
      ? new Response(JSON.stringify({data: [{id: 'vendor/model-a', context_length: 8192, cost_classification: 'included'}]}), {status: 200})
      : new Response(JSON.stringify({data: [{id: 'vendor/model-a'}]}), {status: 200});
  });
  await runtime.discover('nvidia-hosted');
  let model = runtime.projection().models[0];
  assert.deepEqual(model.metadata.contextLimitTokens, {value: 8192, authority: 'PROVIDER_REPORTED'});
  assert.deepEqual(model.metadata.costClassification, {value: 'INCLUDED', authority: 'PROVIDER_REPORTED'});
  await runtime.discover('nvidia-hosted');
  model = runtime.projection().models[0];
  assert.deepEqual(model.metadata.contextLimitTokens, {value: null, authority: 'UNKNOWN'});
  assert.deepEqual(model.metadata.costClassification, {value: null, authority: 'UNKNOWN'});
});

test('pricing-derived cost class is labelled adapter-derived and catalogue payload size is bounded', async t => {
  const first = setup(t, async () => new Response(JSON.stringify({data: [{id: 'vendor/metered', pricing: {input: 0.1, output: 0.2}}]}), {status: 200}));
  await first.runtime.discover('nvidia-hosted');
  assert.deepEqual(first.runtime.projection().models[0].metadata.costClassification, {value: 'METERED', authority: 'ADAPTER_DERIVED'});

  const second = setup(t, async () => new Response('{}', {status: 200, headers: {'content-length': String(8 * 1024 * 1024 + 1)}}));
  await assert.rejects(() => second.runtime.discover('nvidia-hosted'), /provider_catalog_response_too_large/);
  assert.equal(second.runtime.projection().providers[0].discoveryStatus, 'FAILED');
});

test('bounded smoke suite records hashes and normalized usage but never provider output or credentials', async t => {
  let calls = 0;
  const {root, runtime} = setup(t, async (_input, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${syntheticCredential()}`);
    if ((init?.method ?? 'GET') === 'GET') return modelListResponse();
    const body = JSON.parse(String(init?.body)) as {messages?: Array<{content?: string}>; tools?: unknown[]; chat_template_kwargs?: {enable_thinking?: boolean}}, prompt = body.messages?.[0]?.content ?? '';
    assert.deepEqual(body.chat_template_kwargs, {enable_thinking: false});
    const usage = {prompt_tokens: 20, completion_tokens: 4, total_tokens: 24};
    if (body.tools) return new Response(JSON.stringify({model: 'vendor/model-a', choices: [{finish_reason: 'tool_calls', message: {content: null, tool_calls: [{function: {name: 'agent_control_qualification_marker', arguments: '{"marker":"AC_TOOL_OK"}'}}]}}], usage}), {status: 200});
    const content = prompt.includes('AC_CODE_OK') ? '{"marker":"AC_CODE_OK"}' : prompt.includes('AC_CONTEXT_OK') ? 'AC_CONTEXT_OK' : prompt.includes('required marker') ? '{"marker":"AC_SMOKE_OK"}' : 'AC_SMOKE_OK';
    return new Response(JSON.stringify({model: 'vendor/model-a', choices: [{finish_reason: 'stop', message: {content}}], usage}), {status: 200});
  });
  await runtime.discover('nvidia-hosted');
  const smoke = await runtime.smoke('nvidia-hosted', 'vendor/model-a');
  assert.equal(calls, 6);
  assert.equal(smoke.status, 'PASS');
  assert.equal(smoke.inputSha256, '3c9eb89c175ff2685b12f86e1f9a938bbd7d995c1d979228145d618b09b2897e');
  assert.deepEqual(smoke.probes.map(probe => probe.status), ['PASS','PASS','PASS','PASS','PASS']);
  assert.ok(smoke.probes.every(probe => probe.invocationProfile === 'nvidia-hosted-nonreasoning-smoke-v1'));
  assert.ok(smoke.probes.every(probe => probe.responseHash && /^[a-f0-9]{64}$/.test(probe.responseHash)));
  assert.ok(smoke.probes.every(probe => probe.usage?.totalTokens === 24));
  const durable = fs.readFileSync(path.join(root, 'provider-catalog.json'), 'utf8');
  for (const forbidden of [syntheticCredential(), 'AC_SMOKE_OK', 'AC_CODE_OK', 'AC_CONTEXT_OK']) assert.equal(durable.includes(forbidden), false);
  assert.equal(runtime.projection().models[0].reviewState, 'SMOKE_TESTED');
});

test('truncated final output preserves partial usage finish reason and hash without provider text', async t => {
  const {root, runtime} = setup(t, async (_input, init) => {
    if ((init?.method ?? 'GET') === 'GET') return modelListResponse();
    return new Response(JSON.stringify({model: 'vendor/model-a', choices: [{finish_reason: 'length', message: {content: null, reasoning_content: 'private reasoning must not persist'}}], usage: {prompt_tokens: 10, completion_tokens: 20, total_tokens: 30}}), {status: 200});
  });
  await runtime.discover('nvidia-hosted');
  const smoke = await runtime.smoke('nvidia-hosted', 'vendor/model-a');
  assert.equal(smoke.status, 'FAILED');
  assert.ok(smoke.probes.every(probe => probe.failure === 'provider_output_truncated'));
  assert.ok(smoke.probes.every(probe => probe.finishReason === 'length'));
  assert.ok(smoke.probes.every(probe => probe.usage?.totalTokens === 30));
  assert.ok(smoke.probes.every(probe => /^[a-f0-9]{64}$/.test(probe.responseHash ?? '')));
  const durable = fs.readFileSync(path.join(root, 'provider-catalog.json'), 'utf8');
  assert.equal(durable.includes('private reasoning'), false);
});

test('provider failures that echo a credential are redacted before exception and durable catalogue state', async t => {
  const secret = syntheticCredential(), {root, runtime} = setup(t, async () => { throw new Error(`upstream transport echoed ${secret}`); });
  await assert.rejects(() => runtime.discover('nvidia-hosted'), error => { assert.equal((error as Error).message.includes(secret), false); assert.match((error as Error).message, /REDACTED/); return true; });
  const serialized = JSON.stringify(runtime.projection()); assert.equal(serialized.includes(secret), false); assert.match(serialized, /REDACTED/);
  assert.equal(fs.readFileSync(path.join(root, 'provider-catalog.json'), 'utf8').includes(secret), false);
});

test('provider response headers cannot echo an exact future-format credential into catalogue state', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-provider-header-redaction-')), secret = 'opaque.future.provider.credential.9753', environment: NodeJS.ProcessEnv = {FUTURE_PROVIDER_KEY: secret}, provider: ProviderConfig = {id: 'future', kind: 'openai-compatible', adapter: 'openai-compatible-v1', baseUrl: 'https://future.example/v1', wireApi: 'chat-completions', auth: {type: 'api-key-env', env: 'FUTURE_PROVIDER_KEY'}, discovery: {enabled: true}};
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const intelligence = new ModelIntelligenceLedger(path.join(root, 'intelligence.json'), () => at), registry = new ModelRegistry([provider], [], {roles: {}}, undefined, undefined, environment, undefined, intelligence), runtime = new ProviderCatalogRuntime([provider], new ProviderCatalogStore(path.join(root, 'provider-catalog.json'), () => at), registry, intelligence, defaultProviderAdapterRegistry(), environment, async () => new Response(JSON.stringify({data: [{id: 'vendor/model-a'}]}), {status: 200, headers: {'x-ratelimit-reset': secret, 'retry-after': secret}}), () => at);
  await runtime.discover('future');
  const serialized = JSON.stringify(runtime.projection());
  assert.equal(serialized.includes(secret), false);
  assert.match(serialized, /REDACTED/);
  assert.equal(fs.readFileSync(path.join(root, 'provider-catalog.json'), 'utf8').includes(secret), false);
});

test('catalogue reload scrubs legacy persisted provider-key material before projection', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-provider-catalog-reload-')), file = path.join(root, 'provider-catalog.json'), secret = syntheticCredential();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(file, `${JSON.stringify({
    schema: 'agent-control.provider-catalog/v1',
    providers: [{providerId: 'nvidia-hosted', endpointStatus: 'UNAVAILABLE', discoveryStatus: 'FAILED', credentialStatus: 'CONFIGURED', lastDiscoveryAt: null, lastError: `legacy ${secret}`, rateLimit: {requestsLimit: null, requestsRemaining: null, tokensLimit: null, tokensRemaining: null, reset: secret, retryAfter: null, authority: 'PROVIDER_HEADER'}, quota: {value: null, unit: null, authority: 'UNKNOWN'}}],
    models: [],
  })}\n`, {mode: 0o600});
  const store = new ProviderCatalogStore(file, () => at), serialized = JSON.stringify(store.snapshot());
  assert.equal(serialized.includes(secret), false);
  assert.match(serialized, /REDACTED/);
});

test('catalogue routing requires benchmark qualification and an explicit operator enable', async t => {
  const {store, runtime} = setup(t, async () => modelListResponse()); await runtime.discover('nvidia-hosted');
  const item = store.modelsList()[0];
  assert.throws(() => store.setRoutingEligibility(item.providerId, item.canonicalModelId, true, emptyIntelligence()), /not_qualified/);
  const qualified = emptyIntelligence({providerId: item.providerId, modelId: item.registryModelId, providerModel: item.canonicalModelId});
  assert.equal(store.setRoutingEligibility(item.providerId, item.canonicalModelId, true, qualified).reviewState, 'ROUTING_ELIGIBLE');
  assert.equal(store.setRoutingEligibility(item.providerId, item.canonicalModelId, false, qualified).reviewState, 'QUALIFIED');
  assert.throws(() => store.setRoutingEligibility(item.providerId, item.canonicalModelId, false, qualified), /routing_not_enabled/);
});

test('routing eligibility is revoked when durable model intelligence is no longer qualified', async t => {
  const {store, runtime, registry} = setup(t, async () => modelListResponse()); await runtime.discover('nvidia-hosted');
  const item = store.modelsList()[0], qualified = emptyIntelligence({providerId: item.providerId, modelId: item.registryModelId, providerModel: item.canonicalModelId});
  store.setRoutingEligibility(item.providerId, item.canonicalModelId, true, qualified);
  registry.setDiscoveredRoutingEligibility(item.registryModelId, true);
  store.reconcile(emptyIntelligence({providerId: item.providerId, modelId: item.registryModelId, providerModel: item.canonicalModelId}, 'DEGRADED'));
  runtime.projection();
  assert.equal(store.modelsList()[0].routingEligible, false);
  assert.equal(store.modelsList()[0].reviewState, 'LIMITED');
  assert.equal(registry.model(item.registryModelId)?.routingEligible, false);
});

test('a model absent from a later successful catalogue is disabled and loses routing eligibility', async t => {
  let calls = 0;
  const {store, runtime, registry} = setup(t, async () => {
    calls++;
    return calls === 1 ? modelListResponse() : new Response(JSON.stringify({data: [{id: 'vendor/model-unknown'}]}), {status: 200});
  });
  await runtime.discover('nvidia-hosted');
  const item = store.modelsList().find(model => model.canonicalModelId === 'vendor/model-a')!, qualified = emptyIntelligence({providerId: item.providerId, modelId: item.registryModelId, providerModel: item.canonicalModelId});
  store.setRoutingEligibility(item.providerId, item.canonicalModelId, true, qualified);
  registry.setDiscoveredRoutingEligibility(item.registryModelId, true);
  await runtime.discover('nvidia-hosted');
  const missing = store.modelsList().find(model => model.canonicalModelId === 'vendor/model-a')!;
  assert.equal(missing.available, false);
  assert.equal(missing.routingEligible, false);
  assert.equal(missing.reviewState, 'LIMITED');
  assert.equal(registry.model(item.registryModelId)?.enabled, false);
  assert.throws(() => store.setRoutingEligibility(item.providerId, item.canonicalModelId, true, qualified), /model_unavailable/);
  await assert.rejects(() => runtime.smoke(item.providerId, item.canonicalModelId), /model_unavailable/);
});

test('NVIDIA adapter constrains only hosted endpoint and credential shape', () => {
  const adapter = new NvidiaHostedProviderAdapter(), base = {id: 'nvidia', kind: 'openai-compatible' as const, baseUrl: 'https://integrate.api.nvidia.com/v1', wireApi: 'chat-completions' as const};
  assert.equal(adapter.supports(base), true);
  assert.equal(adapter.supports({...base, baseUrl: 'https://example.invalid/v1'}), false);
  assert.equal(adapter.supports({...base, wireApi: 'responses'}), false);
  assert.doesNotThrow(() => adapter.validateCredential(syntheticCredential()));
  assert.throws(() => adapter.validateCredential('not-an-nvidia-key'), /credential_format_invalid/);
});

function emptyIntelligence(identity?: {providerId: string; modelId: string; providerModel: string}, state: 'QUALIFIED' | 'DEGRADED' = 'QUALIFIED') {
  return {schema: 'agent-control.model-intelligence/v1', observedAt: at, queue: [], attempts: [], routes: identity ? [{identity: {...identity, runtimeId: 'openai-compatible', runtimeVersion: null, modelVersion: null, nodeId: 'controller'}, routeKey: 'route', state, current: {completed: 5}}] : [], leaders: {}, regressions: [], transitions: []} as unknown as ModelIntelligenceProjection;
}
