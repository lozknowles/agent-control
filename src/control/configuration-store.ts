import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {emptyConfig, loadConfig, validateConfig, type AgentControlConfig, type ProviderConfig, type ResourceConfig, type ServiceConfig} from './config.js';

export type ConfiguredSystemKind = 'resource' | 'provider' | 'service';
export interface ConfigurationSnapshot {
  revision: string;
  resources: ResourceConfig[];
  providers: ProviderConfig[];
  services: ServiceConfig[];
}

export class ConfigurationStoreError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export class ConfigurationStore {
  constructor(readonly file: string) {}

  read(): ConfigurationSnapshot {
    return snapshot(this.current());
  }

  upsert(input: {revision?: unknown; kind?: unknown; originalId?: unknown; item?: unknown}) {
    const current = this.current(), currentRevision = revision(current);
    if (typeof input.revision !== 'string' || input.revision !== currentRevision) throw new ConfigurationStoreError('configuration_revision_conflict', 409);
    if (!['resource', 'provider', 'service'].includes(String(input.kind))) throw new ConfigurationStoreError('configuration_kind_invalid', 400);
    if (!input.item || typeof input.item !== 'object' || Array.isArray(input.item)) throw new ConfigurationStoreError('configuration_item_invalid', 400);
    if (input.originalId !== undefined && typeof input.originalId !== 'string') throw new ConfigurationStoreError('configuration_original_id_invalid', 400);
    const kind = input.kind as ConfiguredSystemKind, key = collection(kind), values = structuredClone(current[key]) as Array<ResourceConfig | ProviderConfig | ServiceConfig>;
    const item = structuredClone(input.item) as ResourceConfig | ProviderConfig | ServiceConfig;
    if (input.originalId === undefined) values.push(item);
    else {
      const index = values.findIndex(value => value.id === input.originalId);
      if (index < 0) throw new ConfigurationStoreError('configuration_item_missing', 404);
      values[index] = item;
    }
    let next: AgentControlConfig;
    try { next = validateConfig({...current, [key]: values}); }
    catch (error) { throw new ConfigurationStoreError((error as Error).message || 'configuration_invalid', 400); }
    this.write(next);
    return {...snapshot(next), restartRequired: true, changed: {kind, id: item.id}};
  }

  private current() {
    try { return fs.existsSync(this.file) ? loadConfig(this.file) : emptyConfig(); }
    catch (error) { throw new ConfigurationStoreError((error as Error).message || 'configuration_read_failed', 500); }
  }

  private write(config: AgentControlConfig) {
    const directory = path.dirname(this.file), temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    fs.mkdirSync(directory, {recursive: true});
    try {
      fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, {encoding: 'utf8', mode: 0o600, flag: 'wx'});
      fs.renameSync(temporary, this.file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
}

function collection(kind: ConfiguredSystemKind): 'resources' | 'providers' | 'services' {
  return kind === 'resource' ? 'resources' : kind === 'provider' ? 'providers' : 'services';
}

function revision(config: AgentControlConfig) {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

function snapshot(config: AgentControlConfig): ConfigurationSnapshot {
  return {revision: revision(config), resources: structuredClone(config.resources), providers: structuredClone(config.providers), services: structuredClone(config.services)};
}
