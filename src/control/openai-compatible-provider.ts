import fs from 'node:fs';
import type {ModelConfig, ProviderConfig} from './config.js';

export interface NormalizedModelUsage {inputTokens: number | null; outputTokens: number | null; cachedInputTokens: number | null; totalTokens: number | null; providerReportedCost: number | null; calculatedCost: number | null; currency: string | null;}
export interface ModelInvocationResult {providerId: string; modelId: string; providerModel: string; output: string; elapsedMs: number; usage: NormalizedModelUsage; responseModel: string | null;}
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class OpenAICompatibleProviderClient {
  constructor(private readonly provider: ProviderConfig, private readonly fetcher: FetchLike = fetch) {
    if (provider.kind !== 'openai-compatible' && provider.kind !== 'responses' && provider.kind !== 'local') throw new Error('provider_not_openai_compatible');
    if (!provider.baseUrl) throw new Error('provider_base_url_required');
  }
  async invoke(model: ModelConfig, input: string, options: {timeoutMs?: number; maximumOutputTokens?: number; structured?: boolean} = {}): Promise<ModelInvocationResult> {
    if (model.provider !== this.provider.id) throw new Error('model_provider_mismatch');
    const token = resolveToken(this.provider), controller = new AbortController(), started = Date.now();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    const wire = this.provider.wireApi ?? 'responses';
    const endpoint = `${this.provider.baseUrl!.replace(/\/$/, '')}/${wire === 'chat-completions' ? 'chat/completions' : 'responses'}`;
    const body = wire === 'chat-completions'
      ? {model: model.providerModel, messages: [{role: 'user', content: input}], max_tokens: options.maximumOutputTokens ?? 256, ...(options.structured ? {response_format: {type: 'json_object'}} : {})}
      : {model: model.providerModel, input, max_output_tokens: options.maximumOutputTokens ?? 256, ...(options.structured ? {text: {format: {type: 'json_object'}}} : {})};
    try {
      const response = await this.fetcher(endpoint, {method: 'POST', headers: {'content-type': 'application/json', ...(token ? {authorization: `Bearer ${token}`} : {})}, body: JSON.stringify(body), signal: controller.signal});
      if (!response.ok) throw providerError(response.status);
      let payload: Record<string, unknown>;
      try { payload = await response.json() as Record<string, unknown>; } catch { throw new Error('provider_malformed_response'); }
      const output = extractOutput(payload, wire); if (!output) throw new Error('provider_malformed_response');
      return {providerId: this.provider.id, modelId: model.id, providerModel: model.providerModel, output, elapsedMs: Date.now() - started, usage: normalizeUsage(payload.usage, model), responseModel: typeof payload.model === 'string' ? payload.model : null};
    } catch (error) { if ((error as Error).name === 'AbortError') throw new Error('provider_timeout'); throw sanitizeError(error); }
    finally { clearTimeout(timeout); }
  }
}

function resolveToken(provider: ProviderConfig) {
  const auth = provider.auth ?? (provider.credentialEnv ? {type: 'bearer-env' as const, env: provider.credentialEnv} : {type: provider.requiresAuth ? 'bearer-env' as const : 'none' as const, env: provider.credentialEnv});
  if (auth.type === 'none') return '';
  if (!auth.env) throw new Error('provider_secret_reference_missing');
  const value = auth.type === 'bearer-file-env' ? (process.env[auth.env] ? fs.readFileSync(process.env[auth.env]!, 'utf8').trim() : '') : process.env[auth.env]?.trim();
  if (!value) throw new Error('provider_authentication_required'); return value;
}
function extractOutput(payload: Record<string, unknown>, wire: string) {
  if (wire === 'chat-completions') { const choices = Array.isArray(payload.choices) ? payload.choices : []; const message = choices[0] && typeof choices[0] === 'object' ? (choices[0] as Record<string, unknown>).message : undefined; return message && typeof message === 'object' ? String((message as Record<string, unknown>).content ?? '') : ''; }
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap(item => item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : []).map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).text : '').filter(item => typeof item === 'string').join('');
}
function normalizeUsage(value: unknown, model: ModelConfig): NormalizedModelUsage {
  const usage = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const input = number(usage.input_tokens ?? usage.prompt_tokens), output = number(usage.output_tokens ?? usage.completion_tokens), cached = number((usage.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens ?? (usage.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens), total = number(usage.total_tokens) ?? (input !== null && output !== null ? input + output : null);
  const calculated = model.pricing && input !== null && output !== null ? ((input - (cached ?? 0)) * model.pricing.inputPerMillionTokens + (cached ?? 0) * (model.pricing.cachedInputPerMillionTokens ?? model.pricing.inputPerMillionTokens) + output * model.pricing.outputPerMillionTokens) / 1_000_000 : null;
  return {inputTokens: input, outputTokens: output, cachedInputTokens: cached, totalTokens: total, providerReportedCost: number(usage.cost), calculatedCost: calculated, currency: model.pricing?.currency ?? null};
}
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
function providerError(status: number) { return new Error(status === 401 || status === 403 ? 'provider_authentication_failed' : status === 429 ? 'provider_rate_limited' : status >= 500 ? 'provider_unavailable' : `provider_request_failed:${status}`); }
function sanitizeError(error: unknown) { const message = error instanceof Error ? error.message : 'provider_request_failed'; return new Error(message.replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]').slice(0, 240)); }
