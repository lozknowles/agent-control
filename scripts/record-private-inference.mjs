import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const root=process.argv[2],ready=JSON.parse(fs.readFileSync(path.join(root,'ready.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--disable-dev-shm-usage','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:path.join(root,'video'),size:{width:1920,height:1080}}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+new URL(r.url()).pathname)});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try {
 await page.goto('http://127.0.0.1:'+ready.port,{waitUntil:'networkidle'});
 await page.click('#operator-button');await page.fill('#operator-token',process.env.AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN);await page.click('#operator-form button[type="submit"]');
 await page.click('[data-view="jobs"]');await page.fill('#natural-task-prompt',ready.prompt);await page.screenshot({path:path.join(root,'01-authenticated-request.png')});await page.click('#natural-task-submit');
 if(ready.cancelOnReconnect){
  const ledger=path.join(root,'parameterized','parameterized-jobs','runs.json');const deadline=Date.now()+60000;let reconnecting=false;
  while(Date.now()<deadline){try{reconnecting=JSON.parse(fs.readFileSync(ledger,'utf8')).runs.some(r=>r.status==='RECONNECTING');}catch{}if(reconnecting)break;await delay(100);}
  if(!reconnecting)throw new Error('Cancellation precondition missing: no RECONNECTING state');
  await page.click('[data-view="jobs"]');await page.click('[data-job-platform-tab=runs]');await page.locator('[data-parameterized-run]').first().click();await page.locator('[data-parameterized-cancel]').click();
  fs.writeFileSync(path.join(root,'dashboard-cancellation.json'),JSON.stringify({at:new Date().toISOString(),action:'Authenticated dashboard Cancel Run during same-route reconnect backoff'}));
 }
 const until=Date.now()+600000;let index=0;
 while(Date.now()<until&&!fs.existsSync(path.join(root,'result.json'))){const views=['jobs','lanes','models','systems'];const view=views[index++%views.length];await page.click(`[data-view="${view}"]`);if(view==='jobs')await page.click('[data-job-platform-tab=runs]');await delay(2500);if(index<=8)await page.screenshot({path:path.join(root,`view-${index}-${view}.png`)});}
 await page.click('[data-view="jobs"]');await delay(2000);await page.screenshot({path:path.join(root,'final-dashboard.png')});
 if(fs.existsSync(path.join(root,'result.json'))){await page.click('[data-job-platform-tab="runs"]');await page.locator('[data-parameterized-run]').first().click();await page.locator('[data-parameterized-transcript]').click();await page.click('[data-job-platform-tab=runs]');const transcript=page.locator('#job-platform-runs .execution-transcript pre');await transcript.waitFor({state:'visible'});await transcript.scrollIntoViewIfNeeded();await delay(3000);await page.screenshot({path:path.join(root,'transcript-origin.png')});for(let n=0;n<12;n++){const bottom=await transcript.evaluate(e=>{e.scrollTop+=450;return e.scrollTop+e.clientHeight>=e.scrollHeight});await delay(1000);if(bottom)break;}await page.screenshot({path:path.join(root,'transcript-end.png')});}
 fs.writeFileSync(path.join(root,'browser.json'),JSON.stringify({errors,url:page.url(),completed:fs.existsSync(path.join(root,'result.json'))},null,2));
} finally {await context.close();await browser.close();}