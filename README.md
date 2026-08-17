# Agent Control

A multi-lane terminal mission-control UI for local AI agents.

## v0.1

The first scaffold provides:

- three independently scrollable work lanes
- mouse and keyboard scrolling
- lane switching with Tab / Shift-Tab or 1-3
- active-lane command input
- zoom/unzoom of the selected lane with `z`
- activity log and active-lane metrics panel
- separate per-lane model, reasoning, context and working-directory state

The initial UI uses `blessed` deliberately to get the interaction model running quickly. The agent adapter is separated conceptually from the UI; the next step is to connect each lane to a real Pi/Qwen session and then decide whether to retain Blessed or migrate the rendering layer to Pi TUI/Ratatui.

## Run

```bash
npm install
npm start
```

## Keys

- `Tab` / `Shift-Tab`: next/previous lane
- `1`, `2`, `3`: jump to lane
- `PgUp` / `PgDn`, arrows, mouse wheel: scroll focused lane
- `z`: zoom/unzoom selected lane
- `i`: focus command input
- `q` / `Ctrl-C`: quit

## Architecture direction

```text
Agent Control TUI
  ├── Lane 1 ── agent adapter ── router ── Qwen/local/API
  ├── Lane 2 ── agent adapter ── router ── Qwen/local/API
  └── Lane 3 ── agent adapter ── router ── Qwen/local/API
```

Each lane will remain a persistent unit of work with its own session, transcript, working directory, reasoning level and model selection.
