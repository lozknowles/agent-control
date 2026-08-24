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
