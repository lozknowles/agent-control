# Agent Control

A multi-lane terminal mission-control UI for local AI agents.

## v0.2 — bounded reasoner sessions

Agent Control now separates **task state**, **reasoning transport** and **execution**:

- the lane owns the task; the model never does
- hard contracts and batons remain durable across model/session replacement
- full lane transcripts are append-only JSONL outside the chat/provider session
- each reasoner request is rebuilt as a bounded context packet from durable state
- per-request context targets 12k estimated tokens and hard-stops at 16k by default
- provider sessions rotate after 48k cumulative estimated tokens or 24 turns by default
- if a provider cannot rotate when required, the lane pauses instead of allowing unbounded context growth
- context epochs are disposable; contract/baton/evidence survive rotation
- the context packet explicitly requires all shell/filesystem/git/browser/process actions to use the lane-local executor, never a remote reasoning backend

The existing TUI still provides independently scrollable lanes, AUTO/MANUAL policy, priorities, model locks, batons and pause/checkpoint recovery. UI scrollback is capped; the durable transcript is not.

## Run

```bash
npm install
npm start
```

## Connect a Responses-compatible reasoner

Agent Control can use the local ChatGPT-window bridge or another Responses-compatible endpoint without making the browser conversation authoritative state:

```bash
export AGENT_CONTROL_REASONER_URL=http://127.0.0.1:8767
export AGENT_CONTROL_REASONER_MODEL=chatgpt-window
npm start
```

For automatic disposable-session rotation, configure a bridge endpoint that starts a fresh provider conversation and returns 2xx only after the rotation succeeds:

```bash
export AGENT_CONTROL_REASONER_ROTATE_URL=http://127.0.0.1:8767/agent-control/rotate
```

If that endpoint is absent, Agent Control runs normally until the configured rotation threshold, then fails closed and pauses the affected lane. It will not pretend that resetting local counters reset the browser conversation.

Optional context controls:

```bash
export AGENT_CONTROL_CONTEXT_TARGET_TOKENS=12000
export AGENT_CONTROL_CONTEXT_HARD_TOKENS=16000
export AGENT_CONTROL_CONTEXT_ROTATE_TOKENS=48000
export AGENT_CONTROL_CONTEXT_ROTATE_TURNS=24
```

## Keys

- `Tab` / `Shift-Tab`: next/previous lane
- `1`-`9`: jump to lane
- `PgUp` / `PgDn`, arrows, mouse wheel: scroll focused lane
- `+` / `-`: lane priority
- `a` / `m`: AUTO / MANUAL
- `l`: toggle model lock
- `b`: surface current baton
- `r`: proactively rotate the active lane's provider context (when supported)
- `p`: pause/resume all with checkpoint
- `z`: zoom/unzoom selected lane
- `i`: focus command input
- `q` / `Ctrl-C`: quit

## Architecture

```text
                         durable / restartable
                    ┌────────────────────────────┐
                    │ Hard contract + baton      │
                    │ evidence + events          │
                    │ transcript.jsonl           │
                    └─────────────┬──────────────┘
                                  │ rebuild
                                  ▼
Agent Control lane ──► bounded context packet ──► reasoner provider
       │                                           │
       │                                           ├─ ChatGPT-window / Sol
       │                                           ├─ local Qwen / Muse
       │                                           └─ other Responses adapter
       │
       └──────────────► lane-local executor/tools

Provider conversation/session = disposable cache, never task ownership.
```

See `ARCHITECTURE.md` for the frozen invariants and bounded-context rules.
