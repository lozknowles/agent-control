import fs from 'node:fs';
import path from 'node:path';
import {normalizeGovernorPolicy} from './token-aware-baton-routing.js';

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

export interface ManagedWorkloadConfig {
  id: string;
  capability: string;
  protected?: boolean;
  systemdUnit?: string;
  processExecutables?: string[];
  opticalAccess?: boolean;
}

export interface ManagedConnectivityConfig {
  id: string;
  label?: string;
  capability: string;
  serviceUnit?: string;
  interfaceName?: string;
}

export interface ManagedNodeConfig {
  enabled?: boolean;
  probeIntervalSeconds?: number;
  offlineAfterSeconds?: number;
  workloads?: ManagedWorkloadConfig[];
  connectivity?: ManagedConnectivityConfig[];
  approvedServices?: string[];
  busyBlockedCapabilities?: string[];
  runtime?: {directory: string; branch: string};
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
  managedNode?: ManagedNodeConfig;
  metadata?: Record<string, string | number | boolean>;
}

export type ModelQualificationState = 'UNTESTED' | 'QUALIFYING' | 'QUALIFIED' | 'DEGRADED' | 'DISABLED' | 'FAILED';
export interface ProviderAccountProfileConfig {
  id: string;
  label: string;
  nodeId?: string;
  enabled?: boolean;
  plan?: string;
  planAuthority?: 'operator-configured' | 'provider-reported';
  capabilities?: string[];
  credentialStore: {type: 'codex-home-env'; env: string};
  qualification?: {state: ModelQualificationState; version?: string; checkedAt?: string; qualifiedAt?: string; capabilities?: string[]; evidence?: string[]; detail?: string};
}

export interface ProviderConfig {
  id: string;
  name?: string;
  kind: 'local' | 'responses' | 'cli' | 'browser-bridge' | 'openai-compatible';
  enabled?: boolean;
  baseUrl?: string;
  wireApi?: 'responses' | 'chat-completions';
  auth?: {type: 'none' | 'bearer-env' | 'bearer-file-env'; env?: string};
  requiresAuth?: boolean;
  credentialEnv?: string;
  credentialFileEnv?: string;
  parallelism?: number;
  costClass?: 'free' | 'included' | 'metered';
  capabilities?: string[];
  qualificationModel?: string;
  pricing?: {
    currency: string;
    billing: 'free' | 'included' | 'metered';
    inputPerMillionTokens: number;
    outputPerMillionTokens: number;
    fixedPerRequest?: number;
    effectiveFrom: string;
    source: string;
  };
  qualification?: {
    status?: 'unqualified' | 'historically-qualified' | 'qualified';
    advertisedContextLimitTokens?: number;
    maximumObservedInputTokens?: number;
    pricingStatus?: string;
    lastSuccessfulAt?: string;
    evidence?: string[];
  };
  accountProfiles?: ProviderAccountProfileConfig[];
}

export interface ModelConfig {
  id: string;
  provider: string;
  providerModel: string;
  accountProfile?: string;
  displayName?: string;
  enabled?: boolean;
  capabilities: string[];
  roles?: string[];
  nodes?: string[];
  limits?: {contextTokens?: number; outputTokens?: number};
  qualification?: {state: ModelQualificationState; version?: string; qualifiedAt?: string; evidence?: string[]; capabilities?: string[]; nodes?: string[]; latencyMs?: number; successRate?: number};
  pricing?: {currency: string; inputPerMillionTokens: number; outputPerMillionTokens: number; cachedInputPerMillionTokens?: number; effectiveFrom: string; source: string};
}
export interface ModelRouteConfig {primary: string; fallback?: string[]; requires?: string[];}
export interface ModelRoutingConfig {defaultRole?: string; roles: Record<string, ModelRouteConfig>;}

export interface ServiceConfig {
  id: string;
  name?: string;
  healthUrl: string;
  optional?: boolean;
  requiresAuth?: boolean;
  credentialEnv?: string;
  credentialFileEnv?: string;
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

export interface TokenAwareOutputConfig {
  completeMaxLines?: number;
  completeMaxBytes?: number;
  completeMaxTokens?: number;
  completeMaxMatches?: number;
  completeMaxFiles?: number;
  indexMaxFiles?: number;
  indexMaxLinesPerFile?: number;
  genericHeadLines?: number;
  genericTailLines?: number;
  artifactOnlyAboveReturnedTokens?: number;
  maxCaptureBytesPerStream?: number;
  retentionSeconds?: number;
  contextBudgetFraction?: number;
  minimumCompleteTokens?: number;
  maximumExpansionContextLines?: number;
}

export interface TokenBatonRoutingConfig {
  continuePercent?: number;
  prepareBatonPercent?: number;
  compactPercent?: number;
  handoffPercent?: number;
  sampleRetention?: number;
}

export interface HarnessProfileConfig {
  maximumInitialContextTokens?: number;
  maximumSources?: number;
  maximumOptionalSkills?: number;
  maximumTools?: number;
  maximumTurns?: number;
  allowBroadRepositoryContext?: boolean;
  allowSharedContext?: boolean;
}

export interface HarnessEfficiencyConfig {
  routingMode?: 'observe' | 'enforce';
  minimumVerifiedRuns?: number;
  minimumSuccessRate?: number;
  minimumSameModelControlledRuns?: number;
  profiles?: Partial<Record<'THIN' | 'STANDARD' | 'DEEP', HarnessProfileConfig>>;
}

export interface SparkConfig {
  enabled?: boolean;
  model?: string;
  modelRole?: string;
  maximumFiles?: number;
  maximumChangedLines?: number;
  maximumAttempts?: number;
  maximumSubagents?: number;
  maximumContextTokens?: number;
  verificationRequired?: boolean;
}

export interface ParameterizedJobsConfig {repositoryRoots: string[]; repositoryRemotes?: string[];}

export interface AgentControlConfig {
  schemaVersion: 1;
  resources: ResourceConfig[];
  providers: ProviderConfig[];
  models: ModelConfig[];
  modelRouting: ModelRoutingConfig;
  services: ServiceConfig[];
  lanes: LaneConfig[];
  tokenAwareOutput?: TokenAwareOutputConfig;
  tokenBatonRouting?: TokenBatonRoutingConfig;
  harnessEfficiency?: HarnessEfficiencyConfig;
  spark?: SparkConfig;
  jobs?: ParameterizedJobsConfig;
}

export const emptyConfig = (): AgentControlConfig => ({
  schemaVersion: 1,
  resources: [],
  providers: [],
  models: [],
  modelRouting: {roles: {}},
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
  try { const parsed = new URL(value); if (!allowedSchemes.has(parsed.protocol) || parsed.username || parsed.password) throw new Error('invalid'); }
  catch { throw new Error(`invalid_${label}_url`); }
}

function assertStringList(value: unknown, label: string, pattern: RegExp) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !pattern.test(item))) throw new Error(`invalid_${label}`);
}

function assertIntegerRange(value: unknown, label: string, minimum: number, maximum: number) {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new Error(`invalid_${label}`);
}

function rejectSecrets(value: unknown, trail = 'config') {
  if (!value || typeof value !== 'object') return;
  const safeTokenAccountingKeys = new Set(['tokenAwareOutput', 'tokenBatonRouting', 'completeMaxTokens', 'artifactOnlyAboveReturnedTokens', 'minimumCompleteTokens', 'harnessEfficiency', 'maximumInitialContextTokens', 'maximumContextTokens', 'advertisedContextLimitTokens', 'maximumObservedInputTokens', 'inputPerMillionTokens', 'outputPerMillionTokens', 'cachedInputPerMillionTokens', 'contextTokens', 'outputTokens', 'continuePercent', 'prepareBatonPercent', 'compactPercent', 'handoffPercent', 'sampleRetention']);
  for (const [key, child] of Object.entries(value)) {
    if (/token|password|secret|api.?key/i.test(key) && !['credentialEnv', 'credentialFileEnv'].includes(key) && !safeTokenAccountingKeys.has(key)) {
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
    models: input.models ?? [],
    modelRouting: input.modelRouting ?? {roles: {}},
    services: input.services ?? [],
    lanes: input.lanes ?? [],
    tokenAwareOutput: input.tokenAwareOutput,
    tokenBatonRouting: input.tokenBatonRouting,
    harnessEfficiency: input.harnessEfficiency,
    spark: input.spark,
    jobs: input.jobs,
  };
  if (config.jobs) {
    if (!Array.isArray(config.jobs.repositoryRoots) || !config.jobs.repositoryRoots.length) throw new Error('invalid_job_repository_roots');
    for (const root of config.jobs.repositoryRoots) if (typeof root !== 'string' || !path.isAbsolute(root) || path.normalize(root) === path.parse(root).root) throw new Error('invalid_job_repository_root');
    if (config.jobs.repositoryRemotes !== undefined && !Array.isArray(config.jobs.repositoryRemotes)) throw new Error('invalid_job_repository_remotes');
    for (const remote of config.jobs.repositoryRemotes ?? []) {
      let parsed: URL; try { parsed = new URL(remote); } catch { throw new Error('invalid_job_repository_remote'); }
      if (!['https:', 'git:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('invalid_job_repository_remote');
    }
  }
  for (const key of ['resources', 'providers', 'models', 'services', 'lanes'] as const) {
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
    if (resource.transport.type === 'ssh') {
      if (!/^[a-z0-9][a-z0-9._:%-]{0,252}$/i.test(resource.transport.host!)) throw new Error(`invalid_ssh_host:${resource.id}`);
      if (resource.transport.user && !/^[a-z0-9._-]+$/i.test(resource.transport.user)) throw new Error(`invalid_ssh_user:${resource.id}`);
      if (resource.transport.port !== undefined && (!Number.isSafeInteger(resource.transport.port) || resource.transport.port < 1 || resource.transport.port > 65535)) throw new Error(`invalid_ssh_port:${resource.id}`);
    }
    if (resource.transport.type === 'http') assertUrl(resource.transport.baseUrl, `transport_${resource.id}`);
    if (resource.healthUrl) assertUrl(resource.healthUrl, `resource_${resource.id}`);
    if (!Array.isArray(resource.capabilities)) throw new Error(`invalid_capabilities:${resource.id}`);
    if (resource.managedNode) {
      if (resource.platform !== 'linux') throw new Error(`managed_node_linux_required:${resource.id}`);
      if (resource.transport.type !== 'ssh') throw new Error(`managed_node_ssh_required:${resource.id}`);
      assertIntegerRange(resource.managedNode.probeIntervalSeconds, `managed_node_probe_interval:${resource.id}`, 5, 3600);
      assertIntegerRange(resource.managedNode.offlineAfterSeconds, `managed_node_offline_after:${resource.id}`, 10, 86400);
      if (resource.managedNode.probeIntervalSeconds && resource.managedNode.offlineAfterSeconds && resource.managedNode.offlineAfterSeconds <= resource.managedNode.probeIntervalSeconds) throw new Error(`managed_node_offline_after_probe:${resource.id}`);
      assertStringList(resource.managedNode.approvedServices, `managed_node_services:${resource.id}`, /^[a-z0-9@_.:-]+\.(?:service|timer|socket)$/i);
      assertStringList(resource.managedNode.busyBlockedCapabilities, `managed_node_blocked_capabilities:${resource.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
      if (resource.managedNode.connectivity !== undefined && !Array.isArray(resource.managedNode.connectivity)) throw new Error(`invalid_managed_node_connectivity:${resource.id}`);
      const connectivityIds = new Set<string>();
      for (const detector of resource.managedNode.connectivity ?? []) {
        assertId(detector.id, 'connectivity');
        if (connectivityIds.has(detector.id)) throw new Error(`duplicate_connectivity:${resource.id}:${detector.id}`);
        connectivityIds.add(detector.id);
        if (detector.label !== undefined && (typeof detector.label !== 'string' || !/^[a-z0-9][a-z0-9 ._-]{0,63}$/i.test(detector.label))) throw new Error(`invalid_connectivity_label:${resource.id}:${detector.id}`);
        if (typeof detector.capability !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(detector.capability)) throw new Error(`invalid_connectivity_capability:${resource.id}:${detector.id}`);
        if (detector.serviceUnit && !/^[a-z0-9@_.:-]+\.service$/i.test(detector.serviceUnit)) throw new Error(`invalid_connectivity_unit:${resource.id}:${detector.id}`);
        if (detector.interfaceName && !/^[a-z0-9][a-z0-9_.:-]{0,31}$/i.test(detector.interfaceName)) throw new Error(`invalid_connectivity_interface:${resource.id}:${detector.id}`);
        if (!detector.serviceUnit && !detector.interfaceName) throw new Error(`connectivity_detector_required:${resource.id}:${detector.id}`);
      }
      if (resource.managedNode.workloads !== undefined && !Array.isArray(resource.managedNode.workloads)) throw new Error(`invalid_managed_node_workloads:${resource.id}`);
      const workloadIds = new Set<string>();
      for (const workload of resource.managedNode.workloads ?? []) {
        assertId(workload.id, 'workload');
        if (workloadIds.has(workload.id)) throw new Error(`duplicate_workload:${resource.id}:${workload.id}`);
        workloadIds.add(workload.id);
        if (typeof workload.capability !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(workload.capability)) throw new Error(`invalid_workload_capability:${resource.id}:${workload.id}`);
        if (workload.systemdUnit && !/^[a-z0-9@_.:-]+\.service$/i.test(workload.systemdUnit)) throw new Error(`invalid_workload_unit:${resource.id}:${workload.id}`);
        assertStringList(workload.processExecutables, `workload_processes:${resource.id}:${workload.id}`, /^[a-z0-9][a-z0-9+._-]{0,127}$/i);
      }
      if (resource.managedNode.runtime) {
        const runtime = resource.managedNode.runtime;
        if (!/^\/[a-z0-9._/-]+$/i.test(runtime.directory) || runtime.directory === '/') throw new Error(`invalid_managed_node_runtime_directory:${resource.id}`);
        if (!/^[a-z0-9][a-z0-9._/-]{0,127}$/i.test(runtime.branch)) throw new Error(`invalid_managed_node_runtime_branch:${resource.id}`);
      }
    }
  }
  for (const provider of config.providers) {
    assertId(provider.id, 'provider');
    if (ids.has(provider.id)) throw new Error(`duplicate_id:${provider.id}`);
    ids.add(provider.id);
    if (!['local', 'responses', 'cli', 'browser-bridge', 'openai-compatible'].includes(provider.kind)) throw new Error(`invalid_provider_kind:${provider.id}`);
    if (provider.enabled !== undefined && typeof provider.enabled !== 'boolean') throw new Error(`invalid_provider_enabled:${provider.id}`);
    if (provider.baseUrl) assertUrl(provider.baseUrl, `provider_${provider.id}`);
    if (provider.kind === 'openai-compatible' && !provider.baseUrl) throw new Error(`provider_base_url_required:${provider.id}`);
    if (provider.wireApi !== undefined && !['responses', 'chat-completions'].includes(provider.wireApi)) throw new Error(`invalid_provider_wire_api:${provider.id}`);
    if (provider.auth) {
      if (!['none', 'bearer-env', 'bearer-file-env'].includes(provider.auth.type)) throw new Error(`invalid_provider_auth:${provider.id}`);
      if (provider.auth.type !== 'none' && (!provider.auth.env || !/^[A-Z_][A-Z0-9_]{0,127}$/.test(provider.auth.env))) throw new Error(`invalid_provider_auth_env:${provider.id}`);
      if (provider.auth.type === 'none' && provider.auth.env !== undefined) throw new Error(`invalid_provider_auth_env:${provider.id}`);
    }
    for (const [field, value] of [['credentialEnv', provider.credentialEnv], ['credentialFileEnv', provider.credentialFileEnv]] as const) {
      if (value !== undefined && (typeof value !== 'string' || !/^[A-Z_][A-Z0-9_]{0,127}$/.test(value))) throw new Error(`invalid_provider_${field}:${provider.id}`);
    }
    if (provider.qualification) {
      assertIntegerRange(provider.qualification.advertisedContextLimitTokens, `provider_context_limit:${provider.id}`, 1, 100_000_000);
      assertIntegerRange(provider.qualification.maximumObservedInputTokens, `provider_observed_input:${provider.id}`, 1, 100_000_000);
      assertStringList(provider.qualification.evidence, `provider_qualification_evidence:${provider.id}`, /^[a-z0-9][a-z0-9:._/-]+$/i);
      if (provider.qualification.lastSuccessfulAt && Number.isNaN(Date.parse(provider.qualification.lastSuccessfulAt))) throw new Error(`invalid_provider_qualification_timestamp:${provider.id}`);
    }
    if (provider.pricing) {
      if (!/^[A-Z]{3}$/.test(provider.pricing.currency) || !['free', 'included', 'metered'].includes(provider.pricing.billing)) throw new Error(`invalid_provider_pricing:${provider.id}`);
      for (const value of [provider.pricing.inputPerMillionTokens, provider.pricing.outputPerMillionTokens, provider.pricing.fixedPerRequest ?? 0]) if (!Number.isFinite(value) || value < 0) throw new Error(`invalid_provider_pricing:${provider.id}`);
      if (!provider.pricing.source?.trim() || Number.isNaN(Date.parse(provider.pricing.effectiveFrom))) throw new Error(`invalid_provider_pricing_provenance:${provider.id}`);
    }
    if (provider.accountProfiles !== undefined && (!Array.isArray(provider.accountProfiles) || provider.kind !== 'cli')) throw new Error(`invalid_provider_account_profiles:${provider.id}`);
    const accountIds = new Set<string>();
    for (const account of provider.accountProfiles ?? []) {
      assertId(account.id, 'account_profile');
      if (accountIds.has(account.id)) throw new Error(`duplicate_account_profile:${provider.id}:${account.id}`);
      accountIds.add(account.id);
      if (account.nodeId !== undefined && (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(account.nodeId) || !config.resources.some(resource => resource.id === account.nodeId))) throw new Error(`invalid_account_profile_node:${provider.id}:${account.id}`);
      if (typeof account.label !== 'string' || !account.label.trim() || account.label.length > 128 || /@/.test(account.label)) throw new Error(`invalid_account_profile_label:${provider.id}:${account.id}`);
      if (account.enabled !== undefined && typeof account.enabled !== 'boolean') throw new Error(`invalid_account_profile_enabled:${provider.id}:${account.id}`);
      if (account.plan !== undefined && (typeof account.plan !== 'string' || !account.plan.trim() || account.plan.length > 80 || /@/.test(account.plan))) throw new Error(`invalid_account_profile_plan:${provider.id}:${account.id}`);
      if (account.planAuthority !== undefined && !['operator-configured', 'provider-reported'].includes(account.planAuthority)) throw new Error(`invalid_account_profile_plan_authority:${provider.id}:${account.id}`);
      if (account.plan && !account.planAuthority) throw new Error(`account_profile_plan_authority_required:${provider.id}:${account.id}`);
      assertStringList(account.capabilities, `account_profile_capabilities:${provider.id}:${account.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
      if (!account.credentialStore || account.credentialStore.type !== 'codex-home-env' || !/^[A-Z_][A-Z0-9_]{0,127}$/.test(account.credentialStore.env)) throw new Error(`invalid_account_profile_credential_store:${provider.id}:${account.id}`);
      if (account.qualification && !['UNTESTED', 'QUALIFYING', 'QUALIFIED', 'DEGRADED', 'DISABLED', 'FAILED'].includes(account.qualification.state)) throw new Error(`invalid_account_profile_qualification:${provider.id}:${account.id}`);
      for (const timestamp of [account.qualification?.checkedAt, account.qualification?.qualifiedAt]) if (timestamp && Number.isNaN(Date.parse(timestamp))) throw new Error(`invalid_account_profile_qualification_timestamp:${provider.id}:${account.id}`);
      assertStringList(account.qualification?.capabilities, `account_profile_qualification_capabilities:${provider.id}:${account.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
      assertStringList(account.qualification?.evidence, `account_profile_qualification_evidence:${provider.id}:${account.id}`, /^[a-z0-9][a-z0-9:._/-]+$/i);
      if (account.qualification?.detail !== undefined && (typeof account.qualification.detail !== 'string' || !/^[a-z0-9][a-z0-9:._ -]{0,239}$/i.test(account.qualification.detail) || /(?:bearer\s|\b(?:sk|rk|pk)-)/i.test(account.qualification.detail))) throw new Error(`invalid_account_profile_qualification_detail:${provider.id}:${account.id}`);
    }
  }
  const providerIds = new Set(config.providers.map(provider => provider.id)), providersById = new Map(config.providers.map(provider => [provider.id, provider]));
  const modelIds = new Set<string>();
  for (const model of config.models) {
    assertId(model.id, 'model');
    if (modelIds.has(model.id)) throw new Error(`duplicate_model_id:${model.id}`);
    modelIds.add(model.id);
    if (!providerIds.has(model.provider)) throw new Error(`unknown_model_provider:${model.id}:${model.provider}`);
    const modelProvider = providersById.get(model.provider)!;
    if (model.accountProfile !== undefined && !modelProvider.accountProfiles?.some(account => account.id === model.accountProfile)) throw new Error(`unknown_model_account_profile:${model.id}:${model.accountProfile}`);
    if (modelProvider.kind === 'cli' && modelProvider.accountProfiles?.length && !model.accountProfile) throw new Error(`model_account_profile_required:${model.id}`);
    const modelAccount = model.accountProfile ? modelProvider.accountProfiles?.find(account => account.id === model.accountProfile) : undefined;
    if (modelAccount?.nodeId && model.nodes?.length && !model.nodes.includes(modelAccount.nodeId)) throw new Error(`model_account_profile_node_mismatch:${model.id}`);
    if (typeof model.providerModel !== 'string' || !model.providerModel.trim() || model.providerModel.length > 256) throw new Error(`invalid_provider_model:${model.id}`);
    if (!Array.isArray(model.capabilities) || model.capabilities.some(capability => typeof capability !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(capability))) throw new Error(`invalid_model_capabilities:${model.id}`);
    assertStringList(model.roles, `model_roles:${model.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
    assertStringList(model.nodes, `model_nodes:${model.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
    if (model.qualification && !['UNTESTED', 'QUALIFYING', 'QUALIFIED', 'DEGRADED', 'DISABLED', 'FAILED'].includes(model.qualification.state)) throw new Error(`invalid_model_qualification:${model.id}`);
    if (model.qualification?.qualifiedAt && Number.isNaN(Date.parse(model.qualification.qualifiedAt))) throw new Error(`invalid_model_qualification_timestamp:${model.id}`);
    assertStringList(model.qualification?.capabilities, `model_qualification_capabilities:${model.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
    assertStringList(model.qualification?.nodes, `model_qualification_nodes:${model.id}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
    assertStringList(model.qualification?.evidence, `model_qualification_evidence:${model.id}`, /^[a-z0-9][a-z0-9:._/-]+$/i);
    if (model.qualification?.latencyMs !== undefined && (!Number.isFinite(model.qualification.latencyMs) || model.qualification.latencyMs < 0)) throw new Error(`invalid_model_qualification_latency:${model.id}`);
    if (model.qualification?.successRate !== undefined && (!Number.isFinite(model.qualification.successRate) || model.qualification.successRate < 0 || model.qualification.successRate > 1)) throw new Error(`invalid_model_qualification_success_rate:${model.id}`);
    assertIntegerRange(model.limits?.contextTokens, `model_context:${model.id}`, 1, 100_000_000);
    assertIntegerRange(model.limits?.outputTokens, `model_output:${model.id}`, 1, 10_000_000);
    if (model.pricing) {
      if (!/^[A-Z]{3}$/.test(model.pricing.currency) || !model.pricing.source?.trim() || Number.isNaN(Date.parse(model.pricing.effectiveFrom))) throw new Error(`invalid_model_pricing_provenance:${model.id}`);
      for (const value of [model.pricing.inputPerMillionTokens, model.pricing.outputPerMillionTokens, model.pricing.cachedInputPerMillionTokens ?? 0]) if (!Number.isFinite(value) || value < 0) throw new Error(`invalid_model_pricing:${model.id}`);
    }
  }
  if (!config.modelRouting || typeof config.modelRouting !== 'object' || Array.isArray(config.modelRouting) || !config.modelRouting.roles || typeof config.modelRouting.roles !== 'object' || Array.isArray(config.modelRouting.roles)) throw new Error('invalid_model_routing');
  const roleIds = new Set(Object.keys(config.modelRouting.roles));
  if (config.modelRouting.defaultRole && !roleIds.has(config.modelRouting.defaultRole)) throw new Error(`unknown_default_model_role:${config.modelRouting.defaultRole}`);
  const roleEdges = new Map<string, string[]>();
  for (const [role, route] of Object.entries(config.modelRouting.roles)) {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(role) || !route || typeof route !== 'object' || Array.isArray(route)) throw new Error(`invalid_model_role:${role}`);
    const candidates = [route.primary, ...(route.fallback ?? [])];
    if (candidates.some(id => !modelIds.has(id))) throw new Error(`unknown_model_route:${role}`);
    if (new Set(candidates).size !== candidates.length) throw new Error(`duplicate_model_fallback:${role}`);
    assertStringList(route.requires, `model_role_capabilities:${role}`, /^[a-z0-9][a-z0-9._-]{0,127}$/i);
    roleEdges.set(role, candidates.filter(id => roleIds.has(id)));
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (role: string) => { if (visiting.has(role)) throw new Error(`model_fallback_cycle:${role}`); if (visited.has(role)) return; visiting.add(role); for (const next of roleEdges.get(role) ?? []) visit(next); visiting.delete(role); visited.add(role); };
  for (const role of roleIds) visit(role);
  for (const service of config.services) {
    assertId(service.id, 'service');
    if (ids.has(service.id)) throw new Error(`duplicate_id:${service.id}`);
    ids.add(service.id);
    assertUrl(service.healthUrl, `service_${service.id}`);
    for (const [field, value] of [['credentialEnv', service.credentialEnv], ['credentialFileEnv', service.credentialFileEnv]] as const) {
      if (value !== undefined && (typeof value !== 'string' || !/^[A-Z_][A-Z0-9_]{0,127}$/.test(value))) throw new Error(`invalid_service_${field}:${service.id}`);
    }
    if (service.requiresAuth && !service.credentialEnv && !service.credentialFileEnv) throw new Error(`service_credential_reference_required:${service.id}`);
    if (service.start?.type === 'systemd-user' && !service.start.unit) throw new Error(`systemd_unit_required:${service.id}`);
    if (service.start?.type === 'command' && !service.start.command) throw new Error(`start_command_required:${service.id}`);
  }
  const laneIds = new Set<number>();
  for (const lane of config.lanes) {
    if (!Number.isSafeInteger(lane.id) || lane.id < 1 || laneIds.has(lane.id)) throw new Error('invalid_lane_id');
    laneIds.add(lane.id);
    if (!lane.name?.trim()) throw new Error(`lane_name_required:${lane.id}`);
  }
  if (config.tokenAwareOutput !== undefined) {
    if (!config.tokenAwareOutput || typeof config.tokenAwareOutput !== 'object' || Array.isArray(config.tokenAwareOutput)) throw new Error('invalid_token_aware_output');
    const integerLimits: Array<[keyof TokenAwareOutputConfig, number, number]> = [
      ['completeMaxLines', 0, 1_000_000], ['completeMaxBytes', 0, 1_073_741_824], ['completeMaxTokens', 0, 100_000_000],
      ['completeMaxMatches', 0, 10_000_000], ['completeMaxFiles', 0, 1_000_000], ['indexMaxFiles', 1, 1_000_000],
      ['indexMaxLinesPerFile', 1, 1_000_000], ['genericHeadLines', 0, 100_000], ['genericTailLines', 0, 100_000],
      ['artifactOnlyAboveReturnedTokens', 1, 100_000_000], ['maxCaptureBytesPerStream', 1024, 1_073_741_824],
      ['retentionSeconds', 60, 2_592_000], ['minimumCompleteTokens', 0, 100_000_000], ['maximumExpansionContextLines', 0, 1_000],
    ];
    for (const [key, minimum, maximum] of integerLimits) assertIntegerRange(config.tokenAwareOutput[key], `token_aware_output_${key}`, minimum, maximum);
    if (config.tokenAwareOutput.contextBudgetFraction !== undefined && (!(config.tokenAwareOutput.contextBudgetFraction > 0) || config.tokenAwareOutput.contextBudgetFraction > 1)) throw new Error('invalid_token_aware_output_context_budget_fraction');
  }
  if (config.tokenBatonRouting !== undefined) {
    const routing = config.tokenBatonRouting;
    if (!routing || typeof routing !== 'object' || Array.isArray(routing)) throw new Error('invalid_token_baton_routing');
    try { normalizeGovernorPolicy(routing); }
    catch (error) { throw new Error(`invalid_${error instanceof Error ? error.message : String(error)}`); }
  }
  if (config.harnessEfficiency !== undefined) {
    const efficiency = config.harnessEfficiency;
    if (!efficiency || typeof efficiency !== 'object' || Array.isArray(efficiency)) throw new Error('invalid_harness_efficiency');
    if (efficiency.routingMode !== undefined && !['observe', 'enforce'].includes(efficiency.routingMode)) throw new Error('invalid_harness_efficiency_routing_mode');
    assertIntegerRange(efficiency.minimumVerifiedRuns, 'harness_efficiency_minimum_verified_runs', 1, 100_000);
    assertIntegerRange(efficiency.minimumSameModelControlledRuns, 'harness_efficiency_minimum_same_model_controlled_runs', 1, 100_000);
    if (efficiency.minimumSuccessRate !== undefined && (!(efficiency.minimumSuccessRate > 0) || efficiency.minimumSuccessRate > 1)) throw new Error('invalid_harness_efficiency_minimum_success_rate');
    if (efficiency.profiles !== undefined && (!efficiency.profiles || typeof efficiency.profiles !== 'object' || Array.isArray(efficiency.profiles))) throw new Error('invalid_harness_efficiency_profiles');
    for (const [name, profile] of Object.entries(efficiency.profiles ?? {})) {
      if (!['THIN', 'STANDARD', 'DEEP'].includes(name) || !profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error(`invalid_harness_efficiency_profile:${name}`);
      assertIntegerRange(profile.maximumInitialContextTokens, `harness_efficiency_context:${name}`, 256, 10_000_000);
      assertIntegerRange(profile.maximumSources, `harness_efficiency_sources:${name}`, 1, 1_000_000);
      assertIntegerRange(profile.maximumOptionalSkills, `harness_efficiency_skills:${name}`, 0, 100_000);
      assertIntegerRange(profile.maximumTools, `harness_efficiency_tools:${name}`, 1, 100_000);
      assertIntegerRange(profile.maximumTurns, `harness_efficiency_turns:${name}`, 1, 10_000);
      if (profile.allowBroadRepositoryContext !== undefined && typeof profile.allowBroadRepositoryContext !== 'boolean') throw new Error(`invalid_harness_efficiency_broad_context:${name}`);
      if (profile.allowSharedContext !== undefined && typeof profile.allowSharedContext !== 'boolean') throw new Error(`invalid_harness_efficiency_shared_context:${name}`);
    }
  }
  if (config.spark !== undefined) {
    const spark = config.spark;
    if (!spark || typeof spark !== 'object' || Array.isArray(spark)) throw new Error('invalid_spark_config');
    if (spark.enabled !== undefined && typeof spark.enabled !== 'boolean') throw new Error('invalid_spark_enabled');
    if (spark.verificationRequired !== undefined && spark.verificationRequired !== true) throw new Error('spark_verification_required');
    if (spark.model !== undefined && (typeof spark.model !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(spark.model))) throw new Error('invalid_spark_model');
    if (spark.modelRole !== undefined && (typeof spark.modelRole !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(spark.modelRole))) throw new Error('invalid_spark_model_role');
    assertIntegerRange(spark.maximumFiles, 'spark_maximum_files', 0, 10);
    assertIntegerRange(spark.maximumChangedLines, 'spark_maximum_changed_lines', 1, 1_000);
    assertIntegerRange(spark.maximumAttempts, 'spark_maximum_attempts', 1, 1);
    assertIntegerRange(spark.maximumSubagents, 'spark_maximum_subagents', 0, 0);
    assertIntegerRange(spark.maximumContextTokens, 'spark_maximum_context_tokens', 256, 8_192);
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
