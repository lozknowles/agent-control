# Agent Control

Agent Control is a terminal mission-control UI and durable control plane for running multiple AI-agent work lanes without tying a task to one model, one process, or one conversation.

The core idea is simple: **the lane owns the work; models are replaceable workers**. Each lane keeps a durable contract and a revisioned baton so work can be paused, handed to another lane, resumed after restart, delegated, cloned, or eventually substituted to another provider/model/profile without losing the authoritative task state.

> Status: active prototype. The scheduler, contracts/batons, leases, shared context, PTY discovery/control model, provider registry and qualification primitives are implemented and tested. Real agent execution adapters and safe PTY write attachment are still being integrated. Do not treat the current prototype as a production shell multiplexer.

## What Agent Control is for

Use Agent Control when several pieces of work are happening at once and you want one place to see and control them: coding, research, systems work, benchmarks, long-running investigations, or combinations of these. A lane can remain on a local model, ask another lane for bounded help, hand its complete baton to another worker, request substitution to a stronger model/provider, or pause at a recoverable boundary.

The design deliberately separates five things that are often conflated in agent tools:

```text
LANE → CONTRACT → BATON → PROVIDER/MODEL RECIPE → PROCESS / PTY
```

A terminal session is therefore not the task, a model is not the task, and a chat transcript is not the task.

## Quick start

Requirements: a recent Node.js/npm installation and a terminal large enough to display the dashboard. Linux is currently the primary platform for live PTY discovery.

```bash
npm install
npm run check
npm start
```

`npm run check` runs TypeScript validation and the control-plane tests. Run it after pulling a new development revision before launching the TUI.

State is persisted under `.agent-control/` by default. To use another location:

```bash
AGENT_CONTROL_STATE_DIR=/path/to/state npm start
```

## Dashboard

The TUI follows a mission-control layout:

- **Top telemetry** — active/waiting lane counts, active model/reasoning/context and PTY state.
- **Lane cards** — independently scrollable lane workspaces showing state, task, model, working directory, baton health and agent/activity output.
- **Agent Activity Log** — cross-lane control-plane events.
- **Lane Overview** — compact status for all lanes.
- **Messages / Active Baton** — goal, baton status and next action for the selected lane.
- **Tools / Providers / Metrics** — working directory, provider health, lease/control state, context and PTY counts.
- **Command bar** — sends a task/command to the selected lane once an execution adapter is connected.

The browser-style mock-up in `docs/ui-target.md` is the information-design target; Blessed reproduces its hierarchy and keyboard workflow rather than browser-only decoration.

## Keyboard controls

The current dashboard exposes the following primary controls. Development branches may add or temporarily move a key, so the footer shown by the running TUI is authoritative.

| Key | Action |
| --- | --- |
| `Tab` / `Shift-Tab` | Move between lanes |
| `1`–`9` | Jump directly to a lane when supported by the current layout |
| arrows / `PgUp` / `PgDn` / mouse wheel | Scroll a focused lane or modal |
| `Enter` or `I` | Focus the command input |
| `A` | Put the active lane in AUTO mode |
| `M` | Put the active lane in MANUAL mode |
| `B` | Inspect the active baton |
| `H` | Handoff workflow |
| `C` | Clone a baton/work context where exposed |
| `S` / `V` | Create/view shared task context |
| `T` | Discover and inspect live Linux PTY sessions |
| `X` | Human takeover of an assigned PTY's Agent Control ownership record |
| `R` | Request agent/provider/model substitution |
| `G` | Probe configured provider health |
| `P` | Pause/resume at a checkpoint |
| `Z` | Zoom/unzoom a lane where enabled |
| `Q` / `Ctrl-C` | Persist and quit |

### AUTO versus MANUAL

**MANUAL** means Agent Control does not automatically execute agent handoffs/substitutions. **AUTO** allows policy-approved low-risk routing decisions. High-risk boundaries remain approval points; AUTO is not intended to mean unrestricted autonomy.

Lane priority and model/provider locks are control-plane policy, not suggestions to the model.

## Contracts and batons

A **contract** is durable task authority: objective/goal, constraints, acceptance expectations, working directory, priority, mode and related policy. It should survive agent and process replacement.

A **baton** is the resumable working state: summary/status, completed work, evidence, changes, open questions, next action, model/reasoning identity and revision. Agents should update the baton as meaningful work occurs rather than relying on a giant conversation transcript as recovery state.

This enables:

```text
Qwen works → checkpoint → SUBSTITUTE → stronger model receives baton
                                      ↓
                               completes hard part
                                      ↓
                            SUBSTITUTE back to Qwen
```

### Handoff versus clone

**Handoff** transfers ownership of the task/baton to another lane and leaves the source at a safe boundary. **Clone** copies transferable context so another lane can work on a bounded related problem while the source continues. Shared context is used when two or more lanes need to exchange structured findings without merging their entire transcripts.

## Self-routing decisions

The control model defines five agent decisions:

- `ACCEPT` — continue the current work.
- `DELEGATE` — retain ownership but ask another lane/agent for bounded help.
- `SUBSTITUTE` — checkpoint and request a better provider/model/profile for the same lane/task.
- `YIELD` — checkpoint and release resources because continuing is not useful now.
- `COMPLETE` — acceptance conditions are satisfied and the lane can close/idle.

Substitution and delegation are represented as explicit requests and can be approval-gated. The model does not silently replace itself.

## PTY discovery and terminal sessions

On Linux, Agent Control scans `/proc` for same-user processes attached to `/dev/pts/*` terminals. It records PID, command, cwd and recovery information and attempts to identify the terminal foreground process group.

Press `T` to refresh and inspect discovered sessions.

A discovered PTY is assigned automatically **only when its cwd genuinely belongs beneath a configured lane working directory**. Otherwise it remains `UNASSIGNED`. This prevents an unrelated shell, benchmark, editor or project from silently becoming part of another lane.

Current PTY access states are:

- `observe` — read/monitor intent;
- `write` — permitted interactive input intent;
- `own` — exclusive Agent Control ownership intent.

The registry enforces one logical owner and supports agent-to-agent transfer plus unconditional human takeover. At the current prototype stage, PTY discovery and ownership are deliberately separated from raw keystroke injection. `X` changes Agent Control's ownership record; it must not be interpreted as proof that the OS terminal has been safely seized. Safe attach/write is a later adapter layer.

Recovery classes are:

- **reattachable** — the process/session is still alive;
- **reconstructable** — process state is gone but cwd, command, baton, transcript tail and restart recipe can recreate the working position;
- **ephemeral** — no reliable restoration is promised.

## Providers, models, profiles and recipes

Agent Control does not treat a model name as sufficient identity. Routing is intended to use:

```text
Provider → Model → Profile → Recipe
```

A provider describes how the worker is reached. A model is the underlying model identity. A profile describes its role (for example CODER, RESEARCH or TRIAGE). A recipe pins the details needed to reproduce behaviour: provider, model, reasoning, prompt version, tools, skills and eventually inference/runtime parameters.

This allows cheap substitutions such as `Qwen / RESEARCH → Qwen / CODER` as well as provider changes such as `Qwen local → ChatGPT Window`.

### Built-in provider proof cases

The current registry includes:

- `llama-local` — local llama.cpp-style provider, currently expected around `127.0.0.1:8080`;
- `chatgpt-window` — opt-in browser-bridge Responses provider at `127.0.0.1:8767/v1`.

Press `G` to probe provider health. Health is displayed as healthy, degraded, offline or unknown. An unavailable provider should cause a clear routing/connection failure rather than silent fallback.

## ChatGPT Window provider

The intended ChatGPT Window integration keeps Codex/provider semantics clean rather than disguising the browser bridge as Ollama.

```text
Agent Control
    │
    ▼
Codex / Responses client
    │  POST /v1/responses
    ▼
chatgpt-window-responses :8767
    │
    ▼
chatgpt-window bridge :8766
    │
    ▼
Chrome / ChatGPT
```

A Codex configuration can opt in through its generic Responses provider mechanism, for example:

```toml
[model_providers.chatgpt-window]
name = "ChatGPT Window"
base_url = "http://127.0.0.1:8767/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false

[profiles.chatgpt-window]
model_provider = "chatgpt-window"
model = "chatgpt-window"
```

The adapter should keep persistent Codex-thread → ChatGPT-conversation mappings, serialize concurrent work per browser conversation, support streaming/non-streaming text and attachments, translate reasoning levels, and surface browser/bridge/usage-limit errors explicitly.

Tool execution must remain on the Codex/control side. The browser model may emit a validated function-call envelope, but the adapter must never execute arbitrary tools itself. Codex's existing approval, sandbox, MCP and policy machinery remains authoritative and tool results are returned to the mapped ChatGPT conversation.

ChatGPT Window is deliberately an **optional provider**. Agent Control must remain useful when it is offline.

## Provider health

Provider probes use the configured endpoint's health surface. In the current prototype, the Responses adapter is expected to expose `/health` beside `/v1`. The dashboard probes providers on startup and `G` forces a refresh.

Typical display:

```text
+ PROVIDERS
● llama.cpp local   healthy    HTTP 200 8ms
● ChatGPT Window    healthy    HTTP 200 12ms
```

or:

```text
● ChatGPT Window    offline    fetch failed
```

Provider health is a routing input. A recipe cannot be considered runnable when its provider is offline.

## Model qualification and overnight optimisation

The benchmark unit is a **recipe**, not just model weights. A reproducible candidate should pin model SHA/name, quantisation where relevant, runtime/version, context size, chat template, prompt version, skills, tools and inference parameters.

Qualification lifecycle:

```text
DISCOVERED → BENCHMARKING → SHADOW → CANDIDATE → ACTIVE → PREFERRED → DEPRECATED
```

Current routing choices are champions; new models and re-tuned existing/free models are challengers. Overnight exploration uses successive stages:

```text
cheap tests → capability tests → historical baton replay → holdout → shadow
```

Weak configurations are stopped early so compute concentrates on promising variants. Prompt/parameter tuning must not see the final holdout tasks. Promotion should require unseen-task evidence and remain reversible by restoring the previous routing policy.

Useful scoring dimensions include quality, completion rate, latency, substitutions/handoffs, resource use, availability and provider constraints. This allows the system to learn that a powerful browser/cloud provider may be best for a difficult reasoning stage while a resident local model remains the better default worker.

## Persistence, pause and restart

Control-plane state is written atomically and important actions are appended to an event log. `P` creates a safe pause/resume checkpoint. The goal is that a machine or controller can restart and recover contracts/batons without pretending a dead process is still alive.

Hard state (contracts, routing authority and accepted checkpoints) and soft/reconstructable state (baton progress, PTY metadata, transcript tails and restart recipes) should remain distinguishable.

## Safety and authority boundaries

Agent Control is intentionally conservative around control transfer:

- human takeover wins over agent ownership;
- unrelated PTYs stay unassigned;
- one PTY has at most one logical owner;
- high-risk handoffs/substitutions remain approval-gated;
- browser/provider adapters do not bypass Codex/tool sandbox policy;
- provider failure must not silently mutate the selected recipe;
- benchmark promotion must be reproducible and reversible;
- `main` should receive only locally validated integration work.

Before enabling future PTY write injection, test terminal selection, foreground-process identity, ownership, cancellation and recovery on disposable sessions first.

## Development and validation

```bash
npm install
npm run typecheck
npm test
# or both:
npm run check
```

The repository uses Node's test runner through `tsx`. Tests currently cover scheduler priority, leases, handoff/clone, shared context, PTY ownership/control transfer, Linux PTY discovery, dashboard view models, self-routing, overnight candidate pruning and provider registry behaviour.

For TUI changes, use two gates:

1. `npm run check` must pass.
2. Run `npm start` on the target terminal and visually exercise focus, scrolling, modals and keyboard controls. Terminal geometry and font behaviour cannot be fully proven by unit tests.

## Architecture overview

```text
                         ┌──────────────────────┐
                         │        TUI           │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │    CONTROL PLANE     │
                         │ contracts / batons  │
                         │ scheduler / leases  │
                         │ shared context      │
                         │ checkpoints         │
                         │ self-routing        │
                         └──────┬───────┬───────┘
                                │       │
                    ┌───────────▼─┐   ┌─▼──────────────┐
                    │ PTY registry │   │ ProviderRegistry│
                    └──────┬───────┘   └──────┬─────────┘
                           │                  │
                     Linux /proc       AgentRecipe
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                     llama.cpp          ChatGPT Window       future CLI/API
                          │                   │                   │
                          └────────── agents / models ────────────┘
```

See `ARCHITECTURE.md`, `docs/architecture-v2.md` and `docs/ui-target.md` for deeper design notes.

## Current limitations / roadmap

The project is deliberately being proven in layers. Major remaining work includes real agent execution adapters, safe PTY observe/write attachment, interactive assignment of `UNASSIGNED` PTYs, persistent provider/recipe selection per lane, a complete substitution chooser, richer provider/model metrics, the ChatGPT Window end-to-end Responses request proof, persisted experiment results, scheduled overnight runners, and further TUI refinement toward the visual target.

Until those pieces are implemented, labels such as provider ownership or PTY ownership describe **Agent Control state**, not capabilities that have not yet been wired at the OS/provider layer.

## Design principle

Agent Control is not trying to keep one AI alive forever. It is trying to keep **the work** alive.

A good worker should be able to continue, recruit help, hand over, substitute itself, yield resources, or complete the contract. Models, prompts and providers can improve over time; the contract, baton, evidence and routing history provide the continuity that lets the system exploit those improvements safely.
