import {createHash, randomUUID} from 'node:crypto';
import type {ModelRegistry} from './model-registry.js';
import {OpenAICompatibleProviderClient, type ModelInvocationResult} from './openai-compatible-provider.js';
import type {RepositoryReviewExecutor, RepositoryReviewResult, ReviewExecutionRequest, ReviewExecutionResponse} from './parameterized-job-types.js';
import {WorkParcelStore, type WorkParcel} from './work-parcels.js';

export class DirectRepositoryReviewExecutor implements RepositoryReviewExecutor {
  constructor(private readonly models: ModelRegistry, private readonly parcels: WorkParcelStore) {}
  async execute(request: ReviewExecutionRequest): Promise<ReviewExecutionResponse> {
    const provider = this.models.provider(request.route.providerId), model = this.models.model(request.route.modelId);
    if (!provider || !model) throw new Error('selected_model_configuration_missing');
    const client = new OpenAICompatibleProviderClient(provider), results: RepositoryReviewResult[] = [], parcelIds: string[] = [], responseIds: string[] = [];
    let inputTokens = 0, outputTokens = 0, totalTokens = 0, providerReportedCost = 0, calculatedCost = 0, currency: string | undefined, completeTokens = true, completeProviderCost = true, completeCalculatedCost = true, accountedInvocations = 0;
    for (const chunk of request.contextChunks) {
      const parcel = this.createParcel(request, chunk.id); parcelIds.push(parcel.id);
      try {
        const prompt = `${request.instruction}\n\nFrozen repository: ${request.run.repository?.name}\nRequested ref: ${request.run.repository?.requestedRef}\nReviewed SHA: ${request.run.repository?.reviewedSha}\nComparison SHA: ${request.run.repository?.comparisonSha ?? 'none'}\nContext chunk: ${chunk.id}\nFiles: ${chunk.files.join(', ')}\n\n${chunk.content}`;
        const invocation = await client.invoke(model, prompt, {structured: true, outputSchema: REPOSITORY_REVIEW_OUTPUT_SCHEMA, maximumOutputTokens: request.maximumOutputTokens, timeoutMs: request.run.definition.budgets.timeoutMinutes * 60_000, signal: request.signal});
        accountedInvocations++;
        responseIds.push(`sha256:${createHash('sha256').update(invocation.output).digest('hex')}`);
        if ([invocation.usage.inputTokens, invocation.usage.outputTokens, invocation.usage.totalTokens].some(value => value === null)) completeTokens = false;
        inputTokens += invocation.usage.inputTokens ?? 0; outputTokens += invocation.usage.outputTokens ?? 0; totalTokens += invocation.usage.totalTokens ?? 0;
        if (invocation.usage.providerReportedCost === null) completeProviderCost = false; else providerReportedCost += invocation.usage.providerReportedCost;
        if (invocation.usage.calculatedCost === null) completeCalculatedCost = false; else calculatedCost += invocation.usage.calculatedCost;
        this.recordInvocation(parcel,invocation,request,responseIds.at(-1)!);
        if (invocation.finishReason && !['stop','completed'].includes(invocation.finishReason)) throw new Error(`repository_review_provider_incomplete:${invocation.finishReason}`);
        currency ??= invocation.usage.currency ?? undefined; results.push(parseRepositoryReviewResponse(invocation.output)); this.finishParcel(parcel, 'SUCCEEDED', `Provider ${invocation.providerId}; model ${invocation.modelId}; structured review returned`);
        if (request.maximumCost !== undefined && effectiveCost(completeProviderCost,providerReportedCost,completeCalculatedCost,calculatedCost) > request.maximumCost) throw new Error('job_cost_budget_exceeded');
      } catch (error) { this.finishParcel(parcel, 'FAILED', error instanceof Error ? error.message : String(error)); throw Object.assign(error instanceof Error ? error : new Error(String(error)), {workParcelIds: [...parcelIds], evidence: responseIds.map(id => `provider_response_${id}`), providerResponseIds: [...responseIds], usage: usage(accountedInvocations,completeTokens,completeProviderCost,completeCalculatedCost,inputTokens,outputTokens,totalTokens,providerReportedCost,calculatedCost,currency)}); }
    }
    return {result: consolidate(results), usage: usage(accountedInvocations,completeTokens,completeProviderCost,completeCalculatedCost,inputTokens,outputTokens,totalTokens,providerReportedCost,calculatedCost,currency), evidence: responseIds.map(id => `provider_response_${id}`), providerResponseIds: responseIds, workParcelIds: parcelIds};
  }
  private createParcel(request: ReviewExecutionRequest, chunkId: string) {
    const at = new Date().toISOString(), id = `parcel-${randomUUID()}`, parcel: WorkParcel = {id, prompt: `Repository review ${request.run.id} ${chunkId}`, objective: `Review frozen ${request.run.repository?.reviewedSha} context chunk ${chunkId}`, actor: `parameterized-job:${request.run.id}`, status: 'RUNNING', planner: {kind: 'deterministic', reason: 'Repository Job deterministically decomposed frozen context'}, stages: [{id: 'review', name: `Review ${chunkId}`, job: `repository-code-review@${request.run.definition.version}`, dependsOn: [], parameters: {jobRunId: request.run.id, contextChunkId: chunkId}, status: 'RUNNING', requestedRoute: {model: request.route.modelId, modelRole: request.route.requestedRole ?? undefined, allowFallback: !request.route.fallback, profile: request.run.context?.profile, reason: 'Route frozen by parameterized Job resolution'}, actualRoute: {workers: [request.route.nodeId], provider: request.route.providerId, model: request.route.modelId, profile: request.run.context?.profile, reason: `Qualification ${request.route.qualificationVersion}`}, startedAt: at}], createdAt: at, updatedAt: at, telemetry: {freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, cost: null, currency: null, elapsedMs: 0}, audit: {schema: 'agent-control.work-parcel-audit/v1', recordedAt: at, classification: 'Frozen repository context review', selectedExecution: 'Work Parcel', planningRationale: 'Deterministic decomposition owned by repository-code-review definition', planner: {kind: 'deterministic', provider: null, model: null}, alternatives: [], timeline: [{id: `audit-${randomUUID()}`, at, type: 'task.received', summary: 'Frozen review chunk received', detail: chunkId}, {id: `audit-${randomUUID()}`, at, type: 'route.resolved', stageId: 'review', summary: `${request.route.providerId}/${request.route.modelId}`, detail: `Qualification ${request.route.qualificationVersion}; fallback ${request.route.fallback}`}], invocations: [], totals: {models: [request.route.modelId], invocations: 0, freshInputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null, totalTokens: null, providerReportedCost: null, calculatedCost: null, cost: null, costBasis: 'unavailable', currency: null, modelExecutionMs: 0, wallClockMs: 0}}, provenance: [{at, type: 'job-run', detail: request.run.id}, {at, type: 'reviewed-sha', detail: request.run.repository?.reviewedSha ?? 'unresolved'}]}; return this.parcels.add(parcel);
  }
  private recordInvocation(parcel: WorkParcel, invocation: ModelInvocationResult, request: ReviewExecutionRequest, evidenceId: string) {
    const completedAt=new Date().toISOString(),startedAt=new Date(Date.parse(completedAt)-invocation.elapsedMs).toISOString(),provider=invocation.usage.providerReportedCost,calculated=invocation.usage.calculatedCost,cost=effectiveCost(provider!==null,provider??0,calculated!==null,calculated??0),costBasis=provider!==null&&(!(calculated!==null)||provider>=calculated)?'provider-reported' as const:calculated!==null?'calculated' as const:'unavailable' as const,cached=invocation.usage.cachedInputTokens,fresh=invocation.usage.inputTokens===null?null:Math.max(0,invocation.usage.inputTokens-(cached??0));
    parcel.telemetry={freshInputTokens:fresh,cachedInputTokens:cached,outputTokens:invocation.usage.outputTokens,reasoningTokens:null,totalTokens:invocation.usage.totalTokens,cost:costBasis==='unavailable'?null:cost,currency:invocation.usage.currency,elapsedMs:invocation.elapsedMs};
    parcel.audit.invocations.push({id:evidenceId,stageId:'review',runId:request.run.id,route:'direct-provider.repository-review',provider:invocation.providerId,model:invocation.modelId,logicalRole:request.route.requestedRole,registryModelId:request.route.modelId,providerModel:request.route.providerModel,qualificationVersion:request.route.qualificationVersion,node:request.route.nodeId,profile:request.run.context?.profile??'STANDARD',startedAt,completedAt,elapsedMs:invocation.elapsedMs,freshInputTokens:fresh,cachedInputTokens:cached,outputTokens:invocation.usage.outputTokens,reasoningTokens:null,totalTokens:invocation.usage.totalTokens,providerReportedCost:provider,calculatedCost:calculated,costBasis,currency:invocation.usage.currency,verifierResult:'pending-repository-validation',outcome:invocation.finishReason??'provider-completed'});
    parcel.audit.timeline.push({id:`audit-${randomUUID()}`,at:completedAt,type:'invocation.completed',stageId:'review',summary:`${invocation.providerId}/${invocation.modelId} returned structured review output`,detail:`Response ${evidenceId}; finish ${invocation.finishReason??'unreported'}`});
    parcel.audit.totals={models:[invocation.modelId],invocations:1,freshInputTokens:fresh,cachedInputTokens:cached,outputTokens:invocation.usage.outputTokens,reasoningTokens:null,totalTokens:invocation.usage.totalTokens,providerReportedCost:provider,calculatedCost:calculated,cost:costBasis==='unavailable'?null:cost,costBasis,currency:invocation.usage.currency,modelExecutionMs:invocation.elapsedMs,wallClockMs:Math.max(0,Date.parse(completedAt)-Date.parse(parcel.createdAt))};
    parcel.provenance.push({at:completedAt,type:'provider-response',detail:evidenceId});this.parcels.update(parcel);
  }
  private finishParcel(parcel: WorkParcel, status: 'SUCCEEDED' | 'FAILED', detail: string) { const at = new Date().toISOString(); parcel.status = status; parcel.endedAt = at; parcel.stages[0].status = status; parcel.stages[0].endedAt = at; if (status === 'FAILED') parcel.stages[0].error = detail; parcel.provenance.push({at, type: status === 'SUCCEEDED' ? 'verified' : 'failed', detail}); this.parcels.update(parcel); }
}

function effectiveCost(providerComplete: boolean,provider: number,calculatedComplete: boolean,calculated: number) { return Math.max(providerComplete ? provider : 0, calculatedComplete ? calculated : 0); }
function usage(invocations: number,tokensComplete: boolean,providerComplete: boolean,calculatedComplete: boolean,inputTokens: number,outputTokens: number,totalTokens: number,providerReportedCost: number,calculatedCost: number,currency?: string) {
  if (!invocations) return {source: 'unavailable' as const};
  const cost = effectiveCost(providerComplete,providerReportedCost,calculatedComplete,calculatedCost), source = providerComplete && (!calculatedComplete || providerReportedCost >= calculatedCost) ? 'provider' as const : calculatedComplete ? 'calculated' as const : 'unavailable' as const;
  return {...(tokensComplete ? {inputTokens,outputTokens,totalTokens} : {}),...(providerComplete ? {providerReportedCost} : {}),...(calculatedComplete ? {calculatedCost} : {}),...(source === 'unavailable' ? {} : {cost}),currency,source};
}

export const REPOSITORY_REVIEW_OUTPUT_SCHEMA: Record<string, unknown> = {
  type:'object',additionalProperties:false,
  properties:{
    schema:{type:'string',const:'agent-control.repository-review/v1'},executiveSummary:{type:'string'},
    findings:{type:'array',items:{type:'object',additionalProperties:false,properties:{id:{type:'string'},severity:{type:'string',enum:['critical','high','medium','low','info']},title:{type:'string'},category:{type:'string',enum:['correctness','reliability','security','maintainability','other']},file:{type:'string'},startLine:{type:'integer',minimum:1},endLine:{type:'integer',minimum:1},evidence:{type:'string'},reasoning:{type:'string'},impact:{type:'string'},suggestedRemediation:{type:'string'},confidence:{type:'number',minimum:0,maximum:1},validation:{type:'object',additionalProperties:false,properties:{state:{type:'string',const:'UNVERIFIED'},reasons:{type:'array',items:{type:'string'}}},required:['state','reasons']}},required:['id','severity','title','category','evidence','reasoning','impact','suggestedRemediation','confidence','validation']}},
    positiveObservations:{type:'array',items:{type:'string'}},areasReviewed:{type:'array',items:{type:'string'}},areasNotReviewed:{type:'array',items:{type:'string'}},verdict:{type:'string',enum:['PASS','PASS_WITH_FINDINGS','REVIEW_REQUIRED','FAILED']}
  },required:['schema','executiveSummary','findings','positiveObservations','areasReviewed','areasNotReviewed','verdict']
};

export function parseRepositoryReviewResponse(output: string): RepositoryReviewResult {
  let text = output.trim(); if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let value: unknown; try { value = JSON.parse(text); } catch { throw new Error('repository_review_provider_json_invalid'); }
  if (!isReview(value)) throw new Error('repository_review_provider_schema_invalid');
  return value;
}
function isReview(value: unknown): value is RepositoryReviewResult {
  if (!record(value) || value.schema !== 'agent-control.repository-review/v1' || !nonempty(value.executiveSummary) || !arrayOfStrings(value.positiveObservations) || !arrayOfStrings(value.areasReviewed) || !arrayOfStrings(value.areasNotReviewed) || !['PASS','PASS_WITH_FINDINGS','REVIEW_REQUIRED','FAILED'].includes(String(value.verdict)) || !Array.isArray(value.findings)) return false;
  return value.findings.every(finding => record(finding)
    && nonempty(finding.id) && ['critical','high','medium','low','info'].includes(String(finding.severity))
    && nonempty(finding.title) && ['correctness','reliability','security','maintainability','other'].includes(String(finding.category)) && nonempty(finding.evidence) && nonempty(finding.reasoning)
    && nonempty(finding.impact) && nonempty(finding.suggestedRemediation) && typeof finding.confidence === 'number'
    && Number.isFinite(finding.confidence) && finding.confidence >= 0 && finding.confidence <= 1
    && (finding.file === undefined || nonempty(finding.file))
    && (finding.startLine === undefined || positiveInteger(finding.startLine))
    && (finding.endLine === undefined || positiveInteger(finding.endLine))
    && (finding.endLine === undefined || finding.startLine !== undefined)
    && (finding.endLine === undefined || Number(finding.endLine) >= Number(finding.startLine))
    && record(finding.validation) && ['VALID','REJECTED','UNVERIFIED'].includes(String(finding.validation.state))
    && arrayOfStrings(finding.validation.reasons));
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()); }
function positiveInteger(value: unknown): value is number { return Number.isInteger(value) && Number(value) > 0; }
function arrayOfStrings(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }
function consolidate(results: RepositoryReviewResult[]): RepositoryReviewResult { const findings = results.flatMap(result => result.findings ?? []), verdict = results.some(result => result.verdict === 'FAILED') ? 'FAILED' : results.some(result => result.verdict === 'REVIEW_REQUIRED') ? 'REVIEW_REQUIRED' : findings.length ? 'PASS_WITH_FINDINGS' : 'PASS'; return {schema: 'agent-control.repository-review/v1', executiveSummary: results.map(result => result.executiveSummary).filter(Boolean).join('\n\n'), findings, positiveObservations: [...new Set(results.flatMap(result => result.positiveObservations ?? []))], areasReviewed: [...new Set(results.flatMap(result => result.areasReviewed ?? []))], areasNotReviewed: [...new Set(results.flatMap(result => result.areasNotReviewed ?? []))], verdict}; }
