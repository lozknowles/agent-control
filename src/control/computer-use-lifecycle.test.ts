import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resolveComputerTransition,validComputerTransition,type ComputerWindow,type ComputerTopology} from './computer-use-lifecycle.js';
import {verifyComputerArtifact} from './computer-use-artifact.js';
import {ComputerProviderRegistry,ComputerUseCapability,type ComputerProvider} from './computer-use.js';

const now=new Date().toISOString();
const root:ComputerWindow={key:'root',provider:'fixture',application:'Editor',process:{key:'p1',executable:'/editor',startedAt:now},title:'Untitled',role:'APPLICATION',detectedAt:now,visible:true,foreground:true,bounds:{x:0,y:0,width:100,height:100}};
const dialog:ComputerWindow={...root,key:'dialog',owner:'root',role:'DIALOG',title:'Save',detectedAt:now};
const topology=(...windows:ComputerWindow[]):ComputerTopology=>({at:now,windows});
test('transition deadlines and selectors reject malformed input',()=>{for(const timeoutMs of [NaN,Infinity,-1,10001,'infinite'])assert.equal(validComputerTransition({type:'CHILD_DIALOG',timeoutMs:timeoutMs as number}),false);assert.equal(validComputerTransition({type:'CURRENT_WINDOW',title:''}),false);assert.equal(validComputerTransition({type:'CURRENT_WINDOW',timeoutMs:1000}),true);});
for(const [name,type,previous,before,after,expected] of [
  ['expected child dialog','CHILD_DIALOG',root,topology(root),topology({...root,foreground:false},dialog),'dialog'],
  ['dialog destruction','WINDOW_DISMISSED',dialog,topology(root,dialog),topology(root),'root'],
  ['application refocus','APPLICATION_REFOCUS',root,topology(root),topology(root),'root'],
  ['replacement window','REPLACEMENT_WINDOW',root,topology(root),topology({...root,key:'new'}),'new'],
  ['application window created','APPLICATION_WINDOW_CREATED',root,topology(root),topology({...root,foreground:false},{...root,key:'new'}),'new'],
  ['application window destroyed','APPLICATION_WINDOW_DESTROYED',dialog,topology(root,dialog),topology(root),'root'],
] as const)test(name,()=>{const result=resolveComputerTransition({type},previous,before,after);assert.equal(result.decision,'BOUND');assert.equal(result.successor?.key,expected);});
test('ambiguous successor blocks even when titles match',()=>{const result=resolveComputerTransition({type:'CHILD_DIALOG',title:'Save'},root,topology(root),topology({...root,foreground:false},dialog,{...dialog,key:'other'}));assert.equal(result.reason,'ambiguous_successor');});
test('title spoof from another process cannot become a successor',()=>{const spoof={...dialog,process:{...dialog.process,key:'attacker'}};assert.equal(resolveComputerTransition({type:'CHILD_DIALOG'},root,topology(root),topology({...root,foreground:false},spoof)).decision,'TRANSITION_MISMATCH');});
test('process restart and reused window ID do not retain identity',()=>{const reused={...root,process:{...root.process,startedAt:'2000-01-01T00:00:00Z'}};assert.equal(resolveComputerTransition({type:'CURRENT_WINDOW'},root,topology(root),topology(reused)).decision,'TRANSITION_MISMATCH');});
test('foreign foreground blocks and absent foreground requests reacquisition',()=>{assert.equal(resolveComputerTransition({type:'CURRENT_WINDOW'},root,topology(root),{...topology(root),foreignForeground:true}).decision,'TRANSITION_MISMATCH');assert.equal(resolveComputerTransition({type:'CURRENT_WINDOW'},root,topology(root),topology({...root,foreground:false})).decision,'REACQUIRE_REQUIRED');});
test('hidden and security dialogs cannot be selected',()=>{for(const candidate of [{...dialog,visible:false},{...dialog,role:'SECURITY' as const}])assert.notEqual(resolveComputerTransition({type:'CHILD_DIALOG'},root,topology(root),topology(candidate)).decision,'BOUND');});
test('unchanged current window cannot satisfy expected dismissal',()=>{assert.equal(resolveComputerTransition({type:'WINDOW_DISMISSED'},dialog,topology(root,dialog),topology(root,dialog)).decision,'TRANSITION_MISMATCH');});
test('unproven prior window blocks transition',()=>{assert.equal(resolveComputerTransition({type:'CURRENT_WINDOW'},root,topology(),topology(root)).reason,'previous_identity_unproven');});

test('scoped artifact verification hashes a current regular file and application result',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'computer-output-'));try{fs.writeFileSync(path.join(dir,'scene.bin'),'scene');const grant={runId:'run',root:dir,relativePath:'scene.bin',notBefore:new Date(Date.now()-1000).toISOString(),maxBytes:100};const proof=await verifyComputerArtifact(grant,'run',{id:'fixture',verify:async()=>({passed:true,details:{cube:true}})});assert.equal(proof.size,5);assert.match(proof.sha256,/^[a-f0-9]{64}$/);assert.equal(proof.application?.passed,true);
    for(const relativePath of ['../scene.bin','a/../scene.bin','/absolute','C:\\secret','a//b'])await assert.rejects(()=>verifyComputerArtifact({...grant,relativePath},'run'),/scope/);
    await assert.rejects(()=>verifyComputerArtifact(grant,'other'),/grant_invalid/);
    await assert.rejects(()=>verifyComputerArtifact({...grant,notBefore:new Date(Date.now()+10000).toISOString()},'run'),/stale/);
    await assert.rejects(()=>verifyComputerArtifact(grant,'run',{id:'fixture',verify:async()=>({passed:false,details:{}})}),/application_verification_failed/);
    await assert.rejects(()=>verifyComputerArtifact(grant,'run',{id:'fixture',verify:async()=>{fs.writeFileSync(path.join(dir,'scene.bin'),'changed');return{passed:true,details:{}};}}),/changed_during/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('empty files, directories and hard links fail artifact verification',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'computer-output-'));try{const grant={runId:'r',root:dir,relativePath:'empty',notBefore:new Date(Date.now()-1000).toISOString(),maxBytes:100};fs.writeFileSync(path.join(dir,'empty'),'');await assert.rejects(()=>verifyComputerArtifact(grant,'r'));fs.mkdirSync(path.join(dir,'folder'));await assert.rejects(()=>verifyComputerArtifact({...grant,relativePath:'folder'},'r'));fs.writeFileSync(path.join(dir,'source'),'data');fs.linkSync(path.join(dir,'source'),path.join(dir,'link'));await assert.rejects(()=>verifyComputerArtifact({...grant,relativePath:'link'},'r'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('core records dialog transition then fresh observation before completion',async()=>{
  let active=root,acted=false;const provider:ComputerProvider={id:'fixture',capabilities:()=>({operations:['pressKey'],targeting:[],persistentSession:true,screenshots:false}),available:async()=>true,open:async()=>({observe:async()=>({revision:'fresh',at:now,target:{machine:'local',application:'Editor',window:active.key},windowIdentity:active,title:active.title,elements:[]}),topology:async()=>acted?topology({...root,foreground:false},dialog):topology(root),boundWindow:async()=>active,bindWindow:async w=>{active=w;},act:async()=>{acted=true;return{detail:'opened'};},close:async()=>{}})};
  const result=await new ComputerUseCapability(new ComputerProviderRegistry().register(provider)).execute({taskId:'run',requestedOutcome:'Open dialog',target:{machine:'local',application:'Editor',window:'root'},steps:[{operation:'pressKey',key:'save',expectedTransition:{type:'CHILD_DIALOG'}}],checks:[{kind:'title',value:'Save'}]});assert.equal(result.status,'COMPLETE');assert.equal(result.transitions?.[0]?.successor?.key,'dialog');assert.ok(result.events.some(e=>e.phase==='REACQUIRE'));
});
