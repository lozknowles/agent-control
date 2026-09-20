# v4.11 token forensics

The historic 137,625 processed tokens reconcile exactly to **135,178 input + 2,447 output**. Input reconciles to **25,766 fresh + 109,412 cached**. These are retained Phase 3 measurements, not estimates.

Exact historical per-category allocation is unavailable: the original runner retained aggregates, tool IDs, hashes and patches, but not all per-call requests/responses. A hash is not recoverable prompt content. Nothing in the historical evidence has been rewritten.

The source sends the six-tool catalogue twice: `renderSystemInstructions` embeds it in the system message, and `buildMutationContextSources` emits a required `tool_schemas` source. The context packet retains that source. Thus there are two catalogue copies per normal turn. Full internal authority, lease and provenance objects are already enforced outside this prompt; broad claims that governance dominates context would be unsupported.

Fresh read-only request capture: `control/*/calls`. Attribution: `control/call-attribution.json`; cumulative sizes: `comparison.json`. Attribution partitions every message character into disjoint categories. Tokenizer counts use the serving model's `/tokenize` endpoint on individual text segments. **Standalone segment token counts are non-additive**: they exclude chat framing and boundary-token effects. Provider usage remains the only authoritative processed-token total. Aborted calls with no usage are unavailable, not zero. No proportional token allocation is presented as measurement.

The replay is **HARNESS_DRIVEN** and excluded from native efficiency claims. Its diagnostic recorded usage is `{'inputTokens': 41334, 'freshInputTokens': 1376, 'cachedInputTokens': 39958, 'outputTokens': 665, 'totalProcessedTokens': 41999}`. It was already commissioned when the stricter provenance mismatch was identified; the queued lean replay was stopped. The bounded control replay retained its failures. Subsequent regression activity also makes its wall time unsuitable for causal comparison.

| Region | Disposition | Evidence boundary |
|---|---|---|
| First tool catalogue | NECESSARY_BUT_COULD_BE_SMALLER | Live stage/authority projection tested |
| Second exact catalogue | UNNECESSARY | Byte-identical schema duplication |
| Task/acceptance/allowed paths | NECESSARY_AND_CACHEABLE | Preserved unchanged |
| Repository instructions | NECESSARY_AND_CACHEABLE | Preserved unchanged |
| Prior tool results | NECESSARY_BUT_COULD_BE_SMALLER | Exact duplicate reference only |
| Authority/lease internal records | COULD_BE_HELD_OUTSIDE_MODEL_CONTEXT | Already runtime-owned; no claimed token saving |

80.9% cache reuse says how much input the provider reused; it does not establish necessity. Provider aggregate cache fields do not identify semantic spans. The region dispositions above are architectural assessments, not invented per-span cache telemetry.
