import assert from 'node:assert/strict';
import test from 'node:test';
import {StructuredChatProviderFactory} from './structured-chat-provider.js';

const provider = {id: 'local-qwen', name: 'Local Qwen', kind: 'local' as const, baseUrl: 'http://127.0.0.1:18081/v1', requiresAuth: false, parallelism: 1, costClass: 'free' as const, capabilities: ['structured-output', 'tool-request']};

test('structured chat factory creates a qualified candidate and mediates its JSON tool request', async () => {
  let endpoint = '', rawBody = '', invocations = 0;
  const factory = new StructuredChatProviderFactory({
    provider, workerId: 'worker-1', modelId: 'qwen-test', workerCapabilities: ['model.local'], modelCapabilities: ['structured-output'], availableToolIds: ['qualification.inspect'], qualificationEvidence: ['fixture-live-proof'],
    fetch: async (input, init) => {
      endpoint = String(input); rawBody = String(init?.body);
      return new Response(JSON.stringify({id: 'chatcmpl-test', model: 'qwen-test', choices: [{finish_reason: 'stop', message: {content: '{"tool":"qualification.inspect","input":{"target":"fixture"}}'}}], usage: {total_tokens: 42}}), {status: 200, headers: {'content-type': 'application/json'}});
    },
  });
  const candidate = factory.candidate();
  assert.equal(candidate.route.qualified, true);
  assert.match(candidate.route.qualificationReason, /fixture-live-proof/);
  const result = await factory.executor('Inspect the safe fixture').execute({tools: [{id: 'qualification.inspect'}]} as never, {invoke: async (id, input) => { invocations++; assert.equal(id, 'qualification.inspect'); assert.deepEqual(input, {target: 'fixture'}); return {marker: 'SAFE'}; }});
  assert.equal(endpoint, 'http://127.0.0.1:18081/v1/chat/completions');
  assert.match(rawBody, /Do not claim the tool ran/);
  assert.equal(invocations, 1);
  assert.deepEqual(result.evidence?.slice(-1), ['tool_executed:qualification.inspect']);
  assert.match(result.resultRef ?? '', /SAFE/);
});

test('structured chat executor rejects malformed or expanded model output before the gateway', async () => {
  let invocations = 0;
  const factory = new StructuredChatProviderFactory({provider, workerId: 'worker-1', modelId: 'qwen-test', workerCapabilities: [], modelCapabilities: [], availableToolIds: ['qualification.inspect'], qualificationEvidence: ['fixture-live-proof'], fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"qualification.inspect","input":{},"grant":"more"}'}}]}), {status: 200})});
  await assert.rejects(() => factory.executor('test').execute({tools: []} as never, {invoke: async () => { invocations++; }}), /provider_tool_request_unknown_field/);
  assert.equal(invocations, 0);
});

test('structured chat factory refuses credentialed URLs and unqualified candidates', () => {
  assert.throws(() => new StructuredChatProviderFactory({provider: {...provider, baseUrl: 'https://user:secret@example.test/v1'}, workerId: 'w', modelId: 'm', workerCapabilities: [], modelCapabilities: [], availableToolIds: [], qualificationEvidence: ['proof']}), /base_url_invalid/);
  assert.throws(() => new StructuredChatProviderFactory({provider, workerId: 'w', modelId: 'm', workerCapabilities: [], modelCapabilities: [], availableToolIds: [], qualificationEvidence: []}), /qualification_evidence_required/);
});
