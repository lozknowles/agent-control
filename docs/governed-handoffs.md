# Governed handoff outcomes

Agent Control 3.6 development records every worker transition as `agent-control.handoff/v1`. The parent contract—not the process—continues to own task identity, completion criteria, authority, protected resources, budget, history and verification.

## Outcomes

| Outcome | Exact transition |
| --- | --- |
| `SACRIFICE` | Cancels the current process, closes and unowns its PTY, and pauses the unchanged parent contract because further work is not justified. It does not claim completion. |
| `SUBSTITUTE` | Cancels the current process and installs a new actor/agent/model/provider/runtime/node, process, PTY and next-generation sealed baton on the same parent contract. Objective and history remain unchanged. |
| `DELEGATE` | Creates a child contract linked to the parent. Authority is the requested subset of parent authority; excess authority is withheld. Token/cost budget is debited from the parent and assigned to the child. Attachments and protected-resource policy remain governed. |
| `YIELD` | Pauses the current process when the adapter supports pause, revokes PTY write ownership and pauses the contract without a completion claim. |
| `COMPLETE` | Submits evidence and moves the parent contract to independent verification. It produces `VERIFYING`, never immediate `VERIFIED`. |

## AUTO and MANUAL policy

`AUTO` executes only within existing authority, resource envelope and available budget. A handoff waits for the contract operator when any of these applies:

- the request names authority the parent does not hold;
- costly escalation;
- production writes;
- destructive action;
- expanded resource envelope;
- token or cost budget expansion;
- explicit `MANUAL` policy.

Operator approval does not manufacture missing authority: unavailable capabilities remain in `authorityWithheld`. A child allocation above the parent's known budget still fails closed even after approval; the parent contract must be amended through its own governed policy first.

## Evidence record

Each durable handoff records:

- originating actor and agent;
- receiving actor and agent where applicable;
- parent and child contract IDs;
- reason and exact outcome;
- baton SHA-256 and byte size;
- authority transferred and withheld;
- token/cost/currency transferred where known;
- contract state before and after;
- evidence IDs and verification outcome;
- approval reasons, approver, timestamps and any bounded failure.

Credential-like material is rejected before persistence. The complete request is retained for deterministic recovery, but no secret references are resolved into values.

## Recovery

Handoff and contract snapshots are separate atomic mode-`0600` records. On restart, parent/child links, budget debits, process replacement, baton generation and verification state remain reconstructable. Operating-system process adapters are still responsible for proving the observed process identity before resuming it.
