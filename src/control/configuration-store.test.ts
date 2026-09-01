import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {ConfigurationStore, ConfigurationStoreError} from './configuration-store.js';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-configuration-')), file = path.join(root, 'config.json');
  fs.writeFileSync(file, JSON.stringify({schemaVersion: 1, resources: [], providers: [], services: [], lanes: [{id: 1, name: 'Primary'}]}));
  return {root, file, store: new ConfigurationStore(file)};
}

test('configuration store adds and edits a system without dropping unrelated configuration', t => {
  const {root, file, store} = setup(); t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const created = store.upsert({revision: store.read().revision, kind: 'resource', item: {id: 'remote-host', name: 'Remote host', platform: 'linux', transport: {type: 'ssh', host: 'remote-host', user: 'operator'}, capabilities: ['system.inspect']}});
  assert.equal(created.restartRequired, true); assert.equal(created.resources[0].id, 'remote-host');
  const updated = store.upsert({revision: created.revision, kind: 'resource', originalId: 'remote-host', item: {...created.resources[0], name: 'Remote archive'}});
  assert.equal(updated.resources[0].name, 'Remote archive'); assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).lanes[0].name, 'Primary');
});

test('configuration store rejects stale edits and secret material', t => {
  const {root, store} = setup(); t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const initial = store.read();
  store.upsert({revision: initial.revision, kind: 'service', item: {id: 'bridge', healthUrl: 'https://bridge.example/health'}});
  assert.throws(() => store.upsert({revision: initial.revision, kind: 'service', item: {id: 'stale', healthUrl: 'https://stale.example/health'}}), (error: unknown) => error instanceof ConfigurationStoreError && error.status === 409);
  const current = store.read();
  assert.throws(() => store.upsert({revision: current.revision, kind: 'provider', item: {id: 'unsafe', kind: 'responses', apiKey: 'plaintext'}}), /secret_material_forbidden/);
});

test('configuration store updates model routes atomically without restart', t => {
  const {root, store} = setup(); t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const provider = store.upsert({revision: store.read().revision, kind: 'provider', item: {id: 'external', kind: 'openai-compatible', baseUrl: 'https://models.example/v1', auth: {type: 'bearer-env', env: 'EXTERNAL_API_KEY'}}});
  const model = store.upsert({revision: provider.revision, kind: 'model', item: {id: 'fast', provider: 'external', providerModel: 'vendor/fast', capabilities: ['coding'], qualification: {state: 'UNTESTED'}}});
  const routed = store.updateModelRouting({revision: model.revision, modelRouting: {defaultRole: 'coding.fast', roles: {'coding.fast': {primary: 'fast'}}}});
  assert.equal(routed.restartRequired, false); assert.equal(routed.modelRouting.defaultRole, 'coding.fast'); assert.equal(routed.modelRouting.roles['coding.fast'].primary, 'fast');
});

test('configuration store updates the optional Spark lane without weakening limits', t => {
  const {root, store} = setup(); t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const updated = store.updateSpark({revision: store.read().revision, spark: {enabled: false, model: 'gpt-5.3-codex-spark', modelRole: 'fast-execution', maximumFiles: 1, maximumChangedLines: 80, maximumAttempts: 1, maximumSubagents: 0, maximumContextTokens: 2048, verificationRequired: true}});
  assert.equal(updated.spark?.model, 'gpt-5.3-codex-spark'); assert.equal(updated.restartRequired, true);
  assert.throws(() => store.updateSpark({revision: updated.revision, spark: {enabled: true, maximumAttempts: 3}}), /spark_maximum_attempts/);
});
