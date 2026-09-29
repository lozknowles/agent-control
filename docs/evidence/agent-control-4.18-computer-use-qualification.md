# Agent Control 4.18 computer-use qualification

Date: 2026-09-29

Base: released `v4.17.0`, `49282a711b592ba82cf0fb4fcdfba6e5338d81d3`

Implementation candidate: `929c7965f123608d6cc2f3fef186f75af83ff791`

Verdict: **QUALIFIED WITH LIMITATIONS**

## Bounded CU01-CU08 suite

| Case | Scope | Result |
|---|---|---|
| CU01 | `STEP`: one provider action, fresh observation, independent verification | PASS |
| CU02 | `MANAGED_RUN`: bounded multi-action workflow and real disposable browser outcome | PASS |
| CU03 | Mandatory negative: provider completes, independent verifier rejects | PASS; terminal `VERIFICATION_FAILED` |
| CU04 | Explicit human pause/takeover/resume audit and non-autonomous classification | PASS |
| CU05 | Capability, locality, external-processing, evidence, verifier and spend routing | PASS |
| CU06 | Cancellation closes the session and records request plus terminal cancellation | PASS |
| CU07 | Hash-chain integrity, authoritative Job event append and dashboard projection | PASS |
| CU08 | Learned Blender procedure compiles into portable semantic workflow primitives | PASS |

The focused suite passed 62/62 before versioning. The mandatory negative proves that provider acknowledgement cannot override the independent verifier.

## Live browser qualification

A disposable loopback page was used; no authenticated browser profile, public service or production asset was touched. On Windows, Microsoft Edge was launched through the Playwright provider. On supported Linux, `/snap/bin/chromium` was used. Both environments passed 3/3:

1. bounded semantic browser actions and fresh visible-result verification;
2. refusal of an unqualified external destination with zero actions;
3. a real `MANAGED_RUN` that navigated, entered `Ada`, selected Apply, and independently verified `Done Ada`, title and exact loopback URL.

This qualifies the bounded browser path, not general desktop control. The Windows Sky bridge remains experimental.

## Provider access and comparison

No `COASTY` configuration, endpoint, credential reference or approved spend authority was available on the qualification systems or in the repository. Coasty status is `PROVIDER_ACCESS_UNAVAILABLE`; no provider adapter, provider score or synthetic result was created. Because a second legitimate physical provider was unavailable, no cross-provider performance table is reported.

## Full supported-Linux gate

Implementation candidate `929c7965f123608d6cc2f3fef186f75af83ff791` passed `npm run check`: 2425 tests passed, zero failed, zero cancelled, zero skipped. Distribution, TypeScript, script syntax, dashboard syntax, neutrality, implementation status and limitation carry-forward gates also passed. The versioned release commit is required to repeat this complete gate before tagging.

## Classification

`STEP` and `MANAGED_RUN` orchestration are **QUALIFIED WITH LIMITATIONS** for the bounded provider-neutral contract and local Playwright browser adapter. Coasty is unavailable, Windows desktop is experimental, two-provider physical comparison is unavailable, and OSWorld is `DEFERRED_FOR_FULL_QUALIFICATION`. No production route is enabled or changed.
