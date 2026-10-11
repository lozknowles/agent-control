import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseExternalSessionLog,reconcileExternalSnapshots} from './external-session-usage.js';
import {projectExternalUsage} from './external-usage-projection.js';
import {usageProjection} from './usage-projection.js';

const meta={type:'session_meta',payload:{id:'session-1'}};
const count=(at:string,input:number)=>({type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:input,cached_input_tokens:5,output_tokens:input/10,reasoning_output_tokens:0}}}});
const log=(...r:unknown[])=>r.map(v=>JSON.stringify(v)).join('\n')+'\n';
const date=(s:string)=>Date.parse(s);

test('Codex lifetime evidence is unallocated; later bounded interval uses only observed delta',()=>{
  const snap=parseExternalSessionLog('codex',log(meta,count('2026-10-10T23:00:00Z',100),count('2026-10-11T02:00:00Z',200),count('2026-10-11T03:00:00Z',250)),'fixture');
  const report=reconcileExternalSnapshots([snap]);
  const view=projectExternalUsage(report,date('2026-10-11T00:00:00Z'),date('2026-10-12T00:00:00Z'),[]);
  assert.ok(view.rows.some(r=>r.allocation==='CROSSES_PERIOD_BOUNDARY'&&r.periodUsage===null));
  assert.ok(view.rows.some(r=>r.allocation==='BOUNDED_INTERVAL'&&r.periodUsage?.input===50));
  assert.equal(view.coverage.combinedNativeExternalTotalAvailable,false);
  assert.equal(view.apiCost,null);
});

test('Claude message event stays separate from native totals and missing cache values',()=>{
  const message={type:'assistant',sessionId:'s',timestamp:'2026-10-11T12:00:00Z',message:{id:'m',model:'fixture',usage:{input_tokens:7,output_tokens:3}}};
  const snap=parseExternalSessionLog('claude',log(message),'fixture');
  const now=new Date('2026-10-11T13:00:00Z');
  const native=usageProjection(undefined,[],{period:'today'},now);
  const mixed=usageProjection(undefined,[],{period:'today'},now,[snap]);
  assert.deepEqual(mixed.totals,native.totals);
  assert.equal(mixed.externalSessions?.rows[0]?.periodUsage?.cacheWrite,null);
  assert.equal(mixed.externalSessions?.rows[0]?.allocation,'EXACT_EVENT_TIME');
  assert.equal(mixed.externalSessions?.coverage.confirmedNativeOverlap,0);
});

test('explicit request and provider with attested matching counters confirms evidence overlap only',()=>{
  const message={type:'assistant',providerId:'anthropic',providerRequestId:'request-1',sessionId:'s',timestamp:'2026-10-11T12:00:00Z',message:{id:'m',model:'fixture',usage:{input_tokens:7,cache_read_input_tokens:2,cache_creation_input_tokens:1,output_tokens:3}}};
  const report=reconcileExternalSnapshots([parseExternalSessionLog('claude',log(message),'fixture')]);
  const native={id:'native-1',provider:'anthropic',accounting:{providerRequestId:'request-1',semantics:{input:'EXCLUDES_CACHE',reasoning:'IN_OUTPUT'},evidence:{input:7,cached:2,cacheWrite:1,output:3}}} as any;
  const matched=projectExternalUsage(report,date('2026-10-11T00:00:00Z'),date('2026-10-12T00:00:00Z'),[native]);
  assert.equal(matched.rows[0]?.nativeOverlap,'CONFIRMED_EVIDENCE_OVERLAP');
  assert.equal(matched.coverage.confirmedNativeOverlap,1);
  assert.equal(matched.coverage.combinedNativeExternalTotalAvailable,false);
  const conflict=projectExternalUsage(report,date('2026-10-11T00:00:00Z'),date('2026-10-12T00:00:00Z'),[{...native,accounting:{...native.accounting,evidence:{...native.accounting.evidence,output:4}}}]);
  assert.equal(conflict.rows[0]?.nativeOverlap,'CONFLICTING_REQUEST_ID');
});

test('external dashboard response respects native query row limit and reports coverage',()=>{
  const a={type:'assistant',sessionId:'s',timestamp:'2026-10-11T12:00:00Z',message:{id:'a',usage:{input_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0,output_tokens:1}}};
  const b={...a,message:{...a.message,id:'b'}};
  const view=usageProjection(undefined,[],{period:'all',limit:1},new Date('2026-10-11T13:00:00Z'),[parseExternalSessionLog('claude',log(a,b),'fixture')]);
  assert.equal(view.externalSessions?.coverage.rows,2);
  assert.equal(view.externalSessions?.coverage.returned,1);
  assert.equal(view.externalSessions?.rows.length,1);
});
