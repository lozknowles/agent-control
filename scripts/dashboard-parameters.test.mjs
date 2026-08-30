import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

test('dashboard serializes parameter fields according to the manifest schema', () => {
  const context = {window: {}}; vm.runInNewContext(fs.readFileSync(path.resolve('assets/dashboard/dashboard-parameters.js'), 'utf8'), context);
  const fields = [
    {dataset: {jobParameter: 'count'}, value: '12'},
    {dataset: {jobParameter: 'ratio'}, value: '1.25'},
    {dataset: {jobParameter: 'enabled'}, checked: true},
    {dataset: {jobParameter: 'label'}, value: 'fixture'},
  ];
  const definitions = {count: {type: 'integer', required: true}, ratio: {type: 'number'}, enabled: {type: 'boolean'}, label: {type: 'string'}};
  const result = context.window.AgentControlDashboardParameters.collect(definitions, {querySelectorAll: () => fields});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {count: 12, ratio: 1.25, enabled: true, label: 'fixture'});
  assert.throws(() => context.window.AgentControlDashboardParameters.collect({count: {type: 'integer'}}, {querySelectorAll: () => [{dataset: {jobParameter: 'count'}, value: '1.5'}]}), /must be an integer/);
});
