# Agent Control

Agent Control is a terminal mission-control UI and durable control plane for running multiple AI-agent work lanes without tying a task to one model, one process, or one conversation.

The core idea is simple: **the lane owns the work; models are replaceable workers**. Each lane keeps a durable contract and revisioned baton so work can pause, hand off, resume after restart, delegate, clone, or substitute providers without losing authoritative state.

> **2.0 development status:** the control plane, capability resolver, contracts/batons, leases, PTY discovery/ownership model, provider registry, durable Work Queue, batching/preemption/persistence, queue telemetry, cross-platform qualification harness, Work Queue TUI and allow-listed Pixel Android node recovery are implemented. Physical Pixel recovery has been fault-injection qualified. Raw PTY write attachment and general-purpose execution adapters remain intentionally incomplete.

## Quick start

```bash
npm install
npm run check
npm start
```

`npm run check` runs TypeScript validation plus core, control and UI tests.

For the live distributed qualification matrix:

```bash
npm run qualify
```

Qualification separates provider correctness from latency. A correct but slow ChatGPT Window response is reported as a latency observation rather than falsely marking the provider unavailable.

State is persisted beneath `.agent-control/` by default. Runtime state, qualification output, credentials and node modules are excluded from source control.

## Control-room TUI

The Blessed TUI currently presents:

- independently scrollable work lanes with contracts and baton health;
- Agent Activity Log;
- Lane Overview and active baton;
- **Work Queue** backlog, ready/review/retry counts, workload classes, oldest age, throughput/drain estimate and batch groups;
- resource/provider status including Pixel lifecycle;
- live Linux PTY discovery;
- provider health and deterministic ChatGPT Window proof;
- queue detail showing work state, batch identity, resource claims and checkpoints.

Current footer keys are authoritative. Important 2.0 controls include:

| Key | Action |
| --- | --- |
| `Tab` | Select next lane |
| `I` / `Enter` | Command input |
| `T` | Inspect live PTYs |
| `G` | Probe providers |
| `Y` | Prove ChatGPT Window Responses roundtrip |
| `W` | Work Queue detail |
| `X` | Probe Pixel lifecycle |
| `Z` | Ensure/recover Pixel node using the allow-listed recovery recipe |
| `A` | Toggle Pixel recovery MANUAL/AUTO mode |
| `R` | Request capability/provider substitution |
| `P` | Pause/resume checkpoint |
| `Q` / `Ctrl-C` | Persist and quit |

## Durable work and scheduling

Agent Control separates interactive lane work from repetitive/background work. The Work Queue supports:

- `interactive`, `priority`, `background` and `batch` classes;
- dependency blocking;
- deadlines and earliest-start boundaries;
- capability-based resource selection;
- resource load/data-locality scoring;
- resource budgets and maintenance windows;
- quiet-period scheduling for background/batch work;
- homogeneous batch leases;
- item-by-item batch commit;
- checkpoint/yield and restart persistence;
- interactive preemption of preemptible background work;
- retry limits;
- low-confidence routing to human review.

The scheduler selects work and resources before mutating queue state, avoiding double-claim/accounting behavior during batch formation.

## Queue observability and latency telemetry

The control plane emits traceable queue snapshots and coordinator decisions. Metrics include backlog by class/status, ready count, oldest queued age, review/retry counts, batch sizes, resource utilisation, observed throughput and estimated drain time.

Provider and transport telemetry records latency distributions rather than treating latency as a binary health result. This lets routing distinguish **healthy-but-slow** from unavailable.

## Pixel Android resource and self-recovery

The Pixel resource advertises proven capabilities rather than generic machine authority:

```text
platform.android
device.physical
harness.termux
harness.codex
observe.android.logcat
```

The lifecycle model distinguishes:

```text
OFFLINE
REACHABLE
SSH-READY
NODE-DEGRADED
NODE-READY / forward reconnecting
FORWARD-READY
CAPABILITY-READY
RECOVERY-FAILED
```

Recovery is deliberately narrow. Agent Control may execute only the known Pixel node-start recipe over the authenticated SSH path. It does **not** expose arbitrary shell execution, regenerate credentials, or recreate a healthy SSH forward.

Recovery is health-authoritative and idempotent: requesting recovery while healthy is a no-op; if the node is absent it is started detached from the SSH session; Pixel-local and forwarded health are then independently verified. A surviving forward is reused.

On 2026-08-19 this path was qualified on a physical Pixel 8 Pro by deliberately killing the healthy node, observing `NODE-DEGRADED`, recovering through the TUI, obtaining a new node PID, reusing the existing SSH forward, restoring `/health`, and restoring authenticated `/v2/resource` capability advertisement. See `docs/evidence/pixel-self-recovery-qualified-20260819.md`.

## Cross-platform qualification

The current live qualification harness can prove:

- local TypeScript/tests;
- Codex present on hpubuntu;
- Pixel node health;
- Pixel capability resolution and an allowed Android observation job;
- ChatGPT Window advertised health;
- real ChatGPT Window Responses functional roundtrip;
- ChatGPT Window latency classification;
- Sentinel remote resource reachability.

A post-recovery seven-gate qualification passed on 2026-08-19. Earlier 2.0 qualification evidence and later physical recovery evidence are retained under `docs/evidence/`.

## Core architecture

```text
LANE -> CONTRACT -> BATON -> CAPABILITY REQUEST
                              |
                    +---------+----------+
                    |                    |
                Work Queue          direct lane work
                    |
              Coordinator
                    |
          Capability Resolver
                    |
       Resource / Provider selection
          |        |        |        |
      hpubuntu   Pixel   Sentinel   ChatGPT Window
```

A terminal session is not the task, a model is not the task, and a chat transcript is not the task. Durable contracts, batons, queue checkpoints and evidence provide continuity while workers and resources change.

## PTYs and authority

Linux PTYs are discovered from `/proc` and only associated with a lane when the cwd genuinely belongs to that lane. The registry models observe/write/own intent, exclusive logical ownership, transfer and unconditional human takeover. Discovery/ownership is deliberately separate from raw keystroke injection; the current prototype must not be treated as a production shell multiplexer.

## Providers and ChatGPT Window

Provider identity is separate from model/profile/recipe identity. Built-in proof cases include local llama.cpp-style resources and the opt-in ChatGPT Window Responses provider. Tool execution remains on the Codex/control side; the browser bridge must not bypass Codex approval/sandbox policy.

ChatGPT Window qualification uses a fast advertised-health check plus a real functional Responses roundtrip. The functional timeout is intentionally longer than the latency warning threshold so a 10–20 second correct response can be classified `SLOW` without being declared dead.

## Safety boundaries

Agent Control remains conservative around authority:

- human takeover wins;
- unrelated PTYs stay unassigned;
- one PTY has at most one logical owner;
- provider failure does not silently mutate recipes;
- high-risk routing remains approval-gated;
- Pixel recovery is allow-listed and fails closed;
- existing credentials are reused, never generated by recovery;
- runtime/qualification evidence containing secrets must not be committed;
- benchmark promotion must be reproducible and reversible.

## Development and validation

```bash
npm run typecheck
npm test
npm run check
npm run qualify
```

For TUI changes, require both automated checks and a real terminal visual/control smoke test. For physical recovery, use the bounded procedure in `TEST-TONIGHT.md` and preserve evidence without credentials.

## Further documentation

See `ARCHITECTURE.md`, `docs/architecture-v2.md`, `docs/ui-target.md`, `TODO.md`, `TEST-TONIGHT.md`, and `docs/evidence/`.

## Design principle

Agent Control is not trying to keep one AI alive forever. It is trying to keep **the work** alive.

Workers should be able to continue, recruit help, hand over, substitute, yield resources, recover at known boundaries, or complete the contract while durable state preserves continuity.
