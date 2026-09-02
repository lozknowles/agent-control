import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {qualifyAccountProfile} from './account-profile-qualification.js';
import {AccountProfileQualificationStore, ModelRegistry} from './model-registry.js';

test('Codex account qualification probes only the selected isolated home and persists no credentials', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-account-qualification-'));
  const proHome = path.join(root, 'pro'), plusHome = path.join(root, 'plus'), stateFile = path.join(root, 'qualification.json');
  fs.mkdirSync(proHome); fs.mkdirSync(plusHome);
  const secret = 'sk-account-qualification-secret-123456789';
  fs.writeFileSync(path.join(proHome, 'auth.json'), JSON.stringify({access_token: secret}));
  const provider = {id: 'codex', kind: 'cli' as const, accountProfiles: [
    {id: 'lawrence-pro', label: 'Lawrence Pro', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_LAWRENCE_PRO'}},
    {id: 'cottage-plus', label: 'Cottage Plus', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_COTTAGE_PLUS'}},
  ]};
  const environment = {CODEX_HOME: '/global-unchanged', CODEX_HOME_LAWRENCE_PRO: proHome, CODEX_HOME_COTTAGE_PLUS: plusHome};
  const registry = new ModelRegistry([provider], [], {roles: {}}, undefined, new AccountProfileQualificationStore(stateFile), environment);
  try {
    const result = await qualifyAccountProfile({registry, providerId: 'codex', accountProfileId: 'lawrence-pro', environment, probe: async (_command, _cwd, _timeout, childEnvironment) => { assert.equal(childEnvironment.CODEX_HOME, proHome); assert.notEqual(childEnvironment.CODEX_HOME, plusHome); return {mode: 'chatgpt'}; }});
    assert.equal(result.record.state, 'QUALIFIED');
    assert.equal(result.record.accountProfileId, 'lawrence-pro');
    assert.equal(environment.CODEX_HOME, '/global-unchanged');
    const persisted = fs.readFileSync(stateFile, 'utf8');
    assert.equal(persisted.includes(secret), false); assert.equal(persisted.includes(root), false); assert.equal(persisted.includes('auth.json'), false);
    assert.deepEqual(JSON.parse(persisted).records[0].evidence, ['codex-login-status:chatgpt']);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
