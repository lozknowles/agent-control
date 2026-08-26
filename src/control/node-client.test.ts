import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import {fetchNodeAdvertisement, fetchNodeResource, runNodeJob} from './node-client.js';

async function fixture(mode: 'complete' | 'waiting' | 'oversized' = 'complete') {
  let cancelled = 0, mutationHeaders: Array<{id?: string; timestamp?: string}> = [];
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url !== '/health' && request.headers.authorization !== 'Bearer secret') { response.statusCode = 401; return response.end('{"error":"unauthorized"}'); }
    if (request.url === '/v2/resource') return response.end(mode === 'oversized' ? JSON.stringify({padding: 'x'.repeat(1024 * 1024 + 1)}) : JSON.stringify({schema: 'agent-control.resource/v2', identity: {nodeId: 'android', authenticated: true}, platform: {os: 'android'}, resource: {id: 'android', type: 'host', health: 'healthy', capabilities: [{id: 'platform.android'}, {id: 'execution.android.typed_jobs'}, {id: 'android.system.inspect'}]}, security: {authority: 'agent-control-executor-only'}}));
    if (request.url === '/v2/jobs' && request.method === 'POST') {
      mutationHeaders.push({id: request.headers['x-agent-control-request-id'] as string, timestamp: request.headers['x-agent-control-timestamp'] as string});
      let raw = ''; request.on('data', chunk => raw += chunk); return request.on('end', () => { const body = JSON.parse(raw); if (body.type === 'android.execute.shell') { response.statusCode = 403; return response.end('{"error":"capability_not_authorized"}'); } response.end(JSON.stringify(mode === 'complete' ? {jobId: '00000000-0000-4000-8000-000000000001', status: 'JOB_COMPLETE', result: {ok: true}} : {jobId: '00000000-0000-4000-8000-000000000001', status: 'WAITING_FOR_CARD'})); });
    }
    if (request.url?.startsWith('/v2/jobs/') && request.method === 'GET') return response.end('{"jobId":"00000000-0000-4000-8000-000000000001","status":"WAITING_FOR_CARD"}');
    if (request.url?.startsWith('/v2/jobs/') && request.method === 'DELETE') { cancelled++; mutationHeaders.push({id: request.headers['x-agent-control-request-id'] as string, timestamp: request.headers['x-agent-control-timestamp'] as string}); return response.end('{"jobId":"00000000-0000-4000-8000-000000000001","status":"CANCELLED"}'); }
    response.statusCode = 404; response.end('{}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {server, url: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`, cancelled: () => cancelled, mutationHeaders};
}

test('remote node advertisement becomes infrastructure-neutral Resource with authenticated identity retained separately', async () => {
  const value = await fixture();
  try {
    const advertisement = await fetchNodeAdvertisement({baseUrl: value.url, token: 'secret'}), resource = await fetchNodeResource({baseUrl: value.url, token: 'secret'});
    assert.equal(advertisement.identity?.authenticated, true);
    assert.equal(advertisement.platform?.os, 'android');
    assert.equal(resource.id, 'android');
    assert.equal(resource.capabilities.find(capability => capability.id === 'platform.android')?.kind, 'platform');
  } finally { value.server.close(); }
});

test('node authority remains enforced through generic client', async () => {
  const value = await fixture();
  try { await assert.rejects(() => runNodeJob({baseUrl: value.url, token: 'secret'}, 'android.execute.shell'), /node_http_403:capability_not_authorized/); }
  finally { value.server.close(); }
});

test('node client rejects an oversized response while streaming it', async () => {
  const value = await fixture('oversized');
  try { await assert.rejects(() => fetchNodeAdvertisement({baseUrl: value.url, token: 'secret'}), /node_response_too_large/); }
  finally { value.server.close(); }
});

test('typed job cancellation during a poll wait reaches the remote endpoint and carries replay headers', async () => {
  const value = await fixture('waiting'), controller = new AbortController(); let scheduled = false;
  try {
    await assert.rejects(() => runNodeJob({baseUrl: value.url, token: 'secret'}, 'nfc.inspect_tag', {}, {signal: controller.signal, pollMs: 20, onProgress: job => { if (job.status === 'WAITING_FOR_CARD' && !scheduled) { scheduled = true; setTimeout(() => controller.abort('test_cancel'), 1); } }}), /node_job_cancelled/);
    assert.equal(value.cancelled(), 1);
    assert.equal(value.mutationHeaders.length, 2);
    assert.ok(value.mutationHeaders.every(headers => /^[0-9a-f-]{36}$/i.test(headers.id ?? '') && !Number.isNaN(Date.parse(headers.timestamp ?? ''))));
    assert.notEqual(value.mutationHeaders[0].id, value.mutationHeaders[1].id);
  } finally { value.server.close(); }
});

test('typed job timeout cancels the remote job', async () => {
  const value = await fixture('waiting');
  try {
    await assert.rejects(() => runNodeJob({baseUrl: value.url, token: 'secret'}, 'nfc.inspect_tag', {}, {timeoutMs: 20, pollMs: 5}), /node_job_timeout/);
    assert.equal(value.cancelled(), 1);
  } finally { value.server.close(); }
});
