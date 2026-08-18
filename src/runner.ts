import { buildContextEnvelope, markContextRotated, recordContextUse, rotationDecision, updateCompactSummary, estimateTokens } from './context.js';
import type { ReasonerProvider } from './providers.js';
import { appendEvent, appendTranscript, loadRecentTranscript, saveWorkspace, touchBaton, type LaneState, type TranscriptEntry, type WorkspaceState } from './state.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function transcriptEntry(lane: LaneState, role: TranscriptEntry['role'], text: string): TranscriptEntry {
  return { id: id(role), at: new Date().toISOString(), laneId: lane.id, epoch: lane.context.epoch, role, text, estimatedTokens: estimateTokens(text) };
}

export class ContextRotationRequiredError extends Error {}

async function ensureRotation(lane: LaneState, provider: ReasonerProvider): Promise<void> {
  const decision = rotationDecision(lane);
  if (!decision.required) return;
  appendEvent('context.rotation.requested', { laneId: lane.id, epoch: lane.context.epoch, reason: decision.reason, provider: provider.name });
  if (!provider.supportsRotation || !provider.rotate) {
    throw new ContextRotationRequiredError(`Context epoch ${lane.context.epoch} reached its rotation budget, but provider ${provider.name} cannot rotate sessions automatically.`);
  }
  const rotated = await provider.rotate(lane);
  if (!rotated) throw new ContextRotationRequiredError(`Provider ${provider.name} refused context rotation for lane ${lane.id}.`);
  markContextRotated(lane);
  appendEvent('context.rotated', { laneId: lane.id, epoch: lane.context.epoch, provider: provider.name });
}

export async function runLaneTurn(state: WorkspaceState, lane: LaneState, userText: string, provider: ReasonerProvider): Promise<string> {
  await ensureRotation(lane, provider);

  lane.status = 'working';
  lane.lease = { laneId: lane.id, holder: provider.name, acquiredAt: new Date().toISOString(), expiresAt: null };
  touchBaton(lane, { status: 'Reasoner working from bounded context', nextAction: 'Process current request using lane-local tools only', model: lane.contract.modelLock ?? lane.model });

  const user = transcriptEntry(lane, 'user', userText);
  appendTranscript(user);
  const transcript = [...loadRecentTranscript(lane.id, 120), user].filter((turn, index, all) => all.findIndex((candidate) => candidate.id === turn.id) === index);
  updateCompactSummary(lane, transcript);
  const envelope = buildContextEnvelope(lane, transcript, userText);
  appendEvent('context.built', { laneId: lane.id, epoch: lane.context.epoch, estimatedTokens: envelope.estimatedTokens, includedTurns: envelope.includedTurnIds.length, omittedTurns: envelope.omittedTurns });

  try {
    const result = await provider.send(lane, envelope);
    const assistant = transcriptEntry(lane, 'assistant', result.text);
    appendTranscript(assistant);
    recordContextUse(lane, envelope.estimatedTokens, result.text);
    lane.status = 'idle';
    lane.lease = { laneId: lane.id, holder: null, acquiredAt: null, expiresAt: null };
    touchBaton(lane, { status: 'Turn completed', progress: [...lane.baton.progress.slice(-7), userText.slice(0, 160)], nextAction: 'Await next instruction' });
    saveWorkspace(state);
    appendEvent('reasoner.completed', { laneId: lane.id, epoch: lane.context.epoch, provider: provider.name, contextTokens: lane.context.estimatedTokensLastRequest, rotationPending: lane.context.needsRotation });
    return result.text;
  } catch (error) {
    lane.status = error instanceof ContextRotationRequiredError ? 'paused' : 'error';
    lane.lease = { laneId: lane.id, holder: null, acquiredAt: null, expiresAt: null };
    touchBaton(lane, { status: error instanceof ContextRotationRequiredError ? 'Paused: context rotation required' : 'Reasoner error', nextAction: error instanceof ContextRotationRequiredError ? 'Rotate provider session, then resume from hard contract + baton' : 'Inspect reasoner/provider error and retry' });
    saveWorkspace(state);
    appendEvent('reasoner.failed', { laneId: lane.id, provider: provider.name, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
