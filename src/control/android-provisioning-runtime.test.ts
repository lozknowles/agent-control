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

test('Pixel provisioning policy preserves queued demo work without dispatching it', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-scoped-'));
  try {
    const queue = new WorkQueue();
    queue.enqueue({
      id: 'demo:interactive-help',
      type: 'demo.interactive',
      class: 'interactive',
      status: 'queued',
      capabilities: { requires: [] },
      createdAt: new Date(0).toISOString(),
      batchable: false,
      preemptible: false,
      dependsOn: [],
      attempts: 0,
      maxAttempts: 3,
    });
    ensureAndroidProvisioningMission(queue);
    await runAndroidProvisioning({
      queue,
      store: new WorkQueueStore(path.join(directory, 'queue.json')),
      ops: qualifiedProvisioningOperations(),
      maxSteps: 1,
    });
    assert.equal(queue.get('demo:interactive-help')?.status, 'queued');
    assert.equal(queue.get('demo:interactive-help')?.attempts, 0);
    assert.equal(queue.get('android.pixel.provision.detect-adb')?.status, 'completed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('mission creation is idempotent and approval resumes the same queue', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-'));
  try {
    const queue = new WorkQueue();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    assert.equal(ensureAndroidProvisioningMission(queue), 11);
    assert.equal(ensureAndroidProvisioningMission(queue), 0);
    await runAndroidProvisioning({
      queue,
      store,
      ops: qualifiedProvisioningOperations(),
      maxSteps: 4,
    });
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.status, 'human-review');
    const before = queue.get(PIXEL_PAIRING_WORK_ID)?.createdAt;
    await runAndroidProvisioning({
      queue,
      store,
      ops: qualifiedProvisioningOperations(),
      approvePairing: true,
      maxSteps: 20,
    });
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.status, 'completed');
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.createdAt, before);
    assert.equal(queue.get('android.pixel.provision.qualify-adb')?.status, 'completed');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('missing privilege is durable human review and leaves dependents pending', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-priv-'));
  try {
    const queue = new WorkQueue();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    const operations = qualifiedProvisioningOperations({
      detectAdbTool: async () => false,
      installPackage: async () => {
        throw new Error('PRIVILEGE_UNAVAILABLE: helper unavailable');
      },
    });
    ensureAndroidProvisioningMission(queue);
    await runAndroidProvisioning({ queue, store, ops: operations, maxSteps: 10 });
    assert.equal(queue.get(PIXEL_INSTALL_WORK_ID)?.status, 'human-review');
    assert.equal(queue.get(PIXEL_INSTALL_WORK_ID)?.resultRef?.startsWith('NEEDS PRIVILEGE'), true);
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.status, 'queued');
    const restored = store.load();
    assert.equal(restored.get(PIXEL_INSTALL_WORK_ID)?.status, 'human-review');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('approved helper install is followed by fresh adb tool observation and pairing review', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-approve-'));
  try {
    const queue = new WorkQueue();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    let present = false;
    let installs = 0;
    const operations = qualifiedProvisioningOperations({
      detectAdbTool: async () => present,
      installPackage: async () => {
        installs += 1;
        present = true;
        return { installed: true };
      },
    });
    ensureAndroidProvisioningMission(queue);
    await runAndroidProvisioning({ queue, store, ops: operations, maxSteps: 10 });
    assert.equal(queue.get(PIXEL_INSTALL_WORK_ID)?.status, 'human-review');
    await runAndroidProvisioning({
      queue,
      store,
      ops: operations,
      approveInstall: true,
      maxSteps: 10,
    });
    assert.equal(installs, 1);
    assert.equal(queue.get(PIXEL_INSTALL_WORK_ID)?.status, 'completed');
    assert.equal(queue.get(PIXEL_PAIRING_WORK_ID)?.status, 'human-review');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('pairing becomes review only after approved installation and fresh tool observation', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-present-'));
  try {
    const queue = new WorkQueue();
    const store = new WorkQueueStore(path.join(directory, 'queue.json'));
    let present = false;
    const operations = qualifiedProvisioningOperations({
      detectAdbTool: async () => present,
      installPackage: async () => {
        present = true;
        return { installed: true };
      },
    });
    ensureAndroidProvisioningMission(queue);
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
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
