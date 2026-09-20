# Local-model interoperability regression

The existing exact plain/fenced JSON transformation is retained. Harmless fixtures cover valid plain/fenced requests, malformed JSON, ambiguous arrays, unknown fields, missing tool, ungranted/future tools, invalid arguments and terminal escape. No heuristic repair or provider-specific parsing was added.

Native Qwen job `run-44c9e55e-a0bd-4bbe-8b47-f882f8bbb540`: **SUCCEEDED**; workspace cleanup: **confirmed**. Recorded usage: `{'inputTokens': 4189, 'freshInputTokens': 2923, 'cachedInputTokens': 1266, 'outputTokens': 150, 'totalProcessedTokens': 4339}`.

A separate native THIN control on the immutable released source failed at `structured_chat_loop_turn_limit:3` after read -> replace -> public test. Native Lean completed read -> replace -> public test -> restricted finish -> independent verifier. Both cleaned up successfully. Control: 4,409 input (3,719 cached, 690 fresh), 135 output, 4,544 total, 3 calls. Lean: 4,189 input (1,266 cached, 2,923 fresh), 150 output, 4,339 total, 4 calls. This one pair used an existing warm cache, lean first; fresh input increased. It is not a controlled throughput/cache result or the ten-task A/B. See `native-pair-comparison.json`.

This physical check is submitted through `scripts/qualify-lean-model-interface.ts`. That client configures the existing ActionRegistry/JobRuntime, submits, ticks and reads evidence. Runtime-owned actions perform workspace preparation, live admission/authority checks, model HTTP, tools, verification, retention and cleanup. The client performs none of those operations itself.

The frozen task is MUT-001 from the original fixture, against the existing Qwen2.5-Coder-3B-Instruct-Q4_K_M endpoint. This uses the native action's THIN profile and existing cache-qualification prefix; the previous Phase 3 standalone Qwen task used STANDARD. This is interoperability/quality evidence, not a controlled performance comparison. Model hashes are in `model-checksums.txt`; raw authoritative artifacts are under `native-qwen/state/jobs` and indexed in `native-qwen/state/result.json`.

Prior findings remain separate and unchanged: AC Qwen PASS; Pi native Qwen FAIL; Pi compatibility Qwen FAIL; transformation classified GENERIC_MODEL_INTEROPERABILITY. No Pi dependency was introduced.
