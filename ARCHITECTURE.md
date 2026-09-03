# Agent Control architecture

This is the authoritative source boundary for Agent Control 3.8.0 development. Status labels matter:

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
19. Provider registration, model registration, model qualification, logical role mapping and worker placement are distinct state and decisions.
20. A declared capability or pricing field is not qualification evidence; unavailable usage and cost remain unknown rather than zero.
21. Actor, Agent, Model, Provider, Runtime, Node and Resource identities are separate; one must never stand in for another.
22. A Session has one immutable creator and an attributed participant set; joining a session never grants authority beyond the actor, parent delegation or session envelope.
23. Every context handoff records source and transferred hashes, token budget, selection/omission reason and receiving agent/model without persisting raw secret material.
24. Missing sandbox, local execution, governed runner, required node or required model fails closed unless an explicit fallback policy names the replacement.
25. ACP and other interoperability adapters terminate at AgentControlService/Work Parcel ports. They cannot become alternate scheduler, shell, tool or acceptance paths.
26. `THIN` describes context shape; `SPARK` describes an execution class. Neither implies the other.
27. Fast execution is one attempt, independently verified, scope-limited and visibly escalated. Protected or sensitive work never enters it.
28. Retrieval is governed separately from model execution; search/inspect authority never implies index, configuration or repository mutation.
29. Retrieved evidence is content-addressed, repository-state-bound and explicitly CURRENT, POSSIBLY_STALE or INVALID.
30. Token pressure may narrow retrieval before expansion/compaction/handoff, but cumulative lifetime use never substitutes for active context occupancy.

## Governed retrieval and context intelligence

```text
Work Parcel -> Retrieval Intent -> Retrieval Governor -> Retrieval Providers
                                      ^                    |
                              3.7 token governor           v
Model <- ContextPacketBuilder <- ContextGraph <- Evidence Packet
  |                                                |
  +-> independent verification -> portable Baton -+
```

The governor progresses through available exact, lexical, semantic and hybrid strategies only while evidence is insufficient and budgets remain. Exact/BM25 are local built-ins; zg, provider-native and MCP retrieval remain adapters. Evidence compiles through existing context profiles and records references in existing batons. Existing SSE carries typed retrieval events. Missing optimisation providers fall back to controlled frozen context. Full contracts and boundaries are in [governed retrieval](docs/governed-retrieval.md) and the pre-implementation [3.8 review](docs/agent-control-3.8-architecture-review.md).

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

## 3.5 identity and session control plane

```text
external client / dashboard / scheduler
                  |
               Actor identity
                  |
       governed persistent Session
       mode / participants / authority
                  |
               Work Parcel
                  |
       delegation + context transfer
      source actor/agent -> target actor/agent
                  |
       Model + Provider (separate identity)
                  |
       Runtime + Node + Resource
                  |
        tools / evidence / verification
                  |
       causal-chain usage and cost
```

`IdentityControlPlane` is the durable authority/audit source for actors, agents, sessions, context transfers, delegations, execution provenance and opaque secret-use receipts. It does not replace the Job Runtime, Work Parcel store, model registry or Worker Registry. Instead, those records carry or refer to `agent-control.work-attribution/v1`, preserving one causal chain across existing stores.

Execution provenance is admitted only after checking session participation, the participant/session/delegation capability intersection, model and node allow-lists, and runtime filesystem/network policy. Empty model/node allow-lists deny execution; an interoperability adapter must use an explicit `*` only when Agent Control remains responsible for the governed selection.

An agent profile describes a persistent specialist. An Actor is the authenticated principal responsible for action. A Model produces inference. A Provider exposes the model. A Runtime executes it. A Node hosts that runtime. A Resource advertises schedulable capability. These identities may be related but never collapsed.

Context transfer persists descriptors and hashes, not copied prompt bodies. Full, summary, evidence, structured-baton and hybrid policies can be compared using the same frozen experiment interface. Secret values may only cross an opaque capability-checked operation and are rejected if returned or placed in context.

## Contract-owned execution

```text
Lane → Contract → sealed Baton → Process / PTY → Agent
         |                              |
         + authority / budget           + attach / detach
         + completion criteria          + one write owner
         + protected resources          + ordered output
         + pending actions              + restart observation
         + verification / evidence
```

`ContractExecutionRuntime` is the durable task owner. Agent, model, provider, runtime and process identities may change without replacing the contract. Its versioned record contains the active route, process observation, PTY ownership generation, participants, ordered transcript, attachments, permissions, remaining budget, pending actions, verification and evidence. The sealed baton stores canonical content plus its generation, byte count and SHA-256; credential-like content is rejected.

Detach does not terminate a running process. Consultation and reconnect attach read-only. Write transfer requires a durable request approved by the current writer or contract operator, and there is exactly one writer. Human takeover revokes every agent writer and pauses the contract; deliberate return to an attached agent creates a new ownership generation. Stale retained writers therefore cannot regain authority. Cancellation, timeout and orphaning are distinct reconstructable states. A worker's completion is only a verification submission; the active worker cannot verify itself.

## Governed handoff state machine

`SACRIFICE` cancels the current worker and pauses the parent contract. `SUBSTITUTE` replaces process and route under the same contract with a next-generation baton. `DELEGATE` creates a bounded child contract, intersects authority and debits parent budget. `YIELD` pauses and returns control without completion. `COMPLETE` submits evidence to independent verification.

AUTO policy permits only transitions inside the current contract authority, protected-resource envelope and remaining budget. Explicit MANUAL policy, missing authority, costly escalation, production writes, destructive actions, expanded resource envelopes or budget expansion create a durable approval wait. Approval records intent but cannot create authority absent from the parent. Every transition writes `agent-control.handoff/v1` with both identities, contract links, reason, baton hash/size, transferred and withheld authority, budget, before/after state, evidence and verification outcome.

## Provider and model lifecycle

Logical providers are durable identities independent of a client or controller session. Discovery updates only observed capabilities and model IDs. Provider endpoint and credential reference remain immutable under one ID; credentials are indirect `env:`/`file-env:` references and never enter batons, telemetry or evidence.

Model recipes bind exact provider, provider model, model version, capability, context/output limit, tool, runtime and node requirements. Their fingerprints are immutable per recipe version. Evidence gates each transition through `DISCOVERED → BENCHMARKING → SHADOW → CANDIDATE → ACTIVE → PREFERRED → DEPRECATED`.

Versioned routing policy names an ACTIVE/PREFERRED champion and qualified challengers for each logical role. Historical replay produces a recommendation without mutating active policy; verified rollback may reactivate an immutable earlier version. Placement remains separate: recipes state semantic node/runtime requirements without hard-coding a machine. `GLM-5.3-Flash` is canonical and historical `Ox` is only an input alias, not a separate lifecycle identity.

Capability classification then chooses a minimum execution class in the governed hierarchy `LOCAL → SPARK → STANDARD → FRONTIER`; the registry resolves that class to an exact qualified recipe. This is orthogonal to THIN/STANDARD/DEEP harness profiles. The frozen 60-task policy suite and 12-case holdout test conservative classification and fail-closed unavailability, while a separate physical-observation gate measures provider outcomes. A deterministic classifier pass cannot promote routing policy by itself.

The coordinator experiment compares one FRONTIER worker receiving the whole twelve-part job with a coordinator compiling 12 minimal child batons. Parent context and child batons are accounted separately. Child results, additional-context requests, verification, escalation and integration outcomes remain unknown until physical execution. See [capability-routing benchmark](docs/capability-routing-benchmark.md).

The physical multi-provider proof exercises the same boundaries across Codex/Luna, loopback llama.cpp/Qwen and OpenRouter/GLM-5.3-Flash. The local worker yields after its bounded task, the substituted reviewer receives only review authority and a minimal baton, and Luna submits the integrated result for independent verification. Contract detach/reconstruction preserves process and baton identity. See [physical multi-provider qualification](docs/physical-multi-provider-qualification.md).

## ACP interoperability boundary

The ACP runtime implements stable Agent Client Protocol v1 JSON-RPC session methods above the control plane. The official TypeScript SDK owns schema validation, dispatch and NDJSON framing; `AcpAgentControlAdapter` owns the governed mapping. An external ACP session maps to one governed Agent Control session; prompt content becomes a hash-addressed context transfer and then an ordinary Work Parcel. `session/cancel`, `session/close` and request cancellation call the same cancellation port and preserve actor/session identity. Durable ACP bindings reconstruct from the identity and ACP session stores after a process restart. Ordered plan, tool-call and tool-call-update notifications carry Work Parcel, Run and evidence references, not direct tool authority. Usage or cost is omitted when the underlying execution does not report it.

`RuntimeObservability` is a read-only composition boundary over persisted ACP bindings, contract/PTY state, handoffs and provider lifecycle. `AgentControlService` exposes it at `/api/runtime` and merges transport/lifecycle readiness into Systems. The projection carries identities, state, hashes, sizes and evidence references while omitting ACP prompt/cwd content, contract objective/baton payload, PTY transcript, handoff request and credential-reference names. It cannot start a listener, invoke a provider, write a PTY, approve a handoff or promote lifecycle state.

`agent-control acp` is the qualified local stdio adapter. Actor admission is out-of-band and fail-closed: the configured Actor must already exist in the durable identity store. `agent-control acp-remote` reuses the same core through the official Streamable HTTP/WebSocket server transport. It is disabled unless explicitly enabled, requires an indirect bearer secret, checks browser origins, bounds request/frame size, routes one exact path and refuses cleartext non-loopback binding. A TLS certificate/key pair is mandatory for non-loopback use. Tests bind only ephemeral loopback ports; no live listener was deployed.

Prompt replay can carry the advertised namespaced `_meta.agentControl.deliveryId` extension. Agent Control stores only its bounded ID, prompt hash and governed outcome references; exact replay returns the original receipt and a hash mismatch fails closed. Standard fields are not reinterpreted. The stable code imports only the stable ACP root; the SDK's server transport is used independently of the separate `experimental/v2` protocol entry point. ACP v2 remains draft and is not claimed.

## Fast-execution class

```text
classify
   -> compile minimal baton
   -> execute with Spark
   -> independently verify
   -> escalate when necessary

side gates before execution:
   policy enabled + exact qualified fast-execution model route
   + authenticated bounded Spark availability probe
   + disposable initially-clean Git worktree

execution:
   explicit codex exec --model gpt-5.3-codex-spark
   + workspace-write sandbox + ignored user config
   + one attempt + multi-agent disabled

verification:
   approved files + changed-line limit + deterministic command/evidence
      -> PASS: persist verified evidence
      -> FAIL / ambiguity / scope growth / unavailable: visible STANDARD handoff
```

The policy names `FAST_EXECUTION_MODEL`; Spark is its current model identity, not a hard-coded architectural role. The model-execution hierarchy is `LOCAL → SPARK → STANDARD → FRONTIER`. LOCAL, STANDARD and FRONTIER resolve through existing registry roles/capabilities. A future fast model may occupy `fast-execution` only after passing the same exact-identity availability, node qualification, trivial-work classifier, baton, verifier, telemetry and benchmark contracts; routing policy requires no model-specific rewrite.

Harness profile and execution class are orthogonal:

| Harness/context profile | Execution-class consequence |
| --- | --- |
| `THIN` + trivial + low-risk + deterministic verifier | Spark candidate, subject to all availability and qualification gates |
| `THIN` + sensitive, ambiguous or protected work | Not Spark; retain governed STANDARD/FRONTIER policy |
| `STANDARD` parent with one isolated trivial child | Child may receive a separate minimal Spark baton; parent model is unchanged |
| `DEEP` | Never directly Spark-eligible; use the existing capable-model route |

Availability and registry qualification are independent and both required. `probeCodexSparkAvailability` checks the installed Codex version, ChatGPT authentication and one bounded read-only exact-model invocation expecting a fixed probe response. A configured slug, CLI version or successful login alone is not availability evidence. Failure records the reason and leaves existing governed routing authoritative; no other model may be reported as Spark.

The sealed `agent-control.fast-execution-baton/v1` contains the task ID and text, exact allowed files, maximum changed lines, forbidden scope/actions, Context Packet ID/hash, deterministic verifier commands and completion rule. It deliberately excludes broad parent history. `CodexFastExecutionRunner` requires an absolute disposable initially-clean Git worktree, chooses the exact provider model with `--model`, ignores user configuration, applies an explicit workspace sandbox and structured output schema, and disables multi-agent fan-out. One failed or uncertain attempt is the limit.

Verification belongs to Agent Control. Git determines touched files, changed lines and the diff hash; an independent verifier determines acceptance. Model text cannot mark a result verified. Failure, low confidence, extra context, unexpected files/lines, or verifier failure preserves the Spark attempt and creates a visible STANDARD successor decision.

Persistent attempt telemetry records Work Parcel/Run/Session, task and execution class, harness profile, requested/actual model and provider, availability/selection reasons, parent/delegated context, elapsed time, changed scope, independently verified outcome, escalation/successor, reported token/cost fields and evidence. Values Codex does not expose remain `null`, including monetary cost in the current qualification.

The current live requalification demonstrates that small 24–35-token batons were sufficient for seven frozen tasks, but Codex startup context still dominated reported input tokens. This means baton minimisation is effective for parent-to-child transfer without proving low total provider context or cost. Research-preview entitlement, unavailable monetary cost, absent production Job adoption and single-host evidence keep `spark.enabled` false by default.

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

`ConfigurationStore` is the sole dashboard-facing inventory writer. Its authenticated API reads the current file with a SHA-256 revision, applies one resource/provider/model/service upsert or complete model-role-map replacement, validates the resulting configuration, and atomically replaces the file. It never writes a supplied credential value: `auth.env`, `credentialEnv` and `credentialFileEnv` are names of runtime environment variables, while plaintext password, token, secret and API-key fields fail closed. Provider/model/route changes reload the canonical `ModelRegistry`; resource/service changes remain restart-required. The browser never mutates a registry directly.

## 3.4 parameterised Jobs layer

Agent Control’s operator-facing Job platform is a durable layer over—not a replacement for—the existing internal Job Runtime and Work Parcel governance:

```text
Operator / authenticated CLI / persistent scheduler
                     |
                     v
          Saved Job + resolved schedule
                     |
                     v
        versioned Job Definition registry
                     |
           typed parameter resolution
                     |
                     v
         freeze target and policy inputs
                     |
                     v
        one or more governed Work Parcels
                     |
          node + model-role resolution
                     |
                     v
       direct qualified provider executor
                     |
                     v
       deterministic validation/evidence
                     |
                     v
            immutable persistent Run
```

`ParameterizedJobRegistry` owns reusable definition identity, versions, formal parameter schemas, default routing intent, permissions, budgets, output contract, validation policy, and version-controlled instruction template. `SavedJobStore` owns configured instances and schedule/concurrency policy. A Saved Job either pins a definition version or follows only a declared compatible version. It cannot introduce arbitrary parameters or secret-shaped fields.

`ParameterizedJobEngine` is the sole path for manual and scheduled execution. A scheduled occurrence has a deterministic identity; the persistent Run store makes duplicate delivery idempotent. Restart recovery requeues the same non-terminal Run identity and reuses only a verifiably intact frozen snapshot. Missed-run and overlap policy are evaluated before provider work. Agent Control—not a browser, Codex, or conversation—owns the timer.

The initial `repository-code-review@1` definition supports node-local paths under configured `jobs.repositoryRoots` and remote Git URLs under explicit `jobs.repositoryRemotes` prefixes. It records source identity, origin, dirty state, requested ref, exact commit, and comparison SHA. A detached shared clone (local) or isolated clone (remote) is made recursively read-only before context construction. The production repository is never modified. If a branch moves after resolution, the Run retains the original SHA.

`buildRepositoryContext` deterministically records tree, diff, changed files, important manifests/tests/source, chunk hashes, selected files, and explicit omissions. Secret-like and binary paths are excluded before provider context. THIN/STANDARD/DEEP are bounded intent profiles; omission is visible rather than reported as full coverage. Large inputs are decomposed into attributable chunks instead of being placed into one prompt.

`DirectRepositoryReviewExecutor` consumes the already-selected `ModelRouteDecision` and invokes the matching provider client directly. Responses-compatible providers use `OpenAICompatibleProviderClient`; account-bound CLI providers use the schema-constrained `CodexRepositoryReviewClient` through the selected `CodexNodeExecutionPort`. Controller-local profiles use an isolated child-process `CODEX_HOME`; remote profiles resolve it only on their configured execution node. Every context chunk creates a persistent Work Parcel carrying Run ID, frozen SHA, requested/actual route, provider/account/model/node/qualification identity, and terminal evidence. Provider response bodies, credential references and credentials are not persisted; response hashes, normalized usage/cost, and selected safe identity are.

The structured review validator checks schema, evidence presence, confidence, repository-relative path, file existence, and line range against the frozen snapshot. Duplicate or invalid findings are rejected. Provider completion is not Job success: validation determines `SUCCEEDED`, `SUCCEEDED_WITH_FINDINGS`, `DEGRADED`, or `FAILED`. Only successful accepted outcomes advance the `(Saved Job, repository identity, ref)` baseline.

Persistent state is below `AGENT_CONTROL_STATE_DIR/parameterized-jobs/`: `saved-jobs.json`, `runs.json`, `review-baselines.json`, and read-only snapshots. Files are atomically replaced with mode 0600. Terminal Runs become immutable. Dashboard/API/CLI clients access this state only through `AgentControlService`.

## Provider and model registry

`ModelRegistry` separates provider endpoint/authentication from model identity and routing policy. A provider records stable ID, display name, protocol, base URL, authentication reference and broad capabilities. A model records its stable Agent Control ID, provider-native model ID, declared capabilities, optional node scope, limits, sourced pricing metadata and configured qualification seed. `ModelQualificationStore` persists runtime evidence outside the tracked tree.

Logical roles map to an ordered primary and fallbacks plus optional required capabilities. Routing evaluates an explicit model before a role and an explicit role before the configured default. Eligibility requires an enabled provider and model, `QUALIFIED` evidence, selected-node membership when scoped, and every role/request capability in the proven qualification set. Fallback is explicit in the decision and can be prohibited. Cycles, duplicate IDs and unknown references fail configuration validation.

The OpenAI-compatible adapter supports bounded non-streaming Responses and Chat Completions requests plus normalized function/tool-call responses. It normalizes usage without inventing missing measurements and calculates cost only from configured, attributed pricing. Qualification proves basic response and identity, then conditionally proves coding, reasoning and tool use declared by the model; role requirements are checked only against that proven set. It records response hashes, usage, latency, exact provider/model/node identity and capability evidence, never secret environment values or response bodies. Streaming and long-context capability are not advertised merely because an endpoint accepts ordinary requests.

Work Parcel model routing remains downstream of worker placement but upstream of Run creation. A stage requesting `modelRole` or `model` is resolved against the worker selected for its first runnable Job step. The immutable Run trigger records the exact provider model, node, qualification version and fallback reason so model-backed Actions can consume the governed decision. Ordinary Jobs with no model request retain their existing behavior.

Codex integration materializes one selected Responses-compatible provider and model into a mode-0600 temporary `CODEX_HOME/config.toml`, references the approved credential environment variable, and deletes the directory after execution. It does not edit or copy the user's Codex configuration. Chat-Completions-only providers fail closed because current Codex custom-provider configuration supports the Responses wire API.

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

## Token-Aware Baton Routing (3.7)

`Provider adapter → account-qualified model route → normalized telemetry/context-lifecycle sample → durable token governor → sealed baton → governed handoff → Work Parcel aggregate → SSE/dashboard → final evidence`

The 3.7 governor is provider-neutral. An account-bound route has identity `provider → account profile → model → execution node`; the account and node are governed route metadata, not a new provider abstraction. Adapters may report authoritative current context occupancy, but the core never derives it from lifetime token totals. It maintains a durable record per thread, context-lifecycle events (`COMPACTION`, `NEW_CONTEXT`, `CONTINUATION`, `RESUME`), and an aggregate per Work Parcel, so compaction or provider/account/model/node transitions cannot reset cost or token accounting. Policy thresholds at 60/75/85/90 produce `CONTINUE`, `PREPARE_BATON`, `COMPACT`, or `HANDOFF`; routing converts that state to `CONTINUE`, `COMPACT_AND_CONTINUE`, or `BATON_AND_HANDOFF` only after considering unfinished reasoning, remaining-work bounds, capability, model and account qualification, cost, baton readiness, and policy constraints.

Codex 0.153 validates the generic pattern of budget-aware reminders, explicit context-window transitions, persisted usage and resumable history. Agent Control adopts those concepts as provider-neutral lifecycle and accounting records. Codex configuration (`features.context_management.experimental_mode`), history notes, the model-only `new_context` tool, app-server methods/events, raw Responses metadata and OTEL turn-cost lookup remain inside the Codex adapter. The current governed Codex execution route uses `codex exec --ephemeral --json --ignore-user-config`; it therefore does not claim the experimental mode or app-server-only telemetry. A future qualified persistent Codex adapter may use those native facilities while the core sealed-baton and continuation fallback remains executable if Codex disappears. See the [Codex 0.153 review](docs/evidence/agent-control-3.7-codex-0.153-review.md).

The sealed baton is written before the existing governed handoff runtime changes any worker. It carries task/diff/test/evidence/next-action provenance, originating provider/account/model/node, and token/parcel state, while the original contract/thread remains recoverable. The destination is resolved with its exact configured account and node, and invocation results must agree with all four sealed identity fields; this prevents a baton from accidentally executing in the source authentication context. Failed handoffs resume the original account/model/node and record the failure; no route component is silently substituted. The dashboard reads the redacted projection over the existing SSE channel, while sampled telemetry and every transition/decision remain in the durable token-routing evidence for reconciliation with Work Parcel verified-outcome accounting.

The production parameterized repository-review path now supplies the concrete integration boundary. After one immutable context chunk returns a schema-valid result, `DirectRepositoryReviewExecutor` assesses the live source thread if another bounded chunk remains. An approved route creates the sealed token baton and uses `GovernedHandoffRuntime` `DELEGATE` to create a capability-bounded child `ContractExecution`. The child invokes the exact registry-resolved destination over the next frozen chunk. Destination failure marks that child failed and invokes the same chunk on the still-active source route; success makes the child the verification owner. Existing `ParameterizedJobEngine` repository validation independently verifies the consolidated result and records the verdict on the Work Parcel and surviving contract. Source, destination and recovery usage remains additive in the same parcel. See [Token-Aware Baton Routing](docs/token-aware-baton-routing.md).

For Codex/ChatGPT authentication, each account profile contains only opaque ID, safe label, optional plan/capability metadata with authority, qualification state, execution `nodeId`, and a credential-store reference naming an environment variable. A controller-local profile resolves that variable in the existing child-process path. A remote Windows profile is dispatched through the configured SSH resource to `CodexNodeExecutionPort`, whose API permits only `accountStatus` and `execReadOnlyStructured`. A fixed encoded bootstrap reads a base64 request data line and the audited runner source separately from stdin, then passes the request to that runner as an argument; identities, prompt data and schemas never become generated PowerShell source. Windows resolves the named environment reference locally, discovers and validates candidates beneath `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`, and returns only CLI version, executable SHA-256, discovery time and sanitized structured execution data. Raw stdout/stderr, executable paths and credential paths do not cross into evidence. Account selection is explicit Saved Job policy or predetermined model-role fallback. Utilization, rate-limit or quota exhaustion never triggers account rotation.

## Release boundary

Earlier version tags remain immutable source releases. Installing 3.7.0 does not deploy services, expose a remote ACP listener, create credentials, broaden sharing, enable Spark, or enable a Saved Job/Schedule. STANDARD remains the default context profile unless a governed policy explicitly selects another profile. The production token-governor lifecycle is physically qualified across two distinct live local provider/model routes, including a sealed baton, destination continuation, independent verification, SSE/evidence reconciliation, additive token accounting and original-thread recovery after a refused destination. Provider-unreported context and cost remain estimated or unavailable. This bounded proof does not qualify the separate 50-observation automatic capability-routing benchmark.
