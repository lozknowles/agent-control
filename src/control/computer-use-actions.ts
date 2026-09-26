import {ActionFailure,ActionRegistry} from './job-runtime.js';
import {ComputerProviderRegistry,ComputerUseCapability,type ComputerTask} from './computer-use.js';
import {PlaywrightComputerProvider} from './computer-use-browser.js';
import {WindowsSkyComputerProvider} from './computer-use-windows.js';
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
    if(result.status!=='COMPLETE'){
      const artifact=context.recordEvidence?.('computer-use-evidence',result);
      throw new ActionFailure(`computer_use_${result.status.toLowerCase()}:${result.reason??'outcome_unverified'}:${artifact?.id??'evidence_unavailable'}`,result.status==='APPROVAL_REQUIRED'||result.status==='BLOCKED'?'policy_rejection':'execution');
    }
    return {artifacts:[{name:'computer-use-evidence',value:result,schema:'agent-control.computer-use/v1',version:'1.0.0'}],evidence:[`computer_use:${result.status}`,`computer_provider:${result.provider}`],verification:['computer-outcome-observed',...result.checks.filter(item=>item.passed).map(item=>`${item.check.kind}:${item.check.value}`)],detail:`Computer Use ${result.status}; ${result.actions.length} actions, ${result.checks.length} verification checks`};
  },['EXTERNAL_COMMUNICATION','CREDENTIAL_USE']);
  return registry;
}
