import type {ModelInvocationObservation} from './harness-efficiency.js';
import type {ExternalSessionObservation} from './external-session-usage.js';

type ExternalReport={rows:ExternalSessionObservation[];revisions:ExternalSessionObservation[];gaps:unknown[];duplicates:number;conflicts?:unknown[];cursors?:unknown[];freshness?:string};
type TokenKey='input'|'cachedInput'|'cacheWrite'|'output'|'reasoningOutput';
const counters:TokenKey[]=['input','cachedInput','cacheWrite','output','reasoningOutput'];
const within=(at:string,start:number,end:number)=>{const n=Date.parse(at);return Number.isFinite(n)&&n>=start&&n<end;};
const observation=(r:ExternalSessionObservation)=>({id:r.id,source:r.usage.source,sessionId:r.usage.sessionId,eventId:r.usage.eventId,at:r.usage.at,model:r.usage.model,
  usage:r.usage,sourcePathHash:r.sourcePathHash,evidenceHash:r.evidenceHash,revision:r.revision,counterBasis:r.counterBasis,
  providerRequestId:r.providerRequestId??null,providerId:r.providerId??null,sourceGeneration:r.sourceGeneration??0});

/** External evidence stays outside native totals, prices, resets and job outcomes. */
export function projectExternalUsage(report:ExternalReport,start:number,end:number,native:ModelInvocationObservation[],filters:Record<string,string>={},limit=200){
  const nativeRequests=new Map<string,ModelInvocationObservation[]>();
  for(const row of native){const request=row.accounting?.providerRequestId;if(!request)continue;nativeRequests.set(request,[...(nativeRequests.get(request)??[]),row]);}
  const conflictIds=new Set((report.conflicts??[]).flatMap((c:any)=>typeof c?.id==='string'?[c.id]:[]));
  const revisions=new Map<string,ExternalSessionObservation[]>();
  for(const r of report.revisions)revisions.set(r.id,[...(revisions.get(r.id)??[]),r]);
  const rows=[] as Array<ReturnType<typeof observation>&{allocation:string;confidence:string;nativeOverlap:string;nativeInvocationIds:string[];periodUsage:Record<TokenKey,number|null>|null;intervalStart:string|null;intervalEnd:string|null}>;
  let unallocatedIntervals=0,conflicted=0,possibleNativeOverlap=0;
  for(const r of report.rows){
    if(conflictIds.has(r.id)){conflicted++;continue;}
    const base=observation(r),nativeMatches=base.providerRequestId?nativeRequests.get(base.providerRequestId)??[]:[];
    // A confirmed evidence overlap needs the same explicit provider request, provider identity,
    // and attested counter semantics. It never changes native billing or ledger rows.
    const exact=nativeMatches.filter(n=>{
      const a=n.accounting,u=r.usage;
      return r.counterBasis==='message'&&base.providerId!==null&&n.provider===base.providerId&&a?.semantics.input==='EXCLUDES_CACHE'&&a.semantics.reasoning==='IN_OUTPUT'&&
        u.input!==null&&u.cachedInput!==null&&u.cacheWrite!==null&&u.output!==null&&
        a.evidence.input===u.input&&a.evidence.cached===u.cachedInput&&a.evidence.cacheWrite===u.cacheWrite&&a.evidence.output===u.output;
    });
    const nativeOverlap=nativeMatches.length===0?'UNRESOLVED':exact.length===1&&nativeMatches.length===1?'CONFIRMED_EVIDENCE_OVERLAP':base.providerId&&nativeMatches.some(n=>n.provider===base.providerId)?'CONFLICTING_REQUEST_ID':'POSSIBLE_REQUEST_ID';
    if(nativeMatches.length&&nativeOverlap!=='CONFIRMED_EVIDENCE_OVERLAP')possibleNativeOverlap++;
    if(r.counterBasis==='message'){
      if(within(r.usage.at,start,end))rows.push({...base,allocation:'EXACT_EVENT_TIME',confidence:'OBSERVED_SOURCE_TIME',nativeOverlap,nativeInvocationIds:nativeMatches.map(n=>n.id),periodUsage:Object.fromEntries(counters.map(k=>[k,r.usage[k]])) as Record<TokenKey,number|null>,intervalStart:null,intervalEnd:r.usage.at});
      continue;
    }
    const history=(revisions.get(r.id)??[]).filter(v=>v.counterBasis==='cumulative').sort((a,b)=>Date.parse(a.usage.at)-Date.parse(b.usage.at)||a.revision-b.revision);
    const first=history[0];
    if(first&&within(first.usage.at,start,end)){rows.push({...observation(first),allocation:'SESSION_LIFETIME_UNKNOWN_START',confidence:'UNALLOCATED',nativeOverlap,nativeInvocationIds:nativeMatches.map(n=>n.id),periodUsage:null,intervalStart:null,intervalEnd:first.usage.at});unallocatedIntervals++;}
    let allocated=false,tainted=false;
    for(let i=1;i<history.length;i++){
      const prior=history[i-1]!,current=history[i]!;
      const priorTime=Date.parse(prior.usage.at),currentTime=Date.parse(current.usage.at);
      const generationChanged=(prior.sourceGeneration??0)!==(current.sourceGeneration??0);
      const regressed=counters.some(k=>prior.usage[k]!==null&&(current.usage[k]===null||current.usage[k]!<prior.usage[k]!));
      if(generationChanged)tainted=false;
      if(regressed)tainted=true;
      // A rejected regression makes subsequent deltas ambiguous until a new source generation.
      if(!(priorTime<end&&currentTime>start))continue;
      const fullyInside=priorTime>=start&&currentTime<end;
      const delta=Object.fromEntries(counters.map(k=>[k,prior.usage[k]===null||current.usage[k]===null||current.usage[k]!<prior.usage[k]!?null:current.usage[k]!-prior.usage[k]!])) as Record<TokenKey,number|null>;
      const stableModel=prior.usage.model!==null&&prior.usage.model===current.usage.model;
      const allocatable=fullyInside&&!tainted&&!generationChanged&&currentTime>priorTime;
      const allocation=regressed||tainted?'COUNTER_REGRESSION_UNRESOLVED':generationChanged?'SOURCE_GENERATION_BOUNDARY':currentTime<=priorTime?'TIMESTAMP_AMBIGUOUS':fullyInside?'BOUNDED_INTERVAL':'CROSSES_PERIOD_BOUNDARY';
      rows.push({...observation(current),allocation,confidence:allocatable?'OBSERVED_INTERVAL':'UNALLOCATED',nativeOverlap,nativeInvocationIds:nativeMatches.map(n=>n.id),periodUsage:allocatable?delta:null,model:stableModel?current.usage.model:null,intervalStart:prior.usage.at,intervalEnd:current.usage.at});
      if(!allocatable)unallocatedIntervals++;allocated=true;
    }
    // The first cumulative snapshot has no observed lower boundary. It is lifetime evidence only.
    if(!allocated&&!first&&within(r.usage.at,start,end)){rows.push({...base,allocation:'SESSION_LIFETIME_UNKNOWN_START',confidence:'UNALLOCATED',nativeOverlap,nativeInvocationIds:nativeMatches.map(n=>n.id),periodUsage:null,intervalStart:null,intervalEnd:r.usage.at});unallocatedIntervals++;}
  }
  const unsupportedFilters=Object.keys(filters).filter(k=>k!=='model');
  const selected=unsupportedFilters.length?[]:rows.filter(r=>!filters.model||r.model===filters.model);
  selected.sort((a,b)=>b.at.localeCompare(a.at));
  const returned=selected.slice(0,limit);
  return {schema:'agent-control.external-usage-projection/v1',authority:'EXTERNAL_SESSION_LOG',nativeAccountingEffect:'NONE',apiCost:null,
    period:{start:new Date(start).toISOString(),end:new Date(end).toISOString(),timezone:'UTC'},rows:returned,filterStatus:unsupportedFilters.length?'UNSUPPORTED_FILTERS':'APPLIED',unsupportedFilters,coverage:{rows:selected.length,returned:returned.length,duplicates:report.duplicates,conflicts:(report.conflicts??[]).length,excludedConflictedRows:conflicted,gaps:report.gaps.length,unallocatedIntervals,possibleNativeOverlap,confirmedNativeOverlap:selected.filter(r=>r.nativeOverlap==='CONFIRMED_EVIDENCE_OVERLAP').length,combinedNativeExternalTotalAvailable:false},
    freshness:report.freshness??'STORED_OBSERVATIONS',cursors:(report.cursors??[]).slice(0,32),conflicts:(report.conflicts??[]).slice(0,100),gaps:report.gaps.slice(0,100),
    limitations:['External usage is never added to native totals or billed as an API charge.','The first Codex cumulative snapshot has no observed start; intervals crossing the selected period remain unallocated.','Confirmed evidence overlap does not prove identical billing; request-ID candidates need provider identity and counter semantics.','External evidence is retained independently of native usage visibility resets.']};
}
