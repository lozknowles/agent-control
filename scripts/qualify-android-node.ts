import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {ANDROID_NFC_APPROVAL} from '../src/control/android-node-actions.js';
import {loadConfig} from '../src/control/config.js';
import {buildJobRuntime} from '../src/control/job-bootstrap.js';

const arguments_ = process.argv.slice(2), armNfc = arguments_.includes('--arm-nfc');
const outputArgument = arguments_.find(value => value.startsWith('--output='))?.slice('--output='.length);
const outputFile = path.resolve(outputArgument ?? path.join('qualification-results', `android-node-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
const hash = (value: string | undefined) => value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : undefined;
const summarizeRun = (run: any) => run && typeof run === 'object' ? {runId: run.id, jobId: run.jobId, status: run.status, selectedWorkerRefs: (run.selectedWorkers ?? []).map((value: string) => hash(value)), steps: (run.steps ?? []).map((step: any) => ({id: step.id, action: step.action, status: step.status, waitingReason: step.waitingReason, progress: step.progress, attempts: (step.attempts ?? []).map((attempt: any) => ({attempt: attempt.attempt, outcome: attempt.outcome, errorClass: attempt.errorClass}))})), errors: run.errors ?? [], provenance: (run.provenance ?? []).map((item: any) => ({type: item.type, at: item.at}))} : run;
const git = (args: string[], fallback: string) => { try { return execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return fallback; } };
const config = loadConfig();
if (!config.androidDiscovery) throw new Error('android_discovery_unconfigured');
const runtime = buildJobRuntime(config), startedAt = new Date().toISOString(), snapshots = await runtime.androidNodes.poll();
const capable = snapshots.filter(snapshot => snapshot.agentControlCapable), actions: Array<{at: string; action: string; result: string}> = [{at: new Date().toISOString(), action: 'discover.secure-overlay.android', result: `${snapshots.length} Android peer(s)`}];

let diagnostic: unknown;
if (capable.length) {
  const run = runtime.createRun('android-node-diagnostic@1.0.0', {}, {type: 'manual', actor: 'android-node-qualification'}); await runtime.tick(); diagnostic = runtime.ledger.get(run.id); actions.push({at: new Date().toISOString(), action: 'android.system.inspect', result: String((diagnostic as any)?.status)});
} else diagnostic = {status: 'NOT_DISPATCHED', reason: 'No authenticated capable Android worker'};

let nfc: unknown = {status: armNfc ? 'NOT_DISPATCHED' : 'NOT_ARMED', reason: armNfc ? 'No NFC-capable authenticated Android worker' : 'Explicit --arm-nfc was not supplied'};
if (armNfc && capable.some(snapshot => snapshot.capabilities.includes('device.nfc.reader') && snapshot.capabilities.includes('nfc.inspect.read_only'))) {
  const run = runtime.createRun('android-nfc-inspection@1.0.0', {}, {type: 'manual', actor: 'android-node-qualification'});
  await runtime.tick(); runtime.approve(run.id, ANDROID_NFC_APPROVAL); const execution = runtime.tick();
  for (let count = 0; count < 100; count++) { const current = runtime.ledger.get(run.id); if (current?.steps[0].status === 'WAITING_FOR_CARD' || ['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEGRADED'].includes(current?.status ?? '')) break; await new Promise(resolve => setTimeout(resolve, 50)); }
  nfc = runtime.ledger.get(run.id); actions.push({at: new Date().toISOString(), action: 'nfc.inspect_tag', result: String((nfc as any)?.steps?.[0]?.status ?? (nfc as any)?.status)});
  if ((nfc as any)?.steps?.[0]?.status === 'WAITING_FOR_CARD') { runtime.cancel(run.id, 'qualification_observation_complete_no_card_presented'); await execution; nfc = {...runtime.ledger.get(run.id), observedWaitingForCard: true}; } else await execution;
}

const redacted = snapshots.map(snapshot => ({peerRef: hash(snapshot.peerId), resourceRef: hash(snapshot.resourceId), state: snapshot.state, networkState: snapshot.networkState, health: snapshot.health, route: snapshot.route, latencyMs: snapshot.latencyMs, relay: snapshot.relay, endpointReachable: snapshot.endpointReachable, agentControlCapable: snapshot.agentControlCapable, platform: snapshot.platform ? {os: snapshot.platform.os, version: snapshot.platform.version, sdk: snapshot.platform.sdk} : undefined, capabilities: snapshot.capabilities, lastSeenAt: snapshot.lastSeenAt, lastCapabilityAt: snapshot.lastCapabilityAt, lastProbeAt: snapshot.lastProbeAt, detail: snapshot.detail, failures: snapshot.failures}));
const cardPresented = (nfc as any)?.status === 'SUCCEEDED', nfcCapable = capable.some(snapshot => snapshot.capabilities.includes('device.nfc.reader') && snapshot.capabilities.includes('nfc.inspect.read_only'));
const verdicts = [...(snapshots.length ? ['ANDROID_DISCOVERY_PASS'] : ['ANDROID_DISCOVERY_FAIL']), ...(capable.length ? ['ANDROID_AGENT_CONTROL_PASS'] : ['ANDROID_AGENT_CONTROL_FAIL', 'ANDROID_NODE_ADAPTER_PARTIAL']), ...(redacted.some(item => item.route === 'relay') ? ['DERP_REACHABILITY_FIXED'] : []), ...(nfcCapable ? ['ANDROID_NFC_CAPABILITY_PASS'] : []), ...((nfc as any)?.observedWaitingForCard ? ['ANDROID_NFC_WAITING_FOR_CARD'] : []), ...(cardPresented ? ['ANDROID_NFC_READ_PASS'] : ['INSUFFICIENT_EVIDENCE'])];
const evidence = {schema: 'agent-control.android-node-qualification/v1', startedAt, completedAt: new Date().toISOString(), source: {branch: git(['branch', '--show-current'], 'unknown'), commit: git(['rev-parse', 'HEAD'], 'unknown'), worktreeDirty: git(['status', '--porcelain'], '') !== ''}, policy: {readOnlyNfcOnly: true, arbitraryShell: false, cardPresented, armNfc}, discovery: redacted, actions, diagnostic: summarizeRun(diagnostic), nfc: summarizeRun(nfc), verdicts};
fs.mkdirSync(path.dirname(outputFile), {recursive: true}); fs.writeFileSync(outputFile, `${JSON.stringify(evidence, null, 2)}\n`, {mode: 0o600});
process.stdout.write(`${JSON.stringify({outputFile, discoveredAndroidPeers: snapshots.length, capableAndroidNodes: capable.length, verdicts: evidence.verdicts})}\n`);
if (!capable.length) process.exitCode = 2;
