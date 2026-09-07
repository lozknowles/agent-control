import test from 'node:test';
import assert from 'node:assert/strict';
import {ConversationalWorkIntent} from './conversational-work.js';

const input=(text:string,sessionId='voice-1')=>({sessionId,actor:'operator',user:'Approved operator',audioReference:'call-1',rawStt:text,turns:[{role:'user' as const,text}],signal:new AbortController().signal});

test('coding intent is captured verbatim and clarified without creating or running work',async()=>{
  const work=new ConversationalWorkIntent(),raw='Can you write a Python script?';
  const result=await work.handle(input(raw));
  assert.equal(result?.kind,'clarification');
  assert.equal(result?.detail.originalRequest,raw);
  assert.equal(result?.detail.workParcelCreated,false);
  assert.match(result?.text??'',/What should the script do/);
});

test('ordinary conversation is not converted into work',async()=>{
  assert.equal(await new ConversationalWorkIntent().handle(input('Do you know Collingham?')),undefined);
});

test('pre-parcel cancellation is bound to the captured proposal and starts no job',async()=>{
  const work=new ConversationalWorkIntent();await work.handle(input('Write a Python script.'));
  const result=await work.handle(input('Cancel that.'));
  assert.equal(result?.kind,'cancellation');assert.equal(result?.detail.workParcelCreated,false);assert.match(result?.text??'',/No job was started/);
});

test('status with no linked job reports the absence instead of inventing progress',async()=>{
  const result=await new ConversationalWorkIntent().handle(input("How's that getting on?"));
  assert.equal(result?.kind,'status');assert.deepEqual(result?.detail.resolvedJobs,[]);
});

test('bounded duplicate-report request creates linked governed work and supports status and steering',async()=>{
  const calls:{start?:any;steer?:any}={},port={async start(value:any){calls.start=value;return{id:'parcel-voice-1234567890',status:'QUEUED',workModel:'coding-8b',routeReason:'qualified coding route'};},async status(){return{status:'RUNNING',phase:'tests running'};},async steer(id:string,instruction:string,actor:string){calls.steer={id,instruction,actor};return{status:'RUNNING'};},async cancel(){return{status:'CANCELLING'};}},work=new ConversationalWorkIntent(port,()=>new Date('2026-09-06T12:00:00Z'));
  const started=await work.handle(input('Write me a Python script that creates a report showing duplicate files in a test directory.'));assert.equal(started?.kind,'proposal');assert.equal(started?.detail.workParcelId,'parcel-voice-1234567890');assert.equal(calls.start.origin.rawStt,'Write me a Python script that creates a report showing duplicate files in a test directory.');assert.equal(calls.start.origin.audio.reference,'call-1');
  const status=await work.handle(input("How's that getting on?"));assert.equal(status?.kind,'status');assert.match(status?.text??'',/running.*tests running/i);
  const steered=await work.handle(input('Also make the report available as CSV.'));assert.equal(steered?.kind,'steering');assert.equal(calls.steer.instruction,'Also make the report available as CSV.');
});

test('terminal work produces one concise automatic completion notification',async()=>{const port={async start(){return{id:'parcel-voice-abcdef12',status:'QUEUED',workModel:'coding',routeReason:'qualified'};},async status(){return{status:'SUCCEEDED',summary:'verified'};},async steer(){return{status:'RUNNING'};},async cancel(){return{status:'CANCELLED'};}},work=new ConversationalWorkIntent(port,()=>new Date('2026-09-06T12:00:00Z'));await work.handle(input('Write a Python script that creates a report showing duplicate files in a test directory.'));const notice=await work.nextNotification('voice-1');assert.equal(notice?.detail.automaticCompletionNotification,true);assert.match(notice?.text??'',/finished.*passed.*no real files/i);assert.equal(await work.nextNotification('voice-1'),undefined);});
