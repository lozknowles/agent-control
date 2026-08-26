import {randomUUID} from 'node:crypto';
import type {Capability, CapabilityKind, Resource} from './capabilities.js';
import type {Trace} from './telemetry.js';

export interface NodeClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  trace?: Trace;
  resource?: string;
  signal?: AbortSignal;
}

export interface NodeHealthResponse {
  schema?: string;
  status: string;
  node?: string;
  version?: string;
  enabled?: boolean;
}

export interface NodeAdvertisement {
  schema: 'agent-control.resource/v2';
  agentVersion?: string;
  identity?: {nodeId?: string; instanceId?: string; authenticated?: boolean};
  platform?: {os?: string; version?: string; sdk?: string | number; manufacturer?: string; model?: string};
  resource: {
    id: string;
    type?: Resource['type'];
    health?: Resource['health'];
    capabilities: Array<{id: string; kind?: CapabilityKind; attributes?: Capability['attributes']}>;
  };
  security?: {authority?: string; jobs?: string; replayProtection?: string; humanDisable?: string};
  observedAt?: string;
}

export type NodeJobState = 'JOB_CREATED' | 'ROUTED_TO_ANDROID_NFC_NODE' | 'WAITING_FOR_CARD' | 'CARD_DETECTED' | 'SAFE_METADATA_READ' | 'RESULT_RETURNED' | 'JOB_COMPLETE' | 'CANCELLED' | 'TIMED_OUT' | 'FAILED';
export interface NodeJobResponse {jobId?: string; type?: string; status: NodeJobState | string; result?: unknown; error?: string; provenance?: unknown; observedAt?: string;}
export interface RunNodeJobOptions {timeoutMs?: number; pollMs?: number; signal?: AbortSignal; onProgress?: (job: NodeJobResponse) => void;}

const MAX_RESPONSE_BYTES = 1024 * 1024;
const terminal = new Set(['JOB_COMPLETE', 'CANCELLED', 'TIMED_OUT', 'FAILED', 'completed']);

async function boundedResponseText(response: Response) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) { await response.body?.cancel('node_response_too_large'); throw new Error('node_response_too_large'); }
  if (!response.body) return '';
  const reader = response.body.getReader(), chunks: Buffer[] = []; let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) { await reader.cancel('node_response_too_large'); throw new Error('node_response_too_large'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

async function call<T>(options: NodeClientOptions, pathname: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort('node_request_timeout'), options.timeoutMs ?? 5000);
  const abort = () => controller.abort(options.signal?.reason ?? 'node_request_cancelled');
  options.signal?.addEventListener('abort', abort, {once: true});
  if (options.signal?.aborted) abort();
  const span = options.trace?.span('transport.node.http', {resource: options.resource, attributes: {path: pathname, method: String(init.method ?? 'GET')}});
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}${pathname}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(authenticated ? {authorization: `Bearer ${options.token}`} : {}),
        ...init.headers,
      },
    });
    const raw = await boundedResponseText(response);
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { throw new Error('node_invalid_json'); }
    if (!response.ok) {
      span?.end(false, {status: response.status});
      throw new Error(`node_http_${response.status}:${body?.error ?? response.statusText}`);
    }
    span?.end(true, {status: response.status});
    return body as T;
  } catch (error) {
    span?.end(false, {error: error instanceof Error ? error.name : 'error'});
    if (controller.signal.aborted && controller.signal.reason === 'node_request_timeout') throw new Error('node_request_timeout');
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

function mutationHeaders() {
  return {'content-type': 'application/json', 'x-agent-control-request-id': randomUUID(), 'x-agent-control-timestamp': new Date().toISOString()};
}

export async function fetchNodeHealth(options: NodeClientOptions) { return call<NodeHealthResponse>(options, '/health', {}, false); }
export async function fetchNodeAdvertisement(options: NodeClientOptions) { return call<NodeAdvertisement>(options, '/v2/resource'); }
export async function fetchNodeResource(options: NodeClientOptions): Promise<Resource> {
  const body = await fetchNodeAdvertisement(options);
  return {id: body.resource.id, type: body.resource.type ?? 'host', health: body.resource.health ?? 'unknown', capabilities: body.resource.capabilities.map(capability => ({id: capability.id, kind: capability.kind ?? inferKind(capability.id), attributes: capability.attributes}))};
}

export async function createNodeJob(options: NodeClientOptions, type: string, payload: Record<string, unknown> = {}) {
  return call<NodeJobResponse>(options, '/v2/jobs', {method: 'POST', headers: mutationHeaders(), body: JSON.stringify({type, ...payload})});
}
export async function fetchNodeJob(options: NodeClientOptions, jobId: string) { return call<NodeJobResponse>(options, `/v2/jobs/${encodeURIComponent(jobId)}`); }
export async function cancelNodeJob(options: NodeClientOptions, jobId: string) { return call<NodeJobResponse>(options, `/v2/jobs/${encodeURIComponent(jobId)}`, {method: 'DELETE', headers: mutationHeaders()}); }

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function runNodeJob<T = NodeJobResponse>(options: NodeClientOptions, type: string, payload: Record<string, unknown> = {}, run: RunNodeJobOptions = {}): Promise<T> {
  const started = Date.now(), timeoutMs = run.timeoutMs ?? 120_000, pollMs = run.pollMs ?? 250;
  let job = await createNodeJob({...options, signal: undefined}, type, payload);
  run.onProgress?.(structuredClone(job));
  if (terminal.has(job.status)) {
    if (job.status === 'FAILED' || job.status === 'TIMED_OUT' || job.status === 'CANCELLED') throw new Error(`node_job_${job.status.toLowerCase()}:${job.error ?? 'no_detail'}`);
    return job as T;
  }
  if (!job.jobId) throw new Error('node_job_id_missing');
  const jobId = job.jobId;
  while (true) {
    if (run.signal?.aborted) {
      try { await cancelNodeJob(options, jobId); } catch { /* Local cancellation still fails closed. */ }
      throw new Error('node_job_cancelled');
    }
    if (Date.now() - started >= timeoutMs) {
      try { await cancelNodeJob(options, jobId); } catch { /* Timeout remains authoritative locally. */ }
      throw new Error('node_job_timeout');
    }
    await wait(pollMs);
    if (run.signal?.aborted) continue;
    try { job = await fetchNodeJob({...options, signal: run.signal}, jobId); }
    catch (error) {
      if (!run.signal?.aborted) throw error;
      try { await cancelNodeJob({...options, signal: undefined}, jobId); } catch { /* Local cancellation still fails closed. */ }
      throw new Error('node_job_cancelled');
    }
    run.onProgress?.(structuredClone(job));
    if (!terminal.has(job.status)) continue;
    if (job.status === 'FAILED' || job.status === 'TIMED_OUT' || job.status === 'CANCELLED') throw new Error(`node_job_${job.status.toLowerCase()}:${job.error ?? 'no_detail'}`);
    return job as T;
  }
}

function inferKind(id: string): CapabilityKind {
  if (id.startsWith('platform.') || id.startsWith('device.') || id.startsWith('location.')) return 'platform';
  if (id.startsWith('harness.')) return 'harness';
  if (id.startsWith('transport.') || id.startsWith('network.')) return 'transport';
  if (id.startsWith('provider.')) return 'provider';
  if (id.startsWith('compute.')) return 'compute';
  if (id.startsWith('skill.')) return 'intelligence';
  if (id.startsWith('data.')) return 'data';
  return 'tool';
}
