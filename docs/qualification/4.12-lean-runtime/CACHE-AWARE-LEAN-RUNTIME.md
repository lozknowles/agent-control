# Cache-aware Lean runtime experiment

## Tested design

An experimental provider layout separated an immutable system/task prefix from a final per-turn typed-tool grant. The dynamic grant was omitted from subsequent history, preserving stage-gated visibility while allowing longest-prefix cache reuse. Authority, input-schema validation, raw evidence, verification and cleanup remained unchanged.

## Physical result: REJECT

Same Qwen model, MUT-001 THIN, four native invocations:

| Configuration | input | cached input | fresh input | output | processed | model elapsed |
|---|---:|---:|---:|---:|---:|---:|
| Existing Lean | 4,191 | 1,750 | 2,441 | 150 | 4,341 | 5,662 ms |
| Stable-prefix/dynamic-grant prototype | 4,655 | 2,168 | 2,487 | 164 | 4,819 | 6,176 ms |

Cached input increased by 418, but input increased by 464, fresh input increased by 46, output increased by 14 and elapsed model time increased by 514 ms. The prototype improved the cache ratio while worsening the actual workload. It was reverted and is not in the final candidate.

Provider-reported cached tokens are observations, not assumed savings. The retained evidence is at `proof-qwen-thin-mut001` and `proof-qwen-thin-cache-aware` in the sealed qualification tree.
