import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {JobCatalog} from '../src/control/job-catalog.js';
import {ActionRegistry, ArtifactStore, JobRuntime, ResourceLockManager, RunLedger, WorkerRegistry} from '../src/control/job-runtime.js';
import type {JobDefinition} from '../src/control/job-types.js';
import {WorkParcelCoordinator, WorkParcelStore, type WorkParcelPlan} from '../src/control/work-parcels.js';

type Invocation = {branch: string; startedAt: string; endedAt: string; elapsedMs: number; sessionId: string};
const delays: Record<string, number> = {left: 180, centre: 220, right: 260};
const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const iso = () => new Date().toISOString();

function concurrency(invocations: Invocation[]) {
  const points = invocations.flatMap(item => [{at: Date.parse(item.startedAt), change: 1}, {at: Date.parse(item.endedAt), change: -1}]).sort((a,b) => a.at - b.at || b.change - a.change);
  let active = 0, maximum = 0;
  for (const point of points) { active += point.change; maximum = Math.max(maximum, active); }
  return maximum;
}

function job(id: string, action: string): JobDefinition {
  return {apiVersion:'agent-control/v1',kind:'Job',metadata:{id,name:id,version:'1.0.0'},spec:{priority:'normal',concurrency:'queue',steps:[{id:'work',action,requires:['qualification.local'],outputs:[{name:'result',type:'application/json',schema:`${id}/v1`,version:'1.0.0'}],verification:['passed']}]}};
}

async function agentControlRun() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-pisper-comparison-'));
  try {
    const invocations: Invocation[] = [], actions = new ActionRegistry();
    for (const branch of Object.keys(delays)) actions.register(`${branch}@1.0.0`, async () => {
      const startedAt = iso(); await sleep(delays[branch]); const endedAt = iso();
      invocations.push({branch,startedAt,endedAt,elapsedMs:Date.parse(endedAt)-Date.parse(startedAt),sessionId:`ac-run-${branch}`});
      return {artifacts:[{name:'result',value:{branch,verified:true}}],verification:['passed']};
    });
    actions.register('join@1.0.0', async context => ({artifacts:[{name:'result',value:{batonSha256:context.run.trigger.parcelContext?.baton?.sha256 ?? null}}],verification:['passed']}));
    const catalog = new JobCatalog(actions.ids());
    for (const branch of Object.keys(delays)) catalog.addJob(job(`${branch}-job`,`${branch}@1.0.0`));
    catalog.addJob(job('join-job','join@1.0.0'));
    const workers = new WorkerRegistry().register({id:'comparison-host',capabilities:['qualification.local'],health:'healthy',capacity:3,active:0,observedAt:iso()});
    const runtime = new JobRuntime(catalog,actions,workers,new RunLedger(path.join(root,'runs.json')),new ArtifactStore(path.join(root,'artifacts')),new ResourceLockManager(path.join(root,'locks.json')),{approval:()=>true});
    const branches = Object.keys(delays), plan: WorkParcelPlan = {objective:'Inspect three independent bounded partitions, then reconcile verified results.',planner:{kind:'deterministic',reason:'Pinned physical scheduler comparison'},stages:[...branches.map(branch=>({id:branch,name:`Inspect ${branch}`,job:`${branch}-job@1.0.0`})),{id:'join',name:'Reconcile',job:'join-job@1.0.0',dependsOn:branches}]};
    const coordinator = new WorkParcelCoordinator(runtime,new WorkParcelStore(path.join(root,'parcels.json')),{plan:()=>plan});
    const started = Date.now(), parcel = await coordinator.submit(plan.objective,'comparison-operator');
    await coordinator.tick();
    const dispatches = branches.map(()=>runtime.dispatch()).filter((value): value is NonNullable<typeof value> => Boolean(value));
    await Promise.all(dispatches.map(value=>value.completion));
    await coordinator.tick(); await runtime.tick(); await coordinator.tick();
    const completed = coordinator.get(parcel.id), ended = Date.now();
    return {runtime:'Agent Control 4.4',schedulerPath:'WorkParcelCoordinator -> JobRuntime.dispatch',status:completed.status,wallClockMs:ended-started,serialBranchMs:Object.values(delays).reduce((sum,value)=>sum+value,0),maximumConcurrentInvocations:concurrency(invocations),modelCalls:invocations.length,failures:0,retries:0,invocations,branchIsolation:{distinctRunIds:new Set(invocations.map(item=>item.sessionId)).size===invocations.length,workerCapacity:3},join:{status:completed.stages.find(stage=>stage.id==='join')?.status,batonSha256:completed.stages.find(stage=>stage.id==='join')?.baton?.sha256 ?? null},evidence:{parcelId:completed.id,auditEvents:completed.audit.timeline.length,criteria:completed.context?.criteria.map(item=>({id:item.id,status:item.status}))},recovery:{exercisedInMatchedRun:false,reason:'The identical success workload did not inject a failure; restart, retry and failed-dependency behavior remains covered by the full production suite.'},usage:{authority:'unavailable',inputTokens:null,outputTokens:null,cachedTokens:null,contextTokens:null,contextLimit:null,cost:null,reason:'Deterministic scheduler adapter made no external provider call; no token, cache, context or billing values were inferred.'}};
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
}

async function pisperRun(pisperRoot: string) {
  const module = await import(pathToFileURL(path.join(pisperRoot,'runtime/services/workflow-service.mjs')).href) as {WorkflowService:new(options:unknown)=>any};
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'pisper-agent-control-comparison-')), invocations: Invocation[] = [];
  let active=0, maximumConcurrentInvocations=0;
  const service = new module.WorkflowService({path:path.join(root,'workflows.json'),cwd:root,agent:{validateDirectory:async(value:string)=>value,abort:async()=>true,prompt:async({message,onSession}:{message:string;onSession?:(id:string)=>void})=>{
    const branch = Object.keys(delays).find(value=>message.includes(`Inspect ${value}`)); if(!branch) throw new Error('comparison_branch_unresolved');
    const sessionId=`pisper-session-${branch}`; onSession?.(sessionId); active+=1; maximumConcurrentInvocations=Math.max(maximumConcurrentInvocations,active); const startedAt=iso();
    await sleep(delays[branch]); const endedAt=iso(); active-=1; invocations.push({branch,startedAt,endedAt,elapsedMs:Date.parse(endedAt)-Date.parse(startedAt),sessionId});
    return {sessionId,text:JSON.stringify({branch,verified:true}),assets:[]};
  }},notifications:{notify:async()=>{}}});
  try {
    await service.init(); const branches=Object.keys(delays), workflow=await service.create({name:'Agent Control governed comparison',status:'published',nodes:[{id:'trigger',kind:'trigger',label:'Trigger'},{id:'parallel',kind:'parallel',label:'Parallel'},...branches.map(branch=>({id:branch,kind:'prompt',label:`Inspect ${branch}`,prompt:`Inspect ${branch}`})),{id:'join',kind:'notification',label:'Reconcile'}],edges:[{id:'trigger-parallel',source:'trigger',target:'parallel'},...branches.map(branch=>({id:`parallel-${branch}`,source:'parallel',target:branch})),...branches.map(branch=>({id:`${branch}-join`,source:branch,target:'join'}))]});
    const started=Date.now(), submitted=await service.runNow(workflow.id); let completed;
    for(let index=0;index<500;index+=1){completed=service.getRun(submitted.id);if(completed?.status!=='running')break;await sleep(10);} const ended=Date.now();
    if(!completed||completed.status==='running')throw new Error('pisper_comparison_timeout');
    return {runtime:'Pisper 0.5.41',schedulerPath:'WorkflowService.execute -> memoized executeNode promises',status:completed.status,wallClockMs:ended-started,serialBranchMs:Object.values(delays).reduce((sum,value)=>sum+value,0),maximumConcurrentInvocations,modelCalls:invocations.length,failures:0,retries:0,invocations,branchIsolation:{distinctSessionIds:new Set(invocations.map(item=>item.sessionId)).size===invocations.length,isolatedContext:true},join:{status:completed.nodes.find((node:any)=>node.id==='join')?.status},evidence:{workflowId:workflow.id,runId:completed.id,persistedRun:true,nodeStates:completed.nodes.map((node:any)=>({id:node.id,status:node.status,attempts:node.attempts}))},recovery:{exercisedInMatchedRun:false,reason:'The identical success workload did not inject a failure; restart, retry and interrupted-run behavior remains covered by the full Pisper suite.'},usage:{authority:'unavailable',inputTokens:null,outputTokens:null,cachedTokens:null,contextTokens:null,contextLimit:null,cost:null,reason:'Deterministic scheduler adapter made no external provider call; no token, cache, context or billing values were inferred.'}};
  } finally { await service.dispose(); fs.rmSync(root,{recursive:true,force:true}); }
}

async function toolGatewayProbe(pisperRoot: string) {
  const activation = await import(pathToFileURL(path.join(pisperRoot,'runtime/tools/tool-activation.mjs')).href) as {selectedToolNames:(input:unknown)=>string[]};
  const hot=['read','grep','find','ls','edit','write','bash','discover_tools','call_tool'];
  const optional=Array.from({length:40},(_,index)=>`optional_tool_${String(index).padStart(2,'0')}`), names=[...hot,...optional];
  const schema=(name:string)=>({name,description:`Bounded capability ${name}`,parameters:{type:'object',properties:{query:{type:'string'},limit:{type:'integer'}},required:['query'],additionalProperties:false}});
  const fullBytes=Buffer.byteLength(JSON.stringify(names.map(schema)),'utf8'), selected=activation.selectedToolNames({availableToolNames:names}), gatewayBytes=Buffer.byteLength(JSON.stringify(selected.map(schema)),'utf8');
  return {kind:'synthetic schema-footprint probe',catalogTools:names.length,residentTools:selected.length,fullSchemaBytes:fullBytes,residentSchemaBytes:gatewayBytes,reductionBytes:fullBytes-gatewayBytes,reductionPercent:Number((((fullBytes-gatewayBytes)/fullBytes)*100).toFixed(2)),limits:'This proves the footprint mechanism on an equal synthetic catalog; it is not a measured Agent Control production-token saving. Agent Control already sends only recipe-granted tools.'};
}

const pisperRoot=process.env.PISPER_ROOT ?? '/fast/work/references/pisper-20260911';
const output=process.env.COMPARISON_OUTPUT ?? path.resolve('docs/evidence/agent-control-4.4-pisper-physical-comparison-20260911.json');
const startedAt=iso(), [agentControl,pisper,toolGateway]=await Promise.all([agentControlRun(),pisperRun(pisperRoot),toolGatewayProbe(pisperRoot)]), report={schema:'agent-control.pisper-runtime-comparison/v1',startedAt,completedAt:iso(),scope:'Same deterministic three-branch fan-out and join through each runtime scheduler; provider quality is intentionally out of scope.',pinnedSources:{agentControl:process.env.AGENT_CONTROL_SHA ?? 'working-tree',pisper:'e3ef30f0744907f0a92578313c28c9679b56206e'},agentControl,pisper,toolGateway,interpretation:{bothActuallyConcurrent:agentControl.maximumConcurrentInvocations===3&&pisper.maximumConcurrentInvocations===3,measurementLimits:['Adapter invocations are scheduler probes, not external model calls.','Token, cache, context-window and monetary values are unavailable and were not estimated.','Wall-clock values include local persistence and 10 ms Pisper completion polling.']}};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,{mode:0o600});console.log(JSON.stringify({output,agentControl: {status:agentControl.status,wallClockMs:agentControl.wallClockMs,maxConcurrency:agentControl.maximumConcurrentInvocations},pisper:{status:pisper.status,wallClockMs:pisper.wallClockMs,maxConcurrency:pisper.maximumConcurrentInvocations}},null,2));
