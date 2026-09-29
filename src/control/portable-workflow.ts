import type {BlenderProcedure} from './blender-procedure.js';

export type PortableWorkflowPrimitive=
 | {id:string;kind:'TASK';objective:string;steps:PortableWorkflowPrimitive[]}
 | {id:string;kind:'ACTION';capability:string;parameters:Record<string,unknown>}
 | {id:string;kind:'ASSERT'|'VERIFY';rules:string[]}
 | {id:string;kind:'IF';condition:string;then:PortableWorkflowPrimitive[];otherwise?:PortableWorkflowPrimitive[]}
 | {id:string;kind:'LOOP';until:string;maximumIterations:number;steps:PortableWorkflowPrimitive[]}
 | {id:string;kind:'PARALLEL';steps:PortableWorkflowPrimitive[]}
 | {id:string;kind:'RETRY';maximumAttempts:number;steps:PortableWorkflowPrimitive[]}
 | {id:string;kind:'WAIT';milliseconds:number}
 | {id:string;kind:'HUMAN_APPROVAL';reason:string;takeoverAllowed:boolean}
 | {id:string;kind:'SUCCEED'|'FAIL';reason:string};

export interface PortableWorkflow{
 schema:'agent-control.portable-workflow/v1';id:string;version:'1.0.0';objective:string;
 source:{kind:'LEARNED_PROCEDURE'|'AUTHORED';id:string;sha256?:string;jobs:string[]};
 prerequisites:string[];parameters:string[];steps:PortableWorkflowPrimitive[];completionCriteria:string[];limitations:string[];
}

export function validatePortableWorkflow(workflow:PortableWorkflow){
 if(!workflow.id||!workflow.objective||!workflow.steps.length||!workflow.completionCriteria.length)throw Error('portable_workflow_invalid');
 const ids=new Set<string>();let total=0,actions=0;
 const visit=(steps:PortableWorkflowPrimitive[])=>{for(const step of steps){if(++total>256||!step.id||ids.has(step.id))throw Error('portable_workflow_structure_invalid');ids.add(step.id);if(step.kind==='ACTION'){actions++;if(!step.capability)throw Error('portable_workflow_capability_required');}if(step.kind==='RETRY'&&(step.maximumAttempts<1||step.maximumAttempts>3))throw Error('portable_workflow_retry_invalid');if(step.kind==='LOOP'&&(step.maximumIterations<1||step.maximumIterations>16))throw Error('portable_workflow_loop_invalid');if(step.kind==='WAIT'&&(step.milliseconds<0||step.milliseconds>30000))throw Error('portable_workflow_wait_invalid');if(step.kind==='TASK'||step.kind==='RETRY'||step.kind==='LOOP'||step.kind==='PARALLEL')visit(step.steps);if(step.kind==='IF'){visit(step.then);visit(step.otherwise??[]);}}};
 visit(workflow.steps);return{steps:total,actions};
}

export function blenderProcedureToPortableWorkflow(procedure:BlenderProcedure):PortableWorkflow{
 const steps:PortableWorkflowPrimitive[]=procedure.steps.map(step=>{const action:PortableWorkflowPrimitive={id:`${step.id}:action`,kind:'ACTION',capability:step.capability,parameters:structuredClone(step.parameters)},verify:PortableWorkflowPrimitive={id:`${step.id}:verify`,kind:'VERIFY',rules:[...step.checkpoint]},body=[action,verify];return{id:step.id,kind:'TASK',objective:`Execute ${step.capability} and verify its checkpoint`,steps:step.recovery.onFailure==='RETRY_ONCE'?[{id:`${step.id}:retry`,kind:'RETRY',maximumAttempts:2,steps:body}]:body};});
 const workflow:PortableWorkflow={schema:'agent-control.portable-workflow/v1',id:`blender-${procedure.id}`,version:'1.0.0',objective:`Replay learned Blender procedure ${procedure.id}`,source:{kind:'LEARNED_PROCEDURE',id:procedure.id,sha256:procedure.sha256,jobs:[...procedure.sourceJobs]},prerequisites:[...procedure.prerequisites],parameters:[...procedure.parameters],steps:[...steps,{id:'workflow:verify',kind:'VERIFY',rules:[...procedure.completionCriteria]},{id:'workflow:succeed',kind:'SUCCEED',reason:'All procedure and completion checks passed'}],completionCriteria:[...procedure.completionCriteria],limitations:[...procedure.limitations,'Compilation preserves semantic Blender capabilities; provider-specific execution remains behind the Blender capability port.']};
 validatePortableWorkflow(workflow);return workflow;
}
