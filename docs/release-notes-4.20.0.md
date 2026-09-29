# Agent Control 4.20.0

Agent Control 4.20.0 adds provider-neutral context-aware runtime admission and durable context management. It does not enable a production route or claim that local models equal frontier coding systems.

## Governed runtime architecture

- Workload profiles describe `CHAT`, `TOOL`, `AGENT` and `DEEP` requirements without hard-coding token-window sizes.
- Admission jointly evaluates model footprint, runtime overhead, context/KV memory, current worker load, safety reserve, runtime features, budget and locality.
- Context pressure can produce explicit checkpoint, compaction, authoritative retrieval, reroute-required or fail-closed decisions. Important state is never silently truncated.
- Durable checkpoints retain the original objective, constraints, evidence references, completed and outstanding work, budget state, next action and typed provenance. Model summaries remain `MODEL_GENERATED_SUMMARY`; they never become original evidence.
- Verified-history routing learns only from independently verified outcomes. Provider completion alone is not success evidence.
- The existing runtime projection and Models dashboard expose profile, configured and used context, pressure, worker/model/runtime identity, compactions, checkpoints, reroutes, repairs and verification while preserving unavailable values as UNKNOWN.

## Physical P5000 qualification

The isolated held-out matrix used Qwen3-0.6B-Q8_0 on one Quadro P5000 with llama.cpp server 9371. The exact model and runtime binaries are content-addressed in the retained evidence. Every trial used an isolated loopback port and a restricted networkless Python validator. The protected llama.cpp health body was unchanged, all three pre-existing GPU processes remained present, qualification processes were cleaned up, and production routing stayed unchanged.

At 8K, stage one used 7,560 prompt tokens and reached 92.91% measured occupancy. Static execution stopped with `CONTEXT_EXHAUSTION`; adaptive execution checkpointed, reset active context, retrieved authoritative evidence and independently verified after one bounded repair. At 16K, static execution completed provider calls but failed independent quality after repair; adaptive execution compacted on projected overflow and verified.

Static base verified 0/2; adaptive base verified 2/2. Adaptive time per verified base success was 10,435 ms and provider charge per verified success was USD 0. This proves a bounded orchestration advantage for the frozen task, not general model or hardware superiority. Local-compute monetary cost and energy remain UNKNOWN.

## Runtime techniques and capacity

- Flash Attention: both matched adaptive 8K arms verified; one pair does not establish a general improvement.
- Q8 KV cache: owned peak VRAM fell from 1,910 MiB to 1,518 MiB in the matched pair, but quality verification failed after repair. It is not promoted.
- Reasoning policy: reasoning-on verified where the matched reasoning-off Q8 arm failed. One pair does not establish a default.
- 32K: the runtime loaded and returned an observed response, classified only as a capacity probe.
- 64K: not executed because the model reported a 40,960-token training limit.
- Physical model/runtime rerouting did not occur and remains unqualified.

## Release gates

- New context/runtime and observability focused tests: 15/15.
- Preserved focused Computer Use regression: 69/69.
- Complete supported-Linux regression: 2,443/2,443, zero failures, zero skips.
- Provider, verified-history, budget and locality controls remain green in the complete regression.
- Coasty remains `PROVIDER_ACCESS_UNAVAILABLE`; OSWorld remains `DEFERRED_FOR_FULL_QUALIFICATION`; Windows desktop control remains experimental beyond the bounded v4.19 qualification.

The exact executed physical configuration and raw evidence remain private because they contain machine topology. The public evidence contains their SHA-256 identities plus a neutral environment-bound reproduction template.

Rollback is released `v4.19.0` at `446dca7b84f3a5273361668b2090b75279247483`.
