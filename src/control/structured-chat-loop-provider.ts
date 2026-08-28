import {createHash} from 'node:crypto';
import type {ExecutionRecipe} from './adaptive-harness.js';
import type {RecipeExecutionResult, RecipeExecutor, ToolInvocationGateway} from './harness-dispatch.js';
import {
  createInvocationObservation,
  type ContextPacketSource,
  type InvocationPricing,
  type ModelInvocationObservation,
} from './harness-efficiency.js';
import {estimateTokens} from './token-aware-output.js';

export interface StructuredChatToolSchema {
  id: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface StructuredChatLoopOptions {
  providerId: string;
  modelId: string;
  baseUrl: string;
  toolSchemas: StructuredChatToolSchema[];
  finishToolId: string;
  timeoutMs?: number;
  maximumOutputTokens?: number;
  maximumToolResultBytes?: number;
  executionStrategy?: string;
  authorization?: () => string | undefined;
  signalForRecipe?: (recipe: ExecutionRecipe) => AbortSignal | undefined;
  pricing?: InvocationPricing;
  fetch?: typeof globalThis.fetch;
}

interface ChatMessage {role: 'system' | 'user' | 'assistant'; content: string;}
interface ChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{finish_reason?: string; message?: {content?: string | null}}>;
  usage?: Record<string, unknown>;
  error?: {message?: string};
}
interface ToolRequest {tool: string; input?: unknown;}

/**
 * Bounded multi-turn JSON-tool executor for OpenAI-compatible transports.
 *
 * Agent Control retains every raw handler, authorization decision and verifier.
 * The model can request only the typed tools present in the governed recipe and
 * cannot turn this transport into a shell or mark its own mutation verified.
 */
export class StructuredChatLoopProvider {
  private readonly endpoint: string;
  private readonly schemas: StructuredChatToolSchema[];

  constructor(private readonly options: StructuredChatLoopOptions) {
    const parsed = new URL(options.baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('structured_chat_loop_base_url_invalid');
    if (!options.providerId.trim() || !options.modelId.trim()) throw new Error('structured_chat_loop_identity_required');
    if (!options.finishToolId.trim()) throw new Error('structured_chat_loop_finish_tool_required');
    if (!options.toolSchemas.some(tool => tool.id === options.finishToolId)) throw new Error('structured_chat_loop_finish_schema_missing');
    if (new Set(options.toolSchemas.map(tool => tool.id)).size !== options.toolSchemas.length) throw new Error('structured_chat_loop_duplicate_tool_schema');
    for (const schema of options.toolSchemas) {
      if (!schema.id.trim() || !schema.description.trim() || !schema.inputSchema || typeof schema.inputSchema !== 'object' || Array.isArray(schema.inputSchema)) throw new Error('structured_chat_loop_tool_schema_invalid');
    }
    this.schemas = options.toolSchemas.map(schema => structuredClone(schema));
    this.endpoint = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  executor(instruction: string, contextSources: ContextPacketSource[] = []): RecipeExecutor {
    const retainedSources = contextSources.map(source => structuredClone(source));
    return {execute: (recipe, tools) => this.execute(instruction, retainedSources, recipe, tools)};
  }

  private async execute(instruction: string, contextSources: ContextPacketSource[], recipe: ExecutionRecipe, tools: ToolInvocationGateway): Promise<RecipeExecutionResult> {
    const granted = new Set(recipe.tools.map(tool => tool.id));
    const schemas = this.schemas.filter(schema => granted.has(schema.id));
    if (!schemas.some(schema => schema.id === this.options.finishToolId)) throw new Error('structured_chat_loop_finish_tool_not_granted');
    const maximumTurns = Math.max(1, recipe.harness?.maximumTurns ?? 1);
    const timeoutMs = Math.min(recipe.resourceLimits.maximumLatencyMs ?? Number.POSITIVE_INFINITY, this.options.timeoutMs ?? 300_000);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('structured_chat_loop_timeout_invalid');
    const deadline = Date.now() + timeoutMs;
    const maximumToolResultBytes = this.options.maximumToolResultBytes ?? 32_768;
    const systemInstructions = renderSystemInstructions(schemas, this.options.finishToolId);
    const agentControlInstructions = 'Agent Control owns tool authorization, leases, human takeover, cancellation and independent verification. A finish request reports only that the worker has stopped; it never proves success.';
    const renderedContext = contextSources.map((source, index) => `SOURCE ${index + 1} [${source.kind}] ${source.id}\n${source.content ?? ''}`).join('\n\n');
    const messages: ChatMessage[] = [
      {role: 'system', content: `${systemInstructions}\n\n${agentControlInstructions}`},
      {role: 'user', content: `${instruction}\n\nBEGIN AUTHORISED CONTEXT\n${renderedContext}\nEND AUTHORISED CONTEXT`},
    ];
    const observations: ModelInvocationObservation[] = [];
    const evidence: string[] = [];
    const toolTranscript: Array<{turn: number; tool: string; resultHash: string}> = [];

    for (let turn = 1; turn <= maximumTurns; turn++) {
      const externalSignal = this.options.signalForRecipe?.(recipe);
      if (externalSignal?.aborted) return failed('structured_chat_loop_cancelled', observations, evidence, 'CANCELLED');
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) return failed('structured_chat_loop_timeout', observations, evidence);
      const startedAt = new Date().toISOString();
      let response: {body: ChatResponse};
      try { response = await this.request(messages, Math.max(1, remainingMs), externalSignal); }
      catch (error) {
        const detail = boundedError(error);
        return failed(detail, observations, evidence, detail.includes('cancelled') ? 'CANCELLED' : 'FAILED');
      }
      const completedAt = new Date().toISOString();
      const content = response.body.choices?.[0]?.message?.content;
      if (!content) return failed('provider_missing_tool_request', observations, evidence);
      const responseHash = createHash('sha256').update(content).digest('hex');
      let request: ToolRequest;
      try { request = parseToolRequest(content); }
      catch (error) {
        observations.push(this.observation(recipe, contextSources, messages, turn, startedAt, completedAt, response.body, [], responseHash, boundedError(error)));
        return failed(boundedError(error), observations, [...evidence, `provider_response_sha256:${responseHash}`]);
      }
      observations.push(this.observation(recipe, contextSources, messages, turn, startedAt, completedAt, response.body, [request.tool], responseHash));
      evidence.push(`provider_response:${response.body.id ?? responseHash.slice(0, 16)}`, `provider_response_sha256:${responseHash}`);
      messages.push({role: 'assistant', content});
      let output: unknown;
      try { output = await tools.invoke(request.tool, request.input); }
      catch (error) {
        const detail = boundedError(error);
        if (detail.startsWith('tool_policy_denied:')) throw withObservations(error, observations, evidence);
        output = {ok: false, error: detail};
      }
      const serialized = boundedJson(output, maximumToolResultBytes);
      const resultHash = createHash('sha256').update(serialized).digest('hex');
      toolTranscript.push({turn, tool: request.tool, resultHash});
      evidence.push(`tool_executed:${request.tool}`, `tool_result_sha256:${resultHash}`);
      if (request.tool === this.options.finishToolId) {
        const result = {providerId: this.options.providerId, modelId: response.body.model ?? this.options.modelId, turns: turn, finishTool: request.tool, finishResult: output, toolTranscript};
        return {
          resultRef: JSON.stringify(result), confidence: .5,
          fingerprint: createHash('sha256').update(stableJson(result)).digest('hex'),
          evidence: [...new Set(evidence)], invocations: observations,
        };
      }
      const maximumProcessedTokens = typeof recipe.runtime.maximumProcessedTokens === 'number' ? recipe.runtime.maximumProcessedTokens : undefined;
      const observedProcessedTokens = observations.reduce((sum, item) => sum + (item.usage.totalProcessedTokens ?? item.usage.inputTokens ?? 0), 0);
      if (maximumProcessedTokens !== undefined && observedProcessedTokens >= maximumProcessedTokens) return failed(`structured_chat_loop_token_budget:${observedProcessedTokens}:${maximumProcessedTokens}`, observations, evidence);
      messages.push({role: 'user', content: `TOOL RESULT (authoritative, bounded)\n${serialized}\nContinue with exactly one JSON tool request.`});
    }
    return failed(`structured_chat_loop_turn_limit:${maximumTurns}`, observations, evidence);
  }

  private async request(messages: ChatMessage[], timeoutMs: number, externalSignal?: AbortSignal) {
    const fetcher = this.options.fetch ?? globalThis.fetch;
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = externalSignal ? AbortSignal.any([timeout, externalSignal]) : timeout;
    const authorization = this.options.authorization?.();
    let response: Response;
    try {
      response = await fetcher(this.endpoint, {
        method: 'POST',
        headers: {'content-type': 'application/json', ...(authorization ? {authorization: `Bearer ${authorization}`} : {})},
        body: JSON.stringify({model: this.options.modelId, messages, response_format: {type: 'json_object'}, temperature: 0, max_tokens: this.options.maximumOutputTokens ?? 768, stream: false}),
        signal,
      });
    } catch (error) {
      if (externalSignal?.aborted) throw new Error('structured_chat_loop_cancelled');
      if (timeout.aborted) throw new Error('structured_chat_loop_timeout');
      throw error;
    }
    const body = await response.json() as ChatResponse;
    if (!response.ok) throw new Error(`provider_http_error:${response.status}:${body.error?.message ?? 'unknown'}`);
    return {body};
  }

  private observation(recipe: ExecutionRecipe, sources: ContextPacketSource[], messages: ChatMessage[], turn: number, startedAt: string, completedAt: string, body: ChatResponse, toolIds: string[], responseHash: string, error?: string) {
    const conversation = turn > 1 ? [{
      id: `${recipe.id}:conversation:${turn}`, kind: 'conversation_history' as const,
      content: messages.slice(2).map(message => `${message.role}:${message.content}`).join('\n'),
      required: true, persistent: false, relevance: 1, provenanceIds: [recipe.fingerprint],
    }] : [];
    const startupSources: ContextPacketSource[] = [
      {id: `${recipe.id}:loop-system`, kind: 'system_instructions', content: renderSystemInstructions(this.schemas.filter(schema => recipe.tools.some(tool => tool.id === schema.id)), this.options.finishToolId), required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      {id: `${recipe.id}:loop-control`, kind: 'agent_control_instructions', content: 'Agent Control owns tool authorization, leases, human takeover, cancellation and independent verification.', required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      {id: `${recipe.id}:loop-tools`, kind: 'tool_schemas', content: JSON.stringify(this.schemas.filter(schema => recipe.tools.some(tool => tool.id === schema.id))), required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      ...sources,
      ...conversation,
    ];
    return createInvocationObservation({
      jobId: recipe.jobId ?? recipe.taskId, runId: recipe.runId, taskId: recipe.taskId, laneId: recipe.authority.laneId,
      model: body.model ?? this.options.modelId, provider: this.options.providerId, harnessProfile: recipe.harness?.profile ?? 'STANDARD',
      executionStrategy: this.options.executionStrategy ?? 'structured-chat.bounded-json-tool-loop', turnNumber: turn,
      startedAt, completedAt, startupSources, rawUsage: body.usage, pricing: this.options.pricing,
      toolIds, filesContextSupplied: sources.filter(source => ['repository_instructions', 'workspace_bootstrap'].includes(source.kind)).length,
      retrievedContextTokens: sources.filter(source => ['task_context', 'memory_shared_context', 'other'].includes(source.kind)).reduce((sum, source) => sum + (source.estimatedTokens ?? estimateTokens(source.content ?? '')), 0),
      repositoryContextTokens: sources.filter(source => ['repository_instructions', 'workspace_bootstrap'].includes(source.kind)).reduce((sum, source) => sum + (source.estimatedTokens ?? estimateTokens(source.content ?? '')), 0),
      contextSourceIds: recipe.context.sourceIds, outcome: error ? 'FAILED' : 'COMPLETE', error,
      recipeFingerprint: recipe.fingerprint, contextPacketId: recipe.harness?.contextPacketId,
      evidenceIds: [`provider_response_sha256:${responseHash}`],
    });
  }
}

function renderSystemInstructions(schemas: StructuredChatToolSchema[], finishToolId: string): string {
  return `You are a bounded implementation worker. Return only one JSON object with shape {"tool":"<granted id>","input":{...}} and no prose. Inspect before editing. Use typed tools only. Run the available verifier-facing test tool before finishing when practical. Request ${finishToolId} only after work is complete or when safely blocked. Granted tools:\n${JSON.stringify(schemas)}`;
}

function parseToolRequest(content: string): ToolRequest {
  const normalized = content.trim().match(/^```json\s*([\s\S]*?)\s*```$/i)?.[1] ?? content;
  let parsed: unknown;
  try { parsed = JSON.parse(normalized); } catch { throw new Error('provider_tool_request_invalid_json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('provider_tool_request_invalid');
  const request = parsed as Record<string, unknown>;
  if (typeof request.tool !== 'string' || !request.tool.trim()) throw new Error('provider_tool_request_missing_tool');
  if (Object.keys(request).some(key => !['tool', 'input'].includes(key))) throw new Error('provider_tool_request_unknown_field');
  return {tool: request.tool, input: request.input};
}

function boundedJson(value: unknown, maximumBytes: number): string {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') <= maximumBytes) return serialized;
  const buffer = Buffer.from(serialized, 'utf8').subarray(0, Math.max(0, maximumBytes - 160));
  return JSON.stringify({compacted: true, originalBytes: Buffer.byteLength(serialized, 'utf8'), prefix: buffer.toString('utf8'), detail: 'Typed result exceeded the model-facing bound.'});
}

function failed(error: string, invocations: ModelInvocationObservation[], evidence: string[], outcome: 'FAILED' | 'CANCELLED' = 'FAILED'): RecipeExecutionResult {
  return {error, retryable: outcome !== 'CANCELLED', evidence: [...new Set(evidence)], invocations};
}

function withObservations(error: unknown, invocations: ModelInvocationObservation[], evidence: string[]) {
  const retained = error instanceof Error ? error : new Error(String(error));
  Object.assign(retained, {efficiencyObservations: invocations.map(item => structuredClone(item)), efficiencyEvidenceIds: [...evidence]});
  return retained;
}

function boundedError(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length <= 512 ? value : `${value.slice(0, 509)}...`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
