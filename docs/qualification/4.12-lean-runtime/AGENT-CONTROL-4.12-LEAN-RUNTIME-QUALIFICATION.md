# Agent Control v4.12 Lean Runtime — qualification

**RESULT: BLOCKED for native ten-task A/B and adoption.** The isolated implementation is available for review. No native token-reduction percentage is claimed.

Released baseline: `9dff191034b7c69e102687bef02803bc05afe874`. Measured experimental source: `14779a97afe486231492b4db158d3c9ecfe5ca07`. Canonical Pi reference: `3c75b2747965e8d69ad9e17cbe788b2e33bf4d99`. Pi Phase 1–3 evidence remains immutable; `phase3-preservation.txt` verifies its manifest.

## What was implemented

- Dispatcher-owned stage/authority tool exposure and fail-closed invocation gating.
- Exact duplicate schema removal, retaining all required task/security instructions.
- Scoped on-demand-context primitive and exact retained-history result references.
- Single terminal completion allowance with recorded obligation checks.
- Optional deterministic terminal action after verified THIN work.
- Native qualification action integration and durable projection evidence.
- Focused attack, parser, default-control and native JobRuntime tests.

Focused: 117 passed, 0 failed, 0 skipped. Full suite: 1944 passed, 0 failed, 0 skipped.

Native Qwen job `run-44c9e55e-a0bd-4bbe-8b47-f882f8bbb540`: **SUCCEEDED**; workspace cleanup: **confirmed**. Recorded usage: `{'inputTokens': 4189, 'freshInputTokens': 2923, 'cachedInputTokens': 1266, 'outputTokens': 150, 'totalProcessedTokens': 4339}`.

## Native terminal control pair

A separate native THIN control on the immutable released source failed at `structured_chat_loop_turn_limit:3` after read -> replace -> public test. Native Lean completed read -> replace -> public test -> restricted finish -> independent verifier. Both cleaned up successfully. Control: 4,409 input (3,719 cached, 690 fresh), 135 output, 4,544 total, 3 calls. Lean: 4,189 input (1,266 cached, 2,923 fresh), 150 output, 4,339 total, 4 calls. This one pair used an existing warm cache, lean first; fresh input increased. It is not a controlled throughput/cache result or the ten-task A/B. See `native-pair-comparison.json`.

## Mandatory provenance boundary

The shipped Phase 3 benchmark script constructs its own authority, prepares workspaces, schedules the dispatcher and performs verifier orchestration. Calling production classes is insufficient under this parcel's no-external-runtime-work rule. The fresh replay is **HARNESS_DRIVEN**, retained as diagnostic evidence and **excluded from native comparison**. The queued lean replay was cancelled before execution. No original Phase 3 result is relabelled or altered; this is a separate current assessment.

The immutable v4.11 native qualification action seals THIN and a cache-specific prompt. It cannot reproduce the exact STANDARD/DEEP Phase 3 suite through the required native job boundary unchanged. Silently using that different profile or calling it the exact native A/B would be false. The remaining work is a governed native benchmark action/configuration that preserves the frozen Phase 3 prompts, profiles, limits and verifier while binding the original released executor as the control. This boundary must be qualified before the full comparison.

## Final comparison

| Metric | Qualified fresh AC 4.11 | Qualified AC Lean | Pi Phase 3 reference |
|---|---|---|---|
| PASS / LIMITED / FAIL | unavailable | unavailable | 1 / 1 / 8 |
| Model / tool calls | unavailable | unavailable | 22 / 24 |
| Input / cached / fresh | unavailable | unavailable | 37,336 / 26,133 / 11,203 |
| Output / total | unavailable | unavailable | 1,625 / 38,961 |
| Cache reuse | unavailable | unavailable | 70.0% |
| Schema / repeated / tool-result tokens | native attribution unavailable | native attribution unavailable | not retained |
| Median / total wall seconds | unavailable | unavailable | 210.02 / 2,098.78 |
| Security / governance regressions | historical gates only | automated results above; full native A/B unknown | not an AC release gate |
| Local-model interoperability | historical Qwen PASS | native Qwen SUCCEEDED | Qwen FAIL |

Historic AC reference remains 2 PASS / 8 FAIL, 44 calls, 137,625 processed tokens, 25,766 fresh input, 109,412 cached input and 1,186.20 seconds. The separate forensic report explains what can and cannot be reconstructed. Fresh excluded replay metrics remain in `comparison.json`; they are not substituted into this table.

## Technique decisions

| Technique | Motivation | Disposition |
|---|---|---|
| Task-gated tools | COMBINATION | NEEDS_MORE_QUALIFICATION |
| Lazy context | COMBINATION | NEEDS_MORE_QUALIFICATION |
| Context delta | NEW_AC_TECHNIQUE | NEEDS_MORE_QUALIFICATION |
| General tool-result compression | PI_FINDING | NO_MEASURED_BENEFIT; no lossy transform enabled |
| Deterministic fast paths | EXISTING_AC_TECHNIQUE | NEEDS_MORE_QUALIFICATION |
| Terminal completion allowance | COMBINATION | ADOPT_CANDIDATE within the bounded THIN mutation contract |

```text
Authoritative governance plane
policy / authority / leases / security / evidence / lifecycle / verification
                          |
                 dispatcher-owned projection
                          |
task + currently permitted schemas + needed context + retained-result references
                          |
                        model
```

## Answers

**How much of the 137,625-token workload was necessary?** The exact fraction is not established. Accounting reconciles exactly, and a duplicated catalogue is demonstrable, but historic per-call raw context is incomplete. Token counts alone cannot establish information necessity.

**Can AC approach a leaner interface while retaining governance?** The prototype demonstrates the enforcement boundary and a narrower model surface in automated/native-path tests. SUCCEEDED is the recorded physical interoperability outcome. The full physical efficiency claim remains blocked by native A/B provenance; architectural preference is not treated as proof.

No merge, push, tag, release, deployment or production configuration change occurred. Recommendation: retain this isolated candidate, close the native benchmark ownership/profile gap, then complete the frozen A/B before adoption.
