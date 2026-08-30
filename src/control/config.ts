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

export interface ProviderConfig {
  id: string;
  name?: string;
  kind: 'local' | 'responses' | 'cli' | 'browser-bridge';
  baseUrl?: string;
  wireApi?: 'responses';
  requiresAuth?: boolean;
  credentialEnv?: string;
  credentialFileEnv?: string;
  parallelism?: number;
  costClass?: 'free' | 'included' | 'metered';
  capabilities?: string[];
  qualificationModel?: string;
  qualification?: {
    status?: 'unqualified' | 'historically-qualified' | 'qualified';
    advertisedContextLimitTokens?: number;
    maximumObservedInputTokens?: number;
    pricingStatus?: string;
    lastSuccessfulAt?: string;
    evidence?: string[];
  };
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

export interface AgentControlConfig {
  schemaVersion: 1;
  resources: ResourceConfig[];
  providers: ProviderConfig[];
  services: ServiceConfig[];
  lanes: LaneConfig[];
  tokenAwareOutput?: TokenAwareOutputConfig;
  harnessEfficiency?: HarnessEfficiencyConfig;
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
  const safeTokenAccountingKeys = new Set(['tokenAwareOutput', 'completeMaxTokens', 'artifactOnlyAboveReturnedTokens', 'minimumCompleteTokens', 'harnessEfficiency', 'maximumInitialContextTokens', 'advertisedContextLimitTokens', 'maximumObservedInputTokens']);
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
    services: input.services ?? [],
    lanes: input.lanes ?? [],
    tokenAwareOutput: input.tokenAwareOutput,
    harnessEfficiency: input.harnessEfficiency,
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
    if (provider.baseUrl) assertUrl(provider.baseUrl, `provider_${provider.id}`);
    for (const [field, value] of [['credentialEnv', provider.credentialEnv], ['credentialFileEnv', provider.credentialFileEnv]] as const) {
      if (value !== undefined && (typeof value !== 'string' || !/^[A-Z_][A-Z0-9_]{0,127}$/.test(value))) throw new Error(`invalid_provider_${field}:${provider.id}`);
    }
    if (provider.qualification) {
      assertIntegerRange(provider.qualification.advertisedContextLimitTokens, `provider_context_limit:${provider.id}`, 1, 100_000_000);
      assertIntegerRange(provider.qualification.maximumObservedInputTokens, `provider_observed_input:${provider.id}`, 1, 100_000_000);
      assertStringList(provider.qualification.evidence, `provider_qualification_evidence:${provider.id}`, /^[a-z0-9][a-z0-9:._/-]+$/i);
      if (provider.qualification.lastSuccessfulAt && Number.isNaN(Date.parse(provider.qualification.lastSuccessfulAt))) throw new Error(`invalid_provider_qualification_timestamp:${provider.id}`);
    }
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
