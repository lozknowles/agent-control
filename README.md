# Agent Control 3.1.0 development baseline

Agent Control is an infrastructure-neutral, policy-controlled adaptive harness for durable work by heterogeneous agents and models. Its executable harness core composes a task-appropriate worker, provider/model route, prompt profile, minimum qualified skills, restricted tools, context strategy, runtime settings, authority snapshot, resource limits and verification/escalation policy into a fingerprinted execution recipe.

A lane owns its task; recipes, agents, models, skills, tools, execution providers and operator interfaces are replaceable and remain below the control boundary. Agent Control remains authoritative for scheduling, priorities, leases, ownership, unconditional human takeover, batons, handoffs, clones, shared tasks, provider qualification, routing, approvals, recovery validation, verification and conflict policy. In the 3.1 development baseline, ordinary `WorkExecutor` agent work can no longer accept a raw handler: it builds and records an `ExecutionRecipe`, dispatches it through `AdaptiveHarness`, and exposes only a live-authority `ToolPolicy` gateway.

Orca is available behind a narrow execution-provider contract. Orca may execute processes, terminals and worktrees, but it does not receive Agent Control policy authority.

## Requirements

- Node.js 20 or newer
- npm
- Git
- Bash for shell-script validation and Android helpers
- Optional: ripgrep for typed repository search, Orca, SSH, Android/Termux, and provider services when configured

No host, device, provider, port, GPU, overlay network or absolute repository path is built in.

## Install

```bash
git clone https://github.com/lozknowles/agent-control.git
cd agent-control
npm install
npm run init
npm run check
```

`npm run init` creates only a schema-valid empty `.agent-control/config.json`. It is idempotent, never discovers infrastructure and never overwrites existing operator configuration. Use `config/agent-control.example.json` only as an illustrative reference after replacing every example endpoint, path and command.

Edit `.agent-control/config.json` for the installation. Runtime state and credentials remain ignored. A different path can be selected with `AGENT_CONTROL_CONFIG`. Do not put credentials in JSON; configuration names only the environment variable that supplies a credential.

With no configuration file, Agent Control starts with a safe local lane and reports infrastructure as `UNCONFIGURED`. It does not invent providers, machines or services.

## Run and monitor

```bash
npm start
npm run web
agent-control status
npm run up
npm run qualify
```

Run `npm link` once per installed node to expose the cross-platform `agent-control` package command. `agent-control status` (also available as `npm run status` inside the checkout) reads the same versioned `AgentControlService` projection as the web dashboard. A controller reads its localhost API; a worker uses a node-scoped SSH client configuration to perform one fixed read-only request against that same localhost API without exposing the dashboard listener. See [`docs/status-command.md`](docs/status-command.md). The older configured service/resource bootstrap inspection is retained as `npm run status:bootstrap`.

`npm start` opens the control-room TUI and its embedded web client. `npm run web` runs the same control service and web dashboard without the TUI for a headless operator host; run one authoritative control-plane process per state directory. `agent-control status` is read-only. `up` starts only explicitly configured services/processes and records ownership. `down` stops only processes that the same Agent Control state directory recorded as owned.

The TUI also starts the web dashboard on `http://127.0.0.1:4310` by default. The browser is an observer unless an operator token is explicitly configured:

```bash
export AGENT_CONTROL_WEB_OPERATOR_TOKEN="$(openssl rand -hex 32)"
npm start
```

Enter that token using **Observer mode** in the dashboard. It is retained only in the browser tab's session storage and sent as a bearer header; Agent Control does not create a browser authority cookie. Use `AGENT_CONTROL_WEB_ENABLED=0` to disable the dashboard or `AGENT_CONTROL_WEB_PORT` to select another port. Binding beyond localhost is an explicit security decision and should be placed behind authenticated TLS with a matching `AGENT_CONTROL_WEB_ALLOWED_ORIGINS` allowlist.

Monitor either interface for the same authoritative lanes, scheduler projection, providers, resources, PTY ownership, routing rationale and claim/evidence/verification state. The web terminal panel is observer-only; it never receives a PTY write primitive. Qualification writes timestamped JSON beneath ignored `qualification-results/`.

Configured Linux/SSH resources can opt into the generic `managedNode` policy. Agent Control then streams a fixed read-only inventory probe over the existing non-interactive SSH route, synchronises discovered capabilities and workload state into the Worker Registry, and shows the same heartbeat, `IDLE`/`BUSY`/`DEGRADED`/`OFFLINE` state, load, memory, storage, current workload and maintenance status in the dashboard, TUI, API and `agent-control status`. It installs no daemon and exposes no arbitrary SSH command surface.

Managed-node inspection and maintenance are typed Job Actions. Package/service/runtime/power operations require a named approval; an active protected workload additionally requires `managed-node.protected-workload-override`, and configured disruptive or competing capabilities are unavailable for placement while BUSY. See [`docs/managed-nodes.md`](docs/managed-nodes.md) for generic onboarding, discovery, operation and failure behavior.

## Token-aware command output

Agent Control can retain a command's authoritative stdout, stderr, exit status and provenance while presenting a much smaller derived view to a model. Command-shaped tool results cross this layer inside the existing `ToolHandlerRegistry`, after live tool/lease/ownership checks and before model context. Small results remain `COMPLETE`; larger results are explicitly `COMPACTED`, `TRUNCATED` or `ARTIFACT_ONLY` and receive a scoped, expiring handle.

The first semantic adapter is the read-only `repository.search.ripgrep` tool. It uses structured ripgrep output to return a summary or file/line match index, while `command.output.expand` can retrieve selected captured matches, files, ranges, context or the exact retained result. Expansion is bound to the original task, lane, worker and authority generations and cannot read arbitrary repository paths. Generic oversized command stdout uses a labelled head/tail view with the same full-result recovery path.

Agents use **Inspect -> Expand -> Read**. The context router selects summary, index, selected context or full artifact according to purpose and budget. The API and dashboard report per-command and cumulative **Context tokens avoided** without claiming provider billing savings. Configure thresholds with the optional `tokenAwareOutput` object shown in [`config/agent-control.example.json`](config/agent-control.example.json). See [`docs/token-aware-command-output.md`](docs/token-aware-command-output.md) for architecture, tool contracts, defaults, provenance and limitations.

## Harness efficiency and context budgets

Agent Control now records execution as a strategy, not just a model choice: model, provider, harness profile, context packet, tools, turns, cache observations and verifier outcome. The main process persists prompt-free invocation metadata in its protected state directory and shares that ledger with Job verification and dashboard projections. Provider usage is normalised into fresh, cached, cache-write, output, reasoning and total tokens where exposed; unavailable measurements and costs remain explicit `null` values. The dashboard's **Harness Efficiency** diagnostic reports token composition, cache effectiveness, escalation and cost per verified outcome without rewarding an unverified cheap run.

`ContextPacketBuilder` ranks exact evidence and keeps its provenance while recording every omitted source. `THIN` provides only bounded targeted context and required tools, `STANDARD` is the compatibility default, and `DEEP` permits wider graph/context retrieval for justified complexity. `HarnessProfileRouter` is observational by default: it can recommend a profile, but applies `STANDARD` until same-model, verifier-backed evidence is explicitly production-qualified. Escalation advances `THIN -> STANDARD -> DEEP` once and preserves packet/checkpoint references.

`ContextGraph` is a provider- and database-neutral port; its initial in-memory adapter proves queries, relationships, compact evidence and verified write-back without introducing a graph service. See [`docs/harness-efficiency-architecture.md`](docs/harness-efficiency-architecture.md) and the explicitly deterministic [`docs/harness-efficiency-report.md`](docs/harness-efficiency-report.md). Run the frozen 20-job experiment with `npm run benchmark:harness-efficiency`; its JSON counterpart is [`artifacts/harness-efficiency-report.json`](artifacts/harness-efficiency-report.json). The separate [`live same-model report`](docs/harness-efficiency-live-report.md) records provider tokens, cache behavior and latency from a controlled typed-tool run; it remains experimental evidence and does not enable production routing.

The dashboard opens on the **Jobs** catalog. A Job can be started manually from the dashboard, requested through the authenticated API, or created by a timezone-aware Schedule; every trigger calls the same `createRun` path. Job detail includes schedule state, structured step progress, verification, placement, immutable artifact metadata and provenance. Queue inspection exposes age, priority, waiting reason, missing capabilities, eligible workers and resource locks; searchable Run history exposes duration and selected workers. Safe cancel, retry and named-approval controls still enter through `AgentControlService`. Use **Lanes** for interactive agent work. Press `J` in the TUI for the same authoritative Job/Schedule/Run projection.

## Jobs and schedules

Repository-managed YAML manifests beneath `config/jobs/` define versioned Jobs and separate Schedules. JSON Schema validation, typed parameters, dependency checks and Action registration fail closed at load time. Jobs request semantic capabilities and resources; they never name a host. Configured resources become workers by advertising those capabilities, and Agent Control records why each worker was selected or rejected.

```bash
npm run qualify:jobs
```

The qualification Job is deliberately non-production and its twice-daily `07:00/19:00 Europe/London` Schedule is disabled. Enabling a Schedule does not grant a requested capability or approval. See [`docs/jobs-and-scheduler.md`](docs/jobs-and-scheduler.md) for the manifest contract, custom-Job example, Run states, artifact handoff, locks, retries and operator procedure.

## Configuration model

The versioned JSON schema has four independent collections plus optional output and harness-efficiency policies:

- `resources`: identity, platform, transport and semantic capabilities;
- `providers`: provider identity, API endpoint, qualification model, cost and capabilities;
- `services`: health endpoint and optional explicit start recipe;
- `lanes`: lane identity, working directory, priority and AUTO/MANUAL mode.
- `tokenAwareOutput`: provider-neutral completeness, index, artifact, retention and context-budget thresholds.
- `harnessEfficiency`: observational/enforced routing mode, verifier-evidence thresholds and configurable THIN/STANDARD/DEEP budgets. `observe` is the safe default.

Resource identity is separate from transport. A resource may be local, SSH, HTTP or Orca-backed. An SSH hostname is transport metadata, not the resource ID. Ports are configurable numbers. Optional unavailable services do not make an otherwise valid zero-provider installation fail.

For a managed Linux resource, `managedNode` adds polling/heartbeat policy, declarative protected-workload detectors, approved services, BUSY capability fences and an optional operator-reviewed runtime update target. Hardware, package tools, filesystems, optical devices, secure-overlay state and operational capabilities are discovered rather than assumed. Real endpoints and workload identifiers remain operator configuration, never core defaults.

See [`config/agent-control.example.json`](config/agent-control.example.json), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`docs/concepts.md`](docs/concepts.md). The older [`docs/architecture-v2-agnostic.md`](docs/architecture-v2-agnostic.md) remains a configuration-neutrality appendix.

## Adaptive harness

`AdaptiveHarness` assembles an execution recipe from policy-approved components. The fingerprint now includes harness profile and context strategy alongside model/provider identity. `SkillCatalog` selects only qualified skills with qualification evidence. `ToolPolicy` produces an explicit minimum grant and revalidates the lane, lease generation, ownership generation and human-owner fence at tool use. `EconomicRouter` rejects unhealthy, unqualified, incapable, over-budget, low-confidence or unapproved routes before comparing effective monetary, latency, occupancy, contention, failure/retry and quality costs.

The same task can therefore receive different scaffolding. A strongly qualified model may use a direct prompt with no extra skill; a smaller model may use a guided profile, a qualified task skill, narrower context and fewer tools. Both remain subject to the same Agent Control authority and verification policy.

Current boundaries are intentional:

- the catalog selects already-qualified skills but does not create, qualify or approve new ones;
- normal Work Queue agent dispatch is recipe-backed, persisted/inspectable and stops at `verification-pending` rather than accepting process completion;
- named control operations such as Android provisioning are explicit, scope-checked exceptions and cannot become a legacy agent fallback;
- the generic `AgentAdapter` receives only the recipe and policy gateway, but Orca/SSH CLI-internal tools are opaque to Agent Control and are not yet qualified as universally moderated tool calls;
- model-backed Job Actions are qualified through the sole `HarnessJobAgentAction` bridge; they enter through `HarnessDispatcher`, receive only policy-gated tools and stop at verification rather than treating model completion as acceptance;
- model qualification and successive halving operate on recipe fingerprints, but governed skill generation and automated recipe learning remain follow-on 3.1 work.

## Durable work and evidence

Agent Control persists hard contracts, revisioned batons, append-only events, checkpoints, Work Queue state and shared context metadata. Handoffs may include a compact baton, Git/test evidence and selected provider-neutral context sources. Git and independently reproducible tests remain authoritative; shared threads are optional read-only context and never required for recovery.

The Work Queue supports interactive, priority, background and batch work, dependencies, capability selection, data locality, quiet periods, maintenance windows, homogeneous batch leases, item-by-item commit, checkpoints, retries and low-confidence human review. The Job runtime adds reusable multi-step workflows above those atomic scheduling concepts: a durable Run ledger, timezone-aware triggers, step dependencies, resource locks, typed artifacts, bounded retries, approval waits and verification gates.

Agent completion is modeled as `CLAIMED -> EVIDENCE_COLLECTED -> VERIFIED -> ACCEPTED`. A claim cannot satisfy a verification-required task. Lane policy can require minimum-sufficient evidence such as a Git commit, diff, test/build result, file hash, API result, UI evidence, benchmark, external source or human approval. Failed required evidence blocks verification, and acceptance remains a separate explicit action.

Routing is capability-qualified and fail closed. Eligible routes may be compared using capability, provider health, reliability, monetary cost, latency, expected duration, context/tool requirements, privacy, local/GPU availability, priority, urgency and operator preference. The selected route, alternatives and plain-language rationale are stored with the lane.

Model/provider qualification already records complete model recipes including runtime, context size, chat template, prompt version, skill/tool snapshots and inference parameters. Overnight experiments use successive halving across strategy fingerprints that can also identify provider, harness profile and context strategy. A challenger must preserve verifier-gated quality before cost or fresh-token efficiency can break a tie; fewer tokens alone never promote it.

## Authority and safety

- Human takeover is unconditional and fences agent input.
- One PTY has at most one logical owner.
- Missing or stale execution identity fails closed to disconnected/recovering/unknown state.
- Provider/context failures cannot mutate leases, ownership, scheduling or PTYs.
- Recovery uses explicit configured recipes and existing credentials.
- Agent Control never stores secret material in product configuration.
- Shared URLs are attached only when already explicitly shared; creating/broadening sharing requires separate approval.
- The browser has no direct lease, scheduler, persistence or PTY-input endpoint.
- External context and provider adapters remain non-authoritative regardless of interface.

## Orca execution boundary

The execution contract is intentionally replaceable: start, status, reconnect, input, pause, resume, cancel, output, diff and cleanup. Agent Control validates task/session identity, lease generation, ownership generation, host, repository, worktree, branch and nonce before accepting recovery. Orca convenience features cannot bypass those checks through the supported adapter.

## Android

Android is one optional resource type, not a named device. The bundled Termux node advertises observed capabilities and accepts only the allow-listed read-only log observation job. Provisioning has explicit privilege, wireless-pairing and reboot approval gates. See [`android/README.md`](android/README.md).

## Validation

```bash
npm run typecheck
npm run check:bootstrap
npm run check:neutrality
npm test
npm run check
npm run qualify:jobs
npm run benchmark:token-output
npm run benchmark:harness-efficiency
git diff --check
```

The neutrality guard rejects private topology identifiers in distributable runtime, tests, documentation, filenames and examples. The audit ledger and changelog are explicit historical exceptions.

## Current limitations

- Orca remains optional and the existing execution path remains available as fallback.
- Reboot recovery is qualified only per explicitly tested environment; source support is not a universal live qualification claim.
- OpenAI ChatKit access uses official supported APIs and remains qualified only for the exact tested project/thread state recorded in provider evidence.
- ChatGPT Work and Codex shared task context remain host/reference-only unless an official read API is available.
- Windows OpenAI execution is switchable: `auto` prefers a configured Responses API key and otherwise uses official Codex non-interactive execution with the saved ChatGPT-plan login. Both the Responses API and ChatGPT-plan routes are live `SUPPORTED+QUALIFIED` through the adaptive harness and central tool gate; ChatGPT desktop-window automation remains unimplemented and untested.
- Skill proposal, security review, sandbox qualification, approval and promotion remain follow-on 3.1 work; an unqualified proposal cannot be selected by the current catalog.
- `config/implementation-status.json` is the machine-readable implementation boundary. `npm run status:implementation` renders it for inspection and `npm run check:status` fails when the generated [`docs/implementation-status.md`](docs/implementation-status.md) projection or its evidence paths are stale.
- The Job Catalog, Worker Registry, Run Ledger and web dashboard are implemented on this unreleased 3.1 branch. Model-backed Job Actions enter through `HarnessJobAgentAction`; each production provider still requires its own live qualification.
- No production deployment is performed by this repository release process.
- The events workflow is qualified only against a safe fixture target; authenticated Facebook discovery and the existing LocalWalks production publisher are not invoked or production-qualified by this source change.
- Ripgrep is the only semantic command-output adapter in this change. Other oversized command families use the generic labelled fallback until a specialised index is added. A tiny typed ripgrep request retains its structured authoritative stream and therefore can be larger than normal human-formatted `rg`; it is not compacted merely because it came from ripgrep.
- Harness-profile routing remains observational. The frozen suite proves deterministic packet/routing/verifier behaviour, not live same-model success, provider cache behaviour, latency or cost. These missing measurements remain `null`, and no profile is production-qualified by the benchmark.

The current guide is [`docs/Agent-Control-3.1.0-Operator-Guide.md`](docs/Agent-Control-3.1.0-Operator-Guide.md). Release assets include both the [Markdown guide](assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.md) and the [PDF guide](assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.pdf). The historical 3.0.1 guide remains under `assets/releases/3.0.1/`. See [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/harness-efficiency.md`](docs/harness-efficiency.md), [`docs/token-aware-command-output.md`](docs/token-aware-command-output.md), [`docs/web-dashboard.md`](docs/web-dashboard.md), [`docs/jobs-and-scheduler.md`](docs/jobs-and-scheduler.md), [`docs/dashboard-3.1-boundary-review.md`](docs/dashboard-3.1-boundary-review.md), [`docs/conceptual-integrity.md`](docs/conceptual-integrity.md) and [`docs/release-notes-3.1.0-draft.md`](docs/release-notes-3.1.0-draft.md) for the 3.1 boundary and evidence.
