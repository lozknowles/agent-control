import {createHash} from 'node:crypto';
import type {HarnessCandidate} from './adaptive-harness.js';
import type {RecipeExecutor, ToolInvocationGateway} from './harness-dispatch.js';
import type {ProviderDefinition} from './providers.js';

export interface StructuredChatProviderOptions {
  provider: ProviderDefinition;
  workerId: string;
  modelId: string;
  workerCapabilities: string[];
  modelCapabilities: string[];
  availableSkillIds?: string[];
  availableToolIds: string[];
  promptProfile?: {id: string; version: string; description: string};
  runtime?: Record<string, string | number | boolean>;
  qualificationEvidence: string[];
  authorization?: () => string | undefined;
  fetch?: typeof globalThis.fetch;
}

interface ChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{finish_reason?: string; message?: {content?: string | null}}>;
  usage?: {prompt_tokens?: number; completion_tokens?: number; total_tokens?: number};
  error?: {message?: string};
}

interface ToolRequest {tool: string; input?: unknown;}

/** Candidate plus executor factory for OpenAI-compatible chat transports; raw tools never cross this boundary. */
export class StructuredChatProviderFactory {
  private readonly endpoint: string;
  constructor(private readonly options: StructuredChatProviderOptions) {
    if (!options.provider.baseUrl) throw new Error('structured_chat_base_url_required');
    const parsed = new URL(options.provider.baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('structured_chat_base_url_invalid');
    if (!options.qualificationEvidence.length) throw new Error('structured_chat_qualification_evidence_required');
    this.endpoint = `${options.provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  candidate(): HarnessCandidate {
    const provider = this.options.provider;
    return {
      route: {
        id: `${provider.id}:${this.options.modelId}:${this.options.workerId}`,
        providerId: provider.id,
        modelId: this.options.modelId,
        workerId: this.options.workerId,
        local: provider.kind === 'local',
        health: 'healthy',
        qualified: true,
        qualificationReason: `qualified:${this.options.qualificationEvidence.join(',')}`,
        capabilities: [...provider.capabilities],
        pricing: {currency: 'USD', billing: provider.costClass, inputPerMillionTokens: 0, outputPerMillionTokens: 0, fixedPerRequest: 0, effectiveFrom: '2026-08-24', source: 'qualification configuration'},
        performance: {startupLatencyMs: 250, inputTokensPerSecond: 100, outputTokensPerSecond: 40, historicalSuccessRate: .9, expectedQuality: .8, confidence: .8, contextLimitTokens: 32768, source: 'configured', sampleSize: 1},
      },
      workerCapabilities: [...this.options.workerCapabilities],
      modelCapabilities: [...this.options.modelCapabilities],
      promptProfiles: [this.options.promptProfile ?? {id: 'structured-tool-request', version: '1', description: 'Emit one JSON tool request for Agent Control mediation'}],
      availableSkillIds: [...(this.options.availableSkillIds ?? [])],
      availableToolIds: [...this.options.availableToolIds],
      runtime: {...(this.options.runtime ?? {temperature: 0})},
    };
  }

  executor(instruction: string): RecipeExecutor {
    return {execute: (recipe, tools) => this.execute(instruction, recipe.tools.map(tool => tool.id), tools)};
  }

  private async execute(instruction: string, grantedToolIds: string[], tools: ToolInvocationGateway) {
    const fetcher = this.options.fetch ?? globalThis.fetch;
    const authorization = this.options.authorization?.();
    const response = await fetcher(this.endpoint, {
      method: 'POST',
      headers: {'content-type': 'application/json', ...(authorization ? {authorization: `Bearer ${authorization}`} : {})},
      body: JSON.stringify({
        model: this.options.modelId,
        messages: [
          {role: 'system', content: `Return only JSON with shape {"tool":"<id>","input":{...}}. Choose exactly one granted tool. Granted tool ids: ${grantedToolIds.join(', ')}. Do not claim the tool ran.`},
          {role: 'user', content: instruction},
        ],
        response_format: {type: 'json_object'}, temperature: 0, max_tokens: 256, stream: false,
      }),
    });
    const body = await response.json() as ChatResponse;
    if (!response.ok) throw new Error(`provider_http_error:${response.status}:${body.error?.message ?? 'unknown'}`);
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error('provider_missing_tool_request');
    const request = parseToolRequest(content);
    const output = await tools.invoke(request.tool, request.input);
    const responseHash = createHash('sha256').update(content).digest('hex');
    const result = {providerId: this.options.provider.id, modelId: body.model ?? this.options.modelId, providerResponseId: body.id, requestedTool: request.tool, toolOutput: output, responseHash, usage: body.usage};
    return {
      resultRef: JSON.stringify(result), confidence: .8,
      fingerprint: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
      evidence: [`provider_response:${body.id ?? responseHash.slice(0, 16)}`, `provider_response_sha256:${responseHash}`, `tool_executed:${request.tool}`],
    };
  }
}

function parseToolRequest(content: string): ToolRequest {
  let parsed: unknown;
  const normalized = content.trim().match(/^```json\s*([\s\S]*?)\s*```$/i)?.[1] ?? content;
  try { parsed = JSON.parse(normalized); } catch { throw new Error('provider_tool_request_invalid_json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('provider_tool_request_invalid');
  const request = parsed as Record<string, unknown>;
  if (typeof request.tool !== 'string' || !request.tool.trim()) throw new Error('provider_tool_request_missing_tool');
  if (Object.keys(request).some(key => !['tool', 'input'].includes(key))) throw new Error('provider_tool_request_unknown_field');
  return {tool: request.tool, input: request.input};
}
