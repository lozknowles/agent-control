import {createHash,randomUUID} from 'node:crypto';
import {lstat,mkdir,open,realpath,rename,unlink} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {parseExternalSessionLog,reconcileExternalSnapshots,type ExternalSessionSnapshot,type ExternalSessionReport} from './external-session-usage.js';
import {normalizeExternalUsage} from './external-token-normalization.js';

const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const CAPACITY=64*1024*1024;
interface Cursor {
  source:'codex'|'claude';sourcePathHash:string;offset:number;line:number;prefixHash:string;
  fileIdentity:string;generation:number;parserState:{session:string|null;model?:string};
}
interface State {schema:'agent-control.external-session-store/v1';cursors:Cursor[];snapshots:ExternalSessionSnapshot[]}
export interface AuthorizedExternalSessionFile {source:'codex'|'claude';file:string}
export interface ExternalSessionStoreReport extends ExternalSessionReport {
  cursors:Array<{source:'codex'|'claude';sourcePathHash:string;offset:number;line:number;generation:number}>;
}
const fresh=():State=>({schema:'agent-control.external-session-store/v1',cursors:[],snapshots:[]});
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const hashed=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);

/** External evidence only. Explicit input paths are read only and never persisted.
 * A lock is held across load/read/write; crash locks require explicit operator recovery.
 * Every consumed prefix is verified, so same-size rewrites are detected. Both source
 * verification and durable state are capped at 64 MiB; parsing advances in bounded chunks.
 */
export class ExternalSessionStore {
  private readonly file:string;
  constructor(file:string){this.file=resolve(file);}
  private async load():Promise<State>{
    let bytes:Buffer;
    try{
      if((await lstat(this.file)).isSymbolicLink())throw Error('external_store_corrupt');
      const handle=await open(this.file,'r');
      try{const stat=await handle.stat();if(!stat.isFile()||stat.size>CAPACITY)throw Error('external_store_corrupt');bytes=Buffer.alloc(stat.size);await this.readExact(handle,bytes,0);}
      finally{await handle.close();}
    }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return fresh();throw Error('external_store_corrupt');}
    try{
      const envelope=JSON.parse(bytes!.toString('utf8'));
      if(digest(JSON.stringify(envelope.state))!==envelope.checksum)throw Error();
      const state:State=envelope.state;
      if(state.schema!=='agent-control.external-session-store/v1'||!Array.isArray(state.cursors)||!Array.isArray(state.snapshots))throw Error();
      const keys=new Set<string>();
      for(const c of state.cursors){
        const key=c.source+':'+c.sourcePathHash;
        if(!['codex','claude'].includes(c.source)||!hashed(c.sourcePathHash)||!hashed(c.prefixHash)||!hashed(c.fileIdentity)||!integer(c.offset)||c.offset>CAPACITY||!integer(c.line)||!integer(c.generation)||!c.parserState||!(c.parserState.session===null||typeof c.parserState.session==='string')||keys.has(key))throw Error();
        keys.add(key);
      }
      for(const s of state.snapshots){
        if(!hashed(s.sourcePathHash)||!hashed(s.contentHash)||!integer(s.duplicates)||!Array.isArray(s.observations)||!Array.isArray(s.gaps))throw Error();
        for(const gap of s.gaps)if(!integer(gap.line)||typeof gap.reason!=='string')throw Error();
        for(const o of s.observations){
          if(!hashed(o.id)||!hashed(o.sourcePathHash)||!hashed(o.evidenceHash)||!integer(o.line)||!integer(o.revision)||!['message','cumulative'].includes(o.counterBasis)||!(o.supersedes===null||hashed(o.supersedes)))throw Error();
          const u=o.usage;
          const normalized=normalizeExternalUsage({source:u.source,externalSessionId:u.sessionId,externalEventId:u.eventId,at:u.at,model:u.model??undefined,inputTokens:u.input??undefined,cachedInputTokens:u.cachedInput??undefined,cacheWriteTokens:u.cacheWrite??undefined,outputTokens:u.output??undefined,reasoningOutputTokens:u.reasoningOutput??undefined,cacheReadIsIncludedInInput:u.source==='codex'});
          if(JSON.stringify(normalized)!==JSON.stringify(u))throw Error();
        }
      }
      return state;
    }catch{throw Error('external_store_corrupt');}
  }
  private report(state:State):ExternalSessionStoreReport {
    return {...reconcileExternalSnapshots(state.snapshots),cursors:state.cursors.map(({source,sourcePathHash,offset,line,generation})=>({source,sourcePathHash,offset,line,generation}))};
  }
  async snapshot():Promise<ExternalSessionStoreReport>{return this.report(await this.load());}
  async ingest(files:AuthorizedExternalSessionFile[],options:{maxBytesPerFile?:number}={}):Promise<ExternalSessionStoreReport>{
    const maxBytes=options.maxBytesPerFile??1024*1024;
    if(!integer(maxBytes)||maxBytes<1||maxBytes>CAPACITY||files.length>32)throw Error('external_ingest_capacity_invalid');
    await mkdir(dirname(this.file),{recursive:true});
    let lock;
    try{lock=await open(this.file+'.lock','wx',0o600);}catch{throw Error('external_store_writer_locked');}
    try{
      const state=await this.load();
      for(const input of files){
        if(input.source!=='codex'&&input.source!=='claude')throw Error('external_source_invalid');
        const canonical=await realpath(resolve(input.file)),pathHash=digest(canonical);
        if(canonical===this.file||canonical===this.file+'.lock')throw Error('external_source_is_store');
        const handle=await open(canonical,'r');
        try{
          const stat=await handle.stat();
          if(!stat.isFile()||stat.size>CAPACITY)throw Error('external_log_capacity_or_type');
          const fileIdentity=digest(JSON.stringify([stat.dev,stat.ino,stat.birthtimeMs]));
          let cursor=state.cursors.find(c=>c.source===input.source&&c.sourcePathHash===pathHash);
          const previousOffset=cursor?.offset??0;
          const prefix=Buffer.alloc(Math.min(previousOffset,stat.size));
          await this.readExact(handle,prefix,0);
          const rewritten=cursor&&(stat.size<cursor.offset||fileIdentity!==cursor.fileIdentity||digest(prefix)!==cursor.prefixHash);
          if(rewritten){
            state.snapshots.push({observations:[],gaps:[{line:cursor!.line,reason:stat.size<cursor!.offset?'source_truncated':'source_rewritten'}],duplicates:0,sourcePathHash:pathHash,contentHash:digest('')});
            cursor={...cursor!,offset:0,line:0,prefixHash:digest(''),parserState:{session:null},fileIdentity,generation:cursor!.generation+1};
            state.cursors[state.cursors.findIndex(c=>c.source===input.source&&c.sourcePathHash===pathHash)]=cursor;
          }
          if(!cursor){cursor={source:input.source,sourcePathHash:pathHash,offset:0,line:0,prefixHash:digest(''),fileIdentity,generation:0,parserState:{session:null}};state.cursors.push(cursor);}
          const buffer=Buffer.alloc(Math.min(maxBytes,stat.size-cursor.offset));
          await this.readExact(handle,buffer,cursor.offset);
          const completeLength=buffer.lastIndexOf(10)+1;
          if(completeLength){
            if(buffer.subarray(0,completeLength).includes(0))throw Error('external_source_encoding_invalid');
            const snapshot=parseExternalSessionLog(input.source,buffer.subarray(0,completeLength).toString('utf8'),canonical,cursor.parserState,cursor.line);
            const previousRows=new Map(state.snapshots.flatMap(s=>s.observations).map(o=>[o.id,o]));
            for(const observation of snapshot.observations){
              const previous=previousRows.get(observation.id);
              if(previous){observation.revision=previous.revision+1;observation.supersedes=previous.evidenceHash;}
              previousRows.set(observation.id,observation);
            }
            state.snapshots.push(snapshot);cursor.offset+=completeLength;cursor.line+=buffer.subarray(0,completeLength).filter(b=>b===10).length;cursor.parserState=snapshot.parserState!;
            const verifiedPrefix=Buffer.alloc(cursor.offset);await this.readExact(handle,verifiedPrefix,0);cursor.prefixHash=digest(verifiedPrefix);
          }
          const after=await handle.stat();
          if(after.size!==stat.size||after.mtimeMs!==stat.mtimeMs)throw Error('external_source_changed_during_read');
          // Tail bytes are intentionally not retained. Re-read them when completed.
          if(buffer.length>completeLength||cursor.offset<stat.size){
            const reason=cursor.offset<stat.size&&buffer.length===maxBytes?'read_limit_or_oversize_line':'partial_tail';
            // Current tail coverage is ephemeral; avoid retaining a false gap after append.
            state.snapshots=state.snapshots.filter(s=>!(s.contentHash===digest('tail:'+pathHash)&&s.sourcePathHash===pathHash));
            state.snapshots.push({observations:[],gaps:[{line:cursor.line+1,reason}],duplicates:0,sourcePathHash:pathHash,contentHash:digest('tail:'+pathHash)});
          }else state.snapshots=state.snapshots.filter(s=>!(s.contentHash===digest('tail:'+pathHash)&&s.sourcePathHash===pathHash));
        }finally{await handle.close();}
      }
      await this.save(state);return this.report(state);
    }catch(error){
      const message=(error as Error).message;
      throw Error(message.startsWith('external_')?message:'external_ingest_failed');
    }finally{await lock.close();await unlink(this.file+'.lock');}
  }
  private async readExact(handle:Awaited<ReturnType<typeof open>>,buffer:Buffer,position:number){
    let offset=0;
    while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,Math.min(1024*1024,buffer.length-offset),position+offset);if(!bytesRead)throw Error('external_source_changed_during_read');offset+=bytesRead;}
  }
  private async save(state:State){
    const encoded=JSON.stringify({state,checksum:digest(JSON.stringify(state))});
    if(Buffer.byteLength(encoded)>CAPACITY)throw Error('external_store_capacity');
    const temporary=this.file+'.'+randomUUID()+'.tmp';
    try{const handle=await open(temporary,'wx',0o600);try{await handle.writeFile(encoded);await handle.sync();}finally{await handle.close();}await rename(temporary,this.file);}
    finally{await unlink(temporary).catch(()=>{});}
  }
}
