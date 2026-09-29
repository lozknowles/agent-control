# Agent Control 4.20 limitations

This register supplements the historical public-release ledger and preserves every v4.19 boundary. The physical result is deliberately narrow: it establishes a bounded context-orchestration advantage on the frozen task, not general local-model capability or provider equivalence.

| ID | Status | Limitation |
|---|---|---|
| AC-4.20-LIM-01 | QUALIFIED_WITH_LIMITATIONS | Physical context/runtime qualification used one Qwen3-0.6B Q8 model, one llama.cpp runtime, one Quadro P5000 worker and one deterministic coding task. Single trials do not establish general performance. |
| AC-4.20-LIM-02 | CAPACITY_PROBE_ONLY | A 32,768-token runtime loaded and returned an observed response, but no verified long-task success was run at 32K. |
| AC-4.20-LIM-03 | UNSUPPORTED_MODEL_CONTEXT_LIMIT | 64K was not executed because the selected model reported a 40,960-token training context limit. Unsupported capacity is not reported as a benchmark failure. |
| AC-4.20-LIM-04 | NOT_PROMOTED | Q8 KV cache reduced observed owned peak VRAM in one matched pair but failed independent quality verification; it is not a default recommendation. |
| AC-4.20-LIM-05 | INSUFFICIENT_GENERALISATION | One Flash Attention pair and one reasoning-policy pair are retained observations only. They do not establish general defaults. |
| AC-4.20-LIM-06 | PHYSICAL_REROUTE_UNQUALIFIED | Provider-neutral reroute and verified-history selection are covered by focused tests, but no physical model/runtime reroute occurred during the P5000 qualification. |
| AC-4.20-LIM-07 | TELEMETRY_UNAVAILABLE | Cached-token telemetry was unavailable on some failed attempts. Per-run energy and defensible local-compute monetary cost remain UNKNOWN, not zero. |
| AC-4.20-LIM-08 | PROVIDER_ACCESS_UNAVAILABLE | Coasty remains unavailable; no adapter, execution, result, cost or comparison was fabricated. |
| AC-4.20-LIM-09 | DEFERRED_FOR_FULL_QUALIFICATION | OSWorld remains deferred. Windows desktop control remains experimental beyond the bounded v4.19 Sky/Notepad qualification. |
| AC-4.20-LIM-10 | NOT_DEPLOYED | This GitHub software release changes no production service, route or configuration. |

Rollback remains released `v4.19.0` at `446dca7b84f3a5273361668b2090b75279247483`.
