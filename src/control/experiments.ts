import type { ModelRecipe } from "./types";
import type { TrialResult } from "./qualification";

export type ExperimentStage = "cheap" | "capability" | "replay" | "holdout" | "shadow";

export interface ExperimentVariant { recipe: ModelRecipe; stage: ExperimentStage; score?: number; }
export interface ExperimentPlan { id: string; createdAt: string; budget: number; variants: ExperimentVariant[]; }

const KEEP: Record<ExperimentStage, number> = { cheap: .4, capability: .35, replay: .4, holdout: .5, shadow: 1 };
const NEXT: Record<ExperimentStage, ExperimentStage | null> = { cheap: "capability", capability: "replay", replay: "holdout", holdout: "shadow", shadow: null };

export function planOvernight(recipes: ModelRecipe[], budget: number): ExperimentPlan {
  return { id: `exp-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), budget, variants: recipes.map(recipe => ({ recipe, stage: "cheap" })) };
}

export function advanceStage(plan: ExperimentPlan, results: TrialResult[], stage: ExperimentStage): ExperimentPlan {
  const current = plan.variants.filter(v => v.stage === stage).map(v => {
    const trials = results.filter(r => r.recipeId === v.recipe.id);
    const quality = trials.reduce((sum, t) => sum + (t.passed ? t.quality : 0), 0) / Math.max(trials.length, 1);
    const substitutionPenalty = trials.reduce((sum, t) => sum + t.substitutions, 0) / Math.max(trials.length, 1);
    return { ...v, score: quality - substitutionPenalty * .02 };
  }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const next = NEXT[stage];
  if (!next) return { ...plan, variants: plan.variants.map(v => current.find(c => c.recipe.id === v.recipe.id) ?? v) };
  const keep = Math.max(1, Math.ceil(current.length * KEEP[stage]));
  const winners = new Set(current.slice(0, keep).map(v => v.recipe.id));
  return { ...plan, variants: plan.variants.map(v => v.stage === stage && winners.has(v.recipe.id) ? { ...v, stage: next, score: current.find(c => c.recipe.id === v.recipe.id)?.score } : v) };
}

export function recipeFingerprint(recipe: ModelRecipe): string {
  return JSON.stringify({ modelSha: recipe.modelSha, quantisation: recipe.quantisation, runtime: recipe.runtime, runtimeVersion: recipe.runtimeVersion, contextSize: recipe.contextSize, chatTemplate: recipe.chatTemplate, promptVersion: recipe.promptVersion, skills: [...recipe.skillSnapshot].sort(), tools: [...recipe.toolSnapshot].sort(), parameters: Object.entries(recipe.parameters).sort(([a],[b]) => a.localeCompare(b)) });
}
