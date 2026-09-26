import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {startSkyBridge} from './computer-use-sky-bridge.mjs';
import {WindowsSkyComputerProvider} from '../src/control/computer-use-windows.ts';

test('Windows bridge discovers exact window, preserves session and records semantic and coordinate modes',async()=>{
  const evidenceDir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-sky-'));
  const window={id:123,app:'process:C:\\Blender\\blender.exe',title:'Demo - Blender'};
  const calls=[];
  const screenshot={id:'shot-1',width:10,height:10,url:`data:image/png;base64,${Buffer.from('test-image').toString('base64')}`};
  const sky={list_windows:async()=>[window],get_window:async()=>window,get_window_state:async()=>({window,accessibility:{tree:'0 window Demo\n  1 button Save'},screenshots:[screenshot]}),click:async input=>calls.push(input),press_key:async input=>calls.push(input),activate_window:async input=>calls.push(input)};
  const token=randomBytes(32).toString('hex');
  const bridge=await startSkyBridge({sky,window,application:'Blender',evidenceDir,token,allowedKeys:['ENTER'],forbiddenTitlePattern:'Burning-Horizons'});
  try{
    const provider=new WindowsSkyComputerProvider({url:`http://127.0.0.1:${bridge.port}`,token});
    const target={machine:'controller-local',application:'Blender',window:'123'};
    assert.equal(await provider.available({...target,machine:'other-machine'}),false);
    assert.equal(await provider.available({...target,window:'999'}),false);
    assert.equal(await provider.available(target),true);
    const session=await provider.open(target);
    assert.ok(session.id);
    let observed=await session.observe();
    assert.equal(observed.target.window,'123');
    assert.equal(observed.screenshot?.mediaType,'image/png');
    assert.ok(observed.elements.some(item=>item.id==='e1'));
    const semantic=await session.act({operation:'click',elementId:'e1',revision:observed.revision});
    assert.equal(semantic.mode,'ACCESSIBILITY');
    observed=await session.observe();
    const coordinate=await session.act({operation:'click',source:{x:2,y:3},revision:observed.revision});
    assert.equal(coordinate.mode,'SCREEN_COORDINATE');
    assert.equal(coordinate.fallback,true);
    observed=await session.observe();
    await assert.rejects(()=>session.act({operation:'click',source:{x:2,y:3},revision:'stale'}),/stale_observation/);
    const shot=await session.act({operation:'screenshot',revision:observed.revision});
    assert.ok(shot.screenshotRef&&fs.statSync(shot.screenshotRef).size>0);
    assert.equal(calls.length,2);
    await session.close();
  }finally{await bridge.close();fs.rmSync(evidenceDir,{recursive:true,force:true});}
});

test('Windows bridge refuses protected title and changed window layout',async()=>{
  const evidenceDir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-control-sky-'));
  const window={id:123,app:'process:C:\\Blender\\blender.exe',title:'Demo - Blender'};
  let current={...window},width=10;
  const sky={list_windows:async()=>[current],get_window:async()=>current,get_window_state:async()=>({window:current,accessibility:{tree:'0 window Demo'},screenshots:[{id:'shot',width,height:10,url:`data:image/png;base64,${Buffer.from('image').toString('base64')}`}]})};
  const token=randomBytes(32).toString('hex');
  const bridge=await startSkyBridge({sky,window,application:'Blender',evidenceDir,token,forbiddenTitlePattern:'Burning-Horizons'});
  try{
    const provider=new WindowsSkyComputerProvider({url:`http://127.0.0.1:${bridge.port}`,token});
    const target={machine:'controller-local',application:'Blender',window:'123'};
    assert.equal(await provider.available(target),true);
    const session=await provider.open(target);
    let observed=await session.observe();width=11;
    await assert.rejects(()=>session.act({operation:'click',source:{x:1,y:1},revision:observed.revision}),/window_layout_changed/);
    width=10;observed=await session.observe();current={...window,title:'Burning-Horizons'};
    await assert.rejects(()=>session.act({operation:'screenshot',revision:observed.revision}),/protected_window_title/);
    await session.close();
  }finally{await bridge.close();fs.rmSync(evidenceDir,{recursive:true,force:true});}
});
