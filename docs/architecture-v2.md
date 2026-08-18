# Agent Control architecture v2

Agent Control treats the task contract, not the model, as the durable owner of work.

## Durable chain

`Lane -> Contract -> Baton -> Process/PTY -> Agent`

A model may leave without losing the task. The baton captures completed work, remaining work, evidence, working directory and the next safe continuation point.

## Self-routing

Every running agent may return one of five decisions:

- `ACCEPT`: continue the current stage.
- `DELEGATE`: retain ownership while asking a free lane for bounded help.
- `SUBSTITUTE`: checkpoint and request a better-suited model in the same lane.
- `YIELD`: checkpoint and free the lane because continued execution is not useful.
- `COMPLETE`: satisfy the contract and close the lane.

Manual mode never executes a handoff automatically. Auto mode may execute low-risk handoffs, while production writes, destructive operations, privilege increases and chargeable cloud escalation remain approval boundaries.

## PTY attachment

A PTY is independent of its current agent. Agents may observe, request write access, or own the interactive session. Human takeover always remains possible.

Sessions are classified as:

- reattachable: the process is still alive;
- reconstructable: process state cannot survive, but the command, cwd, transcript tail, baton and restart recipe can recreate the working position;
- ephemeral: no safe restoration is promised.

This enables an agent to join an existing vim, REPL, debugger, database shell or TUI rather than requiring a fresh shell.

## Model registry and qualification

The actual unit under test is a **model recipe**, not merely model weights. A recipe pins model SHA, quantisation, runtime/version, context, chat template, prompt version, skills, tools and inference parameters.

Lifecycle:

`DISCOVERED -> BENCHMARKING -> SHADOW -> CANDIDATE -> ACTIVE -> PREFERRED -> DEPRECATED`

Current routing choices are champions. New models and re-tuned existing/free models are challengers.

Overnight exploration should use successive halving: cheap tests first, then capability tests, historical baton replays, holdout evaluation and finally shadow execution. Poor variants are stopped early so the optimisation budget concentrates on promising recipes.

Prompt and parameter tuning must not use the final holdout tasks. Promotion requires unseen-task evidence and can be rolled back by restoring the previous versioned routing policy.

## Role profiles

One set of weights may expose multiple recipes, for example CODER, TRIAGE and RESEARCH. A task changing phase can therefore request a profile substitution before requesting a completely different model.

## Learning signals

Agent Control records completion, quality, latency, substitutions, handoff reasons and capability-specific outcomes. Repeated self-substitution is negative evidence for that recipe/capability; successful incoming delegation is positive evidence.

The goal is not to maximise agent count. The system should learn when the best action is to continue, recruit help, replace itself, or stop consuming compute.
