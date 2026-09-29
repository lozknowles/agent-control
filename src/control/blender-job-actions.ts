import type {ActionContext} from './job-types.js';
import {ActionRegistry} from './job-runtime.js';
import {executeBlenderSkill,type BlenderCapability,type BlenderExecutionPort,type BlenderSkillRequest} from './blender-skill.js';

export const BLENDER_JOB_ACTION='blender.execute@1.0.0';
export type BlenderPortFactory=(context:ActionContext)=>BlenderExecutionPort;
const text=(value:unknown,name:string)=>{if(typeof value!=='string'||!value.trim())throw new Error(`blender_parameter_required:${name}`);return value;};
const list=(value:unknown,name:string)=>{try{const parsed=JSON.parse(text(value,name));if(!Array.isArray(parsed)||parsed.some(item=>typeof item!=='string'))throw new Error();return parsed as string[];}catch{throw new Error(`blender_parameter_invalid:${name}`);}};
const object=(value:unknown)=>{try{const parsed=JSON.parse(text(value,'parameters'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed as Record<string,unknown>;}catch{throw new Error('blender_parameter_invalid:parameters');}};

export function registerBlenderJobActions(actions:ActionRegistry,port:BlenderPortFactory){
  actions.registerControl(BLENDER_JOB_ACTION,async context=>{const p=context.parameters,request:BlenderSkillRequest={jobId:context.run.id,capability:text(p.capability,'capability') as BlenderCapability,targetBlendSha256:typeof p.targetBlendSha256==='string'&&p.targetBlendSha256?p.targetBlendSha256:null,parameters:object(p.parameters),...(typeof p.pythonSource==='string'&&p.pythonSource?{pythonSource:p.pythonSource}:{}),inputArtifacts:context.inputArtifacts.map(item=>({id:item.id,sha256:item.sha256})),expectedArtifacts:list(p.expectedArtifacts,'expectedArtifacts'),validation:list(p.validation,'validation'),rollbackRef:typeof p.rollbackRef==='string'&&p.rollbackRef?p.rollbackRef:null};const receipt=await executeBlenderSkill(request,port(context),context.signal);return{artifacts:[{name:'blender-execution-receipt',type:'application/json',schema:receipt.schema,version:'1.0.0',value:receipt}],evidence:[`blender-scene-sha256:${receipt.resultingSceneSha256}`,...receipt.artifacts.map(item=>`blender-artifact:${item.name}:${item.sha256}`)],verification:['blender-skill-contract-verified',...receipt.validation]};});
  return actions;
}
