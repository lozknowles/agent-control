# Agent Control 4.11 vs 4.12 Lean native A/B

## Result

**Lean efficiency is NOT PROVEN.** The exact ten-task workload completed through the native Agent Control Job boundary, but both lanes achieved **0/10 verified successes**. Successful-task-only efficiency is therefore **not computable**.

Baseline runtime: released `9dff191034b7c69e102687bef02803bc05afe874` plus the identical native qualification adapter, recorded as `bd7a79323af8e3b5152587126e55fe70dc47ba75`. Lean A/B runtime: `bda8da659ea0e20d0ce7822837db8f80891cbb61`. The later final-source change only replaces a hard-coded submitter node label with configuration; it does not change execution semantics.

Frozen fixture SHA-256: `d1b5e8ebec19378b5d2112e8be5e73671a51c40bc328af8ded815be44edb6b27`. Model: `Ministral-3-8B-Instruct-2512-Q4_K_M.gguf`; model SHA-256: `33e7a72cf5e6e2cfc2f2847075acc013d68bba023e35310cef86b5cf8fdca761`. Both lanes used the same endpoint, temperature 0, maximum output 768, frozen task limits and task order.

| Metric | 4.11 baseline | Lean | Difference |
|---|---:|---:|---:|
| Verified successes | 0/10 | 0/10 | no quality improvement |
| Model calls | 15 | 13 | 13.3% fewer |
| Input tokens | 41,257 | 26,772 | 35.1% fewer |
| Cached input | 19,847 | 4,715 | 76.2% fewer |
| Fresh input | 21,410 | 22,057 | +3.0% |
| Output tokens | 479 | 455 | 5.0% fewer |
| Processed tokens | 41,736 | 27,227 | 34.8% fewer |
| Model elapsed | 1308.1s | 1286.9s | 1.6% lower |
| Wall elapsed | 1893.1s | 1893.5s | +0.02% |

Total input fell, but provider-reported cached input fell more sharply, so **fresh input increased by 647 tokens (3.0%)**. All twenty tasks ended with `structured_chat_loop_timeout`; all twenty workspace cleanups were confirmed. A token reduction on failed tasks is not an adoption result.

| Task | Profile | Baseline | B calls | B fresh | Lean | L calls | L fresh |
|---|---|---|---:|---:|---|---:|---:|
| MUT-001 | STANDARD | FAILED | 1 | 1804 | FAILED | 1 | 1 |
| MUT-002 | STANDARD | FAILED | 1 | 1676 | FAILED | 1 | 1352 |
| MUT-005 | STANDARD | FAILED | 2 | 2135 | FAILED | 2 | 3323 |
| MUT-003 | STANDARD | FAILED | 1 | 1606 | FAILED | 1 | 1282 |
| MUT-004 | STANDARD | FAILED | 1 | 1798 | FAILED | 1 | 1363 |
| MUT-007 | STANDARD | FAILED | 1 | 1657 | FAILED | 1 | 1333 |
| MUT-009 | DEEP | FAILED | 2 | 2762 | FAILED | 1 | 2022 |
| MUT-010 | DEEP | FAILED | 3 | 2736 | FAILED | 2 | 4416 |
| MUT-011 | DEEP | FAILED | 1 | 2287 | FAILED | 1 | 1962 |
| MUT-012 | DEEP | FAILED | 2 | 2949 | FAILED | 2 | 5003 |

## Evidence interpretation

The older Phase 3 harness-driven Agent Control result remains 2/10 and is preserved separately. The fresh native result is 0/10 for both lanes under the current physical model throughput. It neither overwrites nor invalidates the historical measurement; execution conditions and provenance differ.

One Lean task received a nearly fully cached first prompt, while other tasks did not. Cache state is reported per invocation and no financial saving is inferred. Because there are zero successful tasks, the required fair successful-task metrics are unavailable rather than zero.
