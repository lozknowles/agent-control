# Token-Aware Baton Routing

Agent Control 3.7 records live, provider-neutral token state for every thread that is connected to the execution adapter. An account-bound governed route is `provider → account profile → model → execution node`. The state is durable at `.agent-control/token-baton-routing/evidence.json` and is projected read-only through `GET /api/token-routing` and the normal `GET /api/status` snapshot.

## Telemetry semantics

Each sample keeps separate values for cumulative input/output/total tokens, current context tokens, context-window limit, context percentage, cost, elapsed time, and authority. Lifetime totals are never used as a substitute for current context occupancy.

`authoritative` means the provider emitted the value. `estimated` means Agent Control calculated it from a configured price table or adapter estimate. `unavailable` means the provider did not expose it; the dashboard renders `unknown`, not zero.

The current Codex CLI JSONL path emits `thread.started` while a thread is live and exposes usage on `turn.completed`. It does not expose current-context occupancy, so Agent Control records any configured context-window limit but marks current context and context percentage `unavailable`. Codex 0.153 app-server clients can additionally normalize persisted `thread/tokenUsage/updated` and `contextCompaction` events. Because the public thread-usage count can be provider-reported or locally recomputed after compaction without an authority flag, Agent Control marks that context occupancy `estimated`, not authoritative. Responses-compatible providers (including configured GLM-5.3-Flash and local providers) publish start/completion state and normalized provider usage. An adapter that has a provider-native live context field with unambiguous provenance may submit it as `authoritative` without changing governor policy.

Context lifecycle is generic durable evidence. Adapters can record `COMPACTION`, `NEW_CONTEXT`, `CONTINUATION`, or `RESUME` with an authority/source marker and optional opaque context ID. A context reset may lower current occupancy, but cumulative thread and Work Parcel usage never decreases. Provider-native mechanisms remain behind adapters: Codex's experimental token-budget reminders, history notes and `new_context` tool are not required by core.

## Governor policy

The default policy is deliberately configurable:

```json
{
  "tokenBatonRouting": {
    "continuePercent": 60,
    "prepareBatonPercent": 75,
    "compactPercent": 85,
    "handoffPercent": 90,
    "sampleRetention": 240
  }
}
```

- Below 60%: `CONTINUE`, next threshold 60%.
- At 60%: `CONTINUE`, with the pressure checkpoint recorded and 75% next.
- At 75%: `PREPARE_BATON`.
- At 85%: `COMPACT` and normally `COMPACT_AND_CONTINUE`.
- At 90%: Agent Control evaluates handoff.

High context pressure does not itself downgrade a model. `BATON_AND_HANDOFF` requires completed difficult reasoning, bounded or mechanical remaining work, a sealed baton, a qualified capability-compatible route, and a cheaper candidate where cost is known. Otherwise the decision remains `CONTINUE` or `COMPACT_AND_CONTINUE`, with a durable reason.

## Verified baton and recovery

Before a handoff, Agent Control seals a durable baton containing the objective, completed work, decisions, changed files, Git SHA and dirty/diff state, tests/evidence, unresolved issues, exact next action, originating provider/account/model/node/thread, token state, and parcel totals. The baton has a SHA-256 digest.

In 3.8, the same provider-neutral baton may include content-addressed Evidence Packet references. A receiving model rehydrates only evidence that still matches repository identity, relative-path boundary, source existence and whole-file content hash, instead of receiving repeated raw context. Failure preserves the original thread and invokes controlled context fallback. An adapter-private index, provider session or native context handle is never the only continuation representation.

The existing governed handoff runtime owns actual process replacement and authority transfer. A successful handoff leaves the original thread recoverable. A failed or approval-pending handoff records the result and resumes the original thread; no provider/model changes silently.

## Production Work Parcel lifecycle

The parameterized repository-review executor is the first normal production lifecycle wired to the governor. It uses an already completed, schema-valid frozen-context chunk as the reasoning checkpoint and treats the next frozen chunk as bounded remaining work:

`provider invoke/observe → assess → seal baton → DELEGATE child contract → invoke destination → independent repository validation`

Assessment occurs only when another immutable context chunk remains. A handoff candidate must still pass the normal model registry's provider, account-profile, model, qualification, node and `repository-review` capability checks. The selected provider/account/model/node is recorded before invocation and the adapter must return that exact identity; it is never substituted implicitly. The receiving prompt includes the sealed baton ID and SHA-256, objective, completed work, decisions, exact next action, origin and parcel total at the boundary.

The destination invocation runs inside the token runtime's governed-handoff result boundary. If it fails, the child contract is independently marked failed, the token decision records `handoff_failed_resume_original_thread`, and the same next frozen chunk is invoked on the preserved source route. If it succeeds, the child contract remains the verification owner. The parameterized-job engine then performs its existing independent repository validation and records that outcome only on the successful execution attempt's provider invocations and surviving source or destination contract. `PASS` and `PASS_WITH_FINDINGS` accept the contract; `REVIEW_REQUIRED` and `FAILED` reject it.

All successful source, destination and recovery invocations are additive in the original Work Parcel audit. Failed provider attempts retain any provider-supplied partial usage/evidence; unknown usage remains unknown.

An engine-level retry keeps the same logical Run identity and frozen repository, but increments a sequence persisted on the Run before provider execution and opens `review:<run>:attempt-<sequence>:<chunk>`. The sequence survives controller restart, while the prior attempt's parcel, telemetry, provider error and recoverability remain durable. This avoids crossing parcel provenance while preserving the token runtime's immutable `provider + account + model + locality` identity check; a retry never rebinds an existing thread or hides `token_thread_identity_changed`. If a Saved Job specifies `maxCost`, execution also fails closed as `job_cost_budget_unenforceable` when neither provider cost nor configured pricing can supply a measurement.

## Dashboard and reconciliation

The dashboard consumes the existing SSE endpoint. `token.telemetry`, `token.governor_transition`, `token.context_lifecycle`, `token.baton_created`, and `token.handoff_result` refresh the live thread panel without a page reload. While a thread is active, its elapsed runtime advances locally from the durable start time between events; completed threads retain the final provider-reported elapsed time. The panel displays provider/account/model, distinct workload/provider-execution/credential nodes, safe account label and reliably attributed plan, qualification/availability, next selected route, context (`Context: 182k / 272k — 67%`), latest context transition, token totals, authority, cost, governor state/current/next thresholds, and Work Parcel chain totals.

Parcel accounting is additive across threads, accounts and models. For example, `OpenAI/Lawrence Pro/Sol 184k → OpenAI/Cottage Plus/Luna 31k → GLM/default/GLM-5.3-Flash 18k = 233k total` remains visible after each handoff. The same sampled values, transitions, decisions, account boundaries, baton IDs, and hashes persist in durable evidence and can be reconciled with the final Work Parcel cost-per-verified-outcome ledger.

## Account-aware routing policy

Account profiles do not create a parallel provider system. A model registry row may bind one opaque `accountProfile`, and a Saved Job may require that profile. The profile must have a configured credential-store reference and its own successful qualification before routing. To use one provider-native model with two accounts, configure two model registry rows with distinct IDs and the corresponding account binding.

Account fallback remains a predetermined model-role decision. Agent Control does not select another account because the current account is rate-limited, exhausted, or has less remaining quota, and does not aggregate account allowances. Such failures remain recorded against the selected account. Allowed selection reasons are explicit operator policy, workload ownership, capability, qualification, or a predeclared route.

Codex account setup and interactive login are documented in [Codex integration](models/CODEX-INTEGRATION.md). A profile binds provider execution and credential residency independently from workload locality; Codex CLI-home profiles execute where that home resides. Account-bound local child processes remove ambient OpenAI/Codex API-key variables before invoking the selected CLI-home identity. Public APIs and evidence contain only opaque ID, safe label, locality IDs, plan authority, qualification metadata, CLI version, executable hash and discovery timestamp—never email, OAuth/access/refresh tokens, cookies, raw process output, executable paths, credential paths, or `CODEX_HOME` contents. See [credential residency](credential-residency.md).

## Qualification

Run the focused tests with:

```bash
node --import tsx --test --test-concurrency=1 src/control/token-aware-baton-routing.test.ts src/control/direct-repository-review-executor.test.ts src/control/codex-node-execution.test.ts src/control/codex-exec-provider.test.ts src/control/account-profile-qualification.test.ts src/control/model-registry.test.ts src/control/openai-compatible-provider.test.ts src/control/web-server.test.ts
```

The full project check remains the release gate. It must include installed optional ACP and browser dependencies before its TypeScript phase can pass.

## Physical qualification

Agent Control 3.7 physically qualified this production path on 2026-09-03 across two distinct live local provider/model routes. A qualification-only threshold policy exercised the unchanged governor without an artificial high-token spend. The source observed 186 tokens, sealed a SHA-256-addressed baton, the destination continued with 510 tokens, independent verification passed, and the Work Parcel reconciled to 696 tokens. A second run refused the destination before invocation and proved that the original source thread resumed and completed with no invented destination usage.

The dashboard's `/api/token-routing` projection and SSE events reconciled with the durable evidence. The local providers exposed exact response usage but not authoritative retained-context occupancy, so the one-turn context values are marked estimated. Aggregate monetary cost remains unavailable when any leg lacks configured pricing. See the [physical qualification](evidence/agent-control-3.7-physical-qualification-20260902.md) and [machine-readable record](evidence/agent-control-3.7-physical-lifecycle-20260903.json).
