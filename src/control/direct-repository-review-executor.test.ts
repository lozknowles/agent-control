import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {DirectRepositoryReviewExecutor, parseRepositoryReviewResponse, type RepositoryReviewProviderClientFactory} from './direct-repository-review-executor.js';
import {ContractExecutionRuntime} from './contract-runtime.js';
import {GovernedHandoffRuntime} from './handoff-runtime.js';
import {JobCatalog} from './job-catalog.js';
import {ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from './job-runtime.js';
import {ModelRegistry} from './model-registry.js';
import {repositoryCodeReviewDefinition} from './repository-review-definition.js';
import type {ParameterizedJobRun} from './parameterized-job-types.js';
import {WorkParcelCoordinator, WorkParcelStore} from './work-parcels.js';
import {TokenAwareBatonRuntime} from './token-aware-baton-routing.js';

test('repository review invokes the selected provider directly and persists attributable Work Parcels, usage and response evidence', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-direct-review-')),originalFetch=globalThis.fetch;let requestBody:Record<string,unknown>|undefined;
  globalThis.fetch=async(_input,init)=>{requestBody=JSON.parse(String(init?.body));return new Response(JSON.stringify({id:'provider-response-secret-id',model:'vendor/reviewer',choices:[{finish_reason:'stop',message:{content:JSON.stringify({schema:'agent-control.repository-review/v1',executiveSummary:'Reviewed one frozen chunk.',findings:[],positiveObservations:['Typed boundary'],areasReviewed:['index.ts'],areasNotReviewed:[],verdict:'PASS'})}}],usage:{prompt_tokens:80,completion_tokens:20,total_tokens:100,cost:.002}}),{status:200,headers:{'content-type':'application/json'}})};
  try{
    const models=new ModelRegistry([{id:'external',kind:'openai-compatible',baseUrl:'https://provider.example/v1',wireApi:'chat-completions',auth:{type:'none'},enabled:true}],[{id:'reviewer',provider:'external',providerModel:'vendor/reviewer',capabilities:['repository-review'],qualification:{state:'QUALIFIED',version:'qualification-7',qualifiedAt:'2026-09-01T00:00:00Z',capabilities:['repository-review'],nodes:['controller']},pricing:{currency:'USD',inputPerMillionTokens:1,outputPerMillionTokens:2,effectiveFrom:'2026-09-01',source:'fixture'}}],{roles:{'review.default':{primary:'reviewer',requires:['repository-review']}}}),route=models.route({modelRole:'review.default',nodeId:'controller',requiredCapabilities:['repository-review']}),store=new WorkParcelStore(path.join(root,'parcels.json')),routing=new TokenAwareBatonRuntime(path.join(root,'token-routing.json')),executor=new DirectRepositoryReviewExecutor(models,store,routing);
    const run:ParameterizedJobRun={schema:'agent-control.job-run/v1',id:'run-1',occurrenceId:'occurrence-1',savedJobId:'saved-1',definition:repositoryCodeReviewDefinition,resolvedParameters:{node:'controller',repository:'/repo',ref:'main',scope:'full'},trigger:{type:'manual',actor:'test'},status:'RUNNING',transitions:[{status:'RUNNING',at:'2026-09-01T00:00:00Z'}],requestedAt:'2026-09-01T00:00:00Z',startedAt:'2026-09-01T00:00:00Z',repository:{identity:'repo-id',name:'repo',nodeId:'controller',sourcePath:'/repo',requestedRef:'main',reviewedSha:'0123456789012345678901234567890123456789',dirty:false,dirtyPaths:[],snapshotPath:'/snapshot',snapshotKind:'local-shared-clone'},context:{profile:'STANDARD',files:['index.ts'],changedFiles:[],omittedFiles:[],chunks:[{id:'context-1',files:['index.ts'],sha256:'abc'}],truncated:false},workParcelIds:[],evidence:[],providerResponseIds:[],usage:{source:'unavailable'},errors:[],fallbackHistory:[],retryHistory:[],immutable:false};
    const result=await executor.execute({run,route,instruction:'Return the governed repository-review-v1 object.',contextChunks:[{id:'context-1',content:'===== index.ts =====\nexport const safe = true;',files:['index.ts'],sha256:'abc'}],maximumOutputTokens:1000,maximumCost:1,signal:new AbortController().signal});
    assert.equal(requestBody?.model,'vendor/reviewer');assert.equal((requestBody?.response_format as {type?:string})?.type,'json_schema');assert.equal(((requestBody?.response_format as {json_schema?:{strict?:boolean}})?.json_schema?.strict),true);assert.equal(JSON.stringify(requestBody).includes('codex'),false);assert.equal(result.result.verdict,'PASS');assert.equal(result.usage.totalTokens,100);assert.equal(result.usage.providerReportedCost,.002);assert.equal(result.usage.calculatedCost,.00012);assert.equal(result.usage.cost,.002);assert.equal(result.usage.source,'provider');assert.match(result.providerResponseIds[0],/^sha256:[a-f0-9]{64}$/);assert.equal(result.providerResponseIds[0].includes('provider-response-secret-id'),false);assert.equal(result.workParcelIds.length,1);executor.recordVerification(result.workParcelIds,'PASS');let parcel=store.get(result.workParcelIds[0])!;assert.equal(parcel.executionOwner,'direct-repository-review-executor');assert.equal(parcel.status,'SUCCEEDED');assert.equal(parcel.stages[0].actualRoute?.provider,'external');assert.equal(parcel.stages[0].actualRoute?.model,'reviewer');assert.equal(parcel.telemetry.totalTokens,100);assert.equal(parcel.telemetry.cost,.002);assert.equal(parcel.audit.invocations[0].providerModel,'vendor/reviewer');assert.equal(parcel.audit.invocations[0].qualificationVersion,'qualification-7');assert.equal(parcel.audit.invocations[0].verifierResult,'PASS');assert.ok(parcel.audit.timeline.some(event=>event.type==='verification.completed'));assert.equal(parcel.audit.totals.costBasis,'provider-reported');assert.equal(parcel.provenance.some(item=>item.detail===run.repository?.reviewedSha),true);const runtime=new JobRuntime(new JobCatalog(new Set()),new ActionRegistry(),new WorkerRegistry(),new RunLedger(path.join(root,'runs.json')),new ArtifactStore(path.join(root,'artifacts')),new ResourceLockManager(path.join(root,'locks.json'))),coordinator=new WorkParcelCoordinator(runtime,store,{plan:()=>{throw new Error('direct_parcel_must_not_be_planned')}});await coordinator.tick();parcel=coordinator.get(result.workParcelIds[0]);assert.equal(parcel.audit.invocations.length,1);assert.equal(parcel.audit.totals.totalTokens,100);assert.equal(parcel.telemetry.totalTokens,100);assert.equal(coordinator.list()[0].audit.totals.totalTokens,100);const thread=routing.projection().threads[0];assert.equal(thread.active,false);assert.equal(thread.latest.cumulative.totalTokens,100);assert.equal(thread.latest.context.authority,'unavailable');assert.equal(routing.parcel(thread.parcelId).totalTokens,100);
  }finally{globalThis.fetch=originalFetch;fs.rmSync(root,{recursive:true,force:true})}
});

test('provider review parsing rejects structurally incomplete findings before validation',()=>{
  const base={schema:'agent-control.repository-review/v1',executiveSummary:'summary',findings:[],positiveObservations:[],areasReviewed:['index.ts'],areasNotReviewed:[],verdict:'PASS'};
  assert.equal(parseRepositoryReviewResponse(JSON.stringify(base)).verdict,'PASS');
  assert.throws(()=>parseRepositoryReviewResponse(JSON.stringify({...base,findings:[{id:'f1',severity:'high',title:'Missing evidence'}],verdict:'PASS_WITH_FINDINGS'})),/repository_review_provider_schema_invalid/);
  assert.throws(()=>parseRepositoryReviewResponse(JSON.stringify({...base,verdict:'MAYBE'})),/repository_review_provider_schema_invalid/);
  assert.throws(()=>parseRepositoryReviewResponse('{not json'),/repository_review_provider_json_invalid/);
});

test('production Work Parcel lifecycle assesses pressure, seals a baton, delegates the next chunk and independently verifies the destination', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-token-handoff-success-'));
  try {
    const {models, route} = handoffRegistry();
    const store = new WorkParcelStore(path.join(root, 'parcels.json'));
    const routing = new TokenAwareBatonRuntime(path.join(root, 'token-routing.json'));
    const contracts = new ContractExecutionRuntime(path.join(root, 'contracts.json'));
    const handoffs = new GovernedHandoffRuntime(contracts, path.join(root, 'handoffs.json'));
    const calls: Array<{model: string; prompt: string}> = [];
    const clients = fakeReviewClients(calls);
    const executor = new DirectRepositoryReviewExecutor(models, store, routing, {routing, contracts, handoffs}, clients);

    const response = await executor.execute(reviewRequest(route));

    assert.deepEqual(calls.map(call => call.model), ['source-model', 'cheap-model']);
    assert.match(calls[1].prompt, /Governed continuation baton/);
    assert.match(calls[1].prompt, /Baton SHA-256: [a-f0-9]{64}/);
    assert.match(calls[1].prompt, /Exact next action: Review frozen context chunk context-2/);
    assert.equal(response.workParcelIds.length, 1);
    assert.equal(response.result.areasReviewed.includes('second.ts'), true);

    const parcel = store.get(response.workParcelIds[0])!;
    assert.deepEqual(parcel.audit.invocations.map(item => item.model), ['source-model', 'cheap-model']);
    assert.equal(parcel.audit.totals.invocations, 2);
    assert.equal(parcel.audit.totals.totalTokens, 220);
    assert.equal(parcel.telemetry.totalTokens, 220);
    assert.equal(parcel.provenance.some(item => item.type === 'governed-verification-contract'), true);

    const evidence = routing.evidence();
    assert.equal(evidence.batons.length, 1);
    assert.match(evidence.batons[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(evidence.decisions.some(item => item.action === 'BATON_AND_HANDOFF' && item.outcome === 'SUCCEEDED'), true);
    assert.deepEqual(routing.parcel(parcel.id).byModel.map(item => item.modelId).sort(), ['cheap-model', 'source-model']);
    assert.equal(routing.parcel(parcel.id).totalTokens, 220);
    assert.equal(handoffs.list()[0].status, 'COMPLETED');

    executor.recordVerification(response.workParcelIds, response.result.verdict);
    const destination = contracts.list().find(contract => contract.parentContractId);
    assert.equal(destination?.active.modelId, 'cheap-model');
    assert.equal(destination?.verification.state, 'PASSED');
    assert.equal(destination?.state, 'VERIFIED');
    assert.equal(store.get(parcel.id)?.audit.invocations.every(item => item.verifierResult === response.result.verdict), true);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('failed production destination execution preserves evidence and resumes the original provider thread', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-token-handoff-recovery-'));
  try {
    const {models, route} = handoffRegistry();
    const store = new WorkParcelStore(path.join(root, 'parcels.json'));
    const routing = new TokenAwareBatonRuntime(path.join(root, 'token-routing.json'));
    const contracts = new ContractExecutionRuntime(path.join(root, 'contracts.json'));
    const handoffs = new GovernedHandoffRuntime(contracts, path.join(root, 'handoffs.json'));
    const calls: Array<{model: string; prompt: string}> = [];
    const clients = fakeReviewClients(calls, true);
    const executor = new DirectRepositoryReviewExecutor(models, store, routing, {routing, contracts, handoffs}, clients);

    const response = await executor.execute(reviewRequest(route));

    assert.deepEqual(calls.map(call => call.model), ['source-model', 'cheap-model', 'source-model']);
    assert.equal(response.workParcelIds.length, 1);
    const parcel = store.get(response.workParcelIds[0])!;
    assert.deepEqual(parcel.audit.invocations.map(item => item.model), ['source-model', 'source-model']);
    assert.equal(parcel.audit.totals.totalTokens, 200);
    assert.equal(parcel.audit.timeline.some(item => item.type === 'route.changed' && item.summary.includes('resumed')), true);
    const failed = routing.evidence().decisions.find(item => item.outcome === 'FAILED');
    assert.equal(failed?.action, 'CONTINUE');
    assert.match(failed?.reason ?? '', /handoff_failed_resume_original_thread/);
    assert.equal(routing.thread('review:run-handoff:context-1').recoverable, true);

    const destination = contracts.list().find(contract => contract.parentContractId);
    const source = contracts.list().find(contract => !contract.parentContractId);
    assert.equal(destination?.verification.state, 'FAILED');
    assert.equal(destination?.state, 'FAILED');
    assert.equal(source?.state, 'ACTIVE');
    executor.recordVerification(response.workParcelIds, response.result.verdict);
    assert.equal(contracts.get(source!.id).verification.state, 'PASSED');
    assert.equal(contracts.get(source!.id).state, 'VERIFIED');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

function handoffRegistry() {
  const models = new ModelRegistry([
    {id: 'source-provider', kind: 'openai-compatible', baseUrl: 'https://source.example/v1', auth: {type: 'none'}, enabled: true},
    {id: 'cheap-provider', kind: 'openai-compatible', baseUrl: 'https://cheap.example/v1', auth: {type: 'none'}, enabled: true},
  ], [
    {id: 'source-model', provider: 'source-provider', providerModel: 'source/reviewer', capabilities: ['repository-review'], qualification: {state: 'QUALIFIED', version: 'source-q1', capabilities: ['repository-review'], nodes: ['controller']}, pricing: {currency: 'USD', inputPerMillionTokens: 20, outputPerMillionTokens: 40, effectiveFrom: '2026-09-01', source: 'fixture'}},
    {id: 'cheap-model', provider: 'cheap-provider', providerModel: 'cheap/reviewer', capabilities: ['repository-review'], qualification: {state: 'QUALIFIED', version: 'cheap-q1', capabilities: ['repository-review'], nodes: ['controller']}, pricing: {currency: 'USD', inputPerMillionTokens: 1, outputPerMillionTokens: 2, effectiveFrom: '2026-09-01', source: 'fixture'}},
  ], {roles: {'review.default': {primary: 'source-model', fallback: ['cheap-model'], requires: ['repository-review']}}});
  return {models, route: models.route({model: 'source-model', nodeId: 'controller', requiredCapabilities: ['repository-review'], allowFallback: false})};
}

function reviewRequest(route: ReturnType<ModelRegistry['route']>) {
  const run: ParameterizedJobRun = {schema: 'agent-control.job-run/v1', id: 'run-handoff', occurrenceId: 'occurrence-handoff', savedJobId: 'saved-handoff', definition: repositoryCodeReviewDefinition, resolvedParameters: {node: 'controller', repository: '/repo', ref: 'main', scope: 'full'}, trigger: {type: 'manual', actor: 'test'}, status: 'RUNNING', transitions: [{status: 'RUNNING', at: '2026-09-02T00:00:00Z'}], requestedAt: '2026-09-02T00:00:00Z', startedAt: '2026-09-02T00:00:00Z', repository: {identity: 'repo-id', name: 'repo', nodeId: 'controller', sourcePath: '/repo', requestedRef: 'main', reviewedSha: '1123456789012345678901234567890123456789', dirty: false, dirtyPaths: [], snapshotPath: '/snapshot', snapshotKind: 'local-shared-clone'}, context: {profile: 'STANDARD', files: ['first.ts', 'second.ts'], changedFiles: [], omittedFiles: [], chunks: [{id: 'context-1', files: ['first.ts'], sha256: 'one'}, {id: 'context-2', files: ['second.ts'], sha256: 'two'}], truncated: false}, workParcelIds: [], evidence: [], providerResponseIds: [], usage: {source: 'unavailable'}, errors: [], fallbackHistory: [], retryHistory: [], immutable: false};
  return {run, route, instruction: 'Return the governed repository-review-v1 object.', contextChunks: [{id: 'context-1', content: '===== first.ts =====\nexport const first = true;', files: ['first.ts'], sha256: 'one'}, {id: 'context-2', content: '===== second.ts =====\nexport const second = true;', files: ['second.ts'], sha256: 'two'}], maximumOutputTokens: 1000, maximumCost: 1, signal: new AbortController().signal};
}

function fakeReviewClients(calls: Array<{model: string; prompt: string}>, failDestination = false): RepositoryReviewProviderClientFactory {
  return provider => ({
    async invoke(model, input, options) {
      calls.push({model: model.id, prompt: input});
      const source = model.id === 'source-model';
      const usage = {inputTokens: source ? 90 : 100, outputTokens: source ? 10 : 20, cachedInputTokens: 0, totalTokens: source ? 100 : 120, providerReportedCost: source ? 0.02 : 0.002, calculatedCost: source ? 0.0022 : 0.00014, currency: 'USD'};
      options?.onTelemetry?.({phase: 'started', providerId: provider.id, modelId: model.id, elapsedMs: 0, context: {tokens: source ? 91 : 20, limitTokens: 100, authority: 'authoritative', source: 'fixture-live-context'}});
      if (!source && failDestination) throw new Error('destination_transport_failed');
      options?.onTelemetry?.({phase: 'completed', providerId: provider.id, modelId: model.id, elapsedMs: source ? 10 : 12, usage, context: {tokens: source ? 91 : 20, limitTokens: 100, authority: 'authoritative', source: 'fixture-live-context'}});
      const reviewed = input.includes('Context chunk: context-2') ? 'second.ts' : 'first.ts';
      return {providerId: provider.id, modelId: model.id, providerModel: model.providerModel, output: JSON.stringify({schema: 'agent-control.repository-review/v1', executiveSummary: `Reviewed ${reviewed}.`, findings: [], positiveObservations: [], areasReviewed: [reviewed], areasNotReviewed: [], verdict: 'PASS'}), elapsedMs: source ? 10 : 12, usage, responseModel: model.providerModel, finishReason: 'stop', toolCall: null};
    },
  });
}
