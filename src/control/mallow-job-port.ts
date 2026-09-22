import type {JobRuntime} from './job-runtime.js';
import type {BackgroundJobReference,BackgroundState,FastRoute,GovernedBackgroundPort} from './mallow-realtime-presence.js';

/** Maps voice intent to an existing registered Agent Control Job. No execution bypass. */
export class AgentControlBackgroundJobPort implements GovernedBackgroundPort {
  private metadata=new Map<string,{laneId?:string;skill?:string;tool?:string;model?:string}>();
  constructor(private runtime:JobRuntime,private resolve:(route:FastRoute,text:string)=>{job:string;parameters:Record<string,unknown>;laneId?:string;skill?:string;tool?:string;model?:string},private summarize?:(runId:string,evidenceReference:string|null)=>string|null){}
  async start(input:{sessionId:string;turnId:string;route:FastRoute;text:string}){
    const target=this.resolve(input.route,input.text),run=this.runtime.createRun(target.job,target.parameters,{type:'manual',actor:`mallow:${input.sessionId}`},undefined,`mallow:${input.turnId}`);this.metadata.set(run.id,target);const dispatch=this.runtime.dispatch();if(!dispatch||dispatch.runId!==run.id)throw Error('mallow_job_dispatch_unavailable');void dispatch.completion.catch(()=>{});return this.project(run.id,target);
  }
  async status(id:string){return this.project(id,this.metadata.get(id));}
  async cancel(id:string,reason:string){this.runtime.cancel(id,reason);return this.project(id,this.metadata.get(id));}
  private project(id:string,metadata?:{laneId?:string;skill?:string;tool?:string;model?:string}){
    const run=this.runtime.ledger.get(id);if(!run)throw Error('mallow_job_missing');
    const worker=[...run.steps.flatMap(step=>step.attempts)].reverse().find(attempt=>attempt.workerId)?.workerId??null;
    const status=map(run.status),active=run.steps.find(step=>['DISPATCHED','RUNNING','VERIFYING'].includes(step.status));
    const evidenceReference=run.artifacts.at(-1)??null,lastError=run.errors.at(-1),result=run.status==='SUCCEEDED'?(this.summarize?.(id,evidenceReference)??'The governed job completed.'):null,detail=result??active?.waitingReason??active?.status??lastError??run.status;
    return{jobId:id,laneId:metadata?.laneId??null,worker,model:metadata?.model??null,skill:metadata?.skill??run.jobId,tool:metadata?.tool??run.steps.find(step=>step.action)?.action??null,status,createdAt:run.requestedAt,startedAt:run.startedAt,endedAt:run.endedAt,evidenceReference,progress:detail,result};
  }
}
function map(status:string):BackgroundState{return status==='SUCCEEDED'?'COMPLETED':status==='FAILED'||status==='DEGRADED'||status==='MISSED'||status==='CLEANUP_UNCERTAIN'?'FAILED':status==='CANCELLED'?'CANCELLED':status==='WAITING'||status==='AUTHENTICATION_BLOCKED'||status==='PAUSED'||status==='DISCONNECTED'?'WAITING_FOR_TOOL':status==='VERIFYING'?'WAITING_FOR_MODEL':'RUNNING';}
