import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {emptyConfig, loadConfig, validateConfig, type AgentControlConfig, type ModelConfig, type ModelRoutingConfig, type ProviderConfig, type ResourceConfig, type ServiceConfig, type SparkConfig} from './config.js';

export type ConfiguredSystemKind = 'resource' | 'provider' | 'model' | 'service';
export interface ConfigurationSnapshot {
  revision: string;
  resources: ResourceConfig[];
  providers: ProviderConfig[];
  models: ModelConfig[];
  modelRouting: ModelRoutingConfig;
  services: ServiceConfig[];
  spark?: SparkConfig;
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
    if (!['resource', 'provider', 'model', 'service'].includes(String(input.kind))) throw new ConfigurationStoreError('configuration_kind_invalid', 400);
    if (!input.item || typeof input.item !== 'object' || Array.isArray(input.item)) throw new ConfigurationStoreError('configuration_item_invalid', 400);
    if (input.originalId !== undefined && typeof input.originalId !== 'string') throw new ConfigurationStoreError('configuration_original_id_invalid', 400);
    const kind = input.kind as ConfiguredSystemKind, key = collection(kind), values = structuredClone(current[key]) as Array<ResourceConfig | ProviderConfig | ModelConfig | ServiceConfig>;
    const item = structuredClone(input.item) as ResourceConfig | ProviderConfig | ModelConfig | ServiceConfig;
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
    return {...snapshot(next), restartRequired: !['provider', 'model'].includes(kind), changed: {kind, id: item.id}};
  }

  updateModelRouting(input: {revision?: unknown; modelRouting?: unknown}) {
    const current = this.current(), currentRevision = revision(current);
    if (typeof input.revision !== 'string' || input.revision !== currentRevision) throw new ConfigurationStoreError('configuration_revision_conflict', 409);
    if (!input.modelRouting || typeof input.modelRouting !== 'object' || Array.isArray(input.modelRouting)) throw new ConfigurationStoreError('configuration_model_routing_invalid', 400);
    let next: AgentControlConfig;
    try { next = validateConfig({...current, modelRouting: structuredClone(input.modelRouting) as ModelRoutingConfig}); }
    catch (error) { throw new ConfigurationStoreError((error as Error).message || 'configuration_invalid', 400); }
    this.write(next);
    return {...snapshot(next), restartRequired: false, changed: {kind: 'model-routing' as const, id: 'model-routing'}};
  }

  updateSpark(input: {revision?: unknown; spark?: unknown}) {
    const current = this.current(), currentRevision = revision(current);
    if (typeof input.revision !== 'string' || input.revision !== currentRevision) throw new ConfigurationStoreError('configuration_revision_conflict', 409);
    if (!input.spark || typeof input.spark !== 'object' || Array.isArray(input.spark)) throw new ConfigurationStoreError('configuration_spark_invalid', 400);
    let next: AgentControlConfig;
    try { next = validateConfig({...current, spark: structuredClone(input.spark) as SparkConfig}); }
    catch (error) { throw new ConfigurationStoreError((error as Error).message || 'configuration_invalid', 400); }
    this.write(next);
    return {...snapshot(next), restartRequired: true, changed: {kind: 'spark' as const, id: 'fast-execution'}};
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

function collection(kind: ConfiguredSystemKind): 'resources' | 'providers' | 'models' | 'services' {
  return kind === 'resource' ? 'resources' : kind === 'provider' ? 'providers' : kind === 'model' ? 'models' : 'services';
}

function revision(config: AgentControlConfig) {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

function snapshot(config: AgentControlConfig): ConfigurationSnapshot {
  return {revision: revision(config), resources: structuredClone(config.resources), providers: structuredClone(config.providers), models: structuredClone(config.models), modelRouting: structuredClone(config.modelRouting), services: structuredClone(config.services), ...(config.spark ? {spark: structuredClone(config.spark)} : {})};
}
