import type { CapabilityScore, ModelCandidate, ModelRecipe } from "./types.js";

export interface TrialResult {
  recipeId: string;
  capability: string;
  passed: boolean;
  quality: number;
  latencyMs: number;
  substitutions: number;
}

export function aggregateCandidate(
  recipe: ModelRecipe,
  results: TrialResult[],
  benchmarkSuite: string,
  holdoutSuite: string,
): ModelCandidate {
  const mine = results.filter(r => r.recipeId === recipe.id);
  const groups = new Map<string, TrialResult[]>();
  for (const result of mine) groups.set(result.capability, [...(groups.get(result.capability) ?? []), result]);

  const capabilities: CapabilityScore[] = [...groups.entries()].map(([capability, trials]) => ({
    capability,
    score: trials.reduce((sum, t) => sum + (t.passed ? t.quality : 0), 0) / Math.max(trials.length, 1),
    sampleSize: trials.length,
  }));

  return {
    recipe,
    stage: "benchmarking",
    capabilities,
    substitutions: mine.reduce((sum, t) => sum + t.substitutions, 0),
    completions: mine.filter(t => t.passed).length,
    benchmarkSuite,
    holdoutSuite,
  };
}

export function shouldPromote(challenger: ModelCandidate, champion: ModelCandidate, capability: string): boolean {
  const challengerScore = challenger.capabilities.find(x => x.capability === capability)?.score ?? 0;
  const championScore = champion.capabilities.find(x => x.capability === capability)?.score ?? 0;
  const enoughEvidence = (challenger.capabilities.find(x => x.capability === capability)?.sampleSize ?? 0) >= 5;
  return enoughEvidence && challengerScore > championScore && challenger.substitutions <= champion.substitutions;
}
