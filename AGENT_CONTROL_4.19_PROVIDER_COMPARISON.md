# Agent Control 4.19 provider comparison

| Measure | Playwright / Edge | Windows Sky / Notepad |
|---|---:|---:|
| Supported frozen attempts | 13 | 1 |
| Provider completion rate | 100.00% | 100.00% |
| Verified success rate | 46.15% | 100.00% |
| False-success rate | 53.85% | 0.00% |
| Provider charge | 0 | 0 |
| Human intervention | 0 | 0 |

The rows are not workload-matched beyond CU-MP-001, so they must not be read as a provider ranking. On the shared frozen intent both providers completed and independently verified once.

## Routing

Policy A fixed Playwright and verified CU-MP-001. Policy B used capability, locality, provider charge, verification support, task-class verified history, false-success history, and median elapsed time; it selected `windows-sky` and the already-retained shared task was verified. Both policies achieved 1/1. The observed routing result does not demonstrate a reliability improvement.

## Budget and privacy

- Provider ceiling `max_provider_charge = 0`: PASS. The paid candidate was rejected before execution.
- Cheap but capability-incompatible candidate: rejected rather than preferred.
- `LOCAL_ONLY` and no external processing: PASS. The external candidate was rejected and received zero operational calls.

## Provider history

History is partitioned by provider and task class. Only independently verified terminal outcomes populate verified-success counts; provider self-report alone does not. Evidence references and event-chain tips are retained.

## Coasty

`PROVIDER_ACCESS_UNAVAILABLE`. No adapter, call, result, comparison, or cost claim exists.
