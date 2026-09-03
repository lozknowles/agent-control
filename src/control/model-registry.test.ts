import assert from 'node:assert/strict';
import test from 'node:test';
import {validateConfig} from './config.js';
import {ModelRegistry} from './model-registry.js';

const providers = [{id: 'external', name: 'External', kind: 'openai-compatible' as const, baseUrl: 'https://models.example/v1', wireApi: 'responses' as const, enabled: true, auth: {type: 'bearer-env' as const, env: 'EXTERNAL_API_KEY'}}];
const models = [
  {id: 'fast', provider: 'external', providerModel: 'vendor/fast', enabled: true, capabilities: ['coding'], nodes: ['node-a'], qualification: {state: 'QUALIFIED' as const, version: 'q1', nodes: ['node-a'], capabilities: ['coding']}, roles: ['coding.fast']},
  {id: 'deep', provider: 'external', providerModel: 'vendor/deep', enabled: true, capabilities: ['coding','reasoning'], nodes: ['node-a'], qualification: {state: 'QUALIFIED' as const, version: 'q2', nodes: ['node-a'], capabilities: ['coding','reasoning']}},
  {id: 'untested', provider: 'external', providerModel: 'vendor/new', enabled: true, capabilities: ['coding'], qualification: {state: 'UNTESTED' as const}},
];

test('valid registry routes explicit model before logical role', () => { const registry = new ModelRegistry(providers, models, {defaultRole: 'coding.fast', roles: {'coding.fast': {primary: 'fast', fallback: ['deep']}}}); assert.equal(registry.route({model: 'deep', modelRole: 'coding.fast', nodeId: 'node-a'}).modelId, 'deep'); });
test('logical role selects qualified primary and records identity', () => { const registry = new ModelRegistry(providers, models, {roles: {'coding.fast': {primary: 'fast', fallback: ['deep']}}}); const route = registry.route({modelRole: 'coding.fast', nodeId: 'node-a', requiredCapabilities: ['coding']}); assert.equal(route.providerModel, 'vendor/fast'); assert.equal(route.qualificationVersion, 'q1'); assert.equal(route.fallback, false); });
test('role capability requirements are enforced before fallback', () => { const registry = new ModelRegistry(providers, models, {roles: {'reasoning.deep': {primary: 'fast', fallback: ['deep'], requires: ['reasoning']}}}); const route=registry.route({modelRole:'reasoning.deep',nodeId:'node-a'});assert.equal(route.modelId,'deep');assert.match(route.fallbackReason??'',/capability-reasoning-unproven/); });
test('unavailable node and unqualified primary cause visible fallback', () => { const registry = new ModelRegistry(providers, models, {roles: {'coding.fast': {primary: 'untested', fallback: ['deep']}}}); const route = registry.route({modelRole: 'coding.fast', nodeId: 'node-a'}); assert.equal(route.modelId, 'deep'); assert.equal(route.fallback, true); assert.match(route.fallbackReason!, /qualification-untested/); });
test('qualified model on a different node is unavailable', () => { const registry = new ModelRegistry(providers, models, {roles: {'coding.fast': {primary: 'fast'}}}); assert.throws(() => registry.route({modelRole: 'coding.fast', nodeId: 'node-b'}), /model_route_unavailable/); });
test('fallback can be disabled', () => { const registry = new ModelRegistry(providers, models, {roles: {'coding.fast': {primary: 'untested', fallback: ['deep']}}}); assert.throws(() => registry.route({modelRole: 'coding.fast', nodeId: 'node-a', allowFallback: false}), /model_fallback_disabled/); });
test('disabled and capability-unproven models cannot route', () => { const disabled = {...models[0], enabled: false}; const registry = new ModelRegistry(providers, [disabled], {roles: {review: {primary: 'fast'}}}); assert.throws(() => registry.route({modelRole: 'review', nodeId: 'node-a', requiredCapabilities: ['review']}), /model_route_unavailable/); });
test('configuration rejects duplicate model IDs, unknown provider, and fallback cycles', () => {
  const base = {schemaVersion: 1 as const, resources: [], services: [], lanes: [], providers, models, modelRouting: {roles: {}}};
  assert.throws(() => validateConfig({...base, models: [models[0], models[0]]}), /duplicate_model_id/);
  assert.throws(() => validateConfig({...base, models: [{...models[0], provider: 'missing'}]}), /unknown_model_provider/);
  assert.throws(() => validateConfig({...base, providers: [{...providers[0], baseUrl: 'not a url'}]}), /invalid_provider_external_url/);
  const cycleModels = [{...models[0], id: 'a'}, {...models[1], id: 'b'}];
  assert.throws(() => validateConfig({...base, models: cycleModels, modelRouting: {roles: {a: {primary: 'b'}, b: {primary: 'a'}}}}), /model_fallback_cycle/);
});

test('routing binds an exact qualified account profile and never falls across account policy', () => {
  const profileProviders = [{id: 'codex', name: 'Codex', kind: 'cli' as const, accountProfiles: [
    {id: 'lawrence-pro', nodeId: 'node-a', label: 'Lawrence Pro', plan: 'ChatGPT Pro', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_LAWRENCE_PRO'}, qualification: {state: 'QUALIFIED' as const, version: 'account-q1', checkedAt: '2026-09-02T00:00:00Z', qualifiedAt: '2026-09-02T00:00:00Z', capabilities: ['codex-chatgpt'], evidence: ['interactive-login'] }},
    {id: 'cottage-plus', nodeId: 'node-a', label: 'Cottage Plus', plan: 'ChatGPT Plus', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_COTTAGE_PLUS'}, qualification: {state: 'QUALIFIED' as const, version: 'account-q2', checkedAt: '2026-09-02T00:00:00Z', qualifiedAt: '2026-09-02T00:00:00Z', capabilities: ['codex-chatgpt'], evidence: ['interactive-login'] }},
  ]}];
  const profileModels = [
    {id: 'sol-pro', provider: 'codex', accountProfile: 'lawrence-pro', providerModel: 'sol', capabilities: ['coding'], qualification: {state: 'QUALIFIED' as const, version: 'model-q1', nodes: ['node-a'], capabilities: ['coding']}},
    {id: 'luna-plus', provider: 'codex', accountProfile: 'cottage-plus', providerModel: 'luna', capabilities: ['coding'], qualification: {state: 'QUALIFIED' as const, version: 'model-q2', nodes: ['node-a'], capabilities: ['coding']}},
  ];
  const registry = new ModelRegistry(profileProviders, profileModels, {roles: {review: {primary: 'sol-pro', fallback: ['luna-plus']}}}, undefined, undefined, {CODEX_HOME_LAWRENCE_PRO: process.cwd(), CODEX_HOME_COTTAGE_PLUS: process.cwd()});
  const route = registry.route({model: 'luna-plus', accountProfile: 'cottage-plus', nodeId: 'node-a'});
  assert.deepEqual({provider: route.providerId, account: route.accountProfileId, label: route.accountLabel, plan: route.accountPlan, model: route.modelId}, {provider: 'codex', account: 'cottage-plus', label: 'Cottage Plus', plan: 'ChatGPT Plus', model: 'luna-plus'});
  assert.throws(() => registry.route({model: 'luna-plus', accountProfile: 'lawrence-pro', nodeId: 'node-a'}), /model_route_unavailable/);
  const publicProfile = registry.accountProfilesList()[0] as unknown as Record<string, unknown>;
  assert.equal('credentialStore' in publicProfile, false);
  assert.equal(JSON.stringify(registry.providersList()).includes(process.cwd()), false);
  assert.deepEqual(registry.governedAlternatives('sol-pro'), ['sol-pro', 'luna-plus']);
});
