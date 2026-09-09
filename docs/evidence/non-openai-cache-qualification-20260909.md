# Non-OpenAI prompt/KV cache physical qualification — 2026-09-09

## Verdict

- CACHE REUSE: **PROVEN**
- PERFORMANCE BENEFIT: **MEASURED**
- MONETARY SAVINGS: **UNAVAILABLE**
- WARM-EXPERT DELEGATION: **NOT IMPLEMENTED**

This evidence was produced through the normal Agent Control Work Parcel, adaptive harness, typed tool gateway, artifact and independent-verification boundaries. No OpenAI model, Codex model call or OpenAI fallback participated in a measured execution.

## Frozen runtime

- Agent Control implementation checkpoint: `161acb2e727fa20b3b354f03edff9e40d45c9317`
- Provider: `local-llama-cache-qualification` (local llama.cpp; non-OpenAI)
- Model: `Qwen2.5-Coder-3B-Instruct-Q4_K_M`
- Model identity exposed to Agent Control: `qwen2.5-coder-3b-cache-qualified`
- Runtime: llama.cpp `9371 (22d9bc441)`, build `b9371-22d9bc441`
- Node: `controller-cache-qualification`
- Cache scope: isolated loopback process, one 8,192-token slot, `--cache-prompt`, `--cache-reuse 0`, no warmup
- Mutation task: `MUT-001`, a real one-file timeout-default change in a fresh frozen disposable Git repository
- Independent checks: scope/size, `git diff --check`, JavaScript syntax, six public tests, hidden timeout assertion, credential/topology scan

## Direct measurements

`cache_n` and `prompt_n` are direct llama.cpp response timings. Latency is supplementary and was not used to infer reuse.

| Cycle | Arm | Parcel | Run | `cache_n` reused | `prompt_n` processed | Prompt ms | Verification |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | cold | `parcel-6800d0af-1bad-497d-a4c0-4c0f4173c558` | `run-bb024755-6fc4-4ef0-8d85-8dde1c2c1998` | 0 | 1328 | 1350.239 | PASS |
| 1 | warm | `parcel-ac5fe847-f354-4fec-bb1a-ab8e916eb134` | `run-32cfb3a6-e9b7-4b29-9939-5934346d2118` | 1327 | 1 | 42.930 | PASS |
| 1 | changed prefix | `parcel-49939e4e-604f-4fb4-8475-4b3c080683c2` | `run-3184e165-fd17-410e-8c49-f9a50b4d77a0` | 497 | 839 | 844.858 | PASS |
| 2 | cold | `parcel-b001f98e-a0ea-4c19-8e39-816728b747db` | `run-16b8e58b-2c80-43f1-90bf-9b0590646eb9` | 0 | 1328 | 1313.454 | PASS |
| 2 | warm | `parcel-23eba6db-0ac8-4dd0-bb4a-d47d29ad1a61` | `run-cfc14f4f-67e9-4b40-b0fb-4bccb01c7143` | 1327 | 1 | 45.532 | PASS |
| 2 | changed prefix | `parcel-2cee8dc6-e1a3-4116-a292-df8395564e90` | `run-de04871c-48a7-4900-8eeb-bcb952106bcd` | 497 | 839 | 849.156 | PASS |
| 3 | cold | `parcel-026214e9-770b-48be-8c89-ed8b0b5298f5` | `run-b36f3181-ade2-4a10-8575-cd8e475b2cdf` | 0 | 1328 | 1320.638 | PASS |
| 3 | warm | `parcel-5bd64aa9-c00c-4c3f-b596-3893225c6fbe` | `run-bd274b96-028e-4d04-be01-c4e1a835e9a3` | 1327 | 1 | 42.523 | PASS |
| 3 | changed prefix | `parcel-c22cefef-bcb9-4641-bc21-cb62c31c50f3` | `run-9b19be2d-caec-4135-8e97-be49dec37782` | 497 | 839 | 852.988 | PASS |

Means: cold `0 / 1328`, warm `1327 / 1`, changed-prefix `497 / 839` reused/processed tokens. Warm prompt processing averaged 43.66 ms versus 1328.11 ms cold, a measured 30.45× speedup. The stable first-turn request fingerprint was identical in every cold/warm arm; the negative-control fingerprint was different and reduced reuse by 830 tokens versus warm.

Each cold arm followed a new qualification-backend PID and an idle one-slot observation. Warm and control arms retained the same PID within their cycle. Cache-write tokens, TTFT, tariff and measured energy were unavailable and were not invented. Cache population is included in each cold/warm pair.

## Evidence bundle

- `non-openai-cache-measurements.json`: full machine-readable records, execution order, boundaries, invocation IDs, raw usage/timings, fingerprints, patches and verifier results
- `complete-human-readable-transcript.md`: original initiating prompt first for every run, followed by every naturally produced model request, provider response, typed tool call/result and independent verifier
- `non-openai-cache-qualification.md`: generated reconciled report
- `transcript.html`: video-readable reconciled table and complete transcript
- `agent-control-non-openai-cache-qualification.mp4`: genuine 1920×1080/30 fps dashboard recording
- `cache-boundaries.jsonl`: timestamped backend PID and idle-slot observations
- `checksums.sha256`: final evidence checksums

The local evidence root is `/fast/qualification/agent-control-non-openai-cache-20260909/`. Diagnostic pre-fix and pre-commit captures are retained separately and are not part of the final measured verdict.

## Limitations

Warm-expert delegation was not tested as though basic KV reuse proved it. Agent Control does not currently route related work to an agent based on retained-context relevance/affinity. That is a separate implementation and qualification requirement. No monetary saving is claimed because this local route had no measured power/tariff evidence.
