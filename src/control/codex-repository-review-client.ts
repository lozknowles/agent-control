import type {ModelConfig, ProviderAccountProfileConfig, ProviderConfig} from './config.js';
import {probeCodexChatGptAuth, runCodexExec, type CodexExecRequest, type CodexExecResult} from './codex-exec-provider.js';
import {normalizeModelUsage, type ModelInvocationResult, type ProviderInvocationTelemetry} from './openai-compatible-provider.js';
import {resolveCodexAccountEnvironment} from './provider-account-profile.js';

type InvocationOptions = {timeoutMs?: number; maximumOutputTokens?: number; structured?: boolean; outputSchema?: Record<string, unknown>; signal?: AbortSignal; onTelemetry?: (event: ProviderInvocationTelemetry) => void};

/** Schema-constrained read-only repository review through one isolated ChatGPT-authenticated Codex home. */
export class CodexRepositoryReviewClient {
  constructor(
    private readonly provider: ProviderConfig,
    private readonly account: ProviderAccountProfileConfig,
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly runner: (request: CodexExecRequest) => Promise<CodexExecResult> = runCodexExec,
    private readonly authProbe: (command: string, cwd: string, timeoutMs: number, environment?: NodeJS.ProcessEnv) => Promise<unknown> = probeCodexChatGptAuth,
  ) {
    if (provider.kind !== 'cli') throw new Error('codex_repository_review_provider_kind_invalid');
  }

  async invoke(model: ModelConfig, input: string, options: InvocationOptions = {}): Promise<ModelInvocationResult> {
    if (model.provider !== this.provider.id || model.accountProfile !== this.account.id) throw new Error('model_account_profile_mismatch');
    if (!options.structured || !options.outputSchema) throw new Error('codex_repository_review_schema_required');
    if (options.signal?.aborted) throw new Error('provider_cancelled');
    const resolved = resolveCodexAccountEnvironment(this.account, this.environment), command = this.environment.CODEX_COMMAND ?? 'codex', cwd = process.cwd(), timeoutMs = options.timeoutMs ?? 30_000, started = Date.now();
    await this.authProbe(command, cwd, timeoutMs, resolved.environment);
    options.onTelemetry?.({phase: 'started', providerId: this.provider.id, modelId: model.id, elapsedMs: 0, context: {tokens: null, limitTokens: model.limits?.contextTokens ?? null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
    let completionTelemetryEmitted = false;
    const run = await this.runner({command, cwd, modelId: model.providerModel, instruction: input, grantedToolIds: [], timeoutMs, environment: resolved.environment, loadUserConfig: true, outputSchema: options.outputSchema, onTelemetry: event => {
      if (event.type !== 'turn.completed') return;
      completionTelemetryEmitted = true;
      const usage = normalizeModelUsage(event.usage, model);
      options.onTelemetry?.({phase: 'completed', providerId: this.provider.id, modelId: model.id, elapsedMs: event.elapsedMs, usage, context: {tokens: null, limitTokens: model.limits?.contextTokens ?? null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
    }});
    if (run.observedItemTypes.includes('file_change')) throw new Error('codex_exec_capability_envelope_violation:file_change');
    const elapsedMs = Date.now() - started, usage = normalizeModelUsage(run.usage, model);
    if (!completionTelemetryEmitted) options.onTelemetry?.({phase: 'completed', providerId: this.provider.id, modelId: model.id, elapsedMs, usage, context: {tokens: null, limitTokens: model.limits?.contextTokens ?? null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
    return {providerId: this.provider.id, accountProfileId: this.account.id, modelId: model.id, providerModel: model.providerModel, output: run.finalMessage, elapsedMs, usage, responseModel: model.providerModel, finishReason: 'completed', toolCall: null};
  }
}
