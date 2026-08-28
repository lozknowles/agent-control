import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {HarnessCandidate} from './adaptive-harness.js';
import type {RecipeExecutor, ToolInvocationGateway} from './harness-dispatch.js';
import type {ProviderDefinition} from './providers.js';
import {createInvocationObservation, type ContextPacketSource} from './harness-efficiency.js';

export interface CodexExecRequest {
  command: string;
  cwd: string;
  modelId: string;
  instruction: string;
  grantedToolIds: string[];
  timeoutMs: number;
}

export interface CodexExecResult {
  threadId?: string;
  finalMessage: string;
  usage?: Record<string, unknown>;
  observedItemTypes: string[];
}

export interface CodexChatGptAuth {
  mode: 'chatgpt';
}

export interface CodexExecProviderOptions {
  provider: ProviderDefinition;
  workerId: string;
  modelId: string;
  cwd: string;
  workerCapabilities: string[];
  modelCapabilities: string[];
  availableSkillIds?: string[];
  availableToolIds: string[];
  promptProfile?: {id: string; version: string; description: string};
  runtime?: Record<string, string | number | boolean>;
  qualificationEvidence: string[];
  health: 'healthy' | 'degraded' | 'offline';
  performance?: HarnessCandidate['route']['performance'];
  timeoutMs?: number;
  command?: string;
  authProbe?: (command: string, cwd: string, timeoutMs: number) => Promise<CodexChatGptAuth>;
  runner?: (request: CodexExecRequest) => Promise<CodexExecResult>;
}

interface ToolRequest {tool: string; input?: unknown;}

/**
 * Official Codex non-interactive provider using saved ChatGPT authentication.
 * Codex runs inside a read-only capability envelope; Agent Control retains all raw tools.
 */
export class CodexExecProviderFactory {
  constructor(private readonly options: CodexExecProviderOptions) {
    if (options.provider.kind !== 'cli') throw new Error('codex_exec_provider_kind_invalid');
    if (!options.qualificationEvidence.length) throw new Error('codex_exec_qualification_evidence_required');
    if (!path.isAbsolute(options.cwd)) throw new Error('codex_exec_cwd_must_be_absolute');
  }

  candidate(): HarnessCandidate {
    const provider = this.options.provider;
    return {
      route: {
        id: `${provider.id}:${this.options.modelId}:${this.options.workerId}`,
        providerId: provider.id,
        modelId: this.options.modelId,
        workerId: this.options.workerId,
        local: true,
        health: this.options.health,
        qualified: true,
        qualificationReason: `qualified:${this.options.qualificationEvidence.join(',')}`,
        capabilities: [...provider.capabilities],
        pricing: {currency: 'USD', billing: 'included', inputPerMillionTokens: 0, outputPerMillionTokens: 0, fixedPerRequest: 0, effectiveFrom: '2026-08-24', source: 'ChatGPT plan allowance'},
        performance: this.options.performance ?? {startupLatencyMs: 1_000, inputTokensPerSecond: 50, outputTokensPerSecond: 25, historicalSuccessRate: .8, expectedQuality: .8, confidence: .7, contextLimitTokens: 32768, source: 'configured', sampleSize: 1},
      },
      workerCapabilities: [...this.options.workerCapabilities],
      modelCapabilities: [...this.options.modelCapabilities],
      promptProfiles: [this.options.promptProfile ?? {id: 'codex-structured-return', version: '1', description: 'Return one schema-constrained Agent Control tool request'}],
      availableSkillIds: [...(this.options.availableSkillIds ?? [])],
      availableToolIds: [...this.options.availableToolIds],
      runtime: {sandbox: 'read-only', ephemeral: true, ...(this.options.runtime ?? {})},
    };
  }

  executor(instruction: string): RecipeExecutor {
    return {execute: (recipe, tools) => this.execute(instruction, recipe, tools, Math.min(recipe.resourceLimits.maximumLatencyMs ?? this.options.timeoutMs ?? 60_000, this.options.timeoutMs ?? 60_000))};
  }

  private async execute(instruction: string, recipe: Parameters<RecipeExecutor['execute']>[0], tools: ToolInvocationGateway, timeoutMs: number) {
    const grantedToolIds = recipe.tools.map(tool => tool.id);
    if (!grantedToolIds.length) throw new Error('codex_exec_no_granted_tools');
    const command = this.options.command ?? process.env.CODEX_COMMAND ?? 'codex';
    await (this.options.authProbe ?? probeCodexChatGptAuth)(command, this.options.cwd, timeoutMs);
    const startedAt = new Date().toISOString();
    const run = await (this.options.runner ?? runCodexExec)({command, cwd: this.options.cwd, modelId: this.options.modelId, instruction, grantedToolIds, timeoutMs});
    const providerCompletedAt = new Date().toISOString();
    if (run.observedItemTypes.includes('file_change')) throw new Error('codex_exec_capability_envelope_violation:file_change');
    const request = parseToolRequest(run.finalMessage);
    const output = await tools.invoke(request.tool, request.input);
    const responseHash = createHash('sha256').update(run.finalMessage).digest('hex');
    const result = {providerId: this.options.provider.id, modelId: this.options.modelId, authMode: 'chatgpt', threadId: run.threadId, requestedTool: request.tool, toolOutput: output, responseHash, usage: run.usage, capabilityEnvelope: 'read-only'};
    const startupSources: ContextPacketSource[] = [
      {id: `${recipe.id ?? 'unattributed'}:codex-system`, kind: 'system_instructions', content: 'Return one schema-constrained Agent Control tool request. Do not modify files.', required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint ?? 'unattributed-recipe']},
      {id: `${recipe.id ?? 'unattributed'}:codex-control`, kind: 'agent_control_instructions', content: 'The requested tool remains subject to the live Agent Control policy gateway.', required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint ?? 'unattributed-recipe']},
      {id: `${recipe.id ?? 'unattributed'}:codex-tools`, kind: 'tool_schemas', content: JSON.stringify(codexToolRequestSchema(grantedToolIds)), required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint ?? 'unattributed-recipe']},
      {id: `${recipe.id ?? 'unattributed'}:codex-skills`, kind: 'skills', estimatedTokens: 0, persistent: true, relevance: .8, provenanceIds: (recipe.skills ?? []).flatMap(skill => skill.qualificationEvidence)},
      {id: `${recipe.id ?? 'unattributed'}:codex-task`, kind: 'task_context', content: instruction, required: true, persistent: false, relevance: 1, provenanceIds: recipe.context?.provenanceIds ?? recipe.context?.evidenceIds ?? []},
    ];
    const taskId = recipe.taskId ?? 'unattributed-task';
    const invocation = createInvocationObservation({jobId: recipe.jobId ?? taskId, runId: recipe.runId, taskId, laneId: recipe.authority?.laneId ?? 'unattributed-lane', model: this.options.modelId, provider: this.options.provider.id, harnessProfile: recipe.harness?.profile ?? 'STANDARD', executionStrategy: 'cli.typed-read-only', startedAt, completedAt: providerCompletedAt, startupSources, rawUsage: run.usage, toolIds: [request.tool], contextSourceIds: recipe.context?.sourceIds ?? [], recipeFingerprint: recipe.fingerprint ?? 'unattributed-recipe', contextPacketId: recipe.harness?.contextPacketId, evidenceIds: [`provider_response_sha256:${responseHash}`]});
    return {
      resultRef: JSON.stringify(result), confidence: .8,
      fingerprint: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
      evidence: [`codex_thread:${run.threadId ?? responseHash.slice(0, 16)}`, `provider_response_sha256:${responseHash}`, 'auth_mode:chatgpt', 'capability_envelope:read-only', `tool_executed:${request.tool}`],
      invocations: [invocation],
    };
  }
}

export async function probeCodexChatGptAuth(command: string, cwd: string, timeoutMs: number): Promise<CodexChatGptAuth> {
  const result = await captureProcess(command, ['login', 'status'], cwd, timeoutMs);
  if (result.code !== 0 || !/chatgpt/i.test(`${result.stdout}\n${result.stderr}`)) throw new Error('codex_chatgpt_auth_required');
  return {mode: 'chatgpt'};
}

export async function runCodexExec(request: CodexExecRequest): Promise<CodexExecResult> {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-codex-schema-'));
  const schemaFile = path.join(temporary, 'tool-request.schema.json');
  try {
    fs.writeFileSync(schemaFile, JSON.stringify(codexToolRequestSchema(request.grantedToolIds)), {mode: 0o600});
    const prompt = `Return one Agent Control tool request as schema-constrained JSON. Put the tool input in input_json as a JSON-encoded string. Do not claim the tool ran. Do not modify files.\n\n${request.instruction}`;
    const result = await captureProcess(request.command, ['exec', '--ephemeral', '--json', '--sandbox', 'read-only', '--ignore-user-config', '--model', request.modelId, '--output-schema', schemaFile, prompt], request.cwd, request.timeoutMs);
    if (result.code !== 0) throw new Error(`codex_exec_failed:${result.code}`);
    const events = result.stdout.split(/\r?\n/).filter(Boolean).map(line => {
      try { return JSON.parse(line) as Record<string, unknown>; } catch { throw new Error('codex_exec_invalid_jsonl'); }
    });
    if (events.some(event => event.type === 'error' || event.type === 'turn.failed')) throw new Error('codex_exec_turn_failed');
    const completed = [...events].reverse().find(event => event.type === 'turn.completed');
    if (!completed) throw new Error('codex_exec_turn_incomplete');
    const agentMessages = events.filter(event => event.type === 'item.completed').map(event => event.item).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item))).filter(item => item.type === 'agent_message');
    const finalMessage = agentMessages.at(-1)?.text;
    if (typeof finalMessage !== 'string' || !finalMessage.trim()) throw new Error('codex_exec_missing_final_message');
    const started = events.find(event => event.type === 'thread.started');
    const observedItemTypes = [...new Set(events.map(event => event.item).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item))).map(item => String(item.type ?? 'unknown')))];
    const rawUsage = completed.usage;
    const usage = rawUsage && typeof rawUsage === 'object' && !Array.isArray(rawUsage) ? sanitizeUsage(rawUsage as Record<string, unknown>) : undefined;
    return {threadId: typeof started?.thread_id === 'string' ? started.thread_id : undefined, finalMessage, usage, observedItemTypes};
  } finally {
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

function sanitizeUsage(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number' && Number.isFinite(item) && item >= 0) sanitized[key] = item;
    else if (item && typeof item === 'object' && !Array.isArray(item)) sanitized[key] = sanitizeUsage(item as Record<string, unknown>);
  }
  return sanitized;
}

function codexToolRequestSchema(grantedToolIds: string[]) { return {type: 'object', properties: {tool: {type: 'string', enum: grantedToolIds}, input_json: {type: 'string'}}, required: ['tool', 'input_json'], additionalProperties: false}; }

async function captureProcess(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{code: number; stdout: string; stderr: string}> {
  return new Promise((resolve, reject) => {
    const env = {...process.env};
    delete env.OPENAI_API_KEY;
    delete env.CODEX_API_KEY;
    const child = spawn(command, args, {cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', settled = false;
    const finish = (error?: Error, code = -1) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve({code, stdout, stderr});
    };
    const append = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString('utf8');
      if (next.length > 2_000_000) throw new Error('codex_exec_output_limit_exceeded');
      return next;
    };
    child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk as Buffer); } catch (error) { child.kill(); finish(error as Error); } });
    child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk as Buffer); } catch (error) { child.kill(); finish(error as Error); } });
    child.once('error', error => finish(new Error(`codex_exec_launch_failed:${error.message}`)));
    child.once('close', code => finish(undefined, code ?? -1));
    const timer = setTimeout(() => { child.kill(); finish(new Error('codex_exec_timeout')); }, Math.max(1, timeoutMs));
  });
}

function parseToolRequest(content: string): ToolRequest {
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error('codex_exec_tool_request_invalid_json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('codex_exec_tool_request_invalid');
  const request = parsed as Record<string, unknown>;
  if (typeof request.tool !== 'string' || !request.tool.trim()) throw new Error('codex_exec_tool_request_missing_tool');
  if (Object.keys(request).some(key => !['tool', 'input_json'].includes(key))) throw new Error('codex_exec_tool_request_unknown_field');
  if (typeof request.input_json !== 'string') throw new Error('codex_exec_tool_request_input_missing');
  let input: unknown;
  try { input = JSON.parse(request.input_json); } catch { throw new Error('codex_exec_tool_request_input_invalid_json'); }
  return {tool: request.tool, input};
}
