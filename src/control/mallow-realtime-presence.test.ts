import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {once} from 'node:events';
import {JobCatalog} from './job-catalog.js';
import {ActionRegistry,ArtifactStore,JobRuntime,ResourceLockManager,RunLedger,WorkerRegistry} from './job-runtime.js';
import {AgentControlBackgroundJobPort} from './mallow-job-port.js';
import {startWebDashboard} from './web-server.js';
import {GovernedSpeechCache} from './mallow-speech-cache.js';
import {MallowPresenceStore,MallowRealtimePresenceRuntime,type BackgroundJobReference,type FastRoute,type GovernedBackgroundPort,type RealtimeConversationProvider,type RealtimeSpeechProvider} from './mallow-realtime-presence.js';

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check:()=>boolean,timeout=1000){const end=Date.now()+timeout;while(!check()){if(Date.now()>end)throw Error('test_wait_timeout');await sleep(5);}}

class Jobs implements GovernedBackgroundPort{
  jobs=new Map<string,BackgroundJobReference>();cancelled:string[]=[];sequence=0;
  async start(input:{route:FastRoute}){const job:BackgroundJobReference={jobId:`job-${++this.sequence}`,laneId:'lane-research',worker:'worker-governed',model:null,skill:input.route.skill??'research',tool:'governed.lookup',status:'RUNNING',createdAt:new Date().toISOString(),startedAt:new Date().toISOString(),progress:'collecting evidence'};this.jobs.set(job.jobId,job);return structuredClone(job);}
  async status(id:string){const job=this.jobs.get(id);if(!job)throw Error('missing');return structuredClone(job);}
  async cancel(id:string,reason:string){this.cancelled.push(`${id}:${reason}`);const job=this.jobs.get(id)!;job.status='CANCELLED';job.endedAt=new Date().toISOString();return structuredClone(job);}
  update(id:string,values:Partial<BackgroundJobReference>){Object.assign(this.jobs.get(id)!,values);}
}

class Speech implements RealtimeSpeechProvider{
  id='test-speech';voice={id:'mallow-test',model:'deterministic',version:'1'};mode='synthetic-test' as const;calls:string[]=[];cancelled:number[]=[];
  constructor(private delay=4,private fail=false){}
  async *frames(text:string,signal:AbortSignal){this.calls.push(text);for(const word of text.split(' ')){await sleep(this.delay);signal.throwIfAborted();if(this.fail)throw Error('speech unavailable');yield{bytes:Buffer.from(word),durationMs:20};}}
  cancel(generation:number){this.cancelled.push(generation);}
}

const conversation:RealtimeConversationProvider={id:'test-conversation',respond:async({text,signal})=>{await sleep(2);signal.throwIfAborted();return{text:`Answer: ${text}`,provider:'fixture',model:'fixture-model',usage:{input:4,cachedInput:1,output:3}};}};
function fixture(speech=new Speech()){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mallow-presence-')),store=new MallowPresenceStore(path.join(root,'events.jsonl')),jobs=new Jobs();
  const router={id:'deterministic-router',route:({text,activeJobs}:{text:string;activeJobs:BackgroundJobReference[]}):FastRoute=>text.includes('progress')?{kind:'progress',intent:'progress',reason:'explicit progress question'}:text.includes('work')||text.includes('correct')?{kind:'background',intent:'research',skill:'research',acknowledgement:'I will check that.',jobRequest:{query:text},supersedesJobId:text.includes('correct')?activeJobs[0]?.jobId:undefined,reason:'bounded research requires governed work'}:{kind:'direct',intent:'conversation',reason:'no governed work required'}};
  const runtime=new MallowRealtimePresenceRuntime({store,router,conversation,speech,background:jobs,monitorMs:5});return{root,store,jobs,speech,runtime};
}

test('durable events preserve conversation and background lanes with completion handover',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-a');
  await s.runtime.transcript(id,'please do background work');const job=[...s.jobs.jobs.values()][0]!;
  await s.runtime.transcript(id,'what is the progress');assert.ok(s.speech.calls.some(text=>text.includes('collecting evidence')));
  s.jobs.update(job.jobId,{status:'COMPLETED',progress:'complete',result:'The evidence is ready.',endedAt:new Date().toISOString(),evidenceReference:'artifact-1'});
  await until(()=>s.store.list(id).some(event=>event.type==='agent.job.completed'));
  await until(()=>s.store.list(id).some(event=>event.type==='speech.tts.completed'&&event.detail.segment==='job-result'));
  const events=s.store.list(id);assert.equal(events[0]?.type,'voice.session.started');assert.ok(events.some(event=>event.type==='voice.intent.detected'));assert.ok(events.some(event=>event.type==='agent.job.created'));assert.ok(events.some(event=>event.type==='agent.job.progress'));assert.ok(events.some(event=>event.type==='agent.job.completed'));assert.ok(events.some(event=>event.type==='speech.tts.first_audio'));
  assert.equal(s.store.projection().sessions[0]?.state,'LISTENING');assert.equal(s.store.projection().sessions[0]?.jobs[0]?.state,'COMPLETED');
});

test('barge-in aborts active speech and records runtime suppression latency',async t=>{
  const s=fixture(new Speech(25));t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-b');
  const first=s.runtime.transcript(id,'give me a deliberately long answer');await until(()=>s.store.list(id).some(event=>event.type==='speech.tts.first_audio'));
  await s.runtime.transcript(id,'short replacement');await first;
  const interruption=s.store.list(id).find(event=>event.type==='voice.response.interrupted'&&event.detail.reason==='user_barge_in');assert.ok(interruption);assert.equal(interruption.detail.measurement,'runtime output suppression; acoustic device stop not observed');assert.ok(s.speech.cancelled.length>=1);
});

test('corrected work cancels the old job and fences its late result',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-c');await s.runtime.transcript(id,'background work one');const old=[...s.jobs.jobs.values()][0]!;
  await s.runtime.transcript(id,'correct background work');const replacement=[...s.jobs.jobs.values()][1]!;assert.match(s.jobs.cancelled[0]??'',new RegExp(`^${old.jobId}:`));
  s.jobs.update(old.jobId,{status:'COMPLETED',result:'STALE RESULT MUST NOT SPEAK'});s.jobs.update(replacement.jobId,{status:'COMPLETED',result:'Current result',evidenceReference:'artifact-current'});
  await until(()=>s.speech.calls.includes('Current result'));await sleep(20);assert.equal(s.speech.calls.includes('STALE RESULT MUST NOT SPEAK'),false);
  assert.ok(s.store.list(id).some(event=>event.type==='agent.job.completed'&&event.jobId===old.jobId&&event.detail.stale===true));
});

test('speech failure is visible and conversation returns to listening',async t=>{
  const s=fixture(new Speech(1,true));t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-d');await s.runtime.transcript(id,'hello');
  const events=s.store.list(id);assert.ok(events.some(event=>event.type==='speech.tts.cancelled'&&event.detail.reason==='speech_provider_failure'));assert.equal(s.store.projection().sessions[0]?.state,'LISTENING');
});

test('input and conversation provider failures remain visible without closing the session',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-input-failure');
  await s.runtime.attachInput(id,{id:'failing-stt',mode:'streaming',async *events(){throw Error('stt offline');}});assert.ok(s.store.list(id).some(event=>event.type==='voice.input.failed'&&event.detail.provider==='failing-stt'));
  const failedConversation:RealtimeConversationProvider={id:'failed-conversation',respond:async()=>{throw Error('model unavailable');}},runtime=new MallowRealtimePresenceRuntime({store:s.store,router:{id:'direct',route:()=>({kind:'direct',intent:'chat',reason:'test'})},conversation:failedConversation,speech:s.speech,background:s.jobs});const second=runtime.start('session-conversation-failure');await runtime.transcript(second,'hello');assert.ok(s.speech.calls.includes('I could not complete that response.'));assert.equal(s.store.projection().sessions.find(item=>item.id===second)?.state,'LISTENING');
});

test('a failed background job is reported while later conversation continues',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-job-failure');await s.runtime.transcript(id,'background work');const job=[...s.jobs.jobs.values()][0]!;s.jobs.update(job.jobId,{status:'FAILED',progress:'provider unavailable',endedAt:new Date().toISOString()});await until(()=>s.store.list(id).some(event=>event.type==='agent.job.failed'));await until(()=>s.speech.calls.some(text=>text.includes('failed')));await s.runtime.transcript(id,'hello again');assert.ok(s.speech.calls.includes('Answer: hello again'));
});

test('session cleanup aborts the attached input and suppresses later events',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));const id=s.runtime.start('session-cleanup');let stopped=false;const attached=s.runtime.attachInput(id,{id:'held-input',mode:'streaming',async *events(signal){try{while(!signal.aborted){await sleep(5);yield{type:'transcript_partial' as const,text:'still listening'};}}finally{stopped=true;}}});await sleep(15);await s.runtime.close(id);await attached;assert.equal(stopped,true);const count=s.store.list(id).length;await sleep(15);assert.equal(s.store.list(id).length,count);
});

test('governed speech cache streams a miss, reuses a hit, and invalidates on voice version',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mallow-cache-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const source=new Speech(0),phrase='I will check that.';
  const collect=async(provider:RealtimeSpeechProvider)=>{const frames=[];for await(const frame of provider.frames(phrase,new AbortController().signal))frames.push(Buffer.from(frame.bytes).toString());return frames;};
  const first=new GovernedSpeechCache(source,root,[phrase]);assert.deepEqual(await collect(first),['I','will','check','that.']);assert.equal(source.calls.length,1);assert.deepEqual(await collect(first),['I','will','check','that.']);assert.equal(source.calls.length,1);
  const changed=new Speech(0);changed.voice.version='2';assert.deepEqual(await collect(new GovernedSpeechCache(changed,root,[phrase])),['I','will','check','that.']);assert.equal(changed.calls.length,1);
});

test('event store redacts credentials and resumes monotonically after restart',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mallow-store-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'events.jsonl'),one=new MallowPresenceStore(file),first=fixture();
  one.append({schema:'agent-control.mallow-realtime-event/v1',id:'evt-1',sequence:41,at:new Date().toISOString(),sessionId:'prior',type:'voice.transcript.final',state:'UNDERSTANDING',detail:{text:'api_key=secret-value-12345'}});assert.doesNotMatch(fs.readFileSync(file,'utf8'),/secret-value/);
  const runtime=new MallowRealtimePresenceRuntime({store:new MallowPresenceStore(file),router:{id:'direct',route:()=>({kind:'direct',intent:'chat',reason:'test'})},conversation,speech:first.speech,background:first.jobs});runtime.start('next');assert.deepEqual(new MallowPresenceStore(file).list().slice(-2).map(event=>event.sequence),[42,43]);fs.rmSync(first.root,{recursive:true,force:true});
});

test('background port creates and observes a genuine governed Agent Control job',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mallow-native-job-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const actions=new ActionRegistry();actions.registerReadOnly('mallow.research@1.0.0',async()=>{await sleep(20);return{artifacts:[{name:'answer',value:{summary:'governed result'}}],verification:['result-retained']};});
  const catalog=new JobCatalog(actions.ids());catalog.addJob({apiVersion:'agent-control/v1',kind:'Job',metadata:{id:'mallow-research',name:'Mallow research',version:'1.0.0'},spec:{priority:'normal',concurrency:'allow',parameters:{query:{type:'string',required:true}},steps:[{id:'research',action:'mallow.research@1.0.0',requires:['mallow.research'],outputs:[{name:'answer',type:'application/json',schema:'mallow/answer',version:'1.0.0'}],verification:['result-retained']}]}});
  const workers=new WorkerRegistry();workers.registerControllerInternal({id:'controller',capabilities:['mallow.research'],health:'healthy',capacity:1,active:0,observedAt:new Date().toISOString()});
  const runtime=new JobRuntime(catalog,actions,workers,new RunLedger(path.join(root,'ledger.json')),new ArtifactStore(path.join(root,'artifacts')),new ResourceLockManager(path.join(root,'locks.json')));
  const port=new AgentControlBackgroundJobPort(runtime,()=>({job:'mallow-research@1.0.0',parameters:{query:'bounded evidence'},laneId:'research',skill:'research',tool:'mallow.research'}));
  const created=await port.start({sessionId:'native',turnId:'turn-1',route:{kind:'background',intent:'research',reason:'test'},text:'research this'});assert.match(created.jobId,/^run-/);assert.equal(created.worker,'controller');
  for(let i=0;i<100&&(await port.status(created.jobId)).status!=='COMPLETED';i++)await sleep(5);
  const completed=await port.status(created.jobId);assert.equal(completed.status,'COMPLETED');assert.match(completed.evidenceReference??'',/^artifact-/);assert.equal(runtime.ledger.get(created.jobId)?.trigger.actor,'mallow:native');
});

test('presence projection and page use the existing authenticated dashboard boundary',async t=>{
  const s=fixture();t.after(()=>fs.rmSync(s.root,{recursive:true,force:true}));s.runtime.start('session-web');
  const server=startWebDashboard({} as never,{host:'127.0.0.1',port:0,operatorToken:'operator-test-token',assetsDir:path.resolve('assets/dashboard'),mallowPresence:s.store});t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));if(!server.listening)await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error('web_test_address_missing');const base=`http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${base}/api/mallow/presence`)).status,401);const response=await fetch(`${base}/api/mallow/presence`,{headers:{Authorization:'Bearer operator-test-token'}});assert.equal(response.status,200);assert.equal((await response.json()).schema,'agent-control.mallow-realtime-presence/v1');const page=await fetch(`${base}/mallow-presence.html`);assert.equal(page.status,200);assert.match(await page.text(),/Mallow realtime/);
});
