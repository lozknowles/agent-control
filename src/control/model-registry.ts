import fs from 'node:fs';
import path from 'node:path';
import type {ModelConfig, ModelQualificationState, ModelRoutingConfig, ProviderConfig} from './config.js';

export interface ModelQualificationRecord {
  modelId: string;
  state: ModelQualificationState;
  version: string;
  checkedAt: string;
  qualifiedAt?: string;
  capabilities: string[];
  nodes: string[];
  latencyMs?: number;
  successRate?: number;
  evidence: string[];
  detail?: string;
}
export interface ModelRouteRequest {model?: string; modelRole?: string; nodeId: string; requiredCapabilities?: string[]; allowFallback?: boolean;}
export interface ModelRouteDecision {
  requestedModel: string | null;
  requestedRole: string | null;
  modelId: string;
  providerId: string;
  providerModel: string;
  nodeId: string;
  qualificationVersion: string;
  fallback: boolean;
  fallbackReason: string | null;
  considered: Array<{modelId: string; eligible: boolean; reasons: string[]}>;
}
export interface ModelRegistryRow extends ModelConfig {providerDisplayName: string; qualification: ModelQualificationRecord; assignedRoles: string[];}

export class ModelQualificationStore {
  private readonly records = new Map<string, ModelQualificationRecord>();
  constructor(readonly file?: string) {
    if (!file || !fs.existsSync(file)) return;
    const value = JSON.parse(fs.readFileSync(file, 'utf8')) as {version: 1; records: ModelQualificationRecord[]};
    if (value.version !== 1 || !Array.isArray(value.records)) throw new Error('model_qualification_state_invalid');
    for (const record of value.records) this.records.set(record.modelId, structuredClone(record));
  }
  get(modelId: string) { const value = this.records.get(modelId); return value ? structuredClone(value) : undefined; }
  list() { return [...this.records.values()].map(value => structuredClone(value)); }
  set(record: ModelQualificationRecord) { this.records.set(record.modelId, structuredClone(record)); this.save(); return this.get(record.modelId)!; }
  private save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), {recursive: true});
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify({version: 1, records: this.list()}, null, 2)}\n`, {mode: 0o600});
    fs.renameSync(temporary, this.file);
  }
}

export class ModelRegistry {
  private providers = new Map<string, ProviderConfig>();
  private models = new Map<string, ModelConfig>();
  private routing: ModelRoutingConfig = {roles: {}};
  constructor(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig, readonly qualifications = new ModelQualificationStore()) { this.reload(providers, models, routing); }
  reload(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig) {
    this.providers = new Map(providers.map(provider => [provider.id, structuredClone(provider)]));
    this.models = new Map(models.map(model => [model.id, structuredClone(model)]));
    this.routing = structuredClone(routing);
  }
  provider(id: string) { const value = this.providers.get(id); return value ? structuredClone(value) : undefined; }
  model(id: string) { const value = this.models.get(id); return value ? structuredClone(value) : undefined; }
  providersList() { return [...this.providers.values()].map(value => safeProvider(value)); }
  list(): ModelRegistryRow[] {
    return [...this.models.values()].map(model => ({...structuredClone(model), providerDisplayName: this.providers.get(model.provider)?.name ?? model.provider, qualification: this.qualification(model), assignedRoles: this.rolesFor(model.id)}));
  }
  routes() { return structuredClone(this.routing); }
  qualification(model: ModelConfig | string): ModelQualificationRecord {
    const value = typeof model === 'string' ? this.models.get(model) : model;
    if (!value) throw new Error('model_missing');
    return this.qualifications.get(value.id) ?? {
      modelId: value.id,
      state: value.enabled === false ? 'DISABLED' : value.qualification?.state ?? 'UNTESTED',
      version: value.qualification?.version ?? 'configured-v1',
      checkedAt: value.qualification?.qualifiedAt ?? new Date(0).toISOString(),
      ...(value.qualification?.qualifiedAt ? {qualifiedAt: value.qualification.qualifiedAt} : {}),
      capabilities: [...(value.qualification?.state === 'QUALIFIED' ? value.qualification.capabilities ?? [] : [])],
      nodes: [...(value.qualification?.state === 'QUALIFIED' ? value.qualification.nodes ?? value.nodes ?? [] : [])],
      ...(value.qualification?.latencyMs === undefined ? {} : {latencyMs: value.qualification.latencyMs}),
      ...(value.qualification?.successRate === undefined ? {} : {successRate: value.qualification.successRate}),
      evidence: [...(value.qualification?.evidence ?? [])],
    };
  }
  setQualification(record: ModelQualificationRecord) {
    if (!this.models.has(record.modelId)) throw new Error('model_missing');
    return this.qualifications.set(record);
  }
  route(request: ModelRouteRequest): ModelRouteDecision {
    const requestedRole = request.modelRole ?? (!request.model ? this.routing.defaultRole : undefined);
    const candidates = request.model ? [request.model] : requestedRole ? this.expandRole(requestedRole) : [];
    if (!candidates.length) throw new Error(request.model ? 'model_missing' : 'model_route_unconfigured');
    const considered = candidates.map(modelId => this.eligibility(modelId, request));
    const selectedIndex = considered.findIndex(item => item.eligible);
    if (selectedIndex < 0) throw Object.assign(new Error('model_route_unavailable'), {considered});
    if (selectedIndex > 0 && request.allowFallback === false) throw Object.assign(new Error('model_fallback_disabled'), {considered});
    const selected = this.models.get(considered[selectedIndex].modelId)!;
    const qualification = this.qualification(selected);
    return {
      requestedModel: request.model ?? null, requestedRole: requestedRole ?? null, modelId: selected.id, providerId: selected.provider,
      providerModel: selected.providerModel, nodeId: request.nodeId, qualificationVersion: qualification.version,
      fallback: selectedIndex > 0, fallbackReason: selectedIndex > 0 ? considered.slice(0, selectedIndex).map(item => `${item.modelId}:${item.reasons.join('+')}`).join(',') : null,
      considered,
    };
  }
  private expandRole(role: string, stack = new Set<string>()): string[] {
    if (stack.has(role)) throw new Error(`model_fallback_cycle:${role}`);
    const route = this.routing.roles[role]; if (!route) throw new Error('model_role_missing');
    stack.add(role); const output: string[] = [];
    for (const id of [route.primary, ...(route.fallback ?? [])]) output.push(...(this.routing.roles[id] ? this.expandRole(id, stack) : [id]));
    stack.delete(role); return [...new Set(output)];
  }
  private eligibility(modelId: string, request: ModelRouteRequest) {
    const reasons: string[] = [], model = this.models.get(modelId);
    if (!model) return {modelId, eligible: false, reasons: ['unknown-model']};
    const provider = this.providers.get(model.provider), qualification = this.qualification(model), capabilities = new Set(qualification.capabilities);
    if (provider?.enabled === false) reasons.push('provider-disabled');
    if (!provider) reasons.push('provider-missing');
    if (model.enabled === false || qualification.state === 'DISABLED') reasons.push('model-disabled');
    if (qualification.state !== 'QUALIFIED') reasons.push(`qualification-${qualification.state.toLowerCase()}`);
    const nodes = qualification.nodes.length ? qualification.nodes : model.nodes ?? [];
    if (nodes.length && !nodes.includes(request.nodeId)) reasons.push('node-unavailable');
    for (const required of request.requiredCapabilities ?? []) if (!capabilities.has(required)) reasons.push(`capability-${required}-unproven`);
    return {modelId, eligible: reasons.length === 0, reasons};
  }
  private rolesFor(modelId: string) { return Object.entries(this.routing.roles).filter(([, route]) => [route.primary, ...(route.fallback ?? [])].includes(modelId)).map(([role]) => role); }
}

function safeProvider(provider: ProviderConfig) {
  return {id: provider.id, name: provider.name ?? provider.id, kind: provider.kind, enabled: provider.enabled !== false, baseUrl: provider.baseUrl, wireApi: provider.wireApi, auth: provider.auth ? {type: provider.auth.type, configured: provider.auth.type === 'none' || Boolean(provider.auth.env && process.env[provider.auth.env])} : undefined, capabilities: [...(provider.capabilities ?? [])]};
}
