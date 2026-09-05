import assert from 'node:assert/strict';
import test from 'node:test';
import {openwaExecutionPort,OpenWASocialProvider} from './openwa-social-provider.js';
import type {OpenWAAdapter} from './openwa.js';
test('queued social parcels consume active and hourly limits before runtime dispatch',()=>{
 const p={id:'parcel-social-existing',actor:'operator',createdAt:new Date().toISOString(),status:'QUEUED',stages:[{job:'test@1.0.0'}]};
 const adapter={config:{sessionId:'account',templates:[{name:'test',jobId:'test',maxActive:1,maxRunsPerHour:1}]},service:{parcels:()=>[p],runs:()=>[]}} as unknown as OpenWAAdapter;
 const port=openwaExecutionPort(adapter);
 assert.throws(()=>port.start('test','operator','new'),/active_job_budget/);
 p.status='CANCELLED';assert.throws(()=>port.start('test','operator','new'),/hourly_job_budget/);
 assert.equal(port.start('test','operator','existing').id,p.id);
});
test('OpenWA normalization rejects account confusion and group conversations',()=>{
 const provider=new OpenWASocialProvider({config:{sessionId:'account'}} as OpenWAAdapter);
 const message={id:'one',identity:{channel:'openwa',account:'account',sender:'sender',conversation:'sender'},kind:'audio',receivedAt:Date.now(),mediaId:'one'};
 assert.deepEqual(provider.receive(message),message);
 assert.throws(()=>provider.receive({...message,identity:{...message.identity,account:'other'}}));
 assert.throws(()=>provider.receive({...message,identity:{...message.identity,conversation:'group'}}));
});
