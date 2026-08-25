import type { Resource } from './capabilities.js';
import { capabilityId } from './capabilities.js';
import {
  androidProvisioningWorkItems,
  createAndroidProvisioningHandler,
} from './android-provisioning.js';
import type { AndroidProvisioningOperations } from './android-provisioning.js';
import {
  isAdbTransportLoss,
  type TransportQualification,
} from './android-transport.js';
import { WorkCoordinator } from './work-coordinator.js';
import { WorkExecutor, type ExecutionEvent } from './work-executor.js';
import { WorkPolicy } from './work-policy.js';
import { WorkQueue, type WorkItem } from './work-queue.js';
import type { WorkQueueStore } from './work-queue-store.js';

export const PIXEL_PAIRING_WORK_ID = 'android.pixel.provision.pairing-approval';
export const PIXEL_INSTALL_WORK_ID = 'android.pixel.provision.install-adb';
export const PIXEL_QUALIFY_ADB_WORK_ID = 'android.pixel.provision.qualify-adb';
export const PIXEL_INSTALL_TERMUX_BOOT_WORK_ID =
  'android.pixel.provision.install-termux-boot';
export const PIXEL_INSTALL_BOOT_HOOK_WORK_ID =
  'android.pixel.provision.install-boot-hook';
export const PIXEL_REBOOT_RECOVERY_WORK_ID =
  'android.pixel.provision.qualify-reboot-recovery';

export interface ProvisioningTransportSnapshot {
  adbToolAvailable: boolean;
  adb: TransportQualification;
  ssh: TransportQualification;
  tailscale: TransportQualification;
}

interface RebootApprovalRecord {
  state: 'pending' | 'consumed';
  approvedAt: string;
  consumedAt?: string;
  reason?: string;
  migrated?: boolean;
}

function migrateLegacyPrivilegeFailure(queue: WorkQueue) {
  const install = queue.get(PIXEL_INSTALL_WORK_ID);
  const error = install?.outcomes?.at(-1)?.error;
  const legacySudoFailure = error?.includes('sudo -n -v') && error.includes('password is required');
  const allowlisted =
    install?.data?.manager === 'apt' && install.data.packageName === 'adb';
  if (
    install?.status === 'failed' &&
    allowlisted &&
    (error?.startsWith('NEEDS PRIVILEGE') ||
      error?.startsWith('PRIVILEGE_UNAVAILABLE') ||
      legacySudoFailure)
  ) {
    install.status = 'human-review';
    install.resultRef =
      'NEEDS PRIVILEGE: fixed helper approval required; migrated from terminal failure';
    install.claimedBy = undefined;
    return true;
  }
  return false;
}

function resumeAdbQualification(queue: WorkQueue) {
  const qualify = queue.get(PIXEL_QUALIFY_ADB_WORK_ID);
  const lastError = qualify?.outcomes?.at(-1)?.error;
  const resumable =
    lastError?.startsWith('qualification_failed:transport.adb') ||
    qualify?.resultRef?.startsWith('NEEDS TRANSPORT');
  if (
    resumable &&
    (qualify?.status === 'failed' || qualify?.status === 'human-review')
  ) {
    qualify.status = 'queued';
    qualify.resultRef = undefined;
    qualify.claimedBy = undefined;
    return true;
  }
  return false;
}

function resumeTermuxBootInstall(queue: WorkQueue) {
  const install = queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID);
  const lastError = install?.outcomes?.at(-1)?.error;
  const resumable =
    lastError?.includes('adb install -r') ||
    lastError?.startsWith('DEVICE INSTALL INCOMPLETE') ||
    install?.resultRef?.startsWith('NEEDS DEVICE INSTALL');
  if (
    resumable &&
    (install?.status === 'failed' || install?.status === 'human-review')
  ) {
    install.status = 'queued';
    install.resultRef = undefined;
    install.claimedBy = undefined;
    return true;
  }
  return false;
}

function resumeBootHookInstall(queue: WorkQueue) {
  const install = queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID);
  const lastError = install?.outcomes?.at(-1)?.error;
  const resumable =
    lastError === 'boot_hook_install_failed' ||
    lastError?.includes('run-as com.termux') ||
    install?.resultRef?.startsWith('NEEDS BOOT HOOK');
  if (
    resumable &&
    (install?.status === 'failed' || install?.status === 'human-review')
  ) {
    install.status = 'queued';
    install.resultRef = undefined;
    install.claimedBy = undefined;
    return true;
  }
  return false;
}

function rebootApproval(item: WorkItem | undefined): RebootApprovalRecord | undefined {
  const value = item?.data?.rebootApproval;
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<RebootApprovalRecord>;
  if (
    (candidate.state !== 'pending' && candidate.state !== 'consumed') ||
    typeof candidate.approvedAt !== 'string'
  ) {
    return undefined;
  }
  return candidate as RebootApprovalRecord;
}

function setRebootApproval(item: WorkItem, approval: RebootApprovalRecord) {
  item.data = { ...(item.data ?? {}), rebootApproval: approval };
}

function approvalIsPending(item: WorkItem | undefined) {
  return rebootApproval(item)?.state === 'pending';
}

function grantRebootApproval(item: WorkItem, approvedAt = new Date().toISOString()) {
  if (approvalIsPending(item)) return;
  setRebootApproval(item, { state: 'pending', approvedAt });
}

function consumeRebootApproval(item: WorkItem, reason: string) {
  const current = rebootApproval(item);
  if (!current || current.state !== 'pending') return;
  setRebootApproval(item, {
    ...current,
    state: 'consumed',
    consumedAt: new Date().toISOString(),
    reason,
  });
}

function isPreRebootTransportFailure(error: string | undefined) {
  if (!error) return false;
  return (
    error.startsWith('NEEDS TRANSPORT:') ||
    (/adb reboot/i.test(error) && isAdbTransportLoss(error))
  );
}

function migrateRebootQualificationGate(queue: WorkQueue) {
  const reboot = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID);
  const lastOutcome = reboot?.outcomes?.at(-1);
  const lastError = lastOutcome?.error;
  if (
    reboot?.status === 'human-review' &&
    reboot.resultRef?.startsWith('NEEDS TRANSPORT') &&
    !approvalIsPending(reboot)
  ) {
    setRebootApproval(reboot, {
      state: 'pending',
      approvedAt: lastOutcome?.at ?? new Date().toISOString(),
      migrated: true,
    });
    reboot.claimedBy = undefined;
    return true;
  }
  if (reboot?.status !== 'failed') return false;

  if (isPreRebootTransportFailure(lastError)) {
    if (!approvalIsPending(reboot)) {
      setRebootApproval(reboot, {
        state: 'pending',
        approvedAt: lastOutcome?.at ?? new Date().toISOString(),
        migrated: true,
      });
    }
    reboot.status = 'human-review';
    reboot.resultRef =
      'NEEDS TRANSPORT: reboot approval persisted; the reboot was not initiated';
    reboot.claimedBy = undefined;
    return true;
  }

  if (lastError?.startsWith('qualification_failed:android.unattended.recovery')) {
    const existing = rebootApproval(reboot);
    if (existing?.state === 'pending') consumeRebootApproval(reboot, 'post-reboot-unqualified');
    reboot.status = 'human-review';
    reboot.resultRef =
      'NEEDS REBOOT APPROVAL: a previous initiated reboot did not qualify recovery';
    reboot.claimedBy = undefined;
    return true;
  }
  return false;
}

export function ensureAndroidProvisioningMission(queue: WorkQueue) {
  let added = 0;
  for (const item of androidProvisioningWorkItems()) {
    if (!queue.get(item.id)) {
      queue.enqueue(item);
      added += 1;
    }
  }
  return added;
}

export function hpubuntuProvisioningResource(
  snapshot: ProvisioningTransportSnapshot,
): Resource {
  return {
    id: 'hpubuntu',
    type: 'host',
    health: 'healthy',
    capabilities: [
      { id: capabilityId.shell, kind: 'tool' },
      { id: capabilityId.packageInstall, kind: 'tool' },
      { id: capabilityId.networkRead, kind: 'tool' },
      { id: capabilityId.repoWrite, kind: 'tool' },
      { id: capabilityId.androidPackageInstall, kind: 'tool' },
      { id: capabilityId.codex, kind: 'harness' },
      ...(snapshot.tailscale.qualified
        ? [{ id: capabilityId.tailscale, kind: 'transport' as const }]
        : []),
      ...(snapshot.ssh.qualified
        ? [{ id: capabilityId.ssh, kind: 'transport' as const }]
        : []),
      ...(snapshot.adb.qualified
        ? [{ id: capabilityId.adb, kind: 'transport' as const }]
        : []),
    ],
  };
}

async function safeTransportQualification(
  qualify: () => Promise<TransportQualification>,
  fallback: string,
): Promise<TransportQualification> {
  try {
    return await qualify();
  } catch {
    return { qualified: false, detail: fallback };
  }
}

export async function observeProvisioningTransports(
  ops: AndroidProvisioningOperations,
): Promise<ProvisioningTransportSnapshot> {
  let adbToolAvailable = false;
  try {
    adbToolAvailable = await ops.detectAdbTool();
  } catch {
    adbToolAvailable = false;
  }
  const [adb, ssh, tailscale] = await Promise.all([
    adbToolAvailable
      ? safeTransportQualification(ops.qualifyAdb.bind(ops), 'adb:qualification-error')
      : Promise.resolve({ qualified: false, detail: 'adb:tool-unavailable' }),
    safeTransportQualification(ops.qualifySsh.bind(ops), 'ssh:qualification-error'),
    safeTransportQualification(
      ops.qualifyTailscale.bind(ops),
      'tailscale:qualification-error',
    ),
  ]);
  return { adbToolAvailable, adb, ssh, tailscale };
}

export interface ProvisioningRunOptions {
  queue: WorkQueue;
  store: WorkQueueStore;
  ops: AndroidProvisioningOperations;
  approveInstall?: boolean;
  approvePairing?: boolean;
  approveRebootTest?: boolean;
  maxSteps?: number;
  onEvent?: (event: ExecutionEvent) => void;
}

class AndroidProvisioningPolicy extends WorkPolicy {
  override isQuietEligible(work: WorkItem, now = new Date()) {
    return (
      work.id.startsWith('android.pixel.provision.') && super.isQuietEligible(work, now)
    );
  }
}

function rebootDependenciesComplete(queue: WorkQueue) {
  const reboot = queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID);
  return Boolean(
    reboot && reboot.dependsOn.every(dependency => queue.get(dependency)?.status === 'completed'),
  );
}

function waitingTransportDetail(snapshot: ProvisioningTransportSnapshot) {
  return [
    ...(!snapshot.adb.qualified ? [snapshot.adb.detail] : []),
    ...(!snapshot.ssh.qualified ? [snapshot.ssh.detail] : []),
  ].join(', ');
}

function persistReviewEvent(
  options: ProvisioningRunOptions,
  events: ExecutionEvent[],
  event: ExecutionEvent,
) {
  events.push(event);
  options.store.save(options.queue);
  options.onEvent?.(event);
}

export async function runAndroidProvisioning(options: ProvisioningRunOptions) {
  migrateLegacyPrivilegeFailure(options.queue);
  resumeAdbQualification(options.queue);
  resumeTermuxBootInstall(options.queue);
  resumeBootHookInstall(options.queue);
  migrateRebootQualificationGate(options.queue);
  options.queue.reconcileDependencies();

  const install = options.queue.get(PIXEL_INSTALL_WORK_ID);
  if (options.approveInstall && install?.status === 'human-review') {
    options.queue.approve(PIXEL_INSTALL_WORK_ID);
    install.resultRef = undefined;
  }

  const pairing = options.queue.get(PIXEL_PAIRING_WORK_ID);
  if (
    options.approvePairing &&
    pairing?.status === 'human-review' &&
    pairing.dependsOn.every(id => options.queue.get(id)?.status === 'completed')
  ) {
    pairing.status = 'completed';
    pairing.resultRef = 'android-wireless-debugging-pairing-approved';
    pairing.claimedBy = undefined;
  }

  const reboot = options.queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID);
  if (
    options.approveRebootTest &&
    reboot &&
    reboot.status !== 'completed'
  ) {
    grantRebootApproval(reboot);
  }

  options.store.save(options.queue);
  const handler = createAndroidProvisioningHandler(options.ops);
  const events: ExecutionEvent[] = [];

  for (let index = 0; index < (options.maxSteps ?? 100); index += 1) {
    const snapshot = await observeProvisioningTransports(options.ops);
    const resource = hpubuntuProvisioningResource(snapshot);
    const currentReboot = options.queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID);

    if (
      currentReboot &&
      currentReboot.status !== 'completed' &&
      rebootDependenciesComplete(options.queue)
    ) {
      if (!approvalIsPending(currentReboot)) {
        currentReboot.status = 'human-review';
        currentReboot.resultRef =
          'NEEDS REBOOT APPROVAL: one deliberate physical reboot requires one-shot authority';
        currentReboot.claimedBy = undefined;
        persistReviewEvent(options, events, {
          kind: 'review',
          workId: PIXEL_REBOOT_RECOVERY_WORK_ID,
          resourceId: resource.id,
          detail: 'NEEDS REBOOT APPROVAL: resume once with --approve-reboot-test',
        });
        break;
      }

      const missingTransport = waitingTransportDetail(snapshot);
      if (missingTransport) {
        currentReboot.status = 'human-review';
        currentReboot.resultRef =
          `NEEDS TRANSPORT: reboot approval persisted; waiting for ${missingTransport}`;
        currentReboot.claimedBy = undefined;
        persistReviewEvent(options, events, {
          kind: 'review',
          workId: PIXEL_REBOOT_RECOVERY_WORK_ID,
          resourceId: resource.id,
          detail: currentReboot.resultRef,
        });
        break;
      }

      if (
        currentReboot.status === 'human-review' ||
        currentReboot.status === 'failed' ||
        currentReboot.status === 'blocked'
      ) {
        currentReboot.status = 'queued';
        currentReboot.resultRef = undefined;
        currentReboot.claimedBy = undefined;
        options.store.save(options.queue);
      }
    }

    if (
      !snapshot.adbToolAvailable &&
      options.queue.get(PIXEL_INSTALL_WORK_ID)?.status === 'queued' &&
      !options.approveInstall
    ) {
      const gated = options.queue.get(PIXEL_INSTALL_WORK_ID)!;
      gated.status = 'human-review';
      gated.resultRef =
        'NEEDS PRIVILEGE: one-time host helper approval required for allow-listed apt+adb install';
      persistReviewEvent(options, events, {
        kind: 'review',
        workId: PIXEL_INSTALL_WORK_ID,
        resourceId: resource.id,
        detail: 'NEEDS PRIVILEGE: configure/approve the fixed host helper for apt install adb',
      });
      break;
    }

    const coordinator = new WorkCoordinator(
      options.queue,
      new AndroidProvisioningPolicy(),
      options.store,
    );
    const executor = new WorkExecutor(coordinator, handler);
    const event = await executor.step(
      [resource],
      [{ resourceId: resource.id, busy: 0, capacity: 1 }],
    );

    if (
      event.workId === PIXEL_INSTALL_WORK_ID &&
      event.kind === 'failed' &&
      event.detail.startsWith('PRIVILEGE_UNAVAILABLE')
    ) {
      const gated = options.queue.get(PIXEL_INSTALL_WORK_ID)!;
      gated.status = 'human-review';
      gated.resultRef = 'NEEDS PRIVILEGE: fixed helper unavailable or denied; safe to resume';
      event.kind = 'review';
      event.detail = 'NEEDS PRIVILEGE: fixed helper unavailable/denied; resume with --approve-install';
    }

    if (
      event.workId === PIXEL_QUALIFY_ADB_WORK_ID &&
      ['failed', 'retry'].includes(event.kind) &&
      event.detail.startsWith('qualification_failed:transport.adb')
    ) {
      const gated = options.queue.get(PIXEL_QUALIFY_ADB_WORK_ID)!;
      gated.status = 'human-review';
      gated.resultRef = 'NEEDS TRANSPORT: paired Pixel is not currently visible to adb; safe to resume';
      gated.claimedBy = undefined;
      event.kind = 'review';
      event.detail = 'NEEDS TRANSPORT: paired Pixel not currently visible; waiting for fresh evidence';
    }

    if (
      event.workId === PIXEL_INSTALL_TERMUX_BOOT_WORK_ID &&
      ['failed', 'retry'].includes(event.kind)
    ) {
      const gated = options.queue.get(PIXEL_INSTALL_TERMUX_BOOT_WORK_ID)!;
      gated.status = 'human-review';
      gated.resultRef = 'NEEDS DEVICE INSTALL: Termux Boot is not yet observed; safe to resume';
      gated.claimedBy = undefined;
      event.kind = 'review';
      event.detail = 'NEEDS DEVICE INSTALL: check Pixel confirmation and resume';
    }

    if (
      event.workId === PIXEL_INSTALL_BOOT_HOOK_WORK_ID &&
      ['failed', 'retry'].includes(event.kind)
    ) {
      const gated = options.queue.get(PIXEL_INSTALL_BOOT_HOOK_WORK_ID)!;
      gated.status = 'human-review';
      gated.resultRef =
        'NEEDS BOOT HOOK: scoped Termux installer did not produce the verified hook; safe to resume';
      gated.claimedBy = undefined;
      event.kind = 'review';
      event.detail = 'NEEDS BOOT HOOK: scoped Termux install incomplete; resume safely';
    }

    if (event.workId === PIXEL_REBOOT_RECOVERY_WORK_ID) {
      const gated = options.queue.get(PIXEL_REBOOT_RECOVERY_WORK_ID)!;
      if (event.kind === 'completed') {
        consumeRebootApproval(gated, 'reboot-recovery-qualified');
      } else if (event.detail.startsWith('NEEDS TRANSPORT:')) {
        gated.status = 'human-review';
        gated.resultRef =
          `NEEDS TRANSPORT: reboot approval persisted; ${event.detail.slice('NEEDS TRANSPORT: '.length)}`;
        gated.claimedBy = undefined;
        event.kind = 'review';
        event.detail = gated.resultRef;
      } else if (['failed', 'retry'].includes(event.kind)) {
        consumeRebootApproval(gated, event.detail);
        gated.status = 'human-review';
        gated.resultRef =
          `REBOOT RECOVERY UNQUALIFIED: ${event.detail}; fresh one-shot approval is required before another reboot`;
        gated.claimedBy = undefined;
        event.kind = 'review';
        event.detail = gated.resultRef;
      }
    }

    events.push(event);
    options.queue.reconcileDependencies();
    options.store.save(options.queue);
    options.onEvent?.(event);
    if (['idle', 'review', 'failed', 'loop'].includes(event.kind)) break;
  }

  return { events, queue: options.queue };
}

export function provisioningSummary(queue: WorkQueue) {
  queue.reconcileDependencies();
  return queue
    .all()
    .filter(work => work.id.startsWith('android.pixel.provision.'))
    .map(
      work =>
        `${work.status.padEnd(12)} ${work.id}${work.resultRef ? ` ${work.resultRef}` : ''}`,
    )
    .join('\n');
}
