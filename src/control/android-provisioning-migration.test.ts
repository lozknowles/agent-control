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
  runAndroidProvisioning,
} from './android-provisioning-runtime.js';

test('legacy terminal privilege failure migrates and resumes the blocked mission', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-migrate-'));
  try {
    let queue = new WorkQueue();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    ensureAndroidProvisioningMission(queue);
    const detect = queue.get('android.pixel.provision.detect-adb')!;
    detect.status = 'completed';
    detect.resultRef = 'adb-missing';
    const install = queue.get(PIXEL_INSTALL_WORK_ID)!;
    install.status = 'failed';
    install.attempts = 2;
    install.outcomes = [
      {
        at: new Date().toISOString(),
        attempt: 2,
        error: 'Command failed: sudo -n -v\nsudo: a password is required\n',
      },
    ];
    for (const item of queue.all()) {
      if (item.dependsOn.length) item.status = 'blocked';
    }
    store.save(queue);
    queue = store.load();
    let present = false;
    const operations = qualifiedProvisioningOperations({
      detectAdbTool: async () => present,
      installPackage: async () => {
        present = true;
        return { installed: true };
      },
    });
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations,
      approveInstall: true,
      maxSteps: 10,
    });
    assert.equal(present, true);
    assert.equal(queue.get(PIXEL_INSTALL_WORK_ID)?.status, 'completed');
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.status, 'human-review');
    assert.equal(queue.get('android.pixel.provision.qualify-adb')?.status, 'blocked');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
