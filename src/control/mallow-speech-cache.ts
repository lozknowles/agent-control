import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {speechCacheKey,type RealtimeSpeechProvider,type SpeechChunk} from './mallow-realtime-presence.js';

export interface SpeechCacheEntry {schema:'agent-control.mallow-speech-cache-entry/v1';key:string;text:string;voiceIdentity:string;voiceModel:string;voiceVersion:string;provider:string;sampleRate:number|null;audioSha256:string;durationMs:number;createdAt:string;chunks:Array<{bytes:string;durationMs:number;sampleRate?:number}>;}

/** Exact-text cache for explicitly governed continuity phrases. */
export class GovernedSpeechCache implements RealtimeSpeechProvider {
  readonly id:string;readonly voice;readonly mode;
  private allowed:Set<string>;
  constructor(private source:RealtimeSpeechProvider,private root:string,allowedTexts:readonly string[]){
    if(!path.isAbsolute(root)||!allowedTexts.length||allowedTexts.some(text=>!text.trim()))throw Error('speech_cache_configuration_invalid');
    this.id=`${source.id}:governed-cache`;this.voice=structuredClone(source.voice);this.mode=source.mode;this.allowed=new Set(allowedTexts);fs.mkdirSync(root,{recursive:true,mode:0o700});
  }
  async *frames(text:string,signal:AbortSignal){
    if(!this.allowed.has(text)){yield* this.source.frames(text,signal);return;}
    const key=speechCacheKey({text,voice:this.voice,provider:this.source.id}),file=path.join(this.root,key.slice(0,2),key+'.json');
    try{const entry=JSON.parse(fs.readFileSync(file,'utf8')) as SpeechCacheEntry;if(entry.key!==key||entry.text!==text||entry.voiceVersion!==this.voice.version)throw Error('speech_cache_identity_mismatch');for(const item of entry.chunks){signal.throwIfAborted();yield{bytes:Buffer.from(item.bytes,'base64'),durationMs:item.durationMs,...(Number.isInteger(item.sampleRate)?{sampleRate:item.sampleRate}:{})};}return;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    const chunks:SpeechChunk[]=[];for await(const chunk of this.source.frames(text,signal)){signal.throwIfAborted();const retained={bytes:chunk.bytes.slice(),durationMs:chunk.durationMs};chunks.push(retained);yield retained;}
    if(!chunks.length)throw Error('speech_cache_generation_empty');
    const rates=[...new Set(chunks.map(chunk=>chunk.sampleRate).filter((value):value is number=>Number.isInteger(value)))];if(rates.length>1)throw Error('speech_cache_sample_rate_mismatch');const bytes=Buffer.concat(chunks.map(chunk=>Buffer.from(chunk.bytes))),entry:SpeechCacheEntry={schema:'agent-control.mallow-speech-cache-entry/v1',key,text,voiceIdentity:this.voice.id,voiceModel:this.voice.model,voiceVersion:this.voice.version,provider:this.source.id,sampleRate:rates[0]??null,audioSha256:createHash('sha256').update(bytes).digest('hex'),durationMs:chunks.reduce((sum,chunk)=>sum+chunk.durationMs,0),createdAt:new Date().toISOString(),chunks:chunks.map(chunk=>({bytes:Buffer.from(chunk.bytes).toString('base64'),durationMs:chunk.durationMs,...(chunk.sampleRate?{sampleRate:chunk.sampleRate}:{})}))};
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const temporary=`${file}.${randomUUID()}.tmp`;fs.writeFileSync(temporary,JSON.stringify(entry,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temporary,file);
  }
  cancel(generation:number){return this.source.cancel?.(generation);}
}
