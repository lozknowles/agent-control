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
  const result = await provider.executor('Inspect and repair.', [{id: 'task', kind: 'task_context', content: 'task', required: true, persistent: false, relevance: 1, provenanceIds: ['fixture']}]).execute(recipe(), {assertActive: () => undefined, invoke: async id => { invoked.push(id); return id === 'repository.read' ? {content: 'export const value = 1;'} : {stopped: true}; },lifecycle:phase=>phases.push(phase)});
  assert.deepEqual(invoked, ['repository.read', 'mutation.finish']);
  assert.equal(result.invocations?.length, 2);
  assert.equal(result.invocations?.[0].usage.freshInputTokens, 80);
  assert.equal(result.invocations?.[1].turnNumber, 2);
  assert.match(bodies[1], /TOOL RESULT/);
  assert.match(result.resultRef ?? '', /mutation.finish/);
  assert.deepEqual(phases,['waiting for provider','response received','processing','waiting for provider','response received','processing']);
});

test('llama.cpp timing evidence survives the real bounded tool-loop adapter', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'local-llama', modelId: 'qwen', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({id: 'cache-proof', model: 'qwen', choices: [{finish_reason: 'stop', message: {content: '{"tool":"mutation.finish","input":{}}'}}], usage: {prompt_tokens: 244, prompt_tokens_details: {cached_tokens: 236}, completion_tokens: 8, total_tokens: 252}, timings: {cache_n: 236, prompt_n: 8, prompt_ms: 4.25, predicted_ms: 19}}), {status: 200})});
  const result = await provider.executor('Repeat the governed task.').execute(recipe(1), {assertActive: () => undefined, invoke: async () => ({stopped: true})});
  assert.deepEqual(result.invocations?.[0].cacheEvidence, {reusedTokens: 236, processedPromptTokens: 8, cacheWriteTokens: null, promptProcessingMs: 4.25, generationMs: 19, authority: 'authoritative', source: 'llama.cpp.response.timings', requestPrefixSha256: result.invocations?.[0].cacheEvidence?.requestPrefixSha256});
  assert.match(result.invocations?.[0].cacheEvidence?.requestPrefixSha256 ?? '', /^[a-f0-9]{64}$/);
});

test('qualified backend retention is exposed as derived expected state without rewriting actual reuse', async () => {
  const provider=new StructuredChatLoopProvider({providerId:'local-llama',modelId:'qwen',baseUrl:'http://127.0.0.1:8081/v1',toolSchemas:schemas,finishToolId:'mutation.finish',cacheRetention:{enabled:true,authority:'derived',source:'qualified-single-slot-cache'},fetch:async()=>new Response(JSON.stringify({choices:[{message:{content:'{"tool":"mutation.finish","input":{}}'}}],usage:{prompt_tokens:1000,completion_tokens:8,total_tokens:1008},timings:{cache_n:0,prompt_n:1000,prompt_ms:40,predicted_ms:20}}),{status:200})});
  const result=await provider.executor('Populate the qualified cache.').execute(recipe(1),{assertActive: () => undefined, invoke:async()=>({stopped:true})}),cache=result.invocations?.[0].cacheEvidence;assert.equal(cache?.reusedTokens,0);assert.equal(cache?.processedPromptTokens,1000);assert.equal(cache?.retainedPromptTokens,1000);assert.equal(cache?.retentionAuthority,'derived');assert.equal(cache?.retentionSource,'qualified-single-slot-cache');
});

test('loop stops at the governed turn limit without claiming verification', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}}), {status: 200})});
  const result = await provider.executor('Inspect.').execute(recipe(2), {assertActive: () => undefined, invoke: async () => ({content: 'bounded'})});
  assert.equal(result.error, 'structured_chat_loop_turn_limit:2');
  assert.equal(result.invocations?.length, 2);
  assert.equal(result.resultRef, undefined);
});

test('policy denial is rethrown with completed turn observations for dispatcher retention', async () => {
  const provider = new StructuredChatLoopProvider({providerId: 'provider', modelId: 'model', baseUrl: 'http://127.0.0.1:8081/v1', toolSchemas: schemas, finishToolId: 'mutation.finish', fetch: async () => new Response(JSON.stringify({choices: [{message: {content: '{"tool":"repository.read","input":{"path":"src/a.js"}}'}}], usage: {prompt_tokens: 10, completion_tokens: 2}}), {status: 200})});
  await assert.rejects(async () => provider.executor('Inspect.').execute(recipe(), {assertActive: () => undefined, invoke: async () => { throw new Error('tool_policy_denied:human_owns_execution'); }}), error => {
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
  const result = await provider.executor('task').execute(recipe(), {assertActive: () => undefined, invoke: async () => null});
  assert.equal(result.error, 'structured_chat_loop_cancelled');
  assert.equal(result.retryable, false);
});

test('explicit neutral sampling reaches the provider and invalid values fail closed', async () => {
  let body: any;
  const options = {providerId: 'p', modelId: 'm', baseUrl: 'http://127.0.0.1:18000/v1', toolSchemas: schemas, finishToolId: 'mutation.finish'};
  const provider = new StructuredChatLoopProvider({...options, sampling: {temperature: 1, topP: .95, seed: 42}, fetch: async (_url, init) => { body = JSON.parse(String(init?.body)); return Response.json({choices: [{message: {content: '{"tool":"mutation.finish","input":{}}'}}]}); }});
  await provider.executor('Finish.').execute(recipe(1), {assertActive: () => undefined, invoke: async () => ({stopped: true})});
  assert.equal(body.temperature, 1); assert.equal(body.top_p, .95); assert.equal(body.seed, 42);
  assert.throws(() => new StructuredChatLoopProvider({...options, sampling: {temperature: 1, topP: 0}}), /sampling_invalid/);
});

test('a scripted known-good code-repair control completes the real bounded tool path', async () => {
  const routeSchemas: StructuredChatToolSchema[] = [
    {id: 'fixture.write', description: 'Replace src/route.js.', inputSchema: {type: 'object', properties: {path: {const: 'src/route.js'}, content: {type: 'string'}}, required: ['path', 'content'], additionalProperties: false}},
    {id: 'fixture.public-tests', description: 'Run public tests.', inputSchema: {type: 'object', additionalProperties: false}},
    {id: 'fixture.finish', description: 'Stop; independent verification follows.', inputSchema: {type: 'object', properties: {summary: {type: 'string'}}, required: ['summary'], additionalProperties: false}},
  ];
  const knownGood = `export function routeParcel(parcel) {
  if (parcel === null || typeof parcel !== 'object') return 'manual';
  if (parcel.kind === 'event') return 'community';
  if (parcel.kind === 'attachment') return 'documents';
  if (parcel.kind === 'alert') return parcel.urgent === true ? 'urgent-review' : 'infrastructure';
  return 'manual';
}
`;
  const replies = [
    {choices: [{message: {content: JSON.stringify({tool: 'fixture.write', input: {path: 'src/route.js', content: knownGood}})}}]},
    {choices: [{message: {content: JSON.stringify({tool: 'fixture.public-tests', input: {}})}}]},
    {choices: [{message: {content: JSON.stringify({tool: 'fixture.finish', input: {summary: 'public tests pass'}})}}]},
  ];
  let code = `export function routeParcel(parcel) { return 'manual'; }`, writes = 0;
  const evaluate = (source: string) => new Function(`${source.replace('export function', 'function')}; return routeParcel;`)() as (parcel: unknown) => string;
  const publicCases: Array<[unknown, string]> = [[{kind: 'event'}, 'community'], [{kind: 'alert', urgent: true}, 'urgent-review'], [{kind: 'unknown'}, 'manual']];
  const hiddenCases: Array<[unknown, string]> = [[null, 'manual'], [undefined, 'manual'], [{}, 'manual'], [{kind: 'attachment'}, 'documents'], [{kind: 'alert', urgent: false}, 'infrastructure'], [{kind: 'alert'}, 'infrastructure'], [{kind: 'alert', urgent: 'true'}, 'infrastructure'], [{kind: 'EVENT'}, 'manual'], [{kind: 'event', urgent: true}, 'community'], [{kind: 'attachment', urgent: true}, 'documents']];
  const run = (cases: Array<[unknown, string]>) => cases.every(([input, expected]) => evaluate(code)(input) === expected);
  const provider = new StructuredChatLoopProvider({providerId: 'scripted-control', modelId: 'known-good-control', baseUrl: 'http://127.0.0.1:18000/v1', toolSchemas: routeSchemas, finishToolId: 'fixture.finish', fetch: async () => Response.json({...replies.shift(), model: 'known-good-control'})});
  const controlRecipe = Object.assign({}, recipe(3) as any, {tools: routeSchemas.map(item => ({id: item.id, risk: item.id === 'fixture.write' ? 'write' : 'read', capabilities: []}))}) as never;
  const result = await provider.executor('Use the exact frozen routeParcel contract.').execute(controlRecipe, {assertActive: () => undefined, invoke: async (tool, input: any) => {
    if (tool === 'fixture.write') { assert.equal(input.path, 'src/route.js'); code = input.content; writes++; return {written: true}; }
    if (tool === 'fixture.public-tests') return {passed: run(publicCases)};
    return {stopped: true, independentVerification: 'PENDING'};
  }});
  assert.equal(result.error, undefined);
  assert.equal(writes, 1);
  assert.equal(run(publicCases), true);
  assert.equal(run(hiddenCases), true);
  assert.deepEqual(JSON.parse(result.resultRef ?? '{}').toolTranscript.map((item: {tool: string}) => item.tool), ['fixture.write', 'fixture.public-tests', 'fixture.finish']);
});
