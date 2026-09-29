# Agent Control 4.19 Computer Use benchmark

Status: **QUALIFIED FOR THE FROZEN LIMITED PROVIDER SUBSET**. This is not an OSWorld score or a general desktop-automation claim.

## Integrity

- Benchmark: `agent-control-cu-4.19-frozen-20260929`
- Frozen specification SHA-256: `484d199332fad62812cd3e8669086ebe21ae72a4de61115459c3666b533e5528`
- Phase: `BASELINE`; no failed-task prompt tuning was merged into these results.
- Raw public evidence is referenced by `docs/evidence/agent-control-4.19-computer-use/SHA256SUMS`.

## Frozen tasks

| Task | Intent | Playwright | Windows Sky |
|---|---|---:|---:|
| CU-MP-001 | Make the exact token independently observable in a disposable editable workspace | VERIFIED | VERIFIED |
| CU-FS-001 | Submit the exact token; adversarial arm omits/corrupts completion | 4/4 false successes detected | UNSUPPORTED |
| CU-RR-001 | Recover from a deterministic transient first attempt | 0/3 single attempt; 3/3 governed recovery | UNSUPPORTED |
| CU-LVL-001 | Activate one frozen control | STEP and MANAGED_RUN VERIFIED | UNSUPPORTED |

Unsupported cells were excluded from provider failure rates.

## Measured outcomes

- Supported attempts: 14; provider completions: 14 (100.00%).
- Verified successes: 7 (50.00%).
- False successes: 7; false-success rate among provider completions: 50.00%.
- Mandatory adversarial detection: 100.00% (4/4).
- Human-assisted verified successes: 0; autonomous verified successes: 7.

The aggregate includes deliberately wrong and unrecovered arms, so it is an experiment accounting total, not a provider quality ranking.

## Recovery

Single-attempt/no-recovery produced 0/3 verified outcomes. Governed recovery produced 3/3, using one retry per run. This demonstrates value on the frozen deterministic transient; it does not establish the same effect on open-world failures.

## STEP versus MANAGED_RUN

Both levels verified CU-LVL-001 with one measured action and no retry. STEP took 1529 ms and MANAGED_RUN 16191 ms. The single-run startup variance is too large to claim either level is generally faster.

## Verification

The deterministic and application-output verifiers both passed the selected text-entry case; no disagreement occurred. No visual-model verifier was used. Provider-reported completion never overrode failed verification.

## Economics

- API/provider charge: 0; cost per provider completion: 0; cost per verified success: 0.
- Total local hardware time is retained per attempt; time per verified success across all supported arms: 11297 ms.
- Local compute monetary cost: unavailable; no agreed conversion exists.
- Energy per verified success: unavailable; no authoritative per-run measurement exists.

## Limitations

Windows Sky is qualified only for the frozen native text-entry subset. Playwright is qualified only for isolated unauthenticated loopback browser tasks. Neither result establishes arbitrary desktop work, authenticated browsing, Blender execution, or OSWorld performance. Production was unchanged.
