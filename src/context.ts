import type { LaneState, TranscriptEntry } from './state.js';

const TOKEN_CHARS = 3.5;
const MAX_SUMMARY_TOKENS = 2_000;

export interface ContextEnvelope {
  text: string;
  estimatedTokens: number;
  includedTurnIds: string[];
  omittedTurns: number;
}

export interface RotationDecision {
  required: boolean;
  reason: 'none' | 'token-budget' | 'turn-budget' | 'flagged';
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / TOKEN_CHARS));
}

function clipToTokens(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * TOKEN_CHARS);
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(0, maxChars - 15))}\n…[truncated]`;
}

function renderContract(lane: LaneState): string {
  const c = lane.contract;
  return [
    `Goal: ${c.goal}`,
    `Working directory: ${c.cwd}`,
    `Mode: ${c.mode}`,
    `Priority: ${c.priority}`,
    `Model lock: ${c.modelLock ?? 'none'}`,
    `Constraints: ${c.constraints.length ? c.constraints.join(' | ') : 'none'}`,
    `Shared tasks: ${c.sharedTaskIds.length ? c.sharedTaskIds.join(', ') : 'none'}`,
    c.git ? `Git: ${JSON.stringify(c.git)}` : '',
  ].filter(Boolean).join('\n');
}

function renderBaton(lane: LaneState): string {
  const b = lane.baton;
  return [
    `Baton revision: ${b.revision}`,
    `Status: ${b.status}`,
    `Progress: ${b.progress.join(' | ') || 'none recorded'}`,
    `Hypothesis: ${b.hypothesis || 'none'}`,
    `Evidence: ${b.evidence.join(' | ') || 'none recorded'}`,
    `Changes: ${b.changes.join(' | ') || 'none recorded'}`,
    `Next action: ${b.nextAction}`,
    `Open questions: ${b.openQuestions.join(' | ') || 'none'}`,
  ].join('\n');
}

function renderTurn(turn: TranscriptEntry): string {
  return `[${turn.role.toUpperCase()} ${turn.id}]\n${turn.text}`;
}

export function rotationDecision(lane: LaneState): RotationDecision {
  if (lane.context.needsRotation) return { required: true, reason: 'flagged' };
  if (lane.context.estimatedTokensInEpoch >= lane.context.policy.rotateAfterTokens) return { required: true, reason: 'token-budget' };
  if (lane.context.turnsInEpoch >= lane.context.policy.rotateAfterTurns) return { required: true, reason: 'turn-budget' };
  return { required: false, reason: 'none' };
}

export function buildContextEnvelope(lane: LaneState, transcript: TranscriptEntry[], userText: string): ContextEnvelope {
  const policy = lane.context.policy;
  const mandatory = [
    'AGENT CONTROL CONTEXT PACKET',
    `Lane: ${lane.id} ${lane.name}`,
    `Context epoch: ${lane.context.epoch}`,
    '',
    'EXECUTION BOUNDARY',
    '- The reasoning transport is NOT the execution host.',
    '- Any shell, filesystem, git, browser, network or process action must use the local tools/executor attached to this lane.',
    '- Never substitute a remote/backend shell for the lane executor.',
    '- Durable truth is the hard contract, baton, evidence and objective tool results below; conversational memory is disposable.',
    '',
    'HARD CONTRACT',
    renderContract(lane),
    '',
    'LATEST BATON',
    renderBaton(lane),
    '',
    'DURABLE COMPACT SUMMARY',
    clipToTokens(lane.context.summary || 'No prior compact summary.', MAX_SUMMARY_TOKENS),
    '',
    'CURRENT USER REQUEST',
    userText,
  ].join('\n');

  const mandatoryTokens = estimateTokens(mandatory);
  if (mandatoryTokens > policy.requestHardTokens) {
    throw new Error(`Hard contract + baton + request exceed context hard limit (${mandatoryTokens} > ${policy.requestHardTokens} tokens)`);
  }

  let budget = Math.max(0, policy.requestTargetTokens - mandatoryTokens);
  const chosen: TranscriptEntry[] = [];
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    const turn = transcript[i];
    if (turn.epoch !== lane.context.epoch) continue;
    const cost = estimateTokens(renderTurn(turn));
    if (cost > budget) break;
    chosen.unshift(turn);
    budget -= cost;
  }

  const history = chosen.length
    ? `\n\nRECENT TRANSCRIPT (bounded)\n${chosen.map(renderTurn).join('\n\n')}`
    : '\n\nRECENT TRANSCRIPT (bounded)\nNo recent turns included.';
  const text = mandatory + history;
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens > policy.requestHardTokens) {
    throw new Error(`Built context exceeds hard limit (${estimatedTokens} > ${policy.requestHardTokens} tokens)`);
  }

  const eligible = transcript.filter((turn) => turn.epoch === lane.context.epoch).length;
  return {
    text,
    estimatedTokens,
    includedTurnIds: chosen.map((turn) => turn.id),
    omittedTurns: Math.max(0, eligible - chosen.length),
  };
}

export function updateCompactSummary(lane: LaneState, transcript: TranscriptEntry[]): void {
  const omitted = transcript.filter((turn) => turn.epoch === lane.context.epoch).slice(0, -8);
  if (!omitted.length) return;
  const snippets = omitted.slice(-16).map((turn) => {
    const oneLine = turn.text.replace(/\s+/g, ' ').trim();
    return `- ${turn.role}: ${oneLine.slice(0, 220)}`;
  });
  const durable = [
    `Lane ${lane.id} epoch ${lane.context.epoch} compacted transcript notes:`,
    ...snippets,
    `Baton r${lane.baton.revision}: ${lane.baton.status}; next=${lane.baton.nextAction}`,
  ].join('\n');
  lane.context.summary = clipToTokens(durable, MAX_SUMMARY_TOKENS);
}

export function recordContextUse(lane: LaneState, requestTokens: number, responseText: string): void {
  const responseTokens = estimateTokens(responseText);
  lane.context.turnsInEpoch += 1;
  lane.context.estimatedTokensLastRequest = requestTokens + responseTokens;
  lane.context.estimatedTokensInEpoch += requestTokens + responseTokens;
  const decision = rotationDecision(lane);
  lane.context.needsRotation = decision.required;
}

export function markContextRotated(lane: LaneState): void {
  lane.context.epoch += 1;
  lane.context.turnsInEpoch = 0;
  lane.context.estimatedTokensInEpoch = 0;
  lane.context.estimatedTokensLastRequest = 0;
  lane.context.needsRotation = false;
  lane.context.lastRotationAt = new Date().toISOString();
}
