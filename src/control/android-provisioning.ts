import type { Resource } from './capabilities.js';
import { capabilityId } from './capabilities.js';
import type {
  RebootRecoveryResult,
  TransportQualification,
} from './android-transport.js';
import type { WorkExecutionResult, WorkHandler } from './work-executor.js';
import type { WorkItem } from './work-queue.js';

export const TERMUX_BOOT_SOURCE = {
  host: 'github.com',
  repository: 'termux/termux-boot',
  signingSource: 'github',
  packageName: 'com.termux.boot',
} as const;
export const ALLOWED_PACKAGE_OPERATION = { manager: 'apt', packageName: 'adb' } as const;

export type AndroidProvisioningOperation =
  | 'detect-adb'
  | 'install-adb'
  | 'pairing-approval'
  | 'qualify-adb'
  | 'obtain-termux-boot'
  | 'verify-termux-boot'
  | 'install-termux-boot'
  | 'verify-termux-boot-package'
  | 'install-boot-hook'
  | 'verify-boot-hook'
  | 'qualify-reboot-recovery';

export interface AndroidProvisioningOperations {
  detectAdbTool(): Promise<boolean>;
  installPackage(spec: typeof ALLOWED_PACKAGE_OPERATION): Promise<{ installed: boolean }>;
  qualifyAdb(): Promise<TransportQualification>;
  qualifySsh(): Promise<TransportQualification>;
  qualifyTailscale(): Promise<TransportQualification>;
  obtainTermuxBoot(
    spec: typeof TERMUX_BOOT_SOURCE,
  ): Promise<{ artifactRef: string; sha256: string }>;
  verifyTermuxBoot(
    spec: typeof TERMUX_BOOT_SOURCE,
    artifact: { artifactRef: string; sha256: string },
  ): Promise<{ verified: boolean; sha256: string }>;
  installTermuxBoot(packageName: string): Promise<{ installed: boolean }>;
  verifyTermuxBootPackage(
    packageName: string,
  ): Promise<{ installed: boolean; signingSource: 'github' | 'other' }>;
  installBootHook(): Promise<{ installed: boolean }>;
  verifyBootHook(): Promise<{ verified: boolean }>;
  qualifyRebootRecovery(): Promise<RebootRecoveryResult>;
}

const id = (name: string) => `android.pixel.provision.${name}`;
const base = (
  name: string,
  operation: AndroidProvisioningOperation,
  requires: string[],
  dependsOn: string[] = [],
  status: WorkItem['status'] = 'queued',
): WorkItem => ({
  id: id(name),
  type: `android.pixel.${operation}`,
  class: 'priority',
  status,
  capabilities: { requires: requires.map(capability => ({ id: capability })) },
  createdAt: new Date().toISOString(),
  batchable: false,
  preemptible: false,
  dependsOn,
  attempts: 0,
  maxAttempts: 2,
  data: { operation },
});

export function androidProvisioningWorkItems(): WorkItem[] {
  const detect = base('detect-adb', 'detect-adb', [capabilityId.shell]);
  const install = base(
    'install-adb',
    'install-adb',
    [capabilityId.shell, capabilityId.packageInstall],
    [detect.id],
  );
  install.data = { operation: 'install-adb', manager: 'apt', packageName: 'adb' };
  const pairing = base(
    'pairing-approval',
    'pairing-approval',
    [capabilityId.codex],
    [install.id],
  );
  pairing.data = { operation: 'pairing-approval', reviewGate: true };
  // This operation establishes transport.adb, so it requires only the host shell.
  const qualify = base('qualify-adb', 'qualify-adb', [capabilityId.shell], [pairing.id]);
  const obtain = base(
    'obtain-termux-boot',
    'obtain-termux-boot',
    [capabilityId.networkRead],
    [qualify.id],
  );
  const verify = base(
    'verify-termux-boot',
    'verify-termux-boot',
    [capabilityId.shell],
    [obtain.id],
  );
  const installApk = base(
    'install-termux-boot',
    'install-termux-boot',
    [capabilityId.adb, capabilityId.androidPackageInstall],
    [verify.id],
  );
  const verifyApk = base(
    'verify-termux-boot-package',
    'verify-termux-boot-package',
    [capabilityId.adb],
    [installApk.id],
  );
  // The current hook operations execute through adb shell, not through Termux SSH.
  const hook = base(
    'install-boot-hook',
    'install-boot-hook',
    [capabilityId.adb, capabilityId.repoWrite, capabilityId.codex],
    [verifyApk.id],
  );
  const verifyHook = base(
    'verify-boot-hook',
    'verify-boot-hook',
    [capabilityId.adb],
    [hook.id],
  );
  const reboot = base(
    'qualify-reboot-recovery',
    'qualify-reboot-recovery',
    [capabilityId.adb, capabilityId.ssh],
    [verifyHook.id],
  );
  return [
    detect,
    install,
    pairing,
    qualify,
    obtain,
    verify,
    installApk,
    verifyApk,
    hook,
    verifyHook,
    reboot,
  ];
}

export function createAndroidProvisioningHandler(
  ops: AndroidProvisioningOperations,
): WorkHandler {
  return async (work, _resource, context) => {
    const operation = work.data?.operation as AndroidProvisioningOperation;
    switch (operation) {
      case 'detect-adb':
        return {
          resultRef: (await ops.detectAdbTool()) ? 'adb-tool-present' : 'adb-tool-missing',
        };
      case 'install-adb': {
        if (work.data?.manager !== 'apt' || work.data?.packageName !== 'adb') {
          return { error: 'package_operation_not_allowlisted', retryable: false };
        }
        if (
          context.dependsOn.some(
            dependency =>
              dependency.id === id('detect-adb') &&
              ['adb-present', 'adb-tool-present'].includes(dependency.resultRef ?? ''),
          )
        ) {
          return { resultRef: 'adb-already-present' };
        }
        try {
          const result = await ops.installPackage(ALLOWED_PACKAGE_OPERATION);
          return result.installed
            ? { resultRef: 'apt:adb-installed' }
            : { error: 'adb_package_not_installed', retryable: false };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : String(error),
            retryable: false,
          };
        }
      }
      case 'pairing-approval':
        return { resultRef: 'android-wireless-debugging-pairing-approved', confidence: 0 };
      case 'qualify-adb':
        return transportQualified(await ops.qualifyAdb(), capabilityId.adb);
      case 'obtain-termux-boot': {
        const result = await ops.obtainTermuxBoot(TERMUX_BOOT_SOURCE);
        return { resultRef: JSON.stringify(result), fingerprint: result.sha256 };
      }
      case 'verify-termux-boot': {
        const artifact = await ops.obtainTermuxBoot(TERMUX_BOOT_SOURCE);
        const verification = await ops.verifyTermuxBoot(TERMUX_BOOT_SOURCE, artifact);
        return verification.verified && verification.sha256 === artifact.sha256
          ? { resultRef: 'github-termux-boot-verified', fingerprint: verification.sha256 }
          : { error: 'termux_boot_provenance_or_hash_failed', retryable: false };
      }
      case 'install-termux-boot': {
        const result = await ops.installTermuxBoot(TERMUX_BOOT_SOURCE.packageName);
        return result.installed
          ? { resultRef: 'adb:termux-boot-installed' }
          : { error: 'termux_boot_install_failed', retryable: false };
      }
      case 'verify-termux-boot-package': {
        const result = await ops.verifyTermuxBootPackage(TERMUX_BOOT_SOURCE.packageName);
        return result.installed && result.signingSource === 'github'
          ? { resultRef: 'github-termux-boot-package-verified' }
          : { error: 'termux_boot_signing_source_mismatch', retryable: false };
      }
      case 'install-boot-hook': {
        const result = await ops.installBootHook();
        return result.installed
          ? { resultRef: 'termux:boot-agent-control-hook-installed' }
          : { error: 'boot_hook_install_failed', retryable: false };
      }
      case 'verify-boot-hook': {
        const result = await ops.verifyBootHook();
        return result.verified
          ? { resultRef: 'termux:boot-agent-control-hook-verified' }
          : { error: 'boot_hook_verification_failed', retryable: false };
      }
      case 'qualify-reboot-recovery': {
        const result = await ops.qualifyRebootRecovery();
        work.data = {
          ...(work.data ?? {}),
          rebootRecovery: {
            phase: result.phase,
            detail: result.detail,
            rebootInitiated: result.rebootInitiated,
            observedAt: new Date().toISOString(),
          },
        };
        if (result.qualified) return { resultRef: 'qualified:android.unattended.recovery' };
        if (result.phase === 'transport-unavailable') {
          return {
            error: `NEEDS TRANSPORT: ${result.detail}`,
            retryable: false,
            consumesAttempt: false,
          };
        }
        if (result.phase === 'post-reboot-ssh-timeout') {
          return {
            error: 'qualification_failed:android.unattended.recovery:post-reboot-ssh-timeout',
            retryable: false,
          };
        }
        return {
          error: `reboot_initiation_failed:${result.detail}`,
          retryable: false,
        };
      }
      default:
        return { error: 'unknown_android_provisioning_operation', retryable: false };
    }
  };
}

function transportQualified(
  result: TransportQualification,
  capability: string,
): WorkExecutionResult {
  return result.qualified
    ? { resultRef: `qualified:${capability}` }
    : {
        error: `qualification_failed:${capability}:${result.detail}`,
        retryable: false,
        consumesAttempt: false,
      };
}

export function isAndroidProvisioningResource(resource: Resource) {
  return resource.capabilities.some(capability => capability.id === capabilityId.codex);
}
