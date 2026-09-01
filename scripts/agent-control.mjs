#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {formatAuthoritativeStatus, readAuthoritativeStatus, statusExitCode, StatusClientError} from './status-client.mjs';

const usage = `Agent Control command line

Usage:
  agent-control status [--json]
  agent-control acp
  agent-control jobs definitions [definition-id]
  agent-control jobs saved [saved-job-id]
  agent-control jobs schedules
  agent-control jobs runs [run-id] [--saved-job ID]
  agent-control jobs create --definition ID --name NAME --node NODE --repository PATH [options]
  agent-control jobs import --file FILE
  agent-control jobs export SAVED-JOB-ID
  agent-control jobs run SAVED-JOB-ID
  agent-control jobs enable|disable SAVED-JOB-ID --revision N
  agent-control jobs update SAVED-JOB-ID --revision N --file FILE
  agent-control jobs cancel RUN-ID

The status command reads the same authoritative projection as the web dashboard.
It uses the controller-local endpoint by default or the configured SSH transport
from the node's status-client configuration.

Job reads use AGENT_CONTROL_WEB_URL (default http://127.0.0.1:4310). Mutations
use AGENT_CONTROL_WEB_OPERATOR_TOKEN only as an Authorization header.

The acp command serves stable ACP v1 as newline-delimited JSON-RPC over stdio.
It admits the pre-registered AGENT_CONTROL_ACP_ACTOR_ID (default web-operator).`;

export async function main(argv = process.argv.slice(2), io = {out: console.log, error: console.error}) {
  const command = argv[0];
  if (command === '--help' || command === '-h') { io.out(usage); return 0; }
  if (command === 'acp') return argv.length === 1 ? runAcpCommand() : (io.error(usage), 2);
  if (command === 'jobs') return jobsCommand(argv.slice(1), io);
  if (command !== 'status') { io.error(usage); return 2; }
  const flags = new Set(argv.slice(1));
  if ([...flags].some(flag => !['--json'].includes(flag))) { io.error(usage); return 2; }
  try {
    const result = await readAuthoritativeStatus();
    io.out(flags.has('--json') ? JSON.stringify(result.snapshot, null, 2) : formatAuthoritativeStatus(result.snapshot, result.source).trimEnd());
    return statusExitCode(result.snapshot);
  } catch (error) {
    const item = error instanceof StatusClientError ? error : new StatusClientError('STATUS_FAILED', error instanceof Error ? error.message : String(error));
    if (flags.has('--json')) io.out(JSON.stringify({schema: 'agent-control.status-error/v1', result: 'UNREACHABLE', error: item.code, detail: item.message}, null, 2));
    else io.error(`AGENT CONTROL UNREACHABLE\n${item.code}: ${item.message}`);
    return 2;
  }
}

async function runAcpCommand() {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/acp.ts');
  const tsx = createRequire(import.meta.url).resolve('tsx');
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', tsx, script], {stdio: 'inherit', env: process.env});
    child.once('error', reject); child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function jobsCommand(argv, io) {
  const [operation, id] = argv, options = parseOptions(argv.slice(id && !id.startsWith('--') ? 2 : 1));
  try {
    let result;
    if (operation === 'definitions') result = await jobsRequest(id ? `/api/job-definitions/${encodeURIComponent(id)}` : '/api/job-definitions');
    else if (operation === 'saved') result = await jobsRequest(id ? `/api/saved-jobs/${encodeURIComponent(id)}` : '/api/saved-jobs');
    else if (operation === 'schedules') result = await jobsRequest('/api/job-schedules');
    else if (operation === 'runs') result = await jobsRequest(id ? `/api/job-runs/${encodeURIComponent(id)}` : `/api/job-runs${options['saved-job'] ? `?savedJobId=${encodeURIComponent(options['saved-job'])}` : ''}`);
    else if (operation === 'export' && id) result = await jobsRequest(`/api/saved-jobs/${encodeURIComponent(id)}/export`);
    else if (operation === 'run' && id) result = await jobsRequest(`/api/saved-jobs/${encodeURIComponent(id)}/run`, {});
    else if (operation === 'cancel' && id) result = await jobsRequest(`/api/job-runs/${encodeURIComponent(id)}/cancel`, {});
    else if ((operation === 'enable' || operation === 'disable') && id) result = await jobsRequest(`/api/saved-jobs/${encodeURIComponent(id)}/${operation}`, {revision: requiredInteger(options.revision, '--revision')});
    else if (operation === 'import') result = await jobsRequest('/api/saved-jobs', readJsonFile(required(options.file, '--file')));
    else if (operation === 'update' && id) result = await jobsRequest(`/api/saved-jobs/${encodeURIComponent(id)}`, {revision: requiredInteger(options.revision, '--revision'), changes: readJsonFile(required(options.file, '--file'))});
    else if (operation === 'create') result = await jobsRequest('/api/saved-jobs', createSavedJobPayload(options));
    else { io.error(usage); return 2; }
    io.out(JSON.stringify(result, null, 2)); return 0;
  } catch (error) { io.error(error instanceof Error ? error.message : String(error)); return 2; }
}

function parseOptions(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index++) { const key = argv[index]; if (!key.startsWith('--')) throw new Error(`unexpected argument: ${key}`); const next = argv[index + 1]; if (!next || next.startsWith('--')) values[key.slice(2)] = true; else { values[key.slice(2)] = next; index++; } }
  return values;
}
function required(value, label) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`); return value.trim(); }
function requiredInteger(value, label) { const number = Number(value); if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} must be a positive integer`); return number; }
function optionalNumber(value, label) { if (value === undefined) return undefined; const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be a non-negative number`); return number; }
function readJsonFile(file) { const value = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Saved Job file must contain one JSON object'); return value; }
function createSavedJobPayload(options) {
  const name = required(options.name, '--name'), definition = required(options.definition, '--definition'), node = required(options.node, '--node'), repository = required(options.repository, '--repository');
  const id = typeof options.id === 'string' ? options.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64), explicitModel = typeof options.model === 'string' ? options.model : undefined, cron = typeof options.schedule === 'string' ? options.schedule : undefined, maxCost = optionalNumber(options['max-cost'], '--max-cost');
  return {id, name, definition: {id: definition, version: Number(options['definition-version'] ?? 1), follow: options.pinned ? 'pinned' : 'latest-compatible'}, parameters: {node, repository, ref: options.ref ?? 'main', scope: options.scope ?? 'changes', ...(options['compare-against'] ? {compareAgainst: options['compare-against']} : {})}, routing: explicitModel ? {model: explicitModel, allowFallback: false} : {modelRole: options['model-role'] ?? 'review.default', allowFallback: options['no-fallback'] !== true}, contextProfile: options.context ?? 'STANDARD', budgets: {timeoutMinutes: Number(options.timeout ?? 90), maximumRetries: Number(options.retries ?? 1), maximumInputTokens: Number(options['max-input-tokens'] ?? 120000), maximumOutputTokens: Number(options['max-output-tokens'] ?? 65536), ...(maxCost === undefined ? {} : {maxCost})}, ...(cron ? {schedule: {kind: 'cron', cron, timezone: options.timezone ?? 'Europe/London', enabled: true, missedRunPolicy: options['missed-run-policy'] ?? 'run-once-immediately'}} : {}), concurrency: options.concurrency ?? 'forbid-overlap', enabled: true};
}
function jobsBaseUrl(environment = process.env) {
  const value = environment.AGENT_CONTROL_WEB_URL || `http://127.0.0.1:${environment.AGENT_CONTROL_WEB_PORT || 4310}`; let url;
  try { url = new URL(value); } catch { throw new Error('AGENT_CONTROL_WEB_URL is invalid'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('AGENT_CONTROL_WEB_URL must be HTTP(S) without embedded credentials');
  if (url.protocol === 'http:' && !['127.0.0.1','localhost','[::1]'].includes(url.hostname.toLowerCase())) throw new Error('cleartext AGENT_CONTROL_WEB_URL must remain loopback-local');
  return url;
}
async function jobsRequest(pathname, body, environment = process.env, fetcher = fetch) {
  const url = jobsBaseUrl(environment); url.pathname = pathname.split('?')[0]; url.search = pathname.includes('?') ? pathname.slice(pathname.indexOf('?')) : '';
  const mutation = body !== undefined, token = environment.AGENT_CONTROL_WEB_OPERATOR_TOKEN?.trim(); if (mutation && !token) throw new Error('AGENT_CONTROL_WEB_OPERATOR_TOKEN is required for Job mutations');
  const response = await fetcher(url, {method: mutation ? 'POST' : 'GET', headers: {Accept:'application/json', ...(mutation ? {'Content-Type':'application/json',Authorization:`Bearer ${token}`} : {})}, ...(mutation ? {body:JSON.stringify({...body,actor:'cli-operator'})} : {})});
  const result = await response.json().catch(()=>({error:`HTTP ${response.status}`})); if (!response.ok) throw new Error(result.detail||result.error||`HTTP ${response.status}`); return result;
}

function isEntrypoint() {
  if (!process.argv[1]) return false;
  try { return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
}

if (isEntrypoint()) process.exitCode = await main();
