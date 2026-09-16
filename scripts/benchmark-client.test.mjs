import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkCommand} from './agent-control.mjs';
const env={AGENT_CONTROL_WEB_URL:'http://127.0.0.1:4310',AGENT_CONTROL_WEB_OPERATOR_TOKEN:'test-only-value'};
const io={out:()=>{},error:()=>{}};
test('benchmark client submits only a normal sealed job request',async()=>{let calls=0;assert.equal(await benchmarkCommand(['run','--spec','a'.repeat(64)],io,env,async(url,request)=>{calls++;assert.equal(url.pathname,'/api/jobs/model-hardware-qualification/run');assert.deepEqual(JSON.parse(request.body).parameters,{specSha256:'a'.repeat(64)});assert.equal(request.redirect,'error');return {ok:true,json:async()=>({id:'run-test'})};}),0);assert.equal(calls,1);});
test('benchmark client does not send credentials to remote cleartext or invalid requests',async()=>{for(const args of [['run','--spec','bad'],['status','../secret']])assert.equal(await benchmarkCommand(args,io,env,()=>{throw Error('must not fetch');}),2);assert.equal(await benchmarkCommand(['definition'],io,{...env,AGENT_CONTROL_WEB_URL:'http://remote.example'},()=>{throw Error('must not fetch');}),2);});
test('benchmark status and cancellation use existing run identity and authenticated endpoints',async()=>{for(const operation of ['status','cancel'])assert.equal(await benchmarkCommand([operation,'run-abc'],io,env,async(url,request)=>{assert.ok(request.headers.Authorization);assert.equal(url.pathname,'/api/runs/run-abc'+(operation==='cancel'?'/cancel':''));return {ok:true,json:async()=>({})};}),0);});
