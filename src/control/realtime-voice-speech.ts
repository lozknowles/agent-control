import type {SpeechRecognitionProvider,VoiceIdentity} from './social-voice-providers.js';
import {readBoundedResponse,validateVoice} from './social-voice-providers.js';
import type {VoiceRecognition,IncrementalVoiceSpeech} from './realtime-voice.js';
export function pcmWave(samples:Int16Array){
  if(!samples.length||samples.length>16000*30)throw new Error('pcm_duration_invalid');
  const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(v,44+i*2));return b;
}
export function bufferedRecognition(provider:SpeechRecognitionProvider):VoiceRecognition{
  return {id:provider.id,mode:'utterance-buffered',async transcribe(pcm,signal){return (await provider.transcribe({bytes:pcmWave(pcm),mime:'audio/wav',signal})).text;}};
}
/** Bounded PCM16 mono WAV decoder/resampler. This is packet framing after synthesis, not native streaming TTS. */
export function waveFrames(data:Uint8Array):Int16Array[]{
  const b=Buffer.from(data);if(b.length<44||b.length>8*1024*1024||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.readUInt32LE(4)+8!==b.length)throw new Error('pcm_wave_invalid');
  let rate=0,audio:Buffer|undefined;
  for(let p=12;p+8<=b.length;){const n=b.readUInt32LE(p+4),end=p+8+n;if(end>b.length)throw new Error('pcm_chunk_truncated');const kind=b.toString('ascii',p,p+4);
    if(kind==='fmt '){if(n<16||b.readUInt16LE(p+8)!==1||b.readUInt16LE(p+10)!==1||b.readUInt16LE(p+22)!==16)throw new Error('pcm_format_unsupported');rate=b.readUInt32LE(p+12);}
    if(kind==='data')audio=b.subarray(p+8,end);p=end+(n%2);
  }
  if(![16000,24000,48000].includes(rate)||!audio||audio.length%2||audio.length===0||audio.length/2/rate>60)throw new Error('pcm_audio_invalid');
  const count=Math.floor(audio.length/2*16000/rate),frames:Int16Array[]=[];
  for(let start=0;start<count;start+=320){const frame=new Int16Array(320);for(let j=0;j<320&&start+j<count;j++){const pos=(start+j)*rate/16000,a=Math.floor(pos),next=Math.min(a+1,audio.length/2-1),fraction=pos-a;frame[j]=Math.round(audio.readInt16LE(a*2)*(1-fraction)+audio.readInt16LE(next*2)*fraction);}frames.push(frame);}return frames;
}
export class PrivatePcmSpeech implements IncrementalVoiceSpeech {
  readonly mode='buffered-then-framed' as const;private readonly voice:VoiceIdentity;
  constructor(readonly id:string,private url:string,private token:string,voice:VoiceIdentity,private request:typeof fetch=fetch){
    const u=new URL(url);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.protocol!=='http:'||u.username||u.password||u.search||u.hash||token.length<32)throw new Error('private_speech_configuration_invalid');validateVoice(voice);this.voice=structuredClone(voice);
  }
  async *frames(text:string,voice:VoiceIdentity,signal:AbortSignal){
    if(!text.trim()||text.length>1200||JSON.stringify(voice)!==JSON.stringify(this.voice))throw new Error('voice_request_invalid');
    const response=await this.request(this.url.replace(/\/$/,'')+'/synthesize',{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify({text,voice,format:'wav'}),signal,redirect:'error'});
    if(!response.ok)throw new Error('speech_worker_failed');const body=JSON.parse((await readBoundedResponse(response,16*1024*1024)).toString('utf8'));
    if(body.mime!=='audio/wav'||typeof body.audio!=='string')throw new Error('pcm_response_invalid');
    for(const frame of waveFrames(Buffer.from(body.audio,'base64'))){signal.throwIfAborted();yield frame;}
  }
}
