import {ActionFailure, ActionRegistry} from './job-runtime.js';
import {parseGovernedGitProposal, resolveGitEffects, type ActionGovernancePlan, type ExternalOperationState, type GovernedEffect} from './action-governance.js';
import type {ActionContext} from './job-types.js';

const supported = new Set(['status', 'diff', 'show', 'log', 'rev-parse', 'ls-remote', 'branch', 'remote', 'describe', 'fetch', 'checkout', 'switch', 'worktree', 'commit', 'add', 'restore', 'reset', 'merge', 'rebase', 'cherry-pick', 'tag', 'config', 'push']);

export function registerGovernedGitActions(registry = new ActionRegistry()) {
  registry.registerGovernedControl('repository.git-governed@1.0.0', async context => {
    const plan = context.governance;
    if (!plan) throw new ActionFailure('governed_git_plan_missing', 'policy_rejection');
    const states: Array<{effectId: string; state: ExternalOperationState; reason?: string}> = [];
    for (const operation of plan.operations) {
      const commandEffects = plan.effects.filter(effect => effect.resource.repositoryPath === operation.cwd && effect.external);
      const before = await observeRemoteRefs(context, commandEffects);
      let result;
      try { result = await context.ownedExecution.runProcess({command: operation.executable, args: operation.args, cwd: operation.cwd, maxOutputBytes: 256 * 1024}, context.signal); }
      catch (error) {
        const after = await observeRemoteRefs(context, commandEffects);
        states.push(...reconcile(commandEffects, before, after, 'Execution interrupted before a normal exit'));
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), {partialActionOutput: {externalOperationStates: states}});
      }
      if (commandEffects.length) {
        const after = await observeRemoteRefs(context, commandEffects);
        if (result.exitCode === 0) states.push(...commandEffects.map(effect => ({effectId: effect.id, state: 'EXTERNALLY_COMMITTED' as const})));
        else states.push(...reconcile(commandEffects, before, after, `Git exited ${result.exitCode ?? 'without-status'}`));
      }
      if (result.exitCode !== 0) throw Object.assign(new ActionFailure('governed_git_operation_failed', 'execution'), {partialActionOutput: {externalOperationStates: states}});
    }
    return {verification: ['governed-git-effects-enforced'], evidence: plan.effects.map(effect => `${effect.kind}:${effect.resource.id}`), externalOperationStates: states, detail: `Executed ${plan.operations.length} governed Git operation${plan.operations.length === 1 ? '' : 's'}`};
  }, input => {
    const repositoryPath = input.parameters.repositoryPath;
    if (typeof repositoryPath !== 'string') throw new Error('governed_git_repository_path_required');
    const proposalArtifact = input.inputArtifacts.find(artifact => artifact.name === 'git-proposal');
    const proposalValue = proposalArtifact ? input.readArtifact(proposalArtifact.id) : undefined;
    assertProposalRoute(input.run.trigger.modelRoute, proposalValue);
    const rawProposal = input.parameters.proposal ?? proposalValue;
    const operations = parseGovernedGitProposal(rawProposal, repositoryPath);
    if (operations.some(operation => operation.cwd !== repositoryPath && !operation.cwd.startsWith(`${repositoryPath}/`))) throw new Error('governed_git_alternate_cwd_outside_repository');
    const effects = resolveGitEffects(operations);
    for (const operation of operations) { const subcommand = operation.args.find(item => !item.startsWith('-')); if (!subcommand || !supported.has(subcommand.toLowerCase())) throw new Error(`governed_git_subcommand_unsupported:${subcommand ?? 'missing'}`); }
    return {schema: 'agent-control.action-governance-plan/v1', operations, effects, policies: []} satisfies ActionGovernancePlan;
  });
  registry.registerControl('repository.git-protected-ref.verify@1.0.0', async context => {
    const repositoryPath = context.parameters.repositoryPath, expected = context.parameters.expectedProtectedSha, expectedFeatureRef = context.parameters.expectedFeatureRef;
    if (typeof repositoryPath !== 'string' || typeof expected !== 'string' || !/^[a-f0-9]{40,64}$/i.test(expected)) throw new ActionFailure('protected_ref_verification_parameters_invalid', 'configuration');
    const result = await context.ownedExecution.runProcess({command: 'git', args: ['ls-remote', '--refs', 'origin', 'refs/heads/master'], cwd: repositoryPath, maxOutputBytes: 16 * 1024}, context.signal);
    const actual = result.exitCode === 0 ? result.stdout.trim().split(/\s+/)[0] : '';
    let featureSha = ''; if (typeof expectedFeatureRef === 'string' && expectedFeatureRef) { const feature = await context.ownedExecution.runProcess({command: 'git', args: ['ls-remote', '--refs', 'origin', `refs/heads/${expectedFeatureRef}`], cwd: repositoryPath, maxOutputBytes: 16 * 1024}, context.signal); if (feature.exitCode === 0) featureSha = feature.stdout.trim().split(/\s+/)[0] || ''; }
    const unchanged = actual.toLowerCase() === expected.toLowerCase(), featurePresent = typeof expectedFeatureRef !== 'string' || !expectedFeatureRef || /^[a-f0-9]{40,64}$/i.test(featureSha), passed = unchanged && featurePresent;
    return {verification: passed ? ['protected-ref-unchanged'] : [], evidence: [`protected-ref-before:${expected}`, `protected-ref-after:${actual || 'unavailable'}`, ...(typeof expectedFeatureRef === 'string' && expectedFeatureRef ? [`authorised-ref:${expectedFeatureRef}:${featureSha || 'unavailable'}`] : [])], detail: passed ? 'Independent remote-ref verification confirmed origin/master remained unchanged and the authorised feature ref exists' : 'Independent remote-ref verification detected a changed protected ref or missing authorised feature ref'};
  });
  return registry;
}

function assertProposalRoute(route: ActionContext['run']['trigger']['modelRoute'], proposal: unknown) {
  if (!proposal || typeof proposal !== 'object' || !('route' in proposal)) return;
  if (!route) throw new Error('governed_git_proposal_route_missing');
  const value = (proposal as {route?: Record<string, unknown>}).route;
  if (!value || value.providerId !== route.providerId || value.modelId !== route.modelId || (value.accountProfileId ?? null) !== (route.accountProfileId ?? null) || value.nodeId !== (route.providerExecutionNodeId ?? route.nodeId)) throw new Error('governed_git_proposal_route_identity_mismatch');
}

async function observeRemoteRefs(context: ActionContext, effects: GovernedEffect[]) {
  const observed = new Map<string, string | null | undefined>();
  for (const effect of effects) {
    if (!effect.resource.remote || !effect.resource.ref || effect.resource.ref === '*') { observed.set(effect.id, undefined); continue; }
    try {
      const result = await context.ownedExecution.runProcess({command: 'git', args: ['ls-remote', '--refs', effect.resource.remote, `refs/heads/${effect.resource.ref}`], cwd: effect.resource.repositoryPath, maxOutputBytes: 16 * 1024});
      if (result.exitCode !== 0) observed.set(effect.id, undefined);
      else observed.set(effect.id, result.stdout.trim().split(/\s+/)[0] || null);
    } catch { observed.set(effect.id, undefined); }
  }
  return observed;
}

function reconcile(effects: GovernedEffect[], before: Map<string, string | null | undefined>, after: Map<string, string | null | undefined>, reason: string) {
  return effects.map(effect => {
    const prior = before.get(effect.id), current = after.get(effect.id);
    if (prior === undefined || current === undefined) return {effectId: effect.id, state: 'COMMIT_STATE_UNCERTAIN' as const, reason};
    if (prior !== current) return {effectId: effect.id, state: 'EXTERNALLY_COMMITTED' as const, reason: `${reason}; remote ref changed`};
    return {effectId: effect.id, state: 'FAILED' as const, reason: `${reason}; remote ref remained unchanged`};
  });
}
