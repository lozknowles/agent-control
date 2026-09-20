// Native benchmark qualification client. It only configures the controller,
// submits one registered Job, waits, and exports durable state.
import fs from 'node:fs';
import path from 'node:path';
import {JobCatalog} from '../src/control/job-catalog.js';
import {ActionRegistry,createJobRuntime,WorkerRegistry} from '../src/control/job-runtime.js';
import {MemoryHarnessEfficiencyLedger} from '../src/control/harness-efficiency.js';
import {registerNonOpenAiCacheQualificationActions} from '../src/control/non-openai-cache-qualification.js';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`missing_${name}`);return value;}
const state=path.resolve(required('AC_NATIVE_BENCHMARK_STATE'));
if(fs.existsSync(state))throw new Error('native_benchmark_state_must_be_fresh');
fs.mkdirSync(state,{recursive:true,mode:0o700});
const taskId=required('AC_NATIVE_BENCHMARK_TASK'),profile=required('AC_NATIVE_BENCHMARK_PROFILE');
const providerId=process.env.AC_NATIVE_BENCHMARK_PROVIDER?.trim()||'local-ministral-native';
const modelId=required('AGENT_CONTROL_NON_OPENAI_CACHE_MODEL');
const efficiency=new MemoryHarnessEfficiencyLedger();
const actions=registerNonOpenAiCacheQualificationActions(new ActionRegistry(),efficiency,process.env);
const catalog=new JobCatalog(actions.ids()).loadDirectory(path.resolve('config/cache-qualification-jobs'));
const workers=new WorkerRegistry().register({id:'native-benchmark-worker',capabilities:['model.execute','structured-output','tool-request','repository.mutation.typed','repository.verify.public'],health:'healthy',capacity:1,active:0,observedAt:new Date().toISOString()});
const runtime=createJobRuntime(state,catalog,actions,workers,{efficiency});
const trigger={type:'manual' as const,actor:'human:authorised-native-benchmark',modelRoute:{requestedModel:modelId,requestedRole:'coding-benchmark',modelId,providerId,providerModel:`${providerId}/${modelId}`,nodeId:'hpubuntu',credentialNodeId:null,qualificationVersion:'native-benchmark-v1',fallback:false,fallbackReason:null}};
const run=runtime.createRun('native-mutation-benchmark@1.0.0',{taskId,profile,prefixVariant:process.env.AC_NATIVE_BENCHMARK_PREFIX||'stable'},trigger);
fs.writeFileSync(path.join(state,'submission.json'),JSON.stringify({taskId,profile,job:`${run.jobId}@${run.jobVersion}`,runId:run.id,trigger},null,2),{mode:0o600,flag:'wx'});
const terminal=new Set(['SUCCEEDED','FAILED','DEGRADED','CANCELLED','CLEANUP_UNCERTAIN','BLOCKED']);
for(let steps=0;steps<8&&!terminal.has(runtime.ledger.get(run.id)?.status??'');steps++)await runtime.tick();
const record=runtime.ledger.get(run.id),artifacts=runtime.artifacts.list(run.id),result={schema:'agent-control.native-mutation-benchmark/v1',sourceCommit:process.env.AC_NATIVE_BENCHMARK_SOURCE||'unavailable',run:record,invocations:efficiency.list().filter(item=>item.runId===run.id),artifacts:artifacts.map(item=>({record:item,value:runtime.artifacts.read(item.id)}))};
fs.writeFileSync(path.join(state,'result.json'),JSON.stringify(result,null,2),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({runId:run.id,status:record?.status,taskId,profile,invocations:result.invocations.length,artifacts:artifacts.length}));
if(record?.status!=='SUCCEEDED')process.exitCode=1;
