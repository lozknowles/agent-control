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
  PIXEL_INSTALL_TERMUX_BOOT_WORK_ID,
  runAndroidProvisioning,
} from './android-provisioning-runtime.js';

function operations(installed: boolean) {
  return qualifiedProvisioningOperations({
    installTermuxBoot: async () => {
      if (!installed) throw new Error('DEVICE INSTALL INCOMPLETE: test');
      return { installed: true };
    },
    verifyTermuxBootPackage: async () => ({ installed, signingSource: 'github' }),
  });
}

function installReady() {
  const queue = new WorkQueue();
  ensureAndroidProvisioningMission(queue);
  for (const id of [
    'detect-adb',
    'install-adb',
    'pairing-approval',
    'qualify-adb',
    'obtain-termux-boot',
    'verify-termux-boot',
  ]) {
    queue.get(`android.pixel.provision.${id}`)!.status = 'completed';
  }
  return queue;
}

test('persisted timed-out Termux Boot install resumes the same node', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-resume-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = installReady();
    const install = queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID)!;
    install.status = 'failed';
    install.attempts = 2;
    install.outcomes = [
      {
        at: new Date().toISOString(),
        attempt: 2,
        error: 'Command failed: adb install -r /tmp/termux-boot.apk',
      },
    ];
    queue.reconcileDependencies();
    await runAndroidProvisioning({ queue, store, ops: operations(true), maxSteps: 1 });
    assert.equal(queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID)?.status, 'completed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('incomplete Termux Boot install remains durable device review', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-review-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = installReady();
    await runAndroidProvisioning({ queue, store, ops: operations(false), maxSteps: 1 });
    assert.equal(queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID)?.status, 'human-review');
    assert.equal(
      queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID)?.resultRef?.startsWith(
        'NEEDS DEVICE INSTALL',
      ),
      true,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
