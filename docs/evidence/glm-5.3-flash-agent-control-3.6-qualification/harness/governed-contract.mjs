import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const [command, runExitText = ''] = process.argv.slice(2);
const root = fs.realpathSync(process.env.BENCHMARK_WORKSPACE);
const evidence = process.env.BENCHMARK_EVIDENCE;
if (!command || !evidence) throw new Error('usage: governed-contract.mjs prepare|finalize|verify [runner-exit]');
fs.mkdirSync(evidence, {recursive: true, mode: 0o700});

const {ContractExecutionRuntime} = await import(pathToFileURL(path.join(root, 'src/control/contract-runtime.ts')).href);
const {GovernedHandoffRuntime} = await import(pathToFileURL(path.join(root, 'src/control/handoff-runtime.ts')).href);
const contractsFile = path.join(evidence, 'contracts.json');
const handoffsFile = path.join(evidence, 'handoffs.json');
const contracts = new ContractExecutionRuntime(contractsFile, {
  cancel: (_id, _reason) => undefined,
  pause: (_id, _reason) => undefined,
});
const handoffs = new GovernedHandoffRuntime(contracts, handoffsFile);
const parentId = 'contract:glm53-agent-control-3.6-first-cut';
const childId = 'contract:glm53-agent-control-3.6-first-cut:worker';
const coordinator = {
  actorId: 'service:agent-control-mechanical-coordinator',
  agentId: 'agent-control-contract-coordinator',
  runtimeId: 'agent-control-3.6-contract-runtime',
  nodeId: 'benchmark-host',
};
const worker = {
  actorId: 'agent:glm53-flash-governed-worker',
  agentId: 'glm53-flash',
  modelId: 'z-ai/glm-5.3-flash',
  providerId: 'openrouter',
  runtimeId: 'typed-responses-runner',
  nodeId: 'benchmark-sandbox',
};

if (command === 'prepare') {
  if (fs.existsSync(contractsFile) || fs.existsSync(handoffsFile)) throw new Error('governed_state_already_exists');
  const brief = fs.readFileSync('/debt-brief.md');
  const stage1 = fs.readFileSync('/stage-1-prefix.md');
  const stage2 = fs.readFileSync('/stage-2.md');
  const envelope = fs.readFileSync('/resource-envelope.json');
  const runner = fs.readFileSync('/runner.mjs');
  const deadlineAt = new Date(Date.now() + 2_700_000).toISOString();
  const common = {
    frozenCommit: '5acdde13e41d58b511a33ac0e15f3dc6d3930613',
    model: 'z-ai/glm-5.3-flash',
    provider: 'openrouter',
    debtBrief: {reference: '/debt-brief.md', sha256: sha(brief), sizeBytes: brief.length},
    prompts: {
      assessmentSha256: sha(Buffer.concat([stage1, brief])),
      implementationSha256: sha(stage2),
    },
    resourceEnvelope: {reference: '/resource-envelope.json', sha256: sha(envelope), sizeBytes: envelope.length},
    runner: {sha256: sha(runner)},
  };
  contracts.create({
    id: parentId,
    laneId: 'benchmark:glm53-agent-control-3.6-first-cut-20260901',
    operatorActorId: 'human:benchmark-operator',
    objective: 'Empirically qualify GLM-5.3-Flash against the frozen Agent Control 3.6 debt brief.',
    completionCriteria: ['worker output independently scored', 'complete repository gate recorded', 'no production or sibling-lane access'],
    authority: ['repository.read', 'repository.write:bounded', 'repository.test:bounded'],
    protectedResources: ['production', 'live-agent-control', 'credentials', 'git-remotes', 'sibling-benchmark-lanes'],
    budget: {deadlineAt},
    active: coordinator,
    baton: {
      schema: 'agent-control.glm53-qualification-parent-baton/v1',
      task: 'governed GLM-5.3-Flash qualification',
      ...common,
      coordinatorContribution: 'mechanical contract construction, routing, state persistence, and verification-state transitions only',
    },
    process: {id: 'process:agent-control-coordinator'},
    ptyId: 'pty:agent-control-coordinator',
    attachments: [
      {id: 'attachment:debt-brief', kind: 'frozen-input', reference: '/debt-brief.md', sha256: sha(brief)},
      {id: 'attachment:resource-envelope', kind: 'frozen-input', reference: '/resource-envelope.json', sha256: sha(envelope)},
    ],
    permissions: {capabilities: ['repository.read', 'repository.write:bounded', 'repository.test:bounded'], filesystem: 'write', network: 'provider-only', production: false},
  });
  const delegation = await handoffs.request({
    outcome: 'DELEGATE',
    policy: 'AUTO',
    contractId: parentId,
    sourceActorId: coordinator.actorId,
    sourceAgentId: coordinator.agentId,
    target: {active: worker, process: {id: 'process:glm53-flash-worker'}, ptyId: 'pty:glm53-flash-worker'},
    child: {
      id: childId,
      objective: 'Assess the frozen repository read-only, then implement only the highest-priority coherent work after the assessment gate.',
      completionCriteria: [
        'mandatory architecture and debt assessment submitted before writes',
        'defects reproduced before fixes',
        'bounded implementation journal submitted',
        'relevant checks run without weakening governance',
      ],
    },
    reason: 'Delegate the identical frozen task to the only authorised model under a sealed bounded baton.',
    baton: {
      schema: 'agent-control.glm53-qualification-child-baton/v1',
      task: 'frozen Agent Control 3.6 debt assessment and bounded implementation',
      ...common,
      allowedFiles: ['tracked files beneath the isolated repository root'],
      forbiddenPaths: ['.git', 'node_modules', 'package-lock.json', 'npm-shrinkwrap.json', 'host paths', 'sibling lanes', 'production'],
      forbiddenActions: ['credential access', 'network except provider transport', 'remote access', 'deployment', 'test weakening', 'model substitution'],
      authority: ['repository.read', 'repository.write:bounded', 'repository.test:bounded'],
      limits: {providerRequests: 12, assessmentRequests: 6, implementationRequests: 6, changedFiles: 8, changedLines: 500, testTimeMs: 720000, parallelWorkers: 1},
      verification: ['git diff --check', 'npm run check', 'independent rubric scoring'],
      completionRule: 'Agent Control records COMPLETE only as pending independent verification; otherwise record YIELD.',
    },
    requestedAuthority: ['repository.read', 'repository.write:bounded', 'repository.test:bounded'],
    budget: {},
  });
  if (delegation.status !== 'COMPLETED' || delegation.childContractId !== childId) throw new Error('governed_delegation_failed');
  writeSummary('prepared', {parentId, childId, delegationId: delegation.id});
} else if (command === 'finalize') {
  const runExit = Number(runExitText);
  if (!Number.isInteger(runExit)) throw new Error('runner_exit_required');
  const resultFile = path.join(evidence, 'lane-result.json');
  if (runExit === 0 && fs.existsSync(resultFile)) {
    const result = fs.readFileSync(resultFile);
    const completion = await handoffs.request({
      outcome: 'COMPLETE', policy: 'AUTO', contractId: childId,
      sourceActorId: worker.actorId, sourceAgentId: worker.agentId,
      reason: 'Worker submitted bounded output for independent verification.', baton: {}, requestedAuthority: [], budget: {},
      evidence: [{id: 'evidence:worker-result', kind: 'model-result', reference: 'lane-result.json', sha256: sha(result), createdAt: new Date().toISOString()}],
    });
    writeSummary('verification-pending', {completionId: completion.id});
  } else {
    const assessment = path.join(evidence, 'assessment.txt');
    const reason = fs.existsSync(assessment) && fs.statSync(assessment).size
      ? 'Worker exhausted the assessment request allowance without submitting the mandatory assessment.'
      : 'Worker failed before submitting the mandatory assessment.';
    const childYield = await handoffs.request({outcome: 'YIELD', policy: 'AUTO', contractId: childId, sourceActorId: worker.actorId, sourceAgentId: worker.agentId, reason, baton: {}, requestedAuthority: [], budget: {}});
    const parentYield = await handoffs.request({outcome: 'YIELD', policy: 'AUTO', contractId: parentId, sourceActorId: coordinator.actorId, sourceAgentId: coordinator.agentId, reason: `Child did not satisfy the assessment gate; implementation authority was not exercised. ${reason}`, baton: {}, requestedAuthority: [], budget: {}});
    writeSummary('yielded', {runnerExit: runExit, childHandoffId: childYield.id, parentHandoffId: parentYield.id, reason});
  }
} else if (command === 'verify') {
  const passed = runExitText === 'pass';
  const child = contracts.get(childId);
  if (child.verification.state !== 'PENDING') throw new Error('child_not_pending_verification');
  contracts.verify(childId, 'service:independent-benchmark-evaluator', passed, passed ? [] : ['independent complete gate or rubric verification failed']);
  const parentCompletion = await handoffs.request({
    outcome: 'COMPLETE', policy: 'AUTO', contractId: parentId,
    sourceActorId: coordinator.actorId, sourceAgentId: coordinator.agentId,
    reason: 'Mechanical coordinator submits the child and independent-gate record for parent verification.', baton: {}, requestedAuthority: [], budget: {},
    evidence: [{id: 'evidence:independent-gate', kind: 'test', reference: 'evaluator-full-check.log', createdAt: new Date().toISOString()}],
  });
  contracts.verify(parentId, 'service:independent-benchmark-evaluator', passed, passed ? [] : ['child result did not pass independent verification']);
  writeSummary(passed ? 'verified' : 'verification-failed', {parentCompletionId: parentCompletion.id});
} else {
  throw new Error(`unknown_command:${command}`);
}

function writeSummary(state, extra) {
  const current = {
    schema: 'agent-control.glm53-governed-lane-state/v1', state,
    parent: contracts.get(parentId), child: contracts.get(childId), handoffs: handoffs.list(),
    coordinator: {identity: coordinator, contribution: 'mechanical only; no repository analysis or solution generation'},
    ...extra,
  };
  fs.writeFileSync(path.join(evidence, 'governed-state.json'), `${JSON.stringify(current, null, 2)}\n`, {mode: 0o600});
}

function sha(value) { return createHash('sha256').update(value).digest('hex'); }
