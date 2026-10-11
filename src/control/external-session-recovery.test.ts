import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ExternalSessionStore} from './external-session-store.js';

const row=(id:string)=>JSON.stringify({type:'assistant',sessionId:'recovery-session',timestamp:'2026-10-11T12:00:00Z',message:{id,model:'fixture',usage:{input_tokens:3,cache_read_input_tokens:2,cache_creation_input_tokens:1,output_tokens:4}}})+'\n';
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
for(const phase of ['locked','partial-write','synced','before-rename','after-rename'])test('actual importer process death at '+phase+' retains atomic evidence and supports explicit lock recovery', {timeout:15000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'external-crash-'));
 const source=path.join(dir,'source.jsonl'),file=path.join(dir,'evidence.json');
 try{
  await fs.writeFile(source,row('first'));const store=new ExternalSessionStore(file);await store.ingest([{source:'claude',file:source}]);
  await fs.appendFile(source,row('second'));const sourceBefore=hash(await fs.readFile(source));
  const childCode=String.raw`
import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
const phase=process.env.RECOVERY_PHASE;
const checkpoint=async()=>{process.send({checkpoint:phase});await new Promise(()=>{});};
const open=fs.promises.open,rename=fs.promises.rename;
fs.promises.open=async(...args)=>{
 const h=await open(...args);
 if(String(args[0]).endsWith('.lock')&&phase==='locked')await checkpoint();
 if(String(args[0]).endsWith('.tmp')){
  const write=h.writeFile.bind(h),sync=h.sync.bind(h);
  h.writeFile=async(value,...rest)=>{if(phase==='partial-write'){await write(String(value).slice(0,Math.floor(String(value).length/2)),...rest);await checkpoint();}return write(value,...rest);};
  h.sync=async()=>{await sync();if(phase==='synced')await checkpoint();};
 }
 return h;
};
fs.promises.rename=async(...args)=>{if(phase==='before-rename')await checkpoint();await rename(...args);if(phase==='after-rename')await checkpoint();};
syncBuiltinESMExports();
const {ExternalSessionStore}=await import(process.env.RECOVERY_MODULE);
await new ExternalSessionStore(process.env.RECOVERY_STORE).ingest([{source:'claude',file:process.env.RECOVERY_SOURCE}]);
process.send({unexpectedCompletion:true});
`;
  const child=spawn(process.execPath,['--import','tsx','--input-type=module','--eval',childCode],{env:{...process.env,RECOVERY_PHASE:phase,RECOVERY_MODULE:pathToFileURL(path.resolve('src/control/external-session-store.ts')).href,RECOVERY_STORE:file,RECOVERY_SOURCE:source},stdio:['ignore','ignore','pipe','ipc']});
  let stderr='';child.stderr!.on('data',v=>stderr+=v);
  const timer=setTimeout(()=>child.kill('SIGKILL'),8000);
  try{
   const checkpoint=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw Error('checkpoint_not_observed: '+stderr);})]);
   assert.deepEqual(checkpoint[0],{checkpoint:phase});
   const exited=once(child,'exit');child.kill('SIGKILL');await exited;
  }finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
  const restored=await new ExternalSessionStore(file).snapshot();
  assert.equal(restored.rows.length,phase==='after-rename'?2:1);
  await assert.rejects(store.ingest([{source:'claude',file:source}]),/external_store_writer_locked/);
  // The test owns the importer PID and has observed its exit. Recovery never
  // deletes a lock belonging to an unverified or live writer.
  await fs.unlink(file+'.lock');
  const recovered=await store.ingest([{source:'claude',file:source}]);
  assert.equal(recovered.rows.length,2);
  const repeated=await store.ingest([{source:'claude',file:source}]);
  assert.deepEqual(repeated.rows,recovered.rows);
  assert.equal(hash(await fs.readFile(source)),sourceBefore);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
