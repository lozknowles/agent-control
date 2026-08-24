import {createHash} from 'node:crypto';
import type {ContextTier} from './context.js';
import {EconomicRouter, type ExecutionIntent, type RouteCandidate, type RouteDecision} from './economic-routing.js';
import type {ExecutionAuthority} from './execution-provider.js';

export type SkillStatus = 'proposed' | 'qualified' | 'revoked';
export type ToolRisk = 'read' | 'write' | 'privileged' | 'destructive';

export interface SkillDefinition {
  id: string;
  version: string;
  status: SkillStatus;
  capabilities: string[];
  requiredTools: string[];
  qualificationEvidence: string[];
}

export interface ToolDefinition {
  id: string;
  risk: ToolRisk;
  capabilities: string[];
}

export interface PromptProfile {
  id: string;
  version: string;
  description: string;
}

export interface HarnessCandidate {
  route: RouteCandidate;
  workerCapabilities: string[];
  modelCapabilities: string[];
  promptProfiles: PromptProfile[];
  availableSkillIds: string[];
  availableToolIds: string[];
  runtime: Record<string, string | number | boolean>;
}

export interface VerificationPolicy {
  requiredEvidence: string[];
  requireIndependentCheck: boolean;
}

export interface EscalationPolicy {
  minimumConfidence: number;
  maximumAttempts: number;
  onFailure: 'review' | 'reroute';
}

export interface ContextStrategy {
  tier: ContextTier;
  sourceIds: string[];
  evidenceIds: string[];
  estimatedTokens: number;
}

export interface ExecutionRecipe {
  id: string;
  taskId: string;
  workerId: string;
  providerId: string;
  modelId: string;
  promptProfile: PromptProfile;
  context: ContextStrategy;
  skills: SkillDefinition[];
  tools: ToolDefinition[];
  runtime: Record<string, string | number | boolean>;
  authority: ExecutionAuthority;
  resourceLimits: {maximumLatencyMs?: number; maximumMonetarySpend?: number};
  verification: VerificationPolicy;
  escalation: EscalationPolicy;
  routeReason: string;
  fingerprint: string;
}

export interface RecipeRequest {
  taskId: string;
  taskType: string;
  requiredCapabilities: string[];
  requiredTools: string[];
  deniedTools?: string[];
  approvedRisks?: ToolRisk[];
  preferredPromptProfile?: string;
  intent: ExecutionIntent;
  inputTokens: number;
  outputTokens: number;
  maximumLatencyMs?: number;
  maximumMonetarySpend?: number;
  meteredApproved?: boolean;
  context: ContextStrategy;
  authority: ExecutionAuthority;
  verification: VerificationPolicy;
  escalation: EscalationPolicy;
}

export interface RecipeBuildResult {
  recipe?: ExecutionRecipe;
  route: RouteDecision;
  rejected: Array<{candidateId: string; reasons: string[]}>;
}

export class SkillCatalog {
  private readonly skills = new Map<string, SkillDefinition>();

  constructor(skills: SkillDefinition[] = []) { for (const skill of skills) this.skills.set(skill.id, structuredClone(skill)); }
  get(id: string) { const skill = this.skills.get(id); return skill ? structuredClone(skill) : undefined; }

  select(requiredCapabilities: string[], alreadyProvided: string[], availableIds: string[]) {
    const missing = new Set(requiredCapabilities.filter(capability => !alreadyProvided.includes(capability)));
    const selected: SkillDefinition[] = [], available = availableIds
      .map(id => this.skills.get(id))
      .filter((skill): skill is SkillDefinition => skill !== undefined)
      .filter(skill => skill.status === 'qualified' && skill.qualificationEvidence.length > 0);
    while (missing.size) {
      const best = available
        .filter(skill => !selected.some(item => item.id === skill.id))
        .map(skill => ({skill, coverage: skill.capabilities.filter(capability => missing.has(capability)).length}))
        .sort((left, right) => right.coverage - left.coverage || left.skill.id.localeCompare(right.skill.id))[0];
      if (!best || best.coverage === 0) break;
      selected.push(structuredClone(best.skill));
      for (const capability of best.skill.capabilities) missing.delete(capability);
    }
    return {selected, missing: [...missing]};
  }
}

export class ToolPolicy {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(tools: ToolDefinition[] = []) { for (const tool of tools) this.tools.set(tool.id, structuredClone(tool)); }

  grant(requiredIds: string[], candidateToolIds: string[], deniedIds: string[] = [], approvedRisks: ToolRisk[] = ['read']) {
    const denied = new Set(deniedIds), available = new Set(candidateToolIds), approved = new Set<ToolRisk>(approvedRisks);
    const granted: ToolDefinition[] = [], reasons: string[] = [];
    for (const id of [...new Set(requiredIds)]) {
      const tool = this.tools.get(id);
      if (!tool) { reasons.push(`unknown_tool:${id}`); continue; }
      if (denied.has(id)) { reasons.push(`tool_denied:${id}`); continue; }
      if (!available.has(id)) { reasons.push(`tool_unavailable:${id}`); continue; }
      if (!approved.has(tool.risk)) { reasons.push(`risk_not_approved:${id}:${tool.risk}`); continue; }
      granted.push(structuredClone(tool));
    }
    return {granted, reasons};
  }

  authorize(recipe: ExecutionRecipe, toolId: string, authority: ExecutionAuthority) {
    if (recipe.authority.owner !== 'agent') return {allowed: false, reason: 'recipe_not_agent_owned'};
    if (authority.laneId !== recipe.authority.laneId) return {allowed: false, reason: 'lane_identity_mismatch'};
    if (authority.leaseGeneration !== recipe.authority.leaseGeneration) return {allowed: false, reason: 'stale_lease_generation'};
    if (authority.ownershipGeneration !== recipe.authority.ownershipGeneration) return {allowed: false, reason: 'stale_ownership_generation'};
    if (authority.owner !== 'agent') return {allowed: false, reason: 'human_owns_execution'};
    if (!recipe.tools.some(tool => tool.id === toolId)) return {allowed: false, reason: 'tool_not_granted'};
    return {allowed: true};
  }
}

interface Composition {
  candidate: HarnessCandidate;
  prompt?: PromptProfile;
  skills: SkillDefinition[];
  tools: ToolDefinition[];
  reasons: string[];
}

export class AdaptiveHarness {
  constructor(
    readonly skillCatalog: SkillCatalog,
    readonly toolPolicy: ToolPolicy,
    readonly router = new EconomicRouter(),
  ) {}

  build(request: RecipeRequest, candidates: HarnessCandidate[]): RecipeBuildResult {
    const compositions = candidates.map(candidate => this.compose(request, candidate));
    const routeCandidates = compositions.map(composition => ({
      ...composition.candidate.route,
      capabilities: [...new Set([
        ...composition.candidate.route.capabilities,
        ...composition.candidate.workerCapabilities,
        ...composition.candidate.modelCapabilities,
        ...composition.skills.flatMap(skill => skill.capabilities),
      ])],
      qualified: composition.candidate.route.qualified && composition.reasons.length === 0,
      qualificationReason: composition.reasons.length ? composition.reasons.join('|') : composition.candidate.route.qualificationReason,
    }));
    const route = this.router.route({
      taskId: request.taskId,
      taskType: request.taskType,
      intent: request.intent,
      requiredCapabilities: request.requiredCapabilities,
      inputTokens: request.inputTokens,
      outputTokens: request.outputTokens,
      maximumLatencyMs: request.maximumLatencyMs,
      maximumMonetarySpend: request.maximumMonetarySpend,
      minimumConfidence: request.escalation.minimumConfidence,
      meteredApproved: request.meteredApproved,
    }, routeCandidates);
    const rejected = compositions.filter(composition => composition.reasons.length).map(composition => ({candidateId: composition.candidate.route.id, reasons: composition.reasons}));
    if (!route.selected) return {route, rejected};
    const composition = compositions.find(item => item.candidate.route.id === route.selected?.candidate.id)!;
    const draft = {
      taskId: request.taskId,
      workerId: composition.candidate.route.workerId,
      providerId: composition.candidate.route.providerId,
      modelId: composition.candidate.route.modelId,
      promptProfile: composition.prompt!,
      context: structuredClone(request.context),
      skills: composition.skills,
      tools: composition.tools,
      runtime: structuredClone(composition.candidate.runtime),
      authority: structuredClone(request.authority),
      resourceLimits: {maximumLatencyMs: request.maximumLatencyMs, maximumMonetarySpend: request.maximumMonetarySpend},
      verification: structuredClone(request.verification),
      escalation: structuredClone(request.escalation),
      routeReason: route.reason,
    };
    const fingerprint = createHash('sha256').update(stableJson(draft)).digest('hex');
    return {recipe: {...draft, id: `recipe-${fingerprint.slice(0, 16)}`, fingerprint}, route, rejected};
  }

  private compose(request: RecipeRequest, candidate: HarnessCandidate): Composition {
    const prompt = request.preferredPromptProfile
      ? candidate.promptProfiles.find(profile => profile.id === request.preferredPromptProfile)
      : candidate.promptProfiles[0];
    const reasons: string[] = [];
    if (request.authority.owner !== 'agent') reasons.push('authority_not_agent_owned');
    if (!prompt) reasons.push('prompt_profile_unavailable');
    const provided = [...candidate.route.capabilities, ...candidate.workerCapabilities, ...candidate.modelCapabilities];
    const skillResult = this.skillCatalog.select(request.requiredCapabilities, provided, candidate.availableSkillIds);
    if (skillResult.missing.length) reasons.push(`capabilities_unresolved:${skillResult.missing.join(',')}`);
    const requiredTools = [...request.requiredTools, ...skillResult.selected.flatMap(skill => skill.requiredTools)];
    const toolResult = this.toolPolicy.grant(requiredTools, candidate.availableToolIds, request.deniedTools, request.approvedRisks);
    reasons.push(...toolResult.reasons);
    return {candidate, prompt, skills: skillResult.selected, tools: toolResult.granted, reasons};
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
