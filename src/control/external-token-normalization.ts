/**
 * Read-only normalization boundary for externally observed token accounting.
 * This module never estimates missing counters or bills external sessions.
 * It deliberately keeps the source's original inclusive/exclusive semantics.
 */
export type ExternalUsageSource = "codex" | "claude" | "other";
export interface ExternalUsageEvent {
  source: ExternalUsageSource;
  externalSessionId: string;
  externalEventId: string;
  at: string;
  model?: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  reasoningOutputTokens?: number;
  /** Codex input includes cached input; Claude input excludes cache reads. */
  cacheReadIsIncludedInInput: boolean;
}
export interface CanonicalExternalUsage {
  source: ExternalUsageSource;
  sessionId: string;
  eventId: string;
  at: string;
  model: string | null;
  input: number | null;
  freshInput: number | null;
  cachedInput: number | null;
  cacheWrite: number | null;
  output: number | null;
  reasoningOutput: number | null;
  totalProcessed: number | null;
  authority: "external_session_log";
  provenance: "observed";
}
function counter(n: unknown, field: string): number | null {
  if (n === undefined || n === null) return null;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) throw new Error("Invalid " + field);
  return n;
}
export function normalizeExternalUsage(event: ExternalUsageEvent): CanonicalExternalUsage {
  if (!event.externalSessionId || !event.externalEventId || !Number.isFinite(Date.parse(event.at))) {
    throw new Error("Missing external event identity or timestamp");
  }
  const input = counter(event.inputTokens, "inputTokens");
  const cached = counter(event.cachedInputTokens, "cachedInputTokens");
  const write = counter(event.cacheWriteTokens, "cacheWriteTokens");
  const output = counter(event.outputTokens, "outputTokens");
  const reasoning = counter(event.reasoningOutputTokens, "reasoningOutputTokens");
  if (cached !== null && input !== null && event.cacheReadIsIncludedInInput && cached > input) {
    throw new Error("Cached input exceeds inclusive input");
  }
  if (reasoning !== null && output !== null && reasoning > output) {
    throw new Error("Reasoning output exceeds inclusive output");
  }
  const fresh = input === null ? null : event.cacheReadIsIncludedInInput
    ? (cached === null ? null : input - cached) : input;
  const inclusiveInput = input === null ? null :
    event.cacheReadIsIncludedInInput ? input : cached === null ? null : input + cached;
  const total = inclusiveInput === null || output === null || (!event.cacheReadIsIncludedInInput && write === null) ? null : inclusiveInput + output +
    (write ?? 0);
  if (total !== null && !Number.isSafeInteger(total)) throw new Error("Token total exceeds safe range");
  return {
    source: event.source, sessionId: event.externalSessionId,
    eventId: event.externalEventId, at: event.at, model: event.model ?? null,
    input, freshInput: fresh, cachedInput: cached, cacheWrite: write, output,
    reasoningOutput: reasoning, totalProcessed: total,
    authority: "external_session_log", provenance: "observed"
  };
}
