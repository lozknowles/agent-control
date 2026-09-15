import {createHash,randomUUID} from 'node:crypto';
import type {JobRuntime} from './job-runtime.js';
import type {ActionContext} from './job-types.js';
import {registerModelHardwareQualification,validateLabSpec,labSpecDigest,LabAdmissionBlocked,type LabQualificationSpec,type LabAttemptResult,type LabExecutionAdapter} from './model-hardware-qualification.js';
import {createTransportLlamaLabAdapter,type TransportLabProfile} from './transport-llama-lab-adapter.js';
import {TargetLlamaRuntime,type RuntimeTarget} from './target-llama-runtime.js';
import {assessTargetAdmission,validateTargetPolicy,type TargetResourcePolicy,type TargetObservation} from './runtime-target-telemetry.js';
import {createInvocationObservation,type HarnessEfficiencyLedgerPort} from './harness-efficiency.js';
export interface RuntimeBenchmarkSettings {
 schema:'agent-control.runtime-benchmark/v1';spec:LabQualificationSpec;profile:TransportLabProfile;target:RuntimeTarget;policy:TargetResourcePolicy;
 authority:{actor:string;expiresAt:string;allowServiceSuspension:boolean};
}
export interface BenchmarkTargetPort {
 id:string;producer(c:ActionContext):unknown;observe(c:ActionContext):Promise<TargetObservation>;
 platform(c:ActionContext):Promise<Pick<TargetObservation,'batteryPercent'|'charging'|'thermalCelsius'|'thermalStatus'> & {evidence:unknown}>;
 execute(operation:'observe'|'invoke'|'abort',c:ActionContext,payload?:Record<string,unknown>):Promise<any>;
 recover(c:ActionContext,id:string):Promise<{restored:boolean;result?:LabAttemptResult}>;
}
export function createRuntimeBenchmarkAdapter(settings:RuntimeBenchmarkSettings,target:BenchmarkTargetPort):LabExecutionAdapter {
 const policy=validateTargetPolicy(settings.policy);let restored=true;
 const record=(c:ActionContext,name:string,data:unknown)=>{if(!c.recordEvidence)throw Error('runtime_evidence_required');return c.recordEvidence(name,{producer:target.producer(c),at:new Date().toISOString(),data});};
 const admit=async(c:ActionContext)=>{
  let observation:TargetObservation;
  try{observation=await target.observe(c);}catch(error){record(c,'runtime-admission',{decision:'REFUSE',reason:'TELEMETRY_UNAVAILABLE',policy,errorClass:error instanceof Error?error.message:'unknown'});return {available:false,evidence:{reason:'TELEMETRY_UNAVAILABLE'}};}
  const decision=assessTargetAdmission(observation,policy);const evidence=record(c,'runtime-admission',{...decision,workload:settings.spec.id,target:settings.spec.target,observation,policy});
  return {available:decision.allowed,evidence:{id:evidence.id,sha256:evidence.sha256}};
 };
 const adapter=createTransportLlamaLabAdapter({profile:settings.profile,admit,execute:async(value,c)=>{
  c.signal.throwIfAborted();const attemptId=randomUUID();let result:LabAttemptResult;let monitoring=true,thermalRefused=false;restored=false;
  const start=Date.now();
  const cleanup=async()=>{const at=new Date().toISOString();let success=false;try{const recovery=await target.recover(c,attemptId);success=recovery.restored;restored=success;record(c,'runtime-recovery',recovery);}catch{}return {outcome:success?'confirmed' as const:'uncertain' as const,reason:'target-runtime-restoration',requestedAt:at,completedAt:new Date().toISOString(),processes:[]};};
  const finishCleanup=c.retainCleanup?.({kind:'target-runtime',target:settings.spec.target.device,attemptId,producer:target.producer(c)},cleanup);
  const monitor=async()=>{while(monitoring){await new Promise(resolve=>setTimeout(resolve,2000));if(!monitoring)break;try{const observation=await target.platform(c);record(c,'runtime-inflight-telemetry',observation);if(policy.batteryRequired&&(observation.thermalCelsius===null||observation.thermalCelsius>=policy.maximumThermalCelsius||observation.thermalStatus===null||observation.thermalStatus>=policy.maximumThermalStatus)){thermalRefused=true;record(c,'runtime-thermal-abort',{decision:'REFUSE',observation,policy});await target.recover(c,attemptId);break;}}catch{thermalRefused=true;await target.recover(c,attemptId);break;}}};
  const monitored=(policy.batteryRequired?monitor():Promise.resolve()).catch(()=>{thermalRefused=true;});
  try{
   record(c,'runtime-invocation-dispatch',{attemptId,fixture:value.input,model:settings.profile.model,modelSha256:settings.profile.modelSha256,provenance:'AGENT_CONTROL_RUNTIME_EVIDENCE'});
   result=await target.execute('invoke',c,{...value,attemptId,minimumAvailableBytes:policy.minimumAvailableBytes}) as LabAttemptResult;
   restored=(result.rawResponse as any)?.originalServiceRestored===true;
   if(thermalRefused){result.status='FAILED';result.error='thermal_or_telemetry_abort';}
   if(!restored)throw Error('runtime_restoration_unconfirmed');
   record(c,'runtime-postflight',{observation:await target.observe(c),restored,elapsedMs:Date.now()-start});
   const at=new Date().toISOString();finishCleanup?.({outcome:'confirmed',reason:'target-restoration-evidenced',requestedAt:at,completedAt:at,processes:[]});return result;
  }catch(error){await cleanup();throw error;}
  finally{monitoring=false;await monitored;if(!restored)throw Error('runtime_restoration_unconfirmed');}
 }});
 adapter.restore=async()=>({restored,evidence:{producer:'agent-control-runtime',perInvocationRestorationConfirmed:restored}});
 return adapter;
}
/** Product composition: uses the existing JobRuntime, registry, scheduler and evidence store. */
export function registerRuntimeBenchmark(runtime:JobRuntime,raw:RuntimeBenchmarkSettings,efficiency?:HarnessEfficiencyLedgerPort){
 const settings=structuredClone(raw);if(settings.schema!=='agent-control.runtime-benchmark/v1'||!settings.authority?.actor||!Number.isFinite(Date.parse(settings.authority.expiresAt)))throw Error('runtime_benchmark_configuration_invalid');
 if(settings.target.originalService&&!settings.authority.allowServiceSuspension)throw Error('runtime_service_suspension_not_authorised');
 if(settings.target.resource.id!==settings.spec.target.device||settings.target.environment!==settings.spec.target.environment)throw Error('runtime_target_binding_mismatch');
 const spec=validateLabSpec(settings.spec),digest=labSpecDigest(spec),target=new TargetLlamaRuntime(settings.target),adapter=createRuntimeBenchmarkAdapter(settings,target);
 const workerId='runtime-benchmark:'+settings.target.resource.id;
 runtime.workers.registerControllerInternal({id:workerId,capabilities:['model.hardware.qualify'],health:'healthy',capacity:1,active:0,observedAt:new Date().toISOString()});
 registerModelHardwareQualification(runtime.catalog,runtime.actions,{resolve:hash=>{if(hash!==digest)throw Error('runtime_benchmark_unknown_spec');return spec;},authorize:async(s,c)=>{
  if(c.worker.id!==workerId||labSpecDigest(s)!==digest||Date.parse(settings.authority.expiresAt)<=Date.now())throw Error('runtime_benchmark_authority_invalid');
  c.recordEvidence?.('runtime-benchmark-authority',{producer:target.producer(c),authority:settings.authority,specSha256:digest});
 },adapters:[adapter],recordAccounting:async(c,result,id)=>{
  const measurement=c.recordEvidence!('physical-inference-measurement',{schema:'agent-control.physical-inference-experiment/v1',producer:target.producer(c),device:spec.target.device,environment:spec.target.environment,model:spec.target.model,modelSha256:spec.target.modelSha256,runtime:spec.target.runtime,runtimeVersion:settings.profile.runtimeVersion,quantisation:settings.profile.quantisation,config:settings.profile,invocations:[{id:id.id,accountingInvocationId:id.id,startedAt:id.startedAt,endedAt:id.endedAt,status:result.status,request:result.input,output:result.output,usage:{prompt_tokens:result.tokens.input,prompt_tokens_details:{cached_tokens:result.tokens.cached},completion_tokens:result.tokens.output},metrics:result.metrics}],resourceEvidence:result.rawResponse});
  if(efficiency){const rawUsage:any={};if(result.tokens.input!==null)rawUsage.prompt_tokens=result.tokens.input;if(result.tokens.output!==null)rawUsage.completion_tokens=result.tokens.output;if(result.tokens.cached!==null)rawUsage.prompt_tokens_details={cached_tokens:result.tokens.cached};const observation=createInvocationObservation({id:id.id,jobId:c.run.jobId,runId:c.run.id,stepId:c.step.id,taskId:c.run.id,laneId:spec.target.device,model:spec.target.model,provider:spec.target.runtime,harnessProfile:'STANDARD',harnessId:'model-hardware-qualification/v1',executionStrategy:'agent-control-runtime',startedAt:id.startedAt,completedAt:id.endedAt,rawUsage,outcome:result.status==='SUCCEEDED'?'COMPLETE':'FAILED',error:result.error??undefined,recipeFingerprint:digest,evidenceIds:[measurement.id]});Object.assign(observation.accounting!,{machine:spec.target.device,runtime:spec.target.runtime,modelRevision:spec.target.modelSha256,executionKind:'LOCAL'});efficiency.record(observation);}return id.id;
 }});
 return {workerId,specSha256:digest};
}
