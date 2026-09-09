import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const qualifier = fs.readFileSync(new URL('./qualify-crew-wopr-escalation.ts', import.meta.url), 'utf8');
const recorder = fs.readFileSync(new URL('./record-crew-wopr-escalation.mjs', import.meta.url), 'utf8');

test('normal Crew/POE demonstration requires no manufactured barge-in', () => {
  assert.doesNotMatch(qualifier, /qualification_requires_two_physical_barge_ins/);
  assert.match(qualifier, /interruptionsRequired: false/);
  assert.match(recorder, /normalUninterruptedRun: true/);
  assert.match(recorder, /interruptionsRequired: false/);
});

test('continuous recorder visits every primary operational view and POE', () => {
  for (const view of ['jobs', 'lanes', 'sessions', 'systems', 'models', 'routing', 'crew', 'poe', 'configuration']) {
    assert.match(recorder, new RegExp(`data-view=[\\"']${view}[\\"']`), `missing ${view} view`);
  }
  assert.match(recorder, /poeVisibleAndAnimated: true/);
  assert.match(recorder, /allPrimaryViewsVisited: true/);
});
