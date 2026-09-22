import type {SpeechProvider,SpeechRecognitionProvider,VoiceIdentity,SpeechMetrics} from './social-voice-providers.js';
import type {RealtimeInputEvent,RealtimeInputProvider,RealtimeSpeechProvider,SpeechChunk} from './mallow-realtime-presence.js';

function pcmWave(frames:readonly Uint8Array[]){
  const size=frames.reduce((sum,frame)=>sum+frame.byteLength,0),out=Buffer.alloc(44+size);out.write('RIFF');out.writeUInt32LE(36+size,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(16000,24);out.writeUInt32LE(32000,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(size,40);let offset=44;for(const frame of frames){Buffer.from(frame).copy(out,offset);offset+=frame.byteLength;}return out;
}
function decodeWave(data:Uint8Array):Uint8Array[]{
  const body=Buffer.from(data);if(body.length<44||body.toString('ascii',0,4)!=='RIFF'||body.toString('ascii',8,12)!=='WAVE'||body.readUInt32LE(4)+8!==body.length)throw Error('physical_tts_wave_invalid');
  let rate=0,channels=0,bits=0,audio:Buffer|undefined;for(let offset=12;offset+8<=body.length;){const size=body.readUInt32LE(offset+4),end=offset+8+size;if(end>body.length)throw Error('physical_tts_wave_truncated');const kind=body.toString('ascii',offset,offset+4);if(kind==='fmt '){if(size<16||body.readUInt16LE(offset+8)!==1)throw Error('physical_tts_format_unsupported');channels=body.readUInt16LE(offset+10);rate=body.readUInt32LE(offset+12);bits=body.readUInt16LE(offset+22);}if(kind==='data')audio=body.subarray(offset+8,end);offset=end+(size%2);}
  if(!audio||bits!==16||![1,2].includes(channels)||![16000,24000,48000].includes(rate))throw Error('physical_tts_format_unsupported');
  const inputSamples=audio.length/2/channels,outputSamples=Math.floor(inputSamples*16000/rate),pcm=Buffer.alloc(outputSamples*2);for(let i=0;i<outputSamples;i++){const source=i*rate/16000,index=Math.floor(source),next=Math.min(inputSamples-1,index+1),fraction=source-index;let a=0,b=0;for(let c=0;c<channels;c++){a+=audio.readInt16LE((index*channels+c)*2);b+=audio.readInt16LE((next*channels+c)*2);}pcm.writeInt16LE(Math.round((a/channels)*(1-fraction)+(b/channels)*fraction),i*2);}
  const frames:Uint8Array[]=[];for(let offset=0;offset<pcm.length;offset+=640){const frame=Buffer.alloc(640);pcm.copy(frame,0,offset,Math.min(offset+640,pcm.length));frames.push(frame);}return frames;
}

/** Existing private synthesis expressed as bounded PCM frames. This remains buffered TTS and is labelled as such. */
export class BufferedPhysicalSpeech implements RealtimeSpeechProvider {
  readonly mode='buffered-then-framed' as const;readonly voice:{id:string;model:string;version:string};lastMetrics:SpeechMetrics|null=null;
  constructor(readonly id:string,private provider:SpeechProvider,private identity:VoiceIdentity){this.voice={id:identity.id,model:identity.provider,version:identity.modelRevision};}
  async *frames(text:string,signal:AbortSignal):AsyncIterable<SpeechChunk>{const value=await this.provider.synthesize({text,voice:this.identity,signal});this.lastMetrics=value.metrics;for(const bytes of decodeWave(value.bytes)){signal.throwIfAborted();yield{bytes,durationMs:20,sampleRate:16000};}}
}

function level(frame:Uint8Array){const value=Buffer.from(frame);if(value.length!==640)throw Error('physical_audio_frame_invalid');let sum=0;for(let i=0;i<320;i++){const sample=value.readInt16LE(i*2)/32768;sum+=sample*sample;}return Math.sqrt(sum/320);}

/**
 * Push-driven mono 16 kHz PCM input for a browser/WebRTC or native device edge.
 * It performs bounded energy VAD and utterance-buffered STT. It never retains
 * raw audio; callers may retain an explicitly bounded qualification capture.
 */
export class PhysicalPcmInput implements RealtimeInputProvider {
  readonly mode='utterance-buffered' as const;private queue:RealtimeInputEvent[]=[];private waiters:Array<()=>void>=[];private closed=false;private sequence=0;private preRoll:Uint8Array[]=[];private utterance:Uint8Array[]=[];private voiced=0;private silent=0;private speaking=false;private chain=Promise.resolve();
  constructor(readonly id:string,private recognition:SpeechRecognitionProvider,private options:{threshold?:number;startFrames?:number;endFrames?:number;maxFrames?:number;device?:string}={}){}
  private put(event:RealtimeInputEvent){if(this.closed&&event.type!=='audio_closed'&&event.type!=='device_lost')return;this.queue.push(event);for(const wake of this.waiters.splice(0))wake();}
  private async take(signal:AbortSignal){while(!this.queue.length&&!this.closed){await new Promise<void>((resolve,reject)=>{const abort=()=>{this.waiters=this.waiters.filter(item=>item!==wake);reject(signal.reason??Error('physical_input_aborted'));},wake=()=>{signal.removeEventListener('abort',abort);resolve();};signal.addEventListener('abort',abort,{once:true});this.waiters.push(wake);});}return this.queue.shift();}
  async *events(signal:AbortSignal){this.put({type:'audio_opened',detail:{device:this.options.device??'browser-selected microphone',sampleRate:16000,channels:1,frameMs:20,rawRetention:'disabled'}});for(;;){const event=await this.take(signal);if(event)yield event;if(this.closed&&!this.queue.length)return;}}
  push(frame:Uint8Array,atMs=Date.now()){
    if(this.closed)throw Error('physical_input_closed');const rms=level(frame),threshold=this.options.threshold??.015,start=this.options.startFrames??5,end=this.options.endFrames??30,max=this.options.maxFrames??500;this.sequence++;this.put({type:'audio_frame',detail:{sequence:this.sequence,atMs,rms:Number(rms.toFixed(5)),bytes:frame.byteLength}});
    this.preRoll.push(frame.slice());if(this.preRoll.length>10)this.preRoll.shift();
    if(!this.speaking){this.voiced=rms>=threshold?this.voiced+1:0;if(this.voiced>=start){this.speaking=true;this.silent=0;this.utterance=this.preRoll.map(item=>item.slice());this.put({type:'speech_started',detail:{detectedAtMs:atMs,detector:'bounded_energy_vad',threshold,minimumContinuousSpeechMs:start*20}});}return;}
    this.utterance.push(frame.slice());this.silent=rms<threshold?this.silent+1:0;if(this.silent>=end||this.utterance.length>=max)this.endpoint(atMs,this.utterance.length>=max?'maximum_utterance':'silence');
  }
  private endpoint(atMs:number,reason:string){if(!this.speaking)return;const frames=this.utterance;this.utterance=[];this.preRoll=[];this.voiced=0;this.silent=0;this.speaking=false;this.put({type:'speech_ended',detail:{detectedAtMs:atMs,reason,audioMs:frames.length*20}});this.chain=this.chain.then(async()=>{const started=Date.now(),result=await this.recognition.transcribe({bytes:pcmWave(frames),mime:'audio/wav',signal:AbortSignal.timeout(45_000)});if(result.text.trim())this.put({type:'transcript_final',text:result.text,detail:{sttLatencyMs:Date.now()-started,confidence:result.confidence,metrics:result.metrics,partialTranscriptAvailable:false}});}).catch(error=>this.deviceLost('stt_provider_lost',error instanceof Error?error.message:String(error)));}
  end(){if(this.speaking)this.endpoint(Date.now(),'input_closed');void this.chain.finally(()=>{this.closed=true;this.put({type:'audio_closed',detail:{device:this.options.device??'browser-selected microphone'}});for(const wake of this.waiters.splice(0))wake();});}
  deviceLost(reason='input_device_lost',detail?:string){if(this.closed)return;this.closed=true;this.put({type:'device_lost',detail:{reason,detail:detail??null}});for(const wake of this.waiters.splice(0))wake();}
}
