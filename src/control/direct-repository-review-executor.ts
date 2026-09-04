import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import type {ModelConfig, ProviderAccountProfileConfig, ProviderConfig} from './config.js';
import {CodexRepositoryReviewClient} from './codex-repository-review-client.js';
import type {ContractExecutionRuntime} from './contract-runtime.js';
import type {GovernedHandoffRuntime} from './handoff-runtime.js';
import type {ModelRegistry, ModelRouteDecision, ModelRegistryRow} from './model-registry.js';
import {
  OpenAICompatibleProviderClient,
  type ModelInvocationResult,
  type PartialModelInvocation,
  type ProviderInvocationTelemetry,
} from './openai-compatible-provider.js';
import type {RepositoryReviewExecutor, RepositoryReviewResult, ReviewExecutionRequest, ReviewExecutionResponse} from './parameterized-job-types.js';
import type {TokenAwareBatonRuntime, VerifiedBaton} from './token-aware-baton-routing.js';
import {LocalCodexNodeExecutionPort, type CodexNodeExecutionPort} from './codex-node-execution.js';
import {WorkParcelStore, type WorkParcel} from './work-parcels.js';
import {evidencePacketContextSource, evidenceReferences, type GovernedRetrievalRuntime, type RetrievedEvidenceContextCompiler} from './governed-retrieval.js';
import {accountProviderExecutionNode} from './provider-account-profile.js';

type ReviewChunk = ReviewExecutionRequest['contextChunks'][number];
type PreparedReviewChunk = ReviewChunk & {evidenceReferences?: string[]; evidencePacketId?: string};
type InvocationOptions = Parameters<OpenAICompatibleProviderClient['invoke']>[2];

export interface RepositoryReviewProviderClient {
  invoke(model: ModelConfig, input: string, options?: InvocationOptions): Promise<ModelInvocationResult & {nodeId?: string}>;
}

export interface RepositoryReviewTokenLifecycle {
  routing: TokenAwareBatonRuntime;
  contracts: ContractExecutionRuntime;
  handoffs: GovernedHandoffRuntime;
}

export type RepositoryReviewProviderClientFactory = (provider: ProviderConfig, account?: ProviderAccountProfileConfig, route?: ModelRouteDecision) => RepositoryReviewProviderClient;

interface ExecutionTotals {
  accountedInvocations: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerReportedCost: number;
  calculatedCost: number;
  currency?: string;
  completeTokens: boolean;
  completeProviderCost: boolean;
  completeCalculatedCost: boolean;
}

export class DirectRepositoryReviewExecutor implements RepositoryReviewExecutor {
  private readonly routing?: TokenAwareBatonRuntime;

  constructor(
    private readonly models: ModelRegistry,
    private readonly parcels: WorkParcelStore,
    tokenRouting?: TokenAwareBatonRuntime,
    private readonly lifecycle?: RepositoryReviewTokenLifecycle,
    private readonly clients?: RepositoryReviewProviderClientFactory,
    private readonly nodeExecution: CodexNodeExecutionPort = new LocalCodexNodeExecutionPort(),
    private readonly retrieval?: GovernedRetrievalRuntime,
    private readonly evidenceCompiler?: RetrievedEvidenceContextCompiler,
  ) {
    this.routing = lifecycle?.routing ?? tokenRouting;
  }

  async execute(request: ReviewExecutionRequest): Promise<ReviewExecutionResponse> {
    if (!Number.isSafeInteger(request.executionAttempt) || request.executionAttempt < 1) throw new Error('repository_review_execution_attempt_invalid');
    this.routeConfiguration(request.route);
    const results: RepositoryReviewResult[] = [];
    const parcelIds: string[] = [];
    const responseIds: string[] = [];
    const retrievalEvidence: string[] = [];
    const totals: ExecutionTotals = {
      accountedInvocations: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      providerReportedCost: 0,
      calculatedCost: 0,
      completeTokens: true,
      completeProviderCost: true,
      completeCalculatedCost: true,
    };

    const capture = (parcel: WorkParcel, invocation: ModelInvocationResult, route: ModelRouteDecision, responseHash: string) => {
      totals.accountedInvocations++;
      responseIds.push(responseHash);
      if ([invocation.usage.inputTokens, invocation.usage.outputTokens, invocation.usage.totalTokens].some(value => value === null)) totals.completeTokens = false;
      totals.inputTokens += invocation.usage.inputTokens ?? 0;
      totals.outputTokens += invocation.usage.outputTokens ?? 0;
      totals.totalTokens += invocation.usage.totalTokens ?? 0;
      if (invocation.usage.providerReportedCost === null) totals.completeProviderCost = false;
      else totals.providerReportedCost += invocation.usage.providerReportedCost;
      if (invocation.usage.calculatedCost === null) totals.completeCalculatedCost = false;
      else totals.calculatedCost += invocation.usage.calculatedCost;
      totals.currency ??= invocation.usage.currency ?? undefined;
      this.recordInvocation(parcel, invocation, request, route, responseHash);
    };

    let chunkIndex = 0;
    while (chunkIndex < request.contextChunks.length) {
      const originalChunk = request.contextChunks[chunkIndex];
      const parcel = this.createParcel(request, originalChunk.id);
      const chunk = await this.prepareChunk(request, parcel, originalChunk, retrievalEvidence);
      parcelIds.push(parcel.id);
      try {
        const source = await this.invokeChunk(request, request.route, parcel, chunk);
        capture(parcel, source.invocation, request.route, source.responseHash);
        this.requireComplete(source.invocation);
        results.push(source.result);
        this.requireWithinBudget(request, totals);

        const nextOriginal = request.contextChunks[chunkIndex + 1];
        const nextChunk = nextOriginal ? await this.prepareChunk(request, parcel, nextOriginal, retrievalEvidence) : undefined;
        const handoff = nextChunk ? await this.tryGovernedContinuation(request, parcel, chunk, nextChunk, source, capture, totals, results) : false;
        if (handoff) chunkIndex += 2;
        else chunkIndex++;
        this.finishParcel(parcel, 'SUCCEEDED', handoff ? 'Governed token-aware continuation completed' : `Provider ${source.invocation.providerId}; model ${source.invocation.modelId}; structured review returned`);
      } catch (error) {
        const partial = (error as {partialInvocation?: PartialModelInvocation}).partialInvocation;
        if (partial && !responseIds.includes(partial.responseHash)) capture(parcel, partial, request.route, partial.responseHash);
        this.finishParcel(parcel, 'FAILED', message(error));
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
          workParcelIds: [...parcelIds],
          evidence: [...responseIds.map(id => `provider_response_${id}`), ...retrievalEvidence],
          providerResponseIds: [...responseIds],
          usage: usage(totals),
        });
      }
    }

    return {
      result: consolidate(results),
      usage: usage(totals),
      evidence: [...responseIds.map(id => `provider_response_${id}`), ...retrievalEvidence],
      providerResponseIds: responseIds,
      workParcelIds: parcelIds,
    };
  }

  recordVerification(workParcelIds: string[], verdict: RepositoryReviewResult['verdict']) {
    const at = new Date().toISOString(), accepted = verdict === 'PASS' || verdict === 'PASS_WITH_FINDINGS';
    for (const id of workParcelIds) {
      const parcel = this.parcels.get(id);
      if (!parcel || parcel.executionOwner !== 'direct-repository-review-executor') continue;
      for (const invocation of parcel.audit.invocations) invocation.verifierResult = verdict;
      parcel.audit.timeline.push({id: `audit-${randomUUID()}`, at, type: 'verification.completed', stageId: 'review', summary: `Independent repository validation: ${verdict}`, detail: `Parameterized Job validation ${accepted ? 'accepted' : 'rejected'} the consolidated repository-review result`});
      parcel.provenance.push({at, type: 'verification.completed', detail: verdict});
      this.parcels.update(parcel);
      this.verifyGovernedContract(parcel, verdict, at);
    }
  }

  private async tryGovernedContinuation(
    request: ReviewExecutionRequest,
    parcel: WorkParcel,
    completedChunk: ReviewChunk,
    nextChunk: ReviewChunk,
    source: Awaited<ReturnType<DirectRepositoryReviewExecutor['invokeChunk']>>,
    capture: (parcel: WorkParcel, invocation: ModelInvocationResult, route: ModelRouteDecision, responseHash: string) => void,
    totals: ExecutionTotals,
    results: RepositoryReviewResult[],
  ) {
    if (!this.routing || !this.lifecycle) return false;
    const decision = this.routing.assess(source.threadId, {
      remainingWork: 'BOUNDED',
      reasoningState: 'COMPLETE',
      requiredCapabilities: ['repository-review'],
      candidates: this.routingCandidates(request.route, source.invocation),
    });
    if (decision.action !== 'BATON_AND_HANDOFF' || !decision.target) return false;

    const targetRoute = this.models.route({model: decision.target.modelId, nodeId: request.route.workloadNodeId, workloadNodeId: request.route.workloadNodeId, providerExecutionNodeId: decision.target.providerExecutionNodeId ?? decision.target.nodeId, requiredCapabilities: ['repository-review'], allowFallback: false});
    if (targetRoute.providerId !== decision.target.providerId || targetRoute.accountProfileId !== (decision.target.accountProfileId ?? null) || targetRoute.providerExecutionNodeId !== (decision.target.providerExecutionNodeId ?? decision.target.nodeId ?? request.route.providerExecutionNodeId) || targetRoute.credentialNodeId !== (decision.target.credentialNodeId ?? null)) throw new Error('token_handoff_route_identity_changed');
    const baton = this.routing.createBaton({
      threadId: source.threadId,
      parcelId: parcel.id,
      providerId: source.invocation.providerId,
      nodeId: request.route.nodeId,
      workloadNodeId: request.route.workloadNodeId,
      providerExecutionNodeId: request.route.providerExecutionNodeId,
      credentialNodeId: request.route.credentialNodeId ?? undefined,
      accountProfileId: request.route.accountProfileId ?? undefined,
      accountLabel: request.route.accountLabel ?? undefined,
      accountPlan: request.route.accountPlan ?? undefined,
      accountPlanAuthority: request.route.accountPlanAuthority ?? undefined,
      accountQualification: request.route.accountQualification ?? undefined,
      accountAvailability: request.route.accountAvailability ?? undefined,
      modelId: source.invocation.modelId,
      objective: `Complete governed review of frozen repository ${request.run.repository?.name ?? 'repository'} at ${request.run.repository?.reviewedSha ?? 'unknown SHA'}`,
      completedWork: [`Reviewed ${completedChunk.id}: ${source.result.executiveSummary}`],
      decisions: [decision.reason, `Continue only with frozen context chunk ${nextChunk.id}`],
      filesChanged: [],
      git: {sha: request.run.repository?.reviewedSha ?? 'unknown', dirty: request.run.repository?.dirty ?? false, diffSummary: request.run.repository?.dirty ? `Frozen snapshot includes dirty paths: ${request.run.repository.dirtyPaths.join(', ')}` : 'Frozen repository snapshot is clean'},
      testsAndEvidence: [source.responseHash],
      evidenceReferences: [...((completedChunk as PreparedReviewChunk).evidenceReferences ?? []), ...((nextChunk as PreparedReviewChunk).evidenceReferences ?? [])],
      unresolvedIssues: [...source.result.areasNotReviewed, ...source.result.findings.map(finding => finding.id)],
      nextAction: `Review frozen context chunk ${nextChunk.id} containing ${nextChunk.files.join(', ')}`,
    });
    const sourceContract = this.ensureSourceContract(request, parcel, source.invocation);
    let destinationContractId: string | undefined;
    const destinationActorId = actorId(targetRoute);
    const destinationAgentId = agentId(targetRoute);
    const handoffDecision = await this.routing.governedHandoff(source.threadId, baton.id, decision.target, this.lifecycle.handoffs, {
      outcome: 'DELEGATE',
      policy: 'AUTO',
      contractId: sourceContract.id,
      sourceActorId: sourceContract.active.actorId,
      sourceAgentId: sourceContract.active.agentId,
      target: {active: {actorId: destinationActorId, agentId: destinationAgentId, modelId: targetRoute.modelId, providerId: targetRoute.providerId, accountProfileId: targetRoute.accountProfileId ?? undefined, runtimeId: `provider:${targetRoute.providerId}`, nodeId: targetRoute.nodeId, workloadNodeId: targetRoute.workloadNodeId, providerExecutionNodeId: targetRoute.providerExecutionNodeId, credentialNodeId: targetRoute.credentialNodeId ?? undefined}, process: {id: `provider-invocation:${request.run.id}:${nextChunk.id}:${targetRoute.modelId}`}, ptyId: `provider-pty:${request.run.id}:${nextChunk.id}:${targetRoute.modelId}`},
      requestedAuthority: ['repository-review'],
      budget: {},
      child: {objective: baton.nextAction, completionCriteria: ['Return a schema-valid repository review for the assigned frozen context chunk']},
    }, async governed => {
      destinationContractId = governed.childContractId;
      let destination: Awaited<ReturnType<DirectRepositoryReviewExecutor['invokeChunk']>>;
      try { destination = await this.invokeChunk(request, targetRoute, parcel, nextChunk, baton); }
      catch (error) {
        const partial = (error as {partialInvocation?: PartialModelInvocation}).partialInvocation;
        if (partial) capture(parcel, partial, targetRoute, partial.responseHash);
        throw error;
      }
      capture(parcel, destination.invocation, targetRoute, destination.responseHash);
      this.requireComplete(destination.invocation);
      results.push(destination.result);
    });

    if (handoffDecision.outcome === 'SUCCEEDED') {
      if (!destinationContractId) throw new Error('governed_handoff_destination_contract_missing');
      this.recordContract(parcel, destinationContractId, 'governed-verification-contract', `Destination ${targetRoute.providerId}/${targetRoute.modelId} continued ${nextChunk.id}`);
      this.requireWithinBudget(request, totals);
      return true;
    }

    if (destinationContractId) this.failDestinationContract(destinationContractId, handoffDecision.reason);
    this.requireWithinBudget(request, totals);
    const recovered = await this.invokeChunk(request, request.route, parcel, nextChunk, undefined, `${source.threadId}:recovery`);
    capture(parcel, recovered.invocation, request.route, recovered.responseHash);
    this.requireComplete(recovered.invocation);
    results.push(recovered.result);
    this.recordContract(parcel, sourceContract.id, 'governed-verification-contract', `Destination failed; original ${request.route.providerId}/${request.route.modelId} resumed ${nextChunk.id}`);
    parcel.audit.timeline.push({id: `audit-${randomUUID()}`, at: new Date().toISOString(), type: 'route.changed', stageId: 'review', summary: 'Original provider thread resumed after failed governed handoff', detail: handoffDecision.reason});
    this.parcels.update(parcel);
    this.requireWithinBudget(request, totals);
    return true;
  }

  private async invokeChunk(request: ReviewExecutionRequest, route: ModelRouteDecision, parcel: WorkParcel, chunk: PreparedReviewChunk, baton?: VerifiedBaton, threadId = `review:${request.run.id}:attempt-${request.executionAttempt}:${chunk.id}`) {
    const {provider, model, account} = this.routeConfiguration(route);
    const prompt = await this.prompt(request, chunk, baton);
    const client: RepositoryReviewProviderClient = this.clients?.(provider, account, route) ?? (provider.kind === 'cli' ? new CodexRepositoryReviewClient(provider, requiredAccount(account), route.nodeId, this.nodeExecution) : new OpenAICompatibleProviderClient(provider));
    const invocation = await client.invoke(model, prompt, {
      structured: true,
      outputSchema: REPOSITORY_REVIEW_OUTPUT_SCHEMA,
      maximumOutputTokens: request.maximumOutputTokens,
      timeoutMs: request.run.definition.budgets.timeoutMinutes * 60_000,
      signal: request.signal,
      onTelemetry: event => this.observeTelemetry(event, threadId, parcel.id, route),
    });
    if (route.providerId !== invocation.providerId || route.modelId !== invocation.modelId || (route.accountProfileId ?? undefined) !== invocation.accountProfileId || (invocation.nodeId !== undefined && route.nodeId !== invocation.nodeId) || (route.accountProfileId && invocation.nodeId === undefined)) throw new Error('provider_route_identity_mismatch');
    const responseHash = `sha256:${createHash('sha256').update(invocation.output).digest('hex')}`;
    try { return {invocation, responseHash, result: parseRepositoryReviewResponse(invocation.output), threadId}; }
    catch (error) { throw Object.assign(error instanceof Error ? error : new Error(String(error)), {partialInvocation: {...invocation, responseHash}}); }
  }

  private async prepareChunk(request: ReviewExecutionRequest, parcel: WorkParcel, chunk: ReviewChunk, collected: string[]): Promise<PreparedReviewChunk> {
    if (!this.retrieval || !request.run.repository) return chunk;
    const at = new Date().toISOString();
    try {
      const packet = await this.retrieval.retrieve({id:`retrieval:${request.run.id}:${chunk.id}`,parcelId:parcel.id,taskType:'repository-review',query:retrievalQuery(request.instruction,chunk.files),exactTerms:[...chunk.files,...retrievalIdentifiers(request.instruction)],scopes:chunk.files,repository:{repositoryId:request.run.repository.identity,root:request.run.repository.snapshotPath,gitSha:request.run.repository.reviewedSha,dirty:request.run.repository.dirty,dirtyFingerprint:request.run.repository.dirtyPaths.length?createHash('sha256').update(request.run.repository.dirtyPaths.slice().sort().join('\n')).digest('hex'):undefined},maximumEvidenceTokens:Math.min(request.run.definition.budgets.maximumInputTokens??this.retrieval.policy.maximumEvidenceTokens,this.retrieval.policy.maximumEvidenceTokens),requiredCoverage:.1,minimumConfidence:.05});
      const compiled=this.evidenceCompiler?await this.evidenceCompiler.compile(packet,request.run.context?.profile??'STANDARD',this.retrieval.policy.maximumEvidenceTokens):undefined;
      if(compiled)this.retrieval.contextCompiled(packet.id);
      const source = compiled?.source??evidencePacketContextSource(packet), references = evidenceReferences(packet); collected.push(packet.id, ...references);
      parcel.provenance.push({at,type:'retrieval.evidence',detail:`${packet.id}:${packet.sha256}`});
      parcel.audit.timeline.push({id:`audit-${randomUUID()}`,at,type:'readiness.checked',stageId:'review',summary:`Governed retrieval supplied ${packet.items.length} compact evidence items`,detail:`${packet.id}; context ${compiled?.packet.id??'direct-source'}; ${packet.estimatedTokens} estimated tokens; ${packet.rawBytesAvoided} raw bytes avoided`});
      this.parcels.update(parcel);
      return {...chunk,content:source.content ?? '',sha256:createHash('sha256').update(source.content ?? '').digest('hex'),evidenceReferences:references,evidencePacketId:packet.id};
    } catch (error) {
      this.retrieval.fallback(parcel.id,`retrieval:${request.run.id}:${chunk.id}`,message(error));
      parcel.audit.timeline.push({id:`audit-${randomUUID()}`,at,type:'readiness.checked',stageId:'review',summary:'Governed retrieval unavailable; controlled frozen context retained',detail:message(error).slice(0,240)});
      parcel.provenance.push({at,type:'retrieval.fallback',detail:'frozen-context'}); this.parcels.update(parcel); return chunk;
    }
  }

  private async prompt(request: ReviewExecutionRequest, chunk: ReviewChunk, baton?: VerifiedBaton) {
    const prepared = chunk as PreparedReviewChunk;
    let rehydrated='';
    if(baton&&this.retrieval&&request.run.repository){const packetIds=[...new Set((baton.evidenceReferences??[]).map(reference=>reference.split('#')[0]).filter(id=>id.startsWith('evidence-packet:')))];for(const packetId of packetIds){const packet=this.retrieval.rehydrate(packetId,{repositoryId:request.run.repository.identity,root:request.run.repository.snapshotPath,gitSha:request.run.repository.reviewedSha,dirty:request.run.repository.dirty,dirtyFingerprint:request.run.repository.dirtyPaths.length?createHash('sha256').update(request.run.repository.dirtyPaths.slice().sort().join('\n')).digest('hex'):undefined});if(packetId!==prepared.evidencePacketId)rehydrated+=`\n\nRehydrated Baton Evidence ${packetId}\n${evidencePacketContextSource(packet).content??''}`;}}
    const base = `${request.instruction}\n\n${prepared.evidencePacketId ? `Governed Evidence Packet: ${prepared.evidencePacketId}\n` : ''}${chunk.content}${rehydrated}`;
    if (!baton) return base;
    return `${base}\n\nGoverned continuation baton\nBaton ID: ${baton.id}\nBaton SHA-256: ${baton.sha256}\nObjective: ${baton.objective}\nCompleted work: ${baton.completedWork.join('; ')}\nDecisions: ${baton.decisions.join('; ')}\nEvidence references: ${(baton.evidenceReferences ?? []).join('; ') || 'none'}\nExact next action: ${baton.nextAction}\nOrigin: ${routeLabel(baton)} thread ${baton.threadId}\nParcel tokens at handoff: ${baton.parcelTotals.totalTokens ?? 'unavailable'}`;
  }

  private observeTelemetry(event: ProviderInvocationTelemetry, threadId: string, parcelId: string, route: ModelRouteDecision) {
    this.routing?.observe({
      threadId,
      parcelId,
      agentId: route.nodeId,
      nodeId: route.nodeId,
      workloadNodeId: route.workloadNodeId,
      providerExecutionNodeId: route.providerExecutionNodeId,
      credentialNodeId: route.credentialNodeId ?? undefined,
      providerId: event.providerId,
      accountProfileId: route.accountProfileId ?? undefined,
      accountLabel: route.accountLabel ?? undefined,
      accountPlan: route.accountPlan ?? undefined,
      accountPlanAuthority: route.accountPlanAuthority ?? undefined,
      accountQualification: route.accountQualification ?? undefined,
      accountAvailability: route.accountAvailability ?? undefined,
      modelId: event.modelId,
      elapsedMs: event.elapsedMs,
      active: event.phase === 'started',
      cumulative: {inputTokens: event.usage?.inputTokens, outputTokens: event.usage?.outputTokens, totalTokens: event.usage?.totalTokens},
      context: event.context,
      cost: {
        amount: event.usage?.providerReportedCost ?? event.usage?.calculatedCost ?? null,
        currency: event.usage?.currency ?? null,
        authority: event.usage?.providerReportedCost === null || event.usage?.providerReportedCost === undefined ? event.usage?.calculatedCost === null || event.usage?.calculatedCost === undefined ? 'unavailable' : 'estimated' : 'authoritative',
        source: event.usage?.providerReportedCost === null || event.usage?.providerReportedCost === undefined ? event.usage?.calculatedCost === null || event.usage?.calculatedCost === undefined ? 'provider_not_reported' : 'configured_pricing' : 'provider_usage',
      },
    });
  }

  private routingCandidates(sourceRoute: ModelRouteDecision, source: ModelInvocationResult) {
    const permitted = new Set(this.models.governedAlternatives(sourceRoute.modelId, sourceRoute.requestedRole));
    return this.models.list().filter(row => permitted.has(row.id)).map(row => {
      const provider = this.models.provider(row.provider);
      return {
        providerId: row.provider,
        accountProfileId: row.account?.id,
        accountLabel: row.account?.label,
        accountPlan: row.account?.plan ?? undefined,
        accountPlanAuthority: row.account?.planAuthority ?? undefined,
        accountQualification: row.account?.qualification.state,
        accountAvailability: row.account?.availability,
        modelId: row.id,
        nodeId: row.account?.providerExecutionNodeId ?? row.account?.nodeId ?? row.qualification.nodes[0] ?? row.nodes?.[0] ?? sourceRoute.providerExecutionNodeId,
        workloadNodeId: sourceRoute.workloadNodeId,
        providerExecutionNodeId: row.account?.providerExecutionNodeId ?? row.account?.nodeId ?? row.qualification.nodes[0] ?? row.nodes?.[0] ?? sourceRoute.providerExecutionNodeId,
        credentialNodeId: row.account?.credentialNodeId,
        estimatedCost: estimateCost(row, source),
        qualified: Boolean(provider) && provider?.enabled !== false && row.enabled !== false && row.qualification.state === 'QUALIFIED' && (!row.qualification.nodes.length || row.qualification.nodes.includes(row.account?.providerExecutionNodeId ?? row.account?.nodeId ?? row.qualification.nodes[0] ?? row.nodes?.[0] ?? sourceRoute.providerExecutionNodeId)) && (!row.account || row.account.availability === 'AVAILABLE'),
        capabilities: [...row.qualification.capabilities],
      };
    });
  }

  private ensureSourceContract(request: ReviewExecutionRequest, parcel: WorkParcel, invocation: ModelInvocationResult) {
    const id = `token-source:${parcel.id}`;
    try { return this.lifecycle!.contracts.get(id); }
    catch (error) { if (message(error) !== 'contract_missing') throw error; }
    return this.lifecycle!.contracts.create({
      id,
      laneId: parcel.id,
      operatorActorId: `parameterized-job:${request.run.id}`,
      objective: parcel.objective,
      completionCriteria: ['Return schema-valid review output for the frozen Work Parcel and pass independent validation'],
      authority: ['repository-review'],
      active: {actorId: actorId(request.route), agentId: agentId(request.route), modelId: request.route.modelId, providerId: request.route.providerId, accountProfileId: request.route.accountProfileId ?? undefined, runtimeId: `provider:${request.route.providerId}`, nodeId: request.route.nodeId, workloadNodeId: request.route.workloadNodeId, providerExecutionNodeId: request.route.providerExecutionNodeId, credentialNodeId: request.route.credentialNodeId ?? undefined},
      baton: {jobRunId: request.run.id, reviewedSha: request.run.repository?.reviewedSha ?? 'unknown', sourceResponse: createHash('sha256').update(invocation.output).digest('hex')},
      process: {id: `provider-invocation:${request.run.id}:${request.route.modelId}`},
      ptyId: `provider-pty:${request.run.id}:${request.route.modelId}`,
      permissions: {capabilities: ['repository-review'], filesystem: 'read', network: 'provider-only', production: false},
    });
  }

  private failDestinationContract(id: string, reason: string) {
    const contract = this.lifecycle!.contracts.get(id);
    if (contract.verification.state === 'UNSUBMITTED') this.lifecycle!.contracts.submitForVerification(id, contract.active.actorId, []);
    if (this.lifecycle!.contracts.get(id).verification.state === 'PENDING') this.lifecycle!.contracts.verify(id, 'agent-control:handoff-recovery-verifier', false, [reason]);
  }

  private verifyGovernedContract(parcel: WorkParcel, verdict: RepositoryReviewResult['verdict'], at: string) {
    if (!this.lifecycle) return;
    const reference = [...parcel.provenance].reverse().find(item => item.type === 'governed-verification-contract');
    if (!reference) return;
    try {
      const contract = this.lifecycle.contracts.get(reference.detail);
      if (contract.verification.state === 'UNSUBMITTED') {
        const evidence = parcel.audit.invocations.map(invocation => ({id: invocation.id, kind: 'provider-response', reference: invocation.id, createdAt: at}));
        this.lifecycle.contracts.submitForVerification(contract.id, contract.active.actorId, evidence);
      }
      const accepted = verdict === 'PASS' || verdict === 'PASS_WITH_FINDINGS';
      if (this.lifecycle.contracts.get(contract.id).verification.state === 'PENDING') this.lifecycle.contracts.verify(contract.id, `parameterized-job-validator:${parcel.id}`, accepted, [`Repository validation ${accepted ? 'accepted' : 'rejected'} verdict ${verdict}`]);
    } catch (error) {
      parcel.audit.timeline.push({id: `audit-${randomUUID()}`, at, type: 'stage.failed', stageId: 'review', summary: 'Governed contract verification record failed', detail: message(error)});
      this.parcels.update(parcel);
      throw error;
    }
  }

  private recordContract(parcel: WorkParcel, contractId: string, type: string, summary: string) {
    const at = new Date().toISOString();
    parcel.provenance.push({at, type, detail: contractId});
    parcel.audit.timeline.push({id: `audit-${randomUUID()}`, at, type: 'route.changed', stageId: 'review', summary, detail: contractId});
    this.parcels.update(parcel);
  }

  private routeConfiguration(route: ModelRouteDecision) {
    const provider = this.models.provider(route.providerId);
    const model = this.models.model(route.modelId);
    if (!provider || !model) throw new Error('selected_model_configuration_missing');
    const account = route.accountProfileId ? this.models.accountProfile(route.providerId, route.accountProfileId) : undefined;
    if ((model.accountProfile ?? null) !== route.accountProfileId || (route.accountProfileId && !account)) throw new Error('selected_account_profile_configuration_missing');
    if (account && accountProviderExecutionNode(account) !== route.providerExecutionNodeId) throw new Error('selected_account_profile_node_mismatch');
    return {provider, model, account};
  }

  private requireComplete(invocation: ModelInvocationResult) {
    if (invocation.finishReason && !['stop', 'completed'].includes(invocation.finishReason)) throw new Error(`repository_review_provider_incomplete:${invocation.finishReason}`);
  }

  private requireWithinBudget(request: ReviewExecutionRequest, totals: ExecutionTotals) {
    if (request.maximumCost === undefined) return;
    if (!totals.completeProviderCost && !totals.completeCalculatedCost) throw new Error('job_cost_budget_unenforceable');
    if (effectiveCost(totals.completeProviderCost, totals.providerReportedCost, totals.completeCalculatedCost, totals.calculatedCost) > request.maximumCost) throw new Error('job_cost_budget_exceeded');
  }

  private createParcel(request: ReviewExecutionRequest, chunkId: string) {
    const at = new Date().toISOString();
    const id = `parcel-${randomUUID()}`;
    const parcel: WorkParcel = {id, prompt: `Repository review ${request.run.id} ${chunkId}`, objective: `Review frozen ${request.run.repository?.reviewedSha} context chunk ${chunkId}`, actor: `parameterized-job:${request.run.id}`, executionOwner: 'direct-repository-review-executor', status: 'RUNNING', planner: {kind: 'deterministic', reason: 'Repository Job deterministically decomposed frozen context'}, stages: [{id: 'review', name: `Review ${chunkId}`, job: `repository-code-review@${request.run.definition.version}`, dependsOn: [], parameters: {jobRunId: request.run.id, contextChunkId: chunkId}, status: 'RUNNING', requestedRoute: {accountProfile: request.route.accountProfileId ?? undefined, model: request.route.modelId, modelRole: request.route.requestedRole ?? undefined, allowFallback: !request.route.fallback, profile: request.run.context?.profile, reason: 'Route frozen by parameterized Job resolution'}, actualRoute: {workers: [request.route.providerExecutionNodeId], workloadNodeId: request.route.workloadNodeId, providerExecutionNodeId: request.route.providerExecutionNodeId, credentialNodeId: request.route.credentialNodeId ?? undefined, provider: request.route.providerId, accountProfile: request.route.accountProfileId ?? undefined, accountLabel: request.route.accountLabel ?? undefined, accountPlan: request.route.accountPlan ?? undefined, accountPlanAuthority: request.route.accountPlanAuthority ?? undefined, accountQualification: request.route.accountQualification ?? undefined, accountAvailability: request.route.accountAvailability ?? undefined, model: request.route.modelId, profile: request.run.context?.profile, reason: `Qualification ${request.route.qualificationVersion}`}, startedAt: at}], createdAt: at, updatedAt: at, telemetry: {freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, cost: null, currency: null, elapsedMs: 0}, audit: {schema: 'agent-control.work-parcel-audit/v1', recordedAt: at, classification: 'Frozen repository context review', selectedExecution: 'Work Parcel', planningRationale: 'Deterministic decomposition owned by repository-code-review definition', planner: {kind: 'deterministic', provider: null, model: null}, alternatives: [], timeline: [{id: `audit-${randomUUID()}`, at, type: 'task.received', summary: 'Frozen review chunk received', detail: chunkId}, {id: `audit-${randomUUID()}`, at, type: 'route.resolved', stageId: 'review', summary: routeLabel(request.route), detail: `Qualification ${request.route.qualificationVersion}; fallback ${request.route.fallback}`}], invocations: [], totals: {models: [auditModelLabel(request.route)], invocations: 0, freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, providerReportedCost: null, calculatedCost: null, cost: null, costBasis: 'unavailable', currency: null, modelExecutionMs: 0, wallClockMs: 0}}, provenance: [{at, type: 'job-run', detail: request.run.id}, {at, type: 'reviewed-sha', detail: request.run.repository?.reviewedSha ?? 'unresolved'}, {at, type: 'execution-locality', detail: `workload=${request.route.workloadNodeId};provider=${request.route.providerExecutionNodeId};credential=${request.route.credentialNodeId ?? 'none'}`}]};
    return this.parcels.add(parcel);
  }

  private recordInvocation(parcel: WorkParcel, invocation: ModelInvocationResult, request: ReviewExecutionRequest, route: ModelRouteDecision, evidenceId: string) {
    const completedAt = new Date().toISOString();
    const startedAt = new Date(Date.parse(completedAt) - invocation.elapsedMs).toISOString();
    const provider = invocation.usage.providerReportedCost;
    const calculated = invocation.usage.calculatedCost;
    const cost = effectiveCost(provider !== null, provider ?? 0, calculated !== null, calculated ?? 0);
    const costBasis = provider !== null && (calculated === null || provider >= calculated) ? 'provider-reported' as const : calculated !== null ? 'calculated' as const : 'unavailable' as const;
    const cached = invocation.usage.cachedInputTokens;
    const fresh = invocation.usage.inputTokens === null ? null : Math.max(0, invocation.usage.inputTokens - (cached ?? 0));
    const prior = parcel.audit.totals;
    const first = prior.invocations === 0;
    const nextProviderCost = mergeAmount(prior.providerReportedCost, provider, first);
    const nextCalculatedCost = mergeAmount(prior.calculatedCost, calculated, first);
    const aggregateCostBasis = nextProviderCost !== null && (nextCalculatedCost === null || nextProviderCost >= nextCalculatedCost) ? 'provider-reported' as const : nextCalculatedCost !== null ? 'calculated' as const : 'unavailable' as const;
    const aggregateCost = aggregateCostBasis === 'provider-reported' ? nextProviderCost : aggregateCostBasis === 'calculated' ? nextCalculatedCost : null;
    const currency = first ? invocation.usage.currency : prior.currency === invocation.usage.currency ? prior.currency : null;
    parcel.audit.invocations.push({id: evidenceId, stageId: 'review', runId: request.run.id, route: 'direct-provider.repository-review', provider: invocation.providerId, accountProfileId: route.accountProfileId, accountLabel: route.accountLabel, accountPlan: route.accountPlan, model: invocation.modelId, logicalRole: route.requestedRole, registryModelId: route.modelId, providerModel: route.providerModel, qualificationVersion: route.qualificationVersion, node: route.nodeId, workloadNodeId: route.workloadNodeId, providerExecutionNodeId: route.providerExecutionNodeId, credentialNodeId: route.credentialNodeId, profile: request.run.context?.profile ?? 'STANDARD', startedAt, completedAt, elapsedMs: invocation.elapsedMs, freshInputTokens: fresh, cachedInputTokens: cached, outputTokens: invocation.usage.outputTokens, reasoningTokens: null, totalTokens: invocation.usage.totalTokens, providerReportedCost: provider, calculatedCost: calculated, costBasis, currency: invocation.usage.currency, verifierResult: 'pending-repository-validation', outcome: invocation.finishReason ?? 'provider-completed'});
    parcel.audit.timeline.push({id: `audit-${randomUUID()}`, at: completedAt, type: 'invocation.completed', stageId: 'review', summary: `${routeLabel(route)} returned structured review output`, detail: `Response ${evidenceId}; finish ${invocation.finishReason ?? 'unreported'}`});
    parcel.audit.totals = {models: [...new Set([...prior.models, auditModelLabel(route)])], invocations: prior.invocations + 1, freshInputTokens: mergeAmount(prior.freshInputTokens, fresh, first), cachedInputTokens: mergeAmount(prior.cachedInputTokens, cached, first), outputTokens: mergeAmount(prior.outputTokens, invocation.usage.outputTokens, first), reasoningTokens: null, totalTokens: mergeAmount(prior.totalTokens, invocation.usage.totalTokens, first), providerReportedCost: nextProviderCost, calculatedCost: nextCalculatedCost, cost: aggregateCost, costBasis: aggregateCostBasis, currency, modelExecutionMs: prior.modelExecutionMs + invocation.elapsedMs, wallClockMs: Math.max(0, Date.parse(completedAt) - Date.parse(parcel.createdAt))};
    parcel.telemetry = {freshInputTokens: parcel.audit.totals.freshInputTokens, cachedInputTokens: parcel.audit.totals.cachedInputTokens, outputTokens: parcel.audit.totals.outputTokens, reasoningTokens: parcel.audit.totals.reasoningTokens, totalTokens: parcel.audit.totals.totalTokens, cost: parcel.audit.totals.cost, currency: parcel.audit.totals.currency, elapsedMs: parcel.audit.totals.modelExecutionMs};
    parcel.provenance.push({at: completedAt, type: 'provider-response', detail: evidenceId});
    this.parcels.update(parcel);
  }

  private finishParcel(parcel: WorkParcel, status: 'SUCCEEDED' | 'FAILED', detail: string) {
    const at = new Date().toISOString();
    parcel.status = status;
    parcel.endedAt = at;
    parcel.stages[0].status = status;
    parcel.stages[0].endedAt = at;
    if (status === 'FAILED') parcel.stages[0].error = detail;
    parcel.provenance.push({at, type: status === 'SUCCEEDED' ? 'provider-completed' : 'failed', detail});
    this.parcels.update(parcel);
  }
}

function actorId(route: ModelRouteDecision) { return `agent:${route.providerId}:${route.accountProfileId ?? 'default'}:${route.modelId}:${route.nodeId}`; }
function agentId(route: ModelRouteDecision) { return `model:${route.accountProfileId ?? 'default'}:${route.modelId}:${route.nodeId}`; }
function routeLabel(route: {providerId: string; accountProfileId?: string | null; accountLabel?: string | null; modelId: string; nodeId?: string}) { return `${route.providerId}/${route.accountLabel ?? route.accountProfileId ?? 'default'}/${route.modelId}@${route.nodeId ?? 'controller'}`; }
function auditModelLabel(route: {providerId: string; accountProfileId?: string | null; accountLabel?: string | null; modelId: string}) { return route.accountProfileId ? routeLabel(route) : route.modelId; }
function requiredAccount(account?: ProviderAccountProfileConfig) { if (!account) throw new Error('codex_account_profile_required'); return account; }
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
function mergeAmount(previous: number | null, next: number | null, first: boolean) { return first ? next : previous === null || next === null ? null : previous + next; }
function effectiveCost(providerComplete: boolean, provider: number, calculatedComplete: boolean, calculated: number) { return Math.max(providerComplete ? provider : 0, calculatedComplete ? calculated : 0); }
function estimateCost(model: ModelRegistryRow, source: ModelInvocationResult) {
  if (!model.pricing || source.usage.inputTokens === null || source.usage.outputTokens === null) return null;
  const cached = source.usage.cachedInputTokens ?? 0;
  return ((source.usage.inputTokens - cached) * model.pricing.inputPerMillionTokens + cached * (model.pricing.cachedInputPerMillionTokens ?? model.pricing.inputPerMillionTokens) + source.usage.outputTokens * model.pricing.outputPerMillionTokens) / 1_000_000;
}
function usage(totals: ExecutionTotals) {
  if (!totals.accountedInvocations) return {source: 'unavailable' as const};
  const cost = effectiveCost(totals.completeProviderCost, totals.providerReportedCost, totals.completeCalculatedCost, totals.calculatedCost);
  const source = totals.completeProviderCost && (!totals.completeCalculatedCost || totals.providerReportedCost >= totals.calculatedCost) ? 'provider' as const : totals.completeCalculatedCost ? 'calculated' as const : 'unavailable' as const;
  return {...(totals.completeTokens ? {inputTokens: totals.inputTokens, outputTokens: totals.outputTokens, totalTokens: totals.totalTokens} : {}), ...(totals.completeProviderCost ? {providerReportedCost: totals.providerReportedCost} : {}), ...(totals.completeCalculatedCost ? {calculatedCost: totals.calculatedCost} : {}), ...(source === 'unavailable' ? {} : {cost}), currency: totals.currency, source};
}

export const REPOSITORY_REVIEW_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    // Keep provider-side structured output and application validation aligned.
    // A structural-only schema previously allowed values that the application
    // then rejected without identifying the mismatched field.
    schema: {type: 'string', enum: ['agent-control.repository-review/v1']}, executiveSummary: {type: 'string', minLength: 1},
    findings: {type: 'array', items: {type: 'object', additionalProperties: false, properties: {id: {type: 'string', minLength: 1}, severity: {type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info']}, title: {type: 'string', minLength: 1}, category: {type: 'string', enum: ['correctness', 'reliability', 'security', 'maintainability', 'other']}, file: {type: ['string', 'null']}, startLine: {type: ['integer', 'null'], minimum: 1}, endLine: {type: ['integer', 'null'], minimum: 1}, evidence: {type: 'string', minLength: 1}, reasoning: {type: 'string', minLength: 1}, impact: {type: 'string', minLength: 1}, suggestedRemediation: {type: 'string', minLength: 1}, confidence: {type: 'number', minimum: 0, maximum: 1}, validation: {type: 'object', additionalProperties: false, properties: {state: {type: 'string', enum: ['VALID', 'REJECTED', 'UNVERIFIED']}, reasons: {type: 'array', items: {type: 'string'}}}, required: ['state', 'reasons']}}, required: ['id', 'severity', 'title', 'category', 'file', 'startLine', 'endLine', 'evidence', 'reasoning', 'impact', 'suggestedRemediation', 'confidence', 'validation']}},
    positiveObservations: {type: 'array', items: {type: 'string'}}, areasReviewed: {type: 'array', items: {type: 'string'}}, areasNotReviewed: {type: 'array', items: {type: 'string'}}, verdict: {type: 'string', enum: ['PASS', 'PASS_WITH_FINDINGS', 'REVIEW_REQUIRED', 'FAILED']},
  }, required: ['schema', 'executiveSummary', 'findings', 'positiveObservations', 'areasReviewed', 'areasNotReviewed', 'verdict'],
};

export function parseRepositoryReviewResponse(output: string): RepositoryReviewResult {
  let text = output.trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('repository_review_provider_json_invalid'); }
  const normalized = normalizeNullableLocations(value);
  const issues = repositoryReviewSchemaIssues(normalized);
  if (issues.length) throw new Error(`repository_review_provider_schema_invalid:${issues.slice(0, 8).join(',')}`);
  return normalized as RepositoryReviewResult;
}
function normalizeNullableLocations(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.findings)) return value;
  return {...value, findings: value.findings.map(finding => {
    if (!record(finding)) return finding;
    const normalized = {...finding};
    for (const key of ['file', 'startLine', 'endLine']) if (normalized[key] === null) delete normalized[key];
    return normalized;
  })};
}
export function repositoryReviewSchemaIssues(value: unknown): string[] {
  const issues: string[] = [];
  if (!record(value)) return ['$:object_required'];
  if (value.schema !== 'agent-control.repository-review/v1') issues.push('$.schema:literal');
  if (!nonempty(value.executiveSummary)) issues.push('$.executiveSummary:nonempty_string');
  for (const field of ['positiveObservations', 'areasReviewed', 'areasNotReviewed'] as const) if (!arrayOfStrings(value[field])) issues.push(`$.${field}:string_array`);
  if (!['PASS', 'PASS_WITH_FINDINGS', 'REVIEW_REQUIRED', 'FAILED'].includes(String(value.verdict))) issues.push('$.verdict:enum');
  if (!Array.isArray(value.findings)) issues.push('$.findings:array');
  else value.findings.forEach((finding, index) => {
    const root = `$.findings[${index}]`;
    if (!record(finding)) { issues.push(`${root}:object`); return; }
    if (!nonempty(finding.id)) issues.push(`${root}.id:nonempty_string`);
    if (!['critical', 'high', 'medium', 'low', 'info'].includes(String(finding.severity))) issues.push(`${root}.severity:enum`);
    if (!nonempty(finding.title)) issues.push(`${root}.title:nonempty_string`);
    if (!['correctness', 'reliability', 'security', 'maintainability', 'other'].includes(String(finding.category))) issues.push(`${root}.category:enum`);
    for (const field of ['evidence', 'reasoning', 'impact', 'suggestedRemediation'] as const) if (!nonempty(finding[field])) issues.push(`${root}.${field}:nonempty_string`);
    if (typeof finding.confidence !== 'number' || !Number.isFinite(finding.confidence) || finding.confidence < 0 || finding.confidence > 1) issues.push(`${root}.confidence:range_0_1`);
    if (finding.file !== undefined && !nonempty(finding.file)) issues.push(`${root}.file:nonempty_string_or_null`);
    if (finding.startLine !== undefined && !positiveInteger(finding.startLine)) issues.push(`${root}.startLine:positive_integer_or_null`);
    if (finding.endLine !== undefined && !positiveInteger(finding.endLine)) issues.push(`${root}.endLine:positive_integer_or_null`);
    if (finding.endLine !== undefined && finding.startLine === undefined) issues.push(`${root}.endLine:startLine_required`);
    if (positiveInteger(finding.endLine) && positiveInteger(finding.startLine) && finding.endLine < finding.startLine) issues.push(`${root}.endLine:not_before_startLine`);
    if (!record(finding.validation)) issues.push(`${root}.validation:object`);
    else {
      if (!['VALID', 'REJECTED', 'UNVERIFIED'].includes(String(finding.validation.state))) issues.push(`${root}.validation.state:enum`);
      if (!arrayOfStrings(finding.validation.reasons)) issues.push(`${root}.validation.reasons:string_array`);
    }
  });
  return issues;
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()); }
function positiveInteger(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
function arrayOfStrings(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }
function extractIdentifiers(value: string) { return [...new Set(value.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) ?? [])].slice(0, 12); }
function retrievalIdentifiers(value:string){return extractIdentifiers(value).filter(item=>item.includes('_')||/[a-z][A-Z]/.test(item)||/^[A-Z0-9_]{3,}$/.test(item));}
function retrievalQuery(instruction:string,files:string[]){const identifiers=retrievalIdentifiers(instruction);return [`Assigned repository paths: ${files.join(' ')}`,...(identifiers.length?[`Code identifiers: ${identifiers.join(' ')}`]:[])].join('\n');}
function consolidate(results: RepositoryReviewResult[]): RepositoryReviewResult { const findings = results.flatMap(result => result.findings ?? []), verdict = results.some(result => result.verdict === 'FAILED') ? 'FAILED' : results.some(result => result.verdict === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : findings.length ? 'PASS_WITH_FINDINGS' : 'PASS'; return {schema: 'agent-control.repository-review/v1', executiveSummary: results.map(result => result.executiveSummary).filter(Boolean).join('\n\n'), findings, positiveObservations: [...new Set(results.flatMap(result => result.positiveObservations ?? []))], areasReviewed: [...new Set(results.flatMap(result => result.areasReviewed ?? []))], areasNotReviewed: [...new Set(results.flatMap(result => result.areasNotReviewed ?? []))], verdict}; }
