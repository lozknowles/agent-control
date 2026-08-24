import {spawnSync, type SpawnSyncReturns} from 'node:child_process';
import type {ResourceConfig} from './config.js';
import {expandUserPath} from './config.js';
import {Trace} from './telemetry.js';

export type AndroidLifecycle = 'unconfigured' | 'offline' | 'transport-ready' | 'node-degraded' | 'node-ready' | 'endpoint-ready' | 'capability-ready' | 'recovery-failed';
export interface AndroidRecoveryState {resourceId: string; state: AndroidLifecycle; detail: string; recovered: boolean;}
export type AndroidExec = (command: string, args: string[], timeout: number) => SpawnSyncReturns<string>;
const defaultExec: AndroidExec = (command, args, timeout) => spawnSync(command, args, {encoding: 'utf8', timeout});
const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export class AndroidRecovery {
  constructor(readonly resource: ResourceConfig, readonly token: string, readonly autoRecover: boolean, readonly trace = new Trace(), readonly exec: AndroidExec = defaultExec, readonly wait: (ms: number) => unknown = sleep) {}

  private run(command: string, args: string[], timeout = 10000) { return this.exec(command, args, timeout); }
  private ssh(command: string) {
    const transport = this.resource.transport;
    if (transport.type !== 'ssh' || !transport.host) return {status: 2} as SpawnSyncReturns<string>;
    const args = ['-o', 'PasswordAuthentication=no', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8'];
    if (transport.identityFile) args.push('-i', expandUserPath(transport.identityFile) ?? transport.identityFile);
    if (transport.port) args.push('-p', String(transport.port));
    args.push(`${transport.user ? `${transport.user}@` : ''}${transport.host}`, command);
    return this.run('ssh', args, 12000);
  }
  private localHealth() {
    const url = this.resource.android?.localHealthUrl ?? this.resource.healthUrl;
    return url ? this.run('curl', ['-fsS', '--max-time', '3', url], 5000) : ({status: 2} as SpawnSyncReturns<string>);
  }
  private remoteHealth() {
    const url = this.resource.android?.remoteHealthUrl;
    return url ? this.ssh(`curl -fsS --max-time 3 ${JSON.stringify(url)}`) : ({status: 2} as SpawnSyncReturns<string>);
  }
  private state(state: AndroidLifecycle, detail: string, recovered = false): AndroidRecoveryState {
    return {resourceId: this.resource.id, state, detail, recovered};
  }
  probe(): AndroidRecoveryState {
    if (this.resource.platform !== 'android' || !this.resource.android) return this.state('unconfigured', 'Android recovery is not configured');
    if (this.localHealth().status === 0) return this.state('endpoint-ready', 'configured Android endpoint is healthy');
    if (this.resource.transport.type !== 'ssh') return this.state('unconfigured', `recovery does not implement transport ${this.resource.transport.type}`);
    if (this.ssh('echo AGENT-CONTROL-TRANSPORT-READY').status !== 0) return this.state('offline', 'configured SSH transport is unavailable');
    if (this.remoteHealth().status !== 0) return this.state('node-degraded', 'SSH is ready; configured Android node is unavailable');
    return this.state('node-ready', 'Android node is healthy; configured local endpoint is unavailable');
  }
  recover(): AndroidRecoveryState {
    const span = this.trace.span('resource.android.recovery', {resource: this.resource.id}), probe = this.probe();
    span.event('probe', {state: probe.state, detail: probe.detail});
    if (probe.state === 'endpoint-ready') { span.end(true, {state: probe.state, action: 'none'}); return probe; }
    if (!this.autoRecover) { span.end(false, {state: probe.state, action: 'manual-required'}); return probe; }
    if (probe.state === 'node-ready') { span.end(true, {state: probe.state, action: 'external-endpoint-required'}); return probe; }
    if (probe.state !== 'node-degraded') { span.end(false, {state: probe.state, action: 'no-allow-listed-repair'}); return probe; }
    const android = this.resource.android;
    if (!android?.remoteDirectory || !android.startCommand || !this.token) {
      const result = this.state('recovery-failed', 'remote directory, start command or credential is unavailable');
      span.end(false, {state: result.state, action: 'configuration-required'});
      return result;
    }
    const token64 = Buffer.from(this.token, 'utf8').toString('base64');
    const remoteDir = android.remoteDirectory.replace(/^~\//, '$HOME/');
    const command = `cd ${JSON.stringify(remoteDir)} && export AGENT_CONTROL_NODE_TOKEN=$(printf %s ${JSON.stringify(token64)} | base64 -d) && (${android.startCommand})`;
    const started = this.ssh(command);
    span.event('node-start', {sshOk: started.status === 0, method: 'configured-command'});
    for (let attempt = 0; attempt < 30; attempt++) {
      this.wait(500);
      const remote = this.remoteHealth().status === 0, local = this.localHealth().status === 0;
      span.event('readiness', {attempt: attempt + 1, remote, local});
      if (local) { span.end(true, {state: 'capability-ready', attempt: attempt + 1}); return this.state('capability-ready', 'Android resource recovered and endpoint validated', true); }
      if (remote && attempt >= 5) { span.end(true, {state: 'node-ready', attempt: attempt + 1}); return this.state('node-ready', 'Android node recovered; endpoint transport remains external', true); }
    }
    span.end(false, {state: 'recovery-failed', sshStatus: started.status});
    return this.state('recovery-failed', 'Android node unavailable after configured recovery command');
  }
}
