import {capabilityId} from './capabilities.js';
import {AndroidNodeManager} from './android-node.js';
import {ActionFailure, ActionRegistry} from './job-runtime.js';
import type {NodeJobResponse} from './node-client.js';

export const ANDROID_NFC_APPROVAL = 'android.nfc.read-only';
export const NFC_RESULT_SCHEMA = 'agent-control.nfc-inspection/v1';

function failure(error: unknown): never {
  const detail = error instanceof Error ? error.message : String(error);
  const failureClass = /credential|401|403|authentication/.test(detail) ? 'authentication'
    : /not_allowlisted|payload_invalid|timeout_invalid|capability_missing/.test(detail) ? 'policy_rejection'
      : /not_capable|unavailable|offline|timeout/.test(detail) ? 'capability_unavailable'
        : 'execution';
  throw new ActionFailure(detail, failureClass, ['execution', 'capability_unavailable'].includes(failureClass));
}

function bytes(value: unknown) {
  if (!Array.isArray(value) || value.length > 32 || value.some(item => !Number.isSafeInteger(item) || item < 0 || item > 255)) throw new ActionFailure('nfc_identifier_raw_bytes_invalid', 'verification');
  return value as number[];
}
const hex = (value: number[]) => value.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

export function validateNfcInspection(value: unknown) {
  if (!value || typeof value !== 'object') throw new ActionFailure('nfc_result_invalid', 'verification');
  const result = value as any;
  if (result.schema !== NFC_RESULT_SCHEMA || result.policy !== 'read-only') throw new ActionFailure('nfc_read_only_policy_evidence_missing', 'verification');
  if (!result.tag || typeof result.tag !== 'object' || !result.tag.identifier) throw new ActionFailure('nfc_tag_metadata_missing', 'verification');
  const raw = bytes(result.tag.identifier.rawBytes), normal = hex(raw), reversed = hex([...raw].reverse());
  if (result.tag.identifier.hex !== normal || result.tag.identifier.hexReversed !== reversed) throw new ActionFailure('nfc_identifier_normalization_invalid', 'verification');
  if (!Array.isArray(result.tag.technologies) || result.tag.technologies.length > 32 || result.tag.technologies.some((item: unknown) => typeof item !== 'string' || !/^android\.nfc\.tech\.[A-Za-z0-9]+$/.test(item))) throw new ActionFailure('nfc_technology_list_invalid', 'verification');
  const forbidden: string[] = [];
  const walk = (candidate: unknown, trail = 'result') => {
    if (!candidate || typeof candidate !== 'object') return;
    for (const [key, child] of Object.entries(candidate)) {
      if (/apdu|transceive|authenticate|write|emulat|clone|keyRecovery|sectorContents|blockContents/i.test(key)) forbidden.push(`${trail}.${key}`);
      walk(child, `${trail}.${key}`);
    }
  };
  walk(result);
  if (forbidden.length) throw new ActionFailure(`nfc_forbidden_output:${forbidden.join(',')}`, 'verification');
  return result;
}

function result(job: NodeJobResponse) {
  if (job.status !== 'JOB_COMPLETE') throw new ActionFailure(`android_node_job_incomplete:${job.status}`, 'execution', true);
  return job.result;
}

export function registerAndroidNodeActions(manager: AndroidNodeManager, registry = new ActionRegistry()) {
  registry.registerControl('android-node.diagnostic@1.0.0', async context => {
    try {
      const job = await manager.execute(context.worker.id, 'android.system.inspect', {}, context.signal, progress => context.reportProgress(progress.status, progress.status === 'JOB_COMPLETE' ? 'Typed diagnostic result returned' : undefined));
      return {artifacts: [{name: 'result', value: result(job)}], evidence: [`Allow-listed Android diagnostic completed on capability-selected worker ${context.worker.id}`], verification: ['android-typed-job-result-v1'], detail: 'Android typed diagnostic completed'};
    } catch (error) { if (error instanceof ActionFailure) throw error; return failure(error); }
  });
  registry.registerControl('android-node.nfc-inspect@1.0.0', async context => {
    if (!context.run.approvals.includes(ANDROID_NFC_APPROVAL)) throw new ActionFailure('android_nfc_read_only_approval_required', 'policy_rejection');
    if (!context.worker.capabilities.includes(capabilityId.nfcReader) || !context.worker.capabilities.includes(capabilityId.nfcReadOnlyInspect)) throw new ActionFailure('android_node_nfc_capability_missing', 'capability_unavailable');
    try {
      const timeoutMs = Number(context.parameters.timeoutMs ?? 60_000);
      const job = await manager.execute(context.worker.id, 'nfc.inspect_tag', {timeoutMs}, context.signal, progress => {
        const detail = progress.status === 'WAITING_FOR_CARD' ? 'Waiting for one authorised card presentation on the Android device' : undefined;
        context.reportProgress(progress.status, detail);
      });
      const metadata = validateNfcInspection(result(job));
      return {artifacts: [{name: 'result', value: metadata}], evidence: [`Read-only NFC metadata returned by capability-selected worker ${context.worker.id}`, 'Raw identifier bytes retained with forward and reversed hexadecimal normalization'], verification: ['android-nfc-read-only-v1'], detail: 'Safe NFC metadata returned'};
    } catch (error) { if (error instanceof ActionFailure) throw error; return failure(error); }
  });
  return registry;
}
