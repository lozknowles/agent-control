# Agent Control 4.5 power-aware qualification

Status: **PARTIAL — GPU ENERGY TELEMETRY PROVEN; WHOLE-NODE SPECIALIST SAVING NOT PROVEN**.

This evidence belongs to `feature/4.5-governed-skill-learning`. It does not authorize a merge, tag, release, deployment, machine shutdown, suspension, or protected-service change.

## Physical probe

A bounded real request used the existing controller-local Qwen 2.5 3B llama.cpp route. It returned HTTP 200, emitted 53 provider-reported tokens, selected `LANE_REVIEW`, and passed a deterministic verifier.

The Quadro P5000 exposed board-power telemetry through `nvidia-smi`. Twelve idle samples established a 4.845 W GPU baseline. Three invocation samples measured 52.224 W average, 75.9 W peak, 0.006528 gross Wh, and 0.005922 incremental Wh (21.320 J) after the matching GPU baseline. The measurement is authoritative for **GPU board power only**. Shared resident GPU processes, CPU, memory, storage, and platform power are outside its boundary.

| Model | Specialist? | Node | Success | Quality | Time | Avg W | Peak W | Wh | Wh/success |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Qwen 2.5 3B Q4 | No | controller GPU | Yes | deterministic verifier PASS | 685 ms provider call | 52.224 GPU-only | 75.9 GPU-only | 0.005922 incremental GPU-only | 0.005922 GPU-only |
| Route-intent LoRA / SmolLM2 135M | Yes | controller CPU | previously PASS | frozen exact 0.40 | previously measured | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Remote/cloud providers | No | provider infrastructure | not exercised | not exercised | unavailable | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

The controller exposes no readable RAPL/hwmon CPU or whole-system energy counter. Bounded SSH checks did not establish a usable sensor path on the other requested physical nodes during this run. No energy value was inferred for them.

## Acceptance assessment

- Smaller specialist performs useful representative work: previously proven.
- Independent verification: previously proven and retained.
- Automatic governed specialist selection: previously proven under explicit qualification policy.
- Durable memory reduces repeated reasoning energy: **not proven**.
- Actual physical energy: **proven only for one GPU inference boundary**.
- Total energy materially below the general baseline: **not proven**.
- Training break-even: **unavailable**, because training and CPU specialist inference lack a common qualified energy boundary.

The power-aware 4.5 success criterion therefore does not pass. A same-task baseline/specialist/memory Work Parcel comparison requires a qualified whole-system meter or CPU package-energy source. The implementation correctly retains `UNKNOWN` instead of presenting GPU-board joules as whole-system joules.

Raw generated evidence remains under `qualification/agent-control-4.5-energy-20260911/qualification.json` and is reproducible with `npm run qualify:energy-efficiency`.
