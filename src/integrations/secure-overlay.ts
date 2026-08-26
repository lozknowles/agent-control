import {execFile} from 'node:child_process';
import type {AndroidDiscoveryConfig} from '../control/config.js';
import type {SecureOverlayDiscovery, SecureOverlayPeer, SecureOverlayReachability} from '../control/secure-overlay.js';

export interface SecureOverlayCliResult {status: number; stdout: string; stderr: string;}
export type SecureOverlayCli = (command: string, args: string[], timeoutMs: number) => Promise<SecureOverlayCliResult>;

const defaultCli: SecureOverlayCli = (command, args, timeoutMs) => new Promise(resolve => {
  execFile(command, args, {encoding: 'utf8', timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true}, (error, stdout, stderr) => {
    const failure = error as NodeJS.ErrnoException & {code?: string | number};
    resolve({status: error ? typeof failure.code === 'number' ? failure.code : 1 : 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? '')});
  });
});

type StatusPeer = {
  ID?: unknown;
  PublicKey?: unknown;
  DNSName?: unknown;
  HostName?: unknown;
  OS?: unknown;
  Online?: unknown;
  TailscaleIPs?: unknown;
  LastSeen?: unknown;
  Relay?: unknown;
  CurAddr?: unknown;
};

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const addresses = (value: unknown) => Array.isArray(value) ? value.filter(item => typeof item === 'string' && /^[0-9a-f:.]+$/i.test(item)) as string[] : [];

export function parseTailscaleStatus(value: string): SecureOverlayPeer[] {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error('secure_overlay_status_invalid_json'); }
  const peers = (raw as {Peer?: unknown})?.Peer;
  if (!peers || typeof peers !== 'object' || Array.isArray(peers)) return [];
  return Object.entries(peers).map(([key, candidate]) => {
    const peer = candidate as StatusPeer, id = text(peer.ID) ?? text(peer.PublicKey) ?? key;
    if (!id) throw new Error('secure_overlay_peer_identity_missing');
    return {
      id,
      os: text(peer.OS)?.toLowerCase() ?? 'unknown',
      online: peer.Online === true,
      addresses: addresses(peer.TailscaleIPs),
      dnsName: text(peer.DNSName),
      hostName: text(peer.HostName),
      lastSeen: text(peer.LastSeen),
      relay: text(peer.Relay),
      currentAddress: text(peer.CurAddr),
    } satisfies SecureOverlayPeer;
  }).sort((left, right) => left.id.localeCompare(right.id));
}

function latency(output: string) {
  const match = output.match(/\bin\s+([0-9]+(?:\.[0-9]+)?)(ms|s)\b/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? match[2].toLowerCase() === 's' ? value * 1000 : value : undefined;
}

function directOutput(output: string) { return /\bvia\s+(?!DERP\()[^\s]+:\d+\s+in\s+/i.test(output); }
function relayOutput(output: string) { return /\bvia\s+DERP\(([^)]+)\)/i.exec(output)?.[1]; }

export class TailscaleSecureOverlay implements SecureOverlayDiscovery {
  readonly adapter = 'tailscale';
  constructor(readonly command = 'tailscale', readonly cli: SecureOverlayCli = defaultCli, readonly clock: () => Date = () => new Date()) {}

  private async status() {
    const result = await this.cli(this.command, ['status', '--json'], 7000);
    if (result.status !== 0) throw new Error('secure_overlay_status_unavailable');
    return parseTailscaleStatus(result.stdout);
  }

  async discover(platform: string) {
    return (await this.status()).filter(peer => peer.os === platform.toLowerCase());
  }

  async probe(peer: SecureOverlayPeer): Promise<SecureOverlayReachability> {
    const observedAt = this.clock().toISOString();
    if (!peer.online || !peer.addresses.length) return {reachable: false, state: 'OFFLINE', route: 'unknown', peer, observedAt, detail: peer.online ? 'secure-overlay address unavailable' : 'peer reports offline'};
    const target = peer.addresses.find(value => value.includes('.')) ?? peer.addresses[0];
    const result = await this.cli(this.command, ['ping', '--until-direct=false', '--timeout=5s', '-c', '1', target], 7000);
    if (result.status !== 0) return {reachable: false, state: 'OFFLINE', route: 'unknown', peer, observedAt, detail: 'secure-overlay ping failed'};
    let refreshed = peer;
    try { refreshed = (await this.status()).find(candidate => candidate.id === peer.id) ?? peer; } catch { /* Ping success remains authoritative for reachability. */ }
    const fallbackRelay = relayOutput(`${result.stdout}\n${result.stderr}`), isDirect = Boolean(refreshed.currentAddress) || directOutput(result.stdout), relay = refreshed.relay ?? fallbackRelay;
    const route = isDirect ? 'direct' : relay ? 'relay' : 'unknown';
    const state = route === 'direct' ? 'TAILSCALE_DIRECT_REACHABLE' : 'TAILSCALE_RELAY_REACHABLE';
    return {reachable: true, state, route, peer: refreshed, observedAt, latencyMs: latency(result.stdout), relay, detail: route === 'unknown' ? 'reachable; route not reported by structured status' : `${route} path reachable`};
  }
}

export function createSecureOverlayDiscovery(config: AndroidDiscoveryConfig, cli?: SecureOverlayCli, clock?: () => Date): SecureOverlayDiscovery {
  if (config.secureOverlay.adapter !== 'tailscale') throw new Error(`unsupported_secure_overlay_adapter:${config.secureOverlay.adapter}`);
  return new TailscaleSecureOverlay(config.secureOverlay.command ?? 'tailscale', cli, clock);
}
