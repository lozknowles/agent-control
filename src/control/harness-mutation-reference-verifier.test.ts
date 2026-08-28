import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {createToolHandlerRegistry} from './harness-dispatch.js';
import {parseMutationBenchmarkSuite, type MutationBenchmarkTask} from './harness-mutation-benchmark.js';
import {verifyMutationWorkspace} from './harness-mutation-verifier.js';
import {MUTATION_TOOL_IDS, MutationWorkspace} from './harness-mutation-workspace.js';

const root = process.cwd();
const suite = parseMutationBenchmarkSuite(JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'harness-mutation-jobs.json'), 'utf8')));

test('all frozen hidden mutation contracts accept an independently constructed reference mutation', async t => {
  const failures: string[] = [];
  for (const task of suite.tasks) await t.test(task.id, async () => {
    const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
    try {
      const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
      await applyReference(task, (tool, input) => registry.invoke(tool, input, {} as never));
      const result = await verifyMutationWorkspace(prepared.workspace, task);
      const detail = `${task.id}:${JSON.stringify(result.checks.filter(check => !check.passed))}`;
      if (!result.passed) failures.push(detail);
      assert.equal(result.passed, true, detail);
    } finally { prepared.workspace.cleanup(); }
  });
  assert.deepEqual(failures, []);
});

test('every frozen task rejects a non-satisfying in-scope mutation', async t => {
  const failures: string[] = [];
  for (const task of suite.tasks) await t.test(task.id, async () => {
    const prepared = MutationWorkspace.prepare(path.join(root, suite.fixturePath), task);
    try {
      const registry = createToolHandlerRegistry(prepared.workspace.toolBindings());
      const target = task.requiredChangedFiles[0];
      const absolute = path.join(prepared.workspace.root, target);
      const content = fs.existsSync(absolute) ? `${fs.readFileSync(absolute, 'utf8')}\n// intentionally non-satisfying benchmark mutation\n` : '// intentionally non-satisfying benchmark mutation\n';
      await registry.invoke(MUTATION_TOOL_IDS.edit, {operations: [{type: 'write', path: target, content}]}, {} as never);
      const result = await verifyMutationWorkspace(prepared.workspace, task);
      const hidden = result.checks.find(check => check.id === `hidden_verifier:${task.verifierId}`);
      if (hidden?.passed !== false) failures.push(`${task.id}:${hidden?.detail ?? 'hidden_check_missing'}`);
      assert.equal(hidden?.passed, false, `${task.id}:non-satisfying mutation passed hidden verifier`);
    } finally { prepared.workspace.cleanup(); }
  });
  assert.deepEqual(failures, []);
});

async function applyReference(task: MutationBenchmarkTask, invoke: (tool: string, input: unknown) => Promise<unknown>) {
  const edit = (operations: unknown[]) => invoke(MUTATION_TOOL_IDS.edit, {operations});
  const replace = (path: string, oldText: string, newText: string, expectedOccurrences = 1) => edit([{type: 'replace', path, oldText, newText, expectedOccurrences}]);
  const write = (path: string, content: string) => edit([{type: 'write', path, content}]);
  switch (task.id) {
    case 'MUT-001': await replace('src/constants.js', '30_000', '45_000'); return;
    case 'MUT-002':
      await replace('src/capabilities.js', "export function normalizeCapabilities(values) {\n  if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) throw new Error('capabilities_invalid');\n  return values.map(value => value.trim().toLowerCase()).filter(Boolean);\n}", "import {stableUnique} from './utils.js';\n\nexport function normalizeCapabilities(values) {\n  if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) throw new Error('capabilities_invalid');\n  return stableUnique(values.map(value => value.trim().toLowerCase()).filter(Boolean));\n}"); return;
    case 'MUT-003':
      await write('test/human-takeover.test.js', `import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport {authorizeTool} from '../src/policy.js';\n\nconst base = {grantedTools: ['read', 'write'], approvedRisks: ['read', 'write'], leaseGeneration: 1, liveLeaseGeneration: 1, ownershipGeneration: 1, liveOwnershipGeneration: 1};\nfor (const risk of ['read', 'write']) test(\`human takeover denies \${risk}\`, () => { const result = authorizeTool({...base, owner: 'human', toolId: risk, risk}); assert.equal(result.allowed, false); assert.equal(result.reason, 'human_owns_execution'); });\n`); return;
    case 'MUT-004':
      await replace('src/telemetry.js', "  const outputTokens = numberOrNull(raw.output_tokens ?? raw.completion_tokens);", "  const cacheWriteTokens = numberOrNull(raw.cache_creation_input_tokens ?? raw.cacheWriteTokens);\n  const outputTokens = numberOrNull(raw.output_tokens ?? raw.completion_tokens);");
      await replace('src/telemetry.js', "    cachedInputTokens,\n    outputTokens,", "    cachedInputTokens,\n    cacheWriteTokens,\n    outputTokens,"); return;
    case 'MUT-005':
      await replace('src/constants.js', "  'FAILED',\n]);", "  'FAILED',\n  'CANCELLED',\n]);");
      await replace('src/constants.js', "Object.freeze(['SUCCEEDED', 'FAILED'])", "Object.freeze(['SUCCEEDED', 'FAILED', 'CANCELLED'])");
      await replace('src/job-state.js', "  CREATED: ['ROUTED', 'FAILED'],\n  ROUTED: ['RUNNING', 'FAILED'],\n  RUNNING: ['VERIFICATION_PENDING', 'FAILED'],", "  CREATED: ['ROUTED', 'FAILED', 'CANCELLED'],\n  ROUTED: ['RUNNING', 'FAILED', 'CANCELLED'],\n  RUNNING: ['VERIFICATION_PENDING', 'FAILED', 'CANCELLED'],"); return;
    case 'MUT-006':
      await replace('src/config.js', "    timeoutMs: requireInteger(input.timeoutMs ?? 30_000, 'timeout_ms', 100, 600_000),", "    timeoutMs: requireInteger(input.timeoutMs ?? 30_000, 'timeout_ms', 100, 600_000),\n    maximumToolResultBytes: requireInteger(input.maximumToolResultBytes ?? 32_768, 'maximum_tool_result_bytes', 1_024, 131_072),");
      await replace('src/tool-output.js', "const MODEL_OUTPUT_LIMIT_BYTES = 32_768;\n\nexport function modelFacingToolResult(value, _config = {}) {", "export function modelFacingToolResult(value, config = {}) {\n  const modelOutputLimitBytes = config.maximumToolResultBytes ?? 32_768;");
      await replace('src/tool-output.js', 'MODEL_OUTPUT_LIMIT_BYTES', 'modelOutputLimitBytes', 2); return;
    case 'MUT-007':
      await write('src/scheduler.js', `import {rankEligibleWorkers} from './routing-helpers.js';\n\nexport function selectWorker(workers, requiredCapabilities) {\n  return rankEligibleWorkers(workers, requiredCapabilities)[0] ?? null;\n}\n`); return;
    case 'MUT-008':
      await replace('src/telemetry.js', 'export function createAttemptTelemetry({taskId, profile, usage, verifierResult}) {', 'export function createAttemptTelemetry({taskId, profile, usage, verifierResult, correlationId}) {');
      await replace('src/telemetry.js', 'return Object.freeze({taskId, profile, usage: normalizeUsage(usage), verifierResult: verifierResult ?? \'UNKNOWN\'});', 'return Object.freeze({taskId, profile, usage: normalizeUsage(usage), verifierResult: verifierResult ?? \'UNKNOWN\', correlationId: correlationId ?? null});');
      await replace('src/dispatcher.js', '    verifierResult: input.verifierResult,', '    verifierResult: input.verifierResult,\n    correlationId: input.correlationId,'); return;
    case 'MUT-009':
      await replace('src/job-state.js', "export function completeJob(current, result) {\n  if (current !== 'RUNNING') throw new Error('job_not_running');\n  return result.modelComplete ? 'SUCCEEDED' : 'FAILED';\n}", "export function completeJob(current, result) {\n  if (current === 'RUNNING') return result.modelComplete ? 'VERIFICATION_PENDING' : 'FAILED';\n  if (current === 'VERIFICATION_PENDING') return result.verifierPassed ? 'SUCCEEDED' : 'FAILED';\n  throw new Error('job_completion_state_invalid');\n}"); return;
    case 'MUT-010':
      await replace('src/context-packet.js', 'provenanceIds: mergeEvidence(sources.flatMap(source => source.provenanceIds ?? [])),', 'provenanceIds: mergeEvidence(sources.flatMap(source => source.provenanceIds ?? []), parent?.provenanceIds ?? []),'); return;
    case 'MUT-011':
      await replace('src/queue.js', "existing.id === item.id && existing.state === 'QUEUED'", 'existing.id === item.id'); return;
    case 'MUT-012':
      await replace('src/router.js', "const ORDER = Object.freeze(['THIN', 'STANDARD', 'DEEP']);", "import {strategyQualified} from './qualification.js';\n\nconst ORDER = Object.freeze(['THIN', 'STANDARD', 'DEEP']);\nconst ESCALATION_REASONS = new Set(['missing_context', 'test_failure', 'ambiguous_repository_state', 'unexpected_dependency', 'model_uncertainty', 'verifier_rejection', 'tool_limitation', 'execution_failure']);");
      await replace('src/router.js', "  const appliedProfile = policy.mode === 'EXPERIMENT' && signals.requestedProfile ? signals.requestedProfile : 'STANDARD';", "  const appliedProfile = policy.mode === 'EXPERIMENT' && signals.requestedProfile\n    ? signals.requestedProfile\n    : policy.mode === 'ENFORCE' && strategyQualified(policy.evidence?.[recommendedProfile])\n      ? recommendedProfile\n      : 'STANDARD';");
      await replace('src/router.js', "export function nextContextAttempt(current, attempted, reason) {\n  const next = ORDER[ORDER.indexOf(current) + 1];\n  return next ? {action: 'ESCALATE', from: current, to: next, reason} : {action: 'REVIEW', from: current, reason};\n}", "export function nextContextAttempt(current, attempted, reason) {\n  if (!ESCALATION_REASONS.has(reason)) throw new Error('escalation_reason_invalid');\n  const next = ORDER.slice(ORDER.indexOf(current) + 1).find(profile => !attempted.includes(profile));\n  return next ? {action: 'ESCALATE', from: current, to: next, reason} : {action: 'REVIEW', from: current, reason};\n}"); return;
    case 'MUT-013':
      await replace('src/telemetry.js', "  const outputTokens = numberOrNull(raw.output_tokens ?? raw.completion_tokens);", "  const reasoningTokens = numberOrNull(raw.completion_tokens_details?.reasoning_tokens ?? raw.reasoning_tokens);\n  const outputTokens = numberOrNull(raw.output_tokens ?? raw.completion_tokens);");
      await replace('src/telemetry.js', "    cachedInputTokens,\n    outputTokens,", "    cachedInputTokens,\n    reasoningTokens,\n    outputTokens,"); return;
    case 'MUT-014': await replace('src/config.js', "    maximumTurns: requireInteger(input.maximumTurns ?? 10, 'maximum_turns', 1, 64),", "    maximumTurns: requireInteger(input.maximumTurns ?? 10, 'maximum_turns', 1, 64),\n    maximumRetries: requireInteger(input.maximumRetries ?? 2, 'maximum_retries', 0, 8),"); return;
    case 'MUT-015': await replace('src/scheduler.js', '.filter(worker => worker.online && requiredCapabilities.every(capability => worker.capabilities.includes(capability)))', '.filter(worker => worker.online && worker.draining !== true && requiredCapabilities.every(capability => worker.capabilities.includes(capability)))'); return;
    case 'MUT-016': await replace('src/queue.js', "  list() {\n    return this.#items.map(item => ({...item}));\n  }", "  release(id) {\n    const item = this.#items.find(candidate => candidate.id === id);\n    if (!item || item.state !== 'LEASED') throw new Error('work_not_leased');\n    item.state = 'QUEUED';\n    return {...item};\n  }\n\n  list() {\n    return this.#items.map(item => ({...item}));\n  }"); return;
    case 'MUT-017': await replace('src/provenance.js', "export function provenanceRecord(kind, evidenceIds) {\n  return Object.freeze({kind, evidenceIds: mergeEvidence(evidenceIds)});\n}", "export function provenanceRecord(kind, evidenceIds) {\n  if (typeof kind !== 'string' || !kind.trim()) throw new Error('provenance_kind_invalid');\n  return Object.freeze({kind, evidenceIds: mergeEvidence(evidenceIds)});\n}"); return;
    case 'MUT-018':
      await replace('src/dispatcher.js', "  if (!authorization.allowed) return {accepted: false, authorization, telemetry: null};", "  if (!authorization.allowed) return {accepted: false, authorization, telemetry: null, denialReason: authorization.reason};");
      await replace('src/dispatcher.js', "  return {accepted: true, authorization, telemetry};", "  return {accepted: true, authorization, telemetry, denialReason: null};"); return;
    case 'MUT-019': await replace('src/context-packet.js', "  if (!id || !Array.isArray(sources)) throw new Error('context_packet_invalid');", "  if (!id || !Array.isArray(sources)) throw new Error('context_packet_invalid');\n  if (sources.some(source => !source || typeof source.id !== 'string' || !source.id)) throw new Error('context_source_invalid');"); return;
    case 'MUT-020': await replace('src/tool-output.js', "  const prefix = Buffer.from(authoritative, 'utf8').subarray(0, MODEL_OUTPUT_LIMIT_BYTES - 160).toString('utf8');", "  let prefix = Buffer.from(authoritative, 'utf8').subarray(0, MODEL_OUTPUT_LIMIT_BYTES - 160).toString('utf8');\n  while (prefix.endsWith('�')) prefix = prefix.slice(0, -1);"); return;
    case 'MUT-021':
      await replace('src/constants.js', "  'FAILED',\n]);", "  'FAILED',\n  'TIMED_OUT',\n]);");
      await replace('src/constants.js', "Object.freeze(['SUCCEEDED', 'FAILED'])", "Object.freeze(['SUCCEEDED', 'FAILED', 'TIMED_OUT'])");
      await replace('src/job-state.js', "  CREATED: ['ROUTED', 'FAILED'],\n  ROUTED: ['RUNNING', 'FAILED'],\n  RUNNING: ['VERIFICATION_PENDING', 'FAILED'],", "  CREATED: ['ROUTED', 'FAILED', 'TIMED_OUT'],\n  ROUTED: ['RUNNING', 'FAILED', 'TIMED_OUT'],\n  RUNNING: ['VERIFICATION_PENDING', 'FAILED', 'TIMED_OUT'],"); return;
    case 'MUT-022': await replace('src/router.js', "if (signals.knownExactTargets && signals.estimatedFiles <= 2 && signals.risk === 'low' && signals.deterministicVerifier)", "if (signals.knownExactTargets && signals.estimatedFiles <= 2 && !signals.repositorySearchRequired && signals.risk === 'low' && signals.deterministicVerifier)"); return;
    case 'MUT-023': await replace('src/qualification.js', 'Boolean(evidence && evidence.productionQualified', 'Boolean(evidence && evidence.verifierPassed === true && evidence.productionQualified'); return;
    case 'MUT-024': await write('test/terminal-state.test.js', `import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport {transitionJob} from '../src/job-state.js';\n\nfor (const state of ['FAILED', 'SUCCEEDED']) test(\`\${state} cannot return to RUNNING\`, () => assert.throws(() => transitionJob(state, 'RUNNING'), /terminal_state_transition_denied/));\n`); return;
    default: throw new Error(`reference_mutation_missing:${task.id}`);
  }
}
