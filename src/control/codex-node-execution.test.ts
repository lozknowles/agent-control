import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {ResourceCodexNodeExecutionPort} from './codex-node-execution.js';
import type {CodexNodeExecutionPort} from './codex-node-execution.js';
import {CodexRepositoryReviewClient} from './codex-repository-review-client.js';
import type {ProviderAccountProfileConfig, ProviderConfig, ResourceConfig} from './config.js';
import type {SshExecutor} from './managed-node-ssh.js';

const node: ResourceConfig = {id: 'windows-node', platform: 'windows', transport: {type: 'ssh', host: 'windows-node.example', port: 22, user: 'operator'}, capabilities: ['harness.codex']};
const provider: ProviderConfig = {id: 'codex', kind: 'cli'};
const account: ProviderAccountProfileConfig = {id: 'account-a', nodeId: node.id, label: 'Account A', credentialStore: {type: 'codex-home-env', env: 'CODEX_HOME_ACCOUNT_A'}};
const hash = 'a'.repeat(64);

test('authenticated remote account status returns only sanitized qualification metadata', async () => {
  const executor: SshExecutor = async () => ({status: 0, stdout: JSON.stringify({schema: 'agent-control.codex-node-result/v1', operation: 'accountStatus', ok: true, authenticated: true, codexVersion: 'codex-cli 0.153.0', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z'}), stderr: 'raw stderr forbidden'});
  const result = await new ResourceCodexNodeExecutionPort([node], {}, executor).accountStatus({provider, account, nodeId: node.id, timeoutMs: 1_000});
  assert.deepEqual(result, {providerId: 'codex', accountProfileId: 'account-a', nodeId: 'windows-node', providerExecutionNodeId: 'windows-node', credentialNodeId: 'windows-node', authenticated: true, codexVersion: 'codex-cli 0.153.0', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z'});
  assert.equal(JSON.stringify(result).includes('raw stderr'), false);
});

test('genuine outer transport timeout remains a timeout instead of an authentication result', async () => {
  const executor: SshExecutor = async () => ({status: 0, stdout: '', stderr: 'sensitive remote text', timedOut: true});
  await assert.rejects(() => new ResourceCodexNodeExecutionPort([node], {}, executor).accountStatus({provider, account, nodeId: node.id, timeoutMs: 1_000}), error => {
    assert.equal((error as Error).message, 'codex_node_timeout');
    assert.equal(JSON.stringify(error).includes('sensitive remote text'), false);
    return true;
  });
});

test('Windows Codex node execution sends one fixed PowerShell program and treats all variable values as encoded data', async () => {
  const secretInstruction = 'review value with spaces; Write-Output injected-marker';
  let observed: {args: string[]; source: string; payload: Record<string, unknown>; bootstrap: string} | undefined;
  const executor: SshExecutor = async (command, args, input) => {
    assert.equal(command, 'ssh');
    const lines = input.trimEnd().split(/\r?\n/), encoded = lines.shift()!;
    const source = lines.join('\n'), payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Record<string, unknown>;
    const bootstrap = Buffer.from(args.at(-1)!, 'base64').toString('utf16le');
    observed = {args, source, payload, bootstrap};
    return {status: 0, stdout: JSON.stringify({schema: 'agent-control.codex-node-result/v1', operation: 'execReadOnlyStructured', ok: true, codexVersion: 'codex-cli 0.152.1', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z', threadId: 'thread-safe', finalMessage: '{"ok":true}', usage: {input_tokens: 4, output_tokens: 2, total_tokens: 6}, observedItemTypes: ['agent_message'], telemetry: [{type: 'turn.completed', elapsedMs: 9, usage: {input_tokens: 4, output_tokens: 2, total_tokens: 6}}]}), stderr: 'raw remote stderr must not be returned'};
  };
  const port = new ResourceCodexNodeExecutionPort([node], {CODEX_HOME_ACCOUNT_A: '/controller/must-not-be-read'}, executor);
  const result = await port.execReadOnlyStructured({provider, account, nodeId: node.id, model: {id: 'model-a', provider: provider.id, accountProfile: account.id, providerModel: 'gpt-example', capabilities: []}, instruction: secretInstruction, outputSchema: {type: 'object'}, timeoutMs: 1_000});
  assert.deepEqual(observed?.args.slice(-5, -1), ['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand']);
  assert.match(observed?.bootstrap ?? '', /ReadLine\(\)/);
  assert.match(observed?.bootstrap ?? '', /ReadToEnd\(\)/);
  assert.match(observed?.source ?? '', /^param\(\[string\]\$PayloadLine\)/);
  assert.equal(observed?.source.includes(secretInstruction), false);
  assert.equal(observed?.source.includes(account.id), false);
  assert.equal(observed?.payload.instruction, secretInstruction);
  assert.equal(observed?.payload.credentialEnvironment, 'CODEX_HOME_ACCOUNT_A');
  assert.equal(JSON.stringify(result).includes('C:\\'), false);
  assert.equal(JSON.stringify(result).includes('raw remote stderr'), false);
  assert.equal(result.nodeId, node.id);
});

test('remote account execution never resolves the controller credential environment or exposes transport stderr', async () => {
  const executor: SshExecutor = async () => ({status: 23, stdout: '', stderr: 'C:\\Users\\operator\\secret-profile auth-token-value'});
  const port = new ResourceCodexNodeExecutionPort([node], {CODEX_HOME_ACCOUNT_A: '/controller/forbidden'}, executor);
  await assert.rejects(() => port.accountStatus({provider, account, nodeId: node.id, timeoutMs: 1_000}), error => {
    assert.equal((error as Error).message, 'codex_node_transport_failed');
    assert.equal(JSON.stringify(error).includes('secret-profile'), false);
    return true;
  });
});

test('untrusted remote failure text is reduced to a canonical error', async () => {
  const executor: SshExecutor = async () => ({status: 0, stdout: JSON.stringify({schema: 'agent-control.codex-node-result/v1', operation: 'accountStatus', ok: false, error: 'C:\\private\\profile token-value'}), stderr: ''});
  const port = new ResourceCodexNodeExecutionPort([node], {}, executor);
  await assert.rejects(() => port.accountStatus({provider, account, nodeId: node.id, timeoutMs: 1_000}), error => {
    assert.equal((error as Error).message, 'codex_chatgpt_auth_required');
    return true;
  });
});

test('an account bound to the destination node cannot use a source-node execution context', async () => {
  let called = false;
  const executor: SshExecutor = async () => { called = true; throw new Error('must_not_run'); };
  const port = new ResourceCodexNodeExecutionPort([node], {}, executor);
  await assert.rejects(() => port.accountStatus({provider, account, nodeId: 'source-node', timeoutMs: 1_000}), /codex_account_execution_node_mismatch/);
  assert.equal(called, false);
});

test('the audited Windows runner discovers versioned Codex bundles without a hard-coded bundle hash', () => {
  const script = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/codex-node-windows.ps1'), 'utf8');
  assert.match(script, /OpenAI\\Codex\\bin/);
  assert.match(script, /Get-ChildItem/);
  assert.match(script, /--version/);
  assert.doesNotMatch(script, /[a-f0-9]{16,}\\codex\.exe/i);
  assert.doesNotMatch(script, /Invoke-Expression|\biex\b/i);
  assert.match(script, /\$statusProcess = Start-Process/);
  assert.match(script, /RedirectStandardOutput \$statusStdoutFile/);
  assert.match(script, /RedirectStandardError \$statusStderrFile/);
  assert.match(script, /\$statusProcess\.WaitForExit/);
  assert.match(script, /\$statusProcess\.Kill\(\)/);
  assert.match(script, /codex_chatgpt_auth_required/);
  assert.match(script, /UTF8Encoding\(\$false\)/);
  assert.match(script, /--skip-git-repo-check/);
  assert.match(script, /--strict-config/);
  assert.match(script, /--ignore-user-config/);
  assert.match(script, /--ignore-rules/);
  assert.match(script, /project_doc_max_bytes=0/);
  assert.match(script, /web_search="disabled"/);
  assert.match(script, /features\.shell_tool=false/);
  assert.match(script, /features\.unified_exec=false/);
  assert.match(script, /features\.multi_agent=false/);
  assert.match(script, /features\.browser_use=false/);
  assert.match(script, /features\.computer_use=false/);
  assert.match(script, /features\.in_app_browser=false/);
  assert.match(script, /features\.apps=false/);
  assert.match(script, /features\.image_generation=false/);
  assert.match(script, /features\.workspace_dependencies=false/);
  assert.match(script, /--output-last-message/);
  assert.match(script, /ReadAllText\(\$lastMessageFile\)/);
  assert.match(script, /Start-Process -FilePath \$selected\.Path/);
  assert.match(script, /-RedirectStandardInput \$promptFile/);
  assert.match(script, /-RedirectStandardOutput \$stdoutFile/);
  assert.match(script, /\$process\.WaitForExit/);
  assert.match(script, /codex_node_context_limit_exceeded/);
  assert.match(script, /codex_node_rate_limited/);
  assert.match(script, /item\.type -eq 'error'/);
  assert.doesNotMatch(script, /Start-Job|ReadToEndAsync/);
});

test('destination execution fails closed when the execution port reports a different account or node', async () => {
  const wrongIdentityPort: CodexNodeExecutionPort = {
    async accountStatus() { throw new Error('not_used'); },
    async execReadOnlyStructured(request) { return {providerId: request.provider.id, accountProfileId: 'source-account', modelId: request.model.id, nodeId: 'source-node', codexVersion: 'codex-cli 0.152.1', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z', finalMessage: '{}', observedItemTypes: []}; },
  };
  const client = new CodexRepositoryReviewClient(provider, account, node.id, wrongIdentityPort);
  await assert.rejects(() => client.invoke({id: 'model-a', provider: provider.id, accountProfile: account.id, providerModel: 'gpt-example', capabilities: []}, 'bounded input', {structured: true, outputSchema: {type: 'object'}}), /codex_node_execution_identity_mismatch/);
});

test('ephemeral Codex review preserves top-level cached input in telemetry and calculated accounting', async () => {
  const events: Array<{phase: string; context: {tokens: number | null; limitTokens: number | null; authority: string; source: string}; usage?: {cachedInputTokens: number | null; totalTokens: number | null}}> = [];
  const exactPort: CodexNodeExecutionPort = {
    async accountStatus() { throw new Error('not_used'); },
    async execReadOnlyStructured(request) {
      request.onTelemetry?.({type: 'turn.completed', elapsedMs: 9, usage: {input_tokens: 40, cached_input_tokens: 30, output_tokens: 6}, context: {tokens: null, authority: 'unavailable', source: 'codex_jsonl_does_not_report_current_context'}});
      return {providerId: request.provider.id, accountProfileId: request.account.id, modelId: request.model.id, nodeId: request.nodeId, codexVersion: 'codex-cli 0.153.0', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z', finalMessage: '{"ok":true}', usage: {input_tokens: 40, cached_input_tokens: 30, output_tokens: 6}, observedItemTypes: ['agent_message']};
    },
  };
  const client = new CodexRepositoryReviewClient(provider, account, node.id, exactPort);
  const result = await client.invoke({id: 'model-a', provider: provider.id, accountProfile: account.id, providerModel: 'gpt-example', capabilities: [], limits: {contextTokens: 100}, pricing: {currency: 'USD', inputPerMillionTokens: 1, cachedInputPerMillionTokens: .5, outputPerMillionTokens: 2, effectiveFrom: '2026-09-05', source: 'test'}}, 'bounded input', {structured: true, outputSchema: {type: 'object'}, onTelemetry: event => events.push(event)});
  assert.equal(result.usage.totalTokens, 46);
  assert.equal(result.usage.cachedInputTokens, 30);
  assert.equal(result.usage.calculatedCost, .000037);
  assert.deepEqual(events.at(-1)?.context, {tokens: null, limitTokens: 100, authority: 'unavailable', source: 'codex_exec_turn_usage_is_not_current_context'});
  assert.equal(events.at(-1)?.usage?.totalTokens, 46);
  assert.equal(events.at(-1)?.usage?.cachedInputTokens, 30);
});
