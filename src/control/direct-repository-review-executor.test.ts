import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {DirectRepositoryReviewExecutor, parseRepositoryReviewResponse, REPOSITORY_REVIEW_OUTPUT_SCHEMA, type RepositoryReviewProviderClientFactory} from './direct-repository-review-executor.js';
import {ContractExecutionRuntime} from './contract-runtime.js';
import {GovernedHandoffRuntime} from './handoff-runtime.js';
import {JobCatalog} from './job-catalog.js';
import {ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from './job-runtime.js';
import {ModelRegistry} from './model-registry.js';
import {ParameterizedJobEngine} from './parameterized-job-engine.js';
import {ParameterizedJobRegistry, ParameterizedRunStore, SavedJobStore} from './parameterized-job-registry.js';
import {repositoryCodeReviewDefinition} from './repository-review-definition.js';
import {ReviewBaselineStore} from './repository-review-runtime.js';
import type {ParameterizedJobRun} from './parameterized-job-types.js';
import {WorkParcelCoordinator, WorkParcelStore} from './work-parcels.js';
import {TokenAwareBatonRuntime} from './token-aware-baton-routing.js';
import {GovernedRetrievalRuntime, RepositoryTextRetrievalProvider} from './governed-retrieval.js';

test('production repository review compiles governed evidence and preserves retrieval provenance',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-production-retrieval-'));try{fs.writeFileSync(path.join(root,'first.ts'),`export function routeModel() { return 'qualified'; }\n${'irrelevant broad context\n'.repeat(500)}`);const {models,route}=handoffRegistry(),store=new WorkParcelStore(path.join(root,'parcels.json')),retrieval=new GovernedRetrievalRuntime([new RepositoryTextRetrievalProvider('exact')],{enabled:true,progression:['EXACT'],minimumConfidence:0,requiredCoverage:0,maximumEvidenceTokens:256}),calls:Array<{model:string;prompt:string}>=[],executor=new DirectRepositoryReviewExecutor(models,store,undefined,undefined,fakeReviewClients(calls),undefined,retrieval),request=reviewRequest(route);request.run.repository!.snapshotPath=root;request.run.repository!.identity='retrieval-fixture';request.contextChunks=[{id:'context-1',content:`===== first.ts =====\n${fs.readFileSync(path.join(root,'first.ts'),'utf8')}`,files:['first.ts'],sha256:'one'}];request.instruction='Review routeModel';const response=await executor.execute(request);assert.match(calls[0].prompt,/Governed Evidence Packet:/);assert.ok(calls[0].prompt.length<1000);assert.ok(response.evidence.some(item=>item.startsWith('evidence-packet:')));const parcel=store.get(response.workParcelIds[0])!;assert.ok(parcel.provenance.some(item=>item.type==='retrieval.evidence'));assert.ok(retrieval.projection().totals.contextTokensSaved>0);}finally{fs.rmSync(root,{recursive:true,force:true});}});

test('production engine retry preserves one logical Run while opening an immutable token thread for each execution attempt', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-review-retry-')),repository=path.join(root,'repository'); t.after(()=>{for(const entry of fs.readdirSync(root,{recursive:true}).map(value=>path.join(root,String(value))).sort((a,b)=>b.length-a.length))try{fs.chmodSync(entry,fs.statSync(entry).isDirectory()?0o700:0o600)}catch{}fs.rmSync(root,{recursive:true,force:true})}); fs.mkdirSync(repository);
  for(const args of [['init','-q','-b','main'],['config','user.email','test@example.invalid'],['config','user.name','Agent Control Test']] as string[][])execFileSync('git',args,{cwd:repository});
  fs.writeFileSync(path.join(repository,'index.ts'),'export const safe = true;\n'); execFileSync('git',['add','.'],{cwd:repository}); execFileSync('git',['commit','-qm','fixture'],{cwd:repository});
  const {models}=handoffRegistry(),parcels=new WorkParcelStore(path.join(root,'parcels.json')),routing=new TokenAwareBatonRuntime(path.join(root,'routing.json')); let invocation=0;
  const executor=new DirectRepositoryReviewExecutor(models,parcels,routing,undefined,provider=>({invoke:async(model,_input,options)=>{invocation++;options?.onTelemetry?.({phase:'started',providerId:provider.id,modelId:model.id,elapsedMs:invocation,context:{tokens:null,limitTokens:null,authority:'unavailable',source:'fixture'}});if(invocation===1)throw new Error('controlled_provider_retry');const usage={inputTokens:10,outputTokens:2,cachedInputTokens:0,totalTokens:12,providerReportedCost:.01,calculatedCost:.01,currency:'USD'};options?.onTelemetry?.({phase:'completed',providerId:provider.id,modelId:model.id,elapsedMs:2,usage,context:{tokens:null,limitTokens:null,authority:'unavailable',source:'fixture'}});return{providerId:provider.id,modelId:model.id,providerModel:model.providerModel,output:JSON.stringify({schema:'agent-control.repository-review/v1',executiveSummary:'Retry completed.',findings:[],positiveObservations:[],areasReviewed:['index.ts'],areasNotReviewed:[],verdict:'PASS'}),elapsedMs:2,usage,responseModel:model.providerModel,finishReason:'stop',toolCall:null};}}));
  const definitions=new ParameterizedJobRegistry();definitions.register(repositoryCodeReviewDefinition);const saved=new SavedJobStore(path.join(root,'saved.json'),definitions),runs=new ParameterizedRunStore(path.join(root,'runs.json')),baselines=new ReviewBaselineStore(path.join(root,'baselines.json')),engine=new ParameterizedJobEngine(definitions,saved,runs,baselines,models,executor,{allowedRepositoryRoots:[root],snapshotsRoot:path.join(root,'snapshots'),nodeHealthy:()=>true});
  saved.create({id:'retry-review',name:'Retry review',definition:{id:'repository-code-review',version:1,follow:'pinned'},parameters:{node:'controller',repository,ref:'main',scope:'full'},routing:{model:'source-model',allowFallback:false},contextProfile:'STANDARD',budgets:{maximumRetries:1},concurrency:'forbid-overlap',enabled:true});
  const completed=await engine.execute(engine.runNow('retry-review','test').id),threads=routing.projection().threads;
  assert.equal(completed.status,'SUCCEEDED');assert.equal(completed.retryHistory[0].reason,'controlled_provider_retry');assert.equal(invocation,2);assert.equal(completed.workParcelIds.length,2);
  assert.deepEqual(threads.map(thread=>thread.id).sort(),[`review:${completed.id}:attempt-1:${completed.context!.chunks[0].id}`,`review:${completed.id}:attempt-2:${completed.context!.chunks[0].id}`].sort());
  assert.notEqual(threads[0].parcelId,threads[1].parcelId);assert.ok(threads.every(thread=>thread.recoverable));
});

test('repository review invokes the selected provider directly and persists attributable Work Parcels, usage and response evidence', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-direct-review-')),originalFetch=globalThis.fetch;let requestBody:Record<string,unknown>|undefined;
  globalThis.fetch=async(_input,init)=>{requestBody=JSON.parse(String(init?.body));return new Response(JSON.stringify({id:'provider-response-secret-id',model:'vendor/reviewer',choices:[{finish_reason:'stop',message:{content:JSON.stringify({schema:'agent-control.repository-review/v1',executiveSummary:'Reviewed one frozen chunk.',findings:[],positiveObservations:['Typed boundary'],areasReviewed:['index.ts'],areasNotReviewed:[],verdict:'PASS'})}}],usage:{prompt_tokens:80,completion_tokens:20,total_tokens:100,cost:.002}}),{status:200,headers:{'content-type':'application/json'}})};
  try{
    const models=new ModelRegistry([{id:'external',kind:'openai-compatible',baseUrl:'https://provider.example/v1',wireApi:'chat-completions',auth:{type:'none'},enabled:true}],[{id:'reviewer',provider:'external',providerModel:'vendor/reviewer',capabilities:['repository-review'],qualification:{state:'QUALIFIED',version:'qualification-7',qualifiedAt:'2026-09-01T00:00:00Z',capabilities:['repository-review'],nodes:['controller']},pricing:{currency:'USD',inputPerMillionTokens:1,outputPerMillionTokens:2,effectiveFrom:'2026-09-01',source:'fixture'}}],{roles:{'review.default':{primary:'reviewer',requires:['repository-review']}}}),route=models.route({modelRole:'review.default',nodeId:'controller',requiredCapabilities:['repository-review']}),store=new WorkParcelStore(path.join(root,'parcels.json')),routing=new TokenAwareBatonRuntime(path.join(root,'token-routing.json')),executor=new DirectRepositoryReviewExecutor(models,store,routing);
    const run:ParameterizedJobRun={schema:'agent-control.job-run/v1',id:'run-1',occurrenceId:'occurrence-1',savedJobId:'saved-1',definition:repositoryCodeReviewDefinition,resolvedParameters:{node:'controller',repository:'/repo',ref:'main',scope:'full'},trigger:{type:'manual',actor:'test'},status:'RUNNING',transitions:[{status:'RUNNING',at:'2026-09-01T00:00:00Z'}],requestedAt:'2026-09-01T00:00:00Z',startedAt:'2026-09-01T00:00:00Z',repository:{identity:'repo-id',name:'repo',nodeId:'controller',sourcePath:'/repo',requestedRef:'main',reviewedSha:'0123456789012345678901234567890123456789',dirty:false,dirtyPaths:[],snapshotPath:'/snapshot',snapshotKind:'local-shared-clone'},context:{profile:'STANDARD',files:['index.ts'],changedFiles:[],omittedFiles:[],chunks:[{id:'context-1',files:['index.ts'],sha256:'abc'}],truncated:false},workParcelIds:[],evidence:[],providerResponseIds:[],usage:{source:'unavailable'},errors:[],fallbackHistory:[],retryHistory:[],immutable:false};
    const result=await executor.execute({run,executionAttempt:1,route,instruction:'Return the governed repository-review-v1 object.',contextChunks:[{id:'context-1',content:'===== index.ts =====\nexport const safe = true;',files:['index.ts'],sha256:'abc'}],maximumOutputTokens:1000,maximumCost:1,signal:new AbortController().signal});
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

test('repository review wire schema satisfies strict structured-output object requirements and normalizes nullable locations',()=>{
  const visit=(schema:unknown):void=>{
    if(!schema||typeof schema!=='object'||Array.isArray(schema))return;
    const node=schema as Record<string,unknown>,properties=node.properties as Record<string,unknown>|undefined;
    if(properties){assert.equal(node.additionalProperties,false);assert.deepEqual(new Set(node.required as string[]),new Set(Object.keys(properties)));for(const child of Object.values(properties))visit(child)}
    if(node.items)visit(node.items);
  };
  visit(REPOSITORY_REVIEW_OUTPUT_SCHEMA);
  assert.equal(JSON.stringify(REPOSITORY_REVIEW_OUTPUT_SCHEMA).includes('"const"'),false);
  assert.equal(JSON.stringify(REPOSITORY_REVIEW_OUTPUT_SCHEMA).includes('"enum"'),false);
  const finding={id:'f1',severity:'low',title:'A finding',category:'maintainability',file:null,startLine:null,endLine:null,evidence:'Observed in the bounded source.',reasoning:'The implementation can be clearer.',impact:'Low maintenance cost.',suggestedRemediation:'Clarify the implementation.',confidence:.8,validation:{state:'UNVERIFIED',reasons:[]}};
  const result=parseRepositoryReviewResponse(JSON.stringify({schema:'agent-control.repository-review/v1',executiveSummary:'summary',findings:[finding],positiveObservations:[],areasReviewed:['index.ts'],areasNotReviewed:[],verdict:'PASS_WITH_FINDINGS'}));
  assert.equal(result.findings[0].file,undefined);assert.equal(result.findings[0].startLine,undefined);assert.equal(result.findings[0].endLine,undefined);
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
    assert.equal(calls[0].prompt.includes('1123456789012345678901234567890123456789'), false);
    assert.match(calls[0].prompt, /===== first\.ts =====/);
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
    assert.equal(routing.thread('review:run-handoff:attempt-1:context-1').recoverable, true);

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

test('production handoff binds the destination account and node and preserves account-aware baton and ledger identity', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-account-handoff-'));
  const forbiddenSecret = 'sk-account-secret-must-never-enter-evidence-123456';
  try {
    const {models, route} = accountHandoffRegistry();
    const store = new WorkParcelStore(path.join(root, 'parcels.json'));
    const routing = new TokenAwareBatonRuntime(path.join(root, 'token-routing.json'));
    const contracts = new ContractExecutionRuntime(path.join(root, 'contracts.json'));
    const handoffs = new GovernedHandoffRuntime(contracts, path.join(root, 'handoffs.json'));
    const calls: Array<{model: string; account: string}> = [];
    const clients: RepositoryReviewProviderClientFactory = (provider, account, selectedRoute) => ({async invoke(model, input, options) {
      if (!account) throw new Error('account_profile_required');
      calls.push({model: model.id, account: account.id});
      if (model.id === 'luna-plus' && account.id !== 'cottage-plus') throw new Error('destination_account_isolation_failed');
      if (model.id === 'sol-pro' && account.id !== 'lawrence-pro') throw new Error('source_account_isolation_failed');
      const source = model.id === 'sol-pro', usage = {inputTokens: source ? 90 : 100, outputTokens: source ? 10 : 20, cachedInputTokens: 0, totalTokens: source ? 100 : 120, providerReportedCost: source ? .02 : .002, calculatedCost: source ? .0022 : .00014, currency: 'USD'};
      options?.onTelemetry?.({phase: 'completed', providerId: provider.id, modelId: model.id, elapsedMs: 10, usage, context: {tokens: source ? 91 : 20, limitTokens: 100, authority: 'authoritative', source: 'fixture'}});
      const reviewed = input.includes('===== second.ts =====') ? 'second.ts' : 'first.ts';
      return {providerId: provider.id, accountProfileId: account.id, modelId: model.id, nodeId: selectedRoute?.nodeId, providerModel: model.providerModel, output: JSON.stringify({schema: 'agent-control.repository-review/v1', executiveSummary: `Reviewed ${reviewed}.`, findings: [], positiveObservations: [], areasReviewed: [reviewed], areasNotReviewed: [], verdict: 'PASS'}), elapsedMs: 10, usage, responseModel: model.providerModel, finishReason: 'stop', toolCall: null};
    }});
    const executor = new DirectRepositoryReviewExecutor(models, store, routing, {routing, contracts, handoffs}, clients);
    const response = await executor.execute(reviewRequest(route));
    const parcel = store.get(response.workParcelIds[0])!, evidence = routing.evidence(), baton = evidence.batons[0], totals = routing.parcel(parcel.id);
    assert.deepEqual(calls, [{model: 'sol-pro', account: 'lawrence-pro'}, {model: 'luna-plus', account: 'cottage-plus'}]);
    assert.equal(baton.accountProfileId, 'lawrence-pro');
    assert.equal(baton.nodeId, 'source-node');
    assert.equal(evidence.decisions.find(item => item.action === 'BATON_AND_HANDOFF')?.target?.accountProfileId, 'cottage-plus');
    assert.equal(evidence.decisions.find(item => item.action === 'BATON_AND_HANDOFF')?.target?.nodeId, 'destination-node');
    assert.deepEqual(parcel.audit.invocations.map(item => [item.provider, item.accountProfileId, item.model, item.node]), [['openai-codex', 'lawrence-pro', 'sol-pro', 'source-node'], ['openai-codex', 'cottage-plus', 'luna-plus', 'destination-node']]);
    assert.deepEqual(parcel.audit.totals.models, ['openai-codex/Lawrence Pro/sol-pro@source-node', 'openai-codex/Cottage Plus/luna-plus@destination-node']);
    assert.deepEqual(totals.byModel.map(item => [item.providerId, item.accountProfileId, item.modelId, item.nodeId]), [['openai-codex', 'lawrence-pro', 'sol-pro', 'source-node'], ['openai-codex', 'cottage-plus', 'luna-plus', 'destination-node']]);
    assert.equal(totals.totalTokens, 220);
    const destination = contracts.list().find(contract => contract.parentContractId);
    assert.equal(destination?.active.accountProfileId, 'cottage-plus');
    assert.equal(destination?.active.nodeId, 'destination-node');
    assert.equal(JSON.stringify({parcel, evidence, contracts: contracts.list()}).includes(forbiddenSecret), false);
    executor.recordVerification(response.workParcelIds, 'PASS');
    assert.equal(contracts.get(destination!.id).state, 'VERIFIED');
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('cross-provider continuation selects a qualified destination node instead of inheriting the source node', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-cross-provider-node-'));
  try {
    const providers=[{id:'source',kind:'cli' as const,enabled:true,accountProfiles:[{id:'remote',nodeId:'remote-node',label:'Remote',credentialStore:{type:'codex-home-env' as const,env:'CODEX_HOME_REMOTE'},qualification:{state:'QUALIFIED' as const,qualifiedAt:'2026-09-03T00:00:00Z',capabilities:['repository-review']}}]},{id:'local',kind:'local' as const,baseUrl:'http://127.0.0.1:8080/v1',enabled:true}];
    const models=[{id:'strong',provider:'source',accountProfile:'remote',providerModel:'strong',capabilities:['repository-review'],nodes:['remote-node'],qualification:{state:'QUALIFIED' as const,version:'q1',qualifiedAt:'2026-09-03T00:00:00Z',capabilities:['repository-review'],nodes:['remote-node']},pricing:{currency:'USD',inputPerMillionTokens:10,outputPerMillionTokens:10,effectiveFrom:'2026-09-03',source:'fixture'}},{id:'cheap',provider:'local',providerModel:'cheap',capabilities:['repository-review'],nodes:['controller'],qualification:{state:'QUALIFIED' as const,version:'q1',qualifiedAt:'2026-09-03T00:00:00Z',capabilities:['repository-review'],nodes:['controller']},pricing:{currency:'USD',inputPerMillionTokens:0,outputPerMillionTokens:0,effectiveFrom:'2026-09-03',source:'fixture'}}];
    const registry=new ModelRegistry(providers,models,{roles:{review:{primary:'strong',fallback:['cheap'],requires:['repository-review']}}},undefined,undefined,{});
    const source=registry.route({model:'strong',nodeId:'remote-node',requiredCapabilities:['repository-review']});
    const seen:string[]=[];
    const routing=new TokenAwareBatonRuntime(undefined,{continuePercent:1,prepareBatonPercent:2,compactPercent:3,handoffPercent:4});
    const store=new WorkParcelStore(path.join(root,'parcels.json'));
    const contracts=new ContractExecutionRuntime(path.join(root,'contracts.json'));
    const handoffs=new GovernedHandoffRuntime(contracts,path.join(root,'handoffs.json'));
    const executor=new DirectRepositoryReviewExecutor(registry,store,routing,{routing,contracts,handoffs},(_provider,_account,route)=>({invoke:async(model,_input,options)=>{
      seen.push(`${model.id}@${route?.nodeId}`);
      const usage={inputTokens:10,outputTokens:2,cachedInputTokens:0,totalTokens:12,providerReportedCost:null,calculatedCost:model.id==='strong'?1:0,currency:'USD'};
      options?.onTelemetry?.({phase:'started',providerId:model.provider,modelId:model.id,elapsedMs:0,context:{tokens:5,limitTokens:100,authority:'estimated',source:'fixture'}});
      options?.onTelemetry?.({phase:'completed',providerId:model.provider,modelId:model.id,elapsedMs:1,usage,context:{tokens:5,limitTokens:100,authority:'estimated',source:'fixture'}});
      return {providerId:model.provider,accountProfileId:model.accountProfile,modelId:model.id,nodeId:route?.nodeId,providerModel:model.providerModel,output:JSON.stringify({schema:'agent-control.repository-review/v1',executiveSummary:`Reviewed by ${model.id}.`,findings:[],positiveObservations:[],areasReviewed:[model.id==='strong'?'first.ts':'second.ts'],areasNotReviewed:[],verdict:'PASS'}),elapsedMs:1,usage,responseModel:model.providerModel,finishReason:'completed',toolCall:null};
    }}));
    await executor.execute(reviewRequest(source));
    assert.deepEqual(seen,['strong@remote-node','cheap@controller']);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
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

function accountHandoffRegistry() {
  const profiles = [
    {id: 'lawrence-pro', nodeId: 'source-node', label: 'Lawrence Pro', plan: 'ChatGPT Pro', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_LAWRENCE_PRO'}, qualification: {state: 'QUALIFIED' as const, version: 'account-pro-q1', checkedAt: '2026-09-02T00:00:00Z', qualifiedAt: '2026-09-02T00:00:00Z', capabilities: ['codex-chatgpt'], evidence: ['interactive-login']}},
    {id: 'cottage-plus', nodeId: 'destination-node', label: 'Cottage Plus', plan: 'ChatGPT Plus', credentialStore: {type: 'codex-home-env' as const, env: 'CODEX_HOME_COTTAGE_PLUS'}, qualification: {state: 'QUALIFIED' as const, version: 'account-plus-q1', checkedAt: '2026-09-02T00:00:00Z', qualifiedAt: '2026-09-02T00:00:00Z', capabilities: ['codex-chatgpt'], evidence: ['interactive-login']}},
  ];
  const models = new ModelRegistry([{id: 'openai-codex', kind: 'cli', enabled: true, accountProfiles: profiles}], [
    {id: 'sol-pro', provider: 'openai-codex', accountProfile: 'lawrence-pro', providerModel: 'sol', capabilities: ['repository-review'], qualification: {state: 'QUALIFIED', version: 'sol-q1', capabilities: ['repository-review'], nodes: ['source-node']}, pricing: {currency: 'USD', inputPerMillionTokens: 20, outputPerMillionTokens: 40, effectiveFrom: '2026-09-01', source: 'fixture'}},
    {id: 'luna-plus', provider: 'openai-codex', accountProfile: 'cottage-plus', providerModel: 'luna', capabilities: ['repository-review'], qualification: {state: 'QUALIFIED', version: 'luna-q1', capabilities: ['repository-review'], nodes: ['destination-node']}, pricing: {currency: 'USD', inputPerMillionTokens: 1, outputPerMillionTokens: 2, effectiveFrom: '2026-09-01', source: 'fixture'}},
  ], {roles: {'review.default': {primary: 'sol-pro', fallback: ['luna-plus'], requires: ['repository-review']}}}, undefined, undefined, {CODEX_HOME_LAWRENCE_PRO: process.cwd(), CODEX_HOME_COTTAGE_PLUS: process.cwd()});
  return {models, route: models.route({model: 'sol-pro', accountProfile: 'lawrence-pro', nodeId: 'source-node', requiredCapabilities: ['repository-review'], allowFallback: false})};
}

function reviewRequest(route: ReturnType<ModelRegistry['route']>) {
  const run: ParameterizedJobRun = {schema: 'agent-control.job-run/v1', id: 'run-handoff', occurrenceId: 'occurrence-handoff', savedJobId: 'saved-handoff', definition: repositoryCodeReviewDefinition, resolvedParameters: {node: 'controller', repository: '/repo', ref: 'main', scope: 'full'}, trigger: {type: 'manual', actor: 'test'}, status: 'RUNNING', transitions: [{status: 'RUNNING', at: '2026-09-02T00:00:00Z'}], requestedAt: '2026-09-02T00:00:00Z', startedAt: '2026-09-02T00:00:00Z', repository: {identity: 'repo-id', name: 'repo', nodeId: 'controller', sourcePath: '/repo', requestedRef: 'main', reviewedSha: '1123456789012345678901234567890123456789', dirty: false, dirtyPaths: [], snapshotPath: '/snapshot', snapshotKind: 'local-shared-clone'}, context: {profile: 'STANDARD', files: ['first.ts', 'second.ts'], changedFiles: [], omittedFiles: [], chunks: [{id: 'context-1', files: ['first.ts'], sha256: 'one'}, {id: 'context-2', files: ['second.ts'], sha256: 'two'}], truncated: false}, workParcelIds: [], evidence: [], providerResponseIds: [], usage: {source: 'unavailable'}, errors: [], fallbackHistory: [], retryHistory: [], immutable: false};
  return {run, executionAttempt: 1, route, instruction: 'Return the governed repository-review-v1 object.', contextChunks: [{id: 'context-1', content: '===== first.ts =====\nexport const first = true;', files: ['first.ts'], sha256: 'one'}, {id: 'context-2', content: '===== second.ts =====\nexport const second = true;', files: ['second.ts'], sha256: 'two'}], maximumOutputTokens: 1000, maximumCost: 1, signal: new AbortController().signal};
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
      const reviewed = input.includes('===== second.ts =====') ? 'second.ts' : 'first.ts';
      return {providerId: provider.id, modelId: model.id, providerModel: model.providerModel, output: JSON.stringify({schema: 'agent-control.repository-review/v1', executiveSummary: `Reviewed ${reviewed}.`, findings: [], positiveObservations: [], areasReviewed: [reviewed], areasNotReviewed: [], verdict: 'PASS'}), elapsedMs: source ? 10 : 12, usage, responseModel: model.providerModel, finishReason: 'stop', toolCall: null};
    },
  });
}
