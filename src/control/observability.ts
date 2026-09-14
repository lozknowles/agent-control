import type {RuntimeMapProjection, RuntimeMapNode} from './runtime-map.js';
import type {WorkParcel} from './work-parcels.js';
import type {ParameterizedJobRun} from './parameterized-job-types.js';
import type {ManagedNodeSnapshot} from './managed-node.js';
import type {ExecutionSessionRecord} from './execution-session.js';
import {redactSensitiveValue} from './security-redaction.js';
import {safeTranscriptText} from './execution-history.js';
import type {usageProjection} from './usage-projection.js';
import type {RunRecord} from './job-types.js';
import {createHash} from 'node:crypto';

export type InspectorUsage=ReturnType<typeof usageProjection>;
export function nodeWorkIndex(parcels:WorkParcel[],runs:ParameterizedJobRun[],sessions:Array<Pick<ExecutionSessionRecord,'id'|'scope'|'state'>>,jobs:RunRecord[]=[]) {
  const result:Array<{id:string;kind:'parcel'|'job';label:string;status:string;startedAt:string;endedAt:string|null;nodeId:string;binding:string;parameterizedRunId:string|null}>=[];
  for(const parcel of parcels){
    const nodes=new Map<string,string>();
    for(const invocation of parcel.audit.invocations){const id=invocation.providerExecutionNodeId??invocation.node;if(id)nodes.set(id,'Recorded provider execution node');}
    for(const stage of parcel.stages)if(stage.actualRoute?.providerExecutionNodeId)nodes.set(stage.actualRoute.providerExecutionNodeId,'Recorded stage execution route');
    for(const session of sessions)if(session.scope.parcelId===parcel.id&&session.scope.nodeId)nodes.set(session.scope.nodeId,'Owned execution session scope');
    const parent=runs.find(run=>run.workParcelIds.includes(parcel.id));
    for(const [nodeId,binding]of nodes)result.push({id:parcel.id,kind:'parcel',label:parcel.objective,status:parcel.status,startedAt:parcel.createdAt,endedAt:parcel.endedAt??null,nodeId,binding,parameterizedRunId:parent?.id??null});
  }
  for(const run of jobs){if(run.trigger.parcelContext?.parcelId&&parcels.some(p=>p.id===run.trigger.parcelContext!.parcelId))continue;
    const nodeIds=new Set(sessions.filter(s=>s.scope.runId===run.id).map(s=>s.scope.nodeId).filter(Boolean));
    if(run.trigger.modelRoute?.providerExecutionNodeId)nodeIds.add(run.trigger.modelRoute.providerExecutionNodeId);
    for(const nodeId of nodeIds)result.push({id:run.id,kind:'job',label:run.jobId,status:run.status,startedAt:run.startedAt??run.requestedAt,endedAt:run.endedAt??null,nodeId,binding:'Recorded execution session or provider route',parameterizedRunId:null});
  }
  return result;
}
export function projectNodeDashboard(estate:RuntimeMapProjection,id:string,managed:ManagedNodeSnapshot[],work:ReturnType<typeof nodeWorkIndex>) {
  const node=estate.nodes.find(n=>n.id===id&&['machine','device'].includes(n.type));
  if(!node)throw Error('observability_node_missing');
  const nodeId=typeof node.detail.nodeId==='string'?node.detail.nodeId:null;
  const resources=estate.nodes.filter(n=>n.id!==id&&(n.detail.deviceId===id||(nodeId!==null&&n.detail.nodeId===nodeId&&!['machine','device','estate'].includes(n.type))));
  const snapshot=nodeId?managed.find(m=>m.resourceId===nodeId):undefined;
  return redactSensitiveValue({schema:'agent-control.node-dashboard/v1',observedAt:estate.observedAt,node,nodeId,resources,managed:snapshot??null,work:nodeId?work.filter(w=>w.nodeId===nodeId):[],bindingPolicy:'Exact recorded node identity only. Workload and credential locations do not imply model execution.',limitations:['Discovery availability and qualification are independent from live resource measurements.','Whole-node utilization does not prove individual job resource consumption.']});
}
export function projectRunInspector(parcel:WorkParcel,map:RuntimeMapProjection,usage:InspectorUsage,estate:RuntimeMapProjection,operationId?:string) {
  const operation=operationId?map.nodes.find(n=>n.id===operationId):undefined;
  if(operationId&&!operation)throw Error('observability_operation_missing');
  const invocationIds=operation?.evidence.filter(e=>e.kind==='model-invocation').map(e=>e.id);
  const invocations=parcel.audit.invocations.filter(i=>!operation||invocationIds?.includes(i.id)||operation.id===`model:${i.id}`);
  const exactNode=(id:string|null|undefined)=>id?estate.nodes.find(n=>['machine','device'].includes(n.type)&&n.detail.nodeId===id):undefined;
  const calls=invocations.map(i=>{const accounting=usage.rows.find(r=>r.id===i.accountingInvocationId);return {...i,exchange:i.exchange?{...i.exchange,input:safeTranscriptText(i.exchange.input),output:safeTranscriptText(i.exchange.output)}:null,accounting:accounting??null,physicalNode:exactNode(i.providerExecutionNodeId??i.node)?.id??null};});
  const nodeIds=new Set(parcel.audit.invocations.map(i=>i.providerExecutionNodeId??i.node).filter(Boolean));
  for(const n of map.nodes){const identity=n.detail.resourceIdentity as {nodeId?:string}|undefined;if(identity?.nodeId)nodeIds.add(identity.nodeId);}
  const physicalNodes=[...nodeIds].flatMap(id=>{const n=exactNode(id);return n?[{id:n.id,label:n.label,nodeId:id}]:[];});
  // Events retain their actual source schema, timestamps and identifiers. No UI lifecycle events are synthesised.
  const events=parcel.audit.timeline.map(e=>({...e,source:'Work Parcel audit'}));
  const relatedOperations=operation?map.nodes.filter(n=>n.id===operation.id||n.parentId===operation.id):map.nodes;
  return redactSensitiveValue({schema:'agent-control.run-inspector/v1',id:parcel.id,title:parcel.objective,status:parcel.status,startedAt:parcel.createdAt,endedAt:parcel.endedAt??null,observedAt:map.observedAt,operation:operation??null,physicalNodes,calls,usage,events,processEvents:map.events,context:{state:parcel.context??null,stages:parcel.stages.map(s=>({id:s.id,status:s.status,route:s.actualRoute??null,baton:s.baton??null})),records:map.nodes.filter(n=>['baton','memory','cache'].includes(n.type)),explanation:'Provider prompt cache, Agent Control context reuse, baton state, persistent memory and external context sources are distinct mechanisms. No token or cost saving is inferred from a handoff alone.'},operations:relatedOperations,limitations:['Missing counters remain unavailable. Totals come from canonical accounting; event snapshots are not added together.','Average end-to-end call throughput includes all recorded latency; it is not prompt-processing or generation-only throughput.']});
}

export function operationEvidenceText(node:RuntimeMapNode){return safeTranscriptText(JSON.stringify({detail:node.detail,evidence:node.evidence},null,2));}

export function projectJobInspector(run:RunRecord,map:RuntimeMapProjection,usage:InspectorUsage,estate:RuntimeMapProjection,nodeIds:string[],operationId?:string){
  const operation=operationId?map.nodes.find(n=>n.id===operationId):undefined;if(operationId&&!operation)throw Error('observability_operation_missing');
  return redactSensitiveValue({schema:'agent-control.run-inspector/v1',id:run.id,kind:'job',title:run.jobId,status:run.status,startedAt:run.startedAt??run.requestedAt,endedAt:run.endedAt??null,observedAt:map.observedAt,operation:operation??null,physicalNodes:estate.nodes.filter(n=>['machine','device'].includes(n.type)&&nodeIds.includes(String(n.detail.nodeId))).map(n=>({id:n.id,label:n.label,nodeId:n.detail.nodeId})),calls:[],usage,events:run.provenance.map((e,i)=>({id:`${run.id}:provenance:${i}`,at:e.at,type:e.type,summary:e.detail,source:'Job Run provenance'})),processEvents:map.events,context:{state:run.trigger.parcelContext??null,stages:[],records:[],explanation:'Only the recorded Job Run context is shown. No model exchange or cache reuse is inferred from a deterministic action.'},operations:operation?[operation]:map.nodes,steps:run.steps,artifacts:run.artifacts,limitations:['Job Run provenance and owned execution sessions supply this view. Missing model telemetry remains unavailable.']});
}
export function inspectorHistory(value:{id:string;title:string;status:string;events:unknown[];operations:RuntimeMapNode[]}){
  const content=safeTranscriptText(`# ${value.title}\n\nRun: ${value.id}\nStatus: ${value.status}\n\nDerived export of retained Agent Control run records. No events have been invented.\n\n## Chronological source records\n\n\`\`\`json\n${JSON.stringify(value.events,null,2)}\n\`\`\`\n\n## Operations and evidence\n\n\`\`\`json\n${JSON.stringify(value.operations,null,2)}\n\`\`\``,4*1024*1024);
  return {content,sha256:createHash('sha256').update(content).digest('hex'),entryCount:value.events.length,terminal:!['QUEUED','RUNNING','WAITING','VERIFYING','VALIDATING','RESOLVING'].includes(value.status),derived:true};
}
