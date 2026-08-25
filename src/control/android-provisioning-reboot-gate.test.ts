import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkQueue } from './work-queue.js';
import { WorkQueueStore } from './work-queue-store.js';
import { qualifiedProvisioningOperations } from './android-provisioning-test-helpers.js';
import {
  ensureAndroidProvisioningMission,
  PIXEL_REBOOT_RECOVERY_WORK_ID,
  runAndroidProvisioning,
} from './android-provisioning-runtime.js';

function ready() {
  const queue = new WorkQueue();
  ensureAndroidProvisioningMission(queue);
  for (const item of queue.all()) {
    if (item.id !== PIXEL_REBOOT_RECOVERY_WORK_ID) item.status = 'completed';
  }
  queue.reconcileDependencies();
  return queue;
}

function pendingApproval(queue: WorkQueue) {
  return (
    queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.data?.rebootApproval as
      | { state?: string }
      | undefined
  )?.state;
}

test('one-shot reboot approval persists even before the dependency graph reaches reboot', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-early-approval-'));
  try {
    const queue = new WorkQueue();
    ensureAndroidProvisioningMission(queue);
    await runAndroidProvisioning({
      queue,
      store: new WorkQueueStore(path.join(directory, 'queue.json')),
      ops: qualifiedProvisioningOperations(),
      approveRebootTest: true,
      maxSteps: 1,
    });
    assert.equal(pendingApproval(queue), 'pending');
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.attempts, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ready reboot qualification pauses without executing until explicitly approved', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-gate-'));
  try {
    const queue = ready();
    let rebootCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifyRebootRecovery: async () => {
        rebootCalls += 1;
        return {
          qualified: true,
          rebootInitiated: true,
          phase: 'qualified',
          detail: 'ssh:returned-after-reboot',
        };
      },
    });
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    await runAndroidProvisioning({ queue, store, ops: operations, maxSteps: 1 });
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.status, 'human-review');
    assert.equal(rebootCalls, 0);
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations,
      approveRebootTest: true,
      maxSteps: 1,
    });
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.status, 'completed');
    assert.equal(rebootCalls, 1);
    assert.equal(pendingApproval(queue), 'consumed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('approved reboot waits for ADB without consuming an attempt and resumes automatically', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-adb-wait-'));
  try {
    let queue = ready();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    let adbReady = false;
    let rebootCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifyAdb: async () => ({
        qualified: adbReady,
        detail: adbReady ? 'adb:device-ready' : 'adb:no-devices',
      }),
      qualifyRebootRecovery: async () => {
        rebootCalls += 1;
        return {
          qualified: true,
          rebootInitiated: true,
          phase: 'qualified',
          detail: 'ssh:returned-after-reboot',
        };
      },
    });
    const attemptsBefore = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!.attempts;
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations,
      approveRebootTest: true,
      maxSteps: 1,
    });
    const waiting = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
    assert.equal(waiting.status, 'human-review');
    assert.equal(waiting.resultRef?.startsWith('NEEDS TRANSPORT:'), true);
    assert.equal(waiting.attempts, attemptsBefore);
    assert.equal(pendingApproval(queue), 'pending');
    assert.equal(rebootCalls, 0);

    queue = store.load();
    assert.equal(pendingApproval(queue), 'pending');
    adbReady = true;
    await runAndroidProvisioning({ queue, store, ops: operations, maxSteps: 1 });
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.status, 'completed');
    assert.equal(rebootCalls, 1);
    assert.equal(pendingApproval(queue), 'consumed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('approved reboot waits for keyed SSH while retaining authority', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-ssh-wait-'));
  try {
    const queue = ready();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    let rebootCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifySsh: async () => ({
        qualified: false,
        detail: 'ssh:keyed-transport-unavailable',
      }),
      qualifyRebootRecovery: async () => {
        rebootCalls += 1;
        return {
          qualified: true,
          rebootInitiated: true,
          phase: 'qualified',
          detail: 'ssh:returned-after-reboot',
        };
      },
    });
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations,
      approveRebootTest: true,
      maxSteps: 1,
    });
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.status, 'human-review');
    assert.equal(queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)?.attempts, 0);
    assert.equal(pendingApproval(queue), 'pending');
    assert.equal(rebootCalls, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

for (const detail of [
  'adb:device-offline',
  'adb:device-unauthorized',
  'adb:multiple-devices',
]) {
  test(`approved reboot remains a non-consuming transport wait for ${detail}`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-adb-state-'));
    try {
      const queue = ready();
      let rebootCalls = 0;
      const operations = qualifiedProvisioningOperations({
        qualifyAdb: async () => ({ qualified: false, detail }),
        qualifyRebootRecovery: async () => {
          rebootCalls += 1;
          return {
            qualified: true,
            rebootInitiated: true,
            phase: 'qualified',
            detail: 'ssh:returned-after-reboot',
          };
        },
      });
      await runAndroidProvisioning({
        queue,
        store: new WorkQueueStore(path.join(directory, 'queue.json')),
        ops: operations,
        approveRebootTest: true,
        maxSteps: 1,
      });
      const reboot = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
      assert.equal(reboot.status, 'human-review');
      assert.equal(reboot.resultRef?.includes(detail), true);
      assert.equal(reboot.attempts, 0);
      assert.equal(pendingApproval(queue), 'pending');
      assert.equal(rebootCalls, 0);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('recorded adb reboot no-device failure migrates to approved transport wait without losing history', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-migrate-'));
  try {
    const queue = ready();
    const item = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
    const at = new Date().toISOString();
    item.status = 'failed';
    item.attempts = 3;
    item.outcomes = [
      {
        at,
        attempt: 3,
        error: 'Command failed: adb reboot\nerror: no devices/emulators found\n',
      },
    ];
    let rebootCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifyAdb: async () => ({ qualified: false, detail: 'adb:no-devices' }),
      qualifySsh: async () => ({
        qualified: false,
        detail: 'ssh:keyed-transport-unavailable',
      }),
      qualifyRebootRecovery: async () => {
        rebootCalls += 1;
        return {
          qualified: true,
          rebootInitiated: true,
          phase: 'qualified',
          detail: 'ssh:returned-after-reboot',
        };
      },
    });
    await runAndroidProvisioning({
      queue,
      store: new WorkQueueStore(path.join(directory, 'queue.json')),
      ops: operations,
      maxSteps: 1,
    });
    assert.equal(item.status, 'human-review');
    assert.equal(item.resultRef?.startsWith('NEEDS TRANSPORT:'), true);
    assert.equal(item.resultRef?.includes('NEEDS REBOOT APPROVAL'), false);
    assert.equal(item.attempts, 3);
    assert.equal(item.outcomes?.length, 1);
    assert.equal(item.outcomes?.[0]?.at, at);
    assert.equal(pendingApproval(queue), 'pending');
    assert.equal(rebootCalls, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('legacy post-reboot qualification failure requires fresh one-shot approval', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-post-failure-'));
  try {
    const queue = ready();
    const item = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
    item.status = 'failed';
    item.outcomes = [
      {
        at: new Date().toISOString(),
        attempt: 1,
        error: 'qualification_failed:android.unattended.recovery',
      },
    ];
    let rebootCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifyRebootRecovery: async () => {
        rebootCalls += 1;
        return {
          qualified: true,
          rebootInitiated: true,
          phase: 'qualified',
          detail: 'ssh:returned-after-reboot',
        };
      },
    });
    await runAndroidProvisioning({
      queue,
      store: new WorkQueueStore(path.join(directory, 'queue.json')),
      ops: operations,
      maxSteps: 1,
    });
    assert.equal(item.status, 'human-review');
    assert.equal(item.resultRef?.startsWith('NEEDS REBOOT APPROVAL'), true);
    assert.equal(rebootCalls, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('transport loss during final preflight does not consume approval or attempt', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'reboot-race-'));
  try {
    const queue = ready();
    const item = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
    let operationCalls = 0;
    const operations = qualifiedProvisioningOperations({
      qualifyRebootRecovery: async () => {
        operationCalls += 1;
        return {
          qualified: false,
          rebootInitiated: false,
          phase: 'transport-unavailable',
          detail: 'adb:transport-lost-before-reboot',
        };
      },
    });
    await runAndroidProvisioning({
      queue,
      store: new WorkQueueStore(path.join(directory, 'queue.json')),
      ops: operations,
      approveRebootTest: true,
      maxSteps: 1,
    });
    assert.equal(operationCalls, 1);
    assert.equal(item.status, 'human-review');
    assert.equal(item.resultRef?.startsWith('NEEDS TRANSPORT:'), true);
    assert.equal(item.attempts, 0);
    assert.equal(pendingApproval(queue), 'pending');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
