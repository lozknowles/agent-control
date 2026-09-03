import type {ModelConfig, ProviderAccountProfileConfig, ProviderConfig} from './config.js';
import {LocalCodexNodeExecutionPort, type CodexNodeExecutionPort} from './codex-node-execution.js';
import {normalizeModelUsage, type ModelInvocationResult, type ProviderInvocationTelemetry} from './openai-compatible-provider.js';

type InvocationOptions = {timeoutMs?: number; maximumOutputTokens?: number; structured?: boolean; outputSchema?: Record<string, unknown>; signal?: AbortSignal; onTelemetry?: (event: ProviderInvocationTelemetry) => void};

/** Schema-constrained read-only repository review through one governed Codex execution node. */
export class CodexRepositoryReviewClient {
  constructor(
    private readonly provider: ProviderConfig,
    private readonly account: ProviderAccountProfileConfig,
    private readonly nodeId = account.nodeId ?? 'controller',
    private readonly nodeExecution: CodexNodeExecutionPort = new LocalCodexNodeExecutionPort(),
  ) {
    if (provider.kind !== 'cli') throw new Error('codex_repository_review_provider_kind_invalid');
  }

  async invoke(model: ModelConfig, input: string, options: InvocationOptions = {}): Promise<ModelInvocationResult & {nodeId: string}> {
    if (model.provider !== this.provider.id || model.accountProfile !== this.account.id) throw new Error('model_account_profile_mismatch');
    if ((this.account.nodeId ?? this.nodeId) !== this.nodeId) throw new Error('model_account_node_mismatch');
    if (!options.structured || !options.outputSchema) throw new Error('codex_repository_review_schema_required');
    if (options.signal?.aborted) throw new Error('provider_cancelled');
    const started = Date.now();
    options.onTelemetry?.({phase: 'started', providerId: this.provider.id, modelId: model.id, elapsedMs: 0, context: {tokens: null, limitTokens: model.limits?.contextTokens ?? null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
    let completionTelemetryEmitted = false;
    const run = await this.nodeExecution.execReadOnlyStructured({provider: this.provider, account: this.account, model, nodeId: this.nodeId, instruction: input, outputSchema: options.outputSchema, maximumOutputTokens: options.maximumOutputTokens, timeoutMs: options.timeoutMs ?? 30_000, onTelemetry: event => {
      if (event.type !== 'turn.completed') return;
      completionTelemetryEmitted = true;
      const usage = normalizeModelUsage(event.usage, model);
      options.onTelemetry?.({phase: 'completed', providerId: this.provider.id, modelId: model.id, elapsedMs: event.elapsedMs, usage, context: singleTurnContext(usage.totalTokens, model.limits?.contextTokens)});
    }});
    if (run.providerId !== this.provider.id || run.accountProfileId !== this.account.id || run.modelId !== model.id || run.nodeId !== this.nodeId) throw new Error('codex_node_execution_identity_mismatch');
    if (run.observedItemTypes.includes('file_change')) throw new Error('codex_exec_capability_envelope_violation:file_change');
    const elapsedMs = Date.now() - started, usage = normalizeModelUsage(run.usage, model);
    if (!completionTelemetryEmitted) options.onTelemetry?.({phase: 'completed', providerId: this.provider.id, modelId: model.id, elapsedMs, usage, context: singleTurnContext(usage.totalTokens, model.limits?.contextTokens)});
    return {providerId: this.provider.id, accountProfileId: this.account.id, modelId: model.id, nodeId: this.nodeId, providerModel: model.providerModel, output: run.finalMessage, elapsedMs, usage, responseModel: model.providerModel, finishReason: 'completed', toolCall: null};
  }
}

function singleTurnContext(totalTokens: number | null, limitTokens?: number) {
  if (totalTokens === null || limitTokens === undefined) return {tokens: null, limitTokens: limitTokens ?? null, authority: 'unavailable' as const, source: 'codex_jsonl_does_not_report_current_context'};
  return {tokens: totalTokens, limitTokens, authority: 'estimated' as const, source: 'codex_ephemeral_single_turn_usage_estimate'};
}
