export interface TransportQualification {
  qualified: boolean;
  detail: string;
  serial?: string;
}

export type RebootRecoveryPhase =
  | 'qualified'
  | 'transport-unavailable'
  | 'reboot-command-failed'
  | 'post-reboot-ssh-timeout';

export type RebootRecoveryEventPhase =
  | RebootRecoveryPhase
  | 'preflight-qualified'
  | 'reboot-initiated'
  | 'waiting-for-ssh';

export interface RebootRecoveryResult {
  qualified: boolean;
  rebootInitiated: boolean;
  phase: RebootRecoveryPhase;
  detail: string;
}

interface AdbDeviceRow {
  serial: string;
  state: string;
}

function adbRows(output: string): AdbDeviceRow[] {
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && line !== 'List of devices attached' && !line.startsWith('*'))
    .map(line => {
      const [serial = '', state = 'unknown'] = line.split(/\s+/);
      return { serial, state };
    })
    .filter(row => row.serial.length > 0);
}

function stateFailure(state: string): string {
  if (state === 'offline') return 'adb:device-offline';
  if (state === 'unauthorized') return 'adb:device-unauthorized';
  return `adb:device-${state || 'unknown'}`;
}

export function qualifyAdbDevices(
  output: string,
  expectedSerial?: string,
): TransportQualification {
  const devices = adbRows(output);
  if (expectedSerial) {
    const matching = devices.filter(device => device.serial === expectedSerial);
    if (matching.length === 0) {
      return { qualified: false, detail: 'adb:expected-serial-not-found' };
    }
    if (matching.length > 1) {
      return { qualified: false, detail: 'adb:duplicate-expected-serial' };
    }
    const [device] = matching;
    if (device.state !== 'device') {
      return { qualified: false, detail: stateFailure(device.state), serial: device.serial };
    }
    return { qualified: true, detail: 'adb:device-ready', serial: device.serial };
  }

  if (devices.length === 0) return { qualified: false, detail: 'adb:no-devices' };
  if (devices.length !== 1) return { qualified: false, detail: 'adb:multiple-devices' };
  const [device] = devices;
  if (device.state !== 'device') {
    return { qualified: false, detail: stateFailure(device.state), serial: device.serial };
  }
  return { qualified: true, detail: 'adb:device-ready', serial: device.serial };
}

export function isAdbTransportLoss(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no devices\/emulators found|more than one device|device(?:\s+\S+)?\s+(?:not found|offline|unauthorized)/i.test(
    message,
  );
}

async function safeQualification(
  qualify: () => Promise<TransportQualification>,
  fallback: string,
): Promise<TransportQualification> {
  try {
    return await qualify();
  } catch {
    return { qualified: false, detail: fallback };
  }
}

export interface RebootRecoveryOptions {
  qualifyAdb: () => Promise<TransportQualification>;
  qualifySsh: () => Promise<TransportQualification>;
  reboot: () => Promise<void>;
  wait: () => Promise<void>;
  maxSshPolls: number;
  onEvent?: (phase: RebootRecoveryEventPhase, detail: string) => void | Promise<void>;
}

async function emitRebootEvent(
  options: RebootRecoveryOptions,
  phase: RebootRecoveryEventPhase,
  detail: string,
) {
  await options.onEvent?.(phase, detail);
}

export async function qualifyRebootWithLiveTransports(
  options: RebootRecoveryOptions,
): Promise<RebootRecoveryResult> {
  const [adb, ssh] = await Promise.all([
    safeQualification(options.qualifyAdb, 'adb:qualification-error'),
    safeQualification(options.qualifySsh, 'ssh:qualification-error'),
  ]);
  const missing = [
    ...(!adb.qualified ? [adb.detail] : []),
    ...(!ssh.qualified ? [ssh.detail] : []),
  ];
  if (missing.length > 0) {
    await emitRebootEvent(options, 'transport-unavailable', missing.join(', '));
    return {
      qualified: false,
      rebootInitiated: false,
      phase: 'transport-unavailable',
      detail: missing.join(', '),
    };
  }

  await emitRebootEvent(options, 'preflight-qualified', 'adb and keyed ssh ready');

  try {
    await options.reboot();
  } catch (error) {
    if (isAdbTransportLoss(error)) {
      await emitRebootEvent(
        options,
        'transport-unavailable',
        'adb:transport-lost-before-reboot',
      );
      return {
        qualified: false,
        rebootInitiated: false,
        phase: 'transport-unavailable',
        detail: 'adb:transport-lost-before-reboot',
      };
    }
    await emitRebootEvent(options, 'reboot-command-failed', 'adb:reboot-command-failed');
    return {
      qualified: false,
      rebootInitiated: false,
      phase: 'reboot-command-failed',
      detail: 'adb:reboot-command-failed',
    };
  }

  await emitRebootEvent(options, 'reboot-initiated', 'adb reboot accepted');
  await emitRebootEvent(options, 'waiting-for-ssh', 'bounded post-reboot ssh wait');

  for (let attempt = 0; attempt < options.maxSshPolls; attempt += 1) {
    await options.wait();
    const recovered = await safeQualification(options.qualifySsh, 'ssh:qualification-error');
    if (recovered.qualified) {
      await emitRebootEvent(options, 'qualified', 'ssh:returned-after-reboot');
      return {
        qualified: true,
        rebootInitiated: true,
        phase: 'qualified',
        detail: 'ssh:returned-after-reboot',
      };
    }
  }

  await emitRebootEvent(options, 'post-reboot-ssh-timeout', 'ssh:post-reboot-timeout');
  return {
    qualified: false,
    rebootInitiated: true,
    phase: 'post-reboot-ssh-timeout',
    detail: 'ssh:post-reboot-timeout',
  };
}
