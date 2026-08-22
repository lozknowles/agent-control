# Agent Control 3.0 — AGTX pre-freeze architecture review

Date: 2026-08-21

Upstream reviewed: `fynnfluegge/agtx` (`main`).

## Decision

Do **not** turn Agent Control into an AGTX clone and do **not** make tmux, a worktree, a model session, or a kanban task the durable unit of work.

Keep the existing Agent Control invariant:

> **The lane owns the work; workers, sessions, terminals, providers and hosts are replaceable.**

AGTX is a strong reference implementation for the execution/session layer beneath that invariant. Agent Control 3.0 should adopt its proven operational patterns where they strengthen the control plane, while retaining contracts, batons, leases, capability routing, shared tasks, restart recovery and cross-host scheduling as the authoritative layer.

## What AGTX proves well

AGTX currently provides:

- one git worktree per task;
- one persistent tmux window/session per task;
- inline scrollable pane inspection plus full-screen attach;
- agent switching across workflow phases;
- a dedicated tmux server and deterministic project/session/window naming;
- pane capture, pane current-command inspection, resizing, literal key sending and bracketed paste;
- a testable `TmuxOperations` abstraction with mock support;
- SQLite/WAL-backed project/task state;
- queued transition requests rather than allowing an orchestrator to mutate UI/runtime state directly;
- MCP tools for task creation, transitions, conflict checks, pane reads and sending messages to agents;
- non-destructive merge-conflict checks before integration;
- task dependencies and batch task creation;
- explicit escalation to the human when an agent stalls;
- plugin-defined phase workflows;
- multi-project indexing/dashboard;
- brainstorm/sweep capture from a live agent conversation into durable tasks.

These are useful implementation patterns, not a replacement architecture.

## Existing Agent Control advantages that MUST survive 3.0

The 2.0 branch already has concepts AGTX does not make its primary durable abstraction:

- `HardContract` with goal, constraints, cwd, priority, mode, capability request and resource/model locks;
- revisioned `Baton` carrying progress, hypothesis, evidence, changes, next action and open questions;
- exclusive expiring lane leases;
- AUTO/MANUAL lane scheduling by priority;
- handoff and clone semantics independent of a particular terminal session;
- shared tasks spanning lanes;
- capability/resource/provider separation;
- durable workspace/checkpoint/event state;
- work queue, executor, batching, preemption and restart persistence;
- host/resource routing across hpubuntu, Pixel, Sentinel and provider resources;
- human authority over PTYs.

3.0 must therefore treat AGTX-like sessions as **executors attached to lanes**, not as lanes themselves.

## 3.0 target model

```text
GOAL / PROJECT
    |
    +-- durable work graph
            |
            +-- LANE -----------------------------------+
            |    |                                      |
            |    +-- Hard Contract                      |
            |    +-- Baton / evidence                   |
            |    +-- Lease                              |
            |    +-- Shared context links               |
            |    +-- Resource/capability request        |
            |                                           |
            +--> EXECUTION BINDING (replaceable)        |
                   |                                    |
                   +-- host                             |
                   +-- provider/model                   |
                   +-- harness                          |
                   +-- terminal backend                 |
                   |      +-- tmux                      |
                   |      +-- PTY                       |
                   |      +-- remote node               |
                   +-- repo/worktree                    |
                   +-- process/session identity         |
                   +-- observed health                  |
                                                        |
            +<------------ recovery/rebind -------------+
```

A binding may disappear. The lane must remain resumable from durable state.

## Adopt from AGTX for 3.0

### 1. Terminal backend interface

Introduce a backend boundary comparable to AGTX's testable tmux operations instead of letting terminal details leak into scheduler logic.

Proposed interface responsibilities:

- create/attach/detach execution session;
- exists/health/current-command;
- capture recent output/history;
- safe paste/send input;
- resize;
- terminate;
- enumerate/reconcile sessions after restart.

Implement `pty` and `tmux` backends behind the same interface. Keep raw write authority approval-gated and human takeover unconditional.

### 2. First-class execution binding

Persist a lane's current runtime attachment separately from the contract/baton:

```text
ExecutionBinding
  laneId
  bindingId
  hostId
  providerId
  modelId/profile
  harness
  terminalBackend
  terminalSessionId
  pid/processIdentity
  repo
  worktreePath
  branch
  baseSha
  startedAt
  lastObservedAt
  health
  generation
```

Never copy these fields into the hard contract as authoritative work state.

### 3. Managed worktrees

Add an optional worktree manager for coding lanes:

- deterministic lane worktree and branch names;
- record base SHA at creation;
- never assume a clean tree;
- detect external mutation;
- virtual/non-destructive merge-conflict check before integration;
- preserve worktree on failure/restart;
- explicit cleanup only after durable completion/integration evidence.

Worktrees are an execution resource, not the task.

### 4. Command/paste and pane observation

Borrow the operational lesson from AGTX: multi-line input should use a paste/buffer path rather than pretending every prompt is a sequence of keystrokes. Observation and write authority remain separate Agent Control capabilities.

### 5. Queued control requests

External orchestrators/MCP clients should submit intent into a durable command/transition queue. The control plane validates lease, state, authority and invariants before applying it. Do not let MCP calls directly mutate lane/runtime state.

### 6. Agent stall detection and escalation

Use terminal/output observation plus baton freshness:

- agent/session alive but baton stale;
- no meaningful output for configured interval;
- repeated semantic outcome fingerprint;
- waiting for user input;
- process exited while contract incomplete.

Possible actions: nudge, rebind/restart, substitute worker, handoff, or escalate to human. Never infer completion solely from terminal idleness.

### 7. Multi-project index

3.0 should index projects/workspaces globally while keeping each workspace's durable state independently recoverable. The global dashboard is a view/index, not the source of truth.

### 8. Conversation-to-work capture

Add an explicit capture/decompose operation analogous to AGTX Sweep, but emit Agent Control contracts/work items rather than opaque prompts. Human confirmation remains the boundary before creating executable work.

### 9. Workflow recipes/plugins

Retain provider/model independence while allowing optional workflow recipes such as:

```text
research -> implement -> verify -> review -> integrate
```

A phase may request capabilities rather than name a vendor. A user may lock a provider/model when required.

## Do NOT copy from AGTX as architecture

- Do not equate task = tmux window.
- Do not rely on preserved chat history as the recovery mechanism.
- Do not require one worktree for non-coding lanes.
- Do not make project-level agent selection the only routing scope.
- Do not make kanban status the authoritative representation of execution state.
- Do not let orchestrator convenience bypass leases/capability/authority checks.
- Do not make tmux mandatory; it is one execution backend.
- Do not use terminal output as the durable baton.

## Restart/recovery contract for 3.0

The critical 3.0 differentiator is deterministic reconciliation after process or machine loss.

On startup:

1. Load durable contracts, batons, queue items, leases, bindings and event history.
2. Expire/validate leases using persisted generation and observed runtime identity.
3. Discover terminal sessions/processes/worktrees/resources without mutating them.
4. Reconcile each binding as `ATTACHED`, `ORPHANED`, `MISSING`, `CONFLICTED` or `UNKNOWN`.
5. Validate repository/worktree HEAD and dirty state against the last evidence.
6. Validate provider/host capability health.
7. For AUTO lanes, create a recovery proposal from the hard contract + latest baton + evidence.
8. Reattach when identity is proven; otherwise create a new binding generation and resume from the baton.
9. Never replay arbitrary old keystrokes as recovery.
10. Require human review for ambiguous authority, dirty-tree conflicts, destructive operations or contradictory evidence.

This is stronger than session persistence: the work survives even when the session does not.

## Shared work and teams

Keep shared context explicit. Multiple lanes may contribute to one shared task, but each contribution must identify lane, revision/evidence and role. Add dependency edges and artifact references rather than merging full conversations.

A future team is therefore a graph of leased lanes around shared work, not a single giant multi-agent transcript.

## 3.0 implementation order

### Foundation

1. Freeze and tag the qualified 2.0 baseline before invasive changes.
2. Introduce `ExecutionBinding` and reconciliation state without changing scheduler semantics.
3. Introduce `TerminalBackend` abstraction and put existing PTY behavior behind it.
4. Add tmux backend using a dedicated Agent Control tmux server.
5. Add worktree manager and non-destructive conflict checking.

### Control protocol

6. Add durable command/transition queue.
7. Add execution observation/stall detector.
8. Add recovery/rebind state machine and binding generations.
9. Add project index and multi-project TUI view.
10. Expose a narrow MCP/control API over durable intents.

### Higher-level orchestration

11. Add workflow recipes expressed in capability requirements.
12. Add capture/decompose-to-contract flow.
13. Add team/shared-work dependency graph UX.
14. Add automatic substitution/handoff policy with explicit risk gates.

## Required tests before 3.0 can be called restart-safe

- kill an agent process, preserve lane, rebind and continue from baton;
- kill tmux server, reconstruct a new binding without losing contract state;
- reboot host with dirty coding worktree and prove no duplicate/destructive execution;
- stale lease cannot retain authority after binding generation changes;
- orphan process is observed but not silently adopted;
- terminal backend substitution PTY -> tmux preserves lane identity;
- model/provider substitution preserves lane identity;
- handoff across hosts preserves contract/baton/shared links;
- conflicting worktree blocks integration and escalates;
- human takeover revokes agent write authority immediately;
- duplicate external transition requests are idempotent;
- MCP/orchestrator cannot bypass lease or approval gates;
- multi-project index loss can be rebuilt from workspace truth;
- terminal history loss does not prevent recovery;
- complete machine restart resumes AUTO work only after reconciliation.

## 2.0 freeze rule

Do not pull the 3.0 terminal/worktree/MCP architecture into the qualified 2.0 release at the last minute. The 2.0 release should freeze around its existing contract/baton/lease/queue/recovery guarantees and test evidence. This document is the architecture bridge into 3.0.

## Bottom line

AGTX validates several practical choices: tmux is useful, worktree-per-coding-task is useful, durable DB state is useful, orchestrator requests should be queued, pane observation is useful, and human escalation matters.

Agent Control's opportunity is one layer higher: **make all of those replaceable runtime machinery underneath a durable, capability-routed, restartable work control plane.**
