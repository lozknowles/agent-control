# Current priority

## Agent Control 4.4 — governed Pisper architectural and physical review

Status: **IN PROGRESS**  
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

Lower-priority 4.4 feature work remains paused at its existing safe checkpoints.
