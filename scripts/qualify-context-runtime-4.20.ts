import {createHash} from 'node:crypto';
import {createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {spawn, spawnSync, type ChildProcess} from 'node:child_process';
import {
  ContextRuntimeManager,
  classifyContextRuntimeFailure,
  createDurableContextCheckpoint,
  decideContextPressure,
  verifiedOutcomeEconomics,
  type ContextPressureObservation,
  type EvidenceReference,
  type RuntimeOutcomeObservation,
} from '../src/control/context-runtime-management.js';

type Strategy = 'STATIC' | 'ADAPTIVE';
interface TrialSpec {id:string;strategy:Strategy;contextTokens:number;flashAttention:'on'|'off';kvCache:'f16'|'q8_0';reasoning:'on'|'off'}
interface Config {
  schema:string;id:string;version:string;seed:number;taskClass:string;objective:string;
  worker:{id:string;gpuName:string;gpuUuid:string;locality:'LOCAL'};
  model:{id:string;artifact:string;sha256:string;bytes:number;declaredMaximumContextTokens:number};
  runtime:{id:string;binary:string;sha256:string;version:string;isolatedLoopback:boolean;gpuLayers:number;parallel:number};
  safety:{minimumFreeVramBytesBeforeLaunch:number;minimumRetainedVramReserveBytes:number;protectedService:string;maximumTrialMs:number;maximumOutputTokens:number;providerChargeCeiling:number};
  task:{stageOneTransientLines:number;stageTwoTransientLines:number;requirements:string[];validator:string;inputs:unknown[];expected:unknown[]};
  trials:TrialSpec[];capacityProbes:Array<{contextTokens:number;flashAttention?:'on'|'off';kvCache?:'f16'|'q8_0';reasoning?:'on'|'off';expected?:string;execute?:boolean}>;
  integrity:Record<string,unknown>;
}

interface ChatResult {ok:boolean;status:number;elapsedMs:number;content:string|null;reasoning:string|null;usage:{prompt_tokens:number|null;completion_tokens:number|null;total_tokens:number|null;cached_tokens:number|null};timings:Record<string,unknown>|null;error:string|null;bodySha256:string;}

const root=process.cwd();
const configPath=path.resolve(process.argv[2]??'config/context-runtime-benchmark-4.20.json');
const outputPath=path.resolve(process.argv[3]??'docs/evidence/agent-control-4.20-context-runtime/physical-qualification.json');
const logRoot=path.join(path.dirname(outputPath),'runtime-logs');
mkdirSync(logRoot,{recursive:true});
if(process.platform!=='linux')throw Error('context_runtime_physical_qualification_requires_linux');
const config=JSON.parse(readFileSync(configPath,'utf8')) as Config;
if(config.schema!=='agent-control.context-runtime-benchmark/v1'||!config.runtime.isolatedLoopback)throw Error('context_runtime_benchmark_config_invalid');

const stable=(value:unknown):string=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(',')}}`:JSON.stringify(value);
const sha=(value:unknown)=>createHash('sha256').update(typeof value==='string'?value:stable(value)).digest('hex');
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const hashFile=async(file:string)=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');};
const command=(file:string,args:string[])=>{const result=spawnSync(file,args,{encoding:'utf8',timeout:30_000,maxBuffer:4*1024*1024});return {status:result.status,stdout:result.stdout.trim(),stderr:result.stderr.trim()};};
const freePort=()=>new Promise<number>((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(Error('free_port_unavailable'));server.close(error=>error?reject(error):resolve(address.port));});});
const safeJson=async(response:Response)=>{const text=await response.text();try{return {value:JSON.parse(text),text};}catch{return {value:null,text};}};

function gpuSnapshot(){
  const device=command('nvidia-smi',['--query-gpu=uuid,name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu','--format=csv,noheader,nounits']);
  const process=command('nvidia-smi',['--query-compute-apps=pid,process_name,used_memory','--format=csv,noheader,nounits']);
  const fields=device.stdout.split(',').map(value=>value.trim());
  return {at:new Date().toISOString(),uuid:fields[0]??null,name:fields[1]??null,totalMiB:Number(fields[2])||null,usedMiB:Number(fields[3])||null,freeMiB:Number(fields[4])||null,utilisationPercent:Number(fields[5])||0,temperatureCelsius:Number(fields[6])||null,processes:process.stdout?process.stdout.split('\n').map(line=>{const [pid,name,memory]=line.split(',').map(value=>value.trim());return {pid:Number(pid),name,usedMiB:Number(memory)||null};}):[]};
}

async function protectedHealth(){try{const response=await fetch(config.safety.protectedService,{signal:AbortSignal.timeout(5_000)});return {ok:response.ok,status:response.status,bodySha256:sha(await response.text())};}catch(error){return {ok:false,status:0,error:error instanceof Error?error.message:String(error)};}}

function transient(stage:number,count:number){return Array.from({length:count},(_,index)=>`TRANSIENT_RECORD stage=${stage} sequence=${String(index+1).padStart(4,'0')} cache refresh completed normally; this line is not a requirement and must not enter durable job state.`).join('\n');}
const firstRequirements=config.task.requirements.slice(0,3),secondRequirements=config.task.requirements.slice(3);
const stageOne=`ORIGINAL_OBJECTIVE: ${config.objective}\n${firstRequirements.map(value=>`ORIGINAL_EVIDENCE ${value}`).join('\n')}\n${transient(1,config.task.stageOneTransientLines)}\nSummarise only ORIGINAL_OBJECTIVE and ORIGINAL_EVIDENCE. Do not write code yet.`;
const stageTwo=`${secondRequirements.map(value=>`ORIGINAL_EVIDENCE ${value}`).join('\n')}\n${transient(2,config.task.stageTwoTransientLines)}\nFINAL_ACTION: Produce the complete function now.`;
const allRequirements=config.task.requirements.map(value=>`ORIGINAL_EVIDENCE ${value}`).join('\n');
const system='You are a bounded local coding worker. TRANSIENT_RECORD lines are non-authoritative noise. Follow ORIGINAL_OBJECTIVE and ORIGINAL_EVIDENCE only. When asked for code, output exactly one Python function and no explanation.';
const corpus={system,stageOne,stageTwo,requirements:config.task.requirements};

async function chat(port:number,messages:Array<{role:'system'|'user'|'assistant';content:string}>,maxTokens:number):Promise<ChatResult>{
  const started=Date.now();
  try{
    const response=await fetch(`http://127.0.0.1:${port}/v1/chat/completions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:config.model.id,messages,temperature:0,seed:config.seed,max_tokens:maxTokens,stream:false,cache_prompt:false}),signal:AbortSignal.timeout(config.safety.maximumTrialMs)});
    const body=await safeJson(response),choice=(body.value as any)?.choices?.[0]?.message,usage=(body.value as any)?.usage??{},timings=(body.value as any)?.timings??null;
    return {ok:response.ok,status:response.status,elapsedMs:Date.now()-started,content:typeof choice?.content==='string'?choice.content:null,reasoning:typeof choice?.reasoning_content==='string'?choice.reasoning_content:null,usage:{prompt_tokens:Number.isFinite(usage.prompt_tokens)?usage.prompt_tokens:null,completion_tokens:Number.isFinite(usage.completion_tokens)?usage.completion_tokens:null,total_tokens:Number.isFinite(usage.total_tokens)?usage.total_tokens:null,cached_tokens:Number.isFinite(usage.prompt_tokens_details?.cached_tokens)?usage.prompt_tokens_details.cached_tokens:null},timings,error:response.ok?null:String((body.value as any)?.error?.message??body.text.slice(0,500)),bodySha256:sha(body.text)};
  }catch(error){return {ok:false,status:0,elapsedMs:Date.now()-started,content:null,reasoning:null,usage:{prompt_tokens:null,completion_tokens:null,total_tokens:null,cached_tokens:null},timings:null,error:error instanceof Error?error.message:String(error),bodySha256:sha(String(error))};}
}

function validate(source:string|null){
  if(source===null)return {passed:false,reason:'model_content_missing',evidenceSha256:sha('model_content_missing')};
  const validator=path.join(root,'assets/runtime/python-repair-validator.py'),payload=JSON.stringify({source,inputs:config.task.inputs,expected:config.task.expected});
  const result=spawnSync('/usr/bin/bwrap',['--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--ro-bind',validator,'/validator.py','/usr/bin/prlimit','--as=536870912','--cpu=5','--nproc=32','--','/usr/bin/python3','-I','/validator.py'],{input:payload,encoding:'utf8',timeout:15_000,maxBuffer:1024*1024});
  let verdict:any;try{verdict=JSON.parse(result.stdout);}catch{verdict={passed:false,reason:'validator_output_invalid'};}
  return {...verdict,exitCode:result.status,stderrSha256:sha(result.stderr),validatorSha256:sha(readFileSync(validator))};
}

async function waitForServer(port:number,child:ChildProcess){for(let attempt=0;attempt<240;attempt++){if(child.exitCode!==null)throw Error(`runtime_exited_before_ready:${child.exitCode}`);try{const response=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(500)});if(response.ok)return;}catch{}await pause(250);}throw Error('runtime_start_timeout');}

async function stopOwned(child:ChildProcess){
  if(child.exitCode!==null)return {terminated:true,signal:null,exitCode:child.exitCode};
  child.kill('SIGTERM');for(let index=0;index<40&&child.exitCode===null;index++)await pause(100);
  if(child.exitCode===null){child.kill('SIGKILL');for(let index=0;index<20&&child.exitCode===null;index++)await pause(100);}
  return {terminated:child.exitCode!==null,signal:child.signalCode,exitCode:child.exitCode};
}

async function runServerTrial(spec:TrialSpec|{id:string;strategy:'PROBE';contextTokens:number;flashAttention:'on'|'off';kvCache:'f16'|'q8_0';reasoning:'on'|'off'}){
  const before=gpuSnapshot(),freeBytes=(before.freeMiB??0)*1024*1024;
  if(before.uuid!==config.worker.gpuUuid)throw Error('physical_worker_gpu_identity_changed');
  if(freeBytes<config.safety.minimumFreeVramBytesBeforeLaunch)return {id:spec.id,strategy:spec.strategy,configuration:spec,status:'BLOCKED',failureClass:'MEMORY_CAPACITY_FAILURE',reason:'minimum_free_vram_not_available',before};
  const port=await freePort(),logPath=path.join(logRoot,`${spec.id}.log`),logHandle=await import('node:fs').then(module=>module.openSync(logPath,'w',0o600));
  const args=['-n','10',config.runtime.binary,'--model',config.model.artifact,'--host','127.0.0.1','--port',String(port),'--alias',config.model.id,'--ctx-size',String(spec.contextTokens),'--n-gpu-layers',String(config.runtime.gpuLayers),'--parallel',String(config.runtime.parallel),'--no-webui','--no-warmup','--flash-attn',spec.flashAttention,'--cache-type-k',spec.kvCache,'--cache-type-v',spec.kvCache,'--reasoning',spec.reasoning];
  const child=spawn('/usr/bin/nice',args,{stdio:['ignore',logHandle,logHandle],env:{PATH:process.env.PATH,LANG:'C.UTF-8',CUDA_VISIBLE_DEVICES:'0'}});
  const startedAt=new Date().toISOString(),started=Date.now(),samples:any[]=[];let interval:NodeJS.Timeout|undefined;
  try{
    await waitForServer(port,child);interval=setInterval(()=>{try{const sample=gpuSnapshot(),rss=child.pid&&existsSync(`/proc/${child.pid}/status`)?Number(readFileSync(`/proc/${child.pid}/status`,'utf8').match(/^VmRSS:\s+(\d+) kB/m)?.[1]??0)*1024:null;samples.push({...sample,ownedPid:child.pid,rssBytes:rss});}catch{}},500);
    const models=await fetch(`http://127.0.0.1:${port}/v1/models`,{signal:AbortSignal.timeout(5_000)}).then(response=>response.json());
    if(spec.strategy==='PROBE'){
      const probe=await chat(port,[{role:'system',content:'Reply with exactly OK.'},{role:'user',content:'OK'}],16),verification={passed:probe.content?.trim()==='OK',expected:'OK',actual:probe.content};
      return {id:spec.id,strategy:spec.strategy,configuration:spec,status:probe.ok?'COMPLETED':'FAILED',providerReportedCompletion:probe.ok,verification,models,probe,before,startedAt,elapsedMs:Date.now()-started,samples};
    }
    const manager=new ContextRuntimeManager(undefined,()=>new Date().toISOString());manager.recordEvent(spec.id,'ADMISSION',{contextTokens:spec.contextTokens,flashAttention:spec.flashAttention,kvCache:spec.kvCache,reasoning:spec.reasoning},[]);
    const stageOneResult=await chat(port,[{role:'system',content:system},{role:'user',content:stageOne}],256),stageUsage=stageOneResult.usage.total_tokens??stageOneResult.usage.prompt_tokens;
    const projected=stageUsage===null?null:stageUsage+Math.ceil(stageTwo.length/4)+config.safety.maximumOutputTokens;
    const observation:ContextPressureObservation={at:new Date().toISOString(),configuredCapacityTokens:spec.contextTokens,currentUsageTokens:stageUsage,peakUsageTokens:stageUsage,projectedNextUsageTokens:projected,inputTokens:stageOneResult.usage.prompt_tokens,generatedTokens:stageOneResult.usage.completion_tokens,cachedTokens:stageOneResult.usage.cached_tokens,ramBytes:null,vramBytes:null,authority:stageUsage===null?'UNKNOWN':'MEASURED',source:'llama.cpp_usage_plus_derived_next_turn_projection'};
    const pressure=decideContextPressure('AGENT',observation,['CHECKPOINT','COMPACTION','RETRIEVAL','REROUTE'],'CHECKPOINT_COMPACT_RETRIEVE');manager.recordEvent(spec.id,'PRESSURE',{observation,decision:pressure},[stageOneResult.bodySha256]);
    const stageOneEvidence:EvidenceReference={id:`${spec.id}:stage-one`,kind:'ORIGINAL_EVIDENCE',sha256:sha(stageOne),source:'frozen-corpus'},summaryEvidence:EvidenceReference={id:`${spec.id}:model-summary`,kind:'MODEL_GENERATED_SUMMARY',sha256:sha(stageOneResult.content??''),source:'local-model'};
    const checkpoint=createDurableContextCheckpoint({jobId:spec.id,objective:config.objective,constraints:['TRANSIENT_RECORD lines are non-authoritative','independent validation is mandatory'],decisions:[`strategy:${spec.strategy}`,`pressure_action:${pressure.action}`],completedSteps:['stage-one-observed'],outstandingWork:['retrieve remaining requirements','produce function','independently verify'],nextAction:'produce and verify the frozen function',budgetState:{remainingTokens:Math.max(0,spec.contextTokens-(stageUsage??spec.contextTokens)),remainingProviderCharge:0,currency:'USD'},evidence:[stageOneEvidence,summaryEvidence],summary:{text:stageOneResult.content??'summary unavailable',kind:'MODEL_GENERATED_SUMMARY',sourceEvidenceIds:[stageOneEvidence.id,summaryEvidence.id]},verificationResults:[],parentCheckpointId:null});manager.recordEvent(spec.id,'CHECKPOINT',{id:checkpoint.id,sha256:checkpoint.sha256},[checkpoint.sha256]);
    const compact=spec.strategy==='ADAPTIVE'&&pressure.action==='CHECKPOINT_COMPACT_RETRIEVE';
    if(compact)manager.recordEvent(spec.id,'COMPACTION',{kind:'CONTEXT_RESET',summaryKind:'MODEL_GENERATED_SUMMARY',originalEvidenceRetained:true},[checkpoint.sha256]);
    const finalMessages=compact?
      [{role:'system' as const,content:system},{role:'user' as const,content:`DURABLE_CHECKPOINT objective: ${config.objective}\nMODEL_GENERATED_SUMMARY (not original evidence): ${stageOneResult.content??'unavailable'}\nRETRIEVED_STATE from original evidence:\n${allRequirements}\nFINAL_ACTION: Produce the complete function now.`}]:
      [{role:'system' as const,content:system},{role:'user' as const,content:stageOne},{role:'assistant' as const,content:stageOneResult.content??'Summary unavailable.'},{role:'user' as const,content:stageTwo}];
    if(compact)manager.recordEvent(spec.id,'RETRIEVAL',{source:'frozen-original-evidence',requirements:config.task.requirements.length},[sha(allRequirements)]);
    const finalResult=stageOneResult.ok?await chat(port,finalMessages,config.safety.maximumOutputTokens):{...stageOneResult,error:`stage_one_failed:${stageOneResult.error}`},verification=validate(finalResult.content),providerReportedCompletion=finalResult.ok&&finalResult.content!==null,verified=providerReportedCompletion&&verification.passed===true;
    const failureClass=verified?null:classifyContextRuntimeFailure({contextExhausted:/context|token|prompt.*large/i.test(finalResult.error??''),qualityFailed:providerReportedCompletion&&!verification.passed,runtimeMisconfigured:!stageOneResult.ok&&!/context|token/i.test(stageOneResult.error??'')});
    manager.recordEvent(spec.id,'VERIFICATION',{passed:verification.passed===true,providerReportedCompletion,failureClass},[verification.validatorSha256??sha(verification)]);manager.recordEvent(spec.id,'TERMINAL',{outcome:verified?'SUCCEEDED':'FAILED',failureClass},[]);
    const durationMs=Date.now()-started,outcome:RuntimeOutcomeObservation={taskClass:config.taskClass,candidateId:`${config.model.id}:${spec.flashAttention}:${spec.kvCache}:${spec.reasoning}`,modelId:config.model.id,workerId:config.worker.id,runtimeId:config.runtime.id,profile:'AGENT',configuredContextTokens:spec.contextTokens,providerReportedCompletion,verification:verified?'PASSED':providerReportedCompletion?'FAILED':'UNAVAILABLE',peakContextTokens:Math.max(stageUsage??0,finalResult.usage.total_tokens??0)||null,repairs:0,durationMs,providerCharge:0,evidence:[stageOneResult.bodySha256,finalResult.bodySha256,checkpoint.sha256,verification.validatorSha256??sha(verification)],observedAt:new Date().toISOString()};manager.recordOutcome(outcome);
    return {id:spec.id,strategy:spec.strategy,configuration:spec,status:verified?'VERIFIED':'FAILED',providerReportedCompletion,verified,verification,failureClass,pressure,compactions:compact?1:0,checkpoints:1,retrievals:compact?1:0,reroutes:0,repairs:0,checkpoint:{id:checkpoint.id,sha256:checkpoint.sha256,summaryKind:checkpoint.summary.kind,originalEvidenceRetained:true},stageOne:stageOneResult,final:finalResult,models,before,startedAt,elapsedMs:durationMs,samples,ledger:manager.projection(),economics:verifiedOutcomeEconomics([outcome])};
  }catch(error){return {id:spec.id,strategy:spec.strategy,configuration:spec,status:'FAILED',failureClass:'RUNTIME_CONFIGURATION_FAILURE',reason:error instanceof Error?error.message:String(error),before,startedAt,elapsedMs:Date.now()-started,samples};}
  finally{if(interval)clearInterval(interval);const cleanup=await stopOwned(child);(await import('node:fs')).closeSync(logHandle);const after=gpuSnapshot(),health=await protectedHealth();(globalThis as any).__lastCleanup={cleanup,after,health,logPath:path.relative(root,logPath)};}
}

const startedAt=new Date().toISOString(),configSha256=await hashFile(configPath),modelSha256=await hashFile(config.model.artifact),runtimeSha256=await hashFile(config.runtime.binary);
if(modelSha256!==config.model.sha256||runtimeSha256!==config.runtime.sha256)throw Error('context_runtime_artifact_hash_changed');
const protectedBefore=await protectedHealth();if(!protectedBefore.ok)throw Error('protected_service_not_healthy_before_qualification');
const gpuBefore=gpuSnapshot(),baselinePids=gpuBefore.processes.map(item=>item.pid).sort((a,b)=>a-b),trials:any[]=[];
for(const spec of config.trials){const result=await runServerTrial(spec),cleanup=(globalThis as any).__lastCleanup;trials.push({...result,cleanup});if(!cleanup?.health?.ok||!cleanup?.cleanup?.terminated)throw Error(`runtime_cleanup_or_protected_health_failed:${spec.id}`);}
const probes:any[]=[];
for(const probe of config.capacityProbes){if(probe.execute===false){probes.push({...probe,status:'UNSUPPORTED',reason:probe.expected??'not_executed'});continue;}const result=await runServerTrial({id:`capacity-${probe.contextTokens}`,strategy:'PROBE',contextTokens:probe.contextTokens,flashAttention:probe.flashAttention??'on',kvCache:probe.kvCache??'q8_0',reasoning:probe.reasoning??'off'}),cleanup=(globalThis as any).__lastCleanup;probes.push({...result,cleanup});if(!cleanup?.health?.ok||!cleanup?.cleanup?.terminated)throw Error(`runtime_cleanup_or_protected_health_failed:capacity-${probe.contextTokens}`);}
const protectedAfter=await protectedHealth(),gpuAfter=gpuSnapshot(),finalPids=gpuAfter.processes.map(item=>item.pid).sort((a,b)=>a-b),protectedProcessesPreserved=baselinePids.every(pid=>finalPids.includes(pid));
const base8=trials.find(item=>item.id==='adaptive-8k-base'),flash8=trials.find(item=>item.id==='adaptive-8k-flash'),kv8=trials.find(item=>item.id==='adaptive-8k-flash-kvq8'),reasoning8=trials.find(item=>item.id==='adaptive-8k-flash-kvq8-reasoning');
const report={schema:'agent-control.context-runtime-physical-qualification/v1',benchmarkId:config.id,startedAt,completedAt:new Date().toISOString(),configSha256,corpusSha256:sha(corpus),model:{...config.model,observedSha256:modelSha256},runtime:{...config.runtime,observedSha256:runtimeSha256},worker:config.worker,safety:{...config.safety,protectedBefore,protectedAfter,protectedProcessesPreserved,baselinePids,finalPids,gpuBefore,gpuAfter},integrity:config.integrity,trials,capacityProbes:probes,comparisons:{staticVersusAdaptive:{context8192:{static:trials.find(item=>item.id==='static-8k-base')?.status,adaptive:base8?.status},context16384:{static:trials.find(item=>item.id==='static-16k-base')?.status,adaptive:trials.find(item=>item.id==='adaptive-16k-base')?.status}},runtimeTechniques:{flashAttention:{control:base8?.status,candidate:flash8?.status,controlElapsedMs:base8?.elapsedMs??null,candidateElapsedMs:flash8?.elapsedMs??null},kvCacheQ8:{control:flash8?.status,candidate:kv8?.status,controlElapsedMs:flash8?.elapsedMs??null,candidateElapsedMs:kv8?.elapsedMs??null},reasoning:{control:kv8?.status,candidate:reasoning8?.status,controlElapsedMs:kv8?.elapsedMs??null,candidateElapsedMs:reasoning8?.elapsedMs??null}}},qualification:{realLocalModel:true,realWorker:true,measurableContextPressure:trials.some(item=>item.pressure?.pressurePercent!==null),governedContextManagement:trials.some(item=>item.compactions>0),durableState:trials.some(item=>item.checkpoint?.sha256),successfulContinuation:trials.some(item=>item.strategy==='ADAPTIVE'&&item.verified),independentVerification:trials.some(item=>item.verification?.passed===true),checkpointContextResetResume:trials.some(item=>item.compactions>0&&item.verified),runtimeReroute:false},unknown:{energy:'UNAVAILABLE',providerCachedTokens:trials.every(item=>item.final?.usage?.cached_tokens===null)?'UNAVAILABLE':'PARTIAL',monetaryLocalCompute:'UNAVAILABLE'},productionChanged:false};
mkdirSync(path.dirname(outputPath),{recursive:true});writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({outputPath,reportSha256:await hashFile(outputPath),trialResults:trials.map(item=>({id:item.id,status:item.status,failureClass:item.failureClass??null,pressure:item.pressure?.pressurePercent??null,compactions:item.compactions??0,verified:item.verified??false})),capacityProbes:probes.map(item=>({contextTokens:item.configuration?.contextTokens??item.contextTokens,status:item.status,verified:item.verification?.passed??false})),protectedServicePreserved:protectedBefore.ok&&protectedAfter.ok&&protectedProcessesPreserved,productionChanged:false},null,2));
