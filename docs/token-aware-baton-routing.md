# Token-Aware Baton Routing

Agent Control 3.7 records live, provider-neutral token state for every thread that is connected to the execution adapter. The state is durable at `.agent-control/token-baton-routing/evidence.json` and is projected read-only through `GET /api/token-routing` and the normal `GET /api/status` snapshot.

## Telemetry semantics

Each sample keeps separate values for cumulative input/output/total tokens, current context tokens, context-window limit, context percentage, cost, elapsed time, and authority. Lifetime totals are never used as a substitute for current context occupancy.

`authoritative` means the provider emitted the value. `estimated` means Agent Control calculated it from a configured price table or adapter estimate. `unavailable` means the provider did not expose it; the dashboard renders `unknown`, not zero.

The Codex CLI JSONL path emits `thread.started` while a thread is live and exposes usage on `turn.completed`. The documented stream does not expose current-context occupancy, so Agent Control records any configured context-window limit but marks current context and context percentage `unavailable`. Responses-compatible providers (including configured GLM-5.3-Flash and local providers) publish start/completion state and normalized provider usage. An adapter that has a provider-native live context field may submit it as `authoritative` without changing governor policy.

## Governor policy

The default policy is deliberately configurable:

```json
{
  "tokenBatonRouting": {
    "prepareBatonPercent": 75,
    "compactPercent": 85,
    "handoffPercent": 90,
    "sampleRetention": 240
  }
}
```

- Below 75%: `CONTINUE`.
- At 75%: `PREPARE_BATON`.
- At 85%: `COMPACT` and normally `COMPACT_AND_CONTINUE`.
- At 90%: Agent Control evaluates handoff.

High context pressure does not itself downgrade a model. `BATON_AND_HANDOFF` requires completed difficult reasoning, bounded or mechanical remaining work, a sealed baton, a qualified capability-compatible route, and a cheaper candidate where cost is known. Otherwise the decision remains `CONTINUE` or `COMPACT_AND_CONTINUE`, with a durable reason.

## Verified baton and recovery

Before a handoff, Agent Control seals a durable baton containing the objective, completed work, decisions, changed files, Git SHA and dirty/diff state, tests/evidence, unresolved issues, exact next action, originating provider/model/thread, token state, and parcel totals. The baton has a SHA-256 digest.

The existing governed handoff runtime owns actual process replacement and authority transfer. A successful handoff leaves the original thread recoverable. A failed or approval-pending handoff records the result and resumes the original thread; no provider/model changes silently.

## Production Work Parcel lifecycle

The parameterized repository-review executor is the first normal production lifecycle wired to the governor. It uses an already completed, schema-valid frozen-context chunk as the reasoning checkpoint and treats the next frozen chunk as bounded remaining work:

`provider invoke/observe → assess → seal baton → DELEGATE child contract → invoke destination → independent repository validation`

Assessment occurs only when another immutable context chunk remains. A handoff candidate must still pass the normal model registry's provider, qualification, node and `repository-review` capability checks. The selected provider/model is recorded before invocation; it is never substituted implicitly. The receiving prompt includes the sealed baton ID and SHA-256, objective, completed work, decisions, exact next action, origin and parcel total at the boundary.

The destination invocation runs inside the token runtime's governed-handoff result boundary. If it fails, the child contract is independently marked failed, the token decision records `handoff_failed_resume_original_thread`, and the same next frozen chunk is invoked on the preserved source route. If it succeeds, the child contract remains the verification owner. The parameterized-job engine then performs its existing independent repository validation and records that outcome on every provider invocation and the surviving source or destination contract.

All successful source, destination and recovery invocations are additive in the original Work Parcel audit. Failed provider attempts retain any provider-supplied partial usage/evidence; unknown usage remains unknown.

## Dashboard and reconciliation

The dashboard consumes the existing SSE endpoint. `token.telemetry`, `token.governor_transition`, `token.baton_created`, and `token.handoff_result` refresh the live thread panel without a page reload. While a thread is active, its elapsed runtime advances locally from the durable start time between events; completed threads retain the final provider-reported elapsed time. The panel displays provider/model, context (`Context: 182k / 272k — 67%`), token totals, authority, cost, governor state/current/next thresholds, and Work Parcel chain totals.

Parcel accounting is additive across threads and models. For example, `Sol 184k → Luna 31k → GLM-5.3-Flash 18k = 233k total` remains visible after each handoff. The same sampled values, transitions, decisions, baton IDs, and hashes persist in durable evidence and can be reconciled with the final Work Parcel cost-per-verified-outcome ledger.

## Qualification

Run the focused tests with:

```bash
node --import tsx --test src/control/token-aware-baton-routing.test.ts src/control/direct-repository-review-executor.test.ts src/control/codex-exec-provider.test.ts src/control/openai-compatible-provider.test.ts src/control/web-server.test.ts
```

The full project check remains the release gate. It must include installed optional ACP and browser dependencies before its TypeScript phase can pass.
