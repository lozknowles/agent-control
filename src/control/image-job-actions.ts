import type {ActionContext} from './job-types.js';
import {ActionRegistry} from './job-runtime.js';
import {GovernedImageRuntime,ingestImageAttachment,type ImageArtifactRole,type ImageJobRequest} from './image-capability.js';

export const IMAGE_JOB_ACTION='image.execute@1.0.0';

type StoredImage={schema:'agent-control.stored-image/v1';bytesBase64:string;mimeType:string;originalFilename:string;width:number;height:number;role?:ImageArtifactRole};
const requiredString=(value:unknown,name:string)=>{if(typeof value!=='string'||!value.trim())throw new Error(`image_parameter_required:${name}`);return value;};
const finite=(value:unknown,name:string)=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)throw new Error(`image_parameter_invalid:${name}`);return value;};
const optionalNumber=(value:unknown)=>value===undefined||value===null?null:typeof value==='number'&&Number.isFinite(value)?value:(()=>{throw new Error('image_budget_invalid');})();

function attachment(context:ActionContext,id:string){const value=context.readArtifact(id) as Partial<StoredImage>;if(value.schema!=='agent-control.stored-image/v1'||typeof value.bytesBase64!=='string'||typeof value.mimeType!=='string'||typeof value.originalFilename!=='string')throw new Error('image_input_artifact_invalid');return ingestImageAttachment({jobId:context.run.id,bytes:Buffer.from(value.bytesBase64,'base64'),mimeType:value.mimeType,originalFilename:value.originalFilename,width:finite(value.width,'inputWidth'),height:finite(value.height,'inputHeight'),role:value.role??'source'});}

export function registerImageJobActions(actions:ActionRegistry,runtime:GovernedImageRuntime){
  actions.registerControl(IMAGE_JOB_ACTION,async context=>{
    const parameters=context.parameters,attachments=context.inputArtifacts.map(item=>attachment(context,item.id));
    const request:ImageJobRequest={jobId:context.run.id,operation:requiredString(parameters.operation,'operation') as ImageJobRequest['operation'],instruction:requiredString(parameters.instruction,'instruction'),attachments,width:finite(parameters.width,'width'),height:finite(parameters.height,'height'),outputFormat:requiredString(parameters.outputFormat,'outputFormat'),privacy:requiredString(parameters.privacy,'privacy') as ImageJobRequest['privacy'],route:{mode:requiredString(parameters.routeMode,'routeMode') as ImageJobRequest['route']['mode'],...(typeof parameters.provider==='string'&&parameters.provider?{provider:parameters.provider}:{}),...(typeof parameters.model==='string'&&parameters.model?{model:parameters.model}:{})},budget:{maximumCost:optionalNumber(parameters.maximumCost),maximumElapsedMs:optionalNumber(parameters.maximumElapsedMs),allowExternal:parameters.allowExternal===true},parameters:{...(typeof parameters.seed==='number'?{seed:parameters.seed}:{})}};
    const result=await runtime.execute(request,context.signal);
    return{artifacts:[{name:'image-output',type:result.artifact.mimeType,schema:'agent-control.stored-image/v1',version:'1.0.0',value:{schema:'agent-control.stored-image/v1',bytesBase64:Buffer.from(result.artifact.bytes).toString('base64'),mimeType:result.artifact.mimeType,originalFilename:`${context.run.id}.${result.artifact.mimeType.split('/')[1]}`,width:result.artifact.width,height:result.artifact.height,sha256:result.artifact.sha256,jobId:context.run.id}},{name:'image-evidence',type:'application/json',schema:result.evidence.schema,version:'1.0.0',value:result.evidence}],evidence:[`image-provider:${result.evidence.provider.id}`,`image-output-sha256:${result.artifact.sha256}`],verification:result.evidence.verification};
  });
  return actions;
}
