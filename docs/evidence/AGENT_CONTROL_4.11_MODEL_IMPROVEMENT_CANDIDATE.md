# Agent Control 4.11 Model Improvement Candidate

## Executive result

This candidate adds a provider-, model-, runtime-, device-, and transport-neutral governed model-improvement lifecycle to the public v4.10.0 architecture. It creates no second orchestrator and grants no model authority over itself. Work Board remains the planning and scheduling surface; containment remains the execution boundary; model intelligence remains the historical measurement source; governed approval remains the only promotion boundary.

## Existing architecture reused

| Existing mechanism | 4.11 use |
| --- | --- |
| Model Intelligence frozen suites and append-only attempts | weakness and baseline evidence references |
| Work Board | lifecycle stages, dependencies, safe validation parallelism, resource waiting and operator control |
| Execution Scope Envelope | candidate-only write boundary and bounded resources |
| Containment/quarantine | stop uncertainty and unsafe-candidate exclusion |
| PEFT skill training port | optional adapter mechanism after lower ladder levels fail |
| Governed effects and authenticated dashboard mutations | exact-candidate promotion decision boundary |
| Provider/runtime registry | neutral model, runtime and node identities |

## Invariants

- Production baseline identities are content hashed and immutable.
- Every candidate is a separate content-hashed object tied to exactly one baseline.
- Benchmark, evaluator, governance, policy, and promotion paths are outside candidate write scope.
- Teacher models provide attributed evidence only.
- Sensitive training data cannot be accepted.
- Missing metrics remain unavailable.
- Security failure quarantines; protected regression rejects.
- Promotion requires an authenticated decision for the exact candidate hash.
- Historical model intelligence is referenced, never rewritten as improvement evidence.

## Lifecycle and restart

The durable lifecycle is `BASELINE → WEAKNESS_DETECTED → IMPROVEMENT_PROPOSED → EXPERIMENT_APPROVED → CANDIDATE_CREATING → CANDIDATE_CREATED → BENCHMARKING → SECURITY_VALIDATION → REGRESSION_VALIDATION → COMPARISON_READY → AWAITING_PROMOTION_APPROVAL → PROMOTED`, with honest `REJECTED`, `QUARANTINED`, and `INCONCLUSIVE` terminals. Restart reloads the durable state and revalidates baseline and candidate hashes before exposing it.

## Physical qualification

Pending final bounded experiment. The experiment will use an existing qualified model and deterministic validation, record protected services before and after, and will not promote any route.

## Release boundary

This is an isolated development candidate. It is not merged, tagged, published, released, or deployed.
