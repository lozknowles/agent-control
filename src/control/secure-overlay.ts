export type SecureOverlayRoute = 'direct' | 'relay' | 'unknown';

export interface SecureOverlayPeer {
  id: string;
  os: string;
  online: boolean;
  addresses: string[];
  dnsName?: string;
  hostName?: string;
  lastSeen?: string;
  relay?: string;
  currentAddress?: string;
}

export interface SecureOverlayReachability {
  reachable: boolean;
  state: string;
  route: SecureOverlayRoute;
  latencyMs?: number;
  relay?: string;
  peer: SecureOverlayPeer;
  observedAt: string;
  detail: string;
}

export interface SecureOverlayDiscovery {
  readonly adapter: string;
  discover(platform: string): Promise<SecureOverlayPeer[]>;
  probe(peer: SecureOverlayPeer): Promise<SecureOverlayReachability>;
}
