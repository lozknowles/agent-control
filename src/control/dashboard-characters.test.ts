import assert from 'node:assert/strict';
import test from 'node:test';
import {DASHBOARD_CHARACTER_STATES, projectDashboardCharacterCrew, type DashboardCharacterSource} from './dashboard-characters.js';

const observedAt = '2026-09-06T12:00:00.000Z';
const current = '2026-09-06T11:59:30.000Z';
const stale = '2026-09-06T11:55:00.000Z';

function project(patch: Partial<DashboardCharacterSource> = {}) {
  return projectDashboardCharacterCrew({observedAt, ...patch});
}

function member(source: Partial<DashboardCharacterSource>, id: string) {
  return project(source).members.find(item => item.id === id)!;
}

test('dashboard character roster has stable, non-colour identities for each real dashboard area', () => {
  const crew = project();
  assert.equal(crew.schema, 'agent-control.dashboard-character-crew/v1');
  assert.deepEqual(crew.members.map(item => item.id), ['lane-master', 'prompt-reviewer', 'parcel-coordinator', 'model-scout', 'resource-guardian', 'quality-inspector']);
  assert.equal(new Set(crew.members.map(item => item.identityColor)).size, crew.members.length);
  assert.equal(new Set(crew.members.map(item => item.accessory)).size, crew.members.length);
  assert.ok(crew.members.every(item => item.accessory.length > 8 && item.navigation.target.startsWith('#')));
});

test('active work wins the Lane Master pose while mixed blocked and queued activity stays visible', () => {
  const lane = member({lanes: [
    {status: 'working', elapsedMs: 12_000, lastMeaningfulActivity: current},
    {status: 'paused', lastMeaningfulActivity: current},
    {status: 'waiting', lastMeaningfulActivity: current},
  ]}, 'lane-master');
  assert.equal(lane.state, 'working');
  assert.equal(lane.counts.active, 1);
  assert.equal(lane.counts.blocked, 1);
  assert.equal(lane.counts.queued, 1);
  assert.deepEqual(lane.signals.map(item => [item.state, item.count]), [['working', 1], ['queued', 1], ['blocked', 1]]);
});

test('stale active telemetry never becomes a fabricated failure', () => {
  for (const id of ['lane-master', 'parcel-coordinator', 'quality-inspector']) {
    const source: Partial<DashboardCharacterSource> = id === 'lane-master'
      ? {lanes: [{status: 'working', lastMeaningfulActivity: stale}]}
      : id === 'parcel-coordinator'
        ? {parcels: [{status: 'RUNNING', createdAt: stale, updatedAt: stale, stages: [{status: 'RUNNING', startedAt: stale}]}]}
        : {runs: [{status: 'VERIFYING', requestedAt: stale, startedAt: stale, updatedAt: stale, steps: [{status: 'VERIFYING', startedAt: stale}]}]};
    const value = member(source, id);
    assert.equal(value.state, 'stale');
    assert.equal(value.freshness, 'stale');
    assert.notEqual(value.state, 'failed');
  }
});

test('Prompt Reviewer reports its partial instrumentation and only raises operator attention for a durable question', () => {
  const idle = member({}, 'prompt-reviewer');
  assert.equal(idle.state, 'idle');
  assert.equal(idle.instrumentation.coverage, 'partial');
  assert.match(idle.instrumentation.limitation!, /no separately instrumented prompt-review worker/i);
  const reviewing = member({parcels: [{status: 'PLANNING', createdAt: current, updatedAt: current, stages: []}]}, 'prompt-reviewer');
  assert.equal(reviewing.state, 'reviewing');
  const waiting = member({parcels: [{status: 'WAITING', createdAt: current, updatedAt: current, stages: [], context: {questions: [{status: 'OPEN', text: 'Choose the intended repository.'}]}}]}, 'prompt-reviewer');
  assert.equal(waiting.state, 'awaiting_operator');
  assert.equal(waiting.reason, 'Choose the intended repository.');
});

test('a recorded live token handoff selects the handover pose and preserves destination evidence', () => {
  const coordinator = member({
    parcels: [{status: 'RUNNING', createdAt: current, updatedAt: current, stages: [{status: 'RUNNING', startedAt: current}]}],
    tokenRouting: {
      threads: [{id: 'thread:a', parcelId: 'parcel:a', active: true, updatedAt: current}],
      decisions: [{threadId: 'thread:a', parcelId: 'parcel:a', at: current, action: 'BATON_AND_HANDOFF', outcome: 'RECORDED', reason: 'sealed baton ready', target: {providerId: 'local', modelId: 'bounded'}}],
    },
  }, 'parcel-coordinator');
  assert.equal(coordinator.state, 'handing_over');
  assert.equal(coordinator.reason, 'sealed baton ready');
});

test('a terminal handoff result clears the pending handover pose', () => {
  const coordinator = member({
    parcels: [{status: 'RUNNING', createdAt: current, updatedAt: current, stages: [{status: 'RUNNING', startedAt: current}]}],
    tokenRouting: {
      threads: [{id: 'thread:a', parcelId: 'parcel:a', active: true, updatedAt: current}],
      decisions: [
        {threadId: 'thread:a', parcelId: 'parcel:a', at: '2026-09-06T11:59:20.000Z', action: 'BATON_AND_HANDOFF', outcome: 'RECORDED', reason: 'sealed baton ready'},
        {threadId: 'thread:a', parcelId: 'parcel:a', at: current, action: 'BATON_AND_HANDOFF', outcome: 'SUCCEEDED', reason: 'destination continued'},
      ],
    },
  }, 'parcel-coordinator');
  assert.equal(coordinator.state, 'working');
  assert.notEqual(coordinator.reason, 'sealed baton ready');
});

test('cancellation requested remains cancelling until canonical cleanup is confirmed', () => {
  const requested = member({lanes: [{status: 'cancelled', lastMeaningfulActivity: current, baton: {status: 'Cancellation requested', nextAction: 'Execution provider confirms cancellation; retain evidence'}}]}, 'lane-master');
  assert.equal(requested.state, 'cancelling');
  const settled = member({lanes: [{status: 'cancelled', lastMeaningfulActivity: current, baton: {status: 'Cancellation complete', nextAction: 'Retain evidence'}}]}, 'lane-master');
  assert.equal(settled.state, 'cancelled');
  const qualityRequested = member({runs: [{status: 'CANCELLING', requestedAt: current, updatedAt: current}]}, 'quality-inspector');
  const qualitySettled = member({runs: [{status: 'CANCELLED', requestedAt: current, updatedAt: current, endedAt: current}]}, 'quality-inspector');
  assert.equal(qualityRequested.state, 'cancelling');
  assert.equal(qualitySettled.state, 'cancelled');
});

test('dependency wait, recovery and explicit blocked state remain distinguishable', () => {
  const dependency = member({parcels: [{status: 'WAITING', createdAt: current, updatedAt: current, stages: [{status: 'WAITING', waitingReason: 'Awaiting predecessor baton'}]}]}, 'parcel-coordinator');
  assert.equal(dependency.state, 'waiting');
  assert.match(dependency.reason, /predecessor baton/);
  const recovery = member({runs: [{status: 'RECONNECTING', requestedAt: current, updatedAt: current, recovery: {state: 'RECONNECTING', reason: 'transport continuity check', observedAt: current}}]}, 'lane-master');
  assert.equal(recovery.state, 'recovering');
  const blocked = member({parcels: [{status: 'WAITING', createdAt: current, updatedAt: current, stages: [{status: 'BLOCKED', error: 'dependency failed'}]}]}, 'parcel-coordinator');
  assert.equal(blocked.state, 'blocked');
});

test('Resource Guardian distinguishes pressure, offline, unknown and stale readiness', () => {
  const pressure = member({systems: [{execution: 'BUSY', active: 1, capacity: 1, lastCheckAt: current, blockingReason: 'Execution capacity is exhausted'}]}, 'resource-guardian');
  assert.equal(pressure.state, 'resource_pressure');
  const offline = member({systems: [{execution: 'OFFLINE', active: 0, capacity: 1, lastCheckAt: current, blockingReason: 'Probe failed'}]}, 'resource-guardian');
  assert.equal(offline.state, 'offline');
  const unknown = member({systems: [{execution: 'UNKNOWN', active: null, capacity: null, blockingReason: 'Not probed'}]}, 'resource-guardian');
  assert.equal(unknown.state, 'unknown');
  const staleAvailable = member({systems: [{execution: 'AVAILABLE', active: 0, capacity: 1, lastCheckAt: stale}]}, 'resource-guardian');
  assert.equal(staleAvailable.state, 'stale');
});

test('Model Scout and Quality Inspector use only registry, evaluation and verification evidence', () => {
  const scouting = member({models: [{qualificationState: 'QUALIFIED', accountAvailability: 'AVAILABLE', checkedAt: current}], modelBatches: [{status: 'RUNNING', startedAt: current}]}, 'model-scout');
  assert.equal(scouting.state, 'working');
  assert.equal(scouting.counts.completed, 1);
  const blocked = member({models: [{qualificationState: 'UNTESTED', accountAvailability: 'UNAVAILABLE', checkedAt: current}]}, 'model-scout');
  assert.equal(blocked.state, 'blocked');
  const reviewing = member({runs: [{status: 'VERIFYING', requestedAt: current, updatedAt: current, steps: [{status: 'VERIFYING', startedAt: current}]}]}, 'quality-inspector');
  assert.equal(reviewing.state, 'reviewing');
  const completed = member({runs: [{status: 'SUCCEEDED', requestedAt: current, updatedAt: current, endedAt: current}]}, 'quality-inspector');
  assert.equal(completed.state, 'completed');
});

test('the preview vocabulary covers every declared production character state', () => {
  assert.deepEqual(DASHBOARD_CHARACTER_STATES, ['idle', 'queued', 'working', 'reviewing', 'waiting', 'awaiting_operator', 'blocked', 'resource_pressure', 'recovering', 'handing_over', 'completed', 'failed', 'cancelling', 'cancelled', 'offline', 'stale', 'unknown']);
});
