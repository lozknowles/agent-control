import fs from 'node:fs';
import path from 'node:path';

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

export function expandUserPath(value, environment = process.env) {
  return value?.replace(/^~(?=$|[\\/])/, environment.HOME || environment.USERPROFILE || '');
}
