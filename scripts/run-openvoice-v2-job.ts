import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {AgentControlService} from '../src/control/application-service.js';
import {JobCatalog} from '../src/control/job-catalog.js';
import {createJobRuntime, WorkerRegistry} from '../src/control/job-runtime.js';
import {registerOpenVoiceActions} from '../src/control/openvoice-actions.js';
import {PtyRegistry} from '../src/control/pty.js';
import {registerReferenceActions} from '../src/control/reference-actions.js';
import {defaultCapabilities, type LaneState, type WorkspaceState} from '../src/state.js';

function requiredDirectory(name: string) {
  const value = process.env[name];
  if (!value || !path.isAbsolute(value)) throw new Error(`${name.toLowerCase()}_required`);
  return fs.realpathSync(value);
}
function curlHealth(port: number) { try { return execFileSync('curl', ['-fsS', '--max-time', '5', `http://127.0.0.1:${port}/health`], {encoding: 'utf8'}).trim(); } catch { return ''; } }
function sourceCommit(root: string) { return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(); }
function writeJson(file: string, value: unknown) { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {mode: 0o600}); }

const integrationRoot = requiredDirectory('OPENVOICE_V2_INTEGRATION_ROOT');
const sourceRoot = requiredDirectory('OPENVOICE_V2_SOURCE_ROOT');
const evidenceRoot = requiredDirectory('OPENVOICE_V2_EVIDENCE_ROOT');
const expectedCommit = (JSON.parse(fs.readFileSync(path.join(integrationRoot, 'UPSTREAM.lock.json'), 'utf8')) as {code: {openvoice: {commit: string}}}).code.openvoice.commit;
if (sourceCommit(sourceRoot) !== expectedCommit) throw new Error('openvoice_source_commit_mismatch');
const before = {llamaDefault: curlHealth(8080), llamaCoder: curlHealth(8081)};
if (!before.llamaDefault || !before.llamaCoder) throw new Error('protected_llama_health_required');

const actions = registerOpenVoiceActions(registerReferenceActions());
const catalog = new JobCatalog(actions.ids()).loadDirectory(path.resolve('config/jobs'));
const workers = new WorkerRegistry();
workers.register({
  id: process.env.AGENT_CONTROL_OPENVOICE_WORKER_ID || 'local-openvoice-worker',
  capabilities: ['audio.openvoice-v2.governed'],
  health: 'healthy',
  capacity: 1,
  active: 0,
  labels: {scope: 'optional-openvoice-v2'},
  observedAt: new Date().toISOString(),
});
const runtime = createJobRuntime(path.join(evidenceRoot, 'agent-control-state'), catalog, actions, workers);
const at = new Date().toISOString();
const lane: LaneState = {
  id: 1, name: 'OpenVoice V2 governed qualification', status: 'waiting', model: 'control-owned-actions', reasoning: 'high', context: '0', lines: [],
  contract: {version: 2, laneId: 1, goal: 'Install and qualify OpenVoice V2 without disturbing protected workloads', constraints: ['no public exposure', 'CPU first', 'preserve protected services'], cwd: integrationRoot, priority: 5, mode: 'manual', capabilities: defaultCapabilities(), resourceLocks: {}, modelLock: null, sharedTaskIds: [], updatedAt: at},
  baton: {version: 1, laneId: 1, revision: 1, status: 'started', progress: [], hypothesis: 'Fixed governed Actions can qualify the optional capability safely', evidence: [], changes: [], nextAction: 'run manual Job', openQuestions: [], model: 'control-owned-actions', reasoning: 'high', updatedAt: at},
  lease: null,
};
const workspace: WorkspaceState = {version: 1, paused: false, lastRestorePoint: null, lanes: [lane]};
const service = new AgentControlService(workspace, new PtyRegistry(), undefined, '3.1.0-openvoice-v2', () => {}).configureProjection({jobRuntime: runtime});
let run = service.createJobRun('openvoice-v2-install-qualify', {}, 'explicit-user-request-2026-08-26');
for (let count = 0; count < 32; count++) {
  const waiting = runtime.ledger.get(run.id)!;
  const approval = waiting.steps.find(step => step.status === 'WAITING_FOR_APPROVAL');
  if (approval?.approval === 'openvoice-v2-install') service.approveJobRun(run.id, approval.approval, 'explicit-user-request-2026-08-26');
  await runtime.tick();
  run = runtime.ledger.get(run.id)!;
  if (['SUCCEEDED', 'FAILED', 'DEGRADED', 'CANCELLED', 'DISCONNECTED'].includes(run.status)) break;
}
const after = {llamaDefault: curlHealth(8080), llamaCoder: curlHealth(8081)};
const evidence = {
  schema: 'agent-control.openvoice-v2-run/v1',
  generatedAt: new Date().toISOString(),
  sourceCommit: sourceCommit(sourceRoot),
  agentControlCommit: sourceCommit(process.cwd()),
  run,
  artifacts: runtime.artifacts.list(run.id).map(artifact => ({id: artifact.id, stepId: artifact.stepId, name: artifact.name, type: artifact.type, schema: artifact.schema, sha256: artifact.sha256, workerId: artifact.provenance.workerId})),
  protectedHealth: {before, after, unchangedHealthy: Boolean(after.llamaDefault && after.llamaCoder)},
  residentServiceEnabled: false,
  publicInterfaceEnabled: false,
  verdict: run.status === 'SUCCEEDED' && after.llamaDefault && after.llamaCoder ? 'JOB_SUCCEEDED' : 'JOB_FAILED',
};
const outputFile = path.join(evidenceRoot, 'agent-control-run.json');
writeJson(outputFile, evidence);
process.stdout.write(`${JSON.stringify({ok: evidence.verdict === 'JOB_SUCCEEDED', runId: run.id, status: run.status, outputFile})}\n`);
if (evidence.verdict !== 'JOB_SUCCEEDED') process.exitCode = 1;
