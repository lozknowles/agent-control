# Agent Control 3.0.1 architecture

This is the authoritative architecture boundary for 3.0.1.

## Invariants

1. The lane owns the task; a model, process, terminal and execution provider never do.
2. Human takeover wins immediately and persists across adapter reconnect/restart.
3. One live lease and one logical PTY owner exist per lane/session generation.
4. Hard contracts, batons, events, checkpoints, context metadata and provenance are persisted.
5. Restore validates objective evidence; it never equates a remembered session with a proven live execution.
6. Shared context augments Git/test evidence and cannot replace it.
7. Infrastructure identity, transport, provider and capability are configured separately.
8. Missing configuration fails closed to `UNCONFIGURED`, never to private defaults.

## System boundary

```text
                 Human operator
                       |
             unconditional takeover
                       |
             AGENT CONTROL POLICY
      +----------------+----------------+
      |                |                |
 lanes/scheduler   evidence/context  experiments/judges
 leases/ownership  batons/provenance  confidence/halving
 approvals/fences  Git/tests/threads  provider routing
      |
      v
       replaceable ExecutionProvider contract
      |                         |
 built-in fallback       optional Orca adapter
                                |
                     process / PTY / worktree / SSH
                                |
                         configured CLI agent
```

Orca may execute, but Agent Control always decides. Orca does not schedule lanes, issue leases, transfer ownership, resolve handoffs, select experiment winners or override approval/security policy.

## Durable state

```text
Workspace
  Lanes
    Hard contract
    Baton revisions
    Lease and ownership generations
    Execution identity and recovery state
    Context-source references
  Shared tasks
  Work Queue and checkpoints
  Evidence and provenance graph
  Append-only events
```

Recovery distinguishes starting, running, paused, human-owned, completed, failed, cancelled, disconnected, recovering and unknown execution. Reconnect validates a tuple that can include task ID, provider execution/session ID, host/resource ID, repository, worktree, branch, creation nonce, lease generation, ownership generation and command identity. PID alone is never sufficient.

## Configuration and resource model

The versioned configuration contains resources, providers, services and lanes. A resource has a stable logical ID plus an independent transport (`local`, `ssh`, `http` or `orca`). Hardware details are optional metadata, not product identity. No provider or managed service is registered unless configured.

Configuration rejects embedded secret-like fields and credentialed URLs. Credentials are supplied through separately named environment variables. State defaults to `.agent-control/`; the path is overrideable.

## Scheduling and execution

The scheduler selects capabilities, placement, priority and provider before queue mutation. It supports AUTO/MANUAL lanes, dependencies, shared tasks, batons, handoffs, cloning, batch leases, checkpoint/yield, quiet periods, resource budgets, maintenance windows, confidence routing, approval gates and successive-halving experiments.

The narrow execution-provider API exposes only start, status, reconnect, input, pause, resume, cancel, output, diff and cleanup. Orca-specific concepts remain inside the adapter so another substrate can replace it.

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

The TUI presents lanes, batons, queue state, resources, providers, PTY assignment, context/evidence and optional Android recovery. Qualification evidence is written outside the tracked tree by default.

## Optional Android resource

Android support is device-neutral. The node ID, transport, port, repository and credential environment are configured. The bundled node advertises observed capabilities and exposes only an allow-listed read-only log operation. Provisioning requires explicit privilege, pairing and reboot approvals.

## Release boundary

3.0.1 is a source release. It does not deploy services, change external machines, create credentials, broaden sharing, or claim live qualification for infrastructure that was not tested. The existing execution implementation remains a rollback/fallback path while Orca integration continues qualification.
