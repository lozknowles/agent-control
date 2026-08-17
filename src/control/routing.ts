import type { AgentHandoff, ModelCandidate, RoutingPolicy, TaskContract } from "./types";

export function approvalRequired(contract: TaskContract, handoff: AgentHandoff): boolean {
  if (handoff.requiresApproval) return true;
  if (contract.risk === "high") return true;
  if (handoff.requestedAccess === "own" && contract.risk !== "low") return true;
  return false;
}

export function chooseCandidate(
  capability: string,
  candidates: ModelCandidate[],
  policy: RoutingPolicy,
): ModelCandidate | undefined {
  const champion = policy.championByCapability[capability];
  const preferred = candidates.find(c => c.recipe.id === champion && ["active", "preferred"].includes(c.stage));
  if (preferred) return preferred;

  return candidates
    .filter(c => ["candidate", "active", "preferred"].includes(c.stage))
    .map(candidate => ({
      candidate,
      score: candidate.capabilities.find(x => x.capability === capability)?.score ?? 0,
    }))
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}

export function handoffAllowed(
  mode: "auto" | "manual",
  contract: TaskContract,
  handoff: AgentHandoff,
): boolean {
  if (mode === "manual") return false;
  return !approvalRequired(contract, handoff);
}
