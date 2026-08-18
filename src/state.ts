import fs from 'node:fs';
import path from 'node:path';

export type Mode = 'auto' | 'manual';
export type LaneStatus = 'working' | 'idle' | 'waiting' | 'paused' | 'error';

export interface HardContract {
  version: 1;
  laneId: number;
  goal: string;
  constraints: string[];
  cwd: string;
  priority: number;
  mode: Mode;
  modelLock: string | null;
  sharedTaskIds: string[];
  git?: { branch?: string; head?: string; dirtyFiles?: string[] };
  updatedAt: string;
}

export interface Baton {
  version: 1;
  laneId: number;
  revision: number;
  status: string;
  progress: string[];
  hypothesis: string;
  evidence: string[];
  changes: string[];
  nextAction: string;
  openQuestions: string[];
  model: string;
  reasoning: string;
  updatedAt: string;
}

export interface Lease {
  laneId: number;
  holder: string | null;
  acquiredAt: string | null;
  expiresAt: string | null;
}

export interface ContextPolicy {
  requestTargetTokens: number;
  requestHardTokens: number;
  rotateAfterTokens: number;
  rotateAfterTurns: number;
}

export interface ContextState {
  epoch: number;
  turnsInEpoch: number;
  estimatedTokensInEpoch: number;
  estimatedTokensLastRequest: number;
  summary: string;
  needsRotation: boolean;
  lastRotationAt: string | null;
  policy: ContextPolicy;
}

export interface TranscriptEntry {
  id: string;
  at: string;
  laneId: number;
  epoch: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  estimatedTokens: number;
}

export interface LaneState {
  id: number;
  name: string;
  status: LaneStatus;
  model: string;
  reasoning: string;
  context: ContextState;
  contract: HardContract;
  baton: Baton;
  lease: Lease;
  lines: string[];
}

export interface WorkspaceState {
  version: 1;
  paused: boolean;
  lastRestorePoint: string | null;
  lanes: LaneState[];
}

const ROOT = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control');
const WORKSPACE = path.join(ROOT, 'workspace.json');

export const DEFAULT_CONTEXT_POLICY: ContextPolicy = {
  requestTargetTokens: Number(process.env.AGENT_CONTROL_CONTEXT_TARGET_TOKENS || 12_000),
  requestHardTokens: Number(process.env.AGENT_CONTROL_CONTEXT_HARD_TOKENS || 16_000),
  rotateAfterTokens: Number(process.env.AGENT_CONTROL_CONTEXT_ROTATE_TOKENS || 48_000),
  rotateAfterTurns: Number(process.env.AGENT_CONTROL_CONTEXT_ROTATE_TURNS || 24),
};

export function newContextState(): ContextState {
  return {
    epoch: 1,
    turnsInEpoch: 0,
    estimatedTokensInEpoch: 0,
    estimatedTokensLastRequest: 0,
    summary: '',
    needsRotation: false,
    lastRotationAt: null,
    policy: { ...DEFAULT_CONTEXT_POLICY },
  };
}

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJsonAtomic(file: string, value: unknown) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function normalizeContext(value: unknown): ContextState {
  if (!value || typeof value === 'string') return newContextState();
  const candidate = value as Partial<ContextState>;
  return {
    ...newContextState(),
    ...candidate,
    policy: { ...DEFAULT_CONTEXT_POLICY, ...(candidate.policy ?? {}) },
  };
}

function normalizeWorkspace(state: WorkspaceState): WorkspaceState {
  state.lanes = state.lanes.map((lane) => ({
    ...lane,
    context: normalizeContext(lane.context),
    lines: lane.lines.slice(-250),
  }));
  return state;
}

export function appendEvent(type: string, payload: unknown) {
  ensureDir(ROOT);
  fs.appendFileSync(path.join(ROOT, 'events.jsonl'), JSON.stringify({ at: new Date().toISOString(), type, payload }) + '\n');
}

export function appendTranscript(entry: TranscriptEntry) {
  const dir = path.join(ROOT, 'lanes', `lane-${String(entry.laneId).padStart(3, '0')}`);
  ensureDir(dir);
  fs.appendFileSync(path.join(dir, 'transcript.jsonl'), JSON.stringify(entry) + '\n');
}

export function loadRecentTranscript(laneId: number, limit = 80): TranscriptEntry[] {
  const file = path.join(ROOT, 'lanes', `lane-${String(laneId).padStart(3, '0')}`, 'transcript.jsonl');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  const out: TranscriptEntry[] = [];
  for (const line of lines.slice(-limit)) {
    try { out.push(JSON.parse(line) as TranscriptEntry); } catch { /* preserve forward progress around one corrupt line */ }
  }
  return out;
}

export function saveWorkspace(state: WorkspaceState) {
  writeJsonAtomic(WORKSPACE, state);
  for (const lane of state.lanes) {
    lane.lines = lane.lines.slice(-250);
    const dir = path.join(ROOT, 'lanes', `lane-${String(lane.id).padStart(3, '0')}`);
    writeJsonAtomic(path.join(dir, 'contract.json'), lane.contract);
    writeJsonAtomic(path.join(dir, 'baton.json'), lane.baton);
    writeJsonAtomic(path.join(dir, 'lease.json'), lane.lease);
    writeJsonAtomic(path.join(dir, 'context.json'), lane.context);
  }
}

export function loadWorkspace(fallback: WorkspaceState): WorkspaceState {
  if (!fs.existsSync(WORKSPACE)) { saveWorkspace(fallback); return fallback; }
  return normalizeWorkspace(JSON.parse(fs.readFileSync(WORKSPACE, 'utf8')) as WorkspaceState);
}

export function checkpoint(state: WorkspaceState, reason: string) {
  const id = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const dir = path.join(ROOT, 'checkpoints', id);
  ensureDir(dir);
  writeJsonAtomic(path.join(dir, 'workspace.json'), state);
  appendEvent('checkpoint', { id, reason });
  state.lastRestorePoint = id;
  saveWorkspace(state);
  return id;
}

export function batonHealth(baton: Baton) {
  const age = Date.now() - Date.parse(baton.updatedAt);
  if (age < 30_000) return { icon: '●', label: 'CURRENT', age };
  if (age < 120_000) return { icon: '●', label: 'AGING', age };
  return { icon: '●', label: 'STALE', age };
}

export function touchBaton(lane: LaneState, patch: Partial<Baton>) {
  lane.baton = { ...lane.baton, ...patch, revision: lane.baton.revision + 1, updatedAt: new Date().toISOString() };
  appendEvent('baton.updated', { laneId: lane.id, revision: lane.baton.revision });
}
