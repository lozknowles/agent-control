# Agent Control architecture freeze — v0.2

This document extends the v0.1 state freeze with reasoner-provider and bounded-context rules. The original ownership model remains unchanged.

## Invariants

1. **The lane owns the task. The LLM never owns the task.**
2. **Hard contracts are authoritative.** Models may propose changes; Agent Control persists/validates them.
3. **Batons are transferable soft state.** A replacement model must be able to continue from the latest baton plus referenced context.
4. **One active lease per lane.** A model works a lane only while holding its lease.
5. **Events are append-only.** Important state transitions are recorded for audit/recovery.
6. **Checkpoints are restart boundaries.** Pause/reboot/resume uses persisted state, not conversational memory.
7. **Shared context is explicit.** Cross-lane knowledge is referenced by shared task IDs and is not silently copied wholesale into every context window.
8. **Model choice is policy.** A lane may be AUTO or MANUAL and may independently lock a model.
9. **Priority belongs to the lane.** The scheduler may yield scarce model/GPU capacity between lanes without transferring task ownership.
10. **Restore must validate reality.** Repository/filesystem/runtime state must be reconciled with the hard contract before autonomous continuation.
11. **Reasoning transport is not execution authority.** A browser/API/local model may reason, but shell/filesystem/git/browser/process actions must use the executor bound to the lane.
12. **Provider sessions are disposable.** No task-critical fact may exist only in a ChatGPT tab, API conversation ID, local-model KV cache or other provider session.
13. **Context is rebuilt, not accumulated.** Each request is constructed from hard contract + latest baton + compact durable summary + a bounded suffix of transcript.
14. **Context growth fails closed.** At the rotation threshold, Agent Control rotates the provider session or pauses the lane; it never silently continues an unbounded conversation.
15. **Rotation must be real.** Local token counters are reset only after the provider confirms a fresh session/context epoch.

## State hierarchy

```text
WORKSPACE
  HARD/PERSISTED STATE
  LANES
    HARD CONTRACT
    BATON
    CONTEXT STATE
      EPOCH
      BUDGET POLICY
      COMPACT SUMMARY
      ROTATION STATE
    TRANSCRIPT.JSONL
    LEASE -> temporary LLM holder
    EVENT HISTORY
  SHARED TASKS
    SHARED CONTEXT
  CHECKPOINTS / RESTORE POINTS
```

## Hard contract

Contains durable goal, constraints, working directory, priority, AUTO/MANUAL mode, model lock, shared-task membership and objective repository state. It must survive model replacement and machine restart.

## Baton

Contains compact live status: progress, current hypothesis, evidence, changes, next action, open questions, current model/reasoning and revision/timestamp. Batons update at meaningful tool/state boundaries and before handoff/pause.

## Transcript

The full lane transcript is append-only JSONL under the Agent Control state directory. It exists for audit, recovery and selective retrieval. It is **not** replayed wholesale to a reasoner.

The TUI keeps only bounded display scrollback so a long-running lane cannot make the terminal process itself a second context-growth problem.

## Bounded context packet

Every reasoner call receives a fresh packet containing, in order of authority:

1. execution-boundary rules
2. hard contract
3. latest baton
4. compact durable summary
5. current user request
6. as much newest transcript as fits the target budget

Defaults:

- request target: 12,000 estimated tokens
- request hard limit: 16,000 estimated tokens
- provider-session rotation: 48,000 cumulative estimated tokens
- provider-session rotation: 24 turns

All limits are configurable by environment variables. Token estimates are deliberately conservative and are used as guardrails rather than billing/accounting measurements.

## Context epochs

Each lane has a context epoch. A provider conversation belongs to one epoch only.

When rotation is due:

1. persist current hard contract, baton, context summary and transcript
2. ask the provider adapter to create a genuinely fresh conversation/session
3. require positive acknowledgement
4. increment the lane epoch and reset disposable counters
5. seed the new session from the next bounded context packet

If step 2 or 3 is unavailable/fails, the lane pauses. A user or scheduler can switch reasoners without losing task state because the lane's durable state is provider-independent.

## Browser / ChatGPT reasoner adapter

The browser is permitted as a **transport and observable transcript**, which preserves the useful property of being able to inspect the model/tool conversation. It is explicitly forbidden from being the only memory store.

Agent Control talks to a Responses-compatible bridge. The bridge may expose an optional rotation endpoint. DOM mechanics, tab lifecycle and provider-specific automation remain behind that adapter boundary; the rest of Agent Control does not depend on selectors or browser layout.

## Baton operations

- **handoff** — old holder checkpoints and releases; a new lane/model acquires responsibility from the baton.
- **clone** — another worker receives a copy for independent work; ownership is not transferred.
- **checkpoint** — persist current baton and objective state without changing ownership.
- **restore** — reconstruct a lane from hard contract + baton + events + objective validation.
- **rotate context** — replace only the provider conversation/session while retaining lane ownership and durable state.

## Pause All

Pause is transactional: stop new scheduling, reach safe tool boundaries, update batons, capture objective state, flush events/transcripts/shared context, validate hard contracts, write a restore point, then report safe-to-shutdown.

## v0.2 implementation boundary

v0.2 adds the bounded context builder, durable transcript, context epochs, rotation guard, Responses-compatible reasoner adapter and TUI context telemetry. Provider-specific DOM automation and richer local tool execution remain adapter responsibilities; they must not bypass the hard-contract/baton/context boundary.
