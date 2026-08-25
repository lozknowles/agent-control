import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilityResolver } from './capabilities.js';
import {
  androidProvisioningWorkItems,
  ALLOWED_PACKAGE_OPERATION,
  TERMUX_BOOT_SOURCE,
  createAndroidProvisioningHandler,
} from './android-provisioning.js';
import { qualifiedProvisioningOperations } from './android-provisioning-test-helpers.js';
import { WorkQueue } from './work-queue.js';

test('mission is an explicit dependency graph with a dependency-driven pairing gate', () => {
  const items = androidProvisioningWorkItems();
  const queue = new WorkQueue();
  for (const item of items) queue.enqueue(item);
  assert.equal(queue.get('android.pixel.provision.pairing-approval')?.status, 'queued');
  assert.equal(queue.ready().map(item => item.id).join(','), 'android.pixel.provision.detect-adb');
  assert.deepEqual(TERMUX_BOOT_SOURCE, {
    host: 'github.com',
    repository: 'termux/termux-boot',
    signingSource: 'github',
    packageName: 'com.termux.boot',
  });
  assert.deepEqual(ALLOWED_PACKAGE_OPERATION, { manager: 'apt', packageName: 'adb' });
  assert.deepEqual(
    queue.get('android.pixel.provision.qualify-adb')?.capabilities.requires.map(item => item.id),
    ['tool.shell'],
  );
  assert.deepEqual(
    queue.get('android.pixel.provision.install-boot-hook')?.capabilities.requires.map(
      item => item.id,
    ),
    ['transport.adb', 'tool.repository.write', 'harness.codex'],
  );
  const install = queue.get('android.pixel.provision.install-adb')!;
  install.status = 'failed';
  queue.reconcileDependencies();
  assert.equal(queue.get('android.pixel.provision.pairing-approval')?.status, 'blocked');
  assert.equal(queue.get('android.pixel.provision.qualify-adb')?.status, 'blocked');
});

test('ADB remains missing until a qualified capability is advertised', () => {
  const resolver = new CapabilityResolver();
  const resource = {
    id: 'hpubuntu',
    type: 'host' as const,
    health: 'healthy' as const,
    capabilities: [
      { id: 'tool.shell', kind: 'tool' as const },
      { id: 'tool.package.install', kind: 'tool' as const },
      { id: 'harness.codex', kind: 'harness' as const },
    ],
  };
  const result = resolver.resolve({ requires: [{ id: 'transport.adb' }] }, [resource]);
  assert.deepEqual(result.missing, ['transport.adb']);
});

test('handler rejects package operations outside the explicit allowlist', async () => {
  const handler = createAndroidProvisioningHandler(qualifiedProvisioningOperations());
  const item = androidProvisioningWorkItems().find(
    candidate => candidate.data?.operation === 'install-adb',
  )!;
  item.data = { operation: 'install-adb', manager: 'apt', packageName: 'openssh-server' };
  const result = await handler(
    item,
    { id: 'h', type: 'host', health: 'healthy', capabilities: [] },
    {
      id: item.id,
      type: item.type,
      class: item.class,
      attempt: 1,
      dependsOn: [],
      data: item.data,
    },
  );
  assert.equal(result.error, 'package_operation_not_allowlisted');
});

test('install privilege failure is terminal and explicit', async () => {
  const handler = createAndroidProvisioningHandler(
    qualifiedProvisioningOperations({
      detectAdbTool: async () => false,
      installPackage: async () => {
        throw new Error('NEEDS PRIVILEGE: approval required');
      },
    }),
  );
  const item = androidProvisioningWorkItems().find(
    candidate => candidate.data?.operation === 'install-adb',
  )!;
  const result = await handler(
    item,
    { id: 'h', type: 'host', health: 'healthy', capabilities: [] },
    {
      id: item.id,
      type: item.type,
      class: item.class,
      attempt: 1,
      dependsOn: [],
      data: item.data,
    },
  );
  assert.equal(result.error, 'NEEDS PRIVILEGE: approval required');
  assert.equal(result.retryable, false);
});

test('reboot transport loss is a non-consuming execution result', async () => {
  const handler = createAndroidProvisioningHandler(
    qualifiedProvisioningOperations({
      qualifyRebootRecovery: async () => ({
        qualified: false,
        rebootInitiated: false,
        phase: 'transport-unavailable',
        detail: 'adb:no-devices, ssh:keyed-transport-unavailable',
      }),
    }),
  );
  const item = androidProvisioningWorkItems().find(
    candidate => candidate.data?.operation === 'qualify-reboot-recovery',
  )!;
  const result = await handler(
    item,
    { id: 'h', type: 'host', health: 'healthy', capabilities: [] },
    {
      id: item.id,
      type: item.type,
      class: item.class,
      attempt: 1,
      dependsOn: [],
      data: item.data,
    },
  );
  assert.equal(result.error?.startsWith('NEEDS TRANSPORT:'), true);
  assert.equal(result.consumesAttempt, false);
  const recovery = item.data?.rebootRecovery as {
    phase: string;
    detail: string;
    rebootInitiated: boolean;
    observedAt: string;
  };
  assert.equal(recovery.phase, 'transport-unavailable');
  assert.equal(recovery.detail, 'adb:no-devices, ssh:keyed-transport-unavailable');
  assert.equal(recovery.rebootInitiated, false);
  assert.equal(Number.isNaN(Date.parse(recovery.observedAt)), false);
});
