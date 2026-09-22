import type {CapabilityHealth,SpeechMetrics,SpeechProvider,SpeechRecognitionProvider,VoiceIdentity} from './social-voice-providers.js';
import {readBoundedResponse,validateAudio,validateVoice} from './social-voice-providers.js';

type Session={id:string};

function waveSeconds(bytes:Uint8Array){
  const body=Buffer.from(bytes);let rate=0,channels=0,bits=0,data=0;
  if(body.length<44||body.toString('ascii',0,4)!=='RIFF'||body.toString('ascii',8,12)!=='WAVE')return 0;
  for(let offset=12;offset+8<=body.length;){const size=body.readUInt32LE(offset+4),end=offset+8+size;if(end>body.length)break;const kind=body.toString('ascii',offset,offset+4);if(kind==='fmt '&&size>=16){channels=body.readUInt16LE(offset+10);rate=body.readUInt32LE(offset+12);bits=body.readUInt16LE(offset+22);}if(kind==='data')data=size;offset=end+(size%2);}
  return rate&&channels&&bits?data/(rate*channels*(bits/8)):0;
}

/** Authenticated client for the independent shared speech service. It grants no Agent Control authority. */
export class SharedSpeechServiceProvider implements SpeechProvider,SpeechRecognitionProvider {
  readonly id='shared-speech-services';private session:Promise<Session>|undefined;
  constructor(private readonly url:string,private readonly token:string,private readonly voice:VoiceIdentity,private readonly request:typeof fetch=fetch,private readonly serviceVoiceId='mallow-established'){
    const endpoint=new URL(url);if(endpoint.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname)||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||token.length<32)throw Error('shared_speech_configuration_invalid');validateVoice(voice);
  }
  capabilities(){return{synthesize:true,design:this.voice.kind==='designed',clone:this.voice.kind==='cloned',streaming:false,transcribe:true,languages:['en']};}
  private async response(route:string,init:RequestInit={},limit=256*1024){
    const value=await this.request(this.url.replace(/\/$/,'')+route,{...init,headers:{authorization:`Bearer ${this.token}`,...(init.headers??{})},redirect:'error'});
    if(!value.ok)throw Error(`shared_speech_${value.status}`);return{response:value,body:await readBoundedResponse(value,limit)};
  }
  private open(){return this.session??=this.response('/v1/sessions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({purpose:'interactive'}),signal:AbortSignal.timeout(5000)}).then(({body})=>JSON.parse(body.toString('utf8')) as Session).catch(error=>{this.session=undefined;throw error;});}
  async status(){const {body}=await this.response('/v1/health',{signal:AbortSignal.timeout(5000)}),value=JSON.parse(body.toString('utf8')),providers=Object.fromEntries(Object.entries(value.providers??{}).map(([id,item])=>[id,{status:(item as any)?.status??'unavailable',provider:(item as any)?.id??'unavailable',model:(item as any)?.model??'unavailable',mode:(item as any)?.mode??'unavailable'}])),capability=(name:'recognition'|'synthesis')=>({status:value.capabilities?.[name]?.status==='ready'?'ready' as const:'unavailable' as const,provider:String(value.capabilities?.[name]?.provider?.id??'unavailable')});return{state:value.status==='ready'?'ready' as const:'degraded' as const,checkedAt:String(value.observedAt??new Date().toISOString()),queue:{queued:Number(value.queue?.queued??0),running:Number(value.queue?.running??0)},capabilities:{recognition:capability('recognition'),synthesis:capability('synthesis')},providers};}
  async health():Promise<CapabilityHealth>{try{const value=await this.status(),state=value.state==='ready'?'ready':'degraded';return{state,checkedAt:value.checkedAt,...(state==='ready'?{}:{reason:'shared_speech_degraded'})};}catch{return{state:'unavailable',checkedAt:new Date().toISOString(),reason:'shared_speech_unavailable'};}}
  async voices(){const {body}=await this.response('/v1/voices',{signal:AbortSignal.timeout(5000)});const value=JSON.parse(body.toString('utf8'));if(!Array.isArray(value.voices)||!value.voices.some((item:{id?:string})=>item.id===this.serviceVoiceId))throw Error('shared_speech_voice_unavailable');return[structuredClone(this.voice)];}
  private async withSession<T>(run:(session:Session)=>Promise<T>){try{return await run(await this.open());}catch(error){if(error instanceof Error&&error.message==='shared_speech_404')this.session=undefined;throw error;}}
  private cancel(session:Session){return this.request(`${this.url.replace(/\/$/,'')}/v1/sessions/${session.id}/cancel`,{method:'POST',headers:{authorization:`Bearer ${this.token}`},redirect:'error'}).catch(()=>undefined);}
  async synthesize(input:{text:string;voice:VoiceIdentity;signal:AbortSignal}){
    validateVoice(input.voice);if(JSON.stringify(input.voice)!==JSON.stringify(this.voice)||!input.text.trim()||input.text.length>1200)throw Error('speech_request_not_approved');
    return this.withSession(async session=>{const started=performance.now(),abort=()=>void this.cancel(session);input.signal.addEventListener('abort',abort,{once:true});try{const {response,body}=await this.response(`/v1/sessions/${session.id}/speech`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:input.text,voice:this.serviceVoiceId,language:'en-GB'}),signal:input.signal},16*1024*1024);validateAudio(body,response.headers.get('content-type')??'');const elapsed=performance.now()-started,audioSeconds=waveSeconds(body),provider=response.headers.get('x-speech-provider')??'shared-speech-services',model=response.headers.get('x-speech-model')??this.voice.modelRevision,upstreamRtf=Number(response.headers.get('x-speech-rtf'));const metrics:SpeechMetrics={provider,host:'speech-services',model,elapsedMs:elapsed,audioSeconds,rtf:Number.isFinite(upstreamRtf)?upstreamRtf:audioSeconds?elapsed/1000/audioSeconds:0,firstAudioMs:elapsed,memoryBytes:null};return{bytes:body,mime:response.headers.get('content-type')??'audio/wav',metrics};}finally{input.signal.removeEventListener('abort',abort);}});
  }
  async transcribe(input:{bytes:Uint8Array;mime:string;signal:AbortSignal}){
    validateAudio(input.bytes,input.mime);return this.withSession(async session=>{const started=performance.now(),abort=()=>void this.cancel(session);input.signal.addEventListener('abort',abort,{once:true});try{const {body}=await this.response(`/v1/sessions/${session.id}/transcriptions`,{method:'POST',headers:{'content-type':input.mime},body:Buffer.from(input.bytes),signal:input.signal},512*1024);const value=JSON.parse(body.toString('utf8'));if(typeof value.text!=='string'||value.text.length>2000)throw Error('transcription_invalid');const raw=value.metrics??{},elapsed=performance.now()-started,audioSeconds=waveSeconds(input.bytes),metrics:SpeechMetrics={provider:String(raw.provider??'shared-speech-services'),host:String(raw.host??'speech-services'),model:String(raw.model??'transcription'),elapsedMs:Number.isFinite(raw.elapsedMs)?raw.elapsedMs:elapsed,audioSeconds:Number.isFinite(raw.audioSeconds)?raw.audioSeconds:audioSeconds,rtf:Number.isFinite(raw.rtf)?raw.rtf:(audioSeconds?elapsed/1000/audioSeconds:0),firstAudioMs:Number.isFinite(raw.firstAudioMs)?raw.firstAudioMs:elapsed,memoryBytes:Number.isFinite(raw.memoryBytes)?raw.memoryBytes:null};return{text:value.text.trim(),confidence:Number.isFinite(value.confidence)?value.confidence:null,metrics};}finally{input.signal.removeEventListener('abort',abort);}});
  }
}
