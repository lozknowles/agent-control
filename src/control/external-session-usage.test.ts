import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseExternalSessionLog,readExternalSessionLog,reconcileExternalSnapshots} from './external-session-usage.js';
const at='2026-10-11T12:00:00Z';
const jsonl=(...rows:unknown[])=>rows.map(r=>JSON.stringify(r)).join('\n')+'\n';
const meta={type:'session_meta',payload:{id:'s'}};
const codex=(input=100,output=20)=>({type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:input,cached_input_tokens:70,output_tokens:output,reasoning_output_tokens:5},last_token_usage:{input_tokens:999}}}});
const claude=(output=20)=>({type:'assistant',sessionId:'s',timestamp:at,message:{id:'m',model:'fixture',usage:{input_tokens:30,cache_read_input_tokens:70,cache_creation_input_tokens:10,output_tokens:output}}});
test('Codex repeated cumulative pings deduplicate, increasing counters retain revisions',()=>{
 const s=parseExternalSessionLog('codex',jsonl(meta,codex(),codex(),codex(200,40)),'fixture');
 assert.equal(s.duplicates,1);assert.equal(s.observations.length,2);
 const p=reconcileExternalSnapshots([s,s]);assert.equal(p.rows.length,1);assert.equal(p.revisions.length,2);assert.equal(p.rows[0]!.usage.totalProcessed,240);assert.equal(p.apiCost,null);
});
test('Claude streaming identity replaces earlier message usage without summing',()=>{
 const s=parseExternalSessionLog('claude',jsonl(claude(10),claude(20),claude(20)),'fixture');
 const p=reconcileExternalSnapshots([s]);assert.equal(p.rows.length,1);assert.equal(p.rows[0]!.usage.totalProcessed,130);assert.equal(p.revisions.length,2);assert.equal(s.duplicates,1);
});
test('Source identity isolates copies and providers; paths are withheld',()=>{
 const a=parseExternalSessionLog('claude',jsonl(claude()),'/private/a'),b=parseExternalSessionLog('claude',jsonl(claude()),'/private/b');
 assert.notEqual(a.observations[0]!.id,b.observations[0]!.id);assert.ok(!JSON.stringify(a).includes('/private/'));
});
test('Corruption, partial tails, missing identity and regressing counters create coverage gaps',()=>{
 const s=parseExternalSessionLog('codex',jsonl(meta,codex(),codex(90))+'bad\n'+JSON.stringify(codex()),'fixture');
 assert.deepEqual(s.gaps.map(g=>g.reason),['counter_regression','invalid_record_or_usage','partial_tail']);
 assert.equal(reconcileExternalSnapshots([s]).rows[0]!.usage.input,100);
 assert.equal(parseExternalSessionLog('codex',jsonl(codex()),'fixture').gaps.length,1);
});
test('Malformed counters are rejected and absent counters remain unknown',()=>{
 const row=claude();(row.message.usage as any).input_tokens='30';
 assert.equal(parseExternalSessionLog('claude',jsonl(row),'fixture').observations.length,0);
 delete (row.message.usage as any).input_tokens;
 assert.equal(parseExternalSessionLog('claude',jsonl(row),'fixture').observations[0]!.usage.totalProcessed,null);
});
test('Reader is bounded and leaves source bytes unchanged',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'external-usage-test-'));const file=join(dir,'log.jsonl'),content=jsonl(meta,codex());
 try{await writeFile(file,content);assert.equal((await readExternalSessionLog('codex',file)).observations.length,1);
 await assert.rejects(readExternalSessionLog('codex',file,1),/capacity/);assert.equal(await readFile(file,'utf8'),content);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Repeated Codex pings at different timestamps remain duplicates',()=>{
 const b=codex();b.timestamp='2026-10-11T12:01:00Z';
 const s=parseExternalSessionLog('codex',jsonl(meta,codex(),b),'fixture');
 assert.equal(s.duplicates,1);assert.equal(s.observations.length,1);
});
test('Null pings are ignored; last-only usage is explicitly uncovered',()=>{
 const s=parseExternalSessionLog('codex',jsonl(meta,{type:'event_msg',payload:{type:'token_count',info:null}},{type:'event_msg',payload:{type:'token_count',info:{last_token_usage:{input_tokens:10}}}}),'fixture');
 assert.equal(s.observations.length,0);assert.equal(s.gaps[0]!.reason,'missing_cumulative_identity');
});
test('Optional external projection cannot alter native totals or retained history',async()=>{
 const {usageProjection}=await import('./usage-projection.js');
 const base=usageProjection(undefined,[],{period:'all'},new Date('2026-10-11T13:00:00Z'));
 const s=parseExternalSessionLog('claude',jsonl(claude()),'fixture');
 const withExternal=usageProjection(undefined,[],{period:'all'},new Date('2026-10-11T13:00:00Z'),[s]);
 assert.deepEqual(withExternal.totals,base.totals);assert.deepEqual(withExternal.history,base.history);
 assert.equal(withExternal.externalSessions!.rows.length,1);assert.equal(withExternal.externalSessions!.nativeAccountingEffect,'NONE');
 assert.ok(!('externalSessions' in base));
});

test('Truncated subsequent snapshots retain the high-water row with a coverage gap',()=>{
 const a=parseExternalSessionLog('codex',jsonl(meta,codex(200,40)),'fixture');
 const b=parseExternalSessionLog('codex',jsonl(meta,codex()),'fixture');
 const p=reconcileExternalSnapshots([a,b]);
 assert.equal(p.rows[0]!.usage.input,200);assert.equal(p.revisions.length,2);
 assert.ok(p.gaps.some(g=>g.reason==='snapshot_counter_regression'));
});

test('CLI exposes read-only observations and redacts file errors',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),'external-cli-test-')),file=join(dir,'log.jsonl');
 try{await writeFile(file,jsonl(meta,codex()));
 const {stdout}=await run(process.execPath,['--import','tsx','scripts/inspect-external-session-usage.ts','codex',file]);
 const result=JSON.parse(stdout);assert.equal(result.rows.length,1);assert.equal(result.nativeAccountingEffect,'NONE');
 assert.ok(!stdout.includes(dir));
 await assert.rejects(run(process.execPath,['--import','tsx','scripts/inspect-external-session-usage.ts','claude',join(dir,'missing')]),(error:any)=>{
 assert.ok(!error.stderr.includes(dir));assert.match(error.stderr,/inspection failed/);return true;});
 }finally{await rm(dir,{recursive:true,force:true});}
});
