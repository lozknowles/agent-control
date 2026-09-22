import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {redactSensitiveValue} from './security-redaction.js';

export type ConversationState='IDLE'|'LISTENING'|'USER_SPEAKING'|'UNDERSTANDING'|'ACKNOWLEDGING'|'SPEAKING'|'INTERRUPTED';
export type BackgroundState='RUNNING'|'WAITING_FOR_TOOL'|'WAITING_FOR_MODEL'|'COMPLETED'|'FAILED'|'CANCELLED';
export type PresenceEventType=
  |'audio.input.opened'|'audio.input.frame'|'audio.input.closed'|'audio.input.device_lost'
  |'audio.output.frame'|'audio.output.playback_started'|'audio.output.cancelled'|'audio.output.device_lost'
  |'voice.session.started'|'voice.listening'|'voice.user_speech.started'|'voice.user_speech.ended'
  |'voice.transcript.partial'|'voice.transcript.final'|'voice.intent.detected'|'voice.response.started'
  |'voice.response.chunk'|'voice.response.interrupted'
  |'voice.input.failed'
  |'agent.job.created'|'agent.job.started'|'agent.job.progress'|'agent.job.tool_started'
  |'agent.job.tool_completed'|'agent.job.completed'|'agent.job.failed'|'agent.job.cancelled'
  |'speech.tts.started'|'speech.tts.first_audio'|'speech.tts.completed'|'speech.tts.cancelled';

export interface PresenceEvent {schema:'agent-control.mallow-realtime-event/v1';id:string;sequence:number;at:string;sessionId:string;turnId?:string;jobId?:string;type:PresenceEventType;state?:ConversationState|BackgroundState;detail:Record<string,unknown>;}
export interface SpeechChunk {bytes:Uint8Array;durationMs:number;sampleRate?:number;}
export interface RealtimeSpeechProvider {id:string;voice:{id:string;model:string;version:string};mode:'native-streaming'|'buffered-then-framed'|'synthetic-test';frames(text:string,signal:AbortSignal):AsyncIterable<SpeechChunk>;cancel?(generation:number):Promise<void>|void;}
export interface RealtimeInputEvent {type:'audio_opened'|'audio_frame'|'audio_closed'|'device_lost'|'speech_started'|'speech_ended'|'transcript_partial'|'transcript_final';text?:string;detail?:Record<string,unknown>;}
export interface RealtimeInputProvider {id:string;mode:'streaming'|'utterance-buffered';events(signal:AbortSignal):AsyncIterable<RealtimeInputEvent>;}
export interface VoiceActivityProvider {id:string;process(frame:Uint8Array):{speech:boolean;confidence:number|null};}
export interface RealtimeConversationProvider {id:string;respond(input:{sessionId:string;text:string;history:Array<{role:'user'|'assistant';text:string}>;signal:AbortSignal}):Promise<{text:string;model?:string;provider?:string;usage?:Record<string,number|null>}>;}
export interface FastRoute {kind:'direct'|'background'|'progress';intent:string;skill?:string;acknowledgement?:string;jobRequest?:Record<string,unknown>;supersedesJobId?:string;reason:string;}
export interface FastRoutingProvider {id:string;route(input:{sessionId:string;text:string;activeJobs:BackgroundJobReference[]}):Promise<FastRoute>|FastRoute;}
export interface BackgroundJobReference {jobId:string;laneId:string|null;worker:string|null;model:string|null;skill:string|null;tool:string|null;status:BackgroundState;createdAt:string;startedAt?:string;endedAt?:string;evidenceReference?:string|null;progress?:string|null;result?:string|null;}
export interface GovernedBackgroundPort {start(input:{sessionId:string;turnId:string;route:FastRoute;text:string}):Promise<BackgroundJobReference>;status(id:string):Promise<BackgroundJobReference>;cancel(id:string,reason:string):Promise<BackgroundJobReference>;}

const terminal=new Set<BackgroundState>(['COMPLETED','FAILED','CANCELLED']);
const now=()=>new Date().toISOString();

export class MallowPresenceStore {
  private events:PresenceEvent[]=[];
  private listeners=new Set<(event:PresenceEvent)=>void>();
  constructor(readonly file:string){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    if(fs.existsSync(file))this.events=fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line) as PresenceEvent);
  }
  append(event:PresenceEvent){const safe=redactSensitiveValue(event) as PresenceEvent;fs.appendFileSync(this.file,JSON.stringify(safe)+'\n',{mode:0o600,flush:true});this.events.push(safe);for(const listener of this.listeners)listener(structuredClone(safe));return structuredClone(safe);}
  subscribe(listener:(event:PresenceEvent)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  list(sessionId?:string){return this.events.filter(event=>!sessionId||event.sessionId===sessionId).map(event=>structuredClone(event));}
  sessions(){return [...new Set(this.events.map(event=>event.sessionId))];}
  projection(){
    const sessions=this.sessions().map(id=>projectSession(id,this.list(id)));
    return{schema:'agent-control.mallow-realtime-presence/v1',classification:'EXPERIMENTAL',authority:'durable Mallow realtime events',observedAt:now(),sessions,limitations:['Audio-edge and acoustic latency require physical qualification','Synthetic-test speech must never be presented as audible Mallow speech']};
  }
}

interface RuntimeSession {id:string;state:ConversationState;turn:number;history:Array<{role:'user'|'assistant';text:string}>;jobs:Map<string,{reference:BackgroundJobReference;turnId:string;stale:boolean;lastStatus?:BackgroundState;lastProgress?:string|null}>;speech?:{controller:AbortController;generation:number;turnId:string;segment:string};responseController?:AbortController;inputController?:AbortController;closed:boolean;}

export class MallowRealtimePresenceRuntime {
  private sessions=new Map<string,RuntimeSession>();
  private sequence:number;
  private generation=0;
  private monitorMs:number;
  constructor(private options:{store:MallowPresenceStore;router:FastRoutingProvider;conversation:RealtimeConversationProvider;speech:RealtimeSpeechProvider;background:GovernedBackgroundPort;audioSink?:(input:{sessionId:string;turnId:string;generation:number;chunk:SpeechChunk})=>Promise<{playbackStartedAtMs?:number;outputDevice?:string}|void>|{playbackStartedAtMs?:number;outputDevice?:string}|void;audioComplete?:(input:{sessionId:string;turnId:string;generation:number})=>Promise<void>|void;audioCancel?:(input:{sessionId:string;turnId:string;generation:number;reason:string})=>Promise<{stopRequestedAtMs?:number;queuedFramesDiscarded?:number}|void>|{stopRequestedAtMs?:number;queuedFramesDiscarded?:number}|void;clock?:()=>number;monitorMs?:number}){this.monitorMs=options.monitorMs??250;this.sequence=Math.max(0,...options.store.list().map(event=>event.sequence));}
  start(id='mallow-'+randomUUID()){if(this.sessions.has(id))throw Error('voice_session_exists');const session:RuntimeSession={id,state:'IDLE',turn:0,history:[],jobs:new Map(),closed:false};this.sessions.set(id,session);this.emit(session,'voice.session.started','IDLE',{router:this.options.router.id,conversation:this.options.conversation.id,speech:this.options.speech.id,voice:this.options.speech.voice});this.listen(session);return id;}
  async close(id:string){const session=this.must(id);session.closed=true;session.inputController?.abort();session.responseController?.abort();await this.interrupt(id,'session_closed');session.state='IDLE';}
  events(id:string){return this.options.store.list(id);}
  projection(){return this.options.store.projection();}
  async attachInput(id:string,provider:RealtimeInputProvider){const session=this.must(id);if(session.inputController)throw Error('voice_input_already_attached');const controller=new AbortController();session.inputController=controller;try{for await(const event of provider.events(controller.signal)){if(controller.signal.aborted||session.closed)break;const detail={provider:provider.id,mode:provider.mode,...(event.detail??{})};if(event.type==='audio_opened')this.emit(session,'audio.input.opened',session.state,detail);else if(event.type==='audio_frame')this.emit(session,'audio.input.frame',session.state,detail);else if(event.type==='audio_closed')this.emit(session,'audio.input.closed',session.state,detail);else if(event.type==='device_lost')this.emit(session,'audio.input.device_lost',session.state,detail);else if(event.type==='speech_started'){if(session.speech)await this.interrupt(id,'physical_barge_in');session.state='USER_SPEAKING';this.emit(session,'voice.user_speech.started','USER_SPEAKING',detail);}else if(event.type==='speech_ended')this.emit(session,'voice.user_speech.ended','UNDERSTANDING',detail);else if(event.type==='transcript_partial')await this.partial(id,event.text??'');else if(event.type==='transcript_final')await this.transcript(id,event.text??'');}}catch(error){if(!controller.signal.aborted&&!session.closed){this.emit(session,'voice.input.failed','LISTENING',{provider:provider.id,error:error instanceof Error?error.message:String(error)});this.listen(session);}}finally{if(session.inputController===controller)session.inputController=undefined;}}
  async partial(id:string,text:string){const session=this.must(id);this.emit(session,'voice.transcript.partial','USER_SPEAKING',{text});}
  async transcript(id:string,text:string){
    const session=this.must(id);if(session.closed)throw Error('voice_session_closed');text=text.trim();if(!text)throw Error('voice_transcript_empty');
    session.responseController?.abort();session.responseController=undefined;if(session.speech)await this.interrupt(id,'user_barge_in');
    const turnId=`${id}:turn-${++session.turn}`;session.state='USER_SPEAKING';this.emit(session,'voice.user_speech.started','USER_SPEAKING',{},turnId);this.emit(session,'voice.user_speech.ended','UNDERSTANDING',{},turnId);this.emit(session,'voice.transcript.final','UNDERSTANDING',{text},turnId);session.history.push({role:'user',text});
    let route:FastRoute;try{route=await this.options.router.route({sessionId:id,text,activeJobs:[...session.jobs.values()].filter(job=>!terminal.has(job.reference.status)).map(job=>job.reference)});}catch(error){await this.speak(session,turnId,'I could not route that request safely.','routing-failure',{error:error instanceof Error?error.message:String(error)});return;}
    this.emit(session,'voice.intent.detected','UNDERSTANDING',{intent:route.intent,kind:route.kind,skill:route.skill??null,reason:route.reason},turnId);
    if(route.supersedesJobId){const prior=session.jobs.get(route.supersedesJobId);if(prior){prior.stale=true;const cancelled=await this.options.background.cancel(prior.reference.jobId,'superseded_by_corrected_voice_request');prior.reference=cancelled;this.emit(session,'agent.job.cancelled','CANCELLED',{reason:'superseded_by_corrected_voice_request'},turnId,cancelled.jobId);}}
    if(route.kind==='progress'){const active=[...session.jobs.values()].filter(job=>!terminal.has(job.reference.status));const answer=active.length===1?progressText(await this.options.background.status(active[0]!.reference.jobId)):active.length?'Which running job do you mean?':'There is no background job running in this conversation.';await this.speak(session,turnId,answer,'progress');return;}
    if(route.kind==='direct'){const controller=new AbortController();session.responseController=controller;try{const result=await this.options.conversation.respond({sessionId:id,text,history:session.history.slice(-20),signal:controller.signal});if(controller.signal.aborted)return;await this.speak(session,turnId,result.text,'answer',{model:result.model??null,provider:result.provider??null,usage:result.usage??null});}catch(error){if(!controller.signal.aborted)await this.speak(session,turnId,'I could not complete that response.','conversation-failure',{error:error instanceof Error?error.message:String(error)});}finally{if(session.responseController===controller)session.responseController=undefined;}return;}
    const acknowledgement=route.acknowledgement??'Yes, I can check that for you.';
    const acknowledgementPromise=this.speak(session,turnId,acknowledgement,'acknowledgement');
    const job=await this.options.background.start({sessionId:id,turnId,route,text});session.jobs.set(job.jobId,{reference:job,turnId,stale:false});
    this.emit(session,'agent.job.created',job.status,{laneId:job.laneId,worker:job.worker,model:job.model,skill:job.skill,tool:job.tool,evidenceReference:job.evidenceReference??null},turnId,job.jobId);
    if(job.status==='RUNNING')this.emit(session,'agent.job.started','RUNNING',{laneId:job.laneId,worker:job.worker},turnId,job.jobId);
    void this.monitor(session,job.jobId,acknowledgementPromise);
  }
  async interrupt(id:string,reason='user_barge_in'){
    const session=this.must(id),speech=session.speech;if(!speech)return null;const detectedAt=this.time();speech.controller.abort();await this.options.speech.cancel?.(speech.generation);const receipt=await this.options.audioCancel?.({sessionId:id,turnId:speech.turnId,generation:speech.generation,reason});session.speech=undefined;session.state='INTERRUPTED';const latency=this.time()-detectedAt;this.emit(session,'audio.output.cancelled','INTERRUPTED',{reason,generation:speech.generation,softwareStopMs:latency,stopRequestedAtMs:receipt?.stopRequestedAtMs??null,queuedFramesDiscarded:receipt?.queuedFramesDiscarded??null,measurement:'software transport cancellation; acoustic stop requires external measurement'},speech.turnId);this.emit(session,'voice.response.interrupted','INTERRUPTED',{reason,interruptionToAudioStopMs:latency,measurement:'runtime output suppression; acoustic device stop not observed'},speech.turnId);this.emit(session,'speech.tts.cancelled','INTERRUPTED',{reason,generation:speech.generation},speech.turnId);this.listen(session);return latency;
  }
  private async speak(session:RuntimeSession,turnId:string,text:string,segment:string,detail:Record<string,unknown>={}){
    if(session.speech)await this.interrupt(session.id,'replacement_response');const controller=new AbortController(),generation=++this.generation,start=this.time();session.speech={controller,generation,turnId,segment};session.state=segment==='acknowledgement'?'ACKNOWLEDGING':'SPEAKING';this.emit(session,'voice.response.started',session.state,{segment,text,...detail},turnId);this.emit(session,'speech.tts.started',session.state,{segment,provider:this.options.speech.id,mode:this.options.speech.mode,voice:this.options.speech.voice},turnId);
    let chunks=0,first:number|null=null,duration=0;
    try{for await(const chunk of this.options.speech.frames(text,controller.signal)){if(controller.signal.aborted||session.speech?.generation!==generation)return;if(first===null){first=this.time()-start;this.emit(session,'speech.tts.first_audio',session.state,{segment,textToFirstAudioMs:first,measurement:'first synthesised frame accepted by runtime; acoustic output unavailable'},turnId);}const receipt=await this.options.audioSink?.({sessionId:session.id,turnId,generation,chunk});duration+=chunk.durationMs;this.emit(session,'audio.output.frame',session.state,{segment,index:chunks,bytes:chunk.bytes.byteLength,durationMs:chunk.durationMs,outputDevice:receipt?.outputDevice??null},turnId);if(chunks===0&&receipt?.playbackStartedAtMs!==undefined)this.emit(session,'audio.output.playback_started',session.state,{segment,playbackStartedAtMs:receipt.playbackStartedAtMs,outputDevice:receipt.outputDevice??null,measurement:'browser transport playback receipt; not acoustic microphone measurement'},turnId);this.emit(session,'voice.response.chunk',session.state,{segment,index:chunks++,bytes:chunk.bytes.byteLength,durationMs:chunk.durationMs},turnId);}
      if(controller.signal.aborted||session.speech?.generation!==generation)return;await this.options.audioComplete?.({sessionId:session.id,turnId,generation});this.emit(session,'speech.tts.completed',session.state,{segment,chunks,audioDurationMs:duration,totalMs:this.time()-start},turnId);session.history.push({role:'assistant',text});
    }catch(error){if(!controller.signal.aborted){const reason=error instanceof Error?error.message:String(error);this.emit(session,'voice.response.interrupted','INTERRUPTED',{reason:'speech_provider_failure',error:reason,segment},turnId);this.emit(session,'speech.tts.cancelled','INTERRUPTED',{reason:'speech_provider_failure',error:reason,generation},turnId);}}finally{if(session.speech?.generation===generation){session.speech=undefined;this.listen(session);}}
  }
  private async monitor(session:RuntimeSession,id:string,acknowledgement:Promise<void>){
    const binding=session.jobs.get(id);if(!binding)return;
    for(;;){if(session.closed)return;let current:BackgroundJobReference;try{current=await this.options.background.status(id);}catch{current={...binding.reference,status:'FAILED',progress:'Job status became unavailable.'};}
      binding.reference=current;
      if(current.status!==binding.lastStatus||current.progress!==binding.lastProgress){if(binding.lastStatus==='WAITING_FOR_TOOL'&&current.status!=='WAITING_FOR_TOOL')this.emit(session,'agent.job.tool_completed',current.status,{progress:current.progress??null,evidenceReference:current.evidenceReference??null},binding.turnId,id);if(binding.lastStatus&&binding.lastStatus!=='RUNNING'&&current.status==='RUNNING')this.emit(session,'agent.job.started','RUNNING',{worker:current.worker,laneId:current.laneId},binding.turnId,id);binding.lastStatus=current.status;binding.lastProgress=current.progress;const type:PresenceEventType=current.status==='RUNNING'?'agent.job.progress':current.status==='WAITING_FOR_TOOL'?'agent.job.tool_started':current.status==='WAITING_FOR_MODEL'?'agent.job.progress':current.status==='COMPLETED'?'agent.job.completed':current.status==='CANCELLED'?'agent.job.cancelled':'agent.job.failed';this.emit(session,type,current.status,{progress:current.progress??null,result:current.result??null,evidenceReference:current.evidenceReference??null,stale:binding.stale},binding.turnId,id);}
      if(terminal.has(current.status)){await acknowledgement.catch(()=>{});await this.waitForPhraseBoundary(session);if(!binding.stale&&!session.closed){const text=current.status==='COMPLETED'?(current.result??'I have the result now.'):`The background job ${current.status.toLowerCase()}.`;await this.speak(session,binding.turnId,text,'job-result',{jobId:id,status:current.status,evidenceReference:current.evidenceReference??null});}return;}
      await new Promise(resolve=>setTimeout(resolve,this.monitorMs));
    }
  }
  private async waitForPhraseBoundary(session:RuntimeSession){while(session.speech&&!session.closed)await new Promise(resolve=>setTimeout(resolve,Math.min(this.monitorMs,25)));}
  private listen(session:RuntimeSession){if(session.closed)return;session.state='LISTENING';this.emit(session,'voice.listening','LISTENING',{});}
  private emit(session:RuntimeSession,type:PresenceEventType,state:ConversationState|BackgroundState,detail:Record<string,unknown>,turnId?:string,jobId?:string){session.state=(['RUNNING','WAITING_FOR_TOOL','WAITING_FOR_MODEL','COMPLETED','FAILED','CANCELLED'] as string[]).includes(state)?session.state:state as ConversationState;return this.options.store.append({schema:'agent-control.mallow-realtime-event/v1',id:'evt-'+randomUUID(),sequence:++this.sequence,at:now(),sessionId:session.id,...(turnId?{turnId}:{}),...(jobId?{jobId}:{}),type,state,detail});}
  private must(id:string){const session=this.sessions.get(id);if(!session)throw Error('voice_session_missing');return session;}
  private time(){return (this.options.clock??Date.now)();}
}

function progressText(job:BackgroundJobReference){const phase=job.progress?` ${job.progress}`:'';return `The ${job.skill??'background'} job is ${job.status.toLowerCase().replaceAll('_',' ')}.${phase}`.trim();}
function projectSession(id:string,events:PresenceEvent[]){
  const latest=events.at(-1),jobs=new Map<string,{id:string;state:string;detail:Record<string,unknown>;turnId?:string}>();for(const event of events)if(event.jobId){const prior=jobs.get(event.jobId);jobs.set(event.jobId,{id:event.jobId,state:String(event.state??prior?.state??'UNKNOWN'),detail:{...(prior?.detail??{}),...event.detail},turnId:event.turnId??prior?.turnId});}
  const metric=(field:string)=>events.map(event=>event.detail[field]).filter(value=>typeof value==='number') as number[];
  const conversation=[...events].reverse().find(event=>typeof event.state==='string'&&!terminal.has(event.state as BackgroundState));
  return{id,state:conversation?.state??'IDLE',updatedAt:latest?.at??null,activeNode:conversation?.type??null,jobs:[...jobs.values()],events,turnLatency:turnLatencies(events),latency:{firstAudioMs:summary(metric('textToFirstAudioMs')),interruptionMs:summary(metric('interruptionToAudioStopMs'))}};
}
function summary(values:number[]){if(!values.length)return{count:0,p50:null,p95:null};const sorted=[...values].sort((a,b)=>a-b),pick=(p:number)=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]!;return{count:values.length,p50:pick(.5),p95:pick(.95)};}
function turnLatencies(events:PresenceEvent[]){const turns=new Map<string,PresenceEvent[]>();for(const event of events)if(event.turnId){const list=turns.get(event.turnId)??[];list.push(event);turns.set(event.turnId,list);}const delta=(list:PresenceEvent[],from:(event:PresenceEvent)=>boolean,to:(event:PresenceEvent)=>boolean)=>{const a=list.find(from),b=list.find(to);return a&&b?Math.max(0,Date.parse(b.at)-Date.parse(a.at)):null;};return[...turns].map(([turnId,list])=>({turnId,speechEndToTranscriptFinalMs:delta(list,e=>e.type==='voice.user_speech.ended',e=>e.type==='voice.transcript.final'),speechEndToIntentMs:delta(list,e=>e.type==='voice.user_speech.ended',e=>e.type==='voice.intent.detected'),speechEndToFirstAcknowledgementAudioMs:delta(list,e=>e.type==='voice.user_speech.ended',e=>e.type==='speech.tts.first_audio'&&e.detail.segment==='acknowledgement'),speechEndToJobCreatedMs:delta(list,e=>e.type==='voice.user_speech.ended',e=>e.type==='agent.job.created'),jobCreatedToStartedMs:delta(list,e=>e.type==='agent.job.created',e=>e.type==='agent.job.started'),jobStartedToFirstToolResultMs:delta(list,e=>e.type==='agent.job.started',e=>e.type==='agent.job.tool_completed'),resultToFirstGeneratedTokenMs:null,textToFirstTtsAudioMs:((list.find(e=>e.type==='speech.tts.first_audio')?.detail.textToFirstAudioMs as number|undefined)??null),speechEndToMeaningfulAnswerAudioMs:delta(list,e=>e.type==='voice.user_speech.ended',e=>e.type==='speech.tts.first_audio'&&e.detail.segment==='job-result')}));}

export function speechCacheKey(input:{text:string;voice:{id:string;model:string;version:string};provider:string}){return createHash('sha256').update(JSON.stringify(input)).digest('hex');}
