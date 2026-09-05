import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {main} from './agent-control.mjs';

test('package-bin symlink executes the Agent Control command entrypoint', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-bin-'));
  const source = fileURLToPath(new URL('./agent-control.mjs', import.meta.url));
  const command = path.join(root, 'agent-control');
  fs.symlinkSync(source, command);
  const result = spawnSync(command, ['--help'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /agent-control status \[--json\]/);
});

test('package-bin reports the installed Agent Control version', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-version-bin-'));
  const source = fileURLToPath(new URL('./agent-control.mjs', import.meta.url));
  const command = path.join(root, 'agent-control');
  fs.symlinkSync(source, command);
  const result = spawnSync(command, ['--version'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const packageVersion = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).version;
  assert.equal(result.stdout.trim(), `agent-control ${packageVersion}`);
});

test('Jobs CLI reads definitions and sends authenticated schema-valid create requests',async()=>{
  const originalFetch=globalThis.fetch,originalUrl=process.env.AGENT_CONTROL_WEB_URL,originalToken=process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN,requests=[];
  process.env.AGENT_CONTROL_WEB_URL='http://127.0.0.1:4310';process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN='fixture-token';
  globalThis.fetch=async(input,init={})=>{requests.push({url:String(input),init});return new Response(JSON.stringify(init.method==='POST'?{id:'example-review'}:[{id:'repository-code-review'}]),{status:init.method==='POST'?201:200,headers:{'content-type':'application/json'}})};
  const output=[],errors=[];
  try{
    assert.equal(await main(['jobs','definitions'],{out:value=>output.push(value),error:value=>errors.push(value)}),0);
    assert.match(output[0],/repository-code-review/);
    assert.equal(await main(['jobs','create','--definition','repository-code-review','--name','Example Review','--node','controller','--repository','/srv/repositories/example','--schedule','0 2 * * *'],{out:value=>output.push(value),error:value=>errors.push(value)}),0);
    const create=requests[1];assert.equal(create.init.method,'POST');assert.equal(create.init.headers.Authorization,'Bearer fixture-token');const body=JSON.parse(create.init.body);assert.equal(body.routing.modelRole,'review.default');assert.equal(body.budgets.maximumOutputTokens,65536);assert.equal(body.schedule.timezone,'Europe/London');assert.equal(body.actor,'cli-operator');assert.deepEqual(errors,[]);
  }finally{globalThis.fetch=originalFetch;if(originalUrl===undefined)delete process.env.AGENT_CONTROL_WEB_URL;else process.env.AGENT_CONTROL_WEB_URL=originalUrl;if(originalToken===undefined)delete process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN;else process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN=originalToken;}
});
