import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import type {AddressInfo} from 'node:net';import path from 'node:path';
import {AgentControlService} from './application-service.js';import {PtyRegistry} from './pty.js';import {startWebDashboard} from './web-server.js';import {renderReportOutput,reportOutputCatalogue,type ReportSource} from './report-output.js';
import {validateJobManifest} from './job-catalog.js';import {validateParameterizedDefinition} from './parameterized-job-registry.js';import {transcriptRequestReviewDefinition} from './transcript-review-definition.js';
test('authenticated profile discovery and file download share one source without starting work',async t=>{
 const s:ReportSource={id:'run',jobId:'job',title:'Test',status:'SUCCEEDED',recordedAt:'2026-09-14',result:{summary:'Done'},history:{content:'history',sha256:'hash'},events:[],operations:[],limitations:[]};
 const control=new AgentControlService({version:1,paused:false,lastRestorePoint:null,lanes:[]},new PtyRegistry(),undefined,'test',()=>{});let reads=0,executes=0;
 control.reportSource=()=>{reads++;return s;};control.submitNaturalTask=async()=>{executes++;throw Error('must not execute');};
 const server=startWebDashboard(control,{host:'127.0.0.1',port:0,operatorToken:'test-report-operator',assetsDir:path.resolve('assets/dashboard')});await once(server,'listening');t.after(()=>server.close());const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/observability/runs/run/outputs`;
 assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base+'/simple?download=1')).status,401);assert.equal(reads,0);
 const headers={Authorization:'Bearer test-report-operator'};const catalogue=await fetch(base,{headers}).then(r=>r.json());assert.equal(catalogue.defaultProfile,'simple');
 for(const p of ['simple','detailed','evidence']){const response=await fetch(base+'/'+p+'?download=1',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-disposition')!,/^attachment; filename="job-run-/);assert.equal(await response.text(),renderReportOutput(s,p).content);assert.equal(response.headers.get('x-report-source-sha256'),reportOutputCatalogue(s).sourceSha256);}
 assert.equal((await fetch(base+'/simple?format=pdf',{headers})).status,400);assert.equal(executes,0);
});
test('core catalogue uses declared artifacts and parameterized catalogue extends existing outputs',()=>{
 const profiles=[{id:'executive',label:'Executive',view:'simple',format:'text',default:true}];const job={apiVersion:'agent-control/v1',kind:'Job',metadata:{id:'report',name:'Report',version:'1.0.0'},spec:{priority:'normal',concurrency:'queue',reportProfiles:profiles,reportArtifact:'result',steps:[{id:'work',action:'analysis@1.0.0',requires:[],outputs:[{name:'result',type:'application/json',schema:'analysis/v1',version:'1.0.0'}]}]}};
 assert.equal(validateJobManifest(job).spec.reportProfiles?.[0].id,'executive');assert.throws(()=>validateJobManifest({...job,spec:{...job.spec,reportArtifact:'missing'}}));
 assert.equal(validateParameterizedDefinition(transcriptRequestReviewDefinition).outputs.profiles?.length,3);
});

test('parent output includes every parcel and keeps one canonical result and history',()=>{
 const service=new AgentControlService({version:1,paused:false,lastRestorePoint:null,lanes:[]},new PtyRegistry(),undefined,'test',()=>{});
 const parent={id:'parent',workParcelIds:['a','b'],definition:{id:'review',displayName:'Review',outputs:{}},status:'DEGRADED',completedAt:'2026-09-14',result:{summary:'Both parcels'},errors:[]};
 Object.assign(service,{parameterizedJobs:{runs:{list:()=>[parent]}}});
 service.runInspector=((id:string)=>({id,status:'SUCCEEDED',history:{content:'Complete parent history',sha256:'original'},events:[{id:'event-'+id}],operations:[{id:'op-'+id}],calls:[{id:'call-'+id}],limitations:['Known limit']})) as never;
 for(const id of ['parent','a','b']){const source=service.reportSource(id);assert.equal(source.id,'parent');assert.deepEqual(source.result,parent.result);assert.deepEqual(source.calls,[{id:'call-a'},{id:'call-b'}]);assert.equal(source.events.length,2);assert.equal(source.history.content,'Complete parent history');}
 assert.equal(service.reportOutput('a','evidence').sourceSha256,service.reportOutput('b','evidence').sourceSha256);
});
test('declared report artifact cannot read another runs artifact or bypass deleted evidence',()=>{
 const service=new AgentControlService({version:1,paused:false,lastRestorePoint:null,lanes:[]},new PtyRegistry(),undefined,'test',()=>{});let reads=0;
 Object.assign(service,{jobRuntime:{ledger:{list:()=>[{id:'run',jobId:'job',effectiveJob:{spec:{reportArtifact:'result'}},artifacts:[]}]}}});
 service.runInspector=(()=>({id:'run',history:{content:'history',sha256:'hash'},events:[],operations:[],calls:[],limitations:[]})) as never;
 service.artifacts=(()=>[{id:'other-run-artifact',name:'result'}]) as never;service.artifactContent=(()=>{reads++;throw Error('must not read');}) as never;
 assert.throws(()=>service.reportSource('run'),/report_artifact_unavailable/);assert.equal(reads,0);
});
