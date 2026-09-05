import assert from 'node:assert/strict';
import test from 'node:test';
import type {ChildProcess} from 'node:child_process';
import {OwnedProcessManager, type OwnedProcessIdentity, type ProcessTerminationAdapter} from './owned-process.js';

class FixtureTerminationAdapter implements ProcessTerminationAdapter {
  readonly platform = 'win32' as const;
  constructor(private readonly outcome: 'confirmed' | 'uncertain' | 'identity-mismatch' | 'failed') {}
  async capture(pid: number): Promise<OwnedProcessIdentity> { return {pid, platform: this.platform, startedAtToken: 'fixture-creation-time', capturedAt: new Date().toISOString()}; }
  async terminate(identity: OwnedProcessIdentity, child: ChildProcess, reason: string) {
    child.kill('SIGKILL');
    return {identity, outcome: this.outcome, reason, signals: ['fixture-tree-kill'], requestedAt: new Date().toISOString(), verifiedAt: new Date().toISOString(), detail: this.outcome === 'confirmed' ? 'captured_tree_absent' : 'captured_tree_not_proven'};
  }
}

class DelayedCaptureTerminationAdapter implements ProcessTerminationAdapter {
  readonly platform = 'win32' as const;
  readonly captureStarted: Promise<void>;
  terminated = false;
  private markCaptureStarted!: () => void;
  private releaseCapture!: () => void;
  private readonly captureGate: Promise<void>;
  constructor() {
    this.captureStarted = new Promise(resolve => { this.markCaptureStarted = resolve; });
    this.captureGate = new Promise(resolve => { this.releaseCapture = resolve; });
  }
  finishCapture() { this.releaseCapture(); }
  async capture(pid: number): Promise<OwnedProcessIdentity> { this.markCaptureStarted(); await this.captureGate; return {pid, platform: this.platform, startedAtToken: 'fixture-delayed-creation-time', capturedAt: new Date().toISOString()}; }
  async terminate(identity: OwnedProcessIdentity, child: ChildProcess, reason: string) {
    this.terminated = true; child.kill('SIGKILL');
    return {identity, outcome: 'confirmed' as const, reason, signals: ['fixture-tree-kill'], requestedAt: new Date().toISOString(), verifiedAt: new Date().toISOString(), detail: 'captured_tree_absent'};
  }
}

test('platform termination adapter reports confirmed tree cleanup without requiring Windows', async () => {
  const manager = new OwnedProcessManager(new FixtureTerminationAdapter('confirmed')), controller = new AbortController();
  const running = manager.runProcess({command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)']}, controller.signal);
  while (!manager.activePids().length) await new Promise(resolve => setImmediate(resolve));
  controller.abort('fixture_timeout'); const report = await manager.terminateAll('fixture_timeout');
  assert.equal(report.outcome, 'confirmed'); assert.equal(report.processes[0].identity.platform, 'win32'); assert.equal(report.processes[0].signals[0], 'fixture-tree-kill');
  await assert.rejects(running, /fixture_timeout/);
});

test('cleanup uncertainty and PID identity mismatch remain explicit', async () => {
  for (const outcome of ['uncertain', 'identity-mismatch'] as const) {
    const manager = new OwnedProcessManager(new FixtureTerminationAdapter(outcome)), controller = new AbortController();
    const running = manager.runProcess({command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)']}, controller.signal);
    while (!manager.activePids().length) await new Promise(resolve => setImmediate(resolve));
    controller.abort(`fixture_${outcome}`); const report = await manager.terminateAll(`fixture_${outcome}`);
    assert.equal(report.outcome, outcome); assert.match(report.processes[0].detail ?? '', /not_proven/);
    await assert.rejects(running);
  }
});

test('cancellation during asynchronous process identity capture remains handled and cleans up', async () => {
  const adapter = new DelayedCaptureTerminationAdapter(), manager = new OwnedProcessManager(adapter), controller = new AbortController();
  const running = manager.runProcess({command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)']}, controller.signal);
  await adapter.captureStarted; controller.abort('cancelled_during_identity_capture'); adapter.finishCapture();
  await assert.rejects(running, /cancelled_during_identity_capture/);
  assert.equal(adapter.terminated, true); assert.deepEqual(manager.activePids(), []);
});
