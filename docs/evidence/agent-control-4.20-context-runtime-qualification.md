# Agent Control 4.20 context-runtime physical qualification

Classification: **PHYSICAL_CONTEXT_RUNTIME_QUALIFIED_WITH_LIMITATIONS**

This report covers one held-out local-model task on one Quadro P5000 worker. It proves a bounded orchestration result, not general local-model equivalence with frontier coding systems.

## Frozen identity

- Benchmark: `AC-CTX-420-P5000-001`
- Configuration SHA-256: `f7c631888411c970567f7b4f6ace3e4879bab99e5e4b4a2c8dd22234930c3ab3`
- Corpus SHA-256: `57cee8c83e5ec56b5abff1d1f89530862fc660e252d383b1cca17f078b206c05`
- Raw private evidence SHA-256: `6822a2c29d32934459dd0c36a3f5c3487bec97447cfe204e2a5719cbd45d3100`
- Model: Qwen3-0.6B-Q8_0, artifact SHA-256 `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`
- Runtime: llama.cpp server 9371 (22d9bc441), binary SHA-256 `3f1000482d759661cadb1dc9b59f6292f52408ee0d2906298fa001837517fb4e`
- Independent validator: `restricted-python-functions/v1` in a networkless sandbox

## Held-out trials

| Trial | Strategy | Context | Measured pressure | Compactions | Repairs | Result | Duration | Owned peak VRAM |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| static-8k-base | STATIC | 8192 | 92.91% | 0 | 0 | FAILED | 7916 ms | 1934 MiB |
| adaptive-8k-base | ADAPTIVE | 8192 | 92.91% | 1 | 1 | VERIFIED | 10385 ms | 1934 MiB |
| static-16k-base | STATIC | 16384 | 46.45% | 0 | 1 | FAILED | 50265 ms | 3112 MiB |
| adaptive-16k-base | ADAPTIVE | 16384 | 46.45% | 1 | 1 | VERIFIED | 10485 ms | 3104 MiB |
| adaptive-8k-flash | ADAPTIVE | 8192 | 93.37% | 1 | 1 | VERIFIED | 8310 ms | 1910 MiB |
| adaptive-8k-flash-kvq8 | ADAPTIVE | 8192 | 92.91% | 1 | 1 | FAILED | 7421 ms | 1518 MiB |
| adaptive-8k-flash-kvq8-reasoning | ADAPTIVE | 8192 | 94.92% | 1 | 0 | VERIFIED | 11989 ms | 1518 MiB |

Static base verified 0/2; adaptive base verified 2/2. At 8K the first stage used 7,560 prompt tokens and reached 92.91% measured occupancy. Projected next-turn use was 17,052 tokens. Static execution terminated with `CONTEXT_EXHAUSTION`; adaptive execution checkpointed, reset, retrieved original evidence and independently verified after one bounded repair. At 16K static execution completed provider calls but failed quality verification after one repair; adaptive execution compacted on projected overflow and verified.

## Runtime techniques

- Flash Attention: both matched adaptive 8K arms verified; observed duration changed from 10,385 ms to 8,310 ms and owned peak VRAM from 1,934 MiB to 1,910 MiB. One pair does not establish a general improvement.
- Q8 KV cache: observed owned peak VRAM fell from 1,910 MiB to 1,518 MiB, but independent quality failed after the allowed repair. The technique is not promoted.
- Reasoning: the reasoning-on Q8 arm verified without repair while the matched reasoning-off arm failed quality. One pair does not establish a general default.
- 32K: the isolated runtime loaded a 32,768-token context and returned an observed response; this was a capacity probe, not a verified long-task success.
- 64K: not executed because the model reported a 40,960-token training limit; classified unsupported rather than failed.

## Durable state and provenance

Adaptive trials retained a sealed checkpoint, original-evidence references, a separately typed `MODEL_GENERATED_SUMMARY`, outstanding work, budget state and the next action. Tuning proved why this matters: replaying a contradictory generated summary degraded quality, so held-out active context was recompiled from authoritative original evidence while the summary remained retained evidence.

## Safety and economics

The existing protected llama.cpp service remained HTTP healthy with an unchanged health-body hash. All 3 pre-existing GPU processes were present afterward, and every qualification server was ownership-bound and terminated. Production and routing were unchanged. Provider charge per adaptive verified success was $0. Local-compute monetary cost and energy remain **UNKNOWN**, not zero. Adaptive time per verified base success was 10435 ms.

## Limits

The experiment uses one small model, one worker, one deterministic coding task and single trials per runtime technique. Static and adaptive paths share the same model and validator, but the result does not predict other tasks or hardware. No physical model/runtime reroute occurred. Cached-token telemetry, energy and defensible local monetary cost remain unavailable.
