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

export interface RecipeExecutionResult {
  resultRef?: string;
  confidence?: number;
  error?: string;
  retryable?: boolean;
  fingerprint?: string;
  evidence?: string[];
}

export interface RawToolHandler {
  (input: unknown, recipe: ExecutionRecipe): Promise<unknown>;
}

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

  register(toolId: string, handler: RawToolHandler): this {
    if (this.handlers.has(toolId)) throw new Error(`tool_handler_exists:${toolId}`);
    this.handlers.set(toolId, handler);
    return this;
  }

  async invoke(toolId: string, input: unknown, recipe: ExecutionRecipe): Promise<unknown> {
    const handler = this.handlers.get(toolId);
    if (!handler) throw new Error(`tool_handler_missing:${toolId}`);
    return handler(input, recipe);
  }
}

export type RecipeDispatchPhase = 'BUILT' | 'DISPATCHING' | 'EXECUTED' | 'FAILED';

export interface RecipeDispatchRecord {
  recipeId: string;
  fingerprint: string;
  taskId: string;
  workerPlacement: {workerId: string; reason: string};
  route: {providerId: string; modelId: string; reason: string};
  promptProfile: {id: string; version: string};
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
        return this.tools.invoke(toolId, input, recipe);
      },
    };
    try {
      const execution = await executor.execute(recipe, gateway);
      this.store.save({...record, phase: execution.error ? 'FAILED' : 'EXECUTED', updatedAt: this.clock(), detail: execution.error});
      return {recipe, execution, accepted: false};
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
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
}
