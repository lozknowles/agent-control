# Current priority

## Agent Control 4.4 — governed Pisper architectural and physical review

Status: **COMPLETE — REVIEW CHECKPOINT READY**
Started: 2026-09-11  
Base: Agent Control 4.4.0 (`0a3d136c38ec2c75afb4fb946fba1fb12a9dd5f8`)

- Pin and inspect Pisper source, documentation, tests and runtime architecture.
- Compare parallel execution, Turn branching, context/batons, tools, caching,
  session isolation, workflows, memory, cross-device runtime, lifecycle events,
  failure and recovery against the actual Agent Control 4.4 implementation.
- Run a matched isolated physical multi-agent workload where feasible and record
  concurrency, model/tool/context/cache telemetry, isolation, observability and
  recovery evidence without touching production services.
- Produce an evidence-backed capability matrix with `ADOPT`, `ADAPT`,
  `ALREADY PRESENT`, `REJECT` or `DEFER` recommendations.
- Decide whether provider-neutral Turn Branching should become a first-class
  Agent Control primitive. Do not implement speculative product changes before
  the comparison demonstrates material benefit.
- Preserve all released 4.4 behaviour and qualified evidence.

### Outcome

- Both runtimes physically demonstrated three-way concurrent fan-out and join.
- Agent Control's existing parallel Work Parcel execution is genuine, not merely
  sequential scheduling at a lower layer.
- Recommend `ADAPT`: provider-neutral Governed Turn Snapshot Branching from a
  completed persisted boundary, with immutable source and normal verification.
- Recommend `ADAPT`: optional discover/call tool gateway only where measured
  schema pressure justifies it; retain immutable recipe grants and authorization.
- Recommend `ADOPT`: one additive worker lifecycle event envelope for POE,
  dashboards and remote clients.
- Keep Agent Control's existing baton, scheduler, cache, memory, provider,
  credential and recovery abstractions. Pisper/Pi/Iroh are not dependencies.
- Evidence: `docs/evidence/agent-control-4.4-pisper-review-20260911.md` and
  `docs/evidence/agent-control-4.4-pisper-physical-comparison-20260911.json`.

Lower-priority 4.4 feature work remains paused at its existing safe checkpoints.
