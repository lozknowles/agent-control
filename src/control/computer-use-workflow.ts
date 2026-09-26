import {ActionFailure,type ActionRegistry} from './job-runtime.js';
import {ComputerUseCapability,DefaultComputerAuthority,type ComputerProviderRegistry,type ComputerTask,type ComputerEvidence} from './computer-use.js';
import {sameComputerWindow,type ComputerWindow} from './computer-use-lifecycle.js';
import {verifyComputerArtifact,type ComputerApplicationVerifier,type ComputerOutputGrant} from './computer-use-artifact.js';
import type {JobDefinition} from './job-types.js';

export interface ComputerWorkflowStep {task?:Omit<ComputerTask,'taskId'|'target'>;verifyOutput?:boolean;coordinateApproved?:boolean;screenshotApproved?:boolean;approvalPolicy?:string;}
export interface ComputerWorkflowOptions {jobId:string;workerId:string;machine:string;application:string;initialWindow:ComputerWindow;providers:ComputerProviderRegistry;steps:Record<string,ComputerWorkflowStep>;output?:Omit<ComputerOutputGrant,'runId'|'notBefore'>;verifier?:ComputerApplicationVerifier;}
export function computerWorkflowJob(id:string,description:string,steps:Record<string,ComputerWorkflowStep>):JobDefinition{
  const ids=Object.keys(steps);if(!ids.length||!steps[ids.at(-1)!]?.verifyOutput)throw Error('computer_workflow_requires_final_verification');
  return{apiVersion:'agent-control/v1',kind:'Job',metadata:{id,name:description,description,version:'1.0.0'},spec:{enabled:false,priority:'normal',concurrency:'no-overlap',retry:{attempts:0,backoffSeconds:0},steps:ids.map((stepId,index)=>{const step=steps[stepId]!,name=step.verifyOutput?'computer-use-evidence':'computer-continuity';return{id:stepId,action:'computer.lifecycle@1.0.0',requires:['computer.desktop'],resources:['computer/desktop-session'],...(index?{dependsOn:[ids[index-1]!],inputs:{continuity:`${ids[index-1]}.computer-continuity`}}:{}),...(step.approvalPolicy?{approval:step.approvalPolicy}:{}),timeoutSeconds:120,outputs:[{name,type:'application/json',schema:step.verifyOutput?'agent-control.computer-use/v1':'agent-control.computer-continuity/v1',version:'1.0.0'}],verification:[step.verifyOutput?'computer-artifact-verified':'computer-step-observed']};})}};
}
interface Checkpoint {schema:'agent-control.computer-continuity/v1';runId:string;window:ComputerWindow;evidence:ComputerEvidence[];}
/** Controller-owned plan and output grants. Normal JobRuntime owns approvals, dependencies and artifacts. */
export function registerComputerWorkflowAction(registry:ActionRegistry,options:ComputerWorkflowOptions){
  const plans=structuredClone(options.steps),initial=structuredClone(options.initialWindow);
  return registry.registerConsequentialControl('computer.lifecycle@1.0.0',async context=>{
    if(context.run.jobId!==options.jobId)throw new ActionFailure('computer_job_not_authorized','policy_rejection');
    if(context.worker.id!==options.workerId)throw new ActionFailure('computer_controller_local_worker_required','policy_rejection');
    const plan=plans[context.step.id];if(!plan)throw new ActionFailure('computer_step_not_authorized','policy_rejection');
    if(plan.approvalPolicy&&!context.run.approvals.includes(plan.approvalPolicy))throw new ActionFailure('computer_approval_missing','policy_rejection');
    const prior=context.inputArtifacts.find(a=>a.name==='computer-continuity');
    const checkpoint:Checkpoint=prior?context.readArtifact(prior.id) as Checkpoint:{schema:'agent-control.computer-continuity/v1',runId:context.run.id,window:initial,evidence:[]};
    if(checkpoint.schema!=='agent-control.computer-continuity/v1'||checkpoint.runId!==context.run.id)throw new ActionFailure('computer_checkpoint_identity_invalid','policy_rejection');
    if(plan.verifyOutput){
      if(!options.output||!options.verifier)throw new ActionFailure('computer_output_verifier_unconfigured','configuration');
      try{
        const last=checkpoint.evidence.at(-1);if(!last||last.status!=='COMPLETE'||!sameComputerWindow(checkpoint.window,initial)||checkpoint.window.role!=='APPLICATION')throw Error('desktop_state_not_verified');
        const proof=await verifyComputerArtifact({...options.output,runId:context.run.id,notBefore:context.run.requestedAt},context.run.id,options.verifier);
        const evidence={...last,taskId:context.run.id,requestedOutcome:context.run.effectiveJob.metadata.description??'Governed desktop workflow',startedAt:context.run.requestedAt,endedAt:new Date().toISOString(),status:'COMPLETE',events:checkpoint.evidence.flatMap(e=>e.events).concat([{at:new Date().toISOString(),phase:'VERIFY',provider:last.provider??'none',taskId:context.run.id,detail:'governed_file_and_application_verification_passed'},{at:new Date().toISOString(),phase:'COMPLETE',provider:last.provider??'none',taskId:context.run.id,detail:'governed_workflow_complete'}]),actions:checkpoint.evidence.flatMap(e=>e.actions),observations:checkpoint.evidence.flatMap(e=>e.observations),transitions:checkpoint.evidence.flatMap(e=>e.transitions??[]),retries:checkpoint.evidence.reduce((n,e)=>n+e.retries,0),providerFallbacks:checkpoint.evidence.reduce((n,e)=>n+e.providerFallbacks,0),videoEvidence:{...last.videoEvidence,status:'VIDEO_UNAVAILABLE'},coordinateFallbacks:checkpoint.evidence.reduce((n,e)=>n+e.coordinateFallbacks,0),approval:{required:Object.values(plans).some(s=>s.approvalPolicy),received:Object.values(plans).filter(s=>s.approvalPolicy).every(s=>context.run.approvals.includes(s.approvalPolicy!))},artifactVerification:proof};
        return{artifacts:[{name:'computer-use-evidence',value:evidence,schema:'agent-control.computer-use/v1',version:'1.0.0'}],verification:['computer-artifact-verified'],detail:'File and application verification passed'};
      }catch(error){context.recordEvidence?.('computer-verification-failure',{status:'VERIFICATION_FAILED',reason:String(error)});throw new ActionFailure(String(error),'verification');}
    }
    if(!plan.task||plan.task.steps.length>1)throw new ActionFailure('computer_task_requires_single_observed_action','configuration');
    const base=new DefaultComputerAuthority();
    const capability=new ComputerUseCapability(options.providers,{authorize(t,a,o){
      if(!o.windowIdentity||!sameComputerWindow(o.windowIdentity,checkpoint.window))return 'BLOCKED';
      const decision=base.authorize(t,a,o);if(decision!=='APPROVAL_REQUIRED')return decision;
      if((a.source&&plan.coordinateApproved)||(a.operation==='screenshot'&&plan.screenshotApproved))return base.authorize(t,{...a,source:undefined,operation:a.operation==='screenshot'?'inspect':a.operation},o);
      return decision;
    }});
    const result=await capability.execute({...plan.task,taskId:context.run.id,target:{machine:options.machine,application:options.application,window:checkpoint.window.key}},context.signal);
    if(plan.approvalPolicy)result.events.unshift({at:result.startedAt,phase:'RESUME',provider:result.provider??'none',taskId:context.run.id,detail:'durable_job_approval_consumed_with_fresh_observation'});
    if(result.status!=='COMPLETE'){context.recordEvidence?.('computer-use-evidence',result);throw new ActionFailure(`computer_workflow_${result.status}:${result.reason??'checks_failed'}`,'verification');}
    const window=result.observations.at(-1)?.windowIdentity;if(!window)throw new ActionFailure('computer_window_provenance_missing','verification');
    const next:Checkpoint={...checkpoint,window,evidence:[...checkpoint.evidence,result]};
    return{artifacts:[{name:'computer-continuity',value:next,schema:next.schema,version:'1.0.0'}],verification:['computer-step-observed'],detail:'Fresh desktop state and continuity retained'};
  },['FILESYSTEM_WRITE']);
}
