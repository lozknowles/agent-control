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
  PIXEL_INSTALL_WORK_ID,
  PIXEL_PAIRING_WORK_ID,
  PIXEL_QUALIFY_ADB_WORK_ID,
  runAndroidProvisioning,
} from './android-provisioning-runtime.js';

function operations(qualified: boolean) {
  return qualifiedProvisioningOperations({
    qualifyAdb: async () => ({
      qualified,
      detail: qualified ? 'adb:device-ready' : 'adb:no-devices',
      ...(qualified ? { serial: 'pixel-test' } : {}),
    }),
  });
}

function qualifiedPrefix() {
  const queue = new WorkQueue();
  ensureAndroidProvisioningMission(queue);
  for (const id of [
    'android.pixel.provision.detect-adb',
    PIXEL_INSTALL_WORK_ID,
    PIXEL_PAIRING_WORK_ID,
  ]) {
    queue.get(id)!.status = 'completed';
  }
  return queue;
}

test('persisted ADB qualification failure resumes after fresh transport observation', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adb-resume-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = qualifiedPrefix();
    const qualify = queue.get(PIXEL_QUALIFY_ADB_WORK_ID)!;
    qualify.status = 'failed';
    qualify.attempts = 1;
    qualify.outcomes = [
      {
        at: new Date().toISOString(),
        attempt: 1,
        error: 'qualification_failed:transport.adb',
      },
    ];
    queue.reconcileDependencies();
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations(true),
      maxSteps: 1,
    });
    assert.equal(queue.get(PIXEL_QUALIFY_ADB_WORK_ID)?.status, 'completed');
    assert.equal(
      queue.get(PIXEL_QUALIFY_ADB_WORK_ID)?.resultRef,
      'qualified:transport.adb',
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('missing paired transport remains durable review without consuming an attempt', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'adb-review-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = qualifiedPrefix();
    const attemptsBefore = queue.get(PIXEL_QUALIFY_ADB_WORK_ID)!.attempts;
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations(false),
      maxSteps: 1,
    });
    assert.equal(queue.get(PIXEL_QUALIFY_ADB_WORK_ID)?.status, 'human-review');
    assert.equal(
      queue.get(PIXEL_QUALIFY_ADB_WORK_ID)?.resultRef?.startsWith('NEEDS TRANSPORT'),
      true,
    );
    assert.equal(queue.get(PIXEL_QUALIFY_ADB_WORK_ID)?.attempts, attemptsBefore);
    assert.equal(queue.get('android.pixel.provision.obtain-termux-boot')?.status, 'queued');
    assert.equal(
      queue.ready().some(item => item.id === 'android.pixel.provision.obtain-termux-boot'),
      false,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
