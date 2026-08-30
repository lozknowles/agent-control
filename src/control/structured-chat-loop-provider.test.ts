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
  const bodies: string[] = [], invoked: string[] = [], phases:string[]=[];
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async (_url, init) => { bodies.push(String(init?.body)); return new Response(JSON.stringify(replies.shift()), {status: 200}); }});
  const result = await provider.executor('Inspect and repair.', [{id: 'task', kind: 'task_context', content: 'task', required: true, persistent: false, relevance: 1, provenanceIds: ['fixture']}]).execute(recipe(), {invoke: async id => { invoked.push(id); return id === 'repository.read' ? {content: 'export const value = 1;'} : {stopped: true}; },lifecycle:phase=>phases.push(phase)});
  assert.deepEqual(invoked, ['repository.read', 'mutation.finish']);
  assert.equal(result.invocations?.length, 2);
  assert.equal(result.invocations?.[0].usage.freshInputTokens, 80);
  assert.equal(result.invocations?.[1].turnNumber, 2);
  assert.match(bodies[1], /TOOL RESULT/);
  assert.match(result.resultRef ?? '', /mutation.finish/);
  assert.deepEqual(phases,['waiting for provider','response received','processing','waiting for provider','response received','processing']);
});

test('loop stops at the governed turn limit without claiming verification', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}}), {status: 200})});
  const result = await provider.executor('Inspect.').execute(recipe(2), {invoke: async () => ({content: 'bounded'})});
  assert.equal(result.error, 'structured_chat_loop_turn_limit:2');
  assert.equal(result.invocations?.length, 2);
  assert.equal(result.resultRef, undefined);
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
  const controller = new AbortController(); controller.abort();
  const provider = new StructuredChatLoopProvider({providerId: 'p', modelId: 'm', baseUrl: 'https://example.test/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', signalForRecipe: () => controller.signal, fetch: async () => { throw new Error('fetch_should_not_run'); }});
  const result = await provider.executor('task').execute(recipe(), {invoke: async () => null});
  assert.equal(result.error, 'structured_chat_loop_cancelled');
  assert.equal(result.retryable, false);
});
