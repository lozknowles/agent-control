# Agent Control native benchmark qualification

## Classification

**Native execution path: PASS. Lean adoption gate: BLOCKED.**

The production-shaped chain is `Job submission → JobRuntime → worker lease/execution contract → registered action → governed model route → HarnessDispatcher → typed tools → independent verification → retained cleanup → durable evidence`.

The submitter contains no model HTTP call, action parser, tool invocation, workspace mutation, verifier or cleanup implementation. The legacy script still contains those responsibilities and remains labelled **HARNESS_DRIVEN** for historical reproduction only.

## Proofs

- Native ownership tests: PASS.
- Dispatcher-disabled anti-cheating control: PASS; the Job failed and no raw handler ran.
- Qwen native THIN physical run `run-f9b06545-4ace-4bc8-9c67-7a3c6264583f`: SUCCEEDED, four model calls, independent verification PASS, cleanup confirmed.
- Qwen native STANDARD run `run-928a5ca6-e1ef-4c1c-b560-481f2a309a3d`: failed honestly at the frozen 12,000-token budget after six calls; cleanup confirmed.
- Ministral native STANDARD proof `run-e39ec1fe-1a6e-4622-8e7e-16dc1a8c1a44`: failed honestly at the frozen 120-second deadline; cleanup confirmed.
- Exact ten-task A/B: completed, twenty native terminal runs, twenty confirmed cleanups, zero verified successes in either lane.
- Terminal-escape read/write/test/shell/non-terminal cases: PASS at the real dispatcher boundary with synthetic provider fixtures. They are not described as physical attack executions.
- Full suite: 1,946 passed, 0 failed, 0 skipped.

`AGENT_CONTROL_NATIVE_EXECUTION` is earned only by the explicit task/profile Job path with execution authority and independent verification. Caller intent cannot assign it. The dispatcher-disabled control proves the external submitter cannot finish the mutation by itself.

## Final determination

The benchmark is genuinely native and reusable. The Lean performance claim remains blocked: 0/10 vs 0/10 cannot establish retained quality, and fresh input increased 3.0% even though total input decreased.
