# Agent Control 3.7 development qualification

Date: 2026-09-02  
Branch: `feature/3.7-token-aware-baton-routing`  
Base: `5acdde13e41d58b511a33ac0e15f3dc6d3930613` (Agent Control 3.6 product checkpoint)

## Deterministic coverage

The focused TypeScript suite covers the durable governor and its integration boundaries:

- monotonically increasing authoritative context pressure at 74%, 75%, 85%, and 91%;
- a 100k lifetime-token thread with only 12k current context, plus unavailable and estimated context values;
- partial configuration validation against the same 75/85/90 defaults used at runtime;
- sealed baton provenance, SHA-256, Git/diff/test/next-action state, successful handoff, failed-handoff recovery, and original-thread recoverability;
- Sol 184k, Luna 31k, and GLM-5.3-Flash 18k accounting that remains 233k after durable reload;
- Responses-compatible direct review telemetry, Codex JSONL start/completion usage normalization, active/completed thread state for advancing elapsed time, redacted `GET /api/token-routing`, and the real SSE event stream.
- the normal direct repository-review Work Parcel production boundary calling observe, assess, sealed baton creation, governed `DELEGATE`, destination execution and independent validation;
- destination-execution failure marking the delegated child failed, preserving the source contract/thread, resuming the exact next frozen chunk on the source provider, and retaining additive parcel evidence.
- two independently referenced Codex `CODEX_HOME` profiles remaining child-process isolated without changing the global login; account qualification persisting no path or credential material;
- same-provider `lawrence-pro/Sol → cottage-plus/Luna` handoff binding the exact destination account, rejecting identity mismatch, and retaining separate account-aware baton, contract, invocation and parcel-chain records.

## Telemetry authority

Codex JSONL provides a live `thread.started` event and completion usage from `turn.completed`. The current Codex CLI integration does not expose authoritative in-thread context occupancy, so 3.7 records the configured context-window limit when known and marks current context and percentage `unavailable`; it never derives them from lifetime tokens.

Responses-compatible adapters normalize provider usage and use configured pricing only as an `estimated` cost. A provider-native current-context field may be represented as `authoritative` without changing core routing policy.

## Qualification-discovered integration defect and fix

The physical continuation audit at branch commit `4a13df341c79ff3cc8cbadfed8173618722b92ea` found that production repository review called `TokenAwareBatonRuntime.observe` but never called `assess`, `createBaton` or `governedHandoff`. The runtime and deterministic unit tests were sound, but there was no genuine production handoff call path.

The fix connects the existing abstractions at `DirectRepositoryReviewExecutor`, the component that already owns provider invocation and Work Parcel evidence. At a completed immutable-chunk boundary it assesses bounded remaining work, resolves the exact target through `ModelRegistry`, seals the existing baton, delegates through `GovernedHandoffRuntime`/`ContractExecutionRuntime`, invokes the destination, and leaves final independent result validation with `ParameterizedJobEngine`. A destination failure is contained by the existing token handoff recovery boundary and resumes the source route. Focused production-executor tests prove both success and recovery; no provider-specific route was added to core policy.

The account-aware extension retains that lifecycle and adds one optional identity beneath a provider. Codex profiles resolve through separate environment-referenced `CODEX_HOME` directories; the runtime does not read or copy their contents. Model registry qualification, route decision, baton, contract, provider result, Work Parcel invocation and aggregate ledger must agree on `provider/account/model`. Account selection is explicit or predetermined policy, never utilization-driven rotation.

## Boundary still requiring physical qualification

This is development evidence, not a live provider promotion. The new production path has not been physically exercised in this change. Before enabling automatic production handoff, run a bounded qualified provider exercise that proves provider/model identity, live telemetry authority, independent verification, a successful governed handoff, recovery from an intentionally failed handoff, and final Work Parcel/evidence reconciliation. Missing live context telemetry must remain `unavailable` during that exercise.

## Validation after production-path correction

- Earlier production-path focused command: `node --import tsx --test src/control/direct-repository-review-executor.test.ts src/control/token-aware-baton-routing.test.ts` — 11 passed, 0 failed.
- Full command: `npm run check` — TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality and implementation-status consistency passed; 642 tests passed, 0 failed.

- Account-aware focused command: `node --import tsx --test src/control/token-aware-baton-routing.test.ts src/control/direct-repository-review-executor.test.ts src/control/codex-exec-provider.test.ts src/control/account-profile-qualification.test.ts src/control/model-registry.test.ts src/control/openai-compatible-provider.test.ts src/control/parameterized-jobs.test.ts src/control/adaptive-harness.test.ts src/control/web-server.test.ts` — 94 passed, 0 failed.
- Current full command: `npm run check` — TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality and implementation-status consistency passed; 650 tests passed, 0 failed.
- No interactive account authentication, physical qualification, deployment, merge, tag or release was performed. The physical verdict remains PARTIAL.
