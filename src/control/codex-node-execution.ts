import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {ModelConfig, ProviderAccountProfileConfig, ProviderConfig, ResourceConfig} from './config.js';
import {probeCodexChatGptAuth, runCodexExec, type CodexExecRequest, type CodexExecResult, type CodexExecTelemetryEvent} from './codex-exec-provider.js';
import {executeSsh, sshResourceArgs, type SshExecutor} from './managed-node-ssh.js';
import {resolveCodexAccountEnvironment} from './provider-account-profile.js';

export interface CodexAccountStatusRequest {provider: ProviderConfig; account: ProviderAccountProfileConfig; nodeId: string; timeoutMs: number;}
export interface CodexAccountStatusResult {
  providerId: string; accountProfileId: string; nodeId: string; authenticated: boolean;
  codexVersion: string; executableSha256: string; discoveredAt: string;
}
export interface CodexStructuredExecutionRequest extends CodexAccountStatusRequest {
  model: ModelConfig; instruction: string; outputSchema: Record<string, unknown>; maximumOutputTokens?: number;
  onTelemetry?: (event: CodexExecTelemetryEvent) => void;
}
export interface CodexStructuredExecutionResult extends CodexExecResult {
  providerId: string; accountProfileId: string; modelId: string; nodeId: string;
  codexVersion: string; executableSha256: string; discoveredAt: string;
}
export interface CodexNodeExecutionPort {
  accountStatus(request: CodexAccountStatusRequest): Promise<CodexAccountStatusResult>;
  execReadOnlyStructured(request: CodexStructuredExecutionRequest): Promise<CodexStructuredExecutionResult>;
}

export class LocalCodexNodeExecutionPort implements CodexNodeExecutionPort {
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env, private readonly command = process.env.CODEX_COMMAND ?? 'codex') {}
  async accountStatus(request: CodexAccountStatusRequest): Promise<CodexAccountStatusResult> {
    const resolved = resolveCodexAccountEnvironment(request.account, this.environment, request.nodeId);
    await probeCodexChatGptAuth(this.command, process.cwd(), request.timeoutMs, resolved.environment);
    return {providerId: request.provider.id, accountProfileId: request.account.id, nodeId: request.nodeId, authenticated: true, codexVersion: 'locally-qualified', executableSha256: 'unavailable', discoveredAt: new Date().toISOString()};
  }
  async execReadOnlyStructured(request: CodexStructuredExecutionRequest): Promise<CodexStructuredExecutionResult> {
    const resolved = resolveCodexAccountEnvironment(request.account, this.environment, request.nodeId);
    await probeCodexChatGptAuth(this.command, process.cwd(), request.timeoutMs, resolved.environment);
    const run = await runCodexExec({command: this.command, cwd: process.cwd(), modelId: request.model.providerModel, instruction: request.instruction, grantedToolIds: [], timeoutMs: request.timeoutMs, environment: resolved.environment, loadUserConfig: true, outputSchema: request.outputSchema, onTelemetry: request.onTelemetry});
    return {...run, providerId: request.provider.id, accountProfileId: request.account.id, modelId: request.model.id, nodeId: request.nodeId, codexVersion: 'locally-qualified', executableSha256: 'unavailable', discoveredAt: new Date().toISOString()};
  }
}

type RemoteWireResult = {
  schema: 'agent-control.codex-node-result/v1'; operation: 'accountStatus' | 'execReadOnlyStructured'; ok: boolean;
  authenticated?: boolean; codexVersion?: string; executableSha256?: string; discoveredAt?: string;
  threadId?: string; finalMessage?: string; usage?: Record<string, unknown>; observedItemTypes?: string[];
  telemetry?: Array<{type: 'thread.started' | 'turn.completed'; threadId?: string; elapsedMs: number; usage?: Record<string, unknown>}>;
  error?: string;
};

export class ResourceCodexNodeExecutionPort implements CodexNodeExecutionPort {
  private readonly resources: Map<string, ResourceConfig>;
  private readonly script: string;
  constructor(resources: ResourceConfig[], private readonly environment: NodeJS.ProcessEnv = process.env, private readonly executor: SshExecutor = executeSsh, scriptSource?: string) {
    this.resources = new Map(resources.map(resource => [resource.id, structuredClone(resource)]));
    this.script = scriptSource ?? fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/codex-node-windows.ps1'), 'utf8');
  }
  async accountStatus(request: CodexAccountStatusRequest): Promise<CodexAccountStatusResult> {
    this.assertAccountNode(request.account, request.nodeId);
    const resource = this.resource(request.nodeId);
    if (resource.transport.type === 'local') return new LocalCodexNodeExecutionPort(this.environment).accountStatus(request);
    const wire = await this.windows(resource, 'accountStatus', {operation: 'accountStatus', providerId: request.provider.id, accountProfileId: request.account.id, nodeId: request.nodeId, credentialEnvironment: request.account.credentialStore.env, timeoutMs: request.timeoutMs}, request.timeoutMs);
    if (!wire.ok || !wire.authenticated) throw new Error(remoteError(wire.error, 'codex_chatgpt_auth_required'));
    return {providerId: request.provider.id, accountProfileId: request.account.id, nodeId: resource.id, authenticated: true, codexVersion: required(wire.codexVersion, 'codex_node_version_missing'), executableSha256: requiredHash(wire.executableSha256), discoveredAt: requiredTimestamp(wire.discoveredAt)};
  }
  async execReadOnlyStructured(request: CodexStructuredExecutionRequest): Promise<CodexStructuredExecutionResult> {
    this.assertAccountNode(request.account, request.nodeId);
    const resource = this.resource(request.nodeId);
    if (resource.transport.type === 'local') return new LocalCodexNodeExecutionPort(this.environment).execReadOnlyStructured(request);
    const wire = await this.windows(resource, 'execReadOnlyStructured', {operation: 'execReadOnlyStructured', providerId: request.provider.id, accountProfileId: request.account.id, modelId: request.model.id, providerModel: request.model.providerModel, nodeId: request.nodeId, credentialEnvironment: request.account.credentialStore.env, timeoutMs: request.timeoutMs, maximumOutputTokens: request.maximumOutputTokens, instruction: request.instruction, outputSchema: request.outputSchema}, request.timeoutMs);
    if (!wire.ok) throw new Error(remoteError(wire.error, 'codex_node_exec_failed'));
    for (const event of wire.telemetry ?? []) request.onTelemetry?.({...event, context: {tokens: null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
    return {providerId: request.provider.id, accountProfileId: request.account.id, modelId: request.model.id, nodeId: resource.id, codexVersion: required(wire.codexVersion, 'codex_node_version_missing'), executableSha256: requiredHash(wire.executableSha256), discoveredAt: requiredTimestamp(wire.discoveredAt), threadId: wire.threadId, finalMessage: required(wire.finalMessage, 'codex_exec_missing_final_message'), usage: numericRecord(wire.usage), observedItemTypes: Array.isArray(wire.observedItemTypes) ? wire.observedItemTypes.filter(value => typeof value === 'string') : []};
  }
  private resource(nodeId: string) { const resource = this.resources.get(nodeId); if (!resource) throw new Error('codex_execution_node_missing'); return resource; }
  private assertAccountNode(account: ProviderAccountProfileConfig, nodeId: string) { if ((account.nodeId ?? 'controller') !== nodeId) throw new Error('codex_account_execution_node_mismatch'); }
  private async windows(resource: ResourceConfig, operation: RemoteWireResult['operation'], payload: Record<string, unknown>, timeoutMs: number): Promise<RemoteWireResult> {
    if (resource.platform !== 'windows' || resource.transport.type !== 'ssh') throw new Error('codex_execution_node_transport_unsupported');
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const input = `${this.script.trimEnd()}\n${encoded}\n`;
    let result;
    try { result = await this.executor('ssh', sshResourceArgs(resource, ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', '-']), input, {timeoutMs: Math.min(Math.max(timeoutMs + 10_000, 20_000), 30 * 60_000), maxBytes: 4 * 1024 * 1024}); }
    catch { throw new Error('codex_node_transport_failed'); }
    if (result.timedOut) throw new Error('codex_node_timeout');
    if (result.aborted) throw new Error('codex_node_cancelled');
    if (result.status !== 0) throw new Error('codex_node_transport_failed');
    let parsed: unknown; try { parsed = JSON.parse(result.stdout.trim()); } catch { throw new Error('codex_node_result_invalid'); }
    if (!record(parsed) || parsed.schema !== 'agent-control.codex-node-result/v1' || parsed.operation !== operation || typeof parsed.ok !== 'boolean') throw new Error('codex_node_result_invalid');
    return parsed as RemoteWireResult;
  }
}

function required(value: unknown, error: string) { if (typeof value !== 'string' || !value.trim() || /[\\/]/.test(value)) throw new Error(error); return value; }
function requiredHash(value: unknown) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('codex_node_executable_hash_invalid'); return value.toLowerCase(); }
function requiredTimestamp(value: unknown) { if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('codex_node_discovery_timestamp_invalid'); return value; }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function numericRecord(value: unknown): Record<string, unknown> | undefined { if (!record(value)) return undefined; const output: Record<string, unknown> = {}; for (const [key,item] of Object.entries(value)) if (typeof item === 'number' && Number.isFinite(item) && item >= 0) output[key] = item; else if (record(item)) output[key] = numericRecord(item); return output; }
function remoteError(value: unknown, fallback: string) { return typeof value === 'string' && /^(?:account_profile|codex)_[a-z0-9_]+$/.test(value) ? value : fallback; }
