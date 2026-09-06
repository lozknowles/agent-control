import {createHash} from 'node:crypto';
import type {ModelConfig, ProviderConfig} from './config.js';
import {providerPromptBoundary, renderProviderPrompt, type ProviderPromptInput} from './provider-prompt.js';
import {resolveProviderCredential} from './provider-credential-store.js';
import {redactSensitiveText} from './security-redaction.js';

export const PROMPT_CACHE_KEY_CAPABILITY = 'prompt-cache.key';
export const PROMPT_CACHE_EXPLICIT_CAPABILITY = 'prompt-cache.explicit';

export interface NormalizedModelUsage {inputTokens: number | null; outputTokens: number | null; cachedInputTokens: number | null; cacheWriteTokens?: number | null; totalTokens: number | null; providerReportedCost: number | null; calculatedCost: number | null; currency: string | null;}
export interface ModelInvocationResult {providerId: string; accountProfileId?: string; nodeId?: string; modelId: string; providerModel: string; output: string; elapsedMs: number; usage: NormalizedModelUsage; responseModel: string | null; finishReason: string | null; toolCall: {name: string; arguments: string} | null;}
export interface PartialModelInvocation extends ModelInvocationResult {responseHash: string;}
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export interface ProviderInvocationTelemetry {phase: 'started' | 'completed'; providerId: string; modelId: string; elapsedMs: number; usage?: NormalizedModelUsage; context: {tokens: number | null; limitTokens: number | null; authority: 'authoritative' | 'estimated' | 'unavailable'; source: string};}
export interface ProviderRequestExtension {profile: string; body: Readonly<Record<string, unknown>>;}

export class OpenAICompatibleProviderClient {
  constructor(private readonly provider: ProviderConfig, private readonly fetcher: FetchLike = fetch, private readonly credential = () => resolveProviderCredential(provider), private readonly identity: {accountProfileId?: string; nodeId?: string} = {}) {
    if (provider.kind !== 'openai-compatible' && provider.kind !== 'responses' && provider.kind !== 'local') throw new Error('provider_not_openai_compatible');
    if (!provider.baseUrl) throw new Error('provider_base_url_required');
  }
  async invoke(model: ModelConfig, input: ProviderPromptInput, options: {timeoutMs?: number; maximumOutputTokens?: number; structured?: boolean; outputSchema?: Record<string, unknown>; toolProbe?: string; requestExtension?: ProviderRequestExtension; signal?: AbortSignal; onTelemetry?: (event: ProviderInvocationTelemetry) => void} = {}): Promise<ModelInvocationResult> {
    if (model.provider !== this.provider.id) throw new Error('model_provider_mismatch');
    if ((model.accountProfile ?? undefined) !== this.identity.accountProfileId) throw new Error('model_account_profile_mismatch');
    const token = this.credential(), controller = new AbortController(), started = Date.now();
    options.onTelemetry?.({phase: 'started', providerId: this.provider.id, modelId: model.id, elapsedMs: 0, context: {tokens: null, limitTokens: model.limits?.contextTokens ?? this.provider.qualification?.advertisedContextLimitTokens ?? null, authority: 'unavailable', source: 'provider_did_not_report_current_context'}});
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    const wire = this.provider.wireApi ?? 'responses';
    const endpoint = `${this.provider.baseUrl!.replace(/\/$/, '')}/${wire === 'chat-completions' ? 'chat/completions' : 'responses'}`;
    const renderedInput = renderProviderPrompt(input);
    const promptCache = wire === 'responses' ? promptCacheRequest(this.provider, model, input) : {};
    const parameters = {type: 'object', properties: {marker: {type: 'string'}}, required: ['marker'], additionalProperties: false};
    const responseFormat = options.outputSchema ? {type: 'json_schema', json_schema: {name: 'agent_control_output', strict: true, schema: options.outputSchema}} : {type: 'json_object'};
    const coreBody = wire === 'chat-completions'
      ? {model: model.providerModel, messages: [{role: 'user', content: renderedInput}], max_tokens: options.maximumOutputTokens ?? 256, ...(options.structured ? {temperature: 0, response_format: responseFormat} : {}), ...(options.toolProbe ? {tools: [{type: 'function', function: {name: options.toolProbe, description: 'Return the requested qualification marker', parameters}}], tool_choice: {type: 'function', function: {name: options.toolProbe}}} : {})}
      : {model: model.providerModel, input: promptCache.input ?? renderedInput, max_output_tokens: options.maximumOutputTokens ?? 256, ...promptCache.parameters, ...(options.structured ? {text: {format: options.outputSchema ? {type: 'json_schema', name: 'agent_control_output', strict: true, schema: options.outputSchema} : {type: 'json_object'}}} : {}), ...(options.toolProbe ? {tools: [{type: 'function', name: options.toolProbe, description: 'Return the requested qualification marker', parameters, strict: true}], tool_choice: {type: 'function', name: options.toolProbe}} : {})};
    const body = extendProviderRequest(coreBody, options.requestExtension);
    try {
      const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
      const response = await this.fetcher(endpoint, {method: 'POST', headers: {'content-type': 'application/json', ...(token ? {authorization: `Bearer ${token}`} : {})}, body: JSON.stringify(body), signal});
      if (!response.ok) throw providerError(response.status);
      let payload: Record<string, unknown>;
      try { payload = await response.json() as Record<string, unknown>; } catch { throw new Error('provider_malformed_response'); }
      const extractedToolCall = extractToolCall(payload, wire), toolCall = extractedToolCall ? {name: redactSensitiveText(extractedToolCall.name, [token]), arguments: redactSensitiveText(extractedToolCall.arguments, [token])} : null, output = redactSensitiveText(extractOutput(payload, wire), [token]), partial: PartialModelInvocation = {providerId: this.provider.id, ...(this.identity.accountProfileId ? {accountProfileId: this.identity.accountProfileId} : {}), ...(this.identity.nodeId ? {nodeId: this.identity.nodeId} : {}), modelId: model.id, providerModel: model.providerModel, output, elapsedMs: Date.now() - started, usage: normalizeModelUsage(payload.usage, model), responseModel: typeof payload.model === 'string' ? redactSensitiveText(payload.model, [token]) : null, finishReason: redactSensitiveText(extractFinishReason(payload, wire) ?? '', [token]) || null, toolCall, responseHash:`sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`};
      if (!output && !toolCall) throw Object.assign(new Error('provider_malformed_response'),{partialInvocation:partial});
      const {responseHash: _responseHash, ...result}=partial, limitTokens=model.limits?.contextTokens ?? this.provider.qualification?.advertisedContextLimitTokens ?? null, estimatedContext=result.usage.totalTokens !== null && limitTokens !== null;
      options.onTelemetry?.({phase: 'completed', providerId: this.provider.id, modelId: model.id, elapsedMs: result.elapsedMs, usage: result.usage, context: {tokens: estimatedContext ? result.usage.totalTokens : null, limitTokens, authority: estimatedContext ? 'estimated' : 'unavailable', source: estimatedContext ? 'ephemeral_single_turn_usage_estimate' : 'provider_did_not_report_current_context'}}); return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error(options.signal?.aborted ? 'provider_cancelled' : 'provider_timeout');
      throw sanitizeError(error, token);
    }
    finally { clearTimeout(timeout); }
  }
}

const RESERVED_REQUEST_FIELDS = new Set(['model','messages','input','max_tokens','max_output_tokens','response_format','text','tools','tool_choice','stream']);
function extendProviderRequest(core: Record<string, unknown>, extension?: ProviderRequestExtension) {
  if (!extension) return core;
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(extension.profile)) throw new Error('provider_request_extension_invalid');
  const serialized = JSON.stringify(extension.body);
  if (Buffer.byteLength(serialized) > 16_384 || redactSensitiveText(serialized) !== serialized) throw new Error('provider_request_extension_invalid');
  const body = JSON.parse(serialized) as Record<string, unknown>;
  if (Object.keys(body).some(key => RESERVED_REQUEST_FIELDS.has(key))) throw new Error('provider_request_extension_reserved_field');
  return {...core, ...body};
}

function extractFinishReason(payload: Record<string, unknown>, wire: string) {
  if (wire === 'chat-completions') { const choice = Array.isArray(payload.choices) && payload.choices[0] && typeof payload.choices[0] === 'object' ? payload.choices[0] as Record<string, unknown> : undefined; return typeof choice?.finish_reason === 'string' ? choice.finish_reason : null; }
  if (typeof payload.status === 'string') return payload.status;
  const incomplete = payload.incomplete_details && typeof payload.incomplete_details === 'object' ? payload.incomplete_details as Record<string, unknown> : undefined;
  return typeof incomplete?.reason === 'string' ? incomplete.reason : null;
}

function extractOutput(payload: Record<string, unknown>, wire: string) {
  if (wire === 'chat-completions') { const choices = Array.isArray(payload.choices) ? payload.choices : []; const message = choices[0] && typeof choices[0] === 'object' ? (choices[0] as Record<string, unknown>).message : undefined; return message && typeof message === 'object' ? String((message as Record<string, unknown>).content ?? '') : ''; }
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap(item => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'message' && Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : []).map(item => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'output_text' ? (item as Record<string, unknown>).text : '').filter(item => typeof item === 'string').join('');
}
function extractToolCall(payload: Record<string, unknown>, wire: string) {
  if (wire === 'chat-completions') {
    const choices = Array.isArray(payload.choices) ? payload.choices : [], message = choices[0] && typeof choices[0] === 'object' ? (choices[0] as Record<string, unknown>).message : undefined;
    const calls = message && typeof message === 'object' && Array.isArray((message as Record<string, unknown>).tool_calls) ? (message as Record<string, unknown>).tool_calls as unknown[] : [], call = calls[0];
    const fn = call && typeof call === 'object' ? (call as Record<string, unknown>).function : undefined;
    return fn && typeof fn === 'object' && typeof (fn as Record<string, unknown>).name === 'string' && typeof (fn as Record<string, unknown>).arguments === 'string' ? {name: (fn as Record<string, unknown>).name as string, arguments: (fn as Record<string, unknown>).arguments as string} : null;
  }
  const output = Array.isArray(payload.output) ? payload.output : [], call = output.find(item => item && typeof item === 'object' && (item as Record<string, unknown>).type === 'function_call') as Record<string, unknown> | undefined;
  return call && typeof call.name === 'string' && typeof call.arguments === 'string' ? {name: call.name, arguments: call.arguments} : null;
}
export function normalizeModelUsage(value: unknown, model: ModelConfig): NormalizedModelUsage {
  const usage = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const inputDetails = usage.input_tokens_details as Record<string, unknown> | undefined;
  const input = number(usage.input_tokens ?? usage.prompt_tokens), output = number(usage.output_tokens ?? usage.completion_tokens), cached = number(usage.cached_input_tokens ?? usage.cachedInputTokens ?? inputDetails?.cached_tokens ?? (usage.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens), cacheWrite = number(usage.cache_write_tokens ?? usage.cacheWriteTokens ?? usage.cache_creation_input_tokens ?? inputDetails?.cache_write_tokens), total = number(usage.total_tokens) ?? (input !== null && output !== null ? input + output : null);
  const calculated = calculateModelUsageCost(input, output, cached, model.pricing, cacheWrite);
  return {inputTokens: input, outputTokens: output, cachedInputTokens: cached, cacheWriteTokens: cacheWrite, totalTokens: total, providerReportedCost: number(usage.cost), calculatedCost: calculated, currency: model.pricing?.currency ?? null};
}

export function calculateModelUsageCost(input: number | null, output: number | null, cached: number | null, pricing?: ModelConfig['pricing'], cacheWrite: number | null = null) {
  if (!pricing || input === null || output === null || (cached !== null && cached > input) || (cacheWrite !== null && cacheWrite > input) || (cached !== null && cacheWrite !== null && cached + cacheWrite > input)) return null;
  const cachedRate = pricing.cachedInputPerMillionTokens ?? pricing.inputPerMillionTokens;
  // If cached input has a distinct price, an absent cache measurement makes
  // exact calculated cost unknowable. Equal rates make the split irrelevant.
  if (cached === null && cachedRate !== pricing.inputPerMillionTokens) return null;
  if (cacheWrite === null && pricing.cacheWritePerMillionTokens !== undefined) return null;
  const cachedInput = cached ?? 0;
  const cacheWriteInput = cacheWrite ?? 0;
  return ((input - cachedInput - cacheWriteInput) * pricing.inputPerMillionTokens + cachedInput * cachedRate + cacheWriteInput * (pricing.cacheWritePerMillionTokens ?? pricing.inputPerMillionTokens) + output * pricing.outputPerMillionTokens) / 1_000_000;
}

function promptCacheRequest(provider: ProviderConfig, model: ModelConfig, input: ProviderPromptInput): {input?: unknown; parameters?: Record<string, unknown>} {
  const boundary = providerPromptBoundary(input);
  if (!boundary) return {};
  const parameters: Record<string, unknown> = {};
  if (supportsCacheCapability(provider, model, PROMPT_CACHE_KEY_CAPABILITY)) {
    parameters.prompt_cache_key = createHash('sha256').update(JSON.stringify([provider.id, model.providerModel, model.accountProfile ?? null, boundary.prompt.cacheScope])).digest('hex');
  }
  if (!supportsCacheCapability(provider, model, PROMPT_CACHE_EXPLICIT_CAPABILITY)) return Object.keys(parameters).length ? {parameters} : {};
  const content = boundary.prompt.blocks.map((block, index) => ({
    type: 'input_text',
    text: block.text,
    ...(index === boundary.lastStableBlock ? {prompt_cache_breakpoint: {mode: 'explicit'}} : {}),
  }));
  parameters.prompt_cache_options = {mode: 'explicit'};
  return {input: [{role: 'user', content}], parameters};
}

function supportsCacheCapability(provider: ProviderConfig, model: ModelConfig, capability: string) {
  return provider.capabilities?.includes(capability) === true && model.capabilities.includes(capability);
}
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
function providerError(status: number) { return new Error(status === 401 || status === 403 ? 'provider_authentication_failed' : status === 429 ? 'provider_rate_limited' : status >= 500 ? 'provider_unavailable' : `provider_request_failed:${status}`); }
function sanitizeError(error: unknown, credential = '') { const message = error instanceof Error ? error.message : 'provider_request_failed',sanitized=new Error(redactSensitiveText(message, [credential]).slice(0, 240)),partial=(error as {partialInvocation?:PartialModelInvocation})?.partialInvocation;return partial?Object.assign(sanitized,{partialInvocation:partial}):sanitized; }
