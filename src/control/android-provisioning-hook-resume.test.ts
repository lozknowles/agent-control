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
  PIXEL_INSTALL_BOOT_HOOK_WORK_ID,
  runAndroidProvisioning,
} from './android-provisioning-runtime.js';

function operations(installed: boolean) {
  return qualifiedProvisioningOperations({
    installBootHook: async () => ({ installed }),
    verifyBootHook: async () => ({ verified: installed }),
  });
}

function hookReady() {
  const queue = new WorkQueue();
  ensureAndroidProvisioningMission(queue);
  for (const id of [
    'detect-adb',
    'install-adb',
    'pairing-approval',
    'qualify-adb',
    'obtain-termux-boot',
    'verify-termux-boot',
    'install-termux-boot',
    'verify-termux-boot-package',
  ]) {
    queue.get(`android.pixel.provision.${id}`)!.status = 'completed';
  }
  return queue;
}

test('persisted boot hook failure resumes through the scoped installer', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-resume-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = hookReady();
    const install = queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID)!;
    install.status = 'failed';
    install.attempts = 1;
    install.outcomes = [
      {
        at: new Date().toISOString(),
        attempt: 1,
        error: 'boot_hook_install_failed',
      },
    ];
    queue.reconcileDependencies();
    await runAndroidProvisioning({ queue, store, ops: operations(true), maxSteps: 1 });
    assert.equal(queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID)?.status, 'completed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('incomplete boot hook remains durable review', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-review-'));
  try {
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const queue = hookReady();
    await runAndroidProvisioning({ queue, store, ops: operations(false), maxSteps: 1 });
    assert.equal(queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID)?.status, 'human-review');
    assert.equal(
      queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID)?.resultRef?.startsWith('NEEDS BOOT HOOK'),
      true,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
