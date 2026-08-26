import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function freePort() {
  const server = http.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(), port = typeof address === 'object' && address ? address.port : 0; await new Promise(resolve => server.close(resolve)); return port;
}
async function waitFor(url) { for (let attempt = 0; attempt < 50; attempt++) { try { const response = await fetch(`${url}/health`); if (response.status === 200) return; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('fixture_node_not_ready'); }

test('generic Android node server enforces authentication, replay protection, allowlisting and local disable', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-android-node-')), port = await freePort(), token = 'fixture-token-at-least-twenty-four-characters', disableFile = path.join(root, 'disabled');
  const child = spawn(process.execPath, ['android/node-server.mjs'], {cwd: process.cwd(), env: {...process.env, AGENT_CONTROL_NODE_HOST: '127.0.0.1', AGENT_CONTROL_NODE_PORT: String(port), AGENT_CONTROL_NODE_TOKEN: token, AGENT_CONTROL_NODE_STATE_DIR: root, AGENT_CONTROL_NODE_DISABLE_FILE: disableFile}, stdio: ['ignore', 'pipe', 'pipe']});
  const output = []; child.stdout.on('data', value => output.push(String(value))); child.stderr.on('data', value => output.push(String(value)));
  const url = `http://127.0.0.1:${port}`;
  try {
    await waitFor(url);
    assert.equal((await fetch(`${url}/v2/resource`)).status, 401);
    const advertised = await (await fetch(`${url}/v2/resource`, {headers: {authorization: `Bearer ${token}`}})).json();
    assert.equal(advertised.platform.os, 'android');
    assert.equal(advertised.identity.authenticated, true);
    assert.equal(advertised.security.authority, 'agent-control-executor-only');
    assert.equal(advertised.resource.capabilities.some(capability => capability.id === 'device.nfc.reader'), false);
    const headers = {authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-agent-control-request-id': '00000000-0000-4000-8000-000000000001', 'x-agent-control-timestamp': new Date().toISOString()};
    const malformed = await fetch(`${url}/v2/jobs`, {method: 'POST', headers: {...headers, 'x-agent-control-request-id': '00000000-0000-4000-8000-000000000002'}, body: '{"type":"android.system.inspect","command":"id"}'});
    assert.equal(malformed.status, 400); assert.equal((await malformed.json()).error, 'malformed_job');
    const forbidden = await fetch(`${url}/v2/jobs`, {method: 'POST', headers: {...headers, 'x-agent-control-request-id': '00000000-0000-4000-8000-000000000003'}, body: '{"type":"nfc.inspect_tag"}'});
    assert.equal(forbidden.status, 403);
    const oversized = await fetch(`${url}/v2/jobs`, {method: 'POST', headers: {...headers, 'x-agent-control-request-id': '00000000-0000-4000-8000-000000000004'}, body: JSON.stringify({type: 'android.system.inspect', padding: 'x'.repeat(17 * 1024)})});
    assert.equal(oversized.status, 413); assert.equal((await oversized.json()).error, 'request_too_large');
    const stale = await fetch(`${url}/v2/jobs`, {method: 'POST', headers: {...headers, 'x-agent-control-request-id': '00000000-0000-4000-8000-000000000005', 'x-agent-control-timestamp': '2020-01-01T00:00:00.000Z'}, body: '{"type":"android.system.inspect"}'});
    assert.equal(stale.status, 409); assert.equal((await stale.json()).error, 'request_timestamp_stale');
    const accepted = await fetch(`${url}/v2/jobs`, {method: 'POST', headers, body: '{"type":"android.system.inspect"}'}); assert.equal(accepted.status, 200); assert.equal((await accepted.json()).status, 'JOB_COMPLETE');
    const replayed = await fetch(`${url}/v2/jobs`, {method: 'POST', headers, body: '{"type":"android.system.inspect"}'}); assert.equal(replayed.status, 409); assert.equal((await replayed.json()).error, 'request_replayed');
    fs.writeFileSync(disableFile, 'disabled by local test\n', {mode: 0o600});
    const disabled = await fetch(`${url}/health`); assert.equal(disabled.status, 503); assert.equal((await disabled.json()).status, 'disabled');
    assert.equal(output.join('').includes(token), false);
  } finally {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => child.once('exit', resolve));
    }
    fs.rmSync(root, {recursive: true, force: true});
  }
});
