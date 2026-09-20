# Representative natural completion

Only the wall-clock observation ceiling changed in the diagnostic lane. Model, prompt, tool set, profile semantics, turn budget, acceptance criteria, authority, verification and cleanup were unchanged.

| Complexity | Lane | Frozen limit | Diagnostic ceiling | Natural outcome | Calls | Tools | Wall ms | Verification | Cleanup | Run |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| SIMPLE | baseline | 120,000 | 600,000 | PASS | 4 | 4 | 431181 | SUCCEEDED | confirmed | `run-d61d4037-651d-486d-9b68-d8ec1b512abd` |
| SIMPLE | lean | 120,000 | 600,000 | MODEL_FAILURE | 1 | 1 | 368780 | CANCELLED | confirmed | `run-249daa81-a93f-4da9-9c79-51609e82a504` |
| MEDIUM | baseline | 180,000 | 780,000 | MODEL_FAILURE | 3 | 3 | 715293 | CANCELLED | confirmed | `run-b2c7a7d8-d8d4-4457-97ac-4f804e57e132` |
| MEDIUM | lean | 180,000 | 780,000 | MODEL_FAILURE | 2 | 2 | 443062 | CANCELLED | confirmed | `run-52288554-2f21-4ee2-b468-19f97afc1016` |
| COMPLEX | baseline | 300,000 | 1,500,000 | MODEL_FAILURE | 2 | 2 | 453069 | CANCELLED | confirmed | `run-32a9f80a-d1fc-4524-82ef-72474977158d` |
| COMPLEX | lean | 300,000 | 1,500,000 | MODEL_FAILURE | 2 | 2 | 447503 | CANCELLED | confirmed | `run-e6fd4af2-854f-4dbf-94a0-0881c61e1818` |

Baseline SIMPLE is the only natural successful completion: 4/4 governed turns, deterministic verification PASS, cleanup confirmed. All other finished representative diagnostics encountered the independent model-transport response-header failure while the model was active; they did not reach their extended Agent Control deadline. Additional wall time therefore proved the original wall limit was causal for baseline SIMPLE, but did not establish task quality for the other lane/task combinations.

The server log retained for Lean SIMPLE demonstrates continued decoding through the transport boundary. Complete per-call token and timing records are in `representative-results.json`; raw Agent Control results remain under `/fast/qualification/agent-control-v4.12-native-timeout-20260920/diagnostic`.
