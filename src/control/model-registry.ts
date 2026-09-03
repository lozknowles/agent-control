import fs from 'node:fs';
import path from 'node:path';
import type {ModelConfig, ModelQualificationState, ModelRoutingConfig, ProviderAccountProfileConfig, ProviderConfig} from './config.js';

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
export interface ModelRouteRequest {model?: string; modelRole?: string; accountProfile?: string; nodeId: string; requiredCapabilities?: string[]; allowFallback?: boolean;}
export interface ModelRouteDecision {
  requestedModel: string | null;
  requestedRole: string | null;
  modelId: string;
  providerId: string;
  accountProfileId: string | null;
  accountLabel: string | null;
  accountPlan: string | null;
  accountPlanAuthority: ProviderAccountProfileConfig['planAuthority'] | null;
  accountQualification: ModelQualificationState | null;
  accountAvailability: ProviderAccountProfileView['availability'] | null;
  providerModel: string;
  nodeId: string;
  qualificationVersion: string;
  fallback: boolean;
  fallbackReason: string | null;
  considered: Array<{modelId: string; accountProfileId: string | null; nodeId: string; eligible: boolean; reasons: string[]}>;
}
export interface AccountProfileQualificationRecord {providerId: string; accountProfileId: string; nodeId?: string; state: ModelQualificationState; version: string; checkedAt: string; qualifiedAt?: string; capabilities: string[]; evidence: string[]; detail?: string;}
export interface ProviderAccountProfileView {providerId: string; id: string; nodeId: string; label: string; plan: string | null; planAuthority: ProviderAccountProfileConfig['planAuthority'] | null; capabilities: string[]; qualification: AccountProfileQualificationRecord; credentialConfigured: boolean; availability: 'AVAILABLE' | 'AUTH_REQUIRED' | 'UNQUALIFIED' | 'DEGRADED' | 'DISABLED';}
export interface ModelRegistryRow extends ModelConfig {providerDisplayName: string; qualification: ModelQualificationRecord; assignedRoles: string[]; account: ProviderAccountProfileView | null;}

export class AccountProfileQualificationStore {
  private readonly records = new Map<string, AccountProfileQualificationRecord>();
  constructor(readonly file?: string) {
    if (!file || !fs.existsSync(file)) return;
    const value = JSON.parse(fs.readFileSync(file, 'utf8')) as {version: 1; records: AccountProfileQualificationRecord[]};
    if (value.version !== 1 || !Array.isArray(value.records)) throw new Error('account_profile_qualification_state_invalid');
    for (const record of value.records) this.records.set(key(record.providerId, record.accountProfileId), structuredClone(record));
  }
  get(providerId: string, accountProfileId: string) { const value = this.records.get(key(providerId, accountProfileId)); return value ? structuredClone(value) : undefined; }
  list() { return [...this.records.values()].map(value => structuredClone(value)); }
  set(record: AccountProfileQualificationRecord) { this.records.set(key(record.providerId, record.accountProfileId), structuredClone(record)); this.save(); return this.get(record.providerId, record.accountProfileId)!; }
  private save() { if (!this.file) return; fs.mkdirSync(path.dirname(this.file), {recursive: true}); const temporary = `${this.file}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify({version: 1, records: this.list()}, null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, this.file); }
}

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
  constructor(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig, readonly qualifications = new ModelQualificationStore(), readonly accountQualifications = new AccountProfileQualificationStore(), private readonly environment: NodeJS.ProcessEnv = process.env) { this.reload(providers, models, routing); }
  reload(providers: ProviderConfig[], models: ModelConfig[], routing: ModelRoutingConfig) {
    this.providers = new Map(providers.map(provider => [provider.id, structuredClone(provider)]));
    this.models = new Map(models.map(model => [model.id, structuredClone(model)]));
    this.routing = structuredClone(routing);
  }
  provider(id: string) { const value = this.providers.get(id); return value ? structuredClone(value) : undefined; }
  model(id: string) { const value = this.models.get(id); return value ? structuredClone(value) : undefined; }
  providersList() { return [...this.providers.values()].map(value => ({...safeProvider(value), accountProfiles: (value.accountProfiles ?? []).map(account => this.accountView(value, account))})); }
  accountProfilesList() { return [...this.providers.values()].flatMap(provider => (provider.accountProfiles ?? []).map(account => this.accountView(provider, account))); }
  accountProfile(providerId: string, accountProfileId: string) { const provider = this.providers.get(providerId), account = provider?.accountProfiles?.find(value => value.id === accountProfileId); return provider && account ? structuredClone(account) : undefined; }
  list(): ModelRegistryRow[] {
    return [...this.models.values()].map(model => { const provider = this.providers.get(model.provider), account = model.accountProfile && provider ? provider.accountProfiles?.find(value => value.id === model.accountProfile) : undefined; return {...structuredClone(model), providerDisplayName: provider?.name ?? model.provider, qualification: this.qualification(model), assignedRoles: this.rolesFor(model.id), account: provider && account ? this.accountView(provider, account) : null}; });
  }
  routes() { return structuredClone(this.routing); }
  governedAlternatives(modelId: string, requestedRole?: string | null) {
    const roles = requestedRole ? [requestedRole] : Object.keys(this.routing.roles).filter(role => this.expandRole(role).includes(modelId));
    return [...new Set(roles.flatMap(role => this.expandRole(role)))];
  }
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
  accountQualification(providerId: string, accountProfileId: string): AccountProfileQualificationRecord {
    const provider = this.providers.get(providerId), account = provider?.accountProfiles?.find(value => value.id === accountProfileId);
    if (!provider || !account) throw new Error('account_profile_missing');
    return this.accountQualifications.get(providerId, accountProfileId) ?? {providerId, accountProfileId, nodeId: account.nodeId ?? 'controller', state: account.enabled === false ? 'DISABLED' : account.qualification?.state ?? 'UNTESTED', version: account.qualification?.version ?? 'configured-v1', checkedAt: account.qualification?.checkedAt ?? account.qualification?.qualifiedAt ?? new Date(0).toISOString(), ...(account.qualification?.qualifiedAt ? {qualifiedAt: account.qualification.qualifiedAt} : {}), capabilities: [...(account.qualification?.state === 'QUALIFIED' ? account.qualification.capabilities ?? account.capabilities ?? [] : [])], evidence: [...(account.qualification?.evidence ?? [])], ...(account.qualification?.detail ? {detail: account.qualification.detail} : {})};
  }
  setAccountQualification(record: AccountProfileQualificationRecord) { const account = this.accountProfile(record.providerId, record.accountProfileId); if (!account) throw new Error('account_profile_missing'); if ((record.nodeId ?? 'controller') !== (account.nodeId ?? 'controller')) throw new Error('account_profile_qualification_node_mismatch'); return this.accountQualifications.set(record); }
  route(request: ModelRouteRequest): ModelRouteDecision {
    const requestedRole = request.modelRole ?? (!request.model ? this.routing.defaultRole : undefined);
    const candidates = request.model ? [request.model] : requestedRole ? this.expandRole(requestedRole) : [];
    if (!candidates.length) throw new Error(request.model ? 'model_missing' : 'model_route_unconfigured');
    const roleCapabilities = requestedRole ? this.routing.roles[requestedRole]?.requires ?? [] : [];
    const effectiveRequest = {...request, requiredCapabilities: [...new Set([...roleCapabilities, ...(request.requiredCapabilities ?? [])])]};
    const considered = candidates.map(modelId => this.eligibility(modelId, effectiveRequest));
    const selectedIndex = considered.findIndex(item => item.eligible);
    if (selectedIndex < 0) throw Object.assign(new Error('model_route_unavailable'), {considered});
    if (selectedIndex > 0 && request.allowFallback === false) throw Object.assign(new Error('model_fallback_disabled'), {considered});
    const selected = this.models.get(considered[selectedIndex].modelId)!, provider = this.providers.get(selected.provider)!, account = selected.accountProfile ? provider.accountProfiles?.find(value => value.id === selected.accountProfile) : undefined;
    const qualification = this.qualification(selected), accountView = account ? this.accountView(provider, account) : undefined;
    return {
      requestedModel: request.model ?? null, requestedRole: requestedRole ?? null, modelId: selected.id, providerId: selected.provider, accountProfileId: account?.id ?? null, accountLabel: account?.label ?? null, accountPlan: account?.plan ?? null, accountPlanAuthority: account?.planAuthority ?? null, accountQualification: accountView?.qualification.state ?? null, accountAvailability: accountView?.availability ?? null,
      providerModel: selected.providerModel, nodeId: account?.nodeId ?? request.nodeId, qualificationVersion: qualification.version,
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
    if (!model) return {modelId, accountProfileId: null, nodeId: request.nodeId, eligible: false, reasons: ['unknown-model']};
    const provider = this.providers.get(model.provider), qualification = this.qualification(model), capabilities = new Set(qualification.capabilities);
    if (provider?.enabled === false) reasons.push('provider-disabled');
    if (!provider) reasons.push('provider-missing');
    if (model.enabled === false || qualification.state === 'DISABLED') reasons.push('model-disabled');
    if (qualification.state !== 'QUALIFIED') reasons.push(`qualification-${qualification.state.toLowerCase()}`);
    const account = model.accountProfile ? provider?.accountProfiles?.find(value => value.id === model.accountProfile) : undefined;
    if (request.accountProfile && model.accountProfile !== request.accountProfile) reasons.push('account-profile-policy-mismatch');
    if (model.accountProfile && !account) reasons.push('account-profile-missing');
    if (account) {
      const accountQualification = this.accountQualification(model.provider, account.id);
      const accountNode = account.nodeId ?? request.nodeId;
      if (account.nodeId && account.nodeId !== request.nodeId) reasons.push('account-profile-node-mismatch');
      if (account.nodeId && accountQualification.nodeId && accountQualification.nodeId !== accountNode) reasons.push('account-profile-qualification-node-mismatch');
      if (account.enabled === false || accountQualification.state === 'DISABLED') reasons.push('account-profile-disabled');
      else if (!this.credentialConfigured(account, accountQualification)) reasons.push('account-profile-authentication-required');
      else if (accountQualification.state !== 'QUALIFIED') reasons.push(`account-profile-qualification-${accountQualification.state.toLowerCase()}`);
    }
    const nodes = qualification.nodes.length ? qualification.nodes : model.nodes ?? [];
    if (nodes.length && !nodes.includes(request.nodeId)) reasons.push('node-unavailable');
    for (const required of request.requiredCapabilities ?? []) if (!capabilities.has(required)) reasons.push(`capability-${required}-unproven`);
    return {modelId, accountProfileId: model.accountProfile ?? null, nodeId: account?.nodeId ?? request.nodeId, eligible: reasons.length === 0, reasons};
  }
  private accountView(provider: ProviderConfig, account: ProviderAccountProfileConfig): ProviderAccountProfileView {
    const qualification = this.accountQualification(provider.id, account.id), credentialConfigured = this.credentialConfigured(account, qualification);
    const availability = account.enabled === false || qualification.state === 'DISABLED' ? 'DISABLED' : !credentialConfigured ? 'AUTH_REQUIRED' : qualification.state === 'QUALIFIED' ? 'AVAILABLE' : qualification.state === 'DEGRADED' ? 'DEGRADED' : 'UNQUALIFIED';
    return {providerId: provider.id, id: account.id, nodeId: account.nodeId ?? 'controller', label: account.label, plan: account.plan ?? null, planAuthority: account.planAuthority ?? null, capabilities: [...(account.capabilities ?? [])], qualification, credentialConfigured, availability};
  }
  private credentialConfigured(account: ProviderAccountProfileConfig, qualification: AccountProfileQualificationRecord) {
    if (account.nodeId && account.nodeId !== 'controller') return qualification.nodeId === account.nodeId && ['QUALIFIED', 'DEGRADED'].includes(qualification.state);
    const value = this.environment[account.credentialStore.env]?.trim();
    if (!value || !path.isAbsolute(value)) return false;
    try { return fs.statSync(value).isDirectory(); } catch { return false; }
  }
  private rolesFor(modelId: string) { return Object.entries(this.routing.roles).filter(([, route]) => [route.primary, ...(route.fallback ?? [])].includes(modelId)).map(([role]) => role); }
}

function key(providerId: string, accountProfileId: string) { return `${providerId}\u0000${accountProfileId}`; }

function safeProvider(provider: ProviderConfig) {
  return {id: provider.id, name: provider.name ?? provider.id, kind: provider.kind, enabled: provider.enabled !== false, baseUrl: provider.baseUrl, wireApi: provider.wireApi, auth: provider.auth ? {type: provider.auth.type, configured: provider.auth.type === 'none' || Boolean(provider.auth.env && process.env[provider.auth.env])} : undefined, capabilities: [...(provider.capabilities ?? [])]};
}
