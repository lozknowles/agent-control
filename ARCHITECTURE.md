# Agent Control 3.1.0 architecture

This is the authoritative source boundary for 3.1.0. The tagged 3.0.1 infrastructure-neutral resource/provider model and the merged 3.0.x adaptive-harness recovery are the base. Status labels matter:

- **implemented** means executable code and automated tests exist in this branch;
- **experimental** means executable code exists but has not been qualified across every external substrate;
- **planned** means the concept has a defined place but must not be presented as implemented or released functionality.

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
17. A managed node is a configured resource plus discovered capabilities; its hostname, transport, hardware and workload identity never become control-plane policy.
18. Remote maintenance is a typed Action with approval and evidence, never an arbitrary SSH command string.

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

The implemented `AdaptiveHarness` constructs a fingerprinted `ExecutionRecipe` from:

- worker, provider and model identity;
- harness profile and context-strategy identity;
- prompt profile;
- minimum qualified skill selection;
- explicit tool grants;
- selected context and evidence references;
- runtime/inference settings;
- lane, lease and ownership generations;
- latency/spend limits;
- verification and escalation policy.

The older `ModelRecipe` remains the model-qualification fingerprint: model artifact, runtime, context size, template, prompt, skill/tool snapshots and parameters. It is a component of the broader execution recipe rather than a competing abstraction.

Persisted recipes from before profile support are interpreted as `STANDARD`; every newly built recipe carries an explicit profile. This additive compatibility rule does not qualify a legacy recipe for THIN or DEEP routing.

Recipe construction is pure policy work. It neither claims a queue item nor acquires a lease, owns a PTY, sends input or accepts a result. Those mutations remain in their existing authoritative services.

## Skills and tools

The implemented `SkillCatalog` selects only entries marked `qualified` that carry qualification evidence. Proposed or revoked skills are not selectable. The implemented `ToolPolicy` calculates an explicit minimum grant and rejects unknown, denied, unavailable or unapproved-risk tools.

Tool authorization fails closed for an unknown, omitted, revoked, unavailable or policy-denied tool; worker mismatch; missing privilege approval; lane mismatch; stale lease/ownership generation; or human ownership. This is an executable control boundary, not a prompt instruction. `WorkExecutor` gives ordinary agent work only this gateway, and the generic `AgentAdapter` contract carries the same recipe/gateway. Tools used internally by an opaque external CLI remain unobservable and therefore are not yet qualified as universally moderated calls.

Dynamic skill proposal, static/security review, sandbox qualification, human approval and promotion into the catalog are **planned 3.1**. No model can currently create and self-grant a privileged skill.

## Token-aware result boundary

Potentially large command results are intercepted at `ToolHandlerRegistry`, after `ToolPolicy` has revalidated the recipe, worker, lease, ownership and approval state and before the result becomes model context. The interceptor accepts one transport-neutral command-result envelope, so local, SSH, managed-node and future backends share the same policy. It does not add a scheduler or a general shell.

```text
authorised command tool
       |
local / remote executor
       |
authoritative command-result artifact (stdout, stderr, status, hash, scope)
       +-- level 0 summary
       +-- level 1 semantic index
       +-- level 2 selected captured context
       +-- level 3 full artifact
                    |
               model context
```

`TokenAwareOutputService` stores the authoritative result and derives an explicitly labelled `COMPLETE`, `COMPACTED`, `TRUNCATED` or `ARTIFACT_ONLY` view. The source hash, byte/line/token counts, expiry and scope accompany every derived representation. `ContextRouter.selectProgressive` chooses the minimum representation capable of discovery, match location, selected inspection or complete verification and reports when that representation exceeds remaining context.

The first specialised adapter is typed ripgrep search. `RipgrepSearchRunner` uses shell-free structured output and an execution-backend-owned workspace boundary; a remote repository path need not exist on the controller. `repository.search.ripgrep` accepts only a bounded query, paths, globs and read options. `command.output.expand` selects only records captured by the original result. Exact task, lane, worker, lease generation and ownership generation must still match, so a handle cannot become a filesystem-read or replay primitive. stderr, non-zero exit status, timeout and cancellation are orthogonal to stdout compaction and remain visible.

Other command families currently use a labelled generic head/tail fallback. Their full retained result remains authoritative. New semantic adapters can be added below the same interception, artifact, context, telemetry and expansion contracts.

## Harness efficiency boundary

`HarnessProfileRouter` classifies profile need before the existing model/provider route. THIN, STANDARD and DEEP alter context/tool/turn budgets, not authority. In observational mode the recommendation is recorded while STANDARD is applied. Enforced selection requires profile-specific, same-model, verifier-backed production evidence; deterministic benchmark evidence cannot satisfy that gate.

`ContextPacketBuilder` accepts ranked sources and returns an immutable derived packet containing hashes, token estimates, included source/provenance IDs and named omissions. Required evidence that exceeds a profile budget fails closed. The neutral `ContextGraph` port supports node search, relationship traversal, neighbourhoods, ranking, compact evidence and verified write-back without selecting a database implementation.

Provider adapters emit a versioned model-invocation observation. Provider usage remains authoritative; local prompt-component counts are deterministic estimates. `HarnessDispatcher` records the observation before returning, and `JobRuntime` changes its verifier/final-result fields only across the existing verification and Run-finalisation transitions. Aggregates count tokens, turns, time and cost against distinct verifier-passed successful jobs. Unknown cache, reasoning, price or cost fields remain null.

Profile escalation is monotonic (`THIN -> STANDARD -> DEEP`), reason-coded and reference-preserving. It never repeats a strategy, expands policy authority or bypasses scheduler retry/review controls. The complete decision and measurement contract is in [`docs/harness-efficiency-architecture.md`](docs/harness-efficiency-architecture.md).

Real-mutation qualification reuses this path rather than introducing a second scheduler or executor. A frozen task is copied into a disposable Git workspace, `HarnessDispatcher` provides a bounded structured tool loop through the existing `ToolPolicy`, and an independent verifier evaluates the resulting diff. The outcome ledger links prediction, context packet, attempts, escalations, provider usage, tool observations, patches and verifier checks. Cumulative metrics include every failed precursor attempt.

This evidence is not routing authority. The production gate requires a sufficient deterministic task sample, no verified-success regression against STANDARD, bounded classified escalation, a measured cumulative-resource improvement and all existing policy/fencing checks. The first recorded mutation run fails the sample-size and resource-improvement criteria, so production applies the observational STANDARD fallback; no production profile-selection code path is enabled by the experiment.

## Routing and qualification

The current line has three complementary implemented layers:

1. `CapabilityResolver` matches requirements to healthy, infrastructure-neutral resources.
2. Provider/model qualification records capability scores and promotes challengers only with adequate evidence.
3. `HarnessProfileRouter` recommends a qualified context/tool/turn profile and defaults to STANDARD when evidence is insufficient.
4. The recovered `EconomicRouter` rejects routes that fail health, qualification, capability, confidence, quality, approval, spend or latency gates, then compares monetary cost, latency, local occupancy, contention, failure/retry risk and quality.

`DynamicEscalationRouter` can re-evaluate after failure, low confidence or latency pressure while carrying context/checkpoint references. `RecipeDispatchRecord` separately records scheduler-selected worker placement and provider/model routing, plus prompt, context, skills, tools, safe runtime settings, authority generations, verification and escalation. The historical branch's machine-specific UI/bootstrap changes were deliberately not imported.

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

An authorised Linux/SSH resource may opt into the generic managed-node adapter. The adapter sends a fixed, versioned read-only probe over its existing SSH transport, projects heartbeat/inventory/workload state and synchronises observed capabilities into the Worker Registry. Declarative workload detectors and approved-service allowlists remain configuration; hostnames, secure-overlay addresses, usernames, device names and credentials are never product constants. Probe loss preserves the last observation as degraded before expiring offline, and later complete evidence recovers it.

Managed-node execution is split into read-only inspection and typed maintenance Actions. The controller validates operation, parameter form, service allowlist, runtime target, current heartbeat and approvals before streaming one reviewed action script. The remote script validates its typed operands again. It never receives `sh -c` or an operator-provided command. An active protected workload marks the node BUSY, blocks configured disruptive/competing scheduling capabilities and requires the stronger protected-workload override for maintenance. Job leases, locks, approval waits, cancellation, verification, artifacts and provenance remain in the existing control plane.

Configuration rejects embedded secret-like fields and credentialed URLs. Credentials are supplied through separately named environment variables. State defaults to `.agent-control/`; the path is overrideable.

`ConfigurationStore` is the sole dashboard-facing inventory writer. Its authenticated API reads the current file with a SHA-256 revision, applies one resource/provider/service upsert, validates the complete resulting configuration, and atomically replaces the file. It never writes a supplied credential value: `credentialEnv` and `credentialFileEnv` are names of runtime environment variables, while plaintext password, token, secret and API-key fields fail closed. Configuration changes emit an audit event and require process restart; the browser does not mutate the active registry directly.

## Scheduling and execution

The scheduler selects capabilities, placement and priority before queue mutation. It supports AUTO/MANUAL lanes, dependencies, shared tasks, batons, handoffs, cloning, batch leases, checkpoint/yield, quiet periods, resource budgets, maintenance windows, confidence routing, approval gates and successive-halving experiments.

`WorkCoordinator` remains authoritative for queue eligibility and worker placement. Once it selects a normal agent item, `WorkExecutor` must call an `adaptive-harness` dispatch; raw handlers are accepted only through a named, scope-checked `ControlOperationRegistry` entry. Harness denial is non-retryable and never falls back to unrestricted execution. Recipe construction cannot claim queue work or change the scheduler decision.

`HarnessDispatcher` filters candidates to the worker already selected by scheduling, builds the recipe, stores an inspectable/durable dispatch record and gives the executor a closure-backed tool gateway. Every gateway call re-reads live authority and policy state. Execution moves Work Queue state to `verification-pending`; a separate verifier must accept it.

Windows OpenAI execution uses an explicit authentication selector below this boundary. `auto` chooses the qualified Responses provider when an API key is configured and otherwise chooses official Codex non-interactive execution with ChatGPT-managed authentication. The Codex process receives an ephemeral read-only capability envelope with user-configured MCP tools disabled; its schema-constrained returned request still enters `ToolInvocationGateway`. Authentication choice never changes lease, ownership, scheduling, verification or takeover authority.

`JobRuntime` is the workflow-level extension of that scheduler, not a parallel policy engine. It discovers due Schedule definitions, calls one `createRun` path, evaluates a Run DAG, resolves every step against the worker capability registry, acquires semantic resource locks, dispatches a registered Action, stores typed artifacts and requires declared verification before success. Model/provider routing remains a separate decision from worker placement. All dashboard/TUI mutations enter through `AgentControlService`.

The append-oriented Run ledger retains the effective Job version, parameters, trigger, worker assignments, retries, artifacts, evidence, errors and provenance. A restart never assumes a live Action survived: an in-flight step becomes `DISCONNECTED`/identity-unproven and its durable resource lock remains held for manual reconciliation. PID alone is not recovery evidence.

The narrow execution-provider API exposes only start, status, reconnect, input, pause, resume, cancel, output, diff and cleanup. Orca-specific concepts remain inside the adapter so another substrate can replace it.

## Shared control service and operator interfaces

`AgentControlService` is the application boundary consumed by both the TUI and web server. It projects lane, scheduler, provider, PTY, Git, baton, routing and verification state without transferring ownership of that state. Commands such as pause, resume, priority, mode, reroute, handoff, clone, cancel and takeover enter through typed service methods. The web server never receives direct persistence, scheduler mutation or PTY-input access.

The HTTP API is read-only by default. Mutation requires a configured bearer token, JSON content type and an allowed browser origin. The default listener is localhost. Server-Sent Events carry typed state-change notifications; clients do not parse terminal text to infer authority.

Human takeover calls the existing PTY registry fence. A human-owned lane cannot resume autonomous execution until ownership is deliberately returned and the scheduler revalidates execution. There is no weaker web-only ownership model.

The dashboard's default Jobs workspace is an operational projection, not an additional scheduler. It reads catalog definitions, Schedule state, queue reasons, worker capability/capacity, resource locks, Run history, step verification and artifact provenance from `JobRuntime` through `AgentControlService`. Run, schedule enable/disable, cancel, whole-Run retry and exact named approval commands return through authenticated service methods. Artifact projections expose identity, checksum and provenance but not managed storage paths. A named approval is legal only while a matching step is authoritatively `WAITING_FOR_APPROVAL`.

Managed-node snapshots are another `AgentControlService` resource projection, exposed through the shared system status and `GET /api/nodes`. The web dashboard, TUI and universal status command render that same versioned state; none probes hosts or owns heartbeat/workload policy independently.

The Systems projection joins configured resources, providers and external services with whatever current heartbeat, provider-health, worker, capacity and invocation evidence exists. Absence of observation therefore produces `UNKNOWN`, observed reachability failure produces `OFFLINE`, and missing referenced authentication produces `AUTH REQUIRED`; a configured system is never removed merely because it cannot be contacted. The Configuration view changes the durable inventory through `ConfigurationStore`, not this readiness projection.

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

3.0.x implements evidence records, evidence-weighted consensus, provenance reconstruction and recipe-level verification requirements. This 3.1 branch adds the persisted claim/evidence/verified/accepted service and makes recipe-backed Work Queue execution stop at `verification-pending`. Universal task-specific verification for every adapter/Action remains an acceptance gap, not a retroactive 3.0.1 claim.

The invariant is already binding: `agent says done` is a claim, not accepted completion. Git/test evidence remains independently authoritative for code work.

## Successive halving and learning

`ModelRecipe` fingerprints include prompt, skills, tools, context/runtime characteristics and inference parameters. `planOvernight` and `advanceStage` implement cheap-to-capability-to-replay-to-holdout-to-shadow successive halving. The recovered economic router adds cost/latency/confidence-aware selection and escalation.

Persisting winners as a governed learned-recipe catalog and feeding Run Ledger results back into qualification remain follow-on 3.1 work.

## 3.1 Job-to-harness boundary

```text
Job Catalog
       |
Schedule / Run Now
       |
      Run Ledger
       |
Agent Control policy and authority
       |
Adaptive Harness
       |
execution recipe per Job action
       |
worker / model / skills / tools / substrate
```

Jobs declare outcomes, dependencies and required capabilities. They do not name a personal machine or grant authority. The implemented reference Actions are control-owned deterministic handlers; an Action that delegates to an agent/model must use `HarnessDispatcher` and may produce a distinct recipe. This adapter is the next integration seam—Jobs do not replace or bypass the harness. The web dashboard is an operator projection/control client, never authoritative state.

## 3.1 execution acceptance invariants

1. No normal agent execution bypasses the Adaptive Harness.
2. No supported model-originated tool invocation bypasses `ToolPolicy`.
3. No Job or Schedule bypasses Agent Control authority.
4. No external context source gains control-plane authority.
5. A recipe is invalid after lease or ownership generation changes.
6. Human takeover immediately fences every recipe tool.
7. Successful execution remains distinct from verified completion.
8. Worker placement, model routing and harness scaffolding remain separate inspectable decisions.
9. Skills extend qualified competence but cannot extend authority by themselves.
10. Core Jobs and recipes require capabilities, not infrastructure-specific identities.

Invariant 1 is enforced in `WorkExecutor`; invariant 2 is enforced for gateway-based adapters and the qualified `HarnessJobAgentAction` bridge. Opaque tools performed inside an external CLI remain explicitly unqualified until their adapters expose policy-mediated operations or a separately approved, immediately fenced sandbox capability boundary.

## Bootstrap and monitoring

Bootstrap is configuration-driven, health-first and idempotent. `up` may start only configured recipes; `down` may stop only recorded owned processes. Occupied/unhealthy unknown services are never killed. With no configuration, status/up return `UNCONFIGURED` without network discovery or external mutation.

The TUI presents lanes, batons, queue state, resources, providers, PTY assignment, context/evidence and optional Android recovery. The web dashboard presents the same core projection plus typed live events, Git and verification detail. Qualification evidence is written outside the tracked tree by default.

## Optional Android resource

Android support is device-neutral. The node ID, transport, port, repository and credential environment are configured. The bundled node advertises observed capabilities and exposes only an allow-listed read-only log operation. Provisioning requires explicit privilege, pairing and reboot approvals.

## Conceptual-integrity gate

New capabilities are classified into policy/authority, scheduling, execution substrate, provider/model adapter, routing, context/evidence, verification/provenance, operator interface, persistence or observability. `assessConceptualIntegrity` rejects duplicate authoritative state, a second control path, interface-owned authority, provider-owned policy and capabilities without a failure mode or durable verification evidence. The operator checklist is in `docs/conceptual-integrity.md`.

## Release boundary

Earlier version tags remain immutable source releases; 3.3.1 is the current source boundary. Releasing source does not itself deploy services, expose the dashboard remotely, create credentials, broaden sharing or enable bundled Schedules. STANDARD remains the applied harness-profile fallback because real-mutation evidence did not qualify automatic profile routing; opaque CLI mediation and universal adapter verification remain explicit gaps.
