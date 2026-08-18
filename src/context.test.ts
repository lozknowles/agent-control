import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContextEnvelope, markContextRotated, recordContextUse, rotationDecision } from './context.js';
import { newContextState, type LaneState, type TranscriptEntry } from './state.js';

function makeLane(): LaneState {
  const at = new Date().toISOString();
  return {
    id: 1,
    name: 'Test',
    status: 'idle',
    model: 'chatgpt-window',
    reasoning: 'medium',
    context: newContextState(),
    lines: [],
    contract: { version: 1, laneId: 1, goal: 'Keep context bounded', constraints: ['local tools only'], cwd: '/tmp', priority: 1, mode: 'auto', modelLock: null, sharedTaskIds: [], updatedAt: at },
    baton: { version: 1, laneId: 1, revision: 2, status: 'Ready', progress: [], hypothesis: '', evidence: ['state is durable'], changes: [], nextAction: 'Continue', openQuestions: [], model: 'chatgpt-window', reasoning: 'medium', updatedAt: at },
    lease: { laneId: 1, holder: null, acquiredAt: null, expiresAt: null },
  };
}

function transcript(count: number): TranscriptEntry[] {
  const at = new Date().toISOString();
  return Array.from({ length: count }, (_, index) => ({
    id: `turn-${index}`,
    at,
    laneId: 1,
    epoch: 1,
    role: index % 2 ? 'assistant' : 'user',
    text: `turn ${index} ${'x'.repeat(1000)}`,
    estimatedTokens: 290,
  }));
}

test('context envelope keeps the newest transcript turns inside the hard cap', () => {
  const lane = makeLane();
  const envelope = buildContextEnvelope(lane, transcript(100), 'continue');
  assert.ok(envelope.estimatedTokens <= lane.context.policy.requestHardTokens);
  assert.ok(envelope.omittedTurns > 0);
  assert.match(envelope.text, /EXECUTION BOUNDARY/);
  assert.match(envelope.text, /remote\/backend shell/);
});

test('context epoch requests rotation when cumulative budget is reached', () => {
  const lane = makeLane();
  recordContextUse(lane, lane.context.policy.rotateAfterTokens - 100, 'x'.repeat(1000));
  assert.equal(lane.context.needsRotation, true);
  assert.equal(rotationDecision(lane).required, true);
});

test('rotation resets disposable counters but preserves durable lane state', () => {
  const lane = makeLane();
  lane.context.estimatedTokensInEpoch = 50_000;
  lane.context.turnsInEpoch = 25;
  lane.context.needsRotation = true;
  const goal = lane.contract.goal;
  const batonRevision = lane.baton.revision;
  markContextRotated(lane);
  assert.equal(lane.context.epoch, 2);
  assert.equal(lane.context.estimatedTokensInEpoch, 0);
  assert.equal(lane.context.turnsInEpoch, 0);
  assert.equal(lane.context.needsRotation, false);
  assert.equal(lane.contract.goal, goal);
  assert.equal(lane.baton.revision, batonRevision);
});
