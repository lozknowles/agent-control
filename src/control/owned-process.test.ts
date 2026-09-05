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
