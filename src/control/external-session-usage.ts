import {createHash} from 'node:crypto';
import {open, realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {normalizeExternalUsage, type CanonicalExternalUsage, type ExternalUsageSource} from './external-token-normalization.js';

const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
type RecordValue=Record<string,any>;
export interface ExternalSessionObservation {
  id:string; revision:number; usage:CanonicalExternalUsage;
  sourcePathHash:string; evidenceHash:string; line:number;
  counterBasis:'message'|'cumulative'; supersedes:string|null;
  providerRequestId?:string|null; providerId?:string|null;
  sourceGeneration?:number;
}
export interface ExternalSessionSnapshot {
  observations:ExternalSessionObservation[];
  gaps:Array<{line:number; reason:string}>;
  duplicates:number; sourcePathHash:string; contentHash:string;
  parserState?:{session:string|null;model?:string};
}
/** Pure snapshot parser. Never retains conversation text, paths or provider invoices. */
export function parseExternalSessionLog(source:Exclude<ExternalUsageSource,'other'>,content:string,pathIdentity:string,initial?:{session:string|null;model?:string},lineOffset=0):ExternalSessionSnapshot {
  if(Buffer.byteLength(content)>64*1024*1024)throw Error('external_log_capacity');
  const sourcePathHash=hash(pathIdentity), observations:ExternalSessionObservation[]=[], gaps:ExternalSessionSnapshot['gaps']=[];
  const seen=new Map<string,ExternalSessionObservation>(),revisionCounts=new Map<string,number>(); let duplicates=0, session=initial?.session??null, model=initial?.model;
  const lines=content.split('\n');
  for(let index=0;index<lines.length;index++){
    const raw=lines[index]!; if(!raw.trim())continue;
    if(index===lines.length-1){gaps.push({line:index+1,reason:'partial_tail'});continue;}
    if(Buffer.byteLength(raw)>1024*1024){gaps.push({line:index+1,reason:'line_capacity'});continue;}
    try {
      const r:RecordValue=JSON.parse(raw);
      if(!r||typeof r!=='object')throw Error('record_invalid');
      if(source==='codex'&&r.type==='session_meta'){session=typeof r.payload?.id==='string'?r.payload.id:null;continue;}
      if(source==='codex'&&r.type==='turn_context'){model=typeof r.payload?.model==='string'?r.payload.model:undefined;continue;}
      let counters:RecordValue, event:string, at:string, basis:'message'|'cumulative';
      if(source==='codex'){
        if(r.type!=='event_msg'||r.payload?.type!=='token_count'||!r.payload.info)continue;
        // Cumulative snapshots are authoritative within a file: last_token_usage pings
        // can repeat without any stable turn identity and must not be summed.
        counters=r.payload.info.total_token_usage;
        if(!counters){gaps.push({line:index+1,reason:'missing_cumulative_identity'});continue;}
        if(!session)throw Error('session_identity_missing');
        event='cumulative'; at=r.timestamp; basis='cumulative';
      }else{
        if(r.type!=='assistant'||!r.message?.usage)continue;
        session=typeof r.sessionId==='string'?r.sessionId:null;
        if(!session||typeof r.message.id!=='string')throw Error('session_identity_missing');
        event=r.message.id; counters=r.message.usage; at=r.timestamp; basis='message';
        model=typeof r.message.model==='string'?r.message.model:undefined;
      }
      if(typeof at!=='string')throw Error('timestamp_invalid');
      const usage=normalizeExternalUsage({source,externalSessionId:session!,externalEventId:event,at,model,
        inputTokens:counters.input_tokens,cachedInputTokens:source==='codex'?counters.cached_input_tokens:counters.cache_read_input_tokens,
        cacheWriteTokens:source==='codex'?undefined:counters.cache_creation_input_tokens,
        outputTokens:counters.output_tokens,reasoningOutputTokens:source==='codex'?counters.reasoning_output_tokens:undefined,
        cacheReadIsIncludedInInput:source==='codex'});
      const id=hash(JSON.stringify([source,sourcePathHash,session,event])), previous=seen.get(id);
      const evidenceHash=hash(raw);
      if(previous&&JSON.stringify({...previous.usage,at:null})===JSON.stringify({...usage,at:null})){duplicates++;continue;}
      // A decrease indicates truncation/reset or conflicting evidence; do not replace
      // a valid high-water snapshot with a smaller observation.
      const regressed=previous&&(['input','cachedInput','cacheWrite','output','reasoningOutput'] as const).some(k=>previous.usage[k]!==null&&(usage[k]===null||usage[k]!<previous.usage[k]!));
      if(regressed)gaps.push({line:index+1,reason:'counter_regression'});
      const request=r.providerRequestId??r.requestId??r.request_id??r.payload?.providerRequestId??r.message?.request_id;
      const provider=r.providerId??r.provider_id??r.message?.provider_id;
      const revision=revisionCounts.get(id)??0;
      const observation={id,revision,usage,sourcePathHash,evidenceHash,line:index+1+lineOffset,counterBasis:basis,supersedes:previous?.evidenceHash??null,providerRequestId:typeof request==='string'&&request.length<=512?request:null,providerId:typeof provider==='string'&&/^[A-Za-z0-9._:-]{1,120}$/.test(provider)?provider:null};
      observations.push(observation);revisionCounts.set(id,revision+1);if(!regressed)seen.set(id,observation);
    }catch{gaps.push({line:index+1,reason:'invalid_record_or_usage'});}
  }
  return {observations,gaps:gaps.map(g=>({...g,line:g.line+lineOffset})),duplicates,sourcePathHash,contentHash:hash(content),parserState:{session,model}};
}
/** Explicit file list only. No discovery, polling, state writes, or home-directory scans. */
export async function readExternalSessionLog(source:'codex'|'claude',file:string,maxBytes=16*1024*1024){
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64*1024*1024)throw Error('external_log_capacity_invalid');
  const canonical=await realpath(resolve(file)),handle=await open(canonical,'r');
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size>maxBytes)throw Error('external_log_capacity_or_type');
    const buffer=Buffer.alloc(stat.size);let offset=0;
    while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,offset);if(!bytesRead)break;offset+=bytesRead;}
    return parseExternalSessionLog(source,buffer.subarray(0,offset).toString('utf8'),canonical);
  }finally{await handle.close();}
}
/** Re-read idempotence and revision retention belong to a separate external store. */
export function reconcileExternalSnapshots(snapshots:ExternalSessionSnapshot[]){
  const reconciliationGaps:ExternalSessionSnapshot['gaps']=[];
  const revisions=new Map<string,ExternalSessionObservation>(),latest=new Map<string,ExternalSessionObservation>();
  let duplicates=0;
  for(const snapshot of snapshots)for(const observation of snapshot.observations){
    const key=observation.id+':'+observation.evidenceHash;
    if(revisions.has(key)){duplicates++;continue;}
    revisions.set(key,observation);
    const previous=latest.get(observation.id);
    if(previous&&Date.parse(observation.usage.at)>=Date.parse(previous.usage.at)&&(['input','cachedInput','cacheWrite','output','reasoningOutput'] as const).some(k=>previous.usage[k]!==null&&(observation.usage[k]===null||observation.usage[k]!<previous.usage[k]!))){reconciliationGaps.push({line:observation.line,reason:'snapshot_counter_regression'});continue;}
    if(!previous||Date.parse(observation.usage.at)>=Date.parse(previous.usage.at))latest.set(observation.id,observation);
  }
  const groups=new Map<string,ExternalSessionObservation[]>();
  for(const row of latest.values()){
    // Claude message IDs survive copied fork ancestry. Codex cumulative counters
    // require the session ID because they do not expose a per-request identity.
    const key=hash(JSON.stringify([row.usage.source,row.usage.source==='claude'?null:row.usage.sessionId,row.usage.eventId]));
    const group=groups.get(key)??[];group.push(row);groups.set(key,group);
  }
  const rows:ExternalSessionObservation[]=[], conflicts:Array<{identityHash:string;state:'unresolved_cross_file_divergence';sourcePathHashes:string[];evidenceHashes:string[]}>=[];
  for(const [identityHash,group] of groups){
    const fingerprint=(row:ExternalSessionObservation)=>JSON.stringify({...row.usage,sessionId:row.usage.source==='claude'?null:row.usage.sessionId,at:null,providerRequestId:row.providerRequestId??null,providerId:row.providerId??null});
    if(new Set(group.map(fingerprint)).size>1){
      conflicts.push({identityHash,state:'unresolved_cross_file_divergence',sourcePathHashes:group.map(r=>r.sourcePathHash),evidenceHashes:group.map(r=>r.evidenceHash)});
    }else{rows.push(group[0]!);duplicates+=group.length-1;}
  }
  return {schema:'agent-control.external-session-usage/v1',rows,revisions:[...revisions.values()],conflicts,
    duplicates:duplicates+snapshots.reduce((n,s)=>n+s.duplicates,0),gaps:[...reconciliationGaps,...snapshots.flatMap(s=>s.gaps.map(g=>({...g,sourcePathHash:s.sourcePathHash})))],
    authority:'EXTERNAL_SESSION_LOG',periodAllocation:'SESSION_LIFETIME_UNFILTERED',apiCost:null,nativeAccountingEffect:'NONE',
    limitations:['Identical cross-file copies are counted once; divergent copies or forks are excluded pending resolution. Native overlap remains unresolved.','Codex rows are session cumulative snapshots, not invocation or period usage.','Missing counters remain unknown; no prices, outcomes or task attribution inferred.']};
}

export type ExternalSessionReport=ReturnType<typeof reconcileExternalSnapshots>;
