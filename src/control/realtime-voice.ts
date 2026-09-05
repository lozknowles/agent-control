import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import type {SocialIdentity, VoiceIdentity} from './social-voice-providers.js';
import {validateVoice} from './social-voice-providers.js';

export interface VoiceFrame {sequence:number; pcm:Int16Array; sampleRate:16000;}
export interface VoiceCaller {identity:SocialIdentity; display:string;}
export interface VoiceGrant {actor:string; tools:readonly string[];}
/** Implementations authenticate signaling, bind its observed caller, and own codec, RTP jitter/AEC and playout. */
export interface RealtimeVoiceTransport {
  id:string;
  capabilities:{duplex:boolean; interrupt:boolean; isolatedCallerAudio:boolean; reconnect:boolean};
  accept(callId:string,signal:AbortSignal):Promise<void>;
  reject(callId:string):Promise<void>;
  sendAudio(callId:string,frame:VoiceFrame,generation:number,signal:AbortSignal):Promise<{audibleAt?:number}>;
  interruptOutput(callId:string,generation:number,signal:AbortSignal):Promise<{suppressedAt?:number}>;
  hangup(callId:string,reason:string,signal:AbortSignal):Promise<void>;
  health():Promise<{state:'ready'|'unavailable'|'degraded';reason?:string}>;
}
export interface VoiceRecognition {
  id:string;
  mode:'utterance-buffered';
  transcribe(pcm:Int16Array,signal:AbortSignal):Promise<string>;
}
export interface IncrementalVoiceSpeech {
  id:string;
  mode:'native-streaming'|'buffered-then-framed';
  frames(text:string,voice:VoiceIdentity,signal:AbortSignal):AsyncIterable<Int16Array>;
}
export interface VoiceUsage {inputTokens?:number;outputTokens?:number;cachedInputTokens?:number;modelCost?:number;sttCost?:number;ttsCost?:number;}
export interface VoiceTurn {role:'user'|'assistant';text:string;interrupted?:boolean;}
/** This port must delegate to Agent Control routing/tool policy; a speech or transport provider cannot supply it. */
export interface VoiceOrchestration {
  respond(input:{sessionId:string;actor:string;turns:readonly VoiceTurn[];signal:AbortSignal;tool:(name:string,input:unknown)=>Promise<string>}):Promise<{text:string;model:string;routeReason:string;usage?:VoiceUsage}>;
  invokeTool(input:{sessionId:string;actor:string;name:string;input:unknown;requestKey:string;signal:AbortSignal}):Promise<string>;
}
type Event={at:number;type:string;detail:Record<string,unknown>};
export class VoiceSessionStore {
  readonly db:DatabaseSync;
  constructor(file:string){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.db=new DatabaseSync(file);fs.chmodSync(file,0o600);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS voice_sessions(id TEXT PRIMARY KEY,callKey TEXT UNIQUE,state TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS voice_events(id INTEGER PRIMARY KEY,session TEXT NOT NULL,at INTEGER NOT NULL,type TEXT NOT NULL,detail TEXT NOT NULL)");
    // An uncertain media connection is never silently resumed or replayed after process loss.
    for(const r of this.db.prepare("SELECT id FROM voice_sessions WHERE state='LIVE'").all() as {id:string}[]){this.event(r.id,'CALL ENDED',{reason:'controller_restart_media_unconfirmed'});this.db.prepare("UPDATE voice_sessions SET state='ENDED' WHERE id=?").run(r.id);}
  }
  create(callKey:string,data:Record<string,unknown>){const id=randomUUID();this.db.prepare('INSERT INTO voice_sessions VALUES (?,?,?,?)').run(id,callKey,'LIVE',JSON.stringify(data));return id;}
  find(callKey:string){return this.db.prepare('SELECT id,state FROM voice_sessions WHERE callKey=?').get(callKey) as {id:string;state:string}|undefined;}
  capacity(callerHash:string){const rows=this.db.prepare("SELECT data FROM voice_sessions WHERE state='LIVE'").all() as {data:string}[];return rows.length<2&&!rows.some(r=>JSON.parse(r.data).callerHash===callerHash);}
  event(session:string,type:string,detail:Record<string,unknown>,at=Date.now()){this.db.prepare('INSERT INTO voice_events(session,at,type,detail) VALUES (?,?,?,?)').run(session,at,type,JSON.stringify(detail));}
  end(id:string){this.db.prepare("UPDATE voice_sessions SET state='ENDED' WHERE id=?").run(id);}
  events(id:string):Event[]{return (this.db.prepare('SELECT at,type,detail FROM voice_events WHERE session=? ORDER BY id').all(id) as {at:number;type:string;detail:string}[]).map(e=>({...e,detail:JSON.parse(e.detail)}));}
  projection(){return (this.db.prepare('SELECT id,state,data FROM voice_sessions ORDER BY rowid DESC LIMIT 100').all() as {id:string;state:string;data:string}[]).map(r=>({...r,data:JSON.parse(r.data),events:this.events(r.id)}));}
  transcript(id:string){
    const events=this.events(id),latencies=events.filter(e=>e.type==='TTS FIRST AUDIO').map(e=>e.detail.endOfUtteranceToAudibleMs).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)).sort((a,b)=>a-b);
    const usages=events.filter(e=>e.type==='MODEL').map(e=>e.detail.usage as Record<string,number|null>),sum=(k:string)=>usages.length&&usages.every(u=>typeof u?.[k]==='number')?usages.reduce((n,u)=>n+u[k]!,0):'unavailable';
    const summary={turns:events.filter(e=>e.type==='TURN COMPLETED').length,interruptions:events.filter(e=>e.type==='INTERRUPTION').length,modelChanges:events.filter(e=>e.type==='MODEL HANDOFF').length,tools:events.filter(e=>e.type==='TOOL REQUEST').length,failures:events.filter(e=>e.type==='TURN FAILED').length,durationMs:events.slice().reverse().find(e=>e.type==='CALL ENDED')?.detail.durationMs??'unavailable',inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),cachedInputTokens:sum('cachedInputTokens'),modelCost:sum('modelCost'),sttCost:sum('sttCost'),ttsCost:sum('ttsCost'),averageResponseMs:latencies.length?latencies.reduce((a,b)=>a+b,0)/latencies.length:'unavailable',p50ResponseMs:latencies.length>=20?latencies[Math.ceil(latencies.length*.5)-1]:'insufficient observations',p95ResponseMs:latencies.length>=20?latencies[Math.ceil(latencies.length*.95)-1]:'insufficient observations'};
    return events.map(e=>`${new Date(e.at).toISOString()} ${e.type}\n${Object.entries(e.detail).map(([k,v])=>`${k}: ${typeof v==='string'?v:JSON.stringify(v)}`).join('\n')}`).join('\n\n')+'\n\nSESSION SUMMARY\n'+JSON.stringify(summary,null,2);
  }
  close(){this.db.close();}
}
export interface VoiceSessionOptions {
  store:VoiceSessionStore;transport:RealtimeVoiceTransport;recognition:VoiceRecognition;speech:IncrementalVoiceSpeech;orchestration:VoiceOrchestration;voice:VoiceIdentity;
  authorize:(caller:VoiceCaller)=>VoiceGrant|undefined;
  clock?:()=>number; stageTimeoutMs?:number;
}
const key=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Experimental mono 16 kHz/20 ms PCM pipeline. Energy VAD is not an acoustic echo canceller. */
export class RealtimeVoiceSession {
  readonly id:string;readonly caller:VoiceCaller;
  private life=new AbortController();private turn?:AbortController;private epoch=0;private speaking=false;private processing=false;private ended=false;
  private suppression?:Promise<void>;private readonly actor:string;
  private sequence=-1;private voiced=0;private silence=0;private utterance:Int16Array[]=[];private turns:VoiceTurn[]=[];private model?:string;private utteranceEndedAt?:number;
  private readonly now:()=>number;private readonly started:number;private readonly timer:ReturnType<typeof setTimeout>;
  private constructor(private options:VoiceSessionOptions,private callId:string,caller:VoiceCaller){
    this.caller=structuredClone(caller);this.now=options.clock??Date.now;this.started=this.now();
    this.options={...options,voice:structuredClone(options.voice)};this.actor=options.authorize(caller)!.actor;
    this.id=options.store.create(key([options.transport.id,caller.identity.account,callId]),{display:caller.display,callerHash:key(caller.identity),transport:options.transport.id,voice:options.voice.id,stt:options.recognition.id,tts:options.speech.id,recognitionMode:options.recognition.mode,speechMode:options.speech.mode});
    this.timer=setTimeout(()=>void this.end('session_deadline'),600000);this.timer.unref();
  }
  static async incoming(options:VoiceSessionOptions,callId:string,caller:VoiceCaller){
    validateVoice(options.voice);
    if(!callId||callId.length>256||caller.identity.channel!==options.transport.id||Object.values(caller.identity).some(v=>typeof v!=='string'||!v||v.length>256)||!caller.display||caller.display.length>80||!options.authorize(caller)||!options.transport.capabilities.duplex||!options.transport.capabilities.interrupt||!options.transport.capabilities.isolatedCallerAudio){await options.transport.reject(callId);throw new Error('voice_call_not_authorized_or_capable');}
    const existing=options.store.find(key([options.transport.id,caller.identity.account,callId]));if(existing)return {duplicate:true as const,id:existing.id};
    if(!options.store.capacity(key(caller.identity))){await options.transport.reject(callId);throw new Error('voice_capacity_exhausted');}
    const session=new RealtimeVoiceSession(options,callId,caller);
    try{await session.bounded(s=>options.transport.accept(callId,s));session.audit('CALL CONNECTED',{transport:options.transport.id,voice:options.voice.id});return {duplicate:false as const,session};}
    catch{await session.end('accept_failed');throw new Error('voice_accept_failed');}
  }
  private audit(type:string,detail:Record<string,unknown>){this.options.store.event(this.id,type,detail,this.now());}
  private grant(){const grant=this.options.authorize(this.caller);if(!grant||grant.actor!==this.actor)throw new Error('voice_authority_revoked');return grant;}
  private async bounded<T>(operation:(signal:AbortSignal)=>Promise<T>,parent=this.life.signal):Promise<T>{
    const deadline=AbortSignal.timeout(this.options.stageTimeoutMs??30000),signal=AbortSignal.any([parent,deadline]);
    signal.throwIfAborted();let abort:()=>void=()=>{};
    const failure=new Promise<never>((_,reject)=>{abort=()=>reject(new Error('voice_operation_aborted'));signal.addEventListener('abort',abort,{once:true});});
    try{return await Promise.race([operation(signal),failure]);}finally{signal.removeEventListener('abort',abort);}
  }
  /** Called only by the authenticated, ordered transport decoder. Network reordering belongs below this boundary. */
  receive(frame:VoiceFrame){
    if(this.ended)return;
    try{this.grant();}catch{void this.end('authority_revoked');return;}
    if(frame.sampleRate!==16000||frame.pcm.length!==320||!Number.isSafeInteger(frame.sequence)||frame.sequence<0){this.audit('AUDIO REJECTED',{reason:'invalid_pcm_frame'});return;}
    if(frame.sequence<=this.sequence){this.audit('DUPLICATE AUDIO',{sequence:frame.sequence});return;}
    if(this.sequence>=0&&frame.sequence!==this.sequence+1){this.utterance=[];this.voiced=0;this.silence=0;this.audit('AUDIO GAP',{reason:'partial_utterance_discarded'});}
    this.sequence=frame.sequence;
    const rms=Math.sqrt(frame.pcm.reduce((n,v)=>n+(v/32768)**2,0)/320),speech=rms>=0.015;
    if(speech){this.voiced++;this.silence=0;}else this.silence++;
    if(speech||this.utterance.length)this.utterance.push(frame.pcm.slice());
    if(this.voiced===3&&speech){this.audit('USER SPEECH',{detector:'experimental_energy_vad',threshold:0.015});if(this.processing)void this.interrupt();}
    if(this.utterance.length>1500){this.utterance=[];this.voiced=0;this.audit('AUDIO REJECTED',{reason:'utterance_exceeds_30_seconds'});return;}
    if(this.silence>=25&&this.utterance.length){
      const frames=this.utterance;this.utterance=[];const valid=this.voiced>=3;this.voiced=0;this.silence=0;
      if(valid){this.utteranceEndedAt=this.now()-500;void this.process(frames).catch(()=>{});}
    }
  }
  interrupt(){
    if(this.suppression)return this.suppression;
    const pending=this.suppress();this.suppression=pending;void pending.finally(()=>{if(this.suppression===pending)this.suppression=undefined;});return pending;
  }
  private async suppress(){
    if(this.ended)return;const detected=this.now();this.epoch++;this.turn?.abort();this.processing=false;const wasSpeaking=this.speaking;this.speaking=false;
    try{const receipt=await this.bounded(s=>this.options.transport.interruptOutput(this.callId,this.epoch,s));if(this.ended)return;this.audit('INTERRUPTION',{wasSpeaking,outputSuppressionMs:receipt.suppressedAt===undefined?null:Math.max(0,receipt.suppressedAt-detected),measurement:'transport_acknowledgement_not_handset_acoustics'});}
    catch{await this.end('output_suppression_unconfirmed');}
  }
  private async process(frames:Int16Array[]){
    if(this.suppression)await this.suppression;
    if(this.ended)return;
    if(this.processing){this.audit('BACKPRESSURE',{reason:'one_turn_at_a_time'});return;}
    this.processing=true;const epoch=++this.epoch,turn=this.turn=new AbortController(),signal=AbortSignal.any([turn.signal,this.life.signal]);
    const current=()=>!this.ended&&epoch===this.epoch&&!signal.aborted;const endedAt=this.utteranceEndedAt;
    try{
      const pcm=new Int16Array(frames.length*320);frames.forEach((f,i)=>pcm.set(f,i*320));const sttAt=this.now();
      const text=await this.bounded(s=>this.options.recognition.transcribe(pcm,s),signal);if(!current())return;
      if(!text.trim()||text.length>4000)throw new Error('invalid_transcript');this.audit('STT',{text,latencyMs:this.now()-sttAt,partial:false});
      if(this.turns.length>=100)throw new Error('conversation_limit');this.turns.push({role:'user',text});const grant=this.grant(),modelAt=this.now();let tools=0;
      const result=await this.bounded(s=>this.options.orchestration.respond({sessionId:this.id,actor:grant.actor,turns:structuredClone(this.turns),signal:s,tool:async(name,input)=>{
        if(!current()||!this.grant().tools.includes(name)||++tools>4)throw new Error('voice_tool_not_granted');
        const started=this.now();this.audit('TOOL REQUEST',{name});
        const value=await this.bounded(t=>this.options.orchestration.invokeTool({sessionId:this.id,actor:grant.actor,name,input,requestKey:`${this.id}:${epoch}:${tools}`,signal:t}),s);
        if(!current())throw new Error('stale_tool_result');if(value.length>8000)throw new Error('tool_result_too_large');this.audit('TOOL RESULT',{name,result:value,latencyMs:this.now()-started});return value;
      }}),signal);if(!current())return;this.grant();
      if(!result.model||result.model.length>256||!result.text.trim()||result.text.length>4000||!result.routeReason||result.routeReason.length>1000)throw new Error('invalid_model_result');
      if(this.model&&this.model!==result.model)this.audit('MODEL HANDOFF',{from:this.model,to:result.model,reason:result.routeReason,voice:this.options.voice.id,contextTurns:this.turns.length,latencyMs:this.now()-modelAt,measurement:'whole_model_operation_not_isolated_handoff'});
      this.model=result.model;this.audit('MODEL',{model:result.model,reason:result.routeReason,text:result.text,latencyMs:this.now()-modelAt,ttftMs:null,usage:validatedUsage(result.usage)});
      const reply:VoiceTurn={role:'assistant',text:result.text};this.turns.push(reply);this.speaking=true;const ttsAt=this.now();let first=true,count=0;
      const iterator=this.options.speech.frames(result.text,structuredClone(this.options.voice),signal)[Symbol.asyncIterator]();
      try{while(current()){
        const next=await this.bounded(()=>iterator.next(),signal);if(next.done)break;
        if(!current())break;this.grant();if(next.value.length!==320||++count>3000)throw new Error('tts_frame_limit');
        const receipt=await this.bounded(s=>this.options.transport.sendAudio(this.callId,{sequence:count-1,pcm:next.value,sampleRate:16000},epoch,s),signal);
        if(!current())break;if(first){first=false;this.audit('TTS FIRST AUDIO',{generationMs:this.now()-ttsAt,endOfUtteranceToAudibleMs:receipt.audibleAt===undefined||endedAt===undefined?null:Math.max(0,receipt.audibleAt-endedAt),measurement:'transport_playout_receipt',voice:this.options.voice.id});}
      }}finally{if(!current())reply.interrupted=true;void iterator.return?.().catch(()=>{});}
      if(current())this.audit('TURN COMPLETED',{audioFrames:count});
    }catch{if(current()){this.audit('TURN FAILED',{reason:'provider_policy_or_timeout',fallback:'existing_voice_notes_remain_available'});await this.interrupt();}}
    finally{if(epoch===this.epoch){this.processing=false;this.speaking=false;}}
  }
  async end(reason:string){
    if(this.ended)return;this.ended=true;clearTimeout(this.timer);this.epoch++;this.turn?.abort();this.life.abort();this.utterance=[];
    let cleanup='confirmed';try{const s=AbortSignal.timeout(5000);await Promise.race([this.options.transport.hangup(this.callId,reason,s),new Promise((_,reject)=>s.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}))]);}catch{cleanup='unconfirmed';}
    this.audit('CALL ENDED',{reason,durationMs:this.now()-this.started,cleanup});this.options.store.end(this.id);
  }
}
function validatedUsage(usage?:VoiceUsage){
  const result:Record<string,number|null>={};for(const k of ['inputTokens','outputTokens','cachedInputTokens','modelCost','sttCost','ttsCost'] as const){const n=usage?.[k];result[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;}return result;
}
