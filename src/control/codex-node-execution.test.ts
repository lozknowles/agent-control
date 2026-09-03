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
  assert.match(script, /\$savedErrorPreference = \$ErrorActionPreference/);
  assert.match(script, /\$statusExitCode = \$LASTEXITCODE/);
  assert.match(script, /login status 2>&1/);
});

test('destination execution fails closed when the execution port reports a different account or node', async () => {
  const wrongIdentityPort: CodexNodeExecutionPort = {
    async accountStatus() { throw new Error('not_used'); },
    async execReadOnlyStructured(request) { return {providerId: request.provider.id, accountProfileId: 'source-account', modelId: request.model.id, nodeId: 'source-node', codexVersion: 'codex-cli 0.152.1', executableSha256: hash, discoveredAt: '2026-09-03T10:00:00.000Z', finalMessage: '{}', observedItemTypes: []}; },
  };
  const client = new CodexRepositoryReviewClient(provider, account, node.id, wrongIdentityPort);
  await assert.rejects(() => client.invoke({id: 'model-a', provider: provider.id, accountProfile: account.id, providerModel: 'gpt-example', capabilities: []}, 'bounded input', {structured: true, outputSchema: {type: 'object'}}), /codex_node_execution_identity_mismatch/);
});
