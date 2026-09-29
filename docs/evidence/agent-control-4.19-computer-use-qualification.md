# Agent Control 4.19 Computer Use qualification

Date: 2026-09-29

Base: released `v4.18.0`, `7c7fc6e442e477746499e4b22b7b1b832d76bf9e`

Verdict: **QUALIFIED WITH LIMITATIONS**

## Mandatory release gates

| Gate | Result |
|---|---|
| Two legitimate physical providers through the common boundary | PASS: Playwright/Edge and Windows Sky/Notepad |
| Same frozen task independently verified through each | PASS: CU-MP-001, 2/2 providers |
| False-success negative qualification | PASS: 4/4 adversarial cases detected |
| Provider-neutral routing | PASS: fixed and verified-history policies each verified 1/1 shared task |
| Budget enforcement | PASS: paid candidate rejected before execution; incompatible free candidate not selected |
| Privacy/locality | PASS: external candidate rejected; zero operational calls |
| CU01-CU08 regression | PASS: focused Computer Use suite 69/69 |
| Complete supported-Linux regression | PASS only after the exact versioned release commit completes the full gate |
| Accurate status and limitation registries | PASS |

## Physical providers

Provider A was the local `playwright-browser` adapter using Microsoft Edge against an isolated loopback fixture. It produced 13 supported retained attempts: 13 provider completions, 6 verified successes and 7 verification failures. The failed arms include four deliberate false-success cases and three no-recovery controls.

Provider B was the existing `windows-sky` adapter, backed by the real Codex `@oai/sky` Windows adapter, against a fresh unsaved Notepad tab. STEP placed `AC-4.19-FROZEN` and independently verified the fresh observed state. MANAGED_RUN appended `AC-4.19-MANAGED` and independently verified both tokens. Public evidence redacts unrelated open-tab metadata and content. No file was saved.

The shared CU-MP-001 specification is frozen at SHA-256 `484d199332fad62812cd3e8669086ebe21ae72a4de61115459c3666b533e5528`. Both physical providers reached `VERIFIED` for that exact intent. Unsupported Windows Sky cells remain `UNSUPPORTED`, not failures.

## Baseline benchmark

- Retained attempts: 17 total, 14 supported, 3 unsupported.
- Provider completion: 14/14 supported attempts, 100%.
- Verified success: 7/14 supported attempts, 50%.
- False success: 7/14 provider completions, 50%.
- Mandatory adversarial false-success detection: 4/4, 100%.
- Human-assisted verified success: 0.
- Autonomous verified success: 7.

The aggregate intentionally includes negative and unrecovered arms. It is experiment accounting, not a provider quality ranking.

## Recovery, levels and verification

Single attempt/no recovery verified 0/3. Governed recovery verified 3/3 and used one retry per trial. This demonstrates value for the frozen deterministic transient only.

STEP and MANAGED_RUN both verified CU-LVL-001 with one measured action and no retry. Retained Windows timing was 1,529 ms for STEP and 16,191 ms for MANAGED_RUN; one startup-sensitive pair cannot establish general latency preference.

The deterministic and application-output verifiers agreed on the selected text-entry case. No visual-model verifier was used. Every provider acknowledgement remained subordinate to the independent terminal verifier.

## Routing, budget and privacy

Policy A fixed Playwright. Policy B applied capability, availability, locality, provider charge, verification support and task-class verified/false-success/elapsed history, then selected Windows Sky. Both policies verified 1/1 retained shared task, so no reliability advantage is claimed.

With `max_provider_charge = 0`, the paid candidate was rejected before execution. A zero-cost candidate lacking text-entry capability was also rejected. Under `LOCAL_ONLY` and external-processing prohibition, the external candidate was rejected and received zero operational calls.

## Economics

Provider/API charge was zero; provider cost per completion and per verified success was zero. Time per verified success across all supported arms was 11,297 ms. Local compute monetary cost and energy per verified success remain unavailable. These unavailable values are not relabelled as zero.

## External boundaries

Coasty remains `PROVIDER_ACCESS_UNAVAILABLE`. OSWorld remains `DEFERRED_FOR_FULL_QUALIFICATION`; `OSWORLD_QUALIFICATION_PLAN.md` defines the pinned OSWorld 2.1 environment, data, scoring, contamination and evidence requirements. No official OSWorld score was produced.

This qualification changes no production service or configuration. Rollback is released `v4.18.0` at `7c7fc6e442e477746499e4b22b7b1b832d76bf9e`.
