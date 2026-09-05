import {spawn, type ChildProcess} from 'node:child_process';
import fs from 'node:fs';

export interface OwnedProcessRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  maxOutputBytes?: number;
  onStdoutLine?: (line: string) => void;
}

export interface OwnedProcessResult {
  pid: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export type CleanupOutcome = 'confirmed' | 'uncertain' | 'identity-mismatch' | 'failed';
export interface OwnedProcessIdentity {
  pid: number;
  platform: NodeJS.Platform;
  startedAtToken: string | null;
  capturedAt: string;
}
export interface ProcessCleanupResult {
  identity: OwnedProcessIdentity;
  outcome: CleanupOutcome;
  reason: string;
  signals: string[];
  requestedAt: string;
  verifiedAt: string;
  detail?: string;
}
export interface ExecutionCleanupReport {
  outcome: CleanupOutcome;
  reason: string;
  requestedAt: string;
  completedAt: string;
  processes: ProcessCleanupResult[];
}

export interface OwnedExecution {
  runProcess(request: OwnedProcessRequest, signal?: AbortSignal): Promise<OwnedProcessResult>;
  terminateAll(reason?: string): Promise<ExecutionCleanupReport>;
  activePids(): number[];
}

export interface ProcessTerminationAdapter {
  readonly platform: NodeJS.Platform;
  capture(pid: number): Promise<OwnedProcessIdentity>;
  terminate(identity: OwnedProcessIdentity, child: ChildProcess, reason: string): Promise<ProcessCleanupResult>;
}

interface TrackedProcess {
  child: ChildProcess;
  identity: OwnedProcessIdentity;
  completed: Promise<void>;
  termination?: Promise<ProcessCleanupResult>;
}

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const timestamp = () => new Date().toISOString();

function appendBounded(chunks: Buffer[], chunk: Buffer, current: {bytes: number}, maximum: number) {
  if (current.bytes >= maximum) return;
  const accepted = chunk.subarray(0, maximum - current.bytes);
  chunks.push(accepted);
  current.bytes += accepted.length;
}

function abortError(signal: AbortSignal) {
  const reason = signal.reason;
  if (reason instanceof Error) return reason;
  const error = new Error(typeof reason === 'string' ? reason : 'owned_process_aborted');
  error.name = 'AbortError';
  return error;
}

function readLinuxStat(pid: number) {
  try {
    const value = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'), close = value.lastIndexOf(')');
    if (close < 0) return undefined;
    const fields = value.slice(close + 2).trim().split(/\s+/);
    const processGroup = Number(fields[2]), startedAtToken = fields[19];
    if (!Number.isSafeInteger(processGroup) || !startedAtToken) return undefined;
    return {processGroup, startedAtToken};
  } catch { return undefined; }
}

function linuxGroupAlive(pid: number) {
  try { process.kill(-pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
}

async function waitUntil(predicate: () => boolean, timeoutMs: number, intervalMs = 25) {
  const deadline = Date.now() + timeoutMs;
  do { if (predicate()) return true; await delay(intervalMs); } while (Date.now() < deadline);
  return predicate();
}

function signalLinuxGroup(pid: number, signal: NodeJS.Signals) {
  try { process.kill(-pid, signal); return 'sent' as const; }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return 'absent' as const;
    if (code === 'EPERM') return 'forbidden' as const;
    throw error;
  }
}

class LinuxTerminationAdapter implements ProcessTerminationAdapter {
  readonly platform = 'linux' as const;
  async capture(pid: number): Promise<OwnedProcessIdentity> { return {pid, platform: this.platform, startedAtToken: readLinuxStat(pid)?.startedAtToken ?? null, capturedAt: timestamp()}; }
  async terminate(identity: OwnedProcessIdentity, child: ChildProcess, reason: string): Promise<ProcessCleanupResult> {
    const requestedAt = timestamp(), signals: string[] = [], current = readLinuxStat(identity.pid);
    if (current && identity.startedAtToken && current.startedAtToken !== identity.startedAtToken) return {identity, outcome: 'identity-mismatch', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'leader_pid_reused_before_signal'};
    if (!current && !linuxGroupAlive(identity.pid)) return {identity, outcome: 'confirmed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'process_group_already_absent'};
    if (!current && child.exitCode !== null) return {identity, outcome: 'uncertain', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'leader_exited_before_descendant_identity_could_be_proven'};
    const term = signalLinuxGroup(identity.pid, 'SIGTERM'); signals.push(`SIGTERM:${term}`);
    if (term === 'forbidden') return {identity, outcome: 'failed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'signal_permission_denied'};
    if (await waitUntil(() => !linuxGroupAlive(identity.pid), 500)) return {identity, outcome: 'confirmed', reason, signals, requestedAt, verifiedAt: timestamp()};
    const afterTerm = readLinuxStat(identity.pid);
    if (afterTerm && identity.startedAtToken && afterTerm.startedAtToken !== identity.startedAtToken) return {identity, outcome: 'identity-mismatch', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'leader_pid_reused_before_forced_signal'};
    const kill = signalLinuxGroup(identity.pid, 'SIGKILL'); signals.push(`SIGKILL:${kill}`);
    if (kill === 'forbidden') return {identity, outcome: 'failed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'forced_signal_permission_denied'};
    const absent = await waitUntil(() => !linuxGroupAlive(identity.pid), 2_000);
    return {identity, outcome: absent ? 'confirmed' : 'uncertain', reason, signals, requestedAt, verifiedAt: timestamp(), ...(absent ? {} : {detail: 'process_group_still_present_after_forced_signal'})};
  }
}

interface WindowsProcessIdentity {pid: number; startedAtToken: string; parentPid: number;}

function runWindowsInventory(rootPid: number): Promise<WindowsProcessIdentity[]> {
  const source = [
    "$ErrorActionPreference = 'Stop'",
    '$root = [int]$env:AGENT_CONTROL_OWNED_PID',
    '$rows = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CreationDate)',
    '$wanted = [System.Collections.Generic.HashSet[int]]::new(); [void]$wanted.Add($root)',
    'do { $changed = $false; foreach ($row in $rows) { if ($wanted.Contains([int]$row.ParentProcessId) -and $wanted.Add([int]$row.ProcessId)) { $changed = $true } } } while ($changed)',
    '$result = @($rows | Where-Object { $wanted.Contains([int]$_.ProcessId) } | ForEach-Object { [ordered]@{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; startedAtToken = [string]$_.CreationDate } })',
    '[Console]::Out.Write(($result | ConvertTo-Json -Compress))',
  ].join('\n');
  return new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {env: {...process.env, AGENT_CONTROL_OWNED_PID: String(rootPid)}, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore']});
    let output = '', settled = false;
    const finish = (value: WindowsProcessIdentity[]) => { if (settled) return; settled = true; resolve(value); };
    const timer = setTimeout(() => { child.kill(); finish([]); }, 2_000);
    child.stdout?.on('data', chunk => { if (output.length < 256 * 1024) output += chunk; });
    child.once('error', () => { clearTimeout(timer); finish([]); });
    child.once('close', code => { clearTimeout(timer); if (code !== 0) { finish([]); return; } try { const parsed = JSON.parse(output || '[]'); finish((Array.isArray(parsed) ? parsed : [parsed]).filter(item => Number.isSafeInteger(item?.pid) && typeof item?.startedAtToken === 'string')); } catch { finish([]); } });
    child.stdin?.end(source);
  });
}

function taskkillTree(pid: number): Promise<number | null> {
  return new Promise(resolve => {
    const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
    child.once('error', () => resolve(null));
    child.once('exit', code => resolve(code));
  });
}

class WindowsTerminationAdapter implements ProcessTerminationAdapter {
  readonly platform = 'win32' as const;
  async capture(pid: number): Promise<OwnedProcessIdentity> { const root = (await runWindowsInventory(pid)).find(item => item.pid === pid); return {pid, platform: this.platform, startedAtToken: root?.startedAtToken ?? null, capturedAt: timestamp()}; }
  async terminate(identity: OwnedProcessIdentity, _child: ChildProcess, reason: string): Promise<ProcessCleanupResult> {
    const requestedAt = timestamp(), before = await runWindowsInventory(identity.pid), root = before.find(item => item.pid === identity.pid), signals: string[] = [];
    if (root && identity.startedAtToken && root.startedAtToken !== identity.startedAtToken) return {identity, outcome: 'identity-mismatch', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'leader_pid_reused_before_taskkill'};
    if (!root && before.length === 0) return {identity, outcome: 'confirmed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'process_tree_already_absent'};
    if (!root || !identity.startedAtToken) return {identity, outcome: 'uncertain', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'windows_process_identity_unavailable'};
    const code = await taskkillTree(identity.pid); signals.push(`taskkill-tree:${code === null ? 'spawn-failed' : code}`);
    const captured = new Map(before.map(item => [item.pid, item.startedAtToken]));
    const gone = await (async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const after = await runWindowsInventory(identity.pid);
        if (!after.some(item => captured.get(item.pid) === item.startedAtToken)) return true;
        await delay(50);
      }
      return false;
    })();
    if (gone) return {identity, outcome: 'confirmed', reason, signals, requestedAt, verifiedAt: timestamp()};
    return {identity, outcome: code === 0 ? 'uncertain' : 'failed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: code === 0 ? 'captured_process_tree_still_present' : 'taskkill_failed'};
  }
}

class PortableTerminationAdapter implements ProcessTerminationAdapter {
  readonly platform = process.platform;
  async capture(pid: number): Promise<OwnedProcessIdentity> { return {pid, platform: this.platform, startedAtToken: null, capturedAt: timestamp()}; }
  async terminate(identity: OwnedProcessIdentity, child: ChildProcess, reason: string): Promise<ProcessCleanupResult> {
    const requestedAt = timestamp(), signals: string[] = [];
    if (child.exitCode !== null) return {identity, outcome: 'confirmed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: 'leader_already_absent_descendants_not_supported'};
    const sent = child.kill('SIGTERM'); signals.push(`SIGTERM:${sent ? 'sent' : 'not-sent'}`);
    const exited = await waitUntil(() => child.exitCode !== null || child.signalCode !== null, 2_000);
    return {identity, outcome: exited ? 'uncertain' : 'failed', reason, signals, requestedAt, verifiedAt: timestamp(), detail: exited ? 'leader_exited_descendant_verification_unsupported' : 'leader_did_not_exit'};
  }
}

export function defaultProcessTerminationAdapter(): ProcessTerminationAdapter {
  return process.platform === 'linux' ? new LinuxTerminationAdapter() : process.platform === 'win32' ? new WindowsTerminationAdapter() : new PortableTerminationAdapter();
}

const cleanupRank: Record<CleanupOutcome, number> = {confirmed: 0, uncertain: 1, 'identity-mismatch': 2, failed: 3};

export class OwnedProcessManager implements OwnedExecution {
  private readonly processes = new Map<number, TrackedProcess>();
  private readonly completedCleanup = new Map<number, ProcessCleanupResult>();
  constructor(private readonly termination: ProcessTerminationAdapter = defaultProcessTerminationAdapter()) {}

  activePids() { return [...this.processes.keys()]; }

  async runProcess(request: OwnedProcessRequest, signal?: AbortSignal): Promise<OwnedProcessResult> {
    if (signal?.aborted) throw abortError(signal);
    const maximum = request.maxOutputBytes ?? 1024 * 1024;
    const stdout: Buffer[] = [], stderr: Buffer[] = [], stdoutSize = {bytes: 0}, stderrSize = {bytes: 0}; let stdoutRemainder = '';
    const child = spawn(request.command, request.args ?? [], {
      cwd: request.cwd,
      env: request.env,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (!child.pid) throw new Error('owned_process_pid_unavailable');
    const pid = child.pid;
    child.stdout?.on('data', (chunk: Buffer) => { appendBounded(stdout, chunk, stdoutSize, maximum); if (request.onStdoutLine) { stdoutRemainder += chunk.toString('utf8'); const lines = stdoutRemainder.split(/\r?\n/); stdoutRemainder = lines.pop() ?? ''; for (const line of lines) if (line) request.onStdoutLine(line); } });
    child.stderr?.on('data', (chunk: Buffer) => appendBounded(stderr, chunk, stderrSize, maximum));
    if (request.input !== undefined) child.stdin?.end(request.input);
    else child.stdin?.end();

    let complete!: () => void;
    const completed = new Promise<void>(resolve => { complete = resolve; });
    const result = new Promise<OwnedProcessResult>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (exitCode, childSignal) => {
        if (stdoutRemainder) request.onStdoutLine?.(stdoutRemainder);
        complete();
        if (signal?.aborted) { reject(abortError(signal)); return; }
        resolve({pid, exitCode, signal: childSignal, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8')});
      });
    });
    const identity = await this.termination.capture(pid);
    const tracked: TrackedProcess = {child, identity, completed};
    this.processes.set(pid, tracked);
    const onAbort = () => { void this.terminate(pid, typeof signal?.reason === 'string' ? signal.reason : 'owned_process_aborted'); };
    signal?.addEventListener('abort', onAbort, {once: true});
    try {
      if (signal?.aborted) { await this.terminate(pid, typeof signal.reason === 'string' ? signal.reason : 'owned_process_aborted'); throw abortError(signal); }
      return await result;
    } finally {
      signal?.removeEventListener('abort', onAbort);
      if (tracked.termination) await tracked.termination;
      this.processes.delete(pid);
    }
  }

  async terminateAll(reason = 'owned_execution_terminated'): Promise<ExecutionCleanupReport> {
    const requestedAt = timestamp(), active = this.activePids();
    const results = await Promise.all(active.map(pid => this.terminate(pid, reason)));
    const processes = results.length ? results : [...this.completedCleanup.values()];
    const outcome = processes.reduce<CleanupOutcome>((worst, result) => cleanupRank[result.outcome] > cleanupRank[worst] ? result.outcome : worst, 'confirmed');
    return {outcome, reason, requestedAt, completedAt: timestamp(), processes: processes.map(item => structuredClone(item))};
  }

  private async terminate(pid: number, reason: string) {
    const tracked = this.processes.get(pid);
    if (!tracked) {
      const completed = this.completedCleanup.get(pid);
      if (completed) return completed;
      const at = timestamp(), identity = {pid, platform: this.termination.platform, startedAtToken: null, capturedAt: at};
      return {identity, outcome: 'uncertain', reason, signals: [], requestedAt: at, verifiedAt: at, detail: 'process_not_tracked'} satisfies ProcessCleanupResult;
    }
    tracked.termination ??= this.termination.terminate(tracked.identity, tracked.child, reason).then(result => { this.completedCleanup.set(pid, result); return result; });
    const result = await tracked.termination;
    await Promise.race([tracked.completed, delay(2_000)]);
    return result;
  }
}
