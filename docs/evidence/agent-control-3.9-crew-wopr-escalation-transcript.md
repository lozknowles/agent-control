# Agent Control 3.9 Crew/WOPR escalation qualification transcript

This is a human-readable projection of immutable Agent Control records. It contains no private model reasoning or credentials.

## Request

- Received: 2026-09-06T17:48:31.901Z
- Exact dashboard prompt: Review the frozen reservation-service fixture. Explain whether concurrent callers can both acquire the same resource and whether expired cache entries can be accepted as fresh. Preserve evidence, use the configured quality gate, and escalate only if the first route misses either root cause.
- Frozen fixture commit: `2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020`
- Parent Work Parcel: `parcel-2febccc3-571c-4dad-a76f-733b102441ff`
- Parent Runs: `run-8d233b28-bfa5-4aec-a71a-3eda614f55ec`, `run-edf1f826-2a74-431c-927a-53b330ef4e28`, `run-3e209523-0e86-4ea5-9374-920ce45f922c`, `run-1179b53e-8751-4ccc-a5a7-707370255984`
- Parameterized review Run: `d08a007b-74f1-4cc5-b93e-c9f65a99cab7`
- Provider-owned review Work Parcel: `parcel-44deb8fa-71dd-477c-b555-a6caf8fb728e`

## Model change — explicit human-readable record

- **From:** `local-llama/default/qwen-local-small-reviewer@controller`
- **To:** `codex-chatgpt/Controller Account A (cottage-plus)/codex-luna-controller-a@controller`
- **Changed at:** 2026-09-06T17:49:02.011Z
- **Why:** the first model returned valid structured output, but independent gate `reservation-cache-root-cause-v1` found that it missed 4 required root-cause criteria.
- **Governor decision:** `BATON_AND_HANDOFF` with trigger `QUALITY_GATE` and reason `quality_gate_failed_governed_fallback_selected:reservation-cache-root-cause-v1`.
- **Not a context-pressure substitution:** source context was 4.3% (estimated); the route change was quality-driven and explicitly recorded.
- **Continuity:** sealed baton `token-baton:7d4bbe19-c982-4b76-a11a-f151c69c27ba` (SHA-256 `0928bb07a767b95df52fb9337711239274d05dd0a2b16f04deded1943bea6e97`) carried the unfinished criteria and exact next action to the destination.
- **Outcome:** the destination continued the same frozen review, satisfied the gate, and the independent verifier passed the combined outcome. The source thread remained recoverable.

## Timestamped operational timeline

- 2026-09-06T17:48:31.901Z — authenticated dashboard accepted the exact prompt and created the governed parent Work Parcel.
- 2026-09-06T17:48:42.022Z — tool/job action `qualification.acceptance-baseline@1.0.0` entered execution; completed 2026-09-06T17:48:48.307Z with terminal state `SUCCEEDED`.
- 2026-09-06T17:48:42.026Z — tool/job action `qualification.frozen-inventory@1.0.0` entered execution; completed 2026-09-06T17:48:48.323Z with terminal state `SUCCEEDED`.
- 2026-09-06T17:48:48.472Z — tool/job action `qualification.repository-review@1.0.0` entered execution; completed 2026-09-06T17:49:19.933Z with terminal state `SUCCEEDED`.
- 2026-09-06T17:49:19.973Z — tool/job action `qualification.outcome-verify@1.0.0` entered execution; completed 2026-09-06T17:49:20.167Z with terminal state `SUCCEEDED`.
- 2026-09-06T17:48:48.592Z — selected source model `local-llama/default/qwen-local-small-reviewer@controller`; provider execution began.
- 2026-09-06T17:49:02.007Z — source response completed and independent quality gate rejected it; structured transport/schema validation had succeeded.
- 2026-09-06T17:49:02.012Z — Agent Control created and sealed the durable baton.
- 2026-09-06T17:49:02.021Z — selected destination model `codex-chatgpt/Controller Account A (cottage-plus)/codex-luna-controller-a@controller`; destination continuation began from the baton.
- 2026-09-06T17:49:19.890Z — destination response completed and passed the same independent quality gate.
- 2026-09-06T17:49:20.159Z — independent outcome verification passed and reconciled the two model legs.

## Governed execution

1. Two control lanes ran concurrently: the acceptance-test baseline and frozen source inventory.
2. local-llama/qwen-local-small-reviewer returned a complete, schema-valid review. It used 1406 tokens; current context was estimated (ephemeral_single_turn_usage_estimate).
3. Independent gate `reservation-cache-root-cause-v1` rejected it: Schema-valid review did not satisfy 4 acceptance-level root-cause criteria.
4. Missing criteria: Identify the reservation operation as a non-atomic check-then-update sequence, explicitly or by proving both callers check before either updates ownership. Explain that both callers can observe the resource as unowned before either caller updates ownership. Identify that createdAt - now reverses the cache-age subtraction and yields a negative age for stale entries. State that cache age must be calculated as now - entry.createdAt.
5. Agent Control sealed baton `token-baton:7d4bbe19-c982-4b76-a11a-f151c69c27ba` with SHA-256 `0928bb07a767b95df52fb9337711239274d05dd0a2b16f04deded1943bea6e97`.
6. Governed route selection transferred the unfinished review to codex-chatgpt/cottage-plus/codex-luna-controller-a.
7. The destination continued from the sealed baton and passed the same gate: The review proves both acceptance-test root causes: the non-atomic reservation interleaving and the reversed cache-age subtraction.
8. Independent final verification accepted the resulting repository review. The original source thread remains recoverable.

## Provider results

### Initial route — rejected by independent quality gate

PASS_WITH_FINDINGS

- src/reservation-ledger.mjs — Concurrency issue in reserve method: Concurrency can lead to race conditions and resource conflicts, which is a security concern.
- src/snapshot-cache.mjs — Cache freshness check is not accurate: The cache freshness check is not accurate because it does not take into account the TTL, which is a critical aspect of the cache's behavior.

### Destination route — accepted

The repository contains two proven correctness defects corresponding to both failing acceptance invariants: reservation acquisition is non-atomic across an await boundary, and cache freshness computes the age with the operands reversed.

- src/reservation-ledger.mjs — Concurrent reservations can both acquire the same resource: Two concurrent calls can both observe the resource as unowned before either call reaches the map update. Both then await the audit promise; the acceptance test deliberately releases that shared gate only after both calls have entered audit, so both calls resume and set an owner before either result is prevented. The check and ownership transition are therefore not atomic across the await boundary.
- src/snapshot-cache.mjs — Cache freshness uses a reversed age calculation: The documented age is current time minus creation time, but the implementation subtracts current time from creation time. Consequently, an entry older than the TTL produces a negative value and is incorrectly classified as fresh. The acceptance test directly demonstrates this root cause.

## Reconciled usage

| Provider | Account | Model | Input | Output | Total | Cost |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| local-llama | default | qwen-local-small-reviewer | 773 | 633 | 1406 | Unavailable |
| codex-chatgpt | Controller Account A | codex-luna-controller-a | 8128 | 738 | 8866 | Unavailable |
| **Work Parcel total** |  |  | **8901** | **1371** | **10272** | **Unavailable** |

Current context occupancy remains separate from lifetime usage. Qwen's single-turn occupancy is estimated; Codex reports it as unavailable. Missing cost or context values are shown as Unavailable, never zero.

## Verification

```json
{
  "schema": "agent-control.qualification-verified-outcome/v1",
  "passed": true,
  "checkedAt": "2026-09-06T17:49:20.159Z",
  "readOnlyFixtureStillHasTwoKnownFailures": true,
  "sourceGateRejected": true,
  "destinationGateAccepted": true,
  "batonSha256": "0928bb07a767b95df52fb9337711239274d05dd0a2b16f04deded1943bea6e97",
  "handoffOutcome": "SUCCEEDED",
  "sourceRecoverable": true,
  "modelLegs": 2,
  "aggregateTokens": 10272
}
```

Completed: 2026-09-06T17:49:20.227Z
