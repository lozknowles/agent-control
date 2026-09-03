import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expandUserPath, type ResourceConfig} from './config.js';
import {parseManagedNodeProbe, type ManagedNodeObservation, type ManagedNodeRequest, type ManagedNodeResult, type ManagedNodeTransport} from './managed-node.js';

export interface SshExecutionResult {status: number; stdout: string; stderr: string; timedOut?: boolean; aborted?: boolean;}
export type SshExecutor = (command: string, args: string[], input: string, options: {timeoutMs: number; maxBytes: number; signal?: AbortSignal}) => Promise<SshExecutionResult>;

const MAX_BYTES = 4 * 1024 * 1024;

export const executeSsh: SshExecutor = (command, args, input, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false});
  const stdout: Buffer[] = [], stderr: Buffer[] = []; let bytes = 0, settled = false, timedOut = false, aborted = false;
  const stop = () => { if (!child.killed) child.kill('SIGTERM'); };
  const timer = setTimeout(() => { timedOut = true; stop(); }, options.timeoutMs);
  const onAbort = () => { aborted = true; stop(); };
  options.signal?.addEventListener('abort', onAbort, {once: true});
  const collect = (target: Buffer[]) => (chunk: Buffer) => { const value = Buffer.from(chunk); bytes += value.length; if (bytes > options.maxBytes) { stop(); return; } target.push(value); };
  child.stdout.on('data', collect(stdout)); child.stderr.on('data', collect(stderr));
  child.on('error', error => { if (settled) return; settled = true; clearTimeout(timer); options.signal?.removeEventListener('abort', onAbort); reject(error); });
  child.on('close', code => { if (settled) return; settled = true; clearTimeout(timer); options.signal?.removeEventListener('abort', onAbort); if (bytes > options.maxBytes) return reject(new Error('managed_node_response_too_large')); resolve({status: code ?? 255, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), timedOut, aborted}); });
  child.stdin.on('error', () => {}); child.stdin.end(input);
});

export function sshResourceArgs(resource: ResourceConfig, remote: string[]) {
  const transport = resource.transport, args = ['-T', '-o', 'BatchMode=yes', '-o', 'PasswordAuthentication=no', '-o', 'ClearAllForwardings=yes', '-o', 'ConnectTimeout=8'];
  if (transport.identityFile) args.push('-i', expandUserPath(transport.identityFile)!);
  if (transport.port && transport.port !== 22) args.push('-p', String(transport.port));
  args.push(`${transport.user ? `${transport.user}@` : ''}${transport.host}`, ...remote);
  return args;
}

function script(name: string) { return fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../scripts/${name}`), 'utf8'); }
function clip(value: string) { return value.replace(/\0/g, '').slice(0, MAX_BYTES); }

export class SshManagedNodeTransport implements ManagedNodeTransport {
  private readonly probeScript: string;
  private readonly actionScript: string;
  constructor(private readonly executor: SshExecutor = executeSsh, scripts: {probe?: string; action?: string} = {}) {
    this.probeScript = scripts.probe ?? script('managed-node-probe.sh');
    this.actionScript = scripts.action ?? script('managed-node-action.sh');
  }
  async probe(resource: ResourceConfig, at: string): Promise<ManagedNodeObservation> {
    const result = await this.executor('ssh', sshResourceArgs(resource, ['sh', '-s']), this.probeScript, {timeoutMs: 20_000, maxBytes: MAX_BYTES});
    if (result.timedOut) throw new Error('managed_node_probe_timeout');
    if (result.aborted) throw new Error('managed_node_probe_aborted');
    if (result.status !== 0) throw new Error(`managed_node_probe_failed:${clip(result.stderr).trim().split(/\r?\n/).at(-1) ?? result.status}`);
    return parseManagedNodeProbe(result.stdout, at);
  }
  async execute(resource: ResourceConfig, request: ManagedNodeRequest, signal?: AbortSignal): Promise<Omit<ManagedNodeResult, 'schema' | 'resourceId' | 'observedAt' | 'operation'>> {
    const target = request.target === undefined ? '__none__' : String(request.target), value = request.value === undefined ? '__none__' : String(request.value);
    const result = await this.executor('ssh', sshResourceArgs(resource, ['sh', '-s', '--', request.operation, target, value]), this.actionScript, {timeoutMs: 30 * 60_000, maxBytes: MAX_BYTES, signal});
    if (result.timedOut) throw new Error('managed_node_action_timeout');
    if (result.aborted) throw new Error('managed_node_action_cancelled');
    return {exitCode: result.status, stdout: clip(result.stdout), stderr: clip(result.stderr)};
  }
}
