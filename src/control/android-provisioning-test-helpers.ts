import type { AndroidProvisioningOperations } from './android-provisioning.js';

export function qualifiedProvisioningOperations(
  overrides: Partial<AndroidProvisioningOperations> = {},
): AndroidProvisioningOperations {
  return {
    detectAdbTool: async () => true,
    installPackage: async () => ({ installed: true }),
    qualifyAdb: async () => ({
      qualified: true,
      detail: 'adb:device-ready',
      serial: 'pixel-test',
    }),
    qualifySsh: async () => ({ qualified: true, detail: 'ssh:keyed-transport-ready' }),
    qualifyTailscale: async () => ({ qualified: true, detail: 'tailscale:reachable' }),
    obtainTermuxBoot: async () => ({
      artifactRef: '/tmp/termux-boot.apk',
      sha256: 'a',
    }),
    verifyTermuxBoot: async () => ({ verified: true, sha256: 'a' }),
    installTermuxBoot: async () => ({ installed: true }),
    verifyTermuxBootPackage: async () => ({ installed: true, signingSource: 'github' }),
    installBootHook: async () => ({ installed: true }),
    verifyBootHook: async () => ({ verified: true }),
    qualifyRebootRecovery: async () => ({
      qualified: true,
      rebootInitiated: true,
      phase: 'qualified',
      detail: 'ssh:returned-after-reboot',
    }),
    ...overrides,
  };
}
