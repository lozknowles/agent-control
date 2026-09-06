import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {ModelConfig, ProviderConfig} from './config.js';
import type {ModelIntelligenceLedger, ModelIntelligenceProjection} from './model-intelligence.js';
import type {ModelRegistry} from './model-registry.js';
import {OpenAICompatibleProviderClient, type FetchLike, type NormalizedModelUsage, type ProviderRequestExtension} from './openai-compatible-provider.js';
import {providerCredentialReferenceType, providerCredentialStatus, resolveProviderCredential, type ProviderCredentialStatus} from './provider-credential-store.js';
import {redactSensitiveText, redactSensitiveValue} from './security-redaction.js';

export type CatalogEndpointStatus = 'UNKNOWN' | 'AVAILABLE' | 'AUTHENTICATION_REQUIRED' | 'RATE_LIMITED' | 'UNAVAILABLE';
export type CatalogDiscoveryStatus = 'NEVER' | 'DISCOVERING' | 'SUCCEEDED' | 'FAILED';
export type CatalogReviewState = 'DISCOVERED' | 'UNQUALIFIED' | 'SMOKE_TESTED' | 'BENCHMARK_QUEUED' | 'BENCHMARKED' | 'QUALIFIED' | 'REJECTED' | 'LIMITED' | 'ROUTING_ELIGIBLE';
export type CatalogSupport = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN';
export type CatalogAuthority = 'PROVIDER_REPORTED' | 'ADAPTER_DERIVED' | 'OPERATOR_CONFIGURED' | 'UNKNOWN';
const MAXIMUM_CATALOG_RESPONSE_BYTES = 8 * 1024 * 1024;

export interface CatalogValue<T> {value: T | null; authority: CatalogAuthority}
export interface CatalogRateLimitObservation {requestsLimit: number | null; requestsRemaining: number | null; tokensLimit: number | null; tokensRemaining: number | null; reset: string | null; retryAfter: string | null; authority: 'PROVIDER_HEADER' | 'UNKNOWN'}
export interface CatalogQuotaObservation {value: number | null; unit: string | null; authority: 'PROVIDER_REPORTED' | 'UNKNOWN'}
export interface CatalogModelMetadata {
  family: CatalogValue<string>;
  contextLimitTokens: CatalogValue<number>;
  maximumOutputTokens: CatalogValue<number>;
  inputModalities: CatalogValue<string[]>;
  outputModalities: CatalogValue<string[]>;
  reasoning: CatalogValue<CatalogSupport>;
  coding: CatalogValue<CatalogSupport>;
  toolCalling: CatalogValue<CatalogSupport>;
  structuredOutput: CatalogValue<CatalogSupport>;
  streaming: CatalogValue<CatalogSupport>;
  downloadable: CatalogValue<boolean>;
  license: CatalogValue<string>;
  costClassification: CatalogValue<'FREE' | 'INCLUDED' | 'METERED'>;
}
export interface CatalogSmokeProbe {id: 'basic-completion' | 'structured-json' | 'coding' | 'tool-calling' | 'context-reliability'; status: 'PASS' | 'FAIL' | 'UNAVAILABLE'; elapsedMs: number | null; ttftMs: number | null; ttftAuthority: 'PROVIDER_REPORTED' | 'MEASURED' | 'UNAVAILABLE'; usage: NormalizedModelUsage | null; retries: number; finishReason: string | null; failure: string | null; responseHash: string | null; invocationProfile: string | null}
export interface CatalogSmokeEvidence {status: 'PASS' | 'LIMITED' | 'FAILED'; startedAt: string; completedAt: string; probes: CatalogSmokeProbe[]; inputSha256: string; adapterId: string}
export interface ProviderCatalogModel {
  providerId: string;
  registryModelId: string;
  canonicalModelId: string;
  ownedBy: string | null;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  available: boolean;
  reviewState: CatalogReviewState;
  stateHistory: Array<{state: CatalogReviewState; at: string; reason: string; evidence?: string}>;
  routingEligible: boolean;
  metadata: CatalogModelMetadata;
  smoke?: CatalogSmokeEvidence;
  benchmarkBatchIds: string[];
}
interface ProviderCatalogObservation {providerId: string; endpointStatus: CatalogEndpointStatus; discoveryStatus: CatalogDiscoveryStatus; credentialStatus: ProviderCredentialStatus; lastDiscoveryAt: string | null; lastError: string | null; rateLimit: CatalogRateLimitObservation; quota: CatalogQuotaObservation}
interface ProviderCatalogSnapshot {schema: 'agent-control.provider-catalog/v1'; providers: ProviderCatalogObservation[]; models: ProviderCatalogModel[]}

export interface ProviderDiscoveryResult {models: Array<{id: string; ownedBy: string | null; metadata: CatalogModelMetadata}>; rateLimit: CatalogRateLimitObservation; quota: CatalogQuotaObservation}
export interface ProviderDiscoveryAdapter {
  id: string;
  supports(provider: ProviderConfig): boolean;
  validateCredential?(credential: string): void;
  discover(input: {provider: ProviderConfig; credential: string; fetcher: FetchLike; timeoutMs: number}): Promise<ProviderDiscoveryResult>;
  smokeRequest?(input: {provider: ProviderConfig; model: ModelConfig; probe: CatalogSmokeProbe['id']}): ProviderRequestExtension | undefined;
}

export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, ProviderDiscoveryAdapter>();
  register(adapter: ProviderDiscoveryAdapter) { if (this.adapters.has(adapter.id)) throw new Error('provider_adapter_exists'); this.adapters.set(adapter.id, adapter); return this; }
  resolve(provider: ProviderConfig) {
    const id = provider.adapter ?? 'openai-compatible-v1', adapter = this.adapters.get(id);
    if (!adapter || !adapter.supports(provider)) throw new Error('provider_discovery_adapter_unavailable');
    return adapter;
  }
}

export class OpenAICompatibleDiscoveryAdapter implements ProviderDiscoveryAdapter {
  readonly id: string = 'openai-compatible-v1';
  supports(provider: ProviderConfig) { return ['openai-compatible', 'responses', 'local'].includes(provider.kind) && Boolean(provider.baseUrl); }
  validateCredential(_credential: string) {}
  smokeRequest(_input: {provider: ProviderConfig; model: ModelConfig; probe: CatalogSmokeProbe['id']}): ProviderRequestExtension | undefined { return undefined; }
  async discover(input: {provider: ProviderConfig; credential: string; fetcher: FetchLike; timeoutMs: number}): Promise<ProviderDiscoveryResult> {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const endpoint = discoveryUrl(input.provider), response = await input.fetcher(endpoint, {method: 'GET', headers: {accept: 'application/json', ...(input.credential ? {authorization: `Bearer ${input.credential}`} : {})}, signal: controller.signal});
      if (!response.ok) throw providerDiscoveryError(response.status);
      const payload = await boundedJson(response);
      return {models: parseOpenAIModelList(redactSensitiveValue(payload, '', [input.credential])), rateLimit: rateLimitFrom(response.headers, input.credential), quota: quotaFrom(response.headers)};
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error('provider_catalog_timeout');
      throw safeError(error, input.credential);
    } finally { clearTimeout(timeout); }
  }
}

/** NVIDIA-specific policy is restricted to credential shape and the documented hosted endpoint. */
export class NvidiaHostedProviderAdapter extends OpenAICompatibleDiscoveryAdapter {
  override readonly id = 'nvidia-hosted-v1';
  override supports(provider: ProviderConfig) {
    if (!super.supports(provider) || !provider.baseUrl) return false;
    const url = new URL(provider.baseUrl);
    return url.protocol === 'https:' && url.hostname === 'integrate.api.nvidia.com' && provider.wireApi === 'chat-completions';
  }
  override validateCredential(credential: string) { if (!/^nvapi-[A-Za-z0-9_-]{16,}$/.test(credential)) throw new Error('provider_credential_format_invalid'); }
  override smokeRequest() { return {profile: 'nvidia-hosted-nonreasoning-smoke-v1', body: {chat_template_kwargs: {enable_thinking: false}}}; }
}

export function defaultProviderAdapterRegistry() {
  return new ProviderAdapterRegistry().register(new OpenAICompatibleDiscoveryAdapter()).register(new NvidiaHostedProviderAdapter());
}

export class ProviderCatalogStore {
  private readonly providers = new Map<string, ProviderCatalogObservation>();
  private readonly models = new Map<string, ProviderCatalogModel>();
  constructor(readonly file?: string, private readonly clock = () => new Date().toISOString()) {
    if (!file || !fs.existsSync(file)) return;
    const value = redactSensitiveValue(JSON.parse(fs.readFileSync(file, 'utf8'))) as ProviderCatalogSnapshot;
    if (value.schema !== 'agent-control.provider-catalog/v1') throw new Error('provider_catalog_snapshot_invalid');
    for (const provider of value.providers) this.providers.set(provider.providerId, provider);
    for (const model of value.models) this.models.set(catalogKey(model.providerId, model.canonicalModelId), {...model, available: model.available !== false});
  }
  provider(providerId: string) { const value = this.providers.get(providerId); return value ? structuredClone(value) : undefined; }
  modelsList(providerId?: string) { return [...this.models.values()].filter(model => !providerId || model.providerId === providerId).sort((a,b) => a.canonicalModelId.localeCompare(b.canonicalModelId)).map(model => structuredClone(model)); }
  beginDiscovery(providerId: string, credentialStatus: ProviderCredentialStatus) { const current = this.provider(providerId) ?? emptyProvider(providerId); current.discoveryStatus = 'DISCOVERING'; current.credentialStatus = credentialStatus; current.lastError = null; this.providers.set(providerId, current); this.save(); }
  failDiscovery(providerId: string, credentialStatus: ProviderCredentialStatus, error: unknown) { const current = this.provider(providerId) ?? emptyProvider(providerId), reason = safeFailure(error); current.discoveryStatus = 'FAILED'; current.endpointStatus = reason === 'provider_authentication_failed' || reason === 'provider_authentication_required' ? 'AUTHENTICATION_REQUIRED' : reason === 'provider_rate_limited' ? 'RATE_LIMITED' : 'UNAVAILABLE'; current.credentialStatus = credentialStatus; current.lastError = reason; this.providers.set(providerId, current); this.save(); return structuredClone(current); }
  completeDiscovery(providerId: string, credentialStatus: ProviderCredentialStatus, result: ProviderDiscoveryResult) {
    const at = this.clock(), current = this.provider(providerId) ?? emptyProvider(providerId); current.discoveryStatus = 'SUCCEEDED'; current.endpointStatus = 'AVAILABLE'; current.credentialStatus = credentialStatus; current.lastDiscoveryAt = at; current.lastError = null; current.rateLimit = result.rateLimit; current.quota = result.quota; this.providers.set(providerId, current);
    const seen = new Set<string>();
    for (const discovered of result.models) {
      const key = catalogKey(providerId, discovered.id); seen.add(key); const existing = this.models.get(key), registryModelId = existing?.registryModelId ?? discoveredRegistryId(providerId, discovered.id);
      const value: ProviderCatalogModel = existing
        ? {...existing, ownedBy: discovered.ownedBy, lastDiscoveredAt: at, available: true, metadata: discovered.metadata}
        : {providerId, registryModelId, canonicalModelId: discovered.id, ownedBy: discovered.ownedBy, firstDiscoveredAt: at, lastDiscoveredAt: at, available: true, reviewState: 'UNQUALIFIED', stateHistory: [{state: 'DISCOVERED', at, reason: 'provider catalogue observation'}, {state: 'UNQUALIFIED', at, reason: 'discovery never grants qualification'}], routingEligible: false, metadata: discovered.metadata, benchmarkBatchIds: []};
      if (existing && !existing.available) { value.routingEligible = false; transition(value, 'UNQUALIFIED', at, 'model returned to provider catalogue; routing requires current review'); }
      this.models.set(key, value);
    }
    for (const [key, model] of this.models) if (model.providerId === providerId && !seen.has(key) && model.available) {
      model.available = false; model.routingEligible = false;
      transition(model, 'LIMITED', at, 'model absent from latest successful provider catalogue');
      this.models.set(key, model);
    }
    this.save(); return {provider: structuredClone(current), models: this.modelsList(providerId), discovered: seen.size};
  }
  recordSmoke(providerId: string, canonicalModelId: string, smoke: CatalogSmokeEvidence) {
    const item = this.mustModel(providerId, canonicalModelId); item.smoke = structuredClone(smoke); transition(item, 'SMOKE_TESTED', smoke.completedAt, `bounded smoke ${smoke.status.toLowerCase()}`, `smoke:${smoke.inputSha256}`); this.models.set(catalogKey(providerId, canonicalModelId), item); this.save(); return structuredClone(item);
  }
  markBenchmarkQueued(modelIds: string[], batchId: string) { for (const modelId of modelIds) { const item = [...this.models.values()].find(value => value.registryModelId === modelId); if (!item) continue; if (!item.benchmarkBatchIds.includes(batchId)) item.benchmarkBatchIds.push(batchId); transition(item, 'BENCHMARK_QUEUED', this.clock(), 'frozen benchmark queued', `batch:${batchId}`); } this.save(); }
  reconcile(intelligence: ModelIntelligenceProjection) {
    let changed = false;
    for (const item of this.models.values()) {
      if (!item.available) {
        if (item.routingEligible) { item.routingEligible = false; changed = true; }
        if (item.reviewState !== 'LIMITED') { transition(item, 'LIMITED', this.clock(), 'model is absent from latest successful provider catalogue'); changed = true; }
        continue;
      }
      const route = intelligence.routes.filter(value => value.identity.providerId === item.providerId && value.identity.modelId === item.registryModelId).sort((a,b) => b.current.completed-a.current.completed)[0];
      const batches = intelligence.queue.filter(batch => batch.candidates.some(candidate => candidate.providerId === item.providerId && candidate.modelId === item.registryModelId));
      const terminal = batches.filter(batch => ['COMPLETED','PARTIAL','BLOCKED','FAILED'].includes(batch.status)).at(-1);
      if (item.routingEligible && (!route || !['QUALIFIED','PREFERRED'].includes(route.state))) {
        item.routingEligible = false;
        transition(item, route?.state === 'QUARANTINED' || route?.state === 'RETIRED' ? 'REJECTED' : 'LIMITED', this.clock(), 'routing disabled because current model intelligence is no longer qualified', route ? `route:${route.routeKey}` : undefined);
        changed = true;
      }
      const derived: CatalogReviewState | undefined = item.routingEligible ? 'ROUTING_ELIGIBLE' : route && ['QUALIFIED','PREFERRED'].includes(route.state) ? 'QUALIFIED' : route?.state === 'QUARANTINED' ? 'REJECTED' : route?.state === 'DEGRADED' ? 'LIMITED' : terminal ? 'BENCHMARKED' : batches.some(batch => ['QUEUED','RUNNING'].includes(batch.status)) ? 'BENCHMARK_QUEUED' : undefined;
      if (derived && item.reviewState !== derived) { transition(item, derived, this.clock(), 'reconciled from immutable model intelligence', terminal ? `batch:${terminal.id}` : route ? `route:${route.routeKey}` : undefined); changed = true; }
    }
    if (changed) this.save();
  }
  setRoutingEligibility(providerId: string, canonicalModelId: string, enabled: boolean, intelligence: ModelIntelligenceProjection) {
    this.reconcile(intelligence); const item = this.mustModel(providerId, canonicalModelId);
    if (enabled && !item.available) throw new Error('provider_catalog_model_unavailable');
    if (enabled && item.reviewState !== 'QUALIFIED') throw new Error('provider_catalog_model_not_qualified');
    if (!enabled && !item.routingEligible) throw new Error('provider_catalog_model_routing_not_enabled');
    item.routingEligible = enabled; transition(item, enabled ? 'ROUTING_ELIGIBLE' : 'QUALIFIED', this.clock(), enabled ? 'operator enabled qualified route' : 'operator disabled routing'); this.models.set(catalogKey(providerId, canonicalModelId), item); this.save(); return structuredClone(item);
  }
  snapshot(): ProviderCatalogSnapshot { return {schema: 'agent-control.provider-catalog/v1', providers: [...this.providers.values()].map(value => structuredClone(value)), models: this.modelsList()}; }
  private mustModel(providerId: string, canonicalModelId: string) { const value = this.models.get(catalogKey(providerId, canonicalModelId)); if (!value) throw new Error('provider_catalog_model_missing'); return structuredClone(value); }
  private save() { if (!this.file) return; fs.mkdirSync(path.dirname(this.file), {recursive: true, mode: 0o700}); const temporary = `${this.file}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(redactSensitiveValue(this.snapshot()), null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, this.file); }
}

export class ProviderCatalogRuntime {
  private byId: Map<string, ProviderConfig>;
  constructor(
    providers: ProviderConfig[],
    readonly store: ProviderCatalogStore,
    private readonly models: ModelRegistry,
    private readonly intelligence: ModelIntelligenceLedger,
    private readonly adapters = defaultProviderAdapterRegistry(),
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly fetcher: FetchLike = fetch,
    private readonly clock = () => new Date().toISOString(),
  ) { this.byId = new Map(providers.map(provider => [provider.id, structuredClone(provider)])); this.syncModels(); }

  projection() {
    const intelligence = this.intelligence.projection(); this.store.reconcile(intelligence); this.syncModels(); const rows = this.store.modelsList();
    return {
      schema: 'agent-control.provider-catalog-projection/v1' as const,
      observedAt: this.clock(),
      providers: [...this.byId.values()].map(provider => {
        const observation = this.store.provider(provider.id) ?? emptyProvider(provider.id), discovered = rows.filter(model => model.providerId === provider.id);
        return {id: provider.id, name: provider.name ?? provider.id, kind: provider.kind, enabled: provider.enabled !== false, adapter: provider.adapter ?? 'openai-compatible-v1', baseUrl: provider.baseUrl ?? null, authenticationType: provider.auth?.type ?? (provider.requiresAuth ? 'bearer-env' : 'none'), credentialReference: providerCredentialReferenceType(provider), credentialStatus: providerCredentialStatus(provider, this.environment), endpointStatus: observation.endpointStatus, discoveryStatus: observation.discoveryStatus, discoveredModels: discovered.length, availableModels: discovered.filter(model => model.available).length, lastDiscoveryAt: observation.lastDiscoveryAt, rateLimit: observation.rateLimit, quota: observation.quota, costClassification: provider.costClass ? {value: provider.costClass.toUpperCase(), authority: 'OPERATOR_CONFIGURED'} : {value: null, authority: 'UNKNOWN'}, qualificationStatus: provider.qualification?.status ?? 'unqualified', routingEligibleModels: discovered.filter(model => model.routingEligible).length, lastError: observation.lastError};
      }),
      models: rows.map(model => ({...model, lifecycle: lifecycleProjection(model, intelligence), benchmark: benchmarkProjection(model, intelligence)})),
    };
  }

  async discover(providerId: string, timeoutMs = 30_000) {
    const provider = this.mustProvider(providerId); if (provider.enabled === false || provider.discovery?.enabled !== true) throw new Error('provider_discovery_disabled');
    const credentialStatus = providerCredentialStatus(provider, this.environment); this.store.beginDiscovery(provider.id, credentialStatus);
    let credential = '';
    try {
      credential = resolveProviderCredential(provider, this.environment); const adapter = this.adapters.resolve(provider); adapter.validateCredential?.(credential);
      const result = await adapter.discover({provider, credential, fetcher: this.fetcher, timeoutMs}); const completed = this.store.completeDiscovery(provider.id, credentialStatus, result); this.syncModels(); return completed;
    } catch (error) { const sanitized = safeError(error, credential); this.store.failDiscovery(provider.id, credentialStatus, sanitized); throw sanitized; }
  }

  async smoke(providerId: string, canonicalModelId: string) {
    const provider = this.mustProvider(providerId); if (provider.enabled === false) throw new Error('provider_disabled');
    const item = this.store.modelsList(providerId).find(model => model.canonicalModelId === canonicalModelId); if (!item) throw new Error('provider_catalog_model_missing');
    if (!item.available) throw new Error('provider_catalog_model_unavailable');
    const adapter = this.adapters.resolve(provider), startedAt = this.clock(), model = catalogModelConfig(item), client = new OpenAICompatibleProviderClient(provider, this.fetcher, () => { const credential = resolveProviderCredential(provider, this.environment); try { adapter.validateCredential?.(credential); } catch (error) { throw safeError(error, credential); } return credential; }), probes: CatalogSmokeProbe[] = [];
    const run = async (id: CatalogSmokeProbe['id'], prompt: string, options: NonNullable<Parameters<OpenAICompatibleProviderClient['invoke']>[2]>, verify: (result: Awaited<ReturnType<OpenAICompatibleProviderClient['invoke']>>) => boolean) => {
      const extension = adapter.smokeRequest?.({provider, model, probe: id});
      try { const result = await client.invoke(model, prompt, {...options, requestExtension: extension, timeoutMs: Math.min(options.timeoutMs ?? 45_000, 60_000)}), passed = result.finishReason !== 'length' && verify(result); probes.push({id, status: passed ? 'PASS' : 'FAIL', elapsedMs: result.elapsedMs, ttftMs: null, ttftAuthority: 'UNAVAILABLE', usage: result.usage, retries: 0, finishReason: result.finishReason, failure: passed ? null : result.finishReason === 'length' ? 'provider_output_truncated' : 'smoke_verification_failed', responseHash: hash(result.output || JSON.stringify(result.toolCall)), invocationProfile: extension?.profile ?? null}); }
      catch (error) { const partial = (error as {partialInvocation?: {elapsedMs: number; usage: NormalizedModelUsage; finishReason: string | null; responseHash: string}}).partialInvocation, reason = partial?.finishReason === 'length' ? 'provider_output_truncated' : safeFailure(error); probes.push({id, status: /unsupported|capability/.test(reason) ? 'UNAVAILABLE' : 'FAIL', elapsedMs: partial?.elapsedMs ?? null, ttftMs: null, ttftAuthority: 'UNAVAILABLE', usage: partial?.usage ?? null, retries: 0, finishReason: partial?.finishReason ?? null, failure: reason, responseHash: partial?.responseHash?.replace(/^sha256:/, '') ?? null, invocationProfile: extension?.profile ?? null}); }
    };
    await run('basic-completion', 'Reply with exactly AC_SMOKE_OK.', {maximumOutputTokens: 64}, result => result.output.includes('AC_SMOKE_OK'));
    await run('structured-json', 'Return the required marker.', {structured: true, outputSchema: markerSchema(), maximumOutputTokens: 128}, result => parseMarker(result.output));
    await run('coding', 'Check that a JavaScript add(a,b) function should return a + b, then reply with exactly AC_CODE_OK.', {maximumOutputTokens: 64}, result => result.output.includes('AC_CODE_OK'));
    await run('tool-calling', 'Call the required qualification function with marker AC_TOOL_OK.', {toolProbe: 'agent_control_qualification_marker', maximumOutputTokens: 128}, result => result.toolCall?.name === 'agent_control_qualification_marker' && parseToolMarker(result.toolCall.arguments));
    await run('context-reliability', `${'bounded-context-line\n'.repeat(256)}\nReply with exactly AC_CONTEXT_OK.`, {maximumOutputTokens: 64}, result => result.output.includes('AC_CONTEXT_OK'));
    const required = probes.filter(probe => ['basic-completion','coding','context-reliability'].includes(probe.id)), status = required.every(probe => probe.status === 'PASS') ? probes.every(probe => probe.status === 'PASS') ? 'PASS' : 'LIMITED' : 'FAILED', completedAt = this.clock();
    const smoke: CatalogSmokeEvidence = {status, startedAt, completedAt, probes, inputSha256: hash(smokeSuiteIdentity()), adapterId: adapter.id}; this.store.recordSmoke(providerId, canonicalModelId, smoke); this.syncModels(); return structuredClone(smoke);
  }

  markBenchmarkQueued(modelIds: string[], batchId: string) { this.store.markBenchmarkQueued(modelIds, batchId); }
  setRoutingEligibility(providerId: string, canonicalModelId: string, enabled: boolean) { const provider = this.mustProvider(providerId); if (enabled && provider.enabled === false) throw new Error('provider_disabled'); const item = this.store.setRoutingEligibility(providerId, canonicalModelId, enabled, this.intelligence.projection()); this.models.setDiscoveredRoutingEligibility(item.registryModelId, enabled); return item; }
  modelByRegistryId(modelId: string) { return this.store.modelsList().find(model => model.registryModelId === modelId); }
  syncModels() { for (const item of this.store.modelsList()) if (this.byId.has(item.providerId)) this.models.registerDiscoveredModel(catalogModelConfig(item)); }
  reloadProviders(providers: ProviderConfig[]) { this.byId = new Map(providers.map(provider => [provider.id, structuredClone(provider)])); this.syncModels(); }
  private mustProvider(providerId: string) { const value = this.byId.get(providerId); if (!value) throw new Error('provider_missing'); return structuredClone(value); }
}

function catalogModelConfig(item: ProviderCatalogModel): ModelConfig {
  const observed = new Set<string>();
  if (item.metadata.reasoning.value === 'SUPPORTED') observed.add('reasoning');
  if (item.metadata.coding.value === 'SUPPORTED') observed.add('coding');
  if (item.metadata.toolCalling.value === 'SUPPORTED') observed.add('tool-use');
  if (item.metadata.structuredOutput.value === 'SUPPORTED') observed.add('structured-output');
  for (const probe of item.smoke?.probes ?? []) if (probe.status === 'PASS') for (const capability of smokeCapabilities(probe.id)) observed.add(capability);
  return {id: item.registryModelId, provider: item.providerId, providerModel: item.canonicalModelId, displayName: item.canonicalModelId, enabled: item.available, routingEligible: item.routingEligible, capabilities: [...observed], nodes: ['controller'], limits: {...(item.metadata.contextLimitTokens.value ? {contextTokens: item.metadata.contextLimitTokens.value} : {}), ...(item.metadata.maximumOutputTokens.value ? {outputTokens: item.metadata.maximumOutputTokens.value} : {})}, qualification: {state: item.available ? 'UNTESTED' : 'DISABLED', version: `catalog-${item.firstDiscoveredAt}`, evidence: [`provider-catalog:${item.providerId}`]}};
}
function lifecycleProjection(model: ProviderCatalogModel, intelligence: ModelIntelligenceProjection) { const route = intelligence.routes.find(item => item.identity.providerId === model.providerId && item.identity.modelId === model.registryModelId); return {state: model.reviewState, routingEligible: model.routingEligible, modelIntelligenceState: route?.state ?? null}; }
function benchmarkProjection(model: ProviderCatalogModel, intelligence: ModelIntelligenceProjection) { const route = intelligence.routes.find(item => item.identity.providerId === model.providerId && item.identity.modelId === model.registryModelId), attempts = intelligence.attempts.filter(item => item.candidate.providerId === model.providerId && item.candidate.modelId === model.registryModelId), last = attempts.at(-1); return {score: route?.current.quality ?? null, codingScore: route?.byCategory.coding?.quality ?? null, toolUseScore: route?.byCategory['tool-calling']?.quality ?? null, reliability: route?.current.reliability ?? null, latencyMs: route?.current.timePerSuccessfulTaskMs ?? null, tokenEfficiency: route?.current.tokensPerSuccessfulTask ?? null, lastBenchmarkAt: last?.completedAt ?? null, historicalTrend: {days30: route?.days30.quality ?? null, days90: route?.days90.quality ?? null}, evidenceAttemptIds: attempts.map(item => item.id)}; }
function parseOpenAIModelList(payload: unknown) { const record = asRecord(payload), data = Array.isArray(record.data) ? record.data : Array.isArray(payload) ? payload : null; if (!data || data.length > 10_000) throw new Error('provider_catalog_schema_invalid'); const values = data.map(item => modelFrom(asRecord(item))); if (!values.length || values.some(item => !item.id)) throw new Error('provider_catalog_schema_invalid'); return [...new Map(values.map(item => [item.id, item])).values()]; }
function modelFrom(item: Record<string, unknown>): {id: string; ownedBy: string | null; metadata: CatalogModelMetadata} { const id = typeof item.id === 'string' ? safeModelId(item.id) : '', parameters = stringArray(item.supported_parameters), capabilities = asRecord(item.capabilities), input = stringArray(item.input_modalities ?? capabilities.input_modalities), output = stringArray(item.output_modalities ?? capabilities.output_modalities), support = (keys: string[]): CatalogValue<CatalogSupport> => { for (const key of keys) { if (typeof capabilities[key] === 'boolean') return {value: capabilities[key] ? 'SUPPORTED' : 'UNSUPPORTED', authority: 'PROVIDER_REPORTED'}; if (parameters?.includes(key)) return {value: 'SUPPORTED', authority: 'PROVIDER_REPORTED'}; } return {value: 'UNKNOWN', authority: 'UNKNOWN'}; }; return {id, ownedBy: typeof item.owned_by === 'string' ? safeText(item.owned_by, 128) : null, metadata: {family: {value: id.includes('/') ? id.split('/')[0] : null, authority: id.includes('/') ? 'ADAPTER_DERIVED' : 'UNKNOWN'}, contextLimitTokens: numericValue(item.context_length ?? item.context_window ?? item.max_model_len), maximumOutputTokens: numericValue(item.max_output_tokens), inputModalities: input ? {value: input, authority: 'PROVIDER_REPORTED'} : {value: null, authority: 'UNKNOWN'}, outputModalities: output ? {value: output, authority: 'PROVIDER_REPORTED'} : {value: null, authority: 'UNKNOWN'}, reasoning: support(['reasoning']), coding: support(['coding']), toolCalling: support(['tools','tool_choice','function_calling']), structuredOutput: support(['response_format','json_schema','structured_output']), streaming: support(['stream']), downloadable: typeof item.downloadable === 'boolean' ? {value: item.downloadable, authority: 'PROVIDER_REPORTED'} : {value: null, authority: 'UNKNOWN'}, license: typeof item.license === 'string' ? {value: safeText(item.license, 128), authority: 'PROVIDER_REPORTED'} : {value: null, authority: 'UNKNOWN'}, costClassification: costClassification(item.cost_classification, item.pricing)}}; }
function discoveryUrl(provider: ProviderConfig) { const base = provider.baseUrl!.replace(/\/$/, ''), part = provider.discovery?.path?.replace(/^\//, '') ?? 'models'; return `${base}/${part}`; }
function providerDiscoveryError(status: number) { return new Error(status === 401 || status === 403 ? 'provider_authentication_failed' : status === 429 ? 'provider_rate_limited' : status >= 500 ? 'provider_unavailable' : `provider_catalog_request_failed:${status}`); }
function rateLimitFrom(headers: Headers, credential = ''): CatalogRateLimitObservation { const values = {requestsLimit: headerNumber(headers, 'x-ratelimit-limit-requests'), requestsRemaining: headerNumber(headers, 'x-ratelimit-remaining-requests'), tokensLimit: headerNumber(headers, 'x-ratelimit-limit-tokens'), tokensRemaining: headerNumber(headers, 'x-ratelimit-remaining-tokens'), reset: safeHeader(headers.get('x-ratelimit-reset-requests') ?? headers.get('x-ratelimit-reset'), credential), retryAfter: safeHeader(headers.get('retry-after'), credential)}; return {...values, authority: Object.values(values).some(value => value !== null) ? 'PROVIDER_HEADER' : 'UNKNOWN'}; }
function quotaFrom(headers: Headers): CatalogQuotaObservation { const value = headerNumber(headers, 'x-quota-remaining'); return {value, unit: value === null ? null : 'provider-defined', authority: value === null ? 'UNKNOWN' : 'PROVIDER_REPORTED'}; }
function emptyProvider(providerId: string): ProviderCatalogObservation { return {providerId, endpointStatus: 'UNKNOWN', discoveryStatus: 'NEVER', credentialStatus: 'MISSING', lastDiscoveryAt: null, lastError: null, rateLimit: {requestsLimit:null,requestsRemaining:null,tokensLimit:null,tokensRemaining:null,reset:null,retryAfter:null,authority:'UNKNOWN'}, quota:{value:null,unit:null,authority:'UNKNOWN'}}; }
function transition(item: ProviderCatalogModel, state: CatalogReviewState, at: string, reason: string, evidence?: string) { if (item.reviewState === state) return; item.reviewState = state; item.stateHistory.push({state, at, reason, ...(evidence ? {evidence} : {})}); }
function markerSchema() { return {type:'object',properties:{marker:{type:'string'}},required:['marker'],additionalProperties:false}; }
function smokeSuiteIdentity() {
  return {
    id: 'provider-catalog-smoke',
    version: 2,
    probes: [
      {id: 'basic-completion', maximumOutputTokens: 64, structured: false},
      {id: 'structured-json', maximumOutputTokens: 128, structured: true},
      {id: 'coding', maximumOutputTokens: 64, structured: false},
      {id: 'tool-calling', maximumOutputTokens: 128, tool: 'agent_control_qualification_marker'},
      {id: 'context-reliability', maximumOutputTokens: 64, contextLines: 256, structured: false},
    ],
    verification: {
      finishReasonLengthIsFailure: true,
      providerOutputIsHashOnly: true,
    },
  };
}
function parseMarker(value: string, expected = 'AC_SMOKE_OK') { try { return (JSON.parse(value) as {marker?: unknown}).marker === expected; } catch { return false; } }
function parseToolMarker(value: string) { try { return (JSON.parse(value) as {marker?: unknown}).marker === 'AC_TOOL_OK'; } catch { return false; } }
function smokeCapabilities(id: CatalogSmokeProbe['id']) { return id === 'basic-completion' ? ['text'] : id === 'structured-json' ? ['structured-output'] : id === 'coding' ? ['coding'] : id === 'tool-calling' ? ['tool-use'] : ['context-reliability']; }
function discoveredRegistryId(providerId: string, canonicalModelId: string) { const slug = canonicalModelId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'model'; return `${providerId}-${slug}-${hash(canonicalModelId).slice(0, 8)}`.slice(0, 64); }
function catalogKey(providerId: string, modelId: string) { return `${providerId}\u0000${modelId}`; }
function numericValue(value: unknown): CatalogValue<number> { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? {value, authority:'PROVIDER_REPORTED'} : {value:null,authority:'UNKNOWN'}; }
function costClassification(explicit: unknown, pricingValue: unknown): CatalogValue<'FREE'|'INCLUDED'|'METERED'> { const reported = typeof explicit === 'string' ? explicit.toUpperCase() : ''; if (['FREE','INCLUDED','METERED'].includes(reported)) return {value: reported as 'FREE'|'INCLUDED'|'METERED', authority: 'PROVIDER_REPORTED'}; const pricing = asRecord(pricingValue), numbers = Object.values(pricing).map(item => typeof item === 'number' ? item : typeof item === 'string' && item.trim() !== '' ? Number(item) : NaN).filter(Number.isFinite); return numbers.length ? {value: numbers.every(item => item === 0) ? 'FREE' : 'METERED', authority:'ADAPTER_DERIVED'} : {value:null,authority:'UNKNOWN'}; }
function stringArray(value: unknown) { return Array.isArray(value) && value.every(item => typeof item === 'string') ? [...new Set(value.map(item => safeText(item, 64)))] : null; }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function safeModelId(value: string) { const safe = safeText(value, 256); if (!safe || !/^[a-z0-9][a-z0-9._:/-]{0,255}$/i.test(safe)) throw new Error('provider_catalog_model_id_invalid'); return safe; }
function safeText(value: string, max: number) { return redactSensitiveText(value).replace(/[\r\n]+/g, ' ').trim().slice(0, max); }
function safeHeader(value: string | null, credential = '') { return value ? safeText(redactSensitiveText(value, [credential]), 128) : null; }
function headerNumber(headers: Headers, name: string) { const value = headers.get(name); if (value === null || value.trim() === '') return null; const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
async function boundedJson(response: Response) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAXIMUM_CATALOG_RESPONSE_BYTES) throw new Error('provider_catalog_response_too_large');
  if (!response.body) throw new Error('provider_catalog_malformed_response');
  const reader = response.body.getReader(), chunks: Buffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAXIMUM_CATALOG_RESPONSE_BYTES) { void reader.cancel(); throw new Error('provider_catalog_response_too_large'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')) as unknown; } catch { throw new Error('provider_catalog_malformed_response'); }
}
function safeFailure(error: unknown, credential = '') { return safeText(redactSensitiveText(error instanceof Error ? error.message : String(error), [credential]), 240) || 'provider_catalog_failed'; }
function safeError(error: unknown, credential = '') { return new Error(safeFailure(error, credential)); }
function hash(value: unknown) { return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
