import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {startWebDashboard} from './web-server.js';
test('voice history remains authenticated and explicitly blocked without a call transport',async t=>{
  const token='fixture-token-for-realtime-history',server=startWebDashboard({} as never,{host:'127.0.0.1',port:0,operatorToken:token});t.after(()=>server.close());await once(server,'listening');const port=(server.address() as any).port,base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base+'/api/voice-sessions')).status,401);
  const r=await fetch(base+'/api/voice-sessions',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,200);const body=await r.json();assert.equal(body.state,'BLOCKED');assert.deepEqual(body.sessions,[]);
  assert.equal((await fetch(base+'/api/voice-sessions/00000000-0000-0000-0000-000000000000/transcript')).status,401);
  const page=await fetch(base+'/voice-sessions.html');assert.equal(page.status,200);assert.match(await page.text(),/WhatsApp calling is not enabled/);
});
