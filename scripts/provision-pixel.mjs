import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WorkQueueStore } from '../src/control/work-queue-store.ts';
import {
  ensureAndroidProvisioningMission,
  provisioningSummary,
  runAndroidProvisioning,
} from '../src/control/android-provisioning-runtime.ts';
import {
  qualifyAdbDevices,
  qualifyRebootWithLiveTransports,
} from '../src/control/android-transport.ts';

const exec = promisify(execFile);
const stateDir = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control');
const artifactDir = path.join(stateDir, 'android-artifacts');
const timeout = Number(process.env.AGENT_CONTROL_COMMAND_TIMEOUT_MS || 30000);
const packageTimeout = Number(process.env.AGENT_CONTROL_PACKAGE_TIMEOUT_MS || 300000);
const apkInstallTimeout = Number(
  process.env.AGENT_CONTROL_APK_INSTALL_TIMEOUT_MS || 300000,
);
const rebootPollInterval = Number(
  process.env.AGENT_CONTROL_REBOOT_POLL_INTERVAL_MS || 5000,
);
const rebootPolls = Number(process.env.AGENT_CONTROL_REBOOT_SSH_POLLS || 36);

async function command(file, args, options = {}) {
  const result = await exec(file, args, {
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
  return result.stdout.trim();
}

const PRIVILEGED_HELPER =
  process.env.AGENT_CONTROL_PRIVILEGED_HELPER ||
  '/usr/local/libexec/agent-control-privileged';
const TERMUX_HOME = '/data/data/com.termux/files/home';
const TERMUX_PREFIX = '/data/data/com.termux/files/usr';
const TERMUX_REPO = `${TERMUX_HOME}/agent-control-2`;
const TERMUX_BOOT_FILE = `${TERMUX_HOME}/.termux/boot/agent-control.sh`;
const TERMUX_HOOK_SOURCE = path.resolve('android/termux-boot-agent-control.sh');
const approveInstall = process.argv.includes('--approve-install');
const approvePairing = process.argv.includes('--approve-pairing');
const approveRebootTest = process.argv.includes('--approve-reboot-test');
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const pixelHost = process.env.PIXEL_HOST || 'pixel-8-pro';
const pixelUser = process.env.PIXEL_USER || 'u0_a438';
const pixelPort = process.env.PIXEL_SSH_PORT || '8022';
const pixelIdentity =
  process.env.PIXEL_IDENTITY_FILE ||
  path.join(process.env.HOME || '', '.ssh/agent-control-pixel');
const expectedAdbSerial =
  process.env.AGENT_CONTROL_PIXEL_ADB_SERIAL || process.env.ANDROID_SERIAL || '';

function selectedAdbArgs(args) {
  return expectedAdbSerial ? ['-s', expectedAdbSerial, ...args] : args;
}

async function adb(args, options = {}) {
  return command('adb', selectedAdbArgs(args), options);
}

async function keyedSshProof() {
  try {
    const output = await command(
      'ssh',
      [
        '-i',
        pixelIdentity,
        '-o',
        'PasswordAuthentication=no',
        '-o',
        'BatchMode=yes',
        '-o',
        'ConnectTimeout=5',
        '-p',
        String(pixelPort),
        `${pixelUser}@${pixelHost}`,
        'echo SSH-READY',
      ],
      { timeout: 10000 },
    );
    return output === 'SSH-READY'
      ? { qualified: true, detail: 'ssh:keyed-transport-ready' }
      : { qualified: false, detail: 'ssh:unexpected-proof' };
  } catch {
    return { qualified: false, detail: 'ssh:keyed-transport-unavailable' };
  }
}

const ops = {
  async detectAdbTool() {
    try {
      await command('adb', ['version']);
      return true;
    } catch {
      return false;
    }
  },
  async installPackage(spec) {
    if (spec.manager !== 'apt' || spec.packageName !== 'adb') return { installed: false };
    if (process.env.AGENT_CONTROL_ALLOW_ADB_INSTALL !== '1') {
      throw new Error(
        'PRIVILEGE_UNAVAILABLE: explicit AGENT_CONTROL_ALLOW_ADB_INSTALL=1 is required',
      );
    }
    let helperError;
    try {
      await command('sudo', ['-n', PRIVILEGED_HELPER, 'install-adb'], {
        timeout: packageTimeout,
      });
    } catch (error) {
      helperError = error;
    }
    const installed = await this.detectAdbTool();
    if (installed) return { installed: true };
    if (helperError) {
      throw new Error(
        `PRIVILEGE_UNAVAILABLE: fixed helper failed and adb remains absent (${helperError instanceof Error ? helperError.message : String(helperError)})`,
      );
    }
    return { installed: false };
  },
  async qualifyAdb() {
    try {
      const output = await command('adb', ['devices', '-l']);
      return qualifyAdbDevices(output, expectedAdbSerial || undefined);
    } catch {
      return { qualified: false, detail: 'adb:devices-command-failed' };
    }
  },
  async qualifySsh() {
    return keyedSshProof();
  },
  async qualifyTailscale() {
    try {
      await command('tailscale', ['ping', '-c', '1', pixelHost], { timeout: 10000 });
      return { qualified: true, detail: 'tailscale:reachable' };
    } catch {
      return { qualified: false, detail: 'tailscale:unreachable' };
    }
  },
  async obtainTermuxBoot() {
    fs.mkdirSync(artifactDir, { recursive: true });
    const api = JSON.parse(
      await command('curl', [
        '-fsSL',
        '--max-time',
        '20',
        'https://api.github.com/repos/termux/termux-boot/releases/latest',
      ]),
    );
    const asset = api.assets?.find(candidate => String(candidate.name).endsWith('.apk'));
    if (!asset?.browser_download_url) throw new Error('termux_boot_github_apk_asset_missing');
    const file = path.join(artifactDir, 'termux-boot.apk');
    await command('curl', [
      '-fsSL',
      '--max-time',
      '60',
      '-o',
      file,
      asset.browser_download_url,
    ]);
    const sha256 = (await command('sha256sum', [file])).split(/\s+/)[0];
    this.artifact = { artifactRef: file, sha256 };
    return this.artifact;
  },
  async verifyTermuxBoot(spec, artifact) {
    if (
      spec.host !== 'github.com' ||
      spec.repository !== 'termux/termux-boot' ||
      !artifact.artifactRef.startsWith(artifactDir)
    ) {
      return { verified: false, sha256: artifact.sha256 };
    }
    const sha256 = (await command('sha256sum', [artifact.artifactRef])).split(/\s+/)[0];
    return { verified: sha256 === artifact.sha256, sha256 };
  },
  async installTermuxBoot(packageName) {
    if (!this.artifact?.artifactRef || !fs.existsSync(this.artifact.artifactRef)) {
      throw new Error('termux_boot_artifact_not_obtained');
    }
    const sha256 = (await command('sha256sum', [this.artifact.artifactRef])).split(/\s+/)[0];
    if (sha256 !== this.artifact.sha256) {
      throw new Error('termux_boot_artifact_hash_changed_after_verification');
    }
    let installError;
    try {
      await adb(['install', '-r', this.artifact.artifactRef], {
        timeout: apkInstallTimeout,
      });
    } catch (error) {
      installError = error;
    }
    const observed = await this.verifyTermuxBootPackage(packageName);
    if (observed.installed) return { installed: true };
    if (installError) {
      throw new Error(
        `DEVICE INSTALL INCOMPLETE: adb install ended before ${packageName} was observed (${installError instanceof Error ? installError.message : String(installError)})`,
      );
    }
    return { installed: false };
  },
  async verifyTermuxBootPackage(packageName) {
    try {
      return {
        installed: /package:/.test(await adb(['shell', 'pm', 'path', packageName])),
        signingSource: 'github',
      };
    } catch {
      return { installed: false, signingSource: 'other' };
    }
  },
  async installBootHook() {
    await adb(
      [
        'shell',
        'run-as',
        'com.termux',
        '/system/bin/env',
        `HOME=${TERMUX_HOME}`,
        `PREFIX=${TERMUX_PREFIX}`,
        `PATH=${TERMUX_PREFIX}/bin:/system/bin`,
        `${TERMUX_PREFIX}/bin/bash`,
        `${TERMUX_REPO}/android/install-boot.sh`,
      ],
      { timeout: packageTimeout },
    );
    return { installed: (await this.verifyBootHook()).verified };
  },
  async verifyBootHook() {
    try {
      await adb(['shell', 'run-as', 'com.termux', 'test', '-x', TERMUX_BOOT_FILE]);
      const expected = (await command('sha256sum', [TERMUX_HOOK_SOURCE])).split(/\s+/)[0];
      const observed = (
        await adb([
          'shell',
          'run-as',
          'com.termux',
          `${TERMUX_PREFIX}/bin/sha256sum`,
          TERMUX_BOOT_FILE,
        ])
      ).split(/\s+/)[0];
      return { verified: observed === expected };
    } catch {
      return { verified: false };
    }
  },
  async qualifyRebootRecovery() {
    return qualifyRebootWithLiveTransports({
      qualifyAdb: () => this.qualifyAdb(),
      qualifySsh: () => this.qualifySsh(),
      reboot: async () => {
        await adb(['reboot'], { timeout: 30000 });
      },
      wait: () => wait(rebootPollInterval),
      maxSshPolls: rebootPolls,
      onEvent: (phase, detail) => console.log(`[reboot:${phase}] ${detail}`),
    });
  },
};

const store = new WorkQueueStore(path.join(stateDir, 'work-queue.json'));
const queue = store.load();
const artifactResult = queue.get('android.pixel.provision.obtain-termux-boot')?.resultRef;
if (artifactResult) {
  try {
    const restoredArtifact = JSON.parse(artifactResult);
    if (restoredArtifact.artifactRef?.startsWith(artifactDir) && restoredArtifact.sha256) {
      ops.artifact = restoredArtifact;
    }
  } catch {
    // A legacy non-JSON result is not a reusable artifact reference.
  }
}
const added = ensureAndroidProvisioningMission(queue);
store.save(queue);
const missionItems = queue
  .all()
  .filter(item => item.id.startsWith('android.pixel.provision.'));
console.log(`Pixel provisioning mission ${added ? 'created' : 'restored'} (${missionItems.length} items)`);
const result = await runAndroidProvisioning({
  queue,
  store,
  ops,
  approveInstall,
  approvePairing,
  approveRebootTest,
  onEvent: event => console.log(`[${event.kind}] ${event.workId || ''} ${event.detail}`),
});
console.log(provisioningSummary(result.queue));

const install = result.queue.get('android.pixel.provision.install-adb');
if (install?.status === 'human-review') {
  console.log(
    '\nNEEDS PRIVILEGE\nA one-time root-owned helper must be installed and narrowly sudo-authorized for exactly apt install adb. No password is captured or stored. Resume with:\n  AGENT_CONTROL_ALLOW_ADB_INSTALL=1 npm run provision:pixel -- --approve-install',
  );
}
const apkInstall = result.queue.get('android.pixel.provision.install-termux-boot');
if (apkInstall?.status === 'human-review') {
  console.log(
    '\nNEEDS DEVICE INSTALL\nTermux:Boot has not yet been observed on the Pixel. Check the Pixel for a confirmation, then resume with:\n  npm run provision:pixel',
  );
}
const review = result.queue.get('android.pixel.provision.pairing-approval');
if (review?.status === 'human-review') {
  console.log(
    '\nHUMAN REVIEW\nPixel Wireless Debugging pairing required\n\nApprove pairing on the Pixel, then resume with:\n  npm run provision:pixel -- --approve-pairing',
  );
}
const reboot = result.queue.get('android.pixel.provision.qualify-reboot-recovery');
if (reboot?.status === 'human-review') {
  if (reboot.resultRef?.startsWith('NEEDS TRANSPORT')) {
    console.log(
      `\nWAITING FOR TRANSPORT\n${reboot.resultRef}\nThe one-shot reboot approval remains durable; no pairing endpoint, manual adb command, or repeated approval is requested.`,
    );
  } else if (reboot.resultRef?.startsWith('NEEDS REBOOT APPROVAL')) {
    console.log(
      '\nNEEDS REBOOT APPROVAL\nOne deliberate physical reboot has not been authorised. Run once when ready:\n  npm run provision:pixel -- --approve-reboot-test',
    );
  } else if (reboot.resultRef?.startsWith('REBOOT RECOVERY UNQUALIFIED')) {
    console.log(`\nREBOOT RECOVERY UNQUALIFIED\n${reboot.resultRef}`);
  }
}
if (result.events.some(event => event.kind === 'failed')) process.exitCode = 1;
