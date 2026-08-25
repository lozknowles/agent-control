import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {emptyConfig, initializeConfig, loadConfig} from './config.mjs';
import {main} from './init-config.mjs';

const state = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-init-'));

test('initializer creates only a schema-valid empty configuration', () => {
  const root = state(), environment = {...process.env, AGENT_CONTROL_STATE_DIR: root};
  const initialized = initializeConfig({environment, cwd: root});
  assert.equal(initialized.result, 'CREATED');
  assert.equal(initialized.created, true);
  assert.deepEqual(loadConfig({environment, cwd: root}).config, emptyConfig());
  assert.deepEqual(fs.readdirSync(root), ['config.json']);
});

test('initializer is idempotent for an existing empty configuration', () => {
  const root = state(), environment = {...process.env, AGENT_CONTROL_STATE_DIR: root};
  const first = initializeConfig({environment, cwd: root});
  const before = fs.readFileSync(first.file);
  const second = initializeConfig({environment, cwd: root});
  assert.equal(second.result, 'UNCHANGED_EMPTY');
  assert.equal(second.created, false);
  assert.deepEqual(fs.readFileSync(first.file), before);
});

test('initializer refuses to overwrite configured operator state', () => {
  const root = state(), file = path.join(root, 'config.json');
  const configured = {...emptyConfig(), lanes: [{id: 7, name: 'Operator', cwd: '.', priority: 1, mode: 'manual'}]};
  fs.writeFileSync(file, `${JSON.stringify(configured, null, 2)}\n`);
  const before = fs.readFileSync(file);
  const result = initializeConfig({environment: {...process.env, AGENT_CONTROL_STATE_DIR: root}, cwd: root});
  assert.equal(result.result, 'PRESERVED_EXISTING');
  assert.equal(result.created, false);
  assert.deepEqual(fs.readFileSync(file), before);
});

test('initializer fails closed when existing configuration is invalid', () => {
  const root = state(), file = path.join(root, 'config.json');
  fs.writeFileSync(file, '{"schemaVersion":99}\n');
  assert.throws(() => initializeConfig({environment: {...process.env, AGENT_CONTROL_STATE_DIR: root}, cwd: root}), /unsupported_config_schema/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"schemaVersion":99}\n');
});

test('initializer CLI does not echo existing operator configuration', () => {
  const root = state(), file = path.join(root, 'config.json');
  const configured = {...emptyConfig(), lanes: [{id: 9, name: 'Private operator lane', cwd: '.', priority: 2, mode: 'manual'}]};
  fs.writeFileSync(file, `${JSON.stringify(configured, null, 2)}\n`);
  const lines = [];
  assert.equal(main({environment: {...process.env, AGENT_CONTROL_STATE_DIR: root}, cwd: root, output: line => lines.push(line)}), 0);
  const output = lines.join('\n');
  assert.match(output, /PRESERVED_EXISTING/);
  assert.doesNotMatch(output, /Private operator lane/);
  assert.doesNotMatch(output, /"config"/);
});
