# Agent Control 3.0.1

Agent Control is an infrastructure-neutral control plane for durable, multi-agent work. A lane owns its task; execution providers and models are replaceable workers. Agent Control remains authoritative for scheduling, priorities, leases, ownership, human takeover, batons, handoffs, clones, shared tasks, provider qualification, confidence routing, approvals, recovery validation and conflict policy.

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
npm run status
npm run up
npm run qualify
```

`npm start` opens the control-room TUI. `status` performs read-only health inspection. `up` starts only explicitly configured services/processes and records ownership. `down` stops only processes that the same Agent Control state directory recorded as owned.

Monitor the TUI for lanes, work queue, providers, resources, PTY ownership, context/evidence and Android status. Qualification writes timestamped JSON beneath ignored `qualification-results/`.

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

The Work Queue supports interactive, priority, background and batch work, dependencies, capability selection, data locality, quiet periods, maintenance windows, homogeneous batch leases, item-by-item commit, checkpoints, retries and low-confidence human review.

## Authority and safety

- Human takeover is unconditional and fences agent input.
- One PTY has at most one logical owner.
- Missing or stale execution identity fails closed to disconnected/recovering/unknown state.
- Provider/context failures cannot mutate leases, ownership, scheduling or PTYs.
- Recovery uses explicit configured recipes and existing credentials.
- Agent Control never stores secret material in product configuration.
- Shared URLs are attached only when already explicitly shared; creating/broadening sharing requires separate approval.

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
git diff --check
```

The neutrality guard rejects private topology identifiers in distributable runtime, tests, documentation, filenames and examples. The audit ledger and changelog are explicit historical exceptions.

## Current limitations

- Orca remains optional and the existing execution path remains available as fallback.
- Reboot recovery is qualified only per explicitly tested environment; source support is not a universal live qualification claim.
- OpenAI ChatKit access uses official supported APIs and remains qualified only for the exact tested project/thread state recorded in provider evidence.
- ChatGPT Work and Codex shared task context remain host/reference-only unless an official read API is available.
- No production deployment is performed by this repository release process.

The complete operator guide is published at `assets/releases/3.0.1/Agent-Control-3.0.1-Operator-Guide.pdf`.
