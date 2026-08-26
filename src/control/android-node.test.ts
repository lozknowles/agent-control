import assert from 'node:assert/strict';
import test from 'node:test';
import {capabilityId} from './capabilities.js';
import {AndroidNodeManager, type AndroidNodeApi} from './android-node.js';
import {WorkerRegistry} from './job-runtime.js';
import type {NodeAdvertisement} from './node-client.js';
import type {SecureOverlayDiscovery, SecureOverlayPeer} from './secure-overlay.js';

const peer: SecureOverlayPeer = {id: 'peer-fixture', os: 'android', online: true, addresses: ['192.0.2.44'], relay: 'region-fixture'};
const config = {enabled: true, credentialEnv: 'ANDROID_NODE_TEST_TOKEN', endpointPort: 8788, probeIntervalSeconds: 10, staleAfterSeconds: 30, jobTimeoutSeconds: 30, secureOverlay: {adapter: 'fixture'}} as const;
const advertisement = (id: string, capabilities: string[]): NodeAdvertisement => ({schema: 'agent-control.resource/v2', identity: {nodeId: id, instanceId: '00000000-0000-4000-8000-000000000001', authenticated: true}, platform: {os: 'android', version: '15', sdk: 35, manufacturer: 'Example', model: 'Model'}, resource: {id, type: 'host', health: 'healthy', capabilities: capabilities.map(value => ({id: value}))}, security: {authority: 'agent-control-executor-only', jobs: 'typed-allowlist', replayProtection: 'request-id-and-timestamp', humanDisable: 'local-control'}});
const caps = [capabilityId.androidSystemInspect, capabilityId.androidTypedJobs, 'device.physical', 'platform.android'];
const overlay = (peers: () => SecureOverlayPeer[] = () => [peer], state = 'TAILSCALE_RELAY_REACHABLE'): SecureOverlayDiscovery => ({adapter: 'fixture', discover: async platform => peers().filter(item => item.os === platform), probe: async value => ({reachable: true, state, route: state.includes('DIRECT') ? 'direct' : 'relay', relay: 'region-fixture', latencyMs: 100, peer: value, observedAt: '2026-08-26T12:00:00Z', detail: 'reachable'})});
const api = (ad: NodeAdvertisement, healthError?: Error): AndroidNodeApi => ({health: async () => { if (healthError) throw healthError; return {status: 'ok', enabled: true}; }, advertisement: async () => ad, run: async (_options, type) => ({jobId: 'job-fixture', type, status: 'JOB_COMPLETE', result: {ok: true}})});

test('reachable Android peer without Agent Control endpoint is not registered as a worker', async () => {
  const workers = new WorkerRegistry(), manager = new AndroidNodeManager(config, workers, overlay(), api(advertisement('android-a', caps), new Error('connection_refused')), {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => new Date('2026-08-26T12:00:00Z'));
  const snapshot = (await manager.poll())[0];
  assert.equal(snapshot.state, 'TAILSCALE_RELAY_REACHABLE');
  assert.equal(snapshot.agentControlCapable, false);
  assert.equal(workers.list().length, 0);
});

test('reachable endpoint without authenticated capability advertisement remains reachable-only', async () => {
  const workers = new WorkerRegistry(), failing = api(advertisement('android-a', caps)); failing.advertisement = async () => { throw new Error('node_http_401:unauthorized'); };
  const manager = new AndroidNodeManager(config, workers, overlay(), failing, {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => new Date('2026-08-26T12:00:00Z'));
  const snapshot = (await manager.poll())[0];
  assert.equal(snapshot.state, 'AGENT_CONTROL_REACHABLE');
  assert.equal(snapshot.endpointReachable, true);
  assert.equal(snapshot.agentControlCapable, false);
});

test('Android endpoint reconnect must repeat health and authenticated capability validation', async () => {
  let ready = false;
  const workers = new WorkerRegistry(), reconnecting: AndroidNodeApi = {health: async () => { if (!ready) throw new Error('connection_refused'); return {status: 'ok', enabled: true}; }, advertisement: async () => advertisement('android-reconnected', caps), run: async () => ({status: 'JOB_COMPLETE'})};
  const manager = new AndroidNodeManager(config, workers, overlay(), reconnecting, {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => new Date('2026-08-26T12:00:00Z'));
  assert.equal((await manager.poll())[0].agentControlCapable, false); assert.equal(workers.list().length, 0);
  ready = true;
  const recovered = (await manager.poll())[0]; assert.equal(recovered.state, 'AGENT_CONTROL_CAPABLE'); assert.equal(workers.list()[0].health, 'healthy');
});

test('authenticated Android identity change fences the previous worker', async () => {
  let resourceId = 'android-before';
  const workers = new WorkerRegistry(), changing: AndroidNodeApi = {health: async () => ({status: 'ok', enabled: true}), advertisement: async () => advertisement(resourceId, caps), run: async () => ({status: 'JOB_COMPLETE'})};
  const manager = new AndroidNodeManager(config, workers, overlay(), changing, {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => new Date('2026-08-26T12:00:00Z'));
  await manager.poll(); resourceId = 'android-after'; await manager.poll();
  assert.equal(workers.list().find(item => item.id === 'android-before')?.health, 'offline');
  assert.equal(workers.list().find(item => item.id === 'android-after')?.health, 'healthy');
});

test('authenticated Android capability registration creates a schedulable typed-job worker', async () => {
  const workers = new WorkerRegistry(), manager = new AndroidNodeManager(config, workers, overlay(), api(advertisement('android-generic', [...caps, 'untrusted.scheduler.authority'])), {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => new Date('2026-08-26T12:00:00Z'));
  const snapshot = (await manager.poll())[0], worker = workers.list()[0];
  assert.equal(snapshot.state, 'AGENT_CONTROL_CAPABLE');
  assert.equal(snapshot.agentControlCapable, true);
  assert.equal(worker.id, 'android-generic');
  assert.equal(worker.capabilities.includes(capabilityId.androidTypedJobs), true);
  assert.equal(worker.capabilities.includes('untrusted.scheduler.authority'), false);
});

test('NFC routing selects only the NFC-capable Android node', async () => {
  const workers = new WorkerRegistry();
  workers.register({id: 'android-without-nfc', capabilities: caps, health: 'healthy', capacity: 1, active: 0, observedAt: new Date().toISOString()});
  const nfcPeer = {...peer, id: 'peer-nfc'}, manager = new AndroidNodeManager(config, workers, overlay(() => [nfcPeer]), api(advertisement('android-with-nfc', [...caps, capabilityId.nfc, capabilityId.nfcReader, capabilityId.nfcReadOnlyInspect])), {ANDROID_NODE_TEST_TOKEN: 'fixture'});
  await manager.poll();
  const resolution = workers.resolve([capabilityId.androidTypedJobs, capabilityId.nfcReader, capabilityId.nfcReadOnlyInspect]);
  assert.equal(resolution.worker?.id, 'android-with-nfc');
  assert.deepEqual(resolution.rationale.rejected.find(item => item.workerId === 'android-without-nfc')?.reasons.sort(), [`missing:${capabilityId.nfcReadOnlyInspect}`, `missing:${capabilityId.nfcReader}`].sort());
});

test('stale Android capability is immediately fenced and later classified offline', async () => {
  let currentPeers = [peer], current = new Date('2026-08-26T12:00:00Z');
  const workers = new WorkerRegistry(), manager = new AndroidNodeManager(config, workers, overlay(() => currentPeers), api(advertisement('android-stale', caps)), {ANDROID_NODE_TEST_TOKEN: 'fixture'}, () => current);
  await manager.poll(); assert.equal(workers.resolve([capabilityId.androidTypedJobs], current).worker?.id, 'android-stale');
  currentPeers = []; current = new Date('2026-08-26T12:00:10Z');
  assert.equal((await manager.poll())[0].health, 'degraded');
  assert.equal(workers.resolve([capabilityId.androidTypedJobs], current).worker, undefined);
  current = new Date('2026-08-26T12:00:31Z');
  assert.equal((await manager.poll())[0].state, 'OFFLINE');
});

test('typed Android dispatch rejects arbitrary jobs and malformed NFC payloads', async () => {
  const workers = new WorkerRegistry(), manager = new AndroidNodeManager(config, workers, overlay(), api(advertisement('android-nfc', [...caps, capabilityId.nfcReader, capabilityId.nfcReadOnlyInspect])), {ANDROID_NODE_TEST_TOKEN: 'fixture'});
  await manager.poll();
  await assert.rejects(() => manager.execute('android-nfc', 'android.shell' as any, {}), /not_allowlisted/);
  await assert.rejects(() => manager.execute('android-nfc', 'nfc.inspect_tag', {apdu: '00A4'}), /payload_invalid/);
  await assert.rejects(() => manager.execute('android-nfc', 'nfc.inspect_tag', {timeoutMs: 999999}), /timeout_invalid/);
});
