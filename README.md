# Agent Control 3.1.0

Agent Control is an infrastructure-neutral control plane for durable, multi-agent work. A lane owns its task; execution providers, models and operator interfaces are replaceable clients. Agent Control remains authoritative for scheduling, priorities, leases, ownership, human takeover, batons, handoffs, clones, shared tasks, provider qualification, confidence routing, approvals, recovery validation, verification and conflict policy.

Orca is available behind a narrow execution-provider contract. Orca may execute processes, terminals and worktrees, but it does not receive Agent Control policy authority.

## Requirements

- Node.js 20 or newer
- npm
- Git
- Bash for shell-script validation and Android helpers
- Optional: Orca, SSH, Android/Termux, and provider services when configured

No host, device, provider, port, GPU, overlay network or absolute repository path is built in.

## Install

```bash
git clone https://github.com/lozknowles/agent-control.git
cd agent-control
npm install
cp config/agent-control.example.json .agent-control/config.json
npm run check
```

Edit `.agent-control/config.json` for the installation. Runtime state and credentials remain ignored. A different path can be selected with `AGENT_CONTROL_CONFIG`. Do not put credentials in JSON; configuration names only the environment variable that supplies a credential.

With no configuration file, Agent Control starts with a safe local lane and reports infrastructure as `UNCONFIGURED`. It does not invent providers, machines or services.

## Run and monitor

```bash
npm start
npm run web
npm run status
npm run up
npm run qualify
```

`npm start` opens the control-room TUI and its embedded web client. `npm run web` runs the same control service and web dashboard without the TUI for a headless operator host; run one authoritative control-plane process per state directory. `status` performs read-only health inspection. `up` starts only explicitly configured services/processes and records ownership. `down` stops only processes that the same Agent Control state directory recorded as owned.

The TUI also starts the web dashboard on `http://127.0.0.1:4310` by default. The browser is an observer unless an operator token is explicitly configured:

```bash
export AGENT_CONTROL_WEB_OPERATOR_TOKEN="$(openssl rand -hex 32)"
npm start
```

Enter that token using **Observer mode** in the dashboard. It is retained only in the browser tab's session storage and sent as a bearer header; Agent Control does not create a browser authority cookie. Use `AGENT_CONTROL_WEB_ENABLED=0` to disable the dashboard or `AGENT_CONTROL_WEB_PORT` to select another port. Binding beyond localhost is an explicit security decision and should be placed behind authenticated TLS with a matching `AGENT_CONTROL_WEB_ALLOWED_ORIGINS` allowlist.

Monitor either interface for the same authoritative lanes, scheduler projection, providers, resources, PTY ownership, routing rationale and claim/evidence/verification state. The web terminal panel is observer-only; it never receives a PTY write primitive. Qualification writes timestamped JSON beneath ignored `qualification-results/`.

The dashboard opens on the **Jobs** catalog. A Job can be started manually from the dashboard, requested through the authenticated API, or created by a timezone-aware Schedule; every trigger calls the same `createRun` path. Job detail includes schedule state, structured step progress, verification, placement, immutable artifact metadata and provenance. Queue inspection exposes age, priority, waiting reason, missing capabilities, eligible workers and resource locks; searchable Run history exposes duration and selected workers. Safe cancel, retry and named-approval controls still enter through `AgentControlService`. Use **Lanes** for interactive agent work. Press `J` in the TUI for the same authoritative Job/Schedule/Run projection.

## Jobs and schedules

Repository-managed YAML manifests beneath `config/jobs/` define versioned Jobs and separate Schedules. JSON Schema validation, typed parameters, dependency checks and Action registration fail closed at load time. Jobs request semantic capabilities and resources; they never name a host. Configured resources become workers by advertising those capabilities, and Agent Control records why each worker was selected or rejected.

```bash
npm run qualify:jobs
```

The qualification Job is deliberately non-production and its twice-daily `07:00/19:00 Europe/London` Schedule is disabled. Enabling a Schedule does not grant a requested capability or approval. See [`docs/jobs-and-scheduler.md`](docs/jobs-and-scheduler.md) for the manifest contract, custom-Job example, Run states, artifact handoff, locks, retries and operator procedure.

## Configuration model

The versioned JSON schema has four independent collections:

- `resources`: identity, platform, transport and semantic capabilities;
- `providers`: provider identity, API endpoint, qualification model, cost and capabilities;
- `services`: health endpoint and optional explicit start recipe;
- `lanes`: lane identity, working directory, priority and AUTO/MANUAL mode.

Resource identity is separate from transport. A resource may be local, SSH, HTTP or Orca-backed. An SSH hostname is transport metadata, not the resource ID. Ports are configurable numbers. Optional unavailable services do not make an otherwise valid zero-provider installation fail.

See [`config/agent-control.example.json`](config/agent-control.example.json) and [`docs/architecture-v2-agnostic.md`](docs/architecture-v2-agnostic.md).

## Durable work and evidence

Agent Control persists hard contracts, revisioned batons, append-only events, checkpoints, Work Queue state and shared context metadata. Handoffs may include a compact baton, Git/test evidence and selected provider-neutral context sources. Git and independently reproducible tests remain authoritative; shared threads are optional read-only context and never required for recovery.

The Work Queue supports interactive, priority, background and batch work, dependencies, capability selection, data locality, quiet periods, maintenance windows, homogeneous batch leases, item-by-item commit, checkpoints, retries and low-confidence human review. The Job runtime adds reusable multi-step workflows above those atomic scheduling concepts: a durable Run ledger, timezone-aware triggers, step dependencies, resource locks, typed artifacts, bounded retries, approval waits and verification gates.

Agent completion is modeled as `CLAIMED -> EVIDENCE_COLLECTED -> VERIFIED -> ACCEPTED`. A claim cannot satisfy a verification-required task. Lane policy can require minimum-sufficient evidence such as a Git commit, diff, test/build result, file hash, API result, UI evidence, benchmark, external source or human approval. Failed required evidence blocks verification, and acceptance remains a separate explicit action.

Routing is capability-qualified and fail closed. Eligible routes may be compared using capability, provider health, reliability, monetary cost, latency, expected duration, context/tool requirements, privacy, local/GPU availability, priority, urgency and operator preference. The selected route, alternatives and plain-language rationale are stored with the lane.

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
git diff --check
```

The neutrality guard rejects private topology identifiers in distributable runtime, tests, documentation, filenames and examples. The audit ledger and changelog are explicit historical exceptions.

## Current limitations

- Orca remains optional and the existing execution path remains available as fallback.
- Reboot recovery is qualified only per explicitly tested environment; source support is not a universal live qualification claim.
- OpenAI ChatKit access uses official supported APIs and remains qualified only for the exact tested project/thread state recorded in provider evidence.
- ChatGPT Work and Codex shared task context remain host/reference-only unless an official read API is available.
- No production deployment is performed by this repository release process.
- The events workflow is qualified only against a safe fixture target; authenticated Facebook discovery and the existing LocalWalks production publisher are not invoked or production-qualified by this source change.

The 3.0.1 infrastructure-neutral operator guide remains available at `assets/releases/3.0.1/Agent-Control-3.0.1-Operator-Guide.pdf`. See [`docs/web-dashboard.md`](docs/web-dashboard.md), [`docs/jobs-and-scheduler.md`](docs/jobs-and-scheduler.md), [`docs/dashboard-3.1-boundary-review.md`](docs/dashboard-3.1-boundary-review.md), [`docs/conceptual-integrity.md`](docs/conceptual-integrity.md) and [`docs/release-notes-3.1.0-draft.md`](docs/release-notes-3.1.0-draft.md) for the 3.1 additions and qualification boundary.
