import {ActionFailure,ActionRegistry} from './job-runtime.js';
import {ComputerProviderRegistry,ComputerUseCapability,DefaultComputerAuthority,type ComputerTask} from './computer-use.js';
import {PlaywrightComputerProvider} from './computer-use-browser.js';
import {WindowsSkyComputerProvider} from './computer-use-windows.js';
import {ComputerManagedRunController,DeterministicComputerVerifier,type ComputerExecutionLevel,type ComputerWorkflowPrimitive} from './computer-use-managed.js';
import fs from 'node:fs';

function defaultProviders(){
  const providers=new ComputerProviderRegistry().register(new PlaywrightComputerProvider({executablePath:process.env.AGENT_CONTROL_CHROMIUM_EXECUTABLE,allowedPrivateHosts:(process.env.AGENT_CONTROL_BROWSER_ALLOWED_PRIVATE_HOSTS??'').split(',').map(item=>item.trim()).filter(Boolean)}));
  const url=process.env.AGENT_CONTROL_COMPUTER_USE_SKY_URL,tokenFile=process.env.AGENT_CONTROL_COMPUTER_USE_SKY_TOKEN_FILE;
  if(process.platform==='win32'&&url&&tokenFile)providers.register(new WindowsSkyComputerProvider({url,token:fs.readFileSync(tokenFile,'utf8').trim()}));
  return providers;
}
export function registerComputerUseActions(registry=new ActionRegistry(),providers=defaultProviders(),executionWorkerId?:string){
  registry.registerConsequentialControl('computer.use@1.0.0',async context=>{
    if(!executionWorkerId||context.worker.id!==executionWorkerId)throw new ActionFailure('computer_use_controller_local_worker_required','policy_rejection');
    let task:ComputerTask;
    const raw=String(context.parameters.taskJson??'');if(raw.length>65536)throw new ActionFailure('computer_task_too_large','configuration');
    try{task=JSON.parse(raw) as ComputerTask;}catch{throw new ActionFailure('computer_task_json_invalid','configuration');}
    if(!task||typeof task!=='object'||!Array.isArray(task.steps)||!Array.isArray(task.checks))throw new ActionFailure('computer_task_invalid','configuration');
    task.taskId=context.run.id;
    task.target.machine=executionWorkerId;
    const result=await new ComputerUseCapability(providers).execute(task,context.signal);
    context.recordRunEvent?.('JOB_ACCEPTED',{level:'LEGACY_BOUNDED_TASK',provider:result.provider??'unavailable'});context.recordRunEvent?.('PLAN_CREATED',{actions:task.steps.length,checks:task.checks.length});for(const row of result.events){const mapped=row.phase==='OBSERVE'?'OBSERVATION_RECEIVED':row.phase==='ACTION'?'ACTION_COMPLETED':row.phase==='APPROVAL'?'HUMAN_REQUIRED':row.phase==='RECOVERY'&&row.detail==='stable_semantic_target_rebound'?'RETRY_REQUESTED':null;if(mapped)context.recordRunEvent?.(mapped,{provider:row.provider,at:row.at,detail:row.detail,operation:row.operation??null});}if(result.checks.length){context.recordRunEvent?.('VERIFICATION_STARTED',{actor:'agent-control',checks:task.checks.length});context.recordRunEvent?.(result.status==='COMPLETE'?'VERIFICATION_PASSED':'VERIFICATION_FAILED',{provider:result.provider??'unavailable',status:result.status});}context.recordRunEvent?.(result.status==='COMPLETE'?'JOB_SUCCEEDED':'JOB_FAILED',{status:result.status,reason:result.reason??null});
    if(result.status!=='COMPLETE'){
      const artifact=context.recordEvidence?.('computer-use-evidence',result);
      throw new ActionFailure(`computer_use_${result.status.toLowerCase()}:${result.reason??'outcome_unverified'}:${artifact?.id??'evidence_unavailable'}`,result.status==='APPROVAL_REQUIRED'||result.status==='BLOCKED'?'policy_rejection':'execution');
    }
    return {artifacts:[{name:'computer-use-evidence',value:result,schema:'agent-control.computer-use/v1',version:'1.0.0'}],evidence:[`computer_use:${result.status}`,`computer_provider:${result.provider}`],verification:['computer-outcome-observed',...result.checks.filter(item=>item.passed).map(item=>`${item.check.kind}:${item.check.value}`)],detail:`Computer Use ${result.status}; ${result.actions.length} actions, ${result.checks.length} verification checks`};
  },['EXTERNAL_COMMUNICATION','CREDENTIAL_USE']);
  registry.registerConsequentialControl('computer.managed@1.0.0',async context=>{
    if(!executionWorkerId||context.worker.id!==executionWorkerId)throw new ActionFailure('computer_use_controller_local_worker_required','policy_rejection');
    const raw=String(context.parameters.managedJson??'');if(raw.length>131072)throw new ActionFailure('computer_managed_request_too_large','configuration');
    let input:{level:ComputerExecutionLevel;objective:string;target?:{application?:string;browser?:string;window?:string};workflow:ComputerWorkflowPrimitive[];verification:ComputerTask['checks'];providerId?:string;maximumElapsedMs?:number;maximumProviderSpend?:number};
    try{input=JSON.parse(raw) as typeof input;}catch{throw new ActionFailure('computer_managed_json_invalid','configuration');}
    if(!input||!['STEP','MANAGED_RUN'].includes(input.level)||typeof input.objective!=='string'||!Array.isArray(input.workflow)||!Array.isArray(input.verification))throw new ActionFailure('computer_managed_request_invalid','configuration');
    const candidates=providers.candidates({taskId:context.run.id,requestedOutcome:input.objective,target:{machine:executionWorkerId,...input.target},steps:[],checks:input.verification,providerPreference:input.providerId?[input.providerId]:undefined}),provider=candidates[0];if(!provider)throw new ActionFailure('computer_managed_provider_unavailable','execution');
    const capability=provider.capabilities(),result=await new ComputerManagedRunController().execute({runId:context.run.id,level:input.level,objective:input.objective,target:{machine:executionWorkerId,...input.target},workflow:input.workflow,verification:input.verification,maximumElapsedMs:Math.min(Math.max(input.maximumElapsedMs??120000,1000),300000),maximumProviderSpend:Math.max(input.maximumProviderSpend??0,0),provider,providerAdvertisement:{id:provider.id,levels:['STEP','MANAGED_RUN'],capabilities:capability.operations,streamingObservations:false,cancellation:true,humanTakeover:false,nativeVerification:false,persistentSession:capability.persistentSession,externalApi:false,estimatedCost:0},verifier:new DeterministicComputerVerifier(),authority:new DefaultComputerAuthority()},context.signal);
    for(const event of result.events)context.recordRunEvent?.(event.type,{sequence:event.sequence,at:event.at,state:event.state,actor:event.actor,detail:event.detail,previousHash:event.previousHash,hash:event.hash});
    if(result.state!=='VERIFIED'){const artifact=context.recordEvidence?.('computer-managed-run',result);throw new ActionFailure(`computer_managed_${result.state.toLowerCase()}:${result.reason??'unverified'}:${artifact?.id??'evidence_unavailable'}`,result.state==='VERIFICATION_FAILED'?'verification':'execution');}
    return{artifacts:[{name:'computer-managed-run',value:result,schema:result.schema,version:'1.0.0'}],evidence:[`computer_execution_level:${result.level}`,`computer_provider:${result.provider}`,`computer_verifier:${result.verifier}`],verification:['computer-managed-goal-verified'],detail:`${result.level} verified independently after ${result.actions} provider actions`};
  },['EXTERNAL_COMMUNICATION','CREDENTIAL_USE']);
  return registry;
}
