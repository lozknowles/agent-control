import assert from 'node:assert/strict';
import test from 'node:test';
import {capabilityId} from './capabilities.js';
import {ANDROID_NFC_APPROVAL, registerAndroidNodeActions, validateNfcInspection} from './android-node-actions.js';

const metadata = () => ({schema: 'agent-control.nfc-inspection/v1', policy: 'read-only', observedAt: '2026-08-26T12:00:00Z', tag: {identifier: {rawBytes: [4, 162, 0, 255], hex: '04A200FF', hexReversed: 'FF00A204'}, technologies: ['android.nfc.tech.NfcA'], nfcA: {atqa: {rawBytes: [0, 4], hex: '0004'}, sak: 8, sakHex: '08'}}});

test('NFC result validation preserves raw identifier order and both normalized representations', () => {
  assert.equal(validateNfcInspection(metadata()).tag.identifier.hex, '04A200FF');
  assert.throws(() => validateNfcInspection({...metadata(), tag: {...metadata().tag, identifier: {...metadata().tag.identifier, hexReversed: '04A200FF'}}}), /normalization_invalid/);
});

test('NFC result validation rejects forbidden execution or protected-access evidence', () => {
  assert.throws(() => validateNfcInspection({...metadata(), transceive: {command: '00A4'}}), /nfc_forbidden_output/);
  assert.throws(() => validateNfcInspection({...metadata(), tag: {...metadata().tag, sectorContents: [1, 2, 3]}}), /nfc_forbidden_output/);
});

test('read-only NFC Action requires approval and emits visible waiting progress plus provenance evidence', async () => {
  const progress: string[] = [], manager = {execute: async (_worker: string, type: string, _payload: unknown, _signal: AbortSignal, onProgress: (value: any) => void) => { assert.equal(type, 'nfc.inspect_tag'); onProgress({status: 'WAITING_FOR_CARD'}); onProgress({status: 'CARD_DETECTED'}); return {jobId: 'job', type, status: 'JOB_COMPLETE', result: metadata(), provenance: [{event: 'WAITING_FOR_CARD'}, {event: 'JOB_COMPLETE'}]}; }} as any;
  const registry = registerAndroidNodeActions(manager), handler = registry.handler('android-node.nfc-inspect@1.0.0');
  const context = {run: {approvals: [ANDROID_NFC_APPROVAL]}, worker: {id: 'android-generic', capabilities: [capabilityId.nfcReader, capabilityId.nfcReadOnlyInspect]}, parameters: {timeoutMs: 30000}, signal: new AbortController().signal, reportProgress: (state: string) => progress.push(state)} as any;
  const output = await handler(context);
  assert.deepEqual(progress, ['WAITING_FOR_CARD', 'CARD_DETECTED']);
  assert.deepEqual(output.verification, ['android-nfc-read-only-v1']);
  assert.match(output.evidence?.join(' ') ?? '', /capability-selected worker/);
  await assert.rejects(() => handler({...context, run: {approvals: []}}), /read_only_approval_required/);
});
