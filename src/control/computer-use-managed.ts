import {createHash} from 'node:crypto';
import type {ComputerAction,ComputerAuthority,ComputerCheck,ComputerObservation,ComputerProvider,ComputerSession,ComputerTarget} from './computer-use.js';

export type ComputerExecutionLevel='STEP'|'MANAGED_RUN';
export type ComputerRunState='PLANNING'|'EXECUTING'|'AWAITING_HUMAN'|'HUMAN_TAKEOVER'|'RESUMING'|'VERIFYING'|'VERIFIED'|'VERIFICATION_FAILED'|'CANCELLED'|'FAILED';
export type ComputerQualificationMode='AUTONOMOUS'|'HUMAN_ASSISTED'|'HUMAN_TAKEOVER'|'SUPERVISED';
export type CapabilityState='SUPPORTED'|'UNSUPPORTED'|'AVAILABLE'|'UNAVAILABLE'|'DEGRADED';
export type ComputerRunEventType='JOB_ACCEPTED'|'ADMISSION_STARTED'|'CAPABILITY_MATCHED'|'WORKER_SELECTED'|'PLAN_CREATED'|'ACTION_PLANNED'|'ACTION_DISPATCHED'|'ACTION_COMPLETED'|'OBSERVATION_RECEIVED'|'ASSERTION_PASSED'|'ASSERTION_FAILED'|'RETRY_REQUESTED'|'HUMAN_REQUIRED'|'HUMAN_TAKEOVER_STARTED'|'HUMAN_ACTION_RECORDED'|'HUMAN_TAKEOVER_ENDED'|'RESUMING'|'VERIFICATION_STARTED'|'VERIFICATION_PASSED'|'VERIFICATION_FAILED'|'CANCELLATION_REQUESTED'|'CANCELLED'|'JOB_SUCCEEDED'|'JOB_FAILED';

export interface MachineCapability{id:string;state:CapabilityState;detail?:string;}
export interface ComputerMachine{id:string;capabilities:MachineCapability[];local:boolean;externalApi:boolean;estimatedCost:number;evidenceScopes:string[];verification:string[];available:boolean;}
export interface ComputerRouteRequest{capabilities:string[];localOnly?:boolean;noExternalApi?:boolean;evidenceRequired?:boolean;evidenceScope?:string;verification?:string;maximumProviderSpend?:number;}
export interface ComputerRouteDecision{selected:string|null;eligible:string[];rejected:Array<{machine:string;reasons:string[]}>;}

export type ComputerWorkflowPrimitive=
 | {id:string;kind:'TASK';objective:string;steps:ComputerWorkflowPrimitive[]}
 | {id:string;kind:'ACTION';action:ComputerAction}
 | {id:string;kind:'ASSERT'|'VERIFY';checks:ComputerCheck[]}
 | {id:string;kind:'IF';condition:ComputerCheck;then:ComputerWorkflowPrimitive[];otherwise?:ComputerWorkflowPrimitive[]}
 | {id:string;kind:'LOOP';until:ComputerCheck;maximumIterations:number;steps:ComputerWorkflowPrimitive[]}
 | {id:string;kind:'PARALLEL';steps:ComputerWorkflowPrimitive[]}
 | {id:string;kind:'RETRY';maximumAttempts:number;steps:ComputerWorkflowPrimitive[]}
 | {id:string;kind:'WAIT';milliseconds:number}
 | {id:string;kind:'HUMAN_APPROVAL';reason:string;takeoverAllowed:boolean}
 | {id:string;kind:'SUCCEED'|'FAIL';reason:string};

export interface ComputerProviderAdvertisement{id:string;levels:ComputerExecutionLevel[];capabilities:string[];streamingObservations:boolean;cancellation:boolean;humanTakeover:boolean;nativeVerification:boolean;persistentSession:boolean;externalApi:boolean;estimatedCost:number;}
export interface ComputerVerifierResult{passed:boolean;checks:Array<{check:ComputerCheck;passed:boolean}>;detail:string;}
export interface ComputerVerifier{id:string;verify(input:{runId:string;objective:string;observation:ComputerObservation;checks:ComputerCheck[]}):Promise<ComputerVerifierResult>;}
export interface HumanIntervention{reason:string;startedAt:string;endedAt:string;paused:boolean;before:ComputerRunState;after:ComputerRunState;changes:string[];takeover:boolean;actor:string;}
export interface HumanInterventionPort{intervene(input:{runId:string;reason:string;takeoverAllowed:boolean;observation:ComputerObservation|null}):Promise<HumanIntervention|null>;}
export interface ComputerRunEvent{sequence:number;at:string;runId:string;type:ComputerRunEventType;state:ComputerRunState;actor:string;detail:string;previousHash:string|null;hash:string;}
export interface ComputerManagedRunRequest{runId:string;level:ComputerExecutionLevel;objective:string;target:ComputerTarget;workflow:ComputerWorkflowPrimitive[];verification:ComputerCheck[];maximumElapsedMs:number;maximumProviderSpend:number;provider:ComputerProvider;providerAdvertisement:ComputerProviderAdvertisement;verifier:ComputerVerifier;authority:ComputerAuthority;human?:HumanInterventionPort;}
export interface ComputerManagedRunResult{schema:'agent-control.computer-managed-run/v1';runId:string;level:ComputerExecutionLevel;state:ComputerRunState;provider:string;verifier:string;startedAt:string;endedAt:string;budget:{maximumProviderSpend:number;estimatedProviderSpend:number};providerExecutionCompleted:boolean;verification:ComputerVerifierResult|null;observation:ComputerObservation|null;actions:number;retries:number;human:HumanIntervention[];qualification:ComputerQualificationMode;events:ComputerRunEvent[];reason?:string;}

const supportedKinds=new Set(['TASK','ACTION','ASSERT','VERIFY','IF','LOOP','PARALLEL','RETRY','WAIT','HUMAN_APPROVAL','SUCCEED','FAIL']);
const available=(capability:MachineCapability)=>['SUPPORTED','AVAILABLE'].includes(capability.state);
export function routeComputerMachine(machines:ComputerMachine[],request:ComputerRouteRequest):ComputerRouteDecision{
 const rejected:Array<{machine:string;reasons:string[]}>=[],eligible:ComputerMachine[]=[];
 for(const machine of machines){const reasons:string[]=[];if(!machine.available)reasons.push('machine_unavailable');for(const id of request.capabilities)if(!machine.capabilities.some(item=>item.id===id&&available(item)))reasons.push(`capability_unavailable:${id}`);if(request.localOnly&&!machine.local)reasons.push('local_only');if(request.noExternalApi&&machine.externalApi)reasons.push('external_api_forbidden');if((request.maximumProviderSpend??Infinity)<machine.estimatedCost)reasons.push('provider_budget_exceeded');if(request.evidenceRequired&&(!request.evidenceScope||!machine.evidenceScopes.includes(request.evidenceScope)))reasons.push('evidence_incompatible');if(request.verification&&!machine.verification.includes(request.verification))reasons.push('verification_incompatible');if(reasons.length)rejected.push({machine:machine.id,reasons});else eligible.push(machine);}
 eligible.sort((a,b)=>a.estimatedCost-b.estimatedCost||a.id.localeCompare(b.id));return{selected:eligible[0]?.id??null,eligible:eligible.map(item=>item.id),rejected};
}
export function validateComputerWorkflow(steps:ComputerWorkflowPrimitive[],level:ComputerExecutionLevel){
 const ids=new Set<string>();let actions=0,total=0;
 const walk=(items:ComputerWorkflowPrimitive[])=>{for(const item of items){total++;if(total>128||!item.id||ids.has(item.id)||!supportedKinds.has(item.kind))throw Error('computer_workflow_invalid');ids.add(item.id);if(item.kind==='ACTION')actions++;if(item.kind==='TASK'||item.kind==='RETRY'||item.kind==='PARALLEL'||item.kind==='LOOP')walk(item.steps);if(item.kind==='IF'){walk(item.then);walk(item.otherwise??[]);}if(item.kind==='RETRY'&&(item.maximumAttempts<1||item.maximumAttempts>3))throw Error('computer_workflow_retry_invalid');if(item.kind==='LOOP'&&(item.maximumIterations<1||item.maximumIterations>8))throw Error('computer_workflow_loop_invalid');if(item.kind==='WAIT'&&(item.milliseconds<0||item.milliseconds>30000))throw Error('computer_workflow_wait_invalid');if(item.kind==='PARALLEL'&&item.steps.some(child=>['ACTION','TASK','LOOP','RETRY','HUMAN_APPROVAL'].includes(child.kind)))throw Error('computer_workflow_parallel_mutation_forbidden');}}
 walk(steps);if(level==='STEP'&&actions!==1)throw Error('computer_step_requires_one_action');if(level==='MANAGED_RUN'&&!actions)throw Error('computer_managed_run_requires_action');return{steps:total,actions};
}
function check(observation:ComputerObservation,item:ComputerCheck){const value=item.value.toLocaleLowerCase();if(item.kind==='url')return observation.url===item.value;if(item.kind==='title')return observation.title===item.value;if(item.kind==='text')return(observation.text??'').toLocaleLowerCase().includes(value);return observation.elements.some(element=>element.id===item.value||element.name?.toLocaleLowerCase()===value);}
export class DeterministicComputerVerifier implements ComputerVerifier{
 readonly id='deterministic-state-verifier';
 async verify(input:{runId:string;objective:string;observation:ComputerObservation;checks:ComputerCheck[]}):Promise<ComputerVerifierResult>{const checks=input.checks.map(item=>({check:item,passed:check(input.observation,item)}));return{passed:checks.length>0&&checks.every(item=>item.passed),checks,detail:checks.every(item=>item.passed)?'deterministic_state_matched':'deterministic_state_mismatch'};}
}
function classify(human:HumanIntervention[]):ComputerQualificationMode{if(!human.length)return'AUTONOMOUS';if(human.some(item=>item.takeover))return'HUMAN_TAKEOVER';if(human.some(item=>item.paused))return'HUMAN_ASSISTED';return'SUPERVISED';}
class EventStream{
 private readonly rows:ComputerRunEvent[]=[];
 constructor(private readonly runId:string,private readonly clock:()=>Date){}
 append(type:ComputerRunEventType,state:ComputerRunState,actor:string,detail:string){const previousHash=this.rows.at(-1)?.hash??null,sequence=this.rows.length+1,at=this.clock().toISOString(),payload={sequence,at,runId:this.runId,type,state,actor,detail,previousHash},hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex'),event={...payload,hash};this.rows.push(event);return event;}
 list(){return structuredClone(this.rows);}
}
export function verifyComputerEventStream(events:ComputerRunEvent[]){let previous:string|null=null;for(let i=0;i<events.length;i++){const event=events[i]!;if(event.sequence!==i+1||event.previousHash!==previous)return false;const{hash,...payload}=event;if(createHash('sha256').update(JSON.stringify(payload)).digest('hex')!==hash)return false;previous=hash;}return true;}

export class ComputerManagedRunController{
 constructor(private readonly clock=()=>new Date()){}
 async execute(request:ComputerManagedRunRequest,signal=new AbortController().signal):Promise<ComputerManagedRunResult>{
  validateComputerWorkflow(request.workflow,request.level);const startedAt=this.clock().toISOString(),stream=new EventStream(request.runId,this.clock),human:HumanIntervention[]=[];let state:ComputerRunState='PLANNING',session:ComputerSession|undefined,observation:ComputerObservation|null=null,actions=0,retries=0,providerExecutionCompleted=false,verification:ComputerVerifierResult|null=null,reason:string|undefined;
  const result=(provider:string,stateValue:ComputerRunState,extra:{reason?:string}={}):ComputerManagedRunResult=>({schema:'agent-control.computer-managed-run/v1',runId:request.runId,level:request.level,state:stateValue,provider,verifier:request.verifier.id,startedAt,endedAt:this.clock().toISOString(),budget:{maximumProviderSpend:request.maximumProviderSpend,estimatedProviderSpend:request.providerAdvertisement.estimatedCost},providerExecutionCompleted,verification,observation,actions,retries,human,qualification:classify(human),events:stream.list(),...extra});
  const event=(type:ComputerRunEventType,actor:string,detail:string)=>stream.append(type,state,actor,detail),deadline=Date.now()+request.maximumElapsedMs;
  event('JOB_ACCEPTED','agent-control',request.level);event('ADMISSION_STARTED','agent-control','policy_budget_capability_admission');
  try{
   const ad=request.providerAdvertisement;if(ad.id!==request.provider.id||!ad.levels.includes(request.level)||ad.estimatedCost>request.maximumProviderSpend)throw Error(ad.estimatedCost>request.maximumProviderSpend?'provider_budget_exceeded':'provider_capability_mismatch');
   if(!await request.provider.available(request.target))throw Error('provider_unavailable');event('CAPABILITY_MATCHED','agent-control',ad.capabilities.join(','));event('WORKER_SELECTED','agent-control',ad.id);event('PLAN_CREATED','agent-control',`${request.workflow.length} primitives`);session=await request.provider.open(request.target,signal);observation=await session.observe();event('OBSERVATION_RECEIVED',ad.id,observation.revision);state='EXECUTING';
   const run=async(items:ComputerWorkflowPrimitive[]):Promise<'CONTINUE'|'SUCCEED'|'FAIL'>=>{for(const item of items){if(signal.aborted){state='CANCELLED';event('CANCELLATION_REQUESTED','agent-control','abort_signal');await session?.close().catch(()=>{});event('CANCELLED','agent-control','provider_session_closed');return'FAIL';}if(Date.now()>deadline)throw Error('computer_run_deadline_exceeded');
    if(item.kind==='TASK'){const outcome=await run(item.steps);if(outcome!=='CONTINUE')return outcome;continue;}
    if(item.kind==='ACTION'){event('ACTION_PLANNED','agent-control',item.id);if(!observation)throw Error('observation_missing');const decision=request.authority.authorize({taskId:request.runId,requestedOutcome:request.objective,target:request.target,steps:[item.action],checks:request.verification},item.action,observation);if(decision!=='ALLOW')throw Error(`action_${decision.toLowerCase()}`);event('ACTION_DISPATCHED',ad.id,item.action.operation);await session!.act({...item.action,revision:observation.revision});actions++;event('ACTION_COMPLETED',ad.id,'provider_acknowledged');observation=await session!.observe();event('OBSERVATION_RECEIVED',ad.id,observation.revision);continue;}
    if(item.kind==='ASSERT'||item.kind==='VERIFY'){if(!observation)throw Error('observation_missing');const passed=item.checks.every(value=>check(observation!,value));event(passed?'ASSERTION_PASSED':'ASSERTION_FAILED','agent-control',item.id);if(!passed)return'FAIL';continue;}
    if(item.kind==='WAIT'){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,item.milliseconds);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('computer_run_cancelled'));},{once:true});});continue;}
    if(item.kind==='IF'){const branch=observation&&check(observation,item.condition)?item.then:item.otherwise??[];const outcome=await run(branch);if(outcome!=='CONTINUE')return outcome;continue;}
    if(item.kind==='LOOP'){let done=false;for(let i=0;i<item.maximumIterations;i++){if(observation&&check(observation,item.until)){done=true;break;}const outcome=await run(item.steps);if(outcome!=='CONTINUE')return outcome;}if(!done&&observation)done=check(observation,item.until);if(!done)return'FAIL';continue;}
    if(item.kind==='PARALLEL'){if(!observation)throw Error('observation_missing');const passed=item.steps.every(child=>(child.kind==='ASSERT'||child.kind==='VERIFY')&&child.checks.every(value=>check(observation!,value)));event(passed?'ASSERTION_PASSED':'ASSERTION_FAILED','agent-control',item.id);if(!passed)return'FAIL';continue;}
    if(item.kind==='RETRY'){let completed=false;for(let attempt=1;attempt<=item.maximumAttempts;attempt++){const outcome=await run(item.steps);if(outcome==='CONTINUE'||outcome==='SUCCEED'){completed=true;break;}if(attempt<item.maximumAttempts){retries++;event('RETRY_REQUESTED','agent-control',`${item.id}:${attempt}`);}}if(!completed)return'FAIL';continue;}
    if(item.kind==='HUMAN_APPROVAL'){state='AWAITING_HUMAN';event('HUMAN_REQUIRED','agent-control',item.reason);const intervention=await request.human?.intervene({runId:request.runId,reason:item.reason,takeoverAllowed:item.takeoverAllowed,observation});if(!intervention)return'FAIL';human.push(intervention);if(intervention.takeover){state='HUMAN_TAKEOVER';event('HUMAN_TAKEOVER_STARTED',intervention.actor,intervention.reason);for(const change of intervention.changes)event('HUMAN_ACTION_RECORDED',intervention.actor,change);event('HUMAN_TAKEOVER_ENDED',intervention.actor,intervention.after);}state='RESUMING';event('RESUMING','agent-control','fresh_observation_required');observation=await session!.observe();event('OBSERVATION_RECEIVED',ad.id,observation.revision);state='EXECUTING';continue;}
    if(item.kind==='SUCCEED')return'SUCCEED';if(item.kind==='FAIL'){reason=item.reason;return'FAIL';}
   }return'CONTINUE';};
   const outcome=await run(request.workflow);if(signal.aborted||(state as ComputerRunState)==='CANCELLED')return result(ad.id,'CANCELLED',{reason:'cancelled'});if(outcome==='FAIL')throw Error(reason??'workflow_assertion_failed');providerExecutionCompleted=true;state='VERIFYING';event('VERIFICATION_STARTED',request.verifier.id,'independent_verifier_started');if(!observation)throw Error('observation_missing');verification=await request.verifier.verify({runId:request.runId,objective:request.objective,observation,checks:request.verification});state=verification.passed?'VERIFIED':'VERIFICATION_FAILED';event(verification.passed?'VERIFICATION_PASSED':'VERIFICATION_FAILED',request.verifier.id,verification.detail);event(verification.passed?'JOB_SUCCEEDED':'JOB_FAILED','agent-control',verification.passed?'verified_goal':'provider_finished_but_goal_unverified');return result(ad.id,state,verification.passed?{}:{reason:'verification_failed'});
  }catch(error){if(signal.aborted){state='CANCELLED';event('CANCELLATION_REQUESTED','agent-control','abort_signal');event('CANCELLED','agent-control','abort_signal');reason='cancelled';}else{state='FAILED';reason=error instanceof Error?error.message:String(error);event('JOB_FAILED','agent-control',reason);}return result(request.providerAdvertisement.id,state,{reason});}
  finally{await session?.close().catch(()=>{});}
 }
}
