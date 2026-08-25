import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAdbTransportLoss,
  qualifyAdbDevices,
  qualifyRebootWithLiveTransports,
} from './android-transport.js';

const header = 'List of devices attached\n';

test('ADB tool output with zero devices does not qualify a transport', () => {
  assert.deepEqual(qualifyAdbDevices(header), {
    qualified: false,
    detail: 'adb:no-devices',
  });
});

test('offline and unauthorized ADB devices fail closed', () => {
  assert.deepEqual(qualifyAdbDevices(`${header}pixel-1\toffline product:test\n`), {
    qualified: false,
    detail: 'adb:device-offline',
    serial: 'pixel-1',
  });
  assert.deepEqual(qualifyAdbDevices(`${header}pixel-1\tunauthorized usb:1\n`), {
    qualified: false,
    detail: 'adb:device-unauthorized',
    serial: 'pixel-1',
  });
});

test('multiple devices fail closed when no expected serial is configured', () => {
  const result = qualifyAdbDevices(
    `${header}pixel-1\tdevice product:test\npixel-2\tdevice product:test\n`,
  );
  assert.deepEqual(result, { qualified: false, detail: 'adb:multiple-devices' });
});

test('configured expected serial must be present and ready', () => {
  assert.deepEqual(
    qualifyAdbDevices(`${header}other\tdevice product:test\n`, 'pixel-expected'),
    { qualified: false, detail: 'adb:expected-serial-not-found' },
  );
  assert.deepEqual(
    qualifyAdbDevices(
      `${header}other\tdevice product:test\npixel-expected\tdevice product:pixel\n`,
      'pixel-expected',
    ),
    {
      qualified: true,
      detail: 'adb:device-ready',
      serial: 'pixel-expected',
    },
  );
});

test('ADB command transport-loss errors are recognised without treating generic failures as absence', () => {
  assert.equal(isAdbTransportLoss('error: no devices/emulators found'), true);
  assert.equal(isAdbTransportLoss('error: device offline'), true);
  assert.equal(isAdbTransportLoss("error: device 'pixel-1' not found"), true);
  assert.equal(isAdbTransportLoss('error: more than one device/emulator'), true);
  assert.equal(isAdbTransportLoss('error: protocol fault'), false);
});

test('reboot runs exactly once only after both live transport proofs', async () => {
  let rebootCalls = 0;
  let sshCalls = 0;
  const events: string[] = [];
  const result = await qualifyRebootWithLiveTransports({
    qualifyAdb: async () => ({
      qualified: true,
      detail: 'adb:device-ready',
      serial: 'pixel-test',
    }),
    qualifySsh: async () => {
      sshCalls += 1;
      return sshCalls >= 3
        ? { qualified: true, detail: 'ssh:keyed-transport-ready' }
        : sshCalls === 1
          ? { qualified: true, detail: 'ssh:keyed-transport-ready' }
          : { qualified: false, detail: 'ssh:keyed-transport-unavailable' };
    },
    reboot: async () => {
      rebootCalls += 1;
    },
    wait: async () => undefined,
    maxSshPolls: 3,
    onEvent: phase => {
      events.push(phase);
    },
  });
  assert.equal(rebootCalls, 1);
  assert.equal(result.qualified, true);
  assert.equal(result.rebootInitiated, true);
  assert.equal(result.phase, 'qualified');
  assert.deepEqual(events, [
    'preflight-qualified',
    'reboot-initiated',
    'waiting-for-ssh',
    'qualified',
  ]);
});

test('missing baseline transport never invokes reboot', async () => {
  let rebootCalls = 0;
  const result = await qualifyRebootWithLiveTransports({
    qualifyAdb: async () => ({ qualified: false, detail: 'adb:no-devices' }),
    qualifySsh: async () => ({
      qualified: false,
      detail: 'ssh:keyed-transport-unavailable',
    }),
    reboot: async () => {
      rebootCalls += 1;
    },
    wait: async () => undefined,
    maxSshPolls: 3,
  });
  assert.equal(rebootCalls, 0);
  assert.equal(result.phase, 'transport-unavailable');
  assert.equal(result.rebootInitiated, false);
  assert.equal(result.detail.includes('adb:no-devices'), true);
  assert.equal(result.detail.includes('ssh:keyed-transport-unavailable'), true);
});

test('ADB transport loss between preflight and command is not an initiated reboot', async () => {
  const result = await qualifyRebootWithLiveTransports({
    qualifyAdb: async () => ({ qualified: true, detail: 'adb:device-ready' }),
    qualifySsh: async () => ({ qualified: true, detail: 'ssh:keyed-transport-ready' }),
    reboot: async () => {
      throw new Error('Command failed: adb reboot\nerror: no devices/emulators found');
    },
    wait: async () => undefined,
    maxSshPolls: 3,
  });
  assert.deepEqual(result, {
    qualified: false,
    rebootInitiated: false,
    phase: 'transport-unavailable',
    detail: 'adb:transport-lost-before-reboot',
  });
});

test('post-reboot SSH timeout is distinct from missing initiation transport', async () => {
  let rebootCalls = 0;
  const result = await qualifyRebootWithLiveTransports({
    qualifyAdb: async () => ({ qualified: true, detail: 'adb:device-ready' }),
    qualifySsh: async () => {
      if (rebootCalls === 0) return { qualified: true, detail: 'ssh:keyed-transport-ready' };
      return { qualified: false, detail: 'ssh:keyed-transport-unavailable' };
    },
    reboot: async () => {
      rebootCalls += 1;
    },
    wait: async () => undefined,
    maxSshPolls: 2,
  });
  assert.equal(rebootCalls, 1);
  assert.deepEqual(result, {
    qualified: false,
    rebootInitiated: true,
    phase: 'post-reboot-ssh-timeout',
    detail: 'ssh:post-reboot-timeout',
  });
});
