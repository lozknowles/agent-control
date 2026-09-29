# Agent Control 4.18.0

Agent Control 4.18.0 consolidates useful computer-use orchestration patterns without adding a Coasty dependency or transferring policy authority to a provider.

## Computer-use levels and authority

- `STEP` admits exactly one governed action followed by fresh observation and independent verification.
- `MANAGED_RUN` admits a bounded workflow with explicit tasks, actions, assertions, verification, branches, loops, read-only parallel checks, bounded retries, waits, human approval, success and failure.
- Providers advertise capabilities and implement session availability, observation and action. Agent Control retains planning, policy, budgets, routing, retries, human-state truth, cancellation, evidence, verification and the terminal Job result.
- A provider acknowledgement records `ACTION_COMPLETED`; it cannot produce `JOB_SUCCEEDED`. The mandatory negative qualification proves provider completion plus independent verification failure ends `VERIFICATION_FAILED`.

## Portable workflows and learned procedures

The common workflow vocabulary is `TASK`, `ACTION`, `ASSERT`, `VERIFY`, `IF`, `LOOP`, `PARALLEL`, `RETRY`, `WAIT`, `HUMAN_APPROVAL`, `SUCCEED` and `FAIL`. Learned Blender procedures compile into these primitives with their semantic capabilities, parameters, prerequisites, checkpoints, bounded recovery, source Jobs, digest, completion criteria and limitations intact. Provider scripts and supervisor transcripts are not treated as learned skills.

## Routing, evidence and dashboard

Machines are selected by declared capability state, availability, locality/external-processing constraints, evidence compatibility, verification compatibility and provider-spend ceiling—not hostnames. Managed-run events are SHA-256 hash-chained in the result and appended to the authoritative Job event ledger. The Computer Use dashboard exposes level, provider, machine, action count, retries, verifier state, human classification, evidence and budget.

## Qualification and retained boundaries

- The focused computer-use suite passed 62/62 before versioning.
- A disposable real browser integration passed 3/3 on both Windows Edge/Chromium and supported Linux Chromium, including a managed run and an external-destination refusal.
- The implementation candidate `929c7965f123608d6cc2f3fef186f75af83ff791` passed the complete supported-Linux gate: 2425/2425, zero failures and zero skips.
- No Coasty endpoint, credentials or approved spend authority was available. Status is `PROVIDER_ACCESS_UNAVAILABLE`; no adapter or comparison result was fabricated.
- A second legitimate physical provider was unavailable, so no two-provider performance comparison is claimed.
- The Windows desktop provider remains experimental. OSWorld is `DEFERRED_FOR_FULL_QUALIFICATION`. This is not unrestricted desktop autonomy or a production-route admission.

This is a software release only. Production services and configuration are unchanged. Rollback is released `v4.17.0` at `49282a711b592ba82cf0fb4fcdfba6e5338d81d3`.
