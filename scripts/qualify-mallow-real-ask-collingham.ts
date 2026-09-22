import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {JobCatalog} from '../src/control/job-catalog.js';
import {ActionRegistry,ArtifactStore,JobRuntime,ResourceLockManager,RunLedger,WorkerRegistry} from '../src/control/job-runtime.js';
import {ASK_COLLINGHAM_JOB,AskCollinghamClient,registerAskCollinghamJob} from '../src/control/mallow-ask-collingham.js';

const root=path.resolve(process.argv[2]??'.agent-control/evidence/mallow-realtime-physical/ask-collingham');
fs.mkdirSync(root,{recursive:true,mode:0o700});
for(const name of ['ledger.json','locks.json'])fs.rmSync(path.join(root,name),{force:true});
fs.rmSync(path.join(root,'artifacts'),{recursive:true,force:true});
const actions=new ActionRegistry(),catalog=new JobCatalog(new Set(['mallow.ask-collingham@1.0.0']));
const client=new AskCollinghamClient({
  baseUrl:process.env.AGENT_CONTROL_ASK_COLLINGHAM_URL??'http://127.0.0.1:18127',
  streamPath:process.env.AGENT_CONTROL_ASK_COLLINGHAM_PATH??'/api/ask-collingham/embed/0c369c9c-ce85-476f-9eb4-d44915ea1d13/stream-chat',
  stack:{conversationProvider:'AnythingLLM',model:'Qwen2.5-3B Q4_K_M',runtime:'llama.cpp',retrieval:'LanceDB',qualificationReference:'localwalks:ask-collingham-baseline-20260921'},
});
registerAskCollinghamJob(actions,catalog,client);
const workers=new WorkerRegistry();workers.registerControllerInternal({id:'mallow-collingham-worker',capabilities:['collingham.query'],health:'healthy',capacity:1,active:0,observedAt:new Date().toISOString()});
const runtime=new JobRuntime(catalog,actions,workers,new RunLedger(path.join(root,'ledger.json')),new ArtifactStore(path.join(root,'artifacts')),new ResourceLockManager(path.join(root,'locks.json')));
const question='What is happening with the Station Road planning application?';
const run=runtime.createRun(ASK_COLLINGHAM_JOB,{question,sessionId:'mallow-physical-'+Date.now()},{type:'manual',actor:'mallow:physical-qualification'},undefined,'mallow:physical-qualification:real-ask');
const dispatch=runtime.dispatch();if(!dispatch||dispatch.runId!==run.id)throw Error('ask_collingham_dispatch_failed');await dispatch.completion;
const complete=runtime.ledger.get(run.id)!;
const answer=complete.artifacts[0]?runtime.artifacts.read(complete.artifacts[0]):null;
const report={schema:'agent-control.mallow-ask-collingham-qualification/v1',classification:complete.status==='SUCCEEDED'?'REAL_GOVERNED_JOB':'FAILED',runId:run.id,jobId:complete.jobId,jobVersion:complete.jobVersion,actor:complete.trigger.actor,worker:complete.selectedWorkers[0]??null,status:complete.status,startedAt:complete.startedAt??null,endedAt:complete.endedAt??null,question,answer,evidenceReferences:complete.artifacts,stack:{conversationProvider:'AnythingLLM',model:'Qwen2.5-3B Q4_K_M',runtime:'llama.cpp',retrieval:'LanceDB'},boundary:'This proves one real Ask Collingham request through Agent Control JobRuntime. It does not prove physical microphone, audible TTS, streaming STT/TTS or answer accuracy.'};
fs.writeFileSync(path.join(root,'qualification.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
const files=['ledger.json','qualification.json',...complete.artifacts.map(id=>path.join('artifacts',id+'.json')).filter(file=>fs.existsSync(path.join(root,file)))]
  .filter(file=>fs.existsSync(path.join(root,file)));
const checksums=files.map(file=>`${createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}  ${file}`).join('\n')+'\n';
fs.writeFileSync(path.join(root,'SHA256SUMS'),checksums,{mode:0o600});
process.stdout.write(JSON.stringify({result:report.classification,runId:run.id,status:complete.status,worker:report.worker,artifactCount:complete.artifacts.length,evidenceRoot:root,qualificationSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'qualification.json'))).digest('hex')},null,2)+'\n');
