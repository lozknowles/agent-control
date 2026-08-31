import {createHash, timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import http, {type IncomingMessage, type ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {AgentControlService, ControlEvent} from './application-service.js';
import {parseOutputAuthorityScope, parseOutputExpansionRequest} from './token-aware-output.js';
import {JobManifestError} from './job-catalog.js';
import {configPath} from './config.js';
import {ConfigurationStore} from './configuration-store.js';

export interface WebServerOptions {host?: string; port?: number; operatorToken?: string; allowedOrigins?: string[]; assetsDir?: string; configFile?: string;}
const MAX_BODY = 64 * 1024;
const SECRET_KEY = /token|secret|password|credential|authorization|cookie|api[-_]?key/i;
const SAFE_TOKEN_ACCOUNTING_KEY = /^(?:tokenAwareOutput|contextTokensAvoided|estimatedTokensOriginal|estimatedTokensReturned|estimatedTokensSaved|estimatedOriginalTokens|estimatedReturnedTokens|estimatedTokensAvoided|expansionTokensReturned|inputTokens|freshInputTokens|cachedInputTokens|cacheWriteTokens|outputTokens|maximumOutputTokens|reasoningTokens|totalTokens|totalProcessedTokens|startupContextTokens|taskContextTokens|retrievedContextTokens|repositoryContextTokens|conversationHistoryTokens|totalEstimatedContextTokens|repeatedContextCostEstimate|tokensPerVerifiedOutcome|freshTokensPerVerifiedOutcome|estimatedTokens)$/;
const SAFE_CONFIG_REFERENCE_KEY = /^(?:credentialEnv|credentialFileEnv|identityFile)$/;
const DOMAIN_STATUS = new Map<string, number>([
  ['approval_policy_required', 400], ['approval_policy_not_waiting', 409], ['run_not_retryable', 409], ['job_disabled', 409],
  ['job_missing', 404], ['run_missing', 404], ['schedule_missing', 404], ['artifact_missing', 404], ['system_missing', 404], ['system_check_unavailable', 409],
  ['output_handle_invalid', 404], ['output_handle_expired', 410], ['output_handle_scope_denied', 403],
  ['output_expansion_request_invalid', 400], ['output_expansion_mode_invalid', 400], ['token_aware_output_unconfigured', 503],
  ['output_expansion_unknown_field', 400], ['output_expansion_context_invalid', 400], ['output_expansion_file_required', 400],
  ['output_expansion_files_invalid', 400], ['output_expansion_lines_invalid', 400], ['output_expansion_range_invalid', 400],
  ['output_expansion_selector_unsupported', 400], ['output_expansion_selector_outside_result', 403],
  ['output_scope_invalid', 400], ['output_scope_unknown_field', 400], ['output_scope_identity_missing', 400], ['output_scope_generation_invalid', 400],
  ['work_parcel_prompt_required', 400], ['work_parcel_plan_empty', 400], ['work_parcel_stage_id_invalid', 400], ['work_parcel_stage_invalid', 400], ['work_parcel_route_invalid', 400], ['work_parcel_reasoning_plan_invalid', 400], ['work_parcel_dependency_cycle', 400],
  ['work_parcel_reasoning_planner_unconfigured', 503], ['work_parcel_missing', 404], ['work_parcels_unconfigured', 503],
]);

export function startWebDashboard(service: AgentControlService, options: WebServerOptions = {}) {
  const host = options.host ?? '127.0.0.1', port = options.port ?? 4310;
  const assetsDir = options.assetsDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/dashboard');
  const server = http.createServer((request, response) => void handle(service, request, response, {...options, host, port, assetsDir}).catch(error => replyError(response, error)));
  server.listen(port, host);
  return server;
}

async function handle(service: AgentControlService, request: IncomingMessage, response: ServerResponse, options: Required<Pick<WebServerOptions, 'host' | 'port' | 'assetsDir'>> & WebServerOptions) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  response.setHeader('Cache-Control', 'no-store');
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${options.host}:${options.port}`}`);
  const method = request.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/api/status') return json(response, 200, service.snapshot());
  if (method === 'GET' && url.pathname === '/api/operator-auth') return json(response, 200, operatorAuthentication(request, options));
  if (method === 'GET' && url.pathname === '/api/configuration') { validateOperatorRequest(request, options); return json(response, 200, new ConfigurationStore(options.configFile ?? configPath()).read()); }
  if (method === 'GET' && url.pathname === '/api/lanes') return json(response, 200, service.snapshot().lanes);
  if (method === 'GET' && url.pathname === '/api/providers') return json(response, 200, service.snapshot().providers);
  if (method === 'GET' && url.pathname === '/api/router') return json(response, 200, service.allRoutes());
  if (method === 'GET' && url.pathname === '/api/evidence') return json(response, 200, service.snapshot().lanes.map(lane => ({laneId: lane.id, task: lane.task, verification: lane.verification, batonEvidence: lane.baton.evidence, contextSourceIds: lane.baton.contextSourceIds})));
  if (method === 'GET' && url.pathname === '/api/events') return eventStream(service, request, response);
  if (method === 'GET' && url.pathname === '/api/jobs') return json(response, 200, service.jobs());
  if (method === 'GET' && url.pathname === '/api/parcels') return json(response, 200, service.parcels());
  if (method === 'GET' && url.pathname === '/api/schedules') return json(response, 200, service.schedules());
  if (method === 'GET' && url.pathname === '/api/runs') return json(response, 200, service.runs(url.searchParams.get('jobId') ?? undefined));
  if (method === 'GET' && url.pathname === '/api/queue') return json(response, 200, service.jobQueue());
  if (method === 'GET' && url.pathname === '/api/workers') return json(response, 200, service.workers());
  if (method === 'GET' && url.pathname === '/api/nodes') return json(response, 200, service.nodes());
  if (method === 'GET' && url.pathname === '/api/systems') return json(response, 200, service.systems());
  if (method === 'GET' && url.pathname === '/api/resources') return json(response, 200, service.resourceLocks());
  if (method === 'GET' && url.pathname === '/api/artifacts') return json(response, 200, service.artifacts(url.searchParams.get('runId') ?? undefined));
  if (method === 'GET' && url.pathname === '/api/command-output') return json(response, 200, service.commandOutputs());
  if (method === 'GET' && url.pathname === '/api/command-output/metrics') return json(response, 200, service.commandOutputMetrics());
  if (method === 'GET' && url.pathname === '/api/efficiency') return json(response, 200, service.harnessEfficiencyMetrics());
  if (method === 'GET' && url.pathname === '/api/efficiency/invocations') {
    const requestedLimit = Number(url.searchParams.get('limit') ?? 200);
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(1_000, requestedLimit) : 200;
    return json(response, 200, service.modelInvocations({limit, runId: url.searchParams.get('runId') ?? undefined, jobId: url.searchParams.get('jobId') ?? undefined}));
  }
  const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)(?:\/(runs|run))?$/), runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)(?:\/(cancel|retry|approve))?$/), parcelMatch = url.pathname.match(/^\/api\/parcels\/([^/]+)(?:\/(cancel))?$/), systemMatch = url.pathname.match(/^\/api\/systems\/([^/]+)(?:\/(check))?$/), scheduleMatch = url.pathname.match(/^\/api\/schedules\/([^/]+)\/(enable|disable)$/), artifactMatch = url.pathname.match(/^\/api\/artifacts\/([^/]+)$/), outputExpansionMatch = url.pathname.match(/^\/api\/command-output\/([^/]+)\/expand$/);
  if (method === 'GET' && jobMatch && !jobMatch[2]) return json(response, 200, service.job(decodeURIComponent(jobMatch[1])));
  if (method === 'GET' && jobMatch?.[2] === 'runs') return json(response, 200, service.runs(decodeURIComponent(jobMatch[1])));
  if (method === 'GET' && runMatch && !runMatch[2]) return json(response, 200, service.run(decodeURIComponent(runMatch[1])));
  if (method === 'GET' && parcelMatch && !parcelMatch[2]) return json(response, 200, service.parcel(decodeURIComponent(parcelMatch[1])));
  if (method === 'GET' && systemMatch && !systemMatch[2]) return json(response, 200, service.system(decodeURIComponent(systemMatch[1])));
  if (method === 'GET' && artifactMatch) return json(response, 200, service.artifact(decodeURIComponent(artifactMatch[1])));
  const laneMatch = url.pathname.match(/^\/api\/lanes\/(\d+)(?:\/(.+))?$/);
  if (method === 'GET' && laneMatch && !laneMatch[2]) return json(response, 200, service.lane(Number(laneMatch[1])));
  if (method === 'GET' && laneMatch?.[2] === 'router') return json(response, 200, service.latestRoute(Number(laneMatch[1])) ?? null);

  if (method === 'POST') {
    validateMutationRequest(request, options);
    const body = await readJson(request), actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim() : 'web-operator';
    if (url.pathname === '/api/configuration/systems') {
      const result = new ConfigurationStore(options.configFile ?? configPath()).upsert({revision: body.revision, kind: body.kind, originalId: body.originalId, item: body.item});
      service.events.emit('configuration.changed', {kind: result.changed.kind, id: result.changed.id, restartRequired: true}, undefined, actor);
      return json(response, 200, result);
    }
    if (jobMatch?.[2] === 'run') return json(response, 201, service.createJobRun(decodeURIComponent(jobMatch[1]), body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters) ? body.parameters as Record<string, unknown> : {}, actor));
    if (url.pathname === '/api/parcels') return json(response, 201, await service.submitNaturalTask(String(body.prompt ?? ''), actor));
    if (systemMatch?.[2] === 'check') return json(response, 200, await service.checkSystem(decodeURIComponent(systemMatch[1]), actor));
    if (parcelMatch?.[2] === 'cancel') return json(response, 202, service.cancelParcel(decodeURIComponent(parcelMatch[1]), actor));
    if (runMatch?.[2] === 'cancel') return json(response, 202, service.cancelJobRun(decodeURIComponent(runMatch[1]), actor));
    if (runMatch?.[2] === 'retry') return json(response, 201, service.retryJobRun(decodeURIComponent(runMatch[1]), actor));
    if (runMatch?.[2] === 'approve') return json(response, 200, service.approveJobRun(decodeURIComponent(runMatch[1]), String(body.policy ?? ''), actor));
    if (scheduleMatch) return json(response, 200, service.setScheduleEnabled(decodeURIComponent(scheduleMatch[1]), scheduleMatch[2] === 'enable', actor));
    if (outputExpansionMatch) {
      const scope = parseOutputAuthorityScope(body.scope);
      const expansion = parseOutputExpansionRequest(body.expansion);
      return json(response, 200, service.expandCommandOutput(decodeURIComponent(outputExpansionMatch[1]), expansion, scope));
    }
    if (!laneMatch?.[2]) throw httpError(404, 'route_not_found');
    const laneId = Number(laneMatch[1]), action = laneMatch[2];
    switch (action) {
      case 'pause': return json(response, 200, service.pauseLane(laneId, actor));
      case 'resume': return json(response, 200, service.resumeLane(laneId, actor));
      case 'priority': return json(response, 200, service.setPriority(laneId, Number(body.priority), actor));
      case 'mode': return json(response, 200, service.setMode(laneId, String(body.mode) as 'auto' | 'manual', actor));
      case 'task': return json(response, 200, service.submitTask(laneId, String(body.goal ?? ''), actor));
      case 'reroute': return json(response, 202, service.requestReroute(laneId, actor, String(body.reason ?? 'Operator requested route re-evaluation'), Number(body.confidence ?? .8)));
      case 'handoff': return json(response, 200, service.handoff(laneId, Number(body.toLaneId), String(body.holder ?? actor), actor));
      case 'clone': return json(response, 200, service.clone(laneId, Number(body.toLaneId), String(body.holder ?? actor), actor));
      case 'cancel': return json(response, 202, service.cancelLane(laneId, actor));
      case 'takeover': return json(response, 200, service.humanTakeover(laneId, actor));
      case 'return-ownership': return json(response, 200, service.returnOwnership(laneId, actor, String(body.agentId ?? '')));
      case 'verification/policy': return json(response, 200, service.setVerificationPolicy(laneId, {required: Array.isArray(body.required) ? body.required as never[] : [], requireHumanAcceptance: Boolean(body.requireHumanAcceptance)}, actor));
      case 'verification/claim': return json(response, 200, service.recordClaim(laneId, String(body.claim ?? ''), actor));
      case 'verification/evidence': return json(response, 201, service.addVerificationEvidence(laneId, {type: String(body.type) as never, description: String(body.description ?? ''), status: String(body.status) as never, reference: typeof body.reference === 'string' ? body.reference : undefined, hash: typeof body.hash === 'string' ? body.hash : undefined}, actor));
      case 'verification/verify': return json(response, 200, service.verifyClaim(laneId, actor));
      case 'verification/accept': return json(response, 200, service.acceptVerifiedClaim(laneId, actor));
      default: throw httpError(404, 'route_not_found');
    }
  }

  if (method === 'GET') return serveAsset(response, options.assetsDir, url.pathname);
  throw httpError(404, 'route_not_found');
}

function validateMutationRequest(request: IncomingMessage, options: WebServerOptions & {host: string; port: number}) {
  if (!options.operatorToken) throw httpError(503, 'operator_auth_not_configured');
  if ((request.headers['content-type'] ?? '').split(';')[0] !== 'application/json') throw httpError(415, 'json_content_type_required');
  const origin = request.headers.origin;
  const allowed = new Set(options.allowedOrigins ?? [`http://${options.host}:${options.port}`, `http://localhost:${options.port}`]);
  if (origin && !allowed.has(origin)) throw httpError(403, 'origin_denied');
  validateOperatorRequest(request, options);
}

function validateOperatorRequest(request: IncomingMessage, options: WebServerOptions) {
  if (!options.operatorToken) throw httpError(503, 'operator_auth_not_configured');
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secretEqual(supplied, options.operatorToken)) throw httpError(401, 'operator_authentication_required');
}

function operatorAuthentication(request: IncomingMessage, options: WebServerOptions) {
  if (!options.operatorToken) return {state: 'disabled'};
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  return {state: supplied && secretEqual(supplied, options.operatorToken) ? 'authenticated' : 'authentication_required'};
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > MAX_BODY) throw httpError(413, 'request_too_large'); chunks.push(buffer); }
  if (!chunks.length) return {};
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { throw httpError(400, 'invalid_json'); }
}

function eventStream(service: AgentControlService, request: IncomingMessage, response: ServerResponse) {
  response.writeHead(200, {'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
  const send = (event: ControlEvent) => response.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(redact(event))}\n\n`);
  const after = Number(request.headers['last-event-id'] ?? 0);
  for (const event of service.events.history(Number.isFinite(after) ? after : 0)) send(event);
  response.write(`event: system.snapshot\ndata: ${JSON.stringify(redact(service.snapshot()))}\n\n`);
  const unsubscribe = service.events.subscribe(send);
  const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 15000);
  request.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
}

function serveAsset(response: ServerResponse, assetsDir: string, pathname: string) {
  const asset = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!['index.html', 'dashboard.css', 'dashboard-fixes.css', 'dashboard-jobs.css', 'dashboard.js', 'dashboard-parameters.js', 'dashboard-running-state.js', 'dashboard-enhancements.js'].includes(asset)) throw httpError(404, 'not_found');
  const file = path.join(assetsDir, asset);
  if (!fs.existsSync(file)) throw httpError(404, 'dashboard_asset_missing');
  const type = asset.endsWith('.html') ? 'text/html; charset=utf-8' : asset.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
  response.writeHead(200, {'Content-Type': type}); response.end(fs.readFileSync(file));
}

function json(response: ServerResponse, status: number, value: unknown) { response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'}); response.end(`${JSON.stringify(redact(value))}\n`); }
function replyError(response: ServerResponse, error: unknown) { if (error instanceof JobManifestError) return json(response, 400, {error: error.message, issues: error.issues}); const item = error as Error & {status?: number}, knownDomain = DOMAIN_STATUS.has(item.message), status = item.status ?? DOMAIN_STATUS.get(item.message) ?? 500; json(response, status, {error: item.status || knownDomain ? item.message : 'internal_error'}); }
function httpError(status: number, message: string) { return Object.assign(new Error(message), {status}); }
function secretEqual(left: string, right: string) { const a = createHash('sha256').update(left).digest(), b = createHash('sha256').update(right).digest(); return timingSafeEqual(a, b); }
function redact(value: unknown, key = ''): unknown {
  if (SECRET_KEY.test(key) && !SAFE_TOKEN_ACCOUNTING_KEY.test(key) && !SAFE_CONFIG_REFERENCE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return value.replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, '[REDACTED]');
  if (Array.isArray(value)) return value.map(item => redact(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redact(item, name)]));
  return value;
}
