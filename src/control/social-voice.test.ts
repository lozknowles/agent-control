import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {SocialVoiceCoordinator, spokenJobSummary, type SocialExecutionPort} from './social-voice.js';
import {validateAudio,validateVoice,type SocialChannelProvider,type SocialMessage,type VoiceIdentity,type SpeechProvider,type SpeechRecognitionProvider} from './social-voice-providers.js';
const voice:VoiceIdentity={id:'test',kind:'designed',provider:'test',modelRevision:'immutable',instruction:'synthetic voice',seed:1};
function setup(t:test.TestContext){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'social-voice-'));const file=path.join(root,'state.sqlite');let clock=1000000,allowed=true,failSend=false,failSpeech=false,transcription='status',snapshot='fixed-action';
  const messages:string[]=[],audio:string[]=[],parcels=new Map<string,{id:string;status:string}>();let decisions=0;
  const identity={channel:'fixture',account:'account',sender:'alice',conversation:'alice'};
  const wav=Buffer.alloc(44);wav.write('RIFF');wav.write('WAVE',8);
  const provider:SocialChannelProvider={id:'fixture',capabilities:()=>({text:true,audio:true,artifacts:false,approvals:true}),health:async()=>({state:'ready',checkedAt:new Date().toISOString()}),receive:x=>x as SocialMessage,
    send:async(_i,text,key)=>{if(failSend)throw new Error('offline');if(!messages.includes(key+'|'+text))messages.push(key+'|'+text);return {state:'queued',id:key};},
    sendStatus:async(i,text,key)=>provider.send(i,text,key),sendApprovalRequest:async(i,text,key)=>provider.send(i,text,key),sendArtifact:async(_i,_a,_m,key)=>{audio.push(key);return {state:'submitted',id:key};},downloadAudio:async()=>({bytes:wav,mime:'audio/wav'})};
  const port:SocialExecutionPort={principal:i=>allowed&&i.sender==='alice'?{actor:'operator',templates:['test'],approve:true}:undefined,start:(_t,_a,key)=>{if(!parcels.has(key))parcels.set(key,{id:'parcel-'+key,status:'QUEUED'});return parcels.get(key)!;},observe:id=>{const p=[...parcels.values()].find(p=>p.id===id)!;return {status:p.status,text:'Bounded test '+p.status};},stop:id=>{[...parcels.values()].find(p=>p.id===id)!.status='CANCELLED';},overview:()=> 'No active jobs.',approvalSnapshot:()=>snapshot,decide:()=>{decisions++;}};
  const metrics={provider:'fixture',host:'test',model:'fixture',elapsedMs:1,audioSeconds:1,rtf:0.001,firstAudioMs:1,memoryBytes:null};
  const speech:SpeechProvider={id:'fixture',capabilities:()=>({synthesize:true,design:true,clone:false,streaming:false}),health:provider.health,voices:async()=>[voice],synthesize:async()=>{if(failSpeech)throw new Error('GPU unavailable');return {bytes:wav,mime:'audio/wav',metrics};}};
  const recognition:SpeechRecognitionProvider={id:'fixture',capabilities:()=>({transcribe:true,languages:['en']}),health:provider.health,transcribe:async()=>({text:transcription,confidence:null,metrics})};
  let coordinator=new SocialVoiceCoordinator(file,provider,port,speech,recognition,voice,()=>clock);
  t.after(()=>{coordinator.close();fs.rmSync(root,{recursive:true,force:true});});
  const receive=(text:string,id=text,kind:'text'|'audio'='text')=>coordinator.accept({identity,id,kind,text,mediaId:kind==='audio'?id:undefined,receivedAt:clock});
  return {get c(){return coordinator;},receive,identity,messages,audio,parcels,get decisions(){return decisions;},reopen(){coordinator.close();coordinator=new SocialVoiceCoordinator(file,provider,port,speech,recognition,voice,()=>clock);},advance(ms:number){clock+=ms;},revoke(){allowed=false;},failSend(v:boolean){failSend=v;},failSpeech(){failSpeech=true;},transcribe(s:string){transcription=s;},changeAction(){snapshot='changed';}};
}
test('durable intake and restart create exactly one parcel and completion is retained',async t=>{const s=setup(t);s.receive('start test voice','one');s.reopen();await s.c.tick();assert.equal(s.parcels.size,1);assert.equal(s.receive('start test voice','one').duplicate,true);for(const p of s.parcels.values())p.status='SUCCEEDED';await s.c.tick();assert.equal(s.audio.length,1);s.reopen();await s.c.tick();assert.equal(s.audio.length,1);assert.match(s.c.transcript(),/policy.allowed/);assert.match(s.c.transcript(),/speech.synthesized/);});
test('unauthorized identities, stale input and ambiguous commands never create parcels',async t=>{const s=setup(t);assert.throws(()=>s.c.accept({identity:{...s.identity,sender:'other'},id:'bad',receivedAt:1000000,kind:'text',text:'start test'}));assert.throws(()=>s.c.accept({identity:s.identity,id:'stale',receivedAt:0,kind:'text',text:'start test'}));s.receive('start test; delete files');await s.c.tick();assert.equal(s.parcels.size,0);assert.match(s.c.transcript(),/policy.denied/);});
test('voice transcription cannot stop or launch work; read-only status is permitted',async t=>{const s=setup(t);s.transcribe('start test');s.receive('audio','a','audio');await s.c.tick();assert.equal(s.parcels.size,0);assert.match(s.messages.join('\n'),/No action was executed/);s.transcribe('status');s.receive('audio','b','audio');await s.c.tick();assert.match(s.messages.join('\n'),/No active jobs/);});
test('revocation after durable intake is checked again before execution',async t=>{const s=setup(t);s.receive('start test');s.revoke();await s.c.tick();assert.equal(s.parcels.size,0);assert.equal(s.messages.length,0);});
test('speech failure retains text and never retries an uncertain voice send',async t=>{const s=setup(t);s.receive('start test voice');await s.c.tick();s.failSpeech();for(const p of s.parcels.values())p.status='SUCCEEDED';await s.c.tick();assert.match(s.messages.join('\n'),/SUCCEEDED/);assert.equal(s.audio.length,0);assert.match(s.c.transcript(),/speech.text_fallback/);});
test('messaging failure does not duplicate execution and resumes from durable state',async t=>{const s=setup(t);s.receive('start test');s.failSend(true);await assert.rejects(()=>s.c.tick());assert.equal(s.parcels.size,1);s.failSend(false);await s.c.tick();assert.equal(s.parcels.size,1);});
test('approvals bind identity action parcel timestamp and are one-shot',async t=>{const s=setup(t);s.receive('start test');await s.c.tick();const p=[...s.parcels.values()][0]!;const a=await s.c.requestApproval(s.identity,p.id,'run','approved-action');s.receive('APPROVE '+a.number,'approval');await s.c.tick();assert.equal(s.decisions,1);s.receive('APPROVE '+a.number,'second-message');await s.c.tick();assert.equal(s.decisions,1);assert.match(s.c.transcript(),/approval.transition/);});
test('changed and expired approval snapshots fail closed',async t=>{const s=setup(t);s.receive('start test');await s.c.tick();const p=[...s.parcels.values()][0]!;const a=await s.c.requestApproval(s.identity,p.id,'run','action');s.changeAction();s.receive('approve '+a.number,'a');await s.c.tick();assert.equal(s.decisions,0);const b=await s.c.requestApproval(s.identity,p.id,'run','action',1);s.advance(2);s.receive('approve '+b.number,'b');await s.c.tick();assert.equal(s.decisions,0);});
test('audio signature and voice provenance reject arbitrary attachments and silent cloning',()=>{assert.throws(()=>validateAudio(Buffer.from('<html>not audio</html>'),'audio/wav'));assert.throws(()=>validateVoice({...voice,kind:'cloned'}));assert.doesNotThrow(()=>validateVoice(voice));});
test('channel identity cannot be confused with a group or another account operator',t=>{const s=setup(t);assert.throws(()=>s.c.accept({identity:{...s.identity,conversation:'group'},id:'group',receivedAt:1000000,kind:'text',text:'start test'}));assert.throws(()=>s.c.accept({identity:{...s.identity,channel:'wrong'},id:'wrong',receivedAt:1000000,kind:'text',text:'start test'}));});

test('spoken summaries use only the short job reference, outcome and duration',()=>{
 const result={status:'FAILED',durationMs:22000,text:'secret internal diagnostics https://private.invalid',runId:'run-hex',model:'internal-model'};
 assert.equal(spokenJobSummary(1,result),'Job 1 failed in 22 seconds. The detailed report is available in the dashboard.');
 assert.match(spokenJobSummary(2,{status:'SUCCEEDED'}),/completed successfully/);
 assert.doesNotMatch(spokenJobSummary(1,result),/secret|https|hex|internal-model/);
});
