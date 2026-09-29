# Provider-neutral computer-use managed runs

Agent Control treats computer use as an execution capability, not as a Job owner. `ComputerManagedRunController` supports two levels:

- `STEP`: exactly one governed action between fresh observations, followed by independent verification.
- `MANAGED_RUN`: a bounded Agent Control workflow containing multiple actions, assertions, retries, waits, branches, loops, read-only parallel assertions and explicit human gates.

Providers expose sessions that observe and act. They do not set the final Job result. Agent Control owns planning, authority, budgets, elapsed-time bounds, retries, human-intervention truth, cancellation, evidence, verification and the terminal state.

## Execution and verification

Provider acknowledgement produces `ACTION_COMPLETED`, not success. After the workflow finishes, Agent Control enters `VERIFYING` and invokes the declared verifier. Only `VERIFICATION_PASSED` can produce `JOB_SUCCEEDED`. A provider-completed run with a failed verifier ends `VERIFICATION_FAILED` and `JOB_FAILED`.

The actor and verifier have distinct identities in the retained result. A deterministic verifier is sufficient; another paid model or provider is not required.

## Portable workflow vocabulary

The serialisable primitives are `TASK`, `ACTION`, `ASSERT`, `VERIFY`, `IF`, `LOOP`, `PARALLEL`, `RETRY`, `WAIT`, `HUMAN_APPROVAL`, `SUCCEED` and `FAIL`. Validation bounds workflow size, retries, loops and waits. `STEP` requires exactly one action. Parallel mutation is rejected; only read-only assertions/verifications may run in a parallel group.

Learned procedures map semantic steps and checkpoints into these primitives. The implementation in `src/control/portable-workflow.ts` compiles learned Blender procedures while retaining prerequisites, parameters, source Job IDs, source digest, checkpoints, bounded retry policy, completion criteria and limitations. It preserves semantic Blender capabilities rather than introducing `blender.python.execute`; execution remains behind the governed Blender capability port. Command transcripts are not learned skills.

## Human intervention

Human gates emit `HUMAN_REQUIRED`; takeover additionally emits start, action-record and end events. Resumption requires a fresh provider observation. Results classify intervention as `AUTONOMOUS`, `HUMAN_ASSISTED`, `HUMAN_TAKEOVER` or `SUPERVISED`. A material human action therefore cannot be reported as zero-intervention autonomy.

## Machine and provider routing

Machines advertise capability state as `SUPPORTED`, `UNSUPPORTED`, `AVAILABLE`, `UNAVAILABLE` or `DEGRADED`. Routing evaluates required capabilities, availability, local-only and no-external-API constraints, provider-spend budget, evidence scope and verification compatibility. Hostnames are identities for evidence, not routing policy.

Provider advertisements declare STEP/MANAGED_RUN support, capabilities, streaming observations, cancellation, human takeover, native verification, session persistence, external processing and estimated cost. Coasty-specific structures are not present in core. No Coasty credentials or approved no-cost endpoint were available during this candidate, so its status is `PROVIDER_ACCESS_UNAVAILABLE` and no adapter was fabricated.

The 4.19 qualification physically exercised the same frozen text-entry intent through Playwright/Edge and Windows Sky/Notepad. Both reached independently verified terminal state through this boundary. Windows Sky additionally exercised STEP and MANAGED_RUN, but only on a disposable unsaved Notepad surface; unsupported browser semantics were reported as `UNSUPPORTED`, not provider failures.

## Authoritative event stream

Computer-use events are ordered, append-only and SHA-256 hash-chained. They cover admission, capability match, worker selection, plan creation, action planning/dispatch/completion, observations, assertions, retries, human intervention, verification, cancellation and terminal Job state. Each normalized managed-run event is appended to the existing authoritative Job `run-events.jsonl` ledger with its original timestamp, actor, state, sequence and hash-chain evidence; the complete stream is also retained in the result artifact. Legacy bounded computer-use actions emit the same normalized lifecycle projection. Provider-native logs remain diagnostic inputs rather than the completion authority.

## Qualification boundary

Automated tests cover STEP, MANAGED_RUN, independent actor/verifier separation, mandatory false-success detection, human takeover, workflow validation, capability/budget/privacy routing, verified provider history and event-chain integrity. Physical qualification covers two legitimate providers only for their shared frozen text-entry subset. It does not establish a general provider ranking, an external benchmark score, production deployment or unrestricted desktop autonomy.

OSWorld integration is `DEFERRED_FOR_FULL_QUALIFICATION`. A future adapter must preserve official tasks, environment, scoring and contamination controls; Agent Control orchestration metrics must be reported separately from provider performance.

The candidate-specific limitation registry is `config/computer-use-limitations.json`. It is deliberately separate from the immutable historical limitations audit ledger and records provider access, comparison, Windows, OSWorld and qualification boundaries without silently dropping them.
