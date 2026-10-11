import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {parseExternalSessionLog} from '../src/control/external-session-usage.js';
import {usageProjection} from '../src/control/usage-projection.js';

const root=process.cwd(),now=new Date('2026-10-11T13:00:00Z');
const message={type:'assistant',sessionId:'fixture-session',timestamp:'2026-10-11T12:00:00Z',message:{id:'fixture-message',model:'fixture-model',usage:{input_tokens:30,cache_read_input_tokens:70,cache_creation_input_tokens:10,output_tokens:20}}};
const snapshot=parseExternalSessionLog('claude',JSON.stringify(message)+'\n','/private/fixture/path');
const report=usageProjection(undefined,[],{period:'all'},now,[snapshot]);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://token-intelligence.test/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dashboard.css"><link rel="stylesheet" href="/dashboard-usage.css"></head><body><main id="usage-content"></main><script>window.state={token:"fixture"}</script><script src="/dashboard-usage.js"></script></body></html>'});
    if(['/dashboard.css','/dashboard-usage.js','/dashboard-usage.css'].includes(pathname))return route.fulfill({body:await readFile(path.join(root,'assets/dashboard',pathname.slice(1))),contentType:pathname.endsWith('.js')?'text/javascript':'text/css'});
    if(pathname==='/api/usage')return route.fulfill({body:JSON.stringify(report),contentType:'application/json'});
    return route.fulfill({status:404});
  });
  await page.goto('http://token-intelligence.test/');
  await page.evaluate(()=>window.AgentControlUsage.activate());
  await page.getByRole('button',{name:'External sessions'}).click();
  await page.getByText('External session evidence').waitFor();
  assert.match(await page.locator('#usage-view').innerText(),/EXACT_EVENT_TIME/);
  assert.match(await page.locator('#usage-view').innerText(),/Unknown counters remain unknown/);
  assert.equal((await page.locator('#usage-view').innerText()).includes('/private/fixture/path'),false);
  assert.deepEqual(errors,[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  assert.equal(overflow,false);
  const screenshot=path.resolve(root,'..','token-intelligence-mobile-browser.png');
  await mkdir(path.dirname(screenshot),{recursive:true});
  await page.screenshot({path:screenshot,fullPage:true});
  process.stdout.write('Browser: external tab rendered on 390px viewport, no page errors or horizontal overflow.\n');
}finally{await browser.close();}
