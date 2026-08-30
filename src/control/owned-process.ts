import {spawn, type ChildProcess} from 'node:child_process';

export interface OwnedProcessRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  maxOutputBytes?: number;
}

export interface OwnedProcessResult {
  pid: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface OwnedExecution {
  runProcess(request: OwnedProcessRequest, signal?: AbortSignal): Promise<OwnedProcessResult>;
  terminateAll(reason?: string): Promise<void>;
  activePids(): number[];
}

interface TrackedProcess {
  child: ChildProcess;
  completed: Promise<void>;
}

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

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

async function terminateWindowsTree(pid: number) {
  await new Promise<void>(resolve => {
    const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
    killer.once('error', () => resolve());
    killer.once('exit', () => resolve());
  });
}

function linuxGroupAlive(pid: number) {
  try { process.kill(-pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
}

async function terminateLinuxTree(pid: number) {
  try { process.kill(-pid, 'SIGTERM'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
  await delay(200);
  if (!linuxGroupAlive(pid)) return;
  try { process.kill(-pid, 'SIGKILL'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
}

export class OwnedProcessManager implements OwnedExecution {
  private readonly processes = new Map<number, TrackedProcess>();

  activePids() { return [...this.processes.keys()]; }

  async runProcess(request: OwnedProcessRequest, signal?: AbortSignal): Promise<OwnedProcessResult> {
    if (signal?.aborted) throw abortError(signal);
    const maximum = request.maxOutputBytes ?? 1024 * 1024;
    const stdout: Buffer[] = [], stderr: Buffer[] = [], stdoutSize = {bytes: 0}, stderrSize = {bytes: 0};
    const child = spawn(request.command, request.args ?? [], {
      cwd: request.cwd,
      env: request.env,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (!child.pid) throw new Error('owned_process_pid_unavailable');
    const pid = child.pid;
    child.stdout?.on('data', (chunk: Buffer) => appendBounded(stdout, chunk, stdoutSize, maximum));
    child.stderr?.on('data', (chunk: Buffer) => appendBounded(stderr, chunk, stderrSize, maximum));
    if (request.input !== undefined) child.stdin?.end(request.input);
    else child.stdin?.end();

    let complete!: () => void;
    const completed = new Promise<void>(resolve => { complete = resolve; });
    this.processes.set(pid, {child, completed});
    const onAbort = () => { void this.terminate(pid); };
    signal?.addEventListener('abort', onAbort, {once: true});
    try {
      return await new Promise<OwnedProcessResult>((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (exitCode, childSignal) => {
          if (signal?.aborted) { reject(abortError(signal)); return; }
          resolve({pid, exitCode, signal: childSignal, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8')});
        });
      });
    } finally {
      signal?.removeEventListener('abort', onAbort);
      this.processes.delete(pid);
      complete();
    }
  }

  async terminateAll(_reason = 'owned_execution_terminated') {
    await Promise.all(this.activePids().map(pid => this.terminate(pid)));
  }

  private async terminate(pid: number) {
    const tracked = this.processes.get(pid);
    if (!tracked) return;
    if (process.platform === 'win32') await terminateWindowsTree(pid);
    else await terminateLinuxTree(pid);
    await Promise.race([tracked.completed, delay(2_000)]);
  }
}
