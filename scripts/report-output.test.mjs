import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {exportReport} from './report-output.mjs';
test('headless export writes real Markdown and JSON files, validates digest and refuses overwrite',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ac-reports-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));let calls=0;
 for(const profile of ['simple','evidence']){const content=profile==='simple'?'# Actual report':'{"runId":"run"}',filename=profile==='simple'?'job-simple.md':'job-evidence.json';
 const request=async(url,options)=>{calls++;assert.equal(options.redirect,'error');assert.match(url.pathname,new RegExp('/outputs/'+profile+'$'));return new Response(JSON.stringify({filename,content,profile,runId:'run',sourceSha256:'s',sha256:createHash('sha256').update(content).digest('hex')}));};
 const args={baseUrl:'http://127.0.0.1:4310',token:'existing-test-token',runId:'run',profile,directory,request};const result=await exportReport(args);assert.equal(await fs.readFile(result.path,'utf8'),content);await assert.rejects(exportReport(args),{code:'EEXIST'});}
 assert.equal(calls,4);await assert.rejects(exportReport({baseUrl:'http://remote.invalid',token:'secret',runId:'r'}),/endpoint_invalid/);
});
