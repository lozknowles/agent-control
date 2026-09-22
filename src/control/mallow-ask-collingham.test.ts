import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {JobCatalog} from './job-catalog.js';
import {ActionRegistry,ArtifactStore,JobRuntime,ResourceLockManager,RunLedger,WorkerRegistry} from './job-runtime.js';
import {ASK_COLLINGHAM_JOB,AskCollinghamClient,registerAskCollinghamJob} from './mallow-ask-collingham.js';

const stack={conversationProvider:'AnythingLLM',model:'Qwen2.5-3B Q4_K_M',runtime:'llama.cpp',retrieval:'LanceDB',qualificationReference:'ask-collingham:real-stack'};
const stream=(parts:string[])=>new ReadableStream<Uint8Array>({start(controller){for(const part of parts)controller.enqueue(Buffer.from(part));controller.close();}});

test('Ask Collingham adapter assembles split SSE and keeps terminal status from erasing text',async()=>{
  const request:typeof fetch=async()=>new Response(stream([
    'data: {"type":"textResponseChunk","textResponse":"Station "}\n',
    'data: {"type":"textResponseChunk","textResponse":"Road is closed."}\n',
    'data: {"type":"statusResponse","close":true}\n',
  ]),{status:200,headers:{'content-type':'text/event-stream'}});
  const client=new AskCollinghamClient({baseUrl:'http://127.0.0.1:18127',streamPath:'/api/ask-collingham/embed/abcdefgh/stream-chat',stack,request});
  const answer=await client.query('When is Station Road closed?','session_12345678');
  assert.equal(answer.answer,'Station Road is closed.');assert.equal(answer.stack.retrieval,'LanceDB');assert.deepEqual(answer.observations.map(x=>x.type),['ask_collingham.request.started','ask_collingham.response.first_event','ask_collingham.response.validated']);
});

test('Ask Collingham endpoint is loopback-only and missing text fails closed',async()=>{
  assert.throws(()=>new AskCollinghamClient({baseUrl:'https://example.com',streamPath:'/api/ask-collingham/embed/abcdefgh/stream-chat',stack}),/loopback_required/);
  const client=new AskCollinghamClient({baseUrl:'http://127.0.0.1:18127',streamPath:'/api/ask-collingham/embed/abcdefgh/stream-chat',stack,request:async()=>new Response('data: {"type":"statusResponse","close":true}\n',{status:200})});
  await assert.rejects(client.query('Question?','session_12345678'),/no_deliverable_answer/);
});

test('real Ask Collingham action is dispatched by JobRuntime and retains provenance',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-ask-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const request:typeof fetch=async()=>new Response('data: {"type":"textResponse","textResponse":"A retained real-stack answer.","close":true,"answerId":"answer-1"}\n',{status:200});
  const actions=new ActionRegistry(),catalog=new JobCatalog(new Set(['mallow.ask-collingham@1.0.0']));
  const client=new AskCollinghamClient({baseUrl:'http://127.0.0.1:18127',streamPath:'/api/ask-collingham/embed/abcdefgh/stream-chat',stack,request});registerAskCollinghamJob(actions,catalog,client);
  const workers=new WorkerRegistry();workers.registerControllerInternal({id:'ask-worker',capabilities:['collingham.query'],health:'healthy',capacity:1,active:0,observedAt:new Date().toISOString()});
  const runtime=new JobRuntime(catalog,actions,workers,new RunLedger(path.join(root,'ledger.json')),new ArtifactStore(path.join(root,'artifacts')),new ResourceLockManager(path.join(root,'locks.json')));
  const run=runtime.createRun(ASK_COLLINGHAM_JOB,{question:'What is happening?',sessionId:'session_12345678'},{type:'manual',actor:'mallow:test'});const dispatched=runtime.dispatch();assert.equal(dispatched?.runId,run.id);await dispatched?.completion;
  const complete=runtime.ledger.get(run.id)!;assert.equal(complete.status,'SUCCEEDED');assert.equal(complete.selectedWorkers[0],'ask-worker');assert.equal(complete.trigger.actor,'mallow:test');
  const value=runtime.artifacts.read(complete.artifacts[0]!) as any;assert.equal(value.answer,'A retained real-stack answer.');assert.equal(value.stack.model,'Qwen2.5-3B Q4_K_M');
});
