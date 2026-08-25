import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hpubuntuProvisioningResource,
  observeProvisioningTransports,
} from './android-provisioning-runtime.js';
import { qualifiedProvisioningOperations } from './android-provisioning-test-helpers.js';

function capabilityIds(resource: ReturnType<typeof hpubuntuProvisioningResource>) {
  return resource.capabilities.map(capability => capability.id);
}

test('installed ADB tool does not advertise a device transport', async () => {
  const snapshot = await observeProvisioningTransports(
    qualifiedProvisioningOperations({
      detectAdbTool: async () => true,
      qualifyAdb: async () => ({ qualified: false, detail: 'adb:no-devices' }),
    }),
  );
  assert.equal(snapshot.adbToolAvailable, true);
  assert.equal(snapshot.adb.qualified, false);
  assert.equal(capabilityIds(hpubuntuProvisioningResource(snapshot)).includes('transport.adb'), false);
});

test('ADB device-query failure fails closed', async () => {
  const snapshot = await observeProvisioningTransports(
    qualifiedProvisioningOperations({
      detectAdbTool: async () => true,
      qualifyAdb: async () => {
        throw new Error('adb server unavailable');
      },
    }),
  );
  assert.equal(snapshot.adb.qualified, false);
  assert.equal(snapshot.adb.detail, 'adb:qualification-error');
  assert.equal(capabilityIds(hpubuntuProvisioningResource(snapshot)).includes('transport.adb'), false);
});

test('ADB, SSH, and Tailscale capabilities are advertised independently from fresh evidence', () => {
  const resource = hpubuntuProvisioningResource({
    adbToolAvailable: true,
    adb: { qualified: true, detail: 'adb:device-ready', serial: 'pixel-test' },
    ssh: { qualified: false, detail: 'ssh:keyed-transport-unavailable' },
    tailscale: { qualified: true, detail: 'tailscale:reachable' },
  });
  const ids = capabilityIds(resource);
  assert.equal(ids.includes('transport.adb'), true);
  assert.equal(ids.includes('transport.ssh'), false);
  assert.equal(ids.includes('transport.tailscale'), true);
});

test('no live evidence means no transport capability is invented', () => {
  const resource = hpubuntuProvisioningResource({
    adbToolAvailable: true,
    adb: { qualified: false, detail: 'adb:device-offline' },
    ssh: { qualified: false, detail: 'ssh:keyed-transport-unavailable' },
    tailscale: { qualified: false, detail: 'tailscale:unreachable' },
  });
  const transports = capabilityIds(resource).filter(id => id.startsWith('transport.'));
  assert.deepEqual(transports, []);
});
