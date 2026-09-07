import {timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {ModelRegistry} from './model-registry.js';
import {PrivateSpeechProvider} from './speech-http-provider.js';
import {RealtimeVoiceSession,VoiceSessionStore,type RealtimeVoiceTransport,type VoiceFrame} from './realtime-voice.js';
import {bufferedRecognition,CachedPcmSpeech,ChunkedPcmSpeech,PrivatePcmSpeech} from './realtime-voice-speech.js';
import {RoutedVoiceOrchestration} from './realtime-voice-orchestration.js';
import {ConversationalWorkIntent} from './conversational-work.js';
import {RealtimeGovernedWorkRuntime} from './realtime-voice-work-runtime.js';

const state=process.env.AGENT_CONTROL_REALTIME_STATE,operatorToken=process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN,speechToken=process.env.AGENT_CONTROL_SPEECH_TOKEN,voiceFile=process.env.AGENT_CONTROL_REALTIME_VOICE_FILE;
if(!state||!operatorToken||operatorToken.length<24||!speechToken||speechToken.length<32||!voiceFile)throw new Error('realtime_voice_configuration_required');
const voice=JSON.parse(fs.readFileSync(voiceFile,'utf8')).voice,speechUrl=process.env.AGENT_CONTROL_SPEECH_URL??'http://127.0.0.1:19194',sttUrl=process.env.AGENT_CONTROL_REALTIME_STT_URL??speechUrl;
const provider={id:'local-voice',kind:'local' as const,baseUrl:process.env.AGENT_CONTROL_VOICE_MODEL_URL??'http://127.0.0.1:8080/v1',wireApi:'chat-completions' as const,auth:{type:'none' as const},enabled:true};
const model={id:process.env.AGENT_CONTROL_VOICE_MODEL_ID??'voice-small',provider:provider.id,providerModel:process.env.AGENT_CONTROL_VOICE_MODEL??'qwen2.5-3b-instruct-q4_k_m.gguf',capabilities:['conversation','coding'],qualification:{state:'QUALIFIED' as const,version:process.env.AGENT_CONTROL_VOICE_MODEL_QUALIFICATION??'physical-local-20260906',qualifiedAt:'2026-09-06T00:00:00Z',evidence:['bounded local conversation response verified before session service','isolated generated Python source compiled and passed duplicate-file fixture test'],capabilities:['conversation','coding'],nodes:['controller']},pricing:{currency:'USD',inputPerMillionTokens:0,outputPerMillionTokens:0,effectiveFrom:'2026-09-06',source:'local included qualification'}};
const registry=new ModelRegistry([provider],[model],{defaultRole:'voice',roles:{voice:{primary:model.id,requires:['conversation']},'voice.coding':{primary:model.id,requires:['coding']}}}),orchestration=new RoutedVoiceOrchestration(registry,'voice');
const workRuntime=new RealtimeGovernedWorkRuntime(path.join(state,'realtime-work'),registry,provider,model),work=new ConversationalWorkIntent(workRuntime);
const cachedPhrases=['Job started.','Job is still running.','Job completed successfully.','Job cancelled.','I did not catch that. Please say it again.','Yes, I can hear you.',"You're welcome.",'One, two, three, four, five, six, seven, eight, nine, ten.'];
const originalSpeech=new PrivateSpeechProvider('faster-whisper-small.en',sttUrl,speechToken,voice),recognition=bufferedRecognition(originalSpeech),speech=new CachedPcmSpeech(new ChunkedPcmSpeech(new PrivatePcmSpeech('omnivoice',speechUrl,speechToken,voice)),path.join(state,'tts-cache'),'omnivoice-16step-chunked-v2',cachedPhrases),store=new VoiceSessionStore(path.join(state,'sessions.sqlite'));

type Message={type:string;[key:string]:unknown};
class SocketTransport implements RealtimeVoiceTransport{
  id='browser-webrtc';capabilities={duplex:true,interrupt:true,isolatedCallerAudio:true,reconnect:false};private first=new Map<number,{resolve:(at:number)=>void,reject:(e:Error)=>void}>();private stops=new Map<number,{resolve:(at:number)=>void,reject:(e:Error)=>void}>();
  constructor(private socket:net.Socket){}
  async accept(callId:string){await this.write({type:'accepted',callId});}
  async reject(callId:string){await this.write({type:'rejected',callId});}
  async health(){return {state:this.socket.destroyed?'unavailable' as const:'ready' as const};}
  private async write(message:Message){if(this.socket.destroyed)throw Error('media_socket_closed');if(!this.socket.write(JSON.stringify(message)+'\n'))await new Promise<void>((resolve,reject)=>{this.socket.once('drain',resolve);this.socket.once('error',reject);});}
  async sendAudio(_callId:string,frame:VoiceFrame,generation:number,signal:AbortSignal){await this.write({type:'audio',generation,sequence:frame.sequence,pcm:Buffer.from(frame.pcm.buffer,frame.pcm.byteOffset,frame.pcm.byteLength).toString('base64')});if(frame.sequence!==0)return{};return await new Promise<{audibleAt?:number}>((resolve,reject)=>{const onAbort=()=>{this.first.delete(generation);reject(Error('audio_cancelled'));};signal.addEventListener('abort',onAbort,{once:true});this.first.set(generation,{resolve:at=>{signal.removeEventListener('abort',onAbort);resolve({audibleAt:at});},reject});});}
  async completeOutput(_callId:string,generation:number){await this.write({type:'audio_end',generation});}
  async notify(_callId:string,event:string,detail?:Record<string,unknown>){await this.write({type:'state',event,detail});}
  async interruptOutput(_callId:string,generation:number,signal:AbortSignal){await this.write({type:'interrupt',generation});return await new Promise<{suppressedAt?:number}>((resolve,reject)=>{const onAbort=()=>{this.stops.delete(generation);reject(Error('interrupt_cancelled'));};signal.addEventListener('abort',onAbort,{once:true});this.stops.set(generation,{resolve:at=>{signal.removeEventListener('abort',onAbort);resolve({suppressedAt:at});},reject});});}
  acknowledge(message:Message){const generation=Number(message.generation),at=Number(message.at);if(!Number.isFinite(at))return;if(message.type==='playback'){this.first.get(generation)?.resolve(at);this.first.delete(generation);}if(message.type==='interrupt_ack'){this.stops.get(generation)?.resolve(at);this.stops.delete(generation);}}
  async hangup(_callId:string,reason:string){await this.write({type:'hangup',reason});}
  close(){for(const pending of [...this.first.values(),...this.stops.values()])pending.reject(Error('media_socket_closed'));this.first.clear();this.stops.clear();}
}
const server=net.createServer(socket=>{socket.setNoDelay(true);let buffer='',session:RealtimeVoiceSession|undefined,transport:SocketTransport|undefined,ready=false;
  const close=()=>{transport?.close();if(session)void session.end('transport_disconnect');};socket.on('close',close);socket.on('error',close);
  socket.on('data',chunk=>{buffer+=chunk.toString('utf8');if(buffer.length>2*1024*1024){socket.destroy();return;}for(;;){const split=buffer.indexOf('\n');if(split<0)break;const line=buffer.slice(0,split);buffer=buffer.slice(split+1);void (async()=>{try{const message=JSON.parse(line) as Message;
      if(!ready){if(message.type!=='hello'||typeof message.token!=='string'||message.token.length!==operatorToken.length||!timingSafeEqual(Buffer.from(message.token),Buffer.from(operatorToken))||typeof message.callId!=='string')throw Error('authentication_failed');transport=new SocketTransport(socket);const identity={channel:transport.id,account:'private-browser-qualification',sender:String(message.browserSession),conversation:String(message.browserSession)};const result=await RealtimeVoiceSession.incoming({store,transport,recognition,speech,orchestration,work,voice,runtimeInformation:{conversationModel:model.id,conversationProvider:provider.id,executionNode:'hpubuntu'},authorize:caller=>caller.identity.sender===identity.sender?{actor:'web-operator',tools:['status','models','nodes','health']}:undefined,stageTimeoutMs:30_000},message.callId,{identity,display:'Authenticated private browser'});if(result.duplicate)throw Error('duplicate_call');session=result.session;ready=true;return;}
      if(message.type==='audio'&&session&&typeof message.pcm==='string'){const raw=Buffer.from(message.pcm,'base64');if(raw.length!==640)throw Error('invalid_audio');const pcm=new Int16Array(320);for(let i=0;i<320;i++)pcm[i]=raw.readInt16LE(i*2);session.receive({sequence:Number(message.sequence),sampleRate:16000,pcm});}
      else if(message.type==='playback'||message.type==='interrupt_ack')transport?.acknowledge(message);
      else if(message.type==='hangup'){await session?.end('caller_disconnect');socket.end();}
    }catch{socket.destroy();}})();}});});
server.listen(Number(process.env.AGENT_CONTROL_REALTIME_BRIDGE_PORT??19222),'127.0.0.1',()=>process.stdout.write('Realtime voice bridge ready on private loopback.\n'));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>{workRuntime.close();store.close();process.exit(0);}));
