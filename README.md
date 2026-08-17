# Agent Control

A multi-lane terminal mission-control and control plane for local AI agents.

## Current v0.1 foundation

- independently scrollable work lanes, keyboard/mouse focus and zoom
- AUTO/MANUAL policy, lane priority and model lock
- durable hard contracts plus revisioned soft-state batons
- one-holder lane leases
- append-only event log and atomic persistence
- pause/resume checkpoints and restore-point identity
- control-plane primitives for baton **handoff** and **clone**
- explicit shared-task membership and structured shared entries
- scheduler primitive that selects waiting AUTO lanes by priority/age
- replaceable `AgentAdapter` boundary so Pi, llama.cpp or another harness can be wired without changing durable state

See `ARCHITECTURE.md` for the frozen invariants.

## Run

```bash
npm install
npm start
```

State is persisted under `.agent-control/` by default. Override with `AGENT_CONTROL_STATE_DIR`.

## TUI keys

- `Tab` / `Shift-Tab`: next/previous lane
- `1`–`9`: jump to lane
- `PgUp` / `PgDn`, arrows, mouse wheel: scroll focused lane
- `+` / `-`: change lane priority
- `a`: AUTO mode
- `m`: MANUAL mode
- `l`: toggle model lock
- `b`: show current baton summary in lane
- `p`: transactional pause/resume checkpoint
- `z`: zoom/unzoom selected lane
- `i`: focus command input
- `q` / `Ctrl-C`: persist and quit

## Architecture

```text
TUI
  │
CONTROL PLANE
  ├── scheduler / priorities / model locks
  ├── leases
  ├── shared task context
  ├── handoff / clone
  └── checkpoints
        │
   AgentAdapter
    ├── Pi
    ├── llama.cpp/router
    └── future adapters
        │
      models
```

The lane owns the task. Models are temporary workers. A model can disappear, be swapped, or be handed a baton in another free lane without making the conversation transcript the authoritative state.
