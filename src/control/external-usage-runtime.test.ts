import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startExternalUsageRuntime} from './external-usage-runtime.js';

test('explicit manifest enables stored dashboard projection and refreshes appended evidence',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'external-usage-runtime-'));
  const source=join(dir,'session.jsonl'),manifest=join(dir,'manifest.json');
  const row=(id:string)=>JSON.stringify({type:'assistant',sessionId:'s',timestamp:'2026-10-11T12:00:00Z',message:{id,model:'fixture',usage:{input_tokens:3,cache_read_input_tokens:0,cache_creation_input_tokens:0,output_tokens:1}}})+'\n';
  let runtime:Awaited<ReturnType<typeof startExternalUsageRuntime>>|undefined;
  try{
    await writeFile(source,row('one'));
    await writeFile(manifest,JSON.stringify({schema:'agent-control.external-usage-manifest/v1',files:[{source:'claude',file:source}]}));
    runtime=await startExternalUsageRuntime(manifest,dir,3600000);
    assert.equal(runtime.snapshot().rows.length,1);
    assert.equal(runtime.snapshot().freshness,'CURRENT');
    await appendFile(source,row('two'));await runtime.refresh();
    assert.equal(runtime.snapshot().rows.length,2);
  }finally{runtime?.close();await rm(dir,{recursive:true,force:true});}
});

test('manifest rejects relative source paths before any source read',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'external-usage-manifest-'));const manifest=join(dir,'manifest.json');
  try{await writeFile(manifest,JSON.stringify({schema:'agent-control.external-usage-manifest/v1',files:[{source:'codex',file:'relative.jsonl'}]}));
    await assert.rejects(startExternalUsageRuntime(manifest,dir),/external_manifest_invalid/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
