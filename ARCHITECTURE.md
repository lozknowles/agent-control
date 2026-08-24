# Agent Control 3.1.0 development architecture

This is the authoritative development boundary for 3.1.0. The tagged 3.0.1 infrastructure-neutral resource/provider model and the merged 3.0.x adaptive-harness recovery are the base. Status labels matter:

- **implemented** means executable code and automated tests exist in this branch;
- **experimental** means executable code exists but is not yet the default end-to-end dispatch path;
- **planned 3.1** means the concept has a defined place but must not be presented as implemented or released functionality.

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
15. An agent may request or propose capability; only Agent Control policy may qualify and grant it.
16. A recipe constructs an execution environment but cannot schedule work, acquire authority, write a PTY or accept a result.

## System boundary and adaptive harness

```text
          OPERATOR INTERFACES (non-authoritative)
             TUI                 Web / HTTP / SSE
               \                 /
                \               /
                 AgentControlService
                         |
                POLICY / AUTHORITY
       lanes / leases / ownership / approvals
       scheduler / handoffs / takeover / conflicts
                         |
                 SCHEDULER / QUEUE
                         |
                  ADAPTIVE HARNESS
          capability analysis / recipe construction
                         |
                  EXECUTION RECIPE
      +------------------+-------------------+
      |        |         |         |         |
    worker   model/    prompt    context   skills
            provider   profile   strategy     |
      |        |         |         |        tools
      +--------+---------+---------+----------+
                         |
        runtime / limits / authority snapshot
        verification / escalation requirements
                         |
                  TOOL POLICY GATE
                         |
                EXECUTION SUBSTRATES
       PTY / Orca / SSH / browser / mobile /
            local runtime / API provider
                         |
                 evidence / provenance
                         |
                    verification
                         |
                  accepted result

   Job Catalog -> Schedule / Run Now -> Run Ledger
                         |
                         +---- invokes Scheduler / Queue
```

Orca, PTYs, SSH, browsers, mobile nodes, local runtimes and API providers are substrates or adapters. They are not the harness and receive no control-plane authority. Orca may execute, but Agent Control always decides.

## Execution recipe

The experimental `AdaptiveHarness` constructs a fingerprinted `ExecutionRecipe` from:

- worker, provider and model identity;
- prompt profile;
- minimum qualified skill selection;
- explicit tool grants;
- selected context and evidence references;
- runtime/inference settings;
- lane, lease and ownership generations;
- latency/spend limits;
- verification and escalation policy.

The older `ModelRecipe` remains the model-qualification fingerprint: model artifact, runtime, context size, template, prompt, skill/tool snapshots and parameters. It is a component of the broader execution recipe rather than a competing abstraction.

Recipe construction is pure policy work. It neither claims a queue item nor acquires a lease, owns a PTY, sends input or accepts a result. Those mutations remain in their existing authoritative services.

## Skills and tools

The implemented `SkillCatalog` selects only entries marked `qualified` that carry qualification evidence. Proposed or revoked skills are not selectable. The implemented `ToolPolicy` calculates an explicit minimum grant and rejects unknown, denied, unavailable or unapproved-risk tools.

Tool authorization fails closed for a lane mismatch, stale lease generation, stale ownership generation, human ownership or a tool absent from the recipe. This is an executable control boundary, not a prompt instruction. End-to-end adapter wiring remains experimental; adapters that do not call the gate are not yet qualified as tool-moderated harness paths.

Dynamic skill proposal, static/security review, sandbox qualification, human approval and promotion into the catalog are **planned 3.1**. No model can currently create and self-grant a privileged skill.

## Routing and qualification

The current line has three complementary implemented layers:

1. `CapabilityResolver` matches requirements to healthy, infrastructure-neutral resources.
2. Provider/model qualification records capability scores and promotes challengers only with adequate evidence.
3. The recovered `EconomicRouter` rejects routes that fail health, qualification, capability, confidence, quality, approval, spend or latency gates, then compares monetary cost, latency, local occupancy, contention, failure/retry risk and quality.

`DynamicEscalationRouter` can re-evaluate after failure, low confidence or latency pressure while carrying context/checkpoint references. Default scheduler integration and durable route telemetry are 3.1 implementation work; the historical branch's machine-specific UI/bootstrap changes were deliberately not imported.

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

The scheduler selects capabilities, placement and priority before queue mutation. It supports AUTO/MANUAL lanes, dependencies, shared tasks, batons, handoffs, cloning, batch leases, checkpoint/yield, quiet periods, resource budgets, maintenance windows, confidence routing, approval gates and successive-halving experiments.

The adaptive recipe builder is available to construct what should run after policy selection, but is not yet the default scheduler dispatch path. This distinction prevents an experimental recipe from silently acquiring scheduling authority.

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

Context is informative, not authoritative. A context provider cannot mutate a lease, lane, schedule, PTY or acceptance result. The recipe includes only selected source/evidence IDs and a token estimate; inaccessible context degrades gracefully to baton/repository evidence.

## Verification

3.0.x implements evidence records, evidence-weighted consensus, provenance reconstruction and recipe-level verification requirements. It does not yet have a universal task-type verification executor wired to every lane. The richer persisted claim/evidence/verified/accepted service exists on the 3.1 integration branch and remains a 3.1 improvement rather than a retroactive 3.0.1 claim.

The invariant is already binding: `agent says done` is a claim, not accepted completion. Git/test evidence remains independently authoritative for code work.

## Successive halving and learning

`ModelRecipe` fingerprints include prompt, skills, tools, context/runtime characteristics and inference parameters. `planOvernight` and `advanceStage` implement cheap-to-capability-to-replay-to-holdout-to-shadow successive halving. The recovered economic router adds cost/latency/confidence-aware selection and escalation.

Persisting winners as a governed execution-recipe catalog and feeding run-ledger results back into qualification are **planned 3.1**.

## 3.1 forward boundary

```text
Job Catalog [3.1]
       |
Schedule / Run Now [3.1]
       |
      Run [3.1 ledger]
       |
Agent Control policy and authority
       |
Adaptive Harness
       |
execution recipe per Job action
       |
worker / model / skills / tools / substrate
```

Jobs declare outcomes, dependencies and required capabilities. They do not name a personal machine or bypass the harness. Different actions in one Job may produce different recipes. The scheduler invokes the harness; it does not replace it. The web dashboard is an operator projection/control client, never authoritative state.

## Bootstrap and monitoring

Bootstrap is configuration-driven, health-first and idempotent. `up` may start only configured recipes; `down` may stop only recorded owned processes. Occupied/unhealthy unknown services are never killed. With no configuration, status/up return `UNCONFIGURED` without network discovery or external mutation.

The TUI presents lanes, batons, queue state, resources, providers, PTY assignment, context/evidence and optional Android recovery. The web dashboard presents the same core projection plus typed live events, Git and verification detail. Qualification evidence is written outside the tracked tree by default.

## Optional Android resource

Android support is device-neutral. The node ID, transport, port, repository and credential environment are configured. The bundled node advertises observed capabilities and exposes only an allow-listed read-only log operation. Provisioning requires explicit privilege, pairing and reboot approvals.

## Conceptual-integrity gate

New capabilities are classified into policy/authority, scheduling, execution substrate, provider/model adapter, routing, context/evidence, verification/provenance, operator interface, persistence or observability. `assessConceptualIntegrity` rejects duplicate authoritative state, a second control path, interface-owned authority, provider-owned policy and capabilities without a failure mode or durable verification evidence. The operator checklist is in `docs/conceptual-integrity.md`.

## Release boundary

3.0.1 remains an immutable source release. This unreleased 3.1 development branch is based on tagged 3.0.1 plus the merged adaptive-harness recovery; it does not move a release tag, deploy services, expose the dashboard remotely, create credentials, broaden sharing, enable the bundled Schedule or claim live model improvement from deterministic fixtures. The existing execution implementation remains a named rollback/fallback path while universal recipe dispatch and adapter enforcement are qualified.
