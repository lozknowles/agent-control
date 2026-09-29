# Agent Control 4.20 static versus adaptive

Adaptive verified 2/2 base trials; static verified 0/2. This bounded task demonstrates value from checkpoint, context reset, authoritative retrieval and one allowed verifier-driven repair; it does not establish general model superiority.

| Policy | Attempts | Provider completions | Verified successes | Verified rate | Time per verified success | Provider charge per verified success |
|---|---:|---:|---:|---:|---:|---:|
| STATIC | 2 | 1 | 0 | 0.00% | UNKNOWN | UNKNOWN |
| ADAPTIVE | 2 | 2 | 2 | 100.00% | 10435 ms | 0 USD |

Static 8K failed at the context boundary. Static 16K produced provider output but failed independent quality after its one allowed repair. Adaptive 8K and 16K both verified through checkpoint, compaction, authoritative retrieval and bounded repair. This is a measurable orchestration advantage for the frozen task, not a model-quality ranking.
