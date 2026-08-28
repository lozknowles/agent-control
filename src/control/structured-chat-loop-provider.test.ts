import assert from 'node:assert/strict';
import test from 'node:test';
import {StructuredChatLoopProvider, type StructuredChatToolSchema} from './structured-chat-loop-provider.js';

const schemas: StructuredChatToolSchema[] = [
  {id: 'repository.read', description: 'Read a bounded file range.', inputSchema: {type: 'object', properties: {path: {type: 'string'}}, required: ['path'], additionalProperties: false}},
  {id: 'mutation.finish', description: 'Stop the bounded attempt.', inputSchema: {type: 'object', additionalProperties: false}},
];

function recipe(maximumTurns = 3) {
  return {
    id: 'recipe-loop', taskId: 'task-loop', jobId: 'job-loop', runId: 'run-loop', workerId: 'worker', providerId: 'provider', modelId: 'model',
    promptProfile: {id: 'loop', version: '1', description: 'loop'}, harness: {profile: 'THIN', recommendedProfile: 'THIN', routingMode: 'EXPERIMENT', evidenceQualified: false, decisionReasons: [], contextStrategyId: 'fixture', maximumTurns},
    context: {tier: 0, sourceIds: ['task'], evidenceIds: ['fixture'], estimatedTokens: 10}, skills: [], tools: schemas.map(item => ({id: item.id, risk: 'read', capabilities: []})), runtime: {},
    authority: {laneId: 'lane', leaseGeneration: 1, ownershipGeneration: 1, owner: 'agent'}, resourceLimits: {maximumLatencyMs: 10_000}, verification: {requiredEvidence: ['hidden'], requireIndependentCheck: true}, escalation: {minimumConfidence: .8, maximumAttempts: 1, onFailure: 'review'}, routeReason: 'fixture', fingerprint: 'fingerprint',
  } as never;
}

test('bounded structured loop executes multiple typed turns and stops only on finish', async () => {
  const replies = [
    {id: 'one', choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 100, prompt_tokens_details: {cached_tokens: 20}, completion_tokens: 12, total_tokens: 112}},
    {id: 'two', choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 140, prompt_tokens_details: {cached_tokens: 30}, completion_tokens: 9, total_tokens: 149}},
  ];
  const bodies: string[] = [], invoked: string[] = [];
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', responseFormat: 'json_schema', seed: 20260828, fetch: async (_url, init) => { bodies.push(String(init?.body)); return new Response(JSON.stringify(replies.shift()), {status: 200}); }});
  const result = await provider.executor('Inspect and repair.', [{id: 'task', kind: 'task_context', content: 'task', required: true, persistent: false, relevance: 1, provenanceIds: ['fixture']}]).execute(recipe(), {invoke: async id => { invoked.push(id); return id === 'repository.read' ? {content: 'export const value = 1;'} : {stopped: true}; }});
  assert.deepEqual(invoked, ['repository.read', 'mutation.finish']);
  assert.equal(result.invocations?.length, 2);
  assert.equal(result.invocations?.[0].usage.freshInputTokens, 80);
  assert.equal(result.invocations?.[1].turnNumber, 2);
  assert.match(bodies[1], /TOOL RESULT/);
  const request = JSON.parse(bodies[0]);
  assert.equal(request.response_format.type, 'json_schema');
  assert.equal(request.response_format.json_schema.schema.anyOf.length, 2);
  assert.equal(request.seed, 20260828);
  assert.match(result.resultRef ?? '', /mutation.finish/);
});

test('loop reports a bounded stop at the governed turn limit without claiming verification', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}}), {status: 200})});
  const result = await provider.executor('Inspect.').execute(recipe(2), {invoke: async () => ({content: 'bounded'})});
  assert.equal(result.error, undefined);
  assert.equal(result.invocations?.length, 2);
  assert.match(result.resultRef ?? '', /structured_chat_loop_turn_limit:2/);
  assert.equal(result.confidence, 0);
});

test('malformed model output is rejected without execution and receives one bounded repair turn', async () => {
  const replies = [
    {id: 'bad', choices: [{message: {content: 'not-json'}}], usage: {prompt_tokens: 10, completion_tokens: 2}},
    {id: 'fixed', choices: [{message: {content: 'prefix {"tool":"mutation.finish","input":{}} trailing'}}], usage: {prompt_tokens: 20, completion_tokens: 4}},
  ];
  const invoked: string[] = [], bodies: string[] = [];
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async (_url, init) => { bodies.push(String(init?.body)); return new Response(JSON.stringify(replies.shift()), {status: 200}); }});
  const result = await provider.executor('Inspect.').execute(recipe(2), {invoke: async id => { invoked.push(id); return {stopped: true}; }});
  assert.deepEqual(invoked, ['mutation.finish']);
  assert.equal(result.invocations?.length, 2);
  assert.match(bodies[1], /TOOL REQUEST REJECTED/);
  assert.match(result.resultRef ?? '', /mutation.finish/);
});

test('a governed finish rejection stays inside the bounded tool loop', async () => {
  const replies = [
    {id: 'premature', choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}},
    {id: 'blocked', choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 20, completion_tokens: 3}},
  ];
  let calls = 0;
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify(replies.shift()), {status: 200})});
  const result = await provider.executor('Mutate or block.').execute(recipe(2), {invoke: async () => ++calls === 1 ? {ok: false, stopped: false, error: 'mutation_required_before_finish'} : {ok: true, stopped: true, blocked: true}});
  assert.equal(calls, 2);
  assert.match(result.resultRef ?? '', /"blocked":true/);
  assert.equal(result.invocations?.length, 2);
});

test('a stale preflight finish rejection gives bounded repair guidance', async () => {
  const replies = [
    {id: 'premature', choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}},
    {id: 'blocked', choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 20, completion_tokens: 3}},
  ];
  const bodies: string[] = [];
  let calls = 0;
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async (_url, init) => { bodies.push(String(init?.body)); return new Response(JSON.stringify(replies.shift()), {status: 200}); }});
  await provider.executor('Mutate or block.').execute(recipe(2), {invoke: async () => ++calls === 1 ? {ok: false, stopped: false, error: 'successful_preflight_required_before_finish'} : {ok: true, stopped: true, blocked: true}});
  assert.match(bodies[1], /Run the authorised verifier-facing test/);
  assert.match(bodies[1], /rerun it successfully/);
});

test('policy denial is rethrown with completed turn observations for dispatcher retention', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}}), {status: 200})});
  await assert.rejects(async () => provider.executor('Inspect.').execute(recipe(), {invoke: async () => { throw new Error('tool_policy_denied:human_owns_execution'); }}), error => {
    assert.match((error as Error).message, /human_owns_execution/);
    assert.equal(((error as {efficiencyObservations?: unknown[]}).efficiencyObservations ?? []).length, 1);
    return true;
  });
});

test('loop validates endpoints, finish schema and cancellation', async () => {
  assert.throws(() => new StructuredChatLoopProvider({providerId: 'p', modelId: 'm', baseUrl: 'https://u:s@example.test/v1', toolSchemas: schemas, finishToolId: 'mutation.finish'}), /base_url_invalid/);
  assert.throws(() => new StructuredChatLoopProvider({providerId: 'p', modelId: 'm', baseUrl: 'https://example.test/v1', toolSchemas: schemas.slice(0, 1), finishToolId: 'mutation.finish'}), /finish_schema_missing/);
  assert.throws(() => new StructuredChatLoopProvider({providerId: 'p', modelId: 'm', baseUrl: 'https://example.test/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', seed: -1}), /seed_invalid/);
  const controller = new AbortController(); controller.abort();
  const provider = new StructuredChatLoopProvider({providerId: 'p', modelId: 'm', baseUrl: 'https://example.test/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', signalForRecipe: () => controller.signal, fetch: async () => { throw new Error('fetch_should_not_run'); }});
  const result = await provider.executor('task').execute(recipe(), {invoke: async () => null});
  assert.equal(result.error, 'structured_chat_loop_cancelled');
  assert.equal(result.retryable, false);
});
