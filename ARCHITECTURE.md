# Agent Control architecture freeze — v0.1

This document freezes the state model before deeper UI/agent integration.

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

## State hierarchy

```text
WORKSPACE
  HARD/PERSISTED STATE
  LANES
    HARD CONTRACT
    BATON
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

## Baton operations

- **handoff** — old holder checkpoints and releases; a new lane/model acquires responsibility from the baton.
- **clone** — another worker receives a copy for independent work; ownership is not transferred.
- **checkpoint** — persist current baton and objective state without changing ownership.
- **restore** — reconstruct a lane from hard contract + baton + events + objective validation.

## Pause All

Pause is transactional: stop new scheduling, reach safe tool boundaries, update batons, capture objective state, flush events/shared context, validate hard contracts, write a restore point, then report safe-to-shutdown.

## v0.1 implementation boundary

The first implementation provides the persisted state primitives and TUI affordances. Agent/model adapters, scheduler policy, shared-context store, objective git/process probes and deterministic restore validation are layered on this contract rather than bypassing it.
