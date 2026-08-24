# Agent Control 3.1.0 architecture

This is the authoritative architecture boundary for 3.1.0. The 3.0.1 infrastructure-neutral resource and provider model remains the base.

## Invariants

1. The lane owns the task; a model, process, terminal and execution provider never do.
2. Human takeover wins immediately and persists across adapter reconnect/restart.
3. One live lease and one logical PTY owner exist per lane/session generation.
4. Hard contracts, batons, events, checkpoints, context metadata and provenance are persisted.
5. Restore validates objective evidence; it never equates a remembered session with a proven live execution.
6. Shared context augments Git/test evidence and cannot replace it.
7. Infrastructure identity, transport, provider and capability are configured separately.
8. Missing configuration fails closed to `UNCONFIGURED`, never to private defaults.
9. The TUI and web dashboard are clients of one `AgentControlService`; neither owns scheduler, lease, ownership or PTY state.
10. An agent claim, collected evidence, verification and acceptance are distinct durable states.
11. Every material routing decision is capability-qualified, fail closed and inspectable.
12. An Action is a versioned executable capability; a Job is a declarative workflow; a Trigger creates a durable Run through one authoritative path.
13. Job manifests can request capabilities, resources and approvals but cannot confer them.
14. Process completion, collected evidence, verification and Run success are separate states.

## System boundary

```text
        Operator interfaces (non-authoritative)
             TUI              Web / HTTP / SSE
               \              /
                \            /
                 AgentControlService
                 CONTROL / POLICY BOUNDARY
                    |       |       |
                    |       |       +-- verification / provenance
                    |       +---------- router / qualification
                    +------------------ scheduler / leases / ownership
                                      |
                    Job Catalog -> JobRuntime -> Run Ledger
                         |             |          |
                    Schedules      Worker/locks  Artifacts
                                      |
                           ExecutionProvider contract
                              |                |
                       built-in fallback   Orca adapter
                                              |
                               process / PTY / worktree / SSH
```

Orca may execute, but Agent Control always decides. The browser may request, but Agent Control authorises. Neither Orca nor an operator interface schedules lanes, issues leases, transfers ownership, resolves handoffs, selects experiment winners, verifies a claim or overrides approval/security policy.

## Durable state

```text
Workspace
  Lanes
    Hard contract
    Baton revisions
    Lease and ownership generations
    Execution identity and recovery state
    Context-source references
    Verification policy, claim, evidence and phase
    Latest routing decision and rationale
  Shared tasks
  Work Queue and checkpoints
  Versioned Job/Schedule catalog references
  Run ledger, step attempts and placement rationale
  Artifact metadata/checksums and durable resource locks
  Evidence and provenance graph
  Append-only events
```

Recovery distinguishes starting, running, paused, human-owned, completed, failed, cancelled, disconnected, recovering and unknown execution. Reconnect validates a tuple that can include task ID, provider execution/session ID, host/resource ID, repository, worktree, branch, creation nonce, lease generation, ownership generation and command identity. PID alone is never sufficient.

## Configuration and resource model

The versioned configuration contains resources, providers, services and lanes. A resource has a stable logical ID plus an independent transport (`local`, `ssh`, `http` or `orca`). Hardware details are optional metadata, not product identity. No provider or managed service is registered unless configured.

Configuration rejects embedded secret-like fields and credentialed URLs. Credentials are supplied through separately named environment variables. State defaults to `.agent-control/`; the path is overrideable.

## Scheduling and execution

The scheduler selects capabilities, placement, priority and provider before queue mutation. It supports AUTO/MANUAL lanes, dependencies, shared tasks, batons, handoffs, cloning, batch leases, checkpoint/yield, quiet periods, resource budgets, maintenance windows, confidence routing, approval gates and successive-halving experiments.

`JobRuntime` is the workflow-level extension of that scheduler, not a parallel policy engine. It discovers due Schedule definitions, calls one `createRun` path, evaluates a Run DAG, resolves every step against the worker capability registry, acquires semantic resource locks, dispatches a registered Action, stores typed artifacts and requires declared verification before success. Model/provider routing remains a separate decision from worker placement. All dashboard/TUI mutations enter through `AgentControlService`.

The append-oriented Run ledger retains the effective Job version, parameters, trigger, worker assignments, retries, artifacts, evidence, errors and provenance. A restart never assumes a live Action survived: an in-flight step becomes `DISCONNECTED`/identity-unproven and its durable resource lock remains held for manual reconciliation. PID alone is not recovery evidence.

The narrow execution-provider API exposes only start, status, reconnect, input, pause, resume, cancel, output, diff and cleanup. Orca-specific concepts remain inside the adapter so another substrate can replace it.

## Shared control service and operator interfaces

`AgentControlService` is the application boundary consumed by both the TUI and web server. It projects lane, scheduler, provider, PTY, Git, baton, routing and verification state without transferring ownership of that state. Commands such as pause, resume, priority, mode, reroute, handoff, clone, cancel and takeover enter through typed service methods. The web server never receives direct persistence, scheduler mutation or PTY-input access.

The HTTP API is read-only by default. Mutation requires a configured bearer token, JSON content type and an allowed browser origin. The default listener is localhost. Server-Sent Events carry typed state-change notifications; clients do not parse terminal text to infer authority.

Human takeover calls the existing PTY registry fence. A human-owned lane cannot resume autonomous execution until ownership is deliberately returned and the scheduler revalidates execution. There is no weaker web-only ownership model.

The dashboard's default Jobs workspace is an operational projection, not an additional scheduler. It reads catalog definitions, Schedule state, queue reasons, worker capability/capacity, resource locks, Run history, step verification and artifact provenance from `JobRuntime` through `AgentControlService`. Run, schedule enable/disable, cancel, whole-Run retry and exact named approval commands return through authenticated service methods. Artifact projections expose identity, checksum and provenance but not managed storage paths. A named approval is legal only while a matching step is authoritatively `WAITING_FOR_APPROVAL`.

## Verification and provenance

The lane verification record distinguishes `unclaimed`, `claimed`, `evidence_collected`, `verified` and `accepted`. Policy names the evidence types required for that task. Verification fails when a required type is absent, has no passing observation, or any failed evidence remains. Acceptance is separately attributed to an actor. Every transition is persisted and appended to the event journal.

Context evidence remains non-authoritative. Git/test evidence and provider-neutral context can support a claim, but only the verification service can move the lane to `verified`; only explicit acceptance can move it to `accepted`.

## Intelligent routing

The route planner first rejects unavailable, unhealthy, unqualified, tool-incompatible, context-incompatible, privacy-incompatible and resource-incompatible options. It then compares eligible options across capability, reliability, startup latency, expected duration, monetary cost, urgency, priority, privacy/locality and stated operator preference. The scores are ordering aids rather than fabricated precision. The durable decision contains the selected option, rejected/eligible alternatives and human-readable factors.

## PTY authority

PTY discovery is separate from ownership and input. Human takeover increments an Agent Control ownership generation and fences agent writers. A stale adapter/session cannot become authorized merely by reconnecting. Input requires a current lease and ownership generation. Unknown identity blocks autonomous continuation.

## Shared context and provenance

Provider-neutral context sources include shared threads, pull requests, issues, commits, artifacts, test reports, web URLs and local files. Routing uses minimum sufficient context:

```text
Baton
  -> baton + diff/tests
  -> selected thread sections
  -> multi-agent review and synthesis
```

Independent agents remain isolated until synthesis. A judge compares evidence quality, records disagreement and links decisions to agents, repository state, tests and optional thread sources. Reproducible tests outrank repeated unsupported assertions.

## Bootstrap and monitoring

Bootstrap is configuration-driven, health-first and idempotent. `up` may start only configured recipes; `down` may stop only recorded owned processes. Occupied/unhealthy unknown services are never killed. With no configuration, status/up return `UNCONFIGURED` without network discovery or external mutation.

The TUI presents lanes, batons, queue state, resources, providers, PTY assignment, context/evidence and optional Android recovery. The web dashboard presents the same core projection plus typed live events, Git and verification detail. Qualification evidence is written outside the tracked tree by default.

## Optional Android resource

Android support is device-neutral. The node ID, transport, port, repository and credential environment are configured. The bundled node advertises observed capabilities and exposes only an allow-listed read-only log operation. Provisioning requires explicit privilege, pairing and reboot approvals.

## Conceptual-integrity gate

New capabilities are classified into policy/authority, scheduling, execution substrate, provider/model adapter, routing, context/evidence, verification/provenance, operator interface, persistence or observability. `assessConceptualIntegrity` rejects duplicate authoritative state, a second control path, interface-owned authority, provider-owned policy and capabilities without a failure mode or durable verification evidence. The operator checklist is in `docs/conceptual-integrity.md`.

## Release boundary

3.1.0 is based on the tagged 3.0.1 agnostic release. The source release does not deploy services, expose the dashboard remotely, create credentials, broaden sharing, enable the bundled Schedule, or claim live qualification for infrastructure that was not tested. The TUI and existing execution implementation remain first-class fallback paths.
