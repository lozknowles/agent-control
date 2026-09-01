# Agent Control 3.6 frozen technical-debt brief

Every benchmark lane receives this exact brief against frozen commit `5acdde13e41d58b511a33ac0e15f3dc6d3930613`.

## Required method

Inspect current code before drawing conclusions. Reproduce defects with deterministic evidence before fixing them. Classify each investigated item as `CONFIRMED`, `PARTIAL`, `REJECTED`, or `NOT_APPLICABLE`. A model statement is not verification. Do not weaken tests, governance, verification, authority, protected-resource rules, or security controls to obtain a pass.

## P0 — Reproduce before acting

Determine whether any of these previously reported integrity problems remain:

1. unauthorised or insufficiently bounded runtime writes;
2. validation bypassable by answer length or superficial completeness;
3. browser/dashboard transformations corrupting canonical traces;
4. duplicate or shadowed test names preventing intended tests from running.

No fix receives credit unless the problem is first deterministically reproduced or convincingly proven already fixed.

## P1 — Runtime and interoperability foundations

Prioritise, in order:

1. durable Contract, Session and PTY state;
2. exactly one write-control owner;
3. safe human takeover and agent resumption;
4. controller-restart reconstruction;
5. ACP v1 stdio conformance;
6. correct cancellation, permission, resume and close behaviour;
7. durable, session-neutral provider discovery;
8. provider secret indirection and qualification metadata;
9. repeatable reboot recovery qualification;
10. current Codex compatibility without silently relying on obsolete configuration.

## P2 — Governance and efficiency

Then consider:

1. skill proposal, review, sandbox qualification, approval and promotion lifecycle;
2. specialised semantic output adapters selected by measured need;
3. truthful provider token and monetary-cost telemetry;
4. a current consolidated operator guide for 3.5/3.6;
5. repeatable ChatKit project/thread qualification rather than one state-specific claim.

## P3 — Qualification work

Then consider:

1. a 50–100-task routing corpus with holdout cases;
2. multi-host qualification;
3. physical provider/model chains;
4. events-production qualification;
5. optional Windows desktop automation.

## Intentional boundaries that are not debt

Do not change these merely to increase activity:

- Orca remains optional with the existing path available as fallback.
- ChatGPT Work/Codex shared context remains host/reference-only without an official read API.
- Repository release does not deploy production.
- ChatGPT desktop-window automation remains unimplemented when supported API/Codex routes meet the requirement.
- ACP v2 remains experimental while the protocol is draft.
- `implementation-status.json` and its stale-projection gate remain deliberate.
- STANDARD remains the safe routing fallback until stronger evidence exists.

You may challenge priorities only with repository evidence and an explicit dependency/risk argument.

## Read-only assessment deliverables

Before writes, produce: repository architecture; mapping from every P0/P1 item to likely code; dependencies; implementation sequence; security/recovery risks; required tests; already-resolved items; challenged priorities; a bounded implementation plan; and explicit yield conditions.

## Implementation instruction

Implement as much of the highest-priority coherent work as can be completed safely within the fixed envelope. Work in priority order. Reproduce before fixing. Add deterministic regression tests. Run relevant checks. If the next change cannot be completed safely, yield and explain the blocker.

Maintain an implementation journal containing: item attempted, evidence, classification, files inspected, files changed, tests added, tests run, result, remaining uncertainty, and yield/escalation decisions.
