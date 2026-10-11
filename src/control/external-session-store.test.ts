import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ExternalSessionStore} from './external-session-store.js';
import {parseExternalSessionLog,reconcileExternalSnapshots} from './external-session-usage.js';
const at='2026-10-11T12:00:00Z';
const meta={type:'session_meta',payload:{id:'session'}};
const ping=(input:number)=>({type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:input,cached_input_tokens:0,output_tokens:10}}}});
const jsonl=(...rows:unknown[])=>rows.map(row=>JSON.stringify(row)).join('\n')+'\n';
async function fixture(run:(dir:string)=>Promise<void>){const dir=await mkdtemp(join(tmpdir(),'external-store-'));try{await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}

test('Durable resume parses only complete records, retains context, and preserves source bytes',async()=>fixture(async dir=>{
  const file=join(dir,'source'),storeFile=join(dir,'store'),store=new ExternalSessionStore(storeFile);
  const initial=jsonl(meta,ping(100)),tail=JSON.stringify(ping(200));
  await writeFile(file,initial+tail.slice(0,20));
  const first=await store.ingest([{source:'codex',file}]);
  assert.equal(first.rows[0]!.usage.input,100);assert.equal(first.cursors[0]!.offset,Buffer.byteLength(initial));
  assert.ok(first.gaps.some(g=>g.reason==='partial_tail'));
  await appendFile(file,tail.slice(20)+'\n');
  const restarted=new ExternalSessionStore(storeFile);
  const second=await restarted.ingest([{source:'codex',file}]);
  assert.equal(second.rows[0]!.usage.input,200);assert.equal(second.revisions.length,2);assert.equal(second.rows[0]!.revision,1);
  assert.ok(!second.gaps.some(g=>g.reason==='partial_tail'));
  assert.deepEqual(await restarted.snapshot(),second);
  const before=await readFile(storeFile,'utf8');
  assert.deepEqual(await restarted.ingest([{source:'codex',file}]),second);
  assert.equal(await readFile(storeFile,'utf8'),before);
  assert.equal(await readFile(file,'utf8'),initial+tail+'\n');assert.ok(!before.includes(dir));
}));

test('Bounded ingestion resumes across chunks and exposes unfinished coverage',async()=>fixture(async dir=>{
  const file=join(dir,'source'),store=new ExternalSessionStore(join(dir,'store'));
  await writeFile(file,jsonl(meta,ping(100),ping(200)));
  const a=await store.ingest([{source:'codex',file}],{maxBytesPerFile:Buffer.byteLength(jsonl(meta))});
  assert.equal(a.rows.length,0);assert.ok(a.gaps.some(g=>g.reason==='read_limit_or_oversize_line'));
  const b=await store.ingest([{source:'codex',file}],{maxBytesPerFile:Buffer.byteLength(jsonl(ping(100)))});
  assert.equal(b.rows[0]!.usage.input,100);
  const c=await store.ingest([{source:'codex',file}]);assert.equal(c.rows[0]!.usage.input,200);assert.equal(c.gaps.length,0);
}));

test('Truncation and same-size rewrite retain revisions and expose source generation changes',async()=>fixture(async dir=>{
  const file=join(dir,'source'),store=new ExternalSessionStore(join(dir,'store'));
  await writeFile(file,jsonl(meta,ping(200)));await store.ingest([{source:'codex',file}]);
  await writeFile(file,jsonl(meta,ping(100)));
  const rewrite=await store.ingest([{source:'codex',file}]);
  assert.equal(rewrite.cursors[0]!.generation,1);assert.ok(rewrite.gaps.some(g=>g.reason==='source_rewritten'));
  assert.deepEqual(rewrite.revisions.map(r=>r.sourceGeneration),[0,1]);
  assert.equal(rewrite.rows[0]!.usage.input,200);assert.equal(rewrite.revisions.length,2);
  await writeFile(file,jsonl(meta));const truncated=await store.ingest([{source:'codex',file}]);
  assert.equal(truncated.cursors[0]!.generation,2);assert.ok(truncated.gaps.some(g=>g.reason==='source_truncated'));
}));

test('Corrupt storage fails closed and one writer lock blocks all writes',async()=>fixture(async dir=>{
  const file=join(dir,'source'),storeFile=join(dir,'store'),store=new ExternalSessionStore(storeFile);
  await writeFile(file,jsonl(meta,ping(100)));await store.ingest([{source:'codex',file}]);
  await writeFile(storeFile+'.lock','');
  await assert.rejects(store.ingest([{source:'codex',file}]),/writer_locked/);assert.equal((await store.snapshot()).rows.length,1);
  await rm(storeFile+'.lock');await writeFile(storeFile,'{"state":{}}');
  await assert.rejects(store.snapshot(),/store_corrupt/);await assert.rejects(store.ingest([{source:'codex',file}]),/store_corrupt/);
  assert.equal(await readFile(storeFile,'utf8'),'{"state":{}}');
}));

test('Cross-file copies reconcile once and divergent copies exclude ambiguous usage',()=>{
  const a=parseExternalSessionLog('codex',jsonl(meta,ping(100)),'a');
  const b=parseExternalSessionLog('codex',jsonl(meta,ping(100)),'b');
  const copies=reconcileExternalSnapshots([a,b]);assert.equal(copies.rows.length,1);assert.equal(copies.revisions.length,2);assert.equal(copies.conflicts.length,0);
  const forks=reconcileExternalSnapshots([a,parseExternalSessionLog('codex',jsonl(meta,ping(200)),'b')]);
  assert.equal(forks.rows.length,0);assert.equal(forks.conflicts[0]!.state,'unresolved_cross_file_divergence');assert.equal(forks.revisions.length,2);
});

test('Provider request identity is observed explicitly and never fabricated',()=>{
  const explicit={...ping(100),providerRequestId:'provider-request'};
  const parsed=parseExternalSessionLog('codex',jsonl(meta,explicit),'fixture');assert.equal(parsed.observations[0]!.providerRequestId,'provider-request');
  assert.equal(parseExternalSessionLog('codex',jsonl(meta,ping(100)),'fixture').observations[0]!.providerRequestId,null);
});

test('Copied Claude fork ancestry shares explicit message identity across session IDs',()=>{
  const row=(sessionId:string,output_tokens:number)=>({type:'assistant',sessionId,timestamp:at,message:{id:'shared-message',usage:{input_tokens:10,output_tokens}}});
  const a=parseExternalSessionLog('claude',jsonl(row('parent',20)),'a');
  const b=parseExternalSessionLog('claude',jsonl(row('fork',20)),'b');
  assert.equal(reconcileExternalSnapshots([a,b]).rows.length,1);
  const conflicting=parseExternalSessionLog('claude',jsonl(row('fork',30)),'b');
  assert.equal(reconcileExternalSnapshots([a,conflicting]).rows.length,0);
});

test('Regressing evidence is retained without replacing cumulative high-water counters',()=>{
  const report=reconcileExternalSnapshots([parseExternalSessionLog('codex',jsonl(meta,ping(200),ping(100),ping(300)),'fixture')]);
  assert.equal(report.revisions.length,3);assert.equal(report.rows[0]!.usage.input,300);
  assert.deepEqual(report.revisions.map(r=>r.revision),[0,1,2]);
});

test('Explicit CLI store ingestion persists and resumes without revealing source paths',async()=>fixture(async dir=>{
  const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
  const run=promisify(execFile),file=join(dir,'source'),storeFile=join(dir,'store');
  await writeFile(file,jsonl(meta,ping(100)));
  const args=['--import','tsx','scripts/inspect-external-session-usage.ts','--store',storeFile,'codex',file];
  const first=await run(process.execPath,args);assert.equal(JSON.parse(first.stdout).rows[0].usage.input,100);
  await appendFile(file,jsonl(ping(200)));
  const second=await run(process.execPath,args);assert.equal(JSON.parse(second.stdout).rows[0].usage.input,200);assert.ok(!second.stdout.includes(dir));
}));
