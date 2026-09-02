import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {emptyConfig, loadConfig, validateConfig} from './config.js';

test('missing configuration is a safe empty control plane', () => {
  const file = path.join(os.tmpdir(), `agent-control-missing-${Date.now()}.json`);
  assert.deepEqual(loadConfig(file), emptyConfig());
});

test('arbitrary names, ports and Android models are configuration not identity', () => {
  const config = validateConfig({
    schemaVersion: 1,
    resources: [
      {id: 'controller-a', platform: 'linux', transport: {type: 'local'}, capabilities: ['control-plane']},
      {id: 'worker-foo', platform: 'linux', transport: {type: 'ssh', host: 'worker.example', port: 2207, user: 'operator'}, capabilities: ['harness.codex']},
      {id: 'android-test', platform: 'android', transport: {type: 'ssh', host: 'phone.example', port: 9922, user: 'mobile'}, capabilities: ['platform.android'], metadata: {model: 'Example One'}},
      {id: 'remote-bar', platform: 'remote', transport: {type: 'orca'}, capabilities: ['execution.remote']},
    ],
    providers: [{id: 'provider-a', kind: 'responses', baseUrl: 'http://127.0.0.1:19091/v1'}],
    services: [{id: 'model-a', healthUrl: 'http://127.0.0.1:19092/health', optional: true}],
    lanes: [{id: 1, name: 'Primary', cwd: '.'}],
  });
  assert.deepEqual(config.resources.map(resource => resource.id), ['controller-a', 'worker-foo', 'android-test', 'remote-bar']);
  assert.equal(config.resources[2].metadata?.model, 'Example One');
  assert.equal(config.providers[0].baseUrl, 'http://127.0.0.1:19091/v1');
});

test('resource identity and transport identity are separate', () => {
  const base = {id: 'worker-foo', platform: 'linux', capabilities: ['harness.codex']};
  const local = validateConfig({schemaVersion: 1, resources: [{...base, transport: {type: 'local'}}], providers: [], services: [], lanes: []});
  const ssh = validateConfig({schemaVersion: 1, resources: [{...base, transport: {type: 'ssh', host: 'worker.example'}}], providers: [], services: [], lanes: []});
  assert.equal(local.resources[0].id, ssh.resources[0].id);
  assert.notEqual(local.resources[0].transport.type, ssh.resources[0].transport.type);
});

test('configuration rejects embedded secrets and credentialed URLs', () => {
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [], providers: [], services: [], lanes: [], apiKey: 'forbidden'}), /secret_material_forbidden/);
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [], providers: [{id: 'p', kind: 'responses', baseUrl: 'https://user:pass@example.test'}], services: [], lanes: []}), /invalid_provider_p_url/);
});

test('provider credentials are references and qualification metadata is durable configuration', () => {
  const config = validateConfig({schemaVersion: 1, resources: [], providers: [{id: 'ox', kind: 'responses', baseUrl: 'https://openrouter.ai/api/v1', wireApi: 'responses', requiresAuth: true, credentialEnv: 'OPENROUTER_API_KEY', credentialFileEnv: 'OPENROUTER_API_KEY_FILE', qualificationModel: 'z-ai/glm-5.3-flash', qualification: {status: 'unqualified', advertisedContextLimitTokens: 1048576, evidence: ['provider-catalog:openrouter:z-ai/glm-5.3-flash:2026-08-29']}}], services: [], lanes: []});
  assert.equal(config.providers[0].credentialEnv, 'OPENROUTER_API_KEY');
  assert.equal(config.providers[0].qualification?.advertisedContextLimitTokens, 1048576);
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [], providers: [{id: 'ox', kind: 'responses', credentialEnv: 'bad-name'}], services: [], lanes: []}), /invalid_provider_credentialEnv/);
});

test('configuration survives a persistence reload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-config-'));
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(file, JSON.stringify({schemaVersion: 1, resources: [], providers: [], services: [], lanes: [{id: 7, name: 'Review'}]}));
  assert.equal(loadConfig(file).lanes[0].name, 'Review');
});

test('API-only installation needs no local resource or local model', () => {
  const config = validateConfig({schemaVersion: 1, resources: [], providers: [{id: 'api-only', kind: 'responses', baseUrl: 'https://api.example.test/v1', qualificationModel: 'qualified-model'}], services: [], lanes: []});
  assert.deepEqual(config.resources, []);
  assert.equal(config.providers[0].kind, 'responses');
  assert.deepEqual(config.services, []);
});

test('two Android models use one schema without becoming identity defaults', () => {
  const config = validateConfig({schemaVersion: 1, resources: [
    {id: 'mobile-a', platform: 'android', transport: {type: 'ssh', host: 'mobile-a.example'}, capabilities: ['platform.android'], metadata: {model: 'Vendor One'}},
    {id: 'mobile-b', platform: 'android', transport: {type: 'http', baseUrl: 'https://mobile-b.example'}, capabilities: ['platform.android'], metadata: {model: 'Vendor Two'}},
  ], providers: [], services: [], lanes: []});
  assert.deepEqual(config.resources.map(resource => resource.metadata?.model), ['Vendor One', 'Vendor Two']);
});

test('generic managed Linux node policy is configuration and validates workload boundaries', () => {
  const config = validateConfig({schemaVersion: 1, resources: [{id: 'linux-any', platform: 'linux', transport: {type: 'ssh', host: 'linux-any.example', user: 'operator'}, capabilities: [], managedNode: {enabled: true, probeIntervalSeconds: 15, offlineAfterSeconds: 45, approvedServices: ['disc-watch.service'], connectivity: [{id: 'private-overlay', label: 'Private overlay', capability: 'transport.secure-overlay', serviceUnit: 'overlay-agent.service', interfaceName: 'overlay0'}], workloads: [{id: 'disc-copy', capability: 'workload.dvd-rip', systemdUnit: 'disc-watch.service', processExecutables: ['disc-copy'], opticalAccess: true}], runtime: {directory: '/opt/agent-control', branch: 'integration/3.1'}}}], providers: [], services: [], lanes: []});
  assert.equal(config.resources[0].managedNode?.workloads?.[0].id, 'disc-copy');
  assert.equal(config.resources[0].managedNode?.connectivity?.[0].capability, 'transport.secure-overlay');
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [{id: 'bad', platform: 'linux', transport: {type: 'ssh', host: '-oProxyCommand=bad'}, capabilities: [], managedNode: {enabled: true}}], providers: [], services: [], lanes: []}), /invalid_ssh_host/);
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [{id: 'bad', platform: 'linux', transport: {type: 'local'}, capabilities: [], managedNode: {enabled: true}}], providers: [], services: [], lanes: []}), /managed_node_ssh_required/);
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [{id: 'bad', platform: 'linux', transport: {type: 'ssh', host: 'safe.example'}, capabilities: [], managedNode: {enabled: true, runtime: {directory: '/tmp/x;reboot', branch: 'main'}}}], providers: [], services: [], lanes: []}), /runtime_directory/);
  assert.throws(() => validateConfig({schemaVersion: 1, resources: [{id: 'bad', platform: 'linux', transport: {type: 'ssh', host: 'safe.example'}, capabilities: [], managedNode: {enabled: true, connectivity: [{id: 'overlay', capability: 'transport.secure-overlay', interfaceName: '-oBad'}]}}], providers: [], services: [], lanes: []}), /connectivity_interface/);
});

test('token-aware output thresholds are optional machine-neutral configuration', () => {
  const config = validateConfig({schemaVersion: 1, resources: [], providers: [], services: [], lanes: [], tokenAwareOutput: {completeMaxLines: 25, completeMaxBytes: 8192, completeMaxTokens: 2048, completeMaxMatches: 20, completeMaxFiles: 4, indexMaxFiles: 80, maxCaptureBytesPerStream: 1048576, retentionSeconds: 600, contextBudgetFraction: .4}});
  assert.equal(config.tokenAwareOutput?.completeMaxLines, 25);
  assert.equal(config.tokenAwareOutput?.contextBudgetFraction, .4);
});

test('token-aware output configuration rejects unsafe or nonsensical limits', () => {
  const base = {schemaVersion: 1, resources: [], providers: [], services: [], lanes: []};
  assert.throws(() => validateConfig({...base, tokenAwareOutput: {maxCaptureBytesPerStream: 1}}), /maxCaptureBytesPerStream/);
  assert.throws(() => validateConfig({...base, tokenAwareOutput: {retentionSeconds: 0}}), /retentionSeconds/);
  assert.throws(() => validateConfig({...base, tokenAwareOutput: {contextBudgetFraction: 1.1}}), /context_budget_fraction/);
});

test('token-aware baton-routing thresholds are explicit policy and reject invalid ordering', () => {
  const base = {schemaVersion: 1, resources: [], providers: [], services: [], lanes: []};
  const config = validateConfig({...base, tokenBatonRouting: {prepareBatonPercent: 75, compactPercent: 85, handoffPercent: 90, sampleRetention: 240}});
  assert.equal(config.tokenBatonRouting?.handoffPercent, 90);
  assert.throws(() => validateConfig({...base, tokenBatonRouting: {prepareBatonPercent: 85, compactPercent: 75, handoffPercent: 90}}), /threshold_order/);
  assert.throws(() => validateConfig({...base, tokenBatonRouting: {prepareBatonPercent: 86}}), /threshold_order/);
  assert.throws(() => validateConfig({...base, tokenBatonRouting: {sampleRetention: 1}}), /sample_retention/);
});

test('harness efficiency profiles are configurable without provider or machine identity', () => {
  const config = validateConfig({schemaVersion: 1, resources: [], providers: [], services: [], lanes: [], harnessEfficiency: {routingMode: 'observe', minimumVerifiedRuns: 12, minimumSuccessRate: .95, minimumSameModelControlledRuns: 10, profiles: {THIN: {maximumInitialContextTokens: 3000, maximumSources: 10, maximumOptionalSkills: 1, maximumTools: 5, maximumTurns: 2, allowBroadRepositoryContext: false, allowSharedContext: false}}}});
  assert.equal(config.harnessEfficiency?.routingMode, 'observe');
  assert.equal(config.harnessEfficiency?.profiles?.THIN?.maximumInitialContextTokens, 3000);
});

test('harness efficiency configuration rejects unsafe automatic-routing thresholds', () => {
  const base = {schemaVersion: 1, resources: [], providers: [], services: [], lanes: []};
  assert.throws(() => validateConfig({...base, harnessEfficiency: {routingMode: 'automatic'}}), /routing_mode/);
  assert.throws(() => validateConfig({...base, harnessEfficiency: {minimumSuccessRate: 0}}), /minimum_success_rate/);
  assert.throws(() => validateConfig({...base, harnessEfficiency: {profiles: {THIN: {maximumInitialContextTokens: 1}}}}), /harness_efficiency_context/);
});

test('Spark fast-execution configuration is conservative and fail-closed', () => {
  const base = {schemaVersion: 1 as const, resources: [], providers: [], models: [], modelRouting: {roles: {}}, services: [], lanes: []};
  const config = validateConfig({...base, spark: {enabled: false, model: 'gpt-5.3-codex-spark', modelRole: 'fast-execution', maximumFiles: 1, maximumChangedLines: 80, maximumAttempts: 1, maximumSubagents: 0, maximumContextTokens: 2048, verificationRequired: true}});
  assert.equal(config.spark?.enabled, false); assert.equal(config.spark?.maximumAttempts, 1); assert.equal(config.spark?.verificationRequired, true);
  assert.throws(() => validateConfig({...base, spark: {enabled: true, maximumAttempts: 2}}), /spark_maximum_attempts/);
  assert.throws(() => validateConfig({...base, spark: {enabled: true, maximumSubagents: 1}}), /spark_maximum_subagents/);
  assert.throws(() => validateConfig({...base, spark: {enabled: true, verificationRequired: false}}), /spark_verification_required/);
});
