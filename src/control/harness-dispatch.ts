import fs from 'node:fs';
import path from 'node:path';
import {
  AdaptiveHarness,
  type ExecutionRecipe,
  type HarnessCandidate,
  type LiveToolAuthorization,
  type RecipeRequest,
  type ToolPolicy,
} from './adaptive-harness.js';
import type {Resource} from './capabilities.js';
import type {WorkContextView, WorkDispatch, WorkExecutionResult} from './work-executor.js';
import type {WorkItem} from './work-queue.js';
import type {ActionContext, ActionOutput, AgentActionHandler} from './job-types.js';
import {
  createInvocationObservation,
  createInvocationStart,
  DEFAULT_HARNESS_PROFILES,
  type ContextPacketSource,
  type HarnessEfficiencyLedgerPort,
  type ModelInvocationObservation,
} from './harness-efficiency.js';

export interface RecipeExecutionResult {
  resultRef?: string;
  confidence?: number;
  error?: string;
  retryable?: boolean;
  fingerprint?: string;
  evidence?: string[];
  invocations?: ModelInvocationObservation[];
}

export interface RawToolHandler {
  (input: unknown, recipe: ExecutionRecipe): Promise<unknown>;
}

export interface ToolHandlerBinding {
  toolId: string;
  handler: RawToolHandler;
}

export interface ToolResultInterceptorContext {
  toolId: string;
  input: unknown;
  recipe: ExecutionRecipe;
  result: unknown;
}

/** Runs inside the control plane after a raw handler and before its value becomes model-visible. */
export type ToolResultInterceptor = (context: ToolResultInterceptorContext) => unknown | Promise<unknown>;

export interface ToolInvocationGateway {
  invoke(toolId: string, input?: unknown): Promise<unknown>;
}

export interface RecipeExecutor {
  execute(recipe: ExecutionRecipe, tools: ToolInvocationGateway): Promise<RecipeExecutionResult>;
}

export interface ToolPolicyAuditEvent {
  at: string;
  recipeId: string;
  taskId: string;
  toolId: string;
  allowed: boolean;
  reason?: string;
  leaseGeneration: number;
  ownershipGeneration: number;
}

export type ToolPolicyAuditSink = (event: ToolPolicyAuditEvent) => void;

/** Raw handlers are retained by the control plane and are never passed to an agent executor. */
export class ToolHandlerRegistry {
  private readonly handlers = new Map<string, RawToolHandler>();
  private readonly interceptors: ToolResultInterceptor[];

  constructor(interceptors: ToolResultInterceptor[] = []) {
    this.interceptors = [...interceptors];
  }

  use(interceptor: ToolResultInterceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  register(toolId: string, handler: RawToolHandler): this {
    if (this.handlers.has(toolId)) throw new Error(`tool_handler_exists:${toolId}`);
    this.handlers.set(toolId, handler);
    return this;
  }

  async invoke(toolId: string, input: unknown, recipe: ExecutionRecipe): Promise<unknown> {
    const handler = this.handlers.get(toolId);
    if (!handler) throw new Error(`tool_handler_missing:${toolId}`);
    let result = await handler(input, recipe);
    for (const interceptor of this.interceptors) result = await interceptor({toolId, input, recipe, result});
    return result;
  }
}

/** Constructs the raw registry at the central dispatch boundary from typed control-owned bindings. */
export function createToolHandlerRegistry(bindings: readonly ToolHandlerBinding[], interceptors: ToolResultInterceptor[] = []): ToolHandlerRegistry {
  const registry = new ToolHandlerRegistry(interceptors);
  for (const binding of bindings) registry.register(binding.toolId, binding.handler);
  return registry;
}

export type RecipeDispatchPhase = 'BUILT' | 'DISPATCHING' | 'EXECUTED' | 'FAILED';

export interface RecipeDispatchRecord {
  recipeId: string;
  fingerprint: string;
  taskId: string;
  workerPlacement: {workerId: string; reason: string};
  route: {providerId: string; modelId: string; reason: string};
  promptProfile: {id: string; version: string};
  harness: NonNullable<ExecutionRecipe['harness']>;
  context: {tier: number; sourceIds: string[]; evidenceIds: string[]; estimatedTokens: number};
  skillIds: string[];
  toolIds: string[];
  runtime: Record<string, string | number | boolean>;
  authority: {laneId: string; leaseGeneration: number; ownershipGeneration: number; owner: 'agent' | 'human'};
  verification: {requiredEvidence: string[]; requireIndependentCheck: boolean};
  escalation: {minimumConfidence: number; maximumAttempts: number; onFailure: 'review' | 'reroute'};
  phase: RecipeDispatchPhase;
  updatedAt: string;
  detail?: string;
}

export interface RecipeDispatchStore {
  save(record: RecipeDispatchRecord): void;
  get(recipeId: string): RecipeDispatchRecord | undefined;
  list(): RecipeDispatchRecord[];
}

export class MemoryRecipeDispatchStore implements RecipeDispatchStore {
  protected readonly records = new Map<string, RecipeDispatchRecord>();
  save(record: RecipeDispatchRecord): void { this.records.set(record.recipeId, structuredClone(record)); }
  get(recipeId: string): RecipeDispatchRecord | undefined { const value = this.records.get(recipeId); return value ? structuredClone(value) : undefined; }
  list(): RecipeDispatchRecord[] { return [...this.records.values()].map(value => structuredClone(value)); }
}

/** Small durable bridge for recipe identity until the 3.1 Run Ledger absorbs it. */
export class FileRecipeDispatchStore extends MemoryRecipeDispatchStore {
  constructor(private readonly file: string) {
    super();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {schema: string; records: RecipeDispatchRecord[]};
      if (parsed.schema !== 'agent-control.recipe-dispatch/v1') throw new Error('recipe_dispatch_schema_unsupported');
      for (const record of parsed.records) this.records.set(record.recipeId, structuredClone(record));
    }
  }

  override save(record: RecipeDispatchRecord): void {
    super.save(record);
    fs.mkdirSync(path.dirname(this.file), {recursive: true});
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify({schema: 'agent-control.recipe-dispatch/v1', records: this.list()}, null, 2)}\n`, {mode: 0o600});
    fs.renameSync(temporary, this.file);
  }
}

export interface RecipeDispatchPlan {
  request: RecipeRequest;
  candidates: HarnessCandidate[];
  placement: {workerId: string; reason: string};
}

export interface RecipeDispatchResult {
  recipe: ExecutionRecipe;
  execution: RecipeExecutionResult;
  invocationIds: string[];
  /** Execution completed; verification and acceptance remain separate policy transitions. */
  accepted: false;
}

export class HarnessPolicyDeniedError extends Error {
  readonly retryable = false;
  constructor(readonly reasons: string[]) {
    super(`harness_policy_denied:${reasons.join(',') || 'no_eligible_recipe'}`);
  }
}

export interface WorkRecipeFactoryResult {
  plan: RecipeDispatchPlan;
  executor: RecipeExecutor;
}

export interface JobRecipeFactoryResult extends WorkRecipeFactoryResult {
  toActionOutput?: (result: RecipeDispatchResult) => Omit<ActionOutput, 'executionState'>;
}

export type JobRecipeFactory = (context: ActionContext) => JobRecipeFactoryResult | Promise<JobRecipeFactoryResult>;

/** The sole model-backed Job Action bridge: Job policy places work, then the harness builds and dispatches it. */
export class HarnessJobAgentAction implements AgentActionHandler {
  readonly path = 'adaptive-harness' as const;
  constructor(private readonly dispatcher: HarnessDispatcher, private readonly factory: JobRecipeFactory) {}

  async execute(context: ActionContext): Promise<ActionOutput> {
    const prepared = await this.factory(context);
    const plan = {...prepared.plan, request: {...prepared.plan.request, jobId: prepared.plan.request.jobId ?? context.run.jobId, runId: prepared.plan.request.runId ?? context.run.id}};
    if (plan.placement.workerId !== context.worker.id) throw new HarnessPolicyDeniedError(['worker_placement_mismatch']);
    const result = await this.dispatcher.dispatch(plan, prepared.executor);
    const mapped = prepared.toActionOutput?.(result) ?? {
      evidence: result.execution.evidence,
      detail: result.execution.resultRef ?? `recipe ${result.recipe.id} executed`,
    };
    return {...mapped, efficiencyInvocationIds: result.invocationIds, executionState: 'verification-pending'};
  }
}

export type WorkRecipeFactory = (
  work: WorkItem,
  resource: Resource,
  context: WorkContextView,
) => WorkRecipeFactoryResult | Promise<WorkRecipeFactoryResult>;

/** Default WorkExecutor path: placement is already selected, then the harness scaffolds it. */
export class AdaptiveWorkDispatch implements WorkDispatch {
  readonly path = 'adaptive-harness' as const;

  constructor(
    private readonly dispatcher: HarnessDispatcher,
    private readonly factory: WorkRecipeFactory,
  ) {}

  async execute(work: WorkItem, resource: Resource, context: WorkContextView): Promise<WorkExecutionResult> {
    const prepared = await this.factory(work, resource, context);
    if (prepared.plan.placement.workerId !== resource.id) throw new HarnessPolicyDeniedError(['worker_placement_mismatch']);
    const result = await this.dispatcher.dispatch(prepared.plan, prepared.executor);
    return {
      ...result.execution,
      fingerprint: result.execution.fingerprint ?? result.recipe.fingerprint,
      requiresVerification: true,
    };
  }
}

export class HarnessDispatcher {
  constructor(
    private readonly harness: AdaptiveHarness,
    private readonly toolPolicy: ToolPolicy,
    private readonly tools: ToolHandlerRegistry,
    private readonly currentAuthorization: (recipe: ExecutionRecipe) => LiveToolAuthorization,
    private readonly store: RecipeDispatchStore = new MemoryRecipeDispatchStore(),
    private readonly audit: ToolPolicyAuditSink = () => undefined,
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly efficiency?: HarnessEfficiencyLedgerPort,
  ) {}

  async dispatch(plan: RecipeDispatchPlan, executor: RecipeExecutor): Promise<RecipeDispatchResult> {
    const placedCandidates = plan.candidates.filter(candidate => candidate.route.workerId === plan.placement.workerId);
    if (!placedCandidates.length) throw new HarnessPolicyDeniedError(['worker_placement_unavailable']);
    const built = this.harness.build(plan.request, placedCandidates);
    if (!built.recipe) {
      const reasons = [...built.rejected.flatMap(item => item.reasons), ...built.route.assessments.flatMap(item => item.rejectionReasons)];
      throw new HarnessPolicyDeniedError([...new Set(reasons)]);
    }
    const recipe = built.recipe;
    const invocationStartedAt = this.clock();
    const pendingInvocationId = this.startInvocation(recipe, invocationStartedAt);
    const invokedToolIds: string[] = [];
    let record = this.record(recipe, plan.placement, 'BUILT');
    this.store.save(record);
    record = {...record, phase: 'DISPATCHING', updatedAt: this.clock()};
    this.store.save(record);
    const gateway: ToolInvocationGateway = {
      invoke: async (toolId, input) => {
        const live = this.currentAuthorization(recipe);
        const decision = this.toolPolicy.authorize(recipe, toolId, live);
        this.audit({
          at: this.clock(), recipeId: recipe.id, taskId: recipe.taskId, toolId,
          allowed: decision.allowed, reason: decision.reason,
          leaseGeneration: live.authority.leaseGeneration,
          ownershipGeneration: live.authority.ownershipGeneration,
        });
        if (!decision.allowed) throw new Error(`tool_policy_denied:${decision.reason}`);
        invokedToolIds.push(toolId);
        return this.tools.invoke(toolId, input, recipe);
      },
    };
    try {
      const execution = await executor.execute(recipe, gateway);
      const observations = execution.invocations?.length ? execution.invocations : [this.fallbackObservation(recipe, invocationStartedAt, this.clock(), invokedToolIds, execution.error, execution.evidence)];
      const maximumTurns = recipe.harness?.maximumTurns ?? DEFAULT_HARNESS_PROFILES.STANDARD.maximumTurns;
      if (observations.length > maximumTurns) {
        const error = new Error(`harness_turn_budget_exceeded:${observations.length}:${maximumTurns}`);
        Object.assign(error, {efficiencyInvocationIds: this.recordInvocations(observations, pendingInvocationId)});
        throw error;
      }
      const invocationIds = this.recordInvocations(observations, pendingInvocationId);
      this.store.save({...record, phase: execution.error ? 'FAILED' : 'EXECUTED', updatedAt: this.clock(), detail: execution.error});
      return {recipe, execution, invocationIds, accepted: false};
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const retainedInvocationIds = invocationIdsFromError(error);
      const retainedObservations = observationsFromError(error);
      const invocationIds = retainedInvocationIds.length
        ? retainedInvocationIds
        : this.recordInvocations(retainedObservations.length ? retainedObservations : [this.fallbackObservation(recipe, invocationStartedAt, this.clock(), invokedToolIds, detail)], pendingInvocationId);
      if (error && typeof error === 'object') Object.assign(error, {efficiencyInvocationIds: invocationIds});
      this.store.save({...record, phase: 'FAILED', updatedAt: this.clock(), detail});
      throw error;
    }
  }

  private record(recipe: ExecutionRecipe, placement: RecipeDispatchPlan['placement'], phase: RecipeDispatchPhase): RecipeDispatchRecord {
    return {
      recipeId: recipe.id,
      fingerprint: recipe.fingerprint,
      taskId: recipe.taskId,
      workerPlacement: structuredClone(placement),
      route: {providerId: recipe.providerId, modelId: recipe.modelId, reason: recipe.routeReason},
      promptProfile: {id: recipe.promptProfile.id, version: recipe.promptProfile.version},
      harness: structuredClone(recipe.harness ?? {profile: 'STANDARD', recommendedProfile: 'STANDARD', routingMode: 'OBSERVE', evidenceQualified: true, decisionReasons: ['legacy_recipe_standard_default'], contextStrategyId: `tier-${recipe.context.tier}`, maximumTurns: DEFAULT_HARNESS_PROFILES.STANDARD.maximumTurns}),
      context: structuredClone(recipe.context),
      skillIds: recipe.skills.map(skill => skill.id),
      toolIds: recipe.tools.map(tool => tool.id),
      runtime: structuredClone(recipe.runtime),
      authority: structuredClone(recipe.authority),
      verification: structuredClone(recipe.verification),
      escalation: structuredClone(recipe.escalation),
      phase,
      updatedAt: this.clock(),
    };
  }

  private startInvocation(recipe: ExecutionRecipe, startedAt: string) {
    if (!this.efficiency) return undefined;
    return this.efficiency.record(createInvocationStart({
      jobId: recipe.jobId ?? recipe.taskId, runId: recipe.runId, stepId: recipe.taskId.split(':').at(-1), taskId: recipe.taskId, laneId: recipe.authority.laneId,
      model: recipe.modelId, provider: recipe.providerId, harnessProfile: recipe.harness?.profile ?? 'STANDARD', executionStrategy: typeof recipe.runtime.executionStrategy === 'string' ? recipe.runtime.executionStrategy : 'adaptive-harness',
      startedAt, recipeFingerprint: recipe.fingerprint, contextPacketId: recipe.harness?.contextPacketId,
    }));
  }

  private recordInvocations(observations: ModelInvocationObservation[], pendingInvocationId?: string) {
    if (!this.efficiency) return [];
    return observations.map((observation, index) => index === 0 && pendingInvocationId ? this.efficiency!.complete(pendingInvocationId, observation) : this.efficiency!.record(observation));
  }

  private fallbackObservation(recipe: ExecutionRecipe, startedAt: string, completedAt: string, toolIds: string[], error?: string, evidenceIds: string[] = []) {
    const startupSources: ContextPacketSource[] = [
      {id: `${recipe.id}:prompt-profile`, kind: 'system_instructions', content: recipe.promptProfile.description, required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      {id: `${recipe.id}:agent-control`, kind: 'agent_control_instructions', content: 'Agent Control retains scheduling, tool authority, approval and verification.', required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      {id: `${recipe.id}:tools`, kind: 'tool_schemas', content: JSON.stringify(recipe.tools), required: true, persistent: true, relevance: 1, provenanceIds: [recipe.fingerprint]},
      {id: `${recipe.id}:skills`, kind: 'skills', content: JSON.stringify(recipe.skills), persistent: true, relevance: .8, provenanceIds: recipe.skills.flatMap(skill => skill.qualificationEvidence)},
      {id: `${recipe.id}:context`, kind: 'task_context', estimatedTokens: recipe.context.estimatedTokens, required: true, persistent: false, relevance: 1, provenanceIds: recipe.context.provenanceIds ?? recipe.context.evidenceIds},
    ];
    return createInvocationObservation({
      jobId: recipe.jobId ?? recipe.taskId, runId: recipe.runId, stepId: recipe.taskId.split(':').at(-1), taskId: recipe.taskId, laneId: recipe.authority.laneId,
      model: recipe.modelId, provider: recipe.providerId, harnessProfile: recipe.harness?.profile ?? 'STANDARD', executionStrategy: typeof recipe.runtime.executionStrategy === 'string' ? recipe.runtime.executionStrategy : 'adaptive-harness',
      startedAt, completedAt, startupSources, toolIds, contextSourceIds: recipe.context.sourceIds, outcome: error ? 'FAILED' : 'COMPLETE', error,
      recipeFingerprint: recipe.fingerprint, contextPacketId: recipe.harness?.contextPacketId, evidenceIds,
    });
  }
}

function invocationIdsFromError(error: unknown): string[] { const value = error as {efficiencyInvocationIds?: unknown}; return Array.isArray(value?.efficiencyInvocationIds) ? value.efficiencyInvocationIds.filter((item): item is string => typeof item === 'string') : []; }
function observationsFromError(error: unknown): ModelInvocationObservation[] { const value = error as {efficiencyObservations?: unknown}; return Array.isArray(value?.efficiencyObservations) ? value.efficiencyObservations.filter((item): item is ModelInvocationObservation => Boolean(item && typeof item === 'object' && (item as {schema?: unknown}).schema === 'agent-control.model-invocation/v1')) : []; }
