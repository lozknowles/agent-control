import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const emptyConfig = () => ({schemaVersion: 1, resources: [], providers: [], services: [], lanes: []});
const idPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function rejectSecrets(value, trail = 'config') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/token|password|secret|api.?key/i.test(key) && key !== 'credentialEnv') throw new Error(`secret_material_forbidden:${trail}.${key}`);
    rejectSecrets(child, `${trail}.${key}`);
  }
}

function validateUrl(value, label) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`invalid_${label}_url`);
}

export function validateConfig(raw) {
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 1) throw new Error('unsupported_config_schema');
  rejectSecrets(raw);
  const config = {...emptyConfig(), ...raw};
  for (const key of ['resources', 'providers', 'services', 'lanes']) if (!Array.isArray(config[key])) throw new Error(`invalid_config_${key}`);
  const ids = new Set();
  for (const [kind, entries] of [['resource', config.resources], ['provider', config.providers], ['service', config.services]]) {
    for (const entry of entries) {
      if (!idPattern.test(entry.id ?? '')) throw new Error(`invalid_${kind}_id`);
      if (ids.has(entry.id)) throw new Error(`duplicate_id:${entry.id}`);
      ids.add(entry.id);
    }
  }
  for (const resource of config.resources) {
    if (!resource.transport || !['local', 'ssh', 'http', 'orca'].includes(resource.transport.type)) throw new Error(`invalid_transport:${resource.id}`);
    if (resource.transport.type === 'ssh' && !resource.transport.host) throw new Error(`ssh_host_required:${resource.id}`);
    if (resource.transport.type === 'http') validateUrl(resource.transport.baseUrl, `transport_${resource.id}`);
    if (resource.healthUrl) validateUrl(resource.healthUrl, `resource_${resource.id}`);
  }
  if (config.androidDiscovery !== undefined) {
    const discovery = config.androidDiscovery;
    if (!discovery || typeof discovery !== 'object') throw new Error('invalid_android_discovery');
    if (!/^[A-Z][A-Z0-9_]{1,127}$/.test(discovery.credentialEnv ?? '')) throw new Error('invalid_android_discovery_credential_env');
    if (!discovery.secureOverlay || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(discovery.secureOverlay.adapter ?? '')) throw new Error('invalid_android_discovery_overlay_adapter');
    if (discovery.secureOverlay.command !== undefined && !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(discovery.secureOverlay.command)) throw new Error('invalid_android_discovery_overlay_command');
    if (discovery.endpointProtocol !== undefined && !['http', 'https'].includes(discovery.endpointProtocol)) throw new Error('invalid_android_discovery_endpoint_protocol');
    for (const [key, minimum, maximum] of [['endpointPort', 1024, 65535], ['probeIntervalSeconds', 5, 3600], ['staleAfterSeconds', 10, 86400], ['jobTimeoutSeconds', 5, 600]]) {
      const value = discovery[key];
      if (value !== undefined && (!Number.isSafeInteger(value) || value < minimum || value > maximum)) throw new Error(`invalid_android_discovery_${key}`);
    }
    if (discovery.probeIntervalSeconds && discovery.staleAfterSeconds && discovery.staleAfterSeconds <= discovery.probeIntervalSeconds) throw new Error('android_discovery_stale_after_probe');
  }
  for (const provider of config.providers) if (provider.baseUrl) validateUrl(provider.baseUrl, `provider_${provider.id}`);
  for (const service of config.services) validateUrl(service.healthUrl, `service_${service.id}`);
  return config;
}

export function resolveConfigPath(environment = process.env, cwd = process.cwd()) {
  return path.resolve(environment.AGENT_CONTROL_CONFIG || path.join(environment.AGENT_CONTROL_STATE_DIR || path.join(cwd, '.agent-control'), 'config.json'));
}

export function loadConfig({environment = process.env, cwd = process.cwd(), file = resolveConfigPath(environment, cwd)} = {}) {
  if (!fs.existsSync(file)) return {config: emptyConfig(), file, configured: false};
  return {config: validateConfig(JSON.parse(fs.readFileSync(file, 'utf8'))), file, configured: true};
}

function emptyCollections(config) {
  return ['resources', 'providers', 'services', 'lanes'].every(key => config[key].length === 0);
}

/**
 * Create the smallest safe configuration without discovering infrastructure or
 * overwriting operator state. The completed temporary file is linked into place
 * atomically; link creation fails when another writer already created the target.
 */
export function initializeConfig({environment = process.env, cwd = process.cwd(), file = resolveConfigPath(environment, cwd)} = {}) {
  const target = path.resolve(file);
  if (fs.existsSync(target)) {
    const config = validateConfig(JSON.parse(fs.readFileSync(target, 'utf8')));
    return {result: emptyCollections(config) ? 'UNCHANGED_EMPTY' : 'PRESERVED_EXISTING', created: false, file: target, config};
  }

  const directory = path.dirname(target);
  fs.mkdirSync(directory, {recursive: true});
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const config = emptyConfig();
  const payload = `${JSON.stringify(config, null, 2)}\n`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, payload, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    try {
      fs.linkSync(temporary, target);
      return {result: 'CREATED', created: true, file: target, config};
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const existing = validateConfig(JSON.parse(fs.readFileSync(target, 'utf8')));
      return {result: emptyCollections(existing) ? 'UNCHANGED_EMPTY' : 'PRESERVED_EXISTING', created: false, file: target, config: existing};
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporary); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  }
}

export function expandUserPath(value, environment = process.env) {
  return value?.replace(/^~(?=$|[\\/])/, environment.HOME || environment.USERPROFILE || '');
}
