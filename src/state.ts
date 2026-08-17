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

export interface LaneState {
  id: number;
  name: string;
  status: LaneStatus;
  model: string;
  reasoning: string;
  context: string;
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

function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeJsonAtomic(file: string, value: unknown) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

export function appendEvent(type: string, payload: unknown) {
  ensureDir(ROOT);
  fs.appendFileSync(path.join(ROOT, 'events.jsonl'), JSON.stringify({ at: new Date().toISOString(), type, payload }) + '\n');
}

export function saveWorkspace(state: WorkspaceState) {
  writeJsonAtomic(WORKSPACE, state);
  for (const lane of state.lanes) {
    const dir = path.join(ROOT, 'lanes', `lane-${String(lane.id).padStart(3, '0')}`);
    writeJsonAtomic(path.join(dir, 'contract.json'), lane.contract);
    writeJsonAtomic(path.join(dir, 'baton.json'), lane.baton);
    writeJsonAtomic(path.join(dir, 'lease.json'), lane.lease);
  }
}

export function loadWorkspace(fallback: WorkspaceState): WorkspaceState {
  if (!fs.existsSync(WORKSPACE)) { saveWorkspace(fallback); return fallback; }
  return JSON.parse(fs.readFileSync(WORKSPACE, 'utf8')) as WorkspaceState;
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
