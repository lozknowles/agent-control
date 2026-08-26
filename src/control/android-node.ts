import type {AndroidDiscoveryConfig} from './config.js';
import {capabilityId} from './capabilities.js';
import type {WorkerRegistry} from './job-runtime.js';
import {fetchNodeAdvertisement, fetchNodeHealth, runNodeJob, type NodeAdvertisement, type NodeClientOptions, type NodeJobResponse} from './node-client.js';
import type {SecureOverlayDiscovery, SecureOverlayPeer, SecureOverlayReachability} from './secure-overlay.js';

export const ANDROID_NODE_SCHEMA = 'agent-control.android-node/v1' as const;
export const ANDROID_NODE_ALLOWED_JOBS = ['android.system.inspect', 'nfc.inspect_tag'] as const;
export type AndroidTypedJob = typeof ANDROID_NODE_ALLOWED_JOBS[number];

const CAPABILITY_ALLOWLIST = new Set([
  'platform.android',
  'device.physical',
  capabilityId.androidTypedJobs,
  capabilityId.androidSystemInspect,
  capabilityId.nfc,
  capabilityId.nfcReader,
  capabilityId.nfcReadOnlyInspect,
  'observe.android.logcat',
]);
const REQUIRED_CAPABILITIES = ['platform.android', capabilityId.androidTypedJobs, capabilityId.androidSystemInspect];
const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AndroidNodeSnapshot {
  schema: typeof ANDROID_NODE_SCHEMA;
  peerId: string;
  peerName?: string;
  resourceId?: string;
  state: string;
  networkState: string;
  health: 'unknown' | 'healthy' | 'degraded' | 'offline';
  route: 'direct' | 'relay' | 'unknown';
  latencyMs?: number;
  relay?: string;
  endpoint?: string;
  endpointReachable: boolean;
  agentControlCapable: boolean;
  platform?: NodeAdvertisement['platform'];
  capabilities: string[];
  lastSeenAt?: string;
  lastCapabilityAt?: string;
  lastProbeAt: string;
  capabilityExpiresAt?: string;
  detail: string;
  failures: string[];
}

export interface AndroidNodeApi {
  health(options: NodeClientOptions): ReturnType<typeof fetchNodeHealth>;
  advertisement(options: NodeClientOptions): ReturnType<typeof fetchNodeAdvertisement>;
  run(options: NodeClientOptions, type: string, payload: Record<string, unknown>, run: {timeoutMs: number; signal?: AbortSignal; onProgress?: (job: NodeJobResponse) => void}): Promise<NodeJobResponse>;
}

const defaultApi: AndroidNodeApi = {
  health: fetchNodeHealth,
  advertisement: fetchNodeAdvertisement,
  run: runNodeJob,
};

const unique = (values: string[]) => [...new Set(values)].sort();
const safeError = (error: unknown) => String(error instanceof Error ? error.message : error).replace(/[\r\n\0]+/g, ' ').slice(0, 240) || 'unknown_error';
const bracket = (address: string) => address.includes(':') ? `[${address}]` : address;

function endpoint(config: AndroidDiscoveryConfig, peer: SecureOverlayPeer) {
  const address = peer.addresses.find(value => value.includes('.')) ?? peer.addresses[0];
  if (!address) return undefined;
  return `${config.endpointProtocol ?? 'http'}://${bracket(address)}:${config.endpointPort ?? 8788}`;
}

function approvedCapabilities(advertisement: NodeAdvertisement) {
  if (!Array.isArray(advertisement.resource?.capabilities) || advertisement.resource.capabilities.length > 64) throw new Error('android_node_capability_advertisement_invalid');
  const values: string[] = [];
  for (const capability of advertisement.resource.capabilities) {
    if (!capability || typeof capability.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(capability.id)) throw new Error('android_node_capability_id_invalid');
    if (CAPABILITY_ALLOWLIST.has(capability.id)) values.push(capability.id);
  }
  return unique(values);
}

function validateAdvertisement(advertisement: NodeAdvertisement) {
  if (advertisement.schema !== 'agent-control.resource/v2') throw new Error('android_node_schema_invalid');
  if (!advertisement.resource || !ID.test(advertisement.resource.id)) throw new Error('android_node_identity_invalid');
  if (advertisement.platform?.os !== 'android') throw new Error('android_node_platform_invalid');
  if (advertisement.identity?.authenticated !== true || advertisement.identity.nodeId !== advertisement.resource.id || !UUID.test(advertisement.identity.instanceId ?? '')) throw new Error('android_node_authenticated_identity_missing');
  if (advertisement.security?.authority !== 'agent-control-executor-only') throw new Error('android_node_authority_boundary_missing');
  if (advertisement.security.jobs !== 'typed-allowlist' || advertisement.security.replayProtection !== 'request-id-and-timestamp' || !advertisement.security.humanDisable) throw new Error('android_node_security_boundary_missing');
  if (!['healthy', 'degraded', 'offline'].includes(advertisement.resource.health ?? '')) throw new Error('android_node_health_invalid');
  const capabilities = approvedCapabilities(advertisement);
  for (const required of REQUIRED_CAPABILITIES) if (!capabilities.includes(required)) throw new Error(`android_node_required_capability_missing:${required}`);
  return capabilities;
}

export class AndroidNodeManager {
  private readonly snapshots = new Map<string, AndroidNodeSnapshot>();
  private readonly timers = new Set<NodeJS.Timeout>();
  constructor(
    readonly config: AndroidDiscoveryConfig | undefined,
    readonly workers: WorkerRegistry,
    readonly overlay: SecureOverlayDiscovery | undefined,
    readonly api: AndroidNodeApi = defaultApi,
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  enabled() { return Boolean(this.config?.enabled !== false && this.config && this.overlay); }
  list() { return [...this.snapshots.values()].map(snapshot => structuredClone(snapshot)).sort((left, right) => left.peerId.localeCompare(right.peerId)); }
  get(id: string) { const snapshot = this.snapshots.get(id) ?? this.list().find(item => item.resourceId === id); return snapshot ? structuredClone(snapshot) : undefined; }

  async poll() {
    if (!this.enabled()) return this.list();
    const at = this.clock().toISOString();
    let peers: SecureOverlayPeer[];
    try { peers = await this.overlay!.discover('android'); }
    catch (error) { return this.expireUnseen(new Set(), at, `discovery:${safeError(error)}`); }
    const seen = new Set<string>(), claimed = new Map<string, string>();
    for (const peer of peers) {
      seen.add(peer.id);
      const snapshot = await this.probePeer(peer, at);
      if (snapshot.resourceId) {
        const owner = claimed.get(snapshot.resourceId);
        if (owner && owner !== peer.id) {
          snapshot.agentControlCapable = false;
          snapshot.health = 'degraded';
          snapshot.state = 'AGENT_CONTROL_REACHABLE';
          snapshot.failures.push('authenticated_resource_identity_collision');
          this.markWorker(snapshot.resourceId, snapshot, []);
        } else claimed.set(snapshot.resourceId, peer.id);
      }
      this.snapshots.set(peer.id, snapshot);
    }
    return this.expireUnseen(seen, at);
  }

  async execute(resourceId: string, type: AndroidTypedJob, payload: Record<string, unknown>, signal?: AbortSignal, onProgress?: (job: NodeJobResponse) => void) {
    if (!ANDROID_NODE_ALLOWED_JOBS.includes(type)) throw new Error('android_node_job_not_allowlisted');
    const snapshot = this.list().find(item => item.resourceId === resourceId);
    if (!snapshot || !snapshot.agentControlCapable || snapshot.state !== 'AGENT_CONTROL_CAPABLE' || !snapshot.endpoint) throw new Error('android_node_not_capable');
    if (type === 'nfc.inspect_tag' && (!snapshot.capabilities.includes(capabilityId.nfcReader) || !snapshot.capabilities.includes(capabilityId.nfcReadOnlyInspect))) throw new Error('android_node_nfc_capability_missing');
    const normalized = this.normalizePayload(type, payload), token = this.token();
    if (!token) throw new Error('android_node_credential_unavailable');
    return this.api.run({baseUrl: snapshot.endpoint, token, resource: resourceId, timeoutMs: 5000}, type, normalized, {timeoutMs: (this.config?.jobTimeoutSeconds ?? 120) * 1000, signal, onProgress});
  }

  start(onChange?: (snapshot: AndroidNodeSnapshot) => void) {
    if (!this.enabled()) return () => undefined;
    const poll = () => void this.poll().then(snapshots => snapshots.forEach(snapshot => onChange?.(snapshot)));
    poll();
    const timer = setInterval(poll, (this.config?.probeIntervalSeconds ?? 30) * 1000); timer.unref(); this.timers.add(timer);
    return () => this.stop();
  }
  stop() { for (const timer of this.timers) clearInterval(timer); this.timers.clear(); }

  private token() { return this.config?.credentialEnv ? this.environment[this.config.credentialEnv] ?? '' : ''; }
  private normalizePayload(type: AndroidTypedJob, payload: Record<string, unknown>) {
    const keys = Object.keys(payload);
    if (type === 'android.system.inspect') {
      if (keys.length) throw new Error('android_node_diagnostic_payload_invalid');
      return {};
    }
    if (keys.some(key => key !== 'timeoutMs')) throw new Error('android_node_nfc_payload_invalid');
    const timeoutMs = Number(payload.timeoutMs ?? (this.config?.jobTimeoutSeconds ?? 120) * 1000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 5000 || timeoutMs > 120000) throw new Error('android_node_nfc_timeout_invalid');
    return {timeoutMs};
  }

  private async probePeer(peer: SecureOverlayPeer, at: string): Promise<AndroidNodeSnapshot> {
    const previous = this.snapshots.get(peer.id);
    let reachability: SecureOverlayReachability;
    try { reachability = await this.overlay!.probe(peer); }
    catch (error) { reachability = {reachable: false, state: 'OFFLINE', route: 'unknown', peer, observedAt: at, detail: safeError(error)}; }
    const base: AndroidNodeSnapshot = {schema: ANDROID_NODE_SCHEMA, peerId: peer.id, peerName: peer.dnsName ?? peer.hostName, resourceId: previous?.resourceId, state: reachability.state, networkState: reachability.state, health: reachability.reachable ? 'degraded' : 'offline', route: reachability.route, latencyMs: reachability.latencyMs, relay: reachability.relay, endpointReachable: false, agentControlCapable: false, capabilities: previous?.capabilities ?? [], lastSeenAt: reachability.reachable ? at : previous?.lastSeenAt, lastCapabilityAt: previous?.lastCapabilityAt, lastProbeAt: at, capabilityExpiresAt: previous?.capabilityExpiresAt, detail: reachability.detail, failures: []};
    if (!reachability.reachable) { if (base.resourceId) this.markWorker(base.resourceId, base, base.capabilities); return base; }
    const baseUrl = endpoint(this.config!, reachability.peer);
    if (!baseUrl) { base.failures.push('secure_overlay_peer_address_missing'); if (base.resourceId) this.markWorker(base.resourceId, base, base.capabilities); return base; }
    base.endpoint = baseUrl;
    try {
      const health = await this.api.health({baseUrl, token: '', timeoutMs: 3000});
      if (health.status !== 'ok' || health.enabled === false) throw new Error('android_node_health_not_ready');
      base.endpointReachable = true;
      base.state = 'AGENT_CONTROL_REACHABLE';
      base.detail = 'authenticated Agent Control capability check pending';
    } catch (error) { base.failures.push(`endpoint:${safeError(error)}`); if (base.resourceId) this.markWorker(base.resourceId, base, base.capabilities); return base; }
    const token = this.token();
    if (!token) { base.failures.push('credential:android_node_credential_unavailable'); if (base.resourceId) this.markWorker(base.resourceId, base, base.capabilities); return base; }
    try {
      const advertisement = await this.api.advertisement({baseUrl, token, timeoutMs: 5000});
      const capabilities = validateAdvertisement(advertisement), expiry = new Date(this.clock().getTime() + (this.config?.staleAfterSeconds ?? 90) * 1000).toISOString();
      if (base.resourceId && base.resourceId !== advertisement.resource.id) {
        const retired: AndroidNodeSnapshot = {...base, resourceId: base.resourceId, state: 'OFFLINE', health: 'offline', endpointReachable: false, agentControlCapable: false, detail: 'authenticated Android identity changed; previous worker fenced', failures: unique([...base.failures, 'authenticated_resource_identity_changed'])};
        this.markWorker(base.resourceId, retired, base.capabilities);
      }
      base.resourceId = advertisement.resource.id;
      base.platform = structuredClone(advertisement.platform);
      base.capabilities = unique([...capabilities, capabilityId.secureOverlay]);
      base.capabilityExpiresAt = expiry;
      base.lastCapabilityAt = at;
      base.agentControlCapable = advertisement.resource.health === 'healthy';
      base.state = base.agentControlCapable ? 'AGENT_CONTROL_CAPABLE' : 'AGENT_CONTROL_REACHABLE';
      base.health = base.agentControlCapable ? 'healthy' : 'degraded';
      base.detail = base.agentControlCapable ? 'authenticated typed-job endpoint and capability advertisement validated' : 'authenticated endpoint reports non-healthy resource';
      this.markWorker(base.resourceId, base, base.capabilities);
      return base;
    } catch (error) { base.failures.push(`capability:${safeError(error)}`); if (base.resourceId) this.markWorker(base.resourceId, base, base.capabilities); return base; }
  }

  private expireUnseen(seen: Set<string>, at: string, failure?: string) {
    const staleMs = (this.config?.staleAfterSeconds ?? 90) * 1000;
    for (const [peerId, previous] of this.snapshots) {
      if (seen.has(peerId)) continue;
      const expired = !previous.lastSeenAt || this.clock().getTime() - Date.parse(previous.lastSeenAt) > staleMs;
      const snapshot: AndroidNodeSnapshot = {...previous, state: expired ? 'OFFLINE' : previous.networkState, health: expired ? 'offline' : 'degraded', endpointReachable: false, agentControlCapable: false, lastProbeAt: at, detail: expired ? 'secure-overlay discovery is stale or peer is offline' : 'peer not present in latest discovery; retained only as degraded evidence', failures: unique([...previous.failures, failure ?? 'discovery:peer_not_seen'])};
      this.snapshots.set(peerId, snapshot);
      if (snapshot.resourceId) this.markWorker(snapshot.resourceId, snapshot, previous.capabilities);
    }
    return this.list();
  }

  private markWorker(resourceId: string, snapshot: AndroidNodeSnapshot, capabilities: string[]) {
    const expiry = snapshot.capabilityExpiresAt;
    this.workers.upsert({id: resourceId, capabilities: [...capabilities], health: snapshot.health, capacity: 1, active: 0, capabilityExpiresAt: expiry ? Object.fromEntries(capabilities.map(capability => [capability, expiry])) : undefined, labels: {platform: 'android', adapter: 'typed-jobs', nodeState: snapshot.state, route: snapshot.route}, observedAt: snapshot.lastProbeAt});
  }
}
