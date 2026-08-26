import http from 'node:http';
import net from 'node:net';
import {execFile} from 'node:child_process';
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const HOST = process.env.AGENT_CONTROL_NODE_HOST || '127.0.0.1';
const PORT = Number(process.env.AGENT_CONTROL_NODE_PORT || 8788);
const TOKEN = process.env.AGENT_CONTROL_NODE_TOKEN || '';
if (!Number.isSafeInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('android_node_port_invalid');
if (TOKEN && TOKEN.length < 24) throw new Error('android_node_token_too_short');
const STATE_DIR = path.resolve(process.env.AGENT_CONTROL_NODE_STATE_DIR || path.join(os.homedir(), '.config', 'agent-control', 'android-node'));
const DISABLE_FILE = path.resolve(process.env.AGENT_CONTROL_NODE_DISABLE_FILE || path.join(STATE_DIR, 'disabled'));
const IDENTITY_FILE = path.join(STATE_DIR, 'identity.json');
const MAX_BODY = 16 * 1024, MAX_LOG_BYTES = 256 * 1024, REPLAY_WINDOW_MS = 60_000, MAX_NONCES = 4096, MAX_JOBS = 128;
const jobs = new Map(), nonces = new Map();

function identity() {
  fs.mkdirSync(STATE_DIR, {recursive: true, mode: 0o700});
  if (fs.existsSync(IDENTITY_FILE)) {
    const value = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8'));
    if (typeof value.instanceId === 'string' && /^[0-9a-f-]{36}$/i.test(value.instanceId)) return value.instanceId;
    throw new Error('android_node_identity_invalid');
  }
  const instanceId = randomUUID(), temporary = `${IDENTITY_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({instanceId})}\n`, {mode: 0o600, flag: 'wx'});
  fs.renameSync(temporary, IDENTITY_FILE);
  return instanceId;
}

const INSTANCE_ID = identity();
const RESOURCE_ID = process.env.AGENT_CONTROL_RESOURCE_ID || `android-${INSTANCE_ID.replaceAll('-', '').slice(0, 16)}`;
if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(RESOURCE_ID)) throw new Error('android_node_resource_id_invalid');
const capabilities = ['platform.android', 'device.physical', 'execution.android.typed_jobs', 'android.system.inspect', 'observe.android.logcat'];
const now = () => new Date().toISOString();
const disabled = () => process.env.AGENT_CONTROL_NODE_ENABLED === '0' || fs.existsSync(DISABLE_FILE) || !TOKEN;

function allowedSource(value = '') {
  const address = value.startsWith('::ffff:') ? value.slice(7) : value;
  if (address === '::1' || address.startsWith('127.')) return true;
  if (net.isIPv4(address)) {
    const [first, second] = address.split('.').map(Number);
    return first === 10 || first === 100 && (second & 0xC0) === 0x40 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
  }
  if (net.isIPv6(address)) { const first = Number.parseInt(address.split(':')[0] || '0', 16); return (first & 0xFE00) === 0xFC00 || (first & 0xFFC0) === 0xFE80; }
  return false;
}

function send(response, status, body) {
  const payload = `${JSON.stringify(body)}\n`;
  response.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store'});
  response.end(payload);
}

function authenticated(request) {
  const value = request.headers.authorization;
  if (!TOKEN || typeof value !== 'string' || !value.startsWith('Bearer ')) return false;
  const supplied = createHash('sha256').update(value.slice(7)).digest(), expected = createHash('sha256').update(TOKEN).digest();
  return timingSafeEqual(supplied, expected);
}

function replayProtected(request) {
  const id = request.headers['x-agent-control-request-id'], timestamp = request.headers['x-agent-control-timestamp'];
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || typeof timestamp !== 'string') return 'replay_headers_required';
  const at = Date.parse(timestamp), current = Date.now();
  for (const [nonce, seen] of nonces) if (current - seen > REPLAY_WINDOW_MS) nonces.delete(nonce);
  if (!Number.isFinite(at) || Math.abs(current - at) > REPLAY_WINDOW_MS) return 'request_timestamp_stale';
  if (nonces.has(id)) return 'request_replayed';
  if (nonces.size >= MAX_NONCES) return 'replay_window_capacity_exhausted';
  nonces.set(id, current);
  return undefined;
}

async function body(request) {
  let size = 0, raw = '';
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('request_too_large'), {status: 413});
    raw += chunk;
  }
  try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('invalid_json'), {status: 400}); }
}

async function properties() {
  const keys = ['ro.product.manufacturer', 'ro.product.model', 'ro.product.device', 'ro.build.version.release', 'ro.build.version.sdk'], output = {};
  for (const key of keys) {
    try { output[key] = (await exec('getprop', [key], {timeout: 2000})).stdout.trim(); } catch { output[key] = ''; }
  }
  return output;
}

async function logs(lines) {
  const count = Math.max(1, Math.min(Number(lines) || 30, 200));
  const result = await exec('logcat', ['-d', '-t', String(count), '-v', 'threadtime'], {timeout: 5000, maxBuffer: MAX_LOG_BYTES});
  return {count, output: result.stdout.slice(0, MAX_LOG_BYTES)};
}

function provenance(type, status = 'JOB_COMPLETE') {
  return [{at: now(), event: 'JOB_CREATED'}, {at: now(), event: type === 'nfc.inspect_tag' ? 'ROUTED_TO_ANDROID_NFC_NODE' : 'ROUTED_TO_ANDROID_NODE'}, {at: now(), event: status}];
}

async function createJob(value) {
  if (!value || typeof value !== 'object' || typeof value.type !== 'string') throw Object.assign(new Error('malformed_job'), {status: 400});
  const allowedKeys = value.type === 'android.observe.logs' ? new Set(['type', 'lines']) : new Set(['type']);
  if (Object.keys(value).some(key => !allowedKeys.has(key))) throw Object.assign(new Error('malformed_job'), {status: 400});
  if (!['android.system.inspect', 'android.observe.logs'].includes(value.type)) throw Object.assign(new Error('capability_not_authorized'), {status: 403, allowed: ['android.system.inspect', 'android.observe.logs']});
  while (jobs.size >= MAX_JOBS) jobs.delete(jobs.keys().next().value);
  const jobId = randomUUID(), observedAt = now();
  let result;
  if (value.type === 'android.system.inspect') result = {schema: 'agent-control.android-diagnostic/v1', policy: 'read-only', nodeId: RESOURCE_ID, platform: await properties(), observedAt};
  else { const observation = await logs(value.lines); result = {schema: 'agent-control.android-log-observation/v1', policy: 'read-only', lines: observation.count, output: observation.output, observedAt}; }
  const job = {jobId, type: value.type, status: 'JOB_COMPLETE', result, observedAt, provenance: provenance(value.type)};
  jobs.set(jobId, job);
  return job;
}

function resource(platform) {
  return {
    schema: 'agent-control.resource/v2', agentVersion: '3.1.0', observedAt: now(),
    identity: {nodeId: RESOURCE_ID, instanceId: INSTANCE_ID, authenticated: true},
    platform: {os: 'android', manufacturer: platform['ro.product.manufacturer'], model: platform['ro.product.model'], version: platform['ro.build.version.release'], sdk: platform['ro.build.version.sdk']},
    resource: {id: RESOURCE_ID, type: 'host', health: disabled() ? 'degraded' : 'healthy', capabilities: capabilities.map(id => ({id}))},
    security: {authority: 'agent-control-executor-only', jobs: 'typed-allowlist', replayProtection: 'request-id-and-timestamp', humanDisable: 'local-disable-file-or-process-stop'},
  };
}

const server = http.createServer(async (request, response) => {
  try {
    if (!allowedSource(request.socket.remoteAddress)) return send(response, 403, {error: 'private_transport_source_required'});
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'GET' && url.pathname === '/health') return send(response, disabled() ? 503 : 200, {schema: 'agent-control.node-health/v1', status: disabled() ? 'disabled' : 'ok', version: '3.1.0', enabled: !disabled()});
    if (!authenticated(request)) return send(response, 401, {error: 'unauthorized'});
    if (disabled()) return send(response, 503, {error: 'node_disabled_by_human'});
    if (request.method === 'GET' && url.pathname === '/v2/resource') return send(response, 200, resource(await properties()));
    if (request.method === 'POST' && url.pathname === '/v2/jobs') {
      const replay = replayProtected(request); if (replay) return send(response, 409, {error: replay});
      try { return send(response, 200, await createJob(await body(request))); } catch (error) { return send(response, error.status ?? 500, {error: error.message, ...(error.allowed ? {allowed: error.allowed} : {})}); }
    }
    const match = /^\/v2\/jobs\/([0-9a-f-]{36})$/i.exec(url.pathname);
    if (request.method === 'GET' && match) { const job = jobs.get(match[1]); return job ? send(response, 200, job) : send(response, 404, {error: 'job_not_found'}); }
    if (request.method === 'DELETE' && match) {
      const replay = replayProtected(request); if (replay) return send(response, 409, {error: replay});
      const job = jobs.get(match[1]); if (!job) return send(response, 404, {error: 'job_not_found'});
      if (job.status === 'JOB_COMPLETE') return send(response, 409, {error: 'job_already_terminal'});
      job.status = 'CANCELLED'; job.observedAt = now(); job.provenance.push({at: job.observedAt, event: 'CANCELLED'}); return send(response, 200, job);
    }
    return send(response, 404, {error: 'not_found'});
  } catch (error) { return send(response, error.status ?? 500, {error: error.status ? error.message : 'internal_error'}); }
});

server.listen(PORT, HOST, () => console.log(`agent-control-node ${RESOURCE_ID} listening http://${HOST}:${PORT}`));
