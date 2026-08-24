# Agent Control 3.0.x

Agent Control is an infrastructure-neutral, policy-controlled adaptive harness for durable work by heterogeneous agents and models. Its executable harness core composes a task-appropriate worker, provider/model route, prompt profile, minimum qualified skills, restricted tools, context strategy, runtime settings, authority snapshot, resource limits and verification/escalation policy into a fingerprinted execution recipe.

A lane owns its task; recipes, agents, models, skills, tools and execution providers are replaceable and remain below the control boundary. Agent Control remains authoritative for scheduling, priorities, leases, ownership, unconditional human takeover, batons, handoffs, clones, shared tasks, provider qualification, routing, approvals, recovery validation and conflict policy. The recipe builder and economic router are integrated as an experimental 3.0.x core; automatic scheduler-to-recipe-to-provider dispatch and the skill lifecycle are 3.1 work, not released 3.0.1 claims.

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

See [`config/agent-control.example.json`](config/agent-control.example.json), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`docs/concepts.md`](docs/concepts.md). The older [`docs/architecture-v2-agnostic.md`](docs/architecture-v2-agnostic.md) remains a configuration-neutrality appendix.

## Adaptive harness

`AdaptiveHarness` assembles an execution recipe from policy-approved components. `SkillCatalog` selects only qualified skills with qualification evidence. `ToolPolicy` produces an explicit minimum grant and revalidates the lane, lease generation, ownership generation and human-owner fence at tool use. `EconomicRouter` rejects unhealthy, unqualified, incapable, over-budget, low-confidence or unapproved routes before comparing effective monetary, latency, occupancy, contention, failure/retry and quality costs.

The same task can therefore receive different scaffolding. A strongly qualified model may use a direct prompt with no extra skill; a smaller model may use a guided profile, a qualified task skill, narrower context and fewer tools. Both remain subject to the same Agent Control authority and verification policy.

Current limits are intentional:

- the catalog selects already-qualified skills but does not create, qualify or approve new ones;
- the general tool gate is executable, but every execution adapter must still be wired to use it before end-to-end enforcement can be claimed;
- the 3.0.x scheduler does not automatically persist or dispatch the new recipe;
- model qualification and successive-halving operate on recipe fingerprints, but automated learning into a durable recipe catalog remains 3.1 work.

## Durable work and evidence

Agent Control persists hard contracts, revisioned batons, append-only events, checkpoints, Work Queue state and shared context metadata. Handoffs may include a compact baton, Git/test evidence and selected provider-neutral context sources. Git and independently reproducible tests remain authoritative; shared threads are optional read-only context and never required for recovery.

The Work Queue supports interactive, priority, background and batch work, dependencies, capability selection, data locality, quiet periods, maintenance windows, homogeneous batch leases, item-by-item commit, checkpoints, retries and low-confidence human review.

Model/provider qualification already records complete model recipes including runtime, context size, chat template, prompt version, skill/tool snapshots and inference parameters. Overnight experiments use successive halving across those fingerprints. The adaptive recipe adds worker, provider, context, authority, limits, verification and escalation around that existing qualification unit.

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
- Skill proposal, security review, sandbox qualification, approval and promotion are planned for 3.1; an unqualified proposal cannot be selected by the current catalog.
- Automatic Job/Scheduler execution-recipe construction, a formal worker registry, run ledger and web dashboard are 3.1 boundaries.
- No production deployment is performed by this repository release process.

The complete operator guide is published at `assets/releases/3.0.1/Agent-Control-3.0.1-Operator-Guide.pdf`.
