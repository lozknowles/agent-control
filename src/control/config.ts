import fs from 'node:fs';
import path from 'node:path';

export type Platform = 'linux' | 'windows' | 'android' | 'macos' | 'remote' | 'unknown';
export type TransportType = 'local' | 'ssh' | 'http' | 'orca';

export interface TransportConfig {
  type: TransportType;
  host?: string;
  port?: number;
  user?: string;
  identityFile?: string;
  baseUrl?: string;
}

export interface AndroidNodeConfig {
  localHealthUrl?: string;
  remoteHealthUrl?: string;
  remoteDirectory?: string;
  startCommand?: string;
  credentialEnv?: string;
}

export interface ResourceConfig {
  id: string;
  name?: string;
  platform: Platform;
  transport: TransportConfig;
  capabilities: string[];
  harnesses?: string[];
  controller?: boolean;
  healthUrl?: string;
  android?: AndroidNodeConfig;
  metadata?: Record<string, string | number | boolean>;
}

export interface ProviderConfig {
  id: string;
  name?: string;
  kind: 'local' | 'responses' | 'cli' | 'browser-bridge';
  baseUrl?: string;
  wireApi?: 'responses';
  requiresAuth?: boolean;
  parallelism?: number;
  costClass?: 'free' | 'included' | 'metered';
  capabilities?: string[];
  qualificationModel?: string;
}

export interface ServiceConfig {
  id: string;
  healthUrl: string;
  optional?: boolean;
  start?:
    | {type: 'systemd-user'; unit: string}
    | {type: 'command'; command: string; args?: string[]};
}

export interface LaneConfig {
  id: number;
  name: string;
  cwd?: string;
  priority?: number;
  mode?: 'auto' | 'manual';
}

export interface AgentControlConfig {
  schemaVersion: 1;
  resources: ResourceConfig[];
  providers: ProviderConfig[];
  services: ServiceConfig[];
  lanes: LaneConfig[];
}

export const emptyConfig = (): AgentControlConfig => ({
  schemaVersion: 1,
  resources: [],
  providers: [],
  services: [],
  lanes: [],
});

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const allowedSchemes = new Set(['http:', 'https:']);

function assertId(value: unknown, label: string) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`invalid_${label}_id`);
}

function assertUrl(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`invalid_${label}_url`);
  const parsed = new URL(value);
  if (!allowedSchemes.has(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(`invalid_${label}_url`);
  }
}

function rejectSecrets(value: unknown, trail = 'config') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/token|password|secret|api.?key/i.test(key) && key !== 'credentialEnv') {
      throw new Error(`secret_material_forbidden:${trail}.${key}`);
    }
    rejectSecrets(child, `${trail}.${key}`);
  }
}

export function validateConfig(raw: unknown): AgentControlConfig {
  if (!raw || typeof raw !== 'object') throw new Error('config_must_be_object');
  rejectSecrets(raw);
  const input = raw as Partial<AgentControlConfig>;
  if (input.schemaVersion !== 1) throw new Error('unsupported_config_schema');
  const config: AgentControlConfig = {
    schemaVersion: 1,
    resources: input.resources ?? [],
    providers: input.providers ?? [],
    services: input.services ?? [],
    lanes: input.lanes ?? [],
  };
  for (const key of ['resources', 'providers', 'services', 'lanes'] as const) {
    if (!Array.isArray(config[key])) throw new Error(`invalid_config_${key}`);
  }
  const ids = new Set<string>();
  for (const resource of config.resources) {
    assertId(resource.id, 'resource');
    if (ids.has(resource.id)) throw new Error(`duplicate_id:${resource.id}`);
    ids.add(resource.id);
    if (!['linux', 'windows', 'android', 'macos', 'remote', 'unknown'].includes(resource.platform)) throw new Error(`invalid_platform:${resource.id}`);
    if (!resource.transport || !['local', 'ssh', 'http', 'orca'].includes(resource.transport.type)) throw new Error(`invalid_transport:${resource.id}`);
    if (resource.transport.type === 'ssh' && !resource.transport.host) throw new Error(`ssh_host_required:${resource.id}`);
    if (resource.transport.type === 'http') assertUrl(resource.transport.baseUrl, `transport_${resource.id}`);
    if (resource.healthUrl) assertUrl(resource.healthUrl, `resource_${resource.id}`);
    if (!Array.isArray(resource.capabilities)) throw new Error(`invalid_capabilities:${resource.id}`);
  }
  for (const provider of config.providers) {
    assertId(provider.id, 'provider');
    if (ids.has(provider.id)) throw new Error(`duplicate_id:${provider.id}`);
    ids.add(provider.id);
    if (provider.baseUrl) assertUrl(provider.baseUrl, `provider_${provider.id}`);
  }
  for (const service of config.services) {
    assertId(service.id, 'service');
    if (ids.has(service.id)) throw new Error(`duplicate_id:${service.id}`);
    ids.add(service.id);
    assertUrl(service.healthUrl, `service_${service.id}`);
    if (service.start?.type === 'systemd-user' && !service.start.unit) throw new Error(`systemd_unit_required:${service.id}`);
    if (service.start?.type === 'command' && !service.start.command) throw new Error(`start_command_required:${service.id}`);
  }
  const laneIds = new Set<number>();
  for (const lane of config.lanes) {
    if (!Number.isSafeInteger(lane.id) || lane.id < 1 || laneIds.has(lane.id)) throw new Error('invalid_lane_id');
    laneIds.add(lane.id);
    if (!lane.name?.trim()) throw new Error(`lane_name_required:${lane.id}`);
  }
  return config;
}

export function configPath(environment: NodeJS.ProcessEnv = process.env, cwd = process.cwd()) {
  return path.resolve(environment.AGENT_CONTROL_CONFIG || path.join(environment.AGENT_CONTROL_STATE_DIR || path.join(cwd, '.agent-control'), 'config.json'));
}

export function loadConfig(file = configPath()): AgentControlConfig {
  if (!fs.existsSync(file)) return emptyConfig();
  return validateConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
}

export function expandUserPath(value: string | undefined, home = process.env.HOME || process.env.USERPROFILE || '') {
  return value?.replace(/^~(?=$|[\\/])/, home);
}
