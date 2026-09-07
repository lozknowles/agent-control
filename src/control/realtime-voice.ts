import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import type {SocialIdentity, VoiceIdentity} from './social-voice-providers.js';
import {validateVoice} from './social-voice-providers.js';
import type {VoiceWorkInteraction} from './conversational-work.js';

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
  completeOutput?(callId:string,generation:number,signal:AbortSignal):Promise<void>;
  notify?(callId:string,event:string,detail?:Record<string,unknown>):void|Promise<void>;
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
export interface VoiceRuntimeInformation {conversationModel:string;conversationProvider:string;executionNode:string;physicalCountry?:string;}
type ConversationControl={kind:'repeat'|'acknowledgement'|'connection-check'|'bounded-count'|'model-information'|'hosting-information';text:string};
function conversationControl(text:string,previous?:VoiceTurn,information?:VoiceRuntimeInformation):ConversationControl|undefined{
  const value=text.trim();
  if(/^(?:repeat|repeat that|say (?:it|that) again|again)[.!?]*$/i.test(value))return {kind:'repeat',text:previous?.text??'There is nothing to repeat yet.'};
  if(/^(?:(?:thanks|thank you)(?:\s+(?:very|so)\s+much)?(?:\s+for\s+(?:that|joining us today))?|cheers)[.!?]*$/i.test(value))return {kind:'acknowledgement',text:"You're welcome."};
  if(/^(?:hello[, ]+)?agent control[, ]+can you hear me[.!?]*$/i.test(value))return {kind:'connection-check',text:'Yes, I can hear you.'};
  if(/^(?:(?:can|could|would)\s+you\s+)?(?:please\s+)?(?:count(?:\s+slowly)?(?:\s+from)?|read\s+(?:the\s+)?numbers?)\s+(?:one|1)\s+(?:to|through)\s+(?:ten|10)(?:\s+please)?[.!?]*$/i.test(value))return {kind:'bounded-count',text:'One, two, three, four, five, six, seven, eight, nine, ten.'};
  if(information&&/^(?:what|which) model (?:do you (?:run|use)|are you (?:running|using))(?: on)?[.!?]*$/i.test(value))return {kind:'model-information',text:`This conversation uses ${information.conversationModel} through ${information.conversationProvider}. OmniVoice handles the speech separately.`};
  if(information&&/^(?:what|which) country are you (?:hosted|running) in[.!?]*$/i.test(value))return {kind:'hosting-information',text:information.physicalCountry?`The voice service is running on ${information.executionNode} in ${information.physicalCountry}.`:`The voice service is running on ${information.executionNode}. Its physical country is unavailable to this session.`};
  return undefined;
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
  session(id:string){const row=this.db.prepare('SELECT id,state,data FROM voice_sessions WHERE id=?').get(id) as {id:string;state:string;data:string}|undefined;return row?{...row,data:JSON.parse(row.data) as Record<string,unknown>}:undefined;}
  projection(){return (this.db.prepare('SELECT id,state,data FROM voice_sessions ORDER BY rowid DESC LIMIT 100').all() as {id:string;state:string;data:string}[]).map(r=>({...r,data:JSON.parse(r.data),events:this.events(r.id)}));}
  transcript(id:string){
    const events=this.events(id),session=this.session(id),origin=events.find(e=>e.type==='STT'),latencies=events.filter(e=>e.type==='TTS FIRST AUDIO').map(e=>e.detail.endOfUtteranceToAudibleMs).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)).sort((a,b)=>a-b);
    const usages=events.filter(e=>e.type==='MODEL').map(e=>e.detail.usage as Record<string,number|null>),sum=(k:string)=>usages.length&&usages.every(u=>typeof u?.[k]==='number')?usages.reduce((n,u)=>n+u[k]!,0):'unavailable';
    const summary={turns:events.filter(e=>e.type==='TURN COMPLETED').length,interruptions:events.filter(e=>e.type==='INTERRUPTION').length,modelChanges:events.filter(e=>e.type==='MODEL HANDOFF').length,tools:events.filter(e=>e.type==='TOOL REQUEST').length,failures:events.filter(e=>e.type==='TURN FAILED').length,durationMs:events.slice().reverse().find(e=>e.type==='CALL ENDED')?.detail.durationMs??'unavailable',inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),cachedInputTokens:sum('cachedInputTokens'),modelCost:sum('modelCost'),sttCost:sum('sttCost'),ttsCost:sum('ttsCost'),averageResponseMs:latencies.length?latencies.reduce((a,b)=>a+b,0)/latencies.length:'unavailable',p50ResponseMs:latencies.length>=20?latencies[Math.ceil(latencies.length*.5)-1]:'insufficient observations',p95ResponseMs:latencies.length>=20?latencies[Math.ceil(latencies.length*.95)-1]:'insufficient observations'};
    const conversation=events.flatMap(e=>{
      const at=new Date(e.at).toISOString();
      if(e.type==='CALL CONNECTED')return [`${at} CALL CONNECTED\nTransport: ${String(e.detail.transport??'unavailable')}\nVoice: ${String(e.detail.voice??'unavailable')}`];
      if(e.type==='STT'&&e===origin)return [];
      if(e.type==='STT')return [`${at} USER / RAW STT\n${String(e.detail.text??'')}\nSTT latency: ${String(e.detail.latencyMs??'unavailable')} ms`];
      if(e.type==='MODEL'||e.type==='REPEAT RESPONSE'||e.type==='CONTROL RESPONSE'||e.type==='WORK RESPONSE')return [`${at} AGENT CONTROL${e.type==='REPEAT RESPONSE'?' / REPEATED':e.type==='CONTROL RESPONSE'?' / DETERMINISTIC CONTROL':e.type==='WORK RESPONSE'?' / GOVERNED WORK':''}\n${String(e.detail.text??'')}\nModel: ${String(e.detail.model??'not invoked')}\nModel latency: ${String(e.detail.latencyMs??'not invoked')} ms`];
      if(e.type==='WORK INTENT')return [`${at} WORK INTENT\nKind: ${String(e.detail.kind??'unavailable')}\nOriginal request retained: ${String(e.detail.originalRequest??'unavailable')}\nWork Parcel: ${String(e.detail.workParcelId??'not created')}`];
      if(e.type==='TOOL REQUEST')return [`${at} TOOL REQUEST\n${String(e.detail.name??'unavailable')}`];
      if(e.type==='TOOL RESULT')return [`${at} TOOL RESULT\n${String(e.detail.result??'')}\nTool latency: ${String(e.detail.latencyMs??'unavailable')} ms`];
      if(e.type==='MODEL HANDOFF')return [`${at} MODEL HANDOFF\n${String(e.detail.from??'unavailable')} -> ${String(e.detail.to??'unavailable')}\nReason: ${String(e.detail.reason??'unavailable')}`];
      if(e.type==='INTERRUPTION')return [`${at} INTERRUPTION\nOutput suppression: ${String(e.detail.outputSuppressionMs??'unavailable')} ms\nMeasurement: ${String(e.detail.measurement??'unavailable')}`];
      if(e.type==='CALL ENDED')return [`${at} CALL ENDED\nReason: ${String(e.detail.reason??'unavailable')}`];
      return [];
    });
    const audit=events.map(e=>`${new Date(e.at).toISOString()} ${e.type}\n${Object.entries(e.detail).map(([k,v])=>`${k}: ${typeof v==='string'?v:JSON.stringify(v)}`).join('\n')}`).join('\n\n');
    const originBlock=origin?`ORIGINATING HUMAN REQUEST\nTimestamp: ${new Date(origin.at).toISOString()}\nInterface: Realtime Voice\nSession: ${id}\nUser: ${String(session?.data.display??'unavailable')}\nAudio: retained under access-controlled call reference ${String(events.find(e=>e.type==='CALL CONNECTED')?.detail.callId??'unavailable')}\n\nRAW STT:\n${String(origin.detail.text??'')}\n\nSTT provider: ${String(session?.data.stt??'unavailable')}\nSTT latency: ${String(origin.detail.latencyMs??'unavailable')} ms\nSTT confidence: unavailable`:`ORIGINATING HUMAN REQUEST\nUnavailable: no speech was transcribed.`;
    return `AGENT CONTROL EXECUTION TRANSCRIPT\n\n${originBlock}\n\nFULL CONVERSATION TRANSCRIPT\n\n${conversation.join('\n\n')}\n\nDETAILED EVENT AUDIT\n\n${audit}\n\nSESSION SUMMARY\n${JSON.stringify(summary,null,2)}`;
  }
  close(){this.db.close();}
}
export interface VoiceSessionOptions {
  store:VoiceSessionStore;transport:RealtimeVoiceTransport;recognition:VoiceRecognition;speech:IncrementalVoiceSpeech;orchestration:VoiceOrchestration;voice:VoiceIdentity;
  work?:VoiceWorkInteraction;
  runtimeInformation?:VoiceRuntimeInformation;
  authorize:(caller:VoiceCaller)=>VoiceGrant|undefined;
  clock?:()=>number; stageTimeoutMs?:number;
}
const key=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Experimental mono 16 kHz/20 ms PCM pipeline. Energy VAD is not an acoustic echo canceller. */
export class RealtimeVoiceSession {
  readonly id:string;readonly caller:VoiceCaller;
  private life=new AbortController();private turn?:AbortController;private epoch=0;private speaking=false;private processing=false;private ended=false;
  private suppression?:Promise<void>;private readonly actor:string;
  private sequence=-1;private voiced=0;private consecutiveVoiced=0;private speechDetected=false;private silence=0;private awaitingSilence=false;private preRoll:Int16Array[]=[];private utterance:Int16Array[]=[];private turns:VoiceTurn[]=[];private model?:string;private utteranceEndedAt?:number;
  private readonly now:()=>number;private readonly started:number;private readonly timer:ReturnType<typeof setTimeout>;private workTimer?:ReturnType<typeof setInterval>;
  private constructor(private options:VoiceSessionOptions,private callId:string,caller:VoiceCaller){
    this.caller=structuredClone(caller);this.now=options.clock??Date.now;this.started=this.now();
    this.options={...options,voice:structuredClone(options.voice)};this.actor=options.authorize(caller)!.actor;
    this.id=options.store.create(key([options.transport.id,caller.identity.account,callId]),{display:caller.display,callerHash:key(caller.identity),transport:options.transport.id,voice:options.voice.id,stt:options.recognition.id,tts:options.speech.id,recognitionMode:options.recognition.mode,speechMode:options.speech.mode});
    this.timer=setTimeout(()=>void this.end('session_deadline'),600000);this.timer.unref();if(options.work?.nextNotification){this.workTimer=setInterval(()=>void this.workNotification(),1000);this.workTimer.unref();}
  }
  static async incoming(options:VoiceSessionOptions,callId:string,caller:VoiceCaller){
    validateVoice(options.voice);
    if(!callId||callId.length>256||caller.identity.channel!==options.transport.id||Object.values(caller.identity).some(v=>typeof v!=='string'||!v||v.length>256)||!caller.display||caller.display.length>80||!options.authorize(caller)||!options.transport.capabilities.duplex||!options.transport.capabilities.interrupt||!options.transport.capabilities.isolatedCallerAudio){await options.transport.reject(callId);throw new Error('voice_call_not_authorized_or_capable');}
    const existing=options.store.find(key([options.transport.id,caller.identity.account,callId]));if(existing)return {duplicate:true as const,id:existing.id};
    if(!options.store.capacity(key(caller.identity))){await options.transport.reject(callId);throw new Error('voice_capacity_exhausted');}
    const session=new RealtimeVoiceSession(options,callId,caller);
    try{await session.bounded(s=>options.transport.accept(callId,s));session.audit('CALL CONNECTED',{transport:options.transport.id,voice:options.voice.id,callId});return {duplicate:false as const,session};}
    catch{await session.end('accept_failed');throw new Error('voice_accept_failed');}
  }
  private audit(type:string,detail:Record<string,unknown>){this.options.store.event(this.id,type,detail,this.now());void Promise.resolve(this.options.transport.notify?.(this.callId,type,detail)).catch(()=>{});}
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
    if(this.sequence>=0&&frame.sequence!==this.sequence+1){this.utterance=[];this.preRoll=[];this.voiced=0;this.consecutiveVoiced=0;this.speechDetected=false;this.silence=0;this.audit('AUDIO GAP',{reason:'partial_utterance_discarded'});}
    this.sequence=frame.sequence;
    const rms=Math.sqrt(frame.pcm.reduce((n,v)=>n+(v/32768)**2,0)/320),speech=rms>=0.015;
    if(this.awaitingSilence){if(speech)this.silence=0;else if(++this.silence>=25){this.awaitingSilence=false;this.silence=0;this.preRoll=[];}return;}
    if(speech){this.voiced++;this.consecutiveVoiced++;this.silence=0;}else{this.consecutiveVoiced=0;this.silence++;}
    if(this.utterance.length)this.utterance.push(frame.pcm.slice());
    else if(speech){this.utterance=this.preRoll.splice(0);this.utterance.push(frame.pcm.slice());}
    else{this.preRoll.push(frame.pcm.slice());if(this.preRoll.length>10)this.preRoll.shift();}
    if(!this.speechDetected&&this.consecutiveVoiced>=5){this.speechDetected=true;this.audit('USER SPEECH',{detector:'experimental_energy_vad',threshold:0.015,minimumContinuousSpeechMs:100});if(this.processing)void this.interrupt();}
    if(this.utterance.length>=500){
      const frames=this.utterance;this.utterance=[];const valid=this.speechDetected;this.voiced=0;this.consecutiveVoiced=0;this.speechDetected=false;this.silence=0;this.awaitingSilence=true;
      if(valid){this.utteranceEndedAt=this.now();this.audit('UTTERANCE ENDPOINT',{reason:'maximum_10_seconds',frames:frames.length});void this.process(frames).catch(()=>{});}return;
    }
    if(this.silence>=25&&this.utterance.length){
      const frames=this.utterance;this.utterance=[];const valid=this.speechDetected;this.voiced=0;this.consecutiveVoiced=0;this.speechDetected=false;this.silence=0;
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
      const previous=[...this.turns.slice(0,-1)].reverse().find(item=>item.role==='assistant'),control=conversationControl(text,previous,this.options.runtimeInformation),work=control?undefined:await this.options.work?.handle({sessionId:this.id,actor:grant.actor,user:this.caller.display,audioReference:this.callId,rawStt:text,turns:structuredClone(this.turns),signal});
      const result=control?{text:control.text,model:this.model??'deterministic-conversation-control',routeReason:`deterministic ${control.kind} control; model not invoked`}:work?{text:work.text,model:'agent-control-work-intent',routeReason:`governed work ${work.kind}; conversation model not invoked`}:await this.bounded(s=>this.options.orchestration.respond({sessionId:this.id,actor:grant.actor,turns:structuredClone(this.turns),signal:s,tool:async(name,input)=>{
        if(!current()||!this.grant().tools.includes(name)||++tools>4)throw new Error('voice_tool_not_granted');
        const started=this.now();this.audit('TOOL REQUEST',{name});
        const value=await this.bounded(t=>this.options.orchestration.invokeTool({sessionId:this.id,actor:grant.actor,name,input,requestKey:`${this.id}:${epoch}:${tools}`,signal:t}),s);
        if(!current())throw new Error('stale_tool_result');if(value.length>8000)throw new Error('tool_result_too_large');this.audit('TOOL RESULT',{name,result:value,latencyMs:this.now()-started});return value;
      }}),signal);if(!current())return;this.grant();
      if(!result.model||result.model.length>256||!result.text.trim()||result.text.length>4000||!result.routeReason||result.routeReason.length>1000)throw new Error('invalid_model_result');
      if(!control&&!work&&this.model&&this.model!==result.model)this.audit('MODEL HANDOFF',{from:this.model,to:result.model,reason:result.routeReason,voice:this.options.voice.id,contextTurns:this.turns.length,latencyMs:this.now()-modelAt,measurement:'whole_model_operation_not_isolated_handoff'});
      if(control?.kind==='repeat'){this.audit('REPEAT REQUEST',{exactText:text,sourceTurnFound:Boolean(previous)});this.audit('REPEAT RESPONSE',{model:result.model,reason:result.routeReason,text:result.text,latencyMs:0,usage:validatedUsage()});}
      else if(control){this.audit('CONVERSATION CONTROL',{kind:control.kind,exactText:text,modelInvoked:false});this.audit('CONTROL RESPONSE',{control:control.kind,text:result.text,latencyMs:0,usage:validatedUsage()});}
      else if(work){this.audit('WORK INTENT',{kind:work.kind,...work.detail});this.audit('WORK RESPONSE',{kind:work.kind,text:result.text,modelInvoked:false,latencyMs:0,usage:validatedUsage()});}
      else{this.model=result.model;this.audit('MODEL',{model:result.model,reason:result.routeReason,text:result.text,latencyMs:this.now()-modelAt,ttftMs:null,usage:validatedUsage(result.usage)});}
      const reply:VoiceTurn={role:'assistant',text:result.text};this.turns.push(reply);this.speaking=true;const ttsAt=this.now();let first=true,count=0;
      const iterator=this.options.speech.frames(result.text,structuredClone(this.options.voice),signal)[Symbol.asyncIterator]();
      try{while(current()){
        const next=await this.bounded(()=>iterator.next(),signal);if(next.done)break;
        if(!current())break;this.grant();if(next.value.length!==320||++count>3000)throw new Error('tts_frame_limit');
        const receipt=await this.bounded(s=>this.options.transport.sendAudio(this.callId,{sequence:count-1,pcm:next.value,sampleRate:16000},epoch,s),signal);
        if(!current())break;if(first){first=false;this.audit('TTS FIRST AUDIO',{generationMs:this.now()-ttsAt,endOfUtteranceToAudibleMs:receipt.audibleAt===undefined||endedAt===undefined?null:Math.max(0,receipt.audibleAt-endedAt),measurement:'transport_playout_receipt',voice:this.options.voice.id});}
      }}finally{if(!current())reply.interrupted=true;void iterator.return?.().catch(()=>{});}
      if(current()&&this.options.transport.completeOutput)await this.bounded(s=>this.options.transport.completeOutput!(this.callId,epoch,s),signal);
      if(current())this.audit('TURN COMPLETED',{audioFrames:count});
    }catch{if(current()){this.audit('TURN FAILED',{reason:'provider_policy_or_timeout',fallback:'existing_voice_notes_remain_available'});await this.interrupt();}}
    finally{if(epoch===this.epoch){this.processing=false;this.speaking=false;}}
  }
  private async workNotification(){
    if(this.ended||this.processing||this.speaking||!this.options.work?.nextNotification)return;let notice;try{notice=await this.options.work.nextNotification(this.id);}catch{return;}if(!notice||this.ended||this.processing||this.speaking)return;
    this.processing=true;const epoch=++this.epoch,turn=this.turn=new AbortController(),signal=AbortSignal.any([turn.signal,this.life.signal]),current=()=>!this.ended&&epoch===this.epoch&&!signal.aborted;try{this.audit('WORK COMPLETION',{kind:notice.kind,...notice.detail});this.audit('WORK RESPONSE',{kind:notice.kind,text:notice.text,modelInvoked:false,automatic:true,latencyMs:0,usage:validatedUsage()});const reply:VoiceTurn={role:'assistant',text:notice.text};this.turns.push(reply);this.speaking=true;let first=true,count=0;const ttsAt=this.now(),iterator=this.options.speech.frames(notice.text,structuredClone(this.options.voice),signal)[Symbol.asyncIterator]();try{while(current()){const next=await this.bounded(()=>iterator.next(),signal);if(next.done)break;if(!current())break;this.grant();if(next.value.length!==320||++count>3000)throw new Error('tts_frame_limit');const receipt=await this.bounded(s=>this.options.transport.sendAudio(this.callId,{sequence:count-1,pcm:next.value,sampleRate:16000},epoch,s),signal);if(current()&&first){first=false;this.audit('TTS FIRST AUDIO',{generationMs:this.now()-ttsAt,endOfUtteranceToAudibleMs:null,measurement:'automatic_completion_has_no_caller_utterance_endpoint',voice:this.options.voice.id,audibleAt:receipt.audibleAt??null});}}}finally{if(!current())reply.interrupted=true;void iterator.return?.().catch(()=>{});}if(current()&&this.options.transport.completeOutput)await this.bounded(s=>this.options.transport.completeOutput!(this.callId,epoch,s),signal);if(current())this.audit('TURN COMPLETED',{audioFrames:count,automaticWorkNotification:true});}catch{if(current())this.audit('TURN FAILED',{reason:'work_completion_tts_failed',workRemainsDurable:true});}finally{if(epoch===this.epoch){this.processing=false;this.speaking=false;}}
  }
  async end(reason:string){
    if(this.ended)return;this.ended=true;clearTimeout(this.timer);if(this.workTimer)clearInterval(this.workTimer);this.epoch++;this.turn?.abort();this.life.abort();this.utterance=[];this.preRoll=[];this.consecutiveVoiced=0;this.speechDetected=false;this.awaitingSilence=false;
    let cleanup='confirmed';try{const s=AbortSignal.timeout(5000);await Promise.race([this.options.transport.hangup(this.callId,reason,s),new Promise((_,reject)=>s.addEventListener('abort',()=>reject(new Error('timeout')),{once:true}))]);}catch{cleanup='unconfirmed';}
    this.audit('CALL ENDED',{reason,durationMs:this.now()-this.started,cleanup});this.options.store.end(this.id);
  }
}
function validatedUsage(usage?:VoiceUsage){
  const result:Record<string,number|null>={};for(const k of ['inputTokens','outputTokens','cachedInputTokens','modelCost','sttCost','ttsCost'] as const){const n=usage?.[k];result[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;}return result;
}
