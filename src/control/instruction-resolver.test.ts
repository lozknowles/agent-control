import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {instructionHash, resolveInstructions, verifyInstructionManifest, type InstructionSource} from './instruction-resolver.js';
import {InstructionManifestStore, baseInstructionSources, instructionIdentity, observeProviderInstructions, withInstructionScope} from './instruction-observer.js';
import {discoverRepositoryInstructions} from './instruction-discovery.js';
import {negotiateInstructionCapabilities} from './instruction-capabilities.js';
import {OpenAICompatibleProviderClient} from './openai-compatible-provider.js';

const identity=instructionIdentity('parcel-unit',{workerId:'unit-worker'});
const source=(type:InstructionSource['type'],uri:string,content:string,scope='.'):InstructionSource=>({type,uri,content,scope});
const resolve=(sources:InstructionSource[],overrides:Partial<Parameters<typeof resolveInstructions>[0]>={})=>resolveInstructions({identity,sources,...overrides});
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'instruction-tests-'));

test('A/C/D: user instructions beat nested repository advice; nested advice wins only within its own scope',()=>{
  const sources=[source('REPOSITORY','repo://sample/AGENTS.md','instruction.format=root'),source('REPOSITORY','repo://sample/src/AGENTS.md','instruction.format=nested','src')];
  const {manifest,proposedInstructions}=resolve(sources,{targetPaths:['src/a.ts','docs/b.md']});
  assert.equal(manifest.precedenceDecisions.find(item=>item.target==='src/a.ts')?.winningValueHash,instructionHash('nested'));
  assert.equal(manifest.precedenceDecisions.find(item=>item.target==='docs/b.md')?.winningValueHash,instructionHash('root'));
  assert.match(proposedInstructions,/For target src\/a.ts: instruction.format=nested/);
  const user=resolve([...sources,source('USER_TASK','user://task','instruction.format=current')],{targetPaths:['src/a.ts']});
  assert.equal(user.manifest.precedenceDecisions[0].winningValueHash,instructionHash('current'));
  assert.doesNotMatch(user.proposedInstructions,/instruction.format=(root|nested)/);
  assert.equal(user.manifest.shadow.applied,false);
});

test('G: memory, continuation, persona and capability overlays never become directive authority',()=>{
  const sources=[source('USER_TASK','user://task','instruction.permission=review'),...(['MEMORY','CONTINUATION','PERSONA','PROVIDER_OVERLAY'] as const).map(type=>source(type,`${type.toLowerCase()}://one`,'instruction.permission=deploy'))];
  const {manifest}=resolve(sources);
  assert.equal(manifest.precedenceDecisions[0].winningValueHash,instructionHash('review'));
  assert.equal(manifest.conflicts.length,0);
  assert.ok(manifest.selectedSources.filter(item=>item.type!=='USER_TASK').every(item=>item.semanticAssessment==='NOT_PARSED'));
  assert.equal(manifest.verification.freeTextConflictCoverage,'NOT_EXHAUSTIVE');
});

test('canonical hashes are stable under source ordering, target ordering and duplicate placement',()=>{
  const one=source('REPOSITORY','repo://one','instruction.format=one');
  const sources=[one,source('USER_TASK','user://one','Do the bounded task'),{...one},source('MEMORY','memory://one','advisory')];
  const first=resolve(sources,{targetPaths:['z.ts','a.ts']}).manifest;
  for(let shift=0;shift<sources.length;shift++) {
    const rotated=[...sources.slice(shift),...sources.slice(0,shift)].reverse();
    assert.deepEqual(resolve(rotated,{targetPaths:['a.ts','z.ts']}).manifest,first);
  }
  assert.equal(first.excludedSources[0].reason,'DUPLICATE_SOURCE');
  assert.ok(verifyInstructionManifest(first));
  first.identity.workerId='tampered';assert.equal(verifyInstructionManifest(first),false);
  assert.equal(verifyInstructionManifest({} as never),false);
});

test('ambiguous equal precedence and inconsistent source identity fail shadow verification',()=>{
  const first=resolve([source('USER_TASK','user://one','instruction.color=red'),source('USER_TASK','user://two','instruction.color=blue')]);
  assert.equal(first.manifest.conflicts[0].resolution,'UNRESOLVED_EQUAL_PRECEDENCE');
  assert.equal(first.manifest.precedenceDecisions.length,0);
  assert.equal(first.manifest.verification.resolution,'FAIL');
  assert.doesNotMatch(first.proposedInstructions,/instruction.color=/);
  const second=resolve([source('REPOSITORY','repo://same','red'),source('REPOSITORY','repo://same','blue')]);
  assert.equal(second.manifest.selectedSources.length,0);
  assert.equal(second.manifest.conflicts[0].resolution,'SOURCE_IDENTITY_CONFLICT');
});

test('B: noisy sources are bounded, truncation is recorded, partial directives are not interpreted',()=>{
  const result=resolve([source('REPOSITORY','repo://large','Noise\n'+'x'.repeat(2000))],{maximumBytes:512,maximumSourceBytes:100});
  assert.equal(result.manifest.selectedSources[0].truncated,true);
  assert.ok(Buffer.byteLength(result.proposedInstructions)<=512);
  const unicode=resolve([source('REPOSITORY','repo://unicode','🙂'.repeat(100))],{maximumBytes:512,maximumSourceBytes:5});
  assert.doesNotMatch(unicode.proposedInstructions,/\ufffd/);
  const partial=resolve([source('USER_TASK','user://large','instruction.color=red')],{maximumBytes:512,maximumSourceBytes:19});
  assert.equal(partial.manifest.precedenceDecisions.length,0);
  assert.equal(partial.manifest.verification.resolution,'FAIL');
});

test('E/F: selected skills, expiry, audience, exclusions, amendments and sealed baton remain explicit',()=>{
  const baton={id:'baton-unit',hash:instructionHash('sealed-unit')};
  const {manifest}=resolve([
    {...source('SKILL','skill://selected','Use typed tools'),skillId:'selected'},
    {...source('SKILL','skill://other','Irrelevant'),skillId:'other'},
    {...source('TEMPORARY','temporary://one','instruction.format=amended'),expiresAt:'2026-09-13T00:00:00Z'},
    {...source('TEMPORARY','temporary://expired','expired'),expiresAt:'2026-09-11T00:00:00Z'},
    {...source('REPOSITORY','repo://private','wrong worker'),audience:['another-worker']},
    source('REPOSITORY','repo://outside','wrong scope','other'),
    ...baseInstructionSources('instruction.format=original',[],{id:baton.id,sha256:baton.hash}),
  ],{targetPaths:['src/a.ts'],selectedSkillIds:['selected'],now:'2026-09-12T00:00:00Z',continuation:baton,amendments:[{id:'amendment-unit',hash:instructionHash('amended'),status:'ACCEPTED'}]});
  assert.deepEqual(manifest.continuation,baton);
  assert.equal(manifest.amendments[0].id,'amendment-unit');
  assert.equal(manifest.temporaryInstructionIds.length,1);
  assert.equal(manifest.precedenceDecisions[0].winningValueHash,instructionHash('amended'));
  assert.deepEqual(new Set(manifest.excludedSources.map(item=>item.reason)),new Set(['SKILL_NOT_SELECTED','TEMPORARY_EXPIRED_OR_TIME_UNPROVEN','AUDIENCE_MISMATCH','OUTSIDE_SCOPE']));
  assert.equal(manifest.selectedSources.find(item=>item.type==='SKILL')?.skillId,'selected');
  assert.equal(resolve([{...source('TEMPORARY','temp://one','text'),expiresAt:'2026-09-13'}],{now:'invalid'}).manifest.excludedSources[0].reason,'TEMPORARY_EXPIRED_OR_TIME_UNPROVEN');
});

test('H: capability negotiation requires explicit adapter evidence and never guesses native support',()=>{
  const all=negotiateInstructionCapabilities(['multi_agent'],[]);
  assert.ok(all.every(item=>item.outcome==='UNSUPPORTED'));
  assert.equal(all.filter(item=>item.requested).length,1);
  const offer={capability:'native_mid_turn_steering' as const,outcome:'CONTINUATION' as const,adapter:'test-adapter',reason:'Test mechanism declaration, not physical qualification',evidence:['unit://continuation']};
  assert.equal(negotiateInstructionCapabilities([offer.capability],[offer])[0].outcome,'CONTINUATION');
  assert.throws(()=>negotiateInstructionCapabilities([],[{...offer,evidence:[]}]),/evidence_required/);
  assert.throws(()=>negotiateInstructionCapabilities([],[offer,offer]),/ambiguous/);
});

test('discovery reads canonical target ancestry only and rejects symlinks, escape, oversized and non-UTF8 files',t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'src'));fs.mkdirSync(path.join(root,'unrelated'));
  fs.writeFileSync(path.join(root,'AGENTS.md'),'root guidance');fs.writeFileSync(path.join(root,'src','AGENTS.md'),'nested guidance');
  fs.writeFileSync(path.join(root,'agents.md'),'lowercase');fs.writeFileSync(path.join(root,'unrelated','AGENTS.md'),'unrelated');
  const repository={id:'unit',root,revision:'revision-unit',approvedRoots:[root],targetPaths:['src/a.ts']};
  const found=discoverRepositoryInstructions(repository);
  assert.equal(found.filter(item=>item.content!==undefined).length,2);
  assert.equal(found.find(item=>item.uri.endsWith('/agents.md'))?.exclusion,'NON_CANONICAL_FILENAME_NOT_LOADED');
  assert.ok(found.every(item=>!item.uri.includes('unrelated')));
  assert.throws(()=>discoverRepositoryInstructions({...repository,targetPaths:['../escape']}),/scope_escape/);
  assert.throws(()=>discoverRepositoryInstructions({...repository,approvedRoots:[path.join(root,'src')]}),/not_approved/);
  fs.unlinkSync(path.join(root,'src','AGENTS.md'));fs.symlinkSync(path.join(root,'AGENTS.md'),path.join(root,'src','AGENTS.md'));
  assert.equal(discoverRepositoryInstructions(repository).find(item=>item.scope==='src')?.exclusion,'SYMLINK_OR_SCOPE_ESCAPE');
  assert.equal(discoverRepositoryInstructions(repository,2).find(item=>item.scope==='.' && item.uri.endsWith('/AGENTS.md'))?.exclusion,'FILE_TYPE_OR_DISCOVERY_BUDGET_EXCLUDED');
  fs.writeFileSync(path.join(root,'AGENTS.md'),Buffer.from([0xff]));
  assert.equal(discoverRepositoryInstructions(repository).find(item=>item.scope==='.' && item.uri.endsWith('/AGENTS.md'))?.exclusion,'NON_UTF8_INSTRUCTIONS');
});

test('hash-only persistence excludes raw prompts and secrets; corruption is visible without blocking current work',async t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const secret=['nvapi','synthetic','s'.repeat(32)].join('-'),store=new InstructionManifestStore(root);
  const result=resolve([source('USER_TASK','user://task','private task text'),source('MEMORY','memory://secret',secret)]).manifest;
  store.record(result);const reloaded=new InstructionManifestStore(root);reloaded.record(result);
  const bytes=fs.readFileSync(path.join(root,`${result.hash}.json`),'utf8');
  assert.ok(!bytes.includes(secret) && !bytes.includes('private task text'));
  assert.equal(result.excludedSources[0].reason,'SENSITIVE_CONTENT_HASH_ONLY');
  assert.deepEqual(reloaded.get(result.id),result);
  fs.writeFileSync(path.join(root,`${result.hash}.json`),'{}');
  const damaged=new InstructionManifestStore(root);assert.equal(damaged.list().length,0);assert.equal(damaged.events()[0].kind,'SHADOW_ERROR');
  const returned=await withInstructionScope({store:damaged,input:{identity,sources:[],maximumBytes:1}},async()=>42);
  assert.equal(returned,42);assert.ok(damaged.events().some(item=>item.kind==='SHADOW_ERROR'));
});

test('actual adapter bytes remain identical with shadow observation; transformed hashes and failures are retained',async()=>{
  const bodies:string[]=[];
  const provider={id:'unit-provider',kind:'openai-compatible' as const,baseUrl:'https://unit.invalid/v1',wireApi:'chat-completions' as const,auth:{type:'none' as const}};
  const model={id:'unit-model',provider:provider.id,providerModel:'unit/model',enabled:true,capabilities:[]};
  const client=new OpenAICompatibleProviderClient(provider,async(_url,init)=>{bodies.push(String(init?.body));return new Response(JSON.stringify({model:'unit/model',choices:[{message:{content:'unit result'},finish_reason:'stop'}]}),{status:200});});
  const prompt='A private unit task';await client.invoke(model,prompt);
  const store=new InstructionManifestStore();
  await withInstructionScope({store,input:{identity,sources:baseInstructionSources(prompt)}},()=>client.invoke(model,prompt));
  assert.equal(bodies[0],bodies[1]);
  const manifest=store.list().find(item=>item.effectiveInstructionHash)!;
  assert.equal(manifest.identity.providerId,provider.id);assert.equal(manifest.identity.modelId,model.id);
  assert.equal(manifest.effectiveInstructionHash,instructionHash(prompt));assert.equal(manifest.transformations[0].wireHash?.length,64);
  assert.ok(store.events().some(item=>item.kind==='PROVIDER_COMPLETED'));
  assert.ok(!JSON.stringify(store.list()).includes(prompt));
  await withInstructionScope({store,input:{identity,sources:baseInstructionSources(prompt)}},async()=>{
    const done=observeProviderInstructions({adapter:'test-transform',operation:'unit wrapper',current:prompt,actual:`Wrapper\n${prompt}`});done('FAILED');done('COMPLETED');
  });
  assert.equal(store.events().filter(item=>item.kind==='PROVIDER_FAILED').length,1);
  const transformed=store.list().at(-1)!;assert.notEqual(transformed.shadow.currentHash,transformed.shadow.actualHash);
});

test('asynchronous scopes retain independent parcel and worker identity',async()=>{
  const store=new InstructionManifestStore();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
  await Promise.all(['left','right'].map(side=>withInstructionScope({store,input:{identity:instructionIdentity(side,{workerId:side}),sources:baseInstructionSources(side)}},async()=>{
    if(side==='left')await gate;else release();
    observeProviderInstructions({adapter:'unit',operation:'identity isolation',current:side,actual:side})('COMPLETED');
  })));
  for(const side of ['left','right'])assert.ok(store.list(side).every(item=>item.identity.workerId===side));
  assert.equal(store.events().filter(item=>item.kind==='PROVIDER_COMPLETED').length,2);
});


test('the published manifest schema accepts canonical records and rejects raw prompt fields and enforcement',()=>{
  const Ajv=createRequire(import.meta.url)('ajv/dist/2020');
  const schema=JSON.parse(fs.readFileSync(new URL('../../config/schemas/effective-instruction-manifest-v1.schema.json',import.meta.url),'utf8'));
  const validate=new Ajv({allErrors:true,strict:true}).compile(schema);
  const manifest=resolve(baseInstructionSources('Unit task')).manifest;
  assert.equal(validate(manifest),true,JSON.stringify(validate.errors));
  assert.equal(validate({...manifest,rawPrompt:'must never be stored'}),false);
  assert.equal(validate({...manifest,mode:'ENFORCE'}),false);
  assert.equal(validate({...manifest,hash:'invalid'}),false);
});


test('provider manifests inherit governed parcel amendment identities without changing the current prompt',async()=>{
  const store=new InstructionManifestStore(), amendments=[{id:'accepted-unit-amendment',hash:instructionHash('amendment'),status:'ACCEPTED'}];
  store.resolve({identity:instructionIdentity('parcel-amendment'),sources:baseInstructionSources('Task'),amendments});
  await withInstructionScope({store,input:{identity:instructionIdentity('parcel-amendment',{runId:'run-unit'}),sources:baseInstructionSources('Task',['Accepted instruction'])}},async()=>{
    observeProviderInstructions({adapter:'unit',operation:'unchanged',current:'Task',actual:'Task'})('COMPLETED');
  });
  const observed=store.list().find(item=>item.effectiveInstructionHash)!;
  assert.deepEqual(observed.amendments,amendments);assert.equal(observed.effectiveInstructionHash,instructionHash('Task'));
});
