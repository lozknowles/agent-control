import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.POE_BROWSER_TEST_URL,tokenFile=process.env.POE_BROWSER_TEST_TOKEN_FILE;
if(!base||!tokenFile)throw new Error('Scoped test URL and token file are required');
const browser=await chromium.launch({headless:true,executablePath:process.env.AGENT_CONTROL_CHROMIUM||'/snap/bin/chromium',args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1200,height:900}});
await context.addInitScript(()=>{
  window.__spoken=[];window.__recognitionMode='success';
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;this.lang='';this.voice=null;}};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{name:'Fixture voice',lang:'en-GB'}],cancel(){},speak(utterance){window.__spoken.push(utterance.text);queueMicrotask(()=>{utterance.onstart?.();utterance.onend?.();});},addEventListener(){}}});
  class Recognition{start(){queueMicrotask(()=>{if(window.__recognitionMode==='denied')this.onerror?.({error:'not-allowed'});else{this.onresult?.({results:[[{transcript:'What is running?'}]]});this.onend?.();}})}stop(){this.onend?.()}abort(){}}
  window.SpeechRecognition=Recognition;
});
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const evidence={classification:'SIMULATED_BROWSER_FAILOVER_NOT_PHYSICAL_AUDIO',checks:[],startedAt:new Date().toISOString()};
try{
  await page.goto(base);if(!await page.locator('#operator-dialog').isVisible())await page.locator('#operator-button').click();await page.locator('#operator-token').fill(fs.readFileSync(tokenFile,'utf8').trim());await page.locator('#operator-form button[type="submit"]').click();await page.locator('#operator-dialog').waitFor({state:'hidden'});
  await page.evaluate(()=>{document.dispatchEvent(new Event('poe:open'));document.querySelector('#poe-workspace')?.classList.add('poe-expanded-detail');});await page.locator('#poe-workspace').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#poe-conversation-title')?.textContent==='Your dashboard conversation');
  await page.locator('#poe-enable-audio').click();
  await page.waitForFunction(()=>document.querySelector('#mallow-speech-status')?.textContent?.includes('Browser voice'));evidence.checks.push('unreachable shared TTS selects browser voice');
  const spokenBefore=await page.evaluate(()=>window.__spoken.length),turnsBefore=await page.locator('#poe-turns .poe-turn.operator').count();await page.locator('#poe-input').fill('Status');await page.locator('#poe-form button[type="submit"]').click();await page.waitForFunction(({spokenBefore,turnsBefore})=>window.__spoken.length>spokenBefore&&document.querySelectorAll('#poe-turns .poe-turn.operator').length>turnsBefore,{spokenBefore,turnsBefore});assert.equal(await page.locator('#poe-turns .poe-turn.operator>div').last().textContent(),'Status');evidence.checks.push('text answer remains and browser speech runs once');
  const before=await page.locator('#poe-turns .poe-turn.operator').count();await page.locator('#poe-speak').click();await page.waitForFunction(count=>document.querySelectorAll('#poe-turns .poe-turn.operator').length>count,before);assert.equal(await page.locator('#poe-turns .poe-turn.operator').count(),before+1);evidence.checks.push('browser recognition submits one transcript');
  await page.evaluate(()=>{window.__recognitionMode='denied'});await page.locator('#poe-speak').click();await page.waitForFunction(()=>document.querySelector('#poe-audio-message')?.textContent?.includes('permission was denied'));assert.equal(await page.locator('#poe-form button[type="submit"]').isEnabled(),true);evidence.checks.push('permission denial retains typed input');
  await page.evaluate(()=>{window.speechSynthesis.speak=utterance=>queueMicrotask(()=>utterance.onerror?.({error:'synthesis-failed'}))});await page.locator('#poe-input').fill('What is waiting?');await page.locator('#poe-form button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#poe-audio-message')?.textContent?.includes('complete reply remains displayed'));assert.match(await page.locator('#poe-turns').innerText(),/What is waiting/);evidence.checks.push('browser playback failure retains displayed answer');
  assert.deepEqual(errors,[]);evidence.checks.push('no browser script errors');
}finally{evidence.errors=errors;evidence.finishedAt=new Date().toISOString();const output=path.resolve(process.env.POE_BROWSER_TEST_OUTPUT||'work/speech-fallback-browser');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(evidence,null,2));await page.screenshot({path:path.join(output,'fallback-status.png')});await browser.close();}
console.log(JSON.stringify(evidence,null,2));
