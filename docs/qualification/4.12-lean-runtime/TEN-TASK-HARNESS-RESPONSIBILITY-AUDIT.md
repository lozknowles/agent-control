# Ten-task harness responsibility audit

## Conclusion

The historical `scripts/benchmark-harness-mutation-live.ts` path was **HARNESS_DRIVEN**. It created the workspace, selected the profile, built context, ran the model loop, parsed actions, dispatched tools, decided escalation, ran verification, cleaned the workspace and then wrote the result. The model measurements remain valid, but that script was an execution owner rather than a submit/observe harness.

The native qualification moves every operational responsibility into the registered Agent Control Job actions. `scripts/run-native-mutation-benchmark.ts` now performs only controller setup, one Job submission, observation and durable export.

| Responsibility | Historical owner | Category | Required production owner | Native implementation |
|---|---|---|---|---|
| Select frozen task and verify suite/fixture hash | benchmark script | FIXTURE_SETUP / AMBIGUOUS | Job parameter validation + action | Job validates `taskId`; action loads frozen suite and rejects hash mismatch |
| Create/reset disposable workspace | benchmark script | RUNTIME_RESPONSIBILITY | target/repository adapter | registered mutation action prepares an owned `MutationWorkspace` |
| Select requested profile | benchmark script | RUNTIME_RESPONSIBILITY | harness profile router | Job parameter becomes `harnessRouting.requestedProfile`; EXPERIMENT router records/applies it |
| Select provider/model route | benchmark script | RUNTIME_RESPONSIBILITY | Job trigger + worker route | run trigger records governed model route; action binds the selected route |
| Endpoint health/model identity admission | benchmark script | RUNTIME_RESPONSIBILITY | runtime/model adapter | action records `/health` and `/models`; mismatch fails before model execution |
| Construct authorised context | benchmark script | RUNTIME_RESPONSIBILITY | context/runtime adapter | action builds and records the selected context packet |
| Run multi-turn model loop | benchmark script | RUNTIME_RESPONSIBILITY | Agent Control provider executor | `StructuredChatLoopProvider` runs inside `HarnessJobAgentAction` |
| Parse model actions | benchmark script | RUNTIME_RESPONSIBILITY | provider executor | bounded JSON-tool parser in production executor |
| Choose currently visible tools | benchmark script | RUNTIME_RESPONSIBILITY | dispatcher policy | `HarnessDispatcher` exposes tools from dispatcher-owned stage state |
| Authorise/invoke tools | benchmark script | RUNTIME_RESPONSIBILITY | ToolPolicy + target adapter | dispatcher rechecks authority and calls typed workspace bindings |
| Retry/escalation/completion | benchmark script | RUNTIME_RESPONSIBILITY | runtime policies | profile, turn budget, terminal allowance and failure state are runtime-owned |
| Operational mutation | benchmark script | RUNTIME_RESPONSIBILITY | typed repository adapter | action-owned bindings operate only on the disposable owned workspace |
| Independent verification | benchmark script | RUNTIME_RESPONSIBILITY | consequential verification Job step | `qualification.non-openai-cache.verify@1.0.0` records and binds independent verification |
| Cancellation/timeout/recovery | benchmark script | RUNTIME_RESPONSIBILITY | JobRuntime/execution session | live signal, action timeout, owned cleanup and recovery classification |
| Workspace/process cleanup | benchmark script | RUNTIME_RESPONSIBILITY | retained cleanup contract | action retains identity and must prove termination and deletion |
| Capture raw provider/tool evidence | benchmark script | RUNTIME_RESPONSIBILITY | action evidence journal | every request/response/tool decision/result is an ArtifactStore record |
| Aggregate tokens/latency/success | benchmark script | EXTERNAL_MEASUREMENT | qualification reporter | derived after runs from durable invocation/evidence records |
| Compare lanes and calculate deltas | benchmark script | EXTERNAL_MEASUREMENT | qualification reporter | read-only post-run analysis |
| Assert final artifacts/checksums | benchmark script | FINAL_VALIDATION | qualification harness | allowed after Agent Control reaches terminal state |

## Anti-cheating boundary

Focused qualification disables the registered dispatcher using `AGENT_CONTROL_NATIVE_BENCHMARK_DISABLE_DISPATCHER=true`. The submitter still creates the Job, but no tool executes and the run fails. Removing the old harness helpers does not affect the native Job. Native provenance is emitted only when explicit task/profile parameters pass through the governed Job boundary and independent verification remains mandatory.
