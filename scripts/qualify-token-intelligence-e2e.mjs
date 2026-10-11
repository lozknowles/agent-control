import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {AgentControlService} from '../src/control/application-service.js';
import {PtyRegistry} from '../src/control/pty.js';
import {startWebDashboard} from '../src/control/web-server.js';
import {FileHarnessEfficiencyLedger,createInvocationObservation} from '../src/control/harness-efficiency.js';
import {startExternalUsageRuntime} from '../src/control/external-usage-runtime.js';
const root=path.resolve('work/recovery/browser',process.platform+'-'+randomUUID());
await fs.mkdir(root,{recursive:true});
const at='2026-10-11T12:00:00Z',nativeFile=path.join(root,'native.json'),ledger=new FileHarnessEfficiencyLedger(nativeFile);
for(const id of ['native-first','native-retry']){
 const record=createInvocationObservation({id,jobId:'fixture-job',taskId:'fixture-task',laneId:'fixture-lane',model:'native-model',provider:'native-provider',harnessProfile:'STANDARD',executionStrategy:'isolated-test',startedAt:at,completedAt:at,recipeFingerprint:'fixture',rawUsage:{input_tokens:50,input_tokens_details:{cached_tokens:10},output_tokens:20,total_tokens:70},providerReportedCost:.01,pricing:{currency:'USD'}});
 record.accounting.providerRequestId=id==='native-first'?'overlap-request':null;
 record.accounting.retryOfInvocationId=id==='native-retry'?'native-first':null;
 ledger.record(record);
}
const nativeBefore=await fs.readFile(nativeFile),sha=v=>createHash('sha256').update(v).digest('hex');
const claude=(id,usage={input_tokens:30,cache_read_input_tokens:70,cache_creation_input_tokens:10,output_tokens:20})=>({type:'assistant',sessionId:'external-claude',timestamp:at,providerId:'native-provider',requestId:id==='overlap'?'overlap-request':undefined,message:{id,model:'external-model',usage}});
const files=[
 {source:'claude',file:path.join(root,'claude.jsonl'),text:[claude('overlap'),claude('unknown',{input_tokens:1}),claude('conflict')].map(JSON.stringify).join('\n')+'\ninvalid-record\n'},
 {source:'claude',file:path.join(root,'claude-copy.jsonl'),text:[claude('overlap'),claude('conflict',{input_tokens:99,cache_read_input_tokens:0,cache_creation_input_tokens:0,output_tokens:1})].map(JSON.stringify).join('\n')+'\n'},
 {source:'codex',file:path.join(root,'codex.jsonl'),text:[{type:'session_meta',payload:{id:'external-codex'}},{type:'turn_context',payload:{model:'codex-fixture'}},{type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:100,cached_input_tokens:70,output_tokens:20,reasoning_output_tokens:5}}}}].map(JSON.stringify).join('\n')+'\n'}
];
for(const file of files)await fs.writeFile(file.file,file.text);
const manifest=path.join(root,'manifest.json');await fs.writeFile(manifest,JSON.stringify({schema:'agent-control.external-usage-manifest/v1',files:files.map(({source,file})=>({source,file}))}));
const sourceHashes=await Promise.all(files.map(async f=>sha(await fs.readFile(f.file))));
const external=await startExternalUsageRuntime(manifest,root,3600000);
const control=new AgentControlService({version:1,paused:false,lastRestorePoint:null,lanes:[]},new PtyRegistry(),undefined,'isolated-qualification',()=>{});
control.configureProjection({harnessEfficiency:new FileHarnessEfficiencyLedger(nativeFile)});
control.setExternalUsageProjection(()=>external.snapshot());
const token='isolated-token-intelligence-browser',headers={Authorization:'Bearer '+token};
const server=startWebDashboard(control,{host:'127.0.0.1',port:0,operatorToken:token,assetsDir:path.resolve('assets/dashboard')});
await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
let browser;const checks=[],errors=[];
const read=async query=>{const response=await fetch(base+'/api/usage?'+query,{headers});assert.equal(response.status,200);return response.json();};
try{
 assert.equal((await fetch(base+'/api/usage?period=all')).status,401);checks.push('unauthenticated usage rejected');
 const report=await read('period=all');
 assert.equal(report.totals.calls,2);assert.equal(report.totals.tokens.knownTotal,140);
 assert.equal(report.externalSessions.nativeAccountingEffect,'NONE');
 assert.ok(report.externalSessions.coverage.conflicts>0);assert.ok(report.externalSessions.coverage.duplicates>0);
 assert.ok(report.externalSessions.rows.some(r=>r.nativeOverlap==='CONFLICTING_REQUEST_ID'&&r.nativeInvocationIds.includes('native-first')));
 assert.ok(report.externalSessions.rows.some(r=>r.periodUsage?.output===null));
 assert.equal(JSON.stringify(report).includes(root),false);
 await external.refresh();assert.equal(sha(await fs.readFile(nativeFile)),sha(nativeBefore));
 const evidenceFile=path.join(root,'external-usage/evidence.json'),evidenceBefore=sha(await fs.readFile(evidenceFile));
 checks.push('persisted native ledger byte-identical after external import and repeat; overlap/conflict/unknown coverage visible');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(token=>sessionStorage.setItem('agent-control-operator-token',token),token);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto(base);
  if(width===390)await page.getByRole('button',{name:'Views',exact:true}).click();
  await page.locator('[data-view="usage"]').click();
  await page.getByRole('button',{name:'External sessions',exact:true}).click();
  await page.getByText('External session evidence',{exact:true}).waitFor();
  await page.getByLabel('Period',{exact:true}).selectOption('all');
  await page.waitForFunction(()=>document.querySelector('#usage-status')?.textContent.includes('matching calls'));
  await page.getByRole('button',{name:'External sessions',exact:true}).click();
  assert.match(await page.locator('#usage-view').innerText(),/Unknown counters remain unknown/);
  const inspect=page.locator('#usage-view').getByRole('button',{name:'Inspect'}).first();
  await inspect.focus();await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'External evidence',exact:true}).waitFor();
  assert.match(await page.locator('#usage-view pre').innerText(),/sourcePathHash|evidenceHash/);
  await page.getByRole('button',{name:'Back to external sessions'}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(root,'dashboard-'+width+'.png'),fullPage:true});
  checks.push('real dashboard '+width+'px: authenticated persisted evidence, keyboard drill-down, provenance, no horizontal overflow');
 }
 await page.getByLabel('Group by',{exact:true}).selectOption('model');
 await page.getByLabel('Filter exact model').fill('external-model');
 await page.getByRole('button',{name:'Apply filter',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#usage-status')?.textContent.includes('0 matching calls'));
 const filtered=await read('period=all&filter.model=external-model');
 assert.ok(filtered.externalSessions.rows.length>0);assert.ok(filtered.externalSessions.rows.every(r=>r.model==='external-model'));
 const provider=await read('period=all&filter.provider=native-provider');
 assert.equal(provider.totals.calls,2);assert.equal(provider.externalSessions.filterStatus,'UNSUPPORTED_FILTERS');assert.deepEqual(provider.externalSessions.unsupportedFilters,['provider']);
 await page.getByLabel('Group by',{exact:true}).selectOption('provider');await page.getByLabel('Filter exact provider').fill('native-provider');await page.getByRole('button',{name:'Apply filter',exact:true}).click();
 await page.getByText('External sessions cannot apply these native dimensions:',{exact:false}).waitFor();
 checks.push('model filter applied; native provider filter preserves unsupported external provider status');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await page.getByRole('button',{name:'Cache & retries',exact:true}).click();
 assert.match(await page.locator('#usage-view').innerText(),/Explicit retry tax/);
 await page.getByRole('button',{name:'Invocations',exact:true}).click();
 await page.locator('#usage-view').getByRole('button',{name:'Inspect'}).first().click();
 assert.match(await page.locator('#usage-view pre').innerText(),/native-provider/);
 checks.push('native token/cost drill-down and cache/retry presentation');
 const empty=await read('period=custom&start=2020-01-01T00%3A00%3A00Z&end=2020-01-02T00%3A00%3A00Z');assert.equal(empty.totals.calls,0);assert.equal(empty.externalSessions.rows.length,0);
 checks.push('historical interval returns explicit empty evidence');
 await page.evaluate(()=>state.token='invalid-test-token');await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Usage request failed (401)'}).waitFor();
 await page.evaluate(token=>state.token=token,token);await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#usage-status')?.textContent.includes('matching calls'));
 checks.push('real failed authenticated request displays error and recovers');
 const reset=await fetch(base+'/api/usage/reset',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({confirmation:'RESET USAGE HISTORY',digest:(await read('period=all')).history.resetDigest})});assert.equal(reset.status,200);
 const after=await read('period=all');assert.equal(after.totals.calls,0);assert.equal(after.externalSessions.rows.length,report.externalSessions.rows.length);
 assert.deepEqual(new FileHarnessEfficiencyLedger(nativeFile).list(),ledger.list());
 assert.equal(sha(await fs.readFile(evidenceFile)),evidenceBefore);
 assert.deepEqual(await Promise.all(files.map(async f=>sha(await fs.readFile(f.file)))),sourceHashes);
 checks.push('visibility reset preserves native records and external evidence; source logs unchanged');
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(root,'qualification.json'),JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),platform:process.platform,node:process.version,browser:'real Chromium',mockedRoutes:false,persistedEvidence:true,checks,limitations:['Automated checks cover labels, keyboard actions and overflow; no screen-reader or manual contrast audit.'],providerFilterReturnedRows:provider.externalSessions.rows.length},null,2));
 console.log(JSON.stringify({result:'PASS',root,checks:checks.length}));
}finally{await browser?.close();external.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
