import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {ComputerProviderRegistry,ComputerUseCapability} from './computer-use.js';
import {PlaywrightComputerProvider} from './computer-use-browser.js';

test('headless Chromium uses semantic elements and verifies visible local result',async()=>{
  const server=http.createServer((_request,response)=>{response.writeHead(200,{'content-type':'text/html'});response.end('<!doctype html><title>Computer Use Test</title><input aria-label="Name"><button onclick="document.querySelector(\'output\').textContent=\'Done \' + document.querySelector(\'input\').value">Apply</button><output>Waiting</output>');});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const address=server.address();if(!address||typeof address==='string')throw Error('test_listener_missing');
    const provider=new PlaywrightComputerProvider({executablePath:process.env.AGENT_CONTROL_CHROMIUM_EXECUTABLE,allowedPrivateHosts:['127.0.0.1']});
    const base=`http://127.0.0.1:${address.port}/`;
    const result=await new ComputerUseCapability(new ComputerProviderRegistry().register(provider)).execute({taskId:'local-browser-qualification',requestedOutcome:'Show Done Ada',target:{machine:'fixture-controller',browser:'Chromium'},steps:[{operation:'navigate',url:base},{operation:'newTab'},{operation:'navigate',url:`${base}other`},{operation:'focusTab',tab:base},{operation:'typeText',elementId:'e0',text:'Ada'},{operation:'click',elementId:'e1'}],checks:[{kind:'text',value:'Done Ada'},{kind:'title',value:'Computer Use Test'},{kind:'url',value:base}]});
    assert.equal(result.status,'COMPLETE',JSON.stringify({status:result.status,reason:result.reason,events:result.events}));
    assert.equal(result.actions.length,6);
    assert.ok(result.observations.length>=8);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test('headless adapter refuses an unqualified external destination',async()=>{const provider=new PlaywrightComputerProvider({executablePath:process.env.AGENT_CONTROL_CHROMIUM_EXECUTABLE,allowedPrivateHosts:['127.0.0.1']});const result=await new ComputerUseCapability(new ComputerProviderRegistry().register(provider)).execute({taskId:'external-block-test',requestedOutcome:'Inspect page',target:{machine:'fixture-controller',browser:'Chromium'},steps:[{operation:'navigate',url:'https://example.com/'}],checks:[{kind:'title',value:'Example Domain'}]});assert.equal(result.status,'FAILED');assert.match(result.reason??'',/browser_destination_not_qualified/);assert.equal(result.actions.length,0);});
