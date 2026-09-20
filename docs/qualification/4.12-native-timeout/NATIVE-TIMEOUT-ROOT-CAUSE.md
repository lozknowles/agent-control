# Native benchmark timeout root-cause qualification

Generated: 2026-09-20T06:39:58.419040Z

## Verdict

The original ten-task comparison did not measure a common natural runtime. Each task exhausted its own configured whole-loop deadline (120, 150, 180, 240, or 300 seconds); approximately 180 seconds is the median configured limit. The owner is `StructuredChatLoopProvider.execute`, which computes one absolute deadline and passes the remaining allowance to each successive provider request. It is a whole multi-turn model/tool loop budget.

All 20 original lane/task runs had an in-flight provider request at termination and retained recent governed progress; none proved a blocked tool or stalled runtime. Because responses were non-streaming, retained Agent Control invocation evidence does not prove token-by-token progress inside every final request. The physical diagnostics added server evidence for the representative cases and showed active generation.

## Exact owner and scope

- Production owner: `src/control/structured-chat-loop-provider.ts:94-135`.
- Value source: `min(recipe.resourceLimits.maximumLatencyMs, provider option timeoutMs)`.
- Clock: starts once immediately before the model/tool turn loop; ends on completion or when the single absolute deadline is exhausted.
- Original qualification wiring: the frozen task `timeoutMs` supplied both the provider option and recipe maximum latency.
- Scope: the complete structured-chat model/tool loop for the execute step, not an individual turn, model call, tool call, or verifier.
- Cancellation: an abort signal terminates the outstanding request; the step fails, downstream verification is cancelled, governed settlement runs, and cleanup is retained.
- Job step ceiling: 330 seconds in the original qualification; it did not own these failures.

## Physical evidence

Completed original calls: **28**. Generation throughput was **0.403-0.469 tokens/s**, median **0.442 tokens/s**. Completed calls took **51.6-141.4 seconds**, median **93.1 seconds**. Prompt processing was normally fast (median **102.47 fresh prompt tokens/s**); one fully cached one-token prompt has low fixed-overhead throughput and is not representative. Time to first token was not recorded and remains **unavailable**.

Governed tool calls were not the bottleneck: 28 observed tool calls had median **13 ms**, maximum **247 ms**.

The extended representative runs exposed a second independent boundary. Node v24.21.0 uses Undici 7.29.1; its default response-header timeout is 300 seconds. The provider uses global non-streaming `fetch` and did not set an Undici dispatcher/header timeout. Representative requests failed at approximately 300 seconds with the retained top-level message `fetch failed`, while llama.cpp was still decoding. The exact nested `UND_ERR_HEADERS_TIMEOUT` cause was not retained, so the attribution is supported by source, versions, timing and server cancellation evidence rather than a retained nested cause code.

The llama.cpp service has no explicit `--timeout`; its exact checked-out documentation default is 600 seconds. Its `should_stop` message followed the client disconnect and was not the initiating 300-second owner.

## Root cause

The primary root cause is a configuration mismatch: task-level benchmark timeouts were reused as an absolute wall deadline for profiles that permit 10 STANDARD or 32 DEEP turns with mandatory independent verification. On the measured model/hardware, the median completed call alone was 93.1 seconds, so the frozen limits accommodate only about 1.3 to 3.2 median model calls before tools and verification. This is not a model defect; it is an inconsistent budget/profile combination.

The diagnostic ceiling proved that additional Agent Control wall time can allow natural completion: baseline SIMPLE passed after **431,181 ms**, four model calls and independent verification. Other diagnostics reached the separate 300-second transport response-header boundary before their Agent Control observation ceilings.

## Cache finding preserved

The ten-task experiment remains: Lean reduced total input **35.1%**, while cache reuse fell **48.1% to 17.6%** and fresh input increased **21,410 to 22,057**. Lean removes a duplicate tool-schema source, but it also rewrites the first system message as the exposed tool set changes (`structured-chat-loop-provider.ts:102,121`), destabilising the reusable prefix. Result projection can also change later conversation content. The previously slower static-prefix/dynamic-grant prototype remains rejected. A future experiment may retain an immutable authorised base prefix and append stage deltas, but no production redesign was made here.

## Qualification-only instrumentation

Commit `7678a52b64d06becfce9a0e0cdb0b7c620ece87a` adds a bounded, explicit `observationTimeoutMs` only to the qualification Job. It defaults to the frozen task limit, may not be less than that limit, is capped at 1,800,000 ms, and records configured/effective values in evidence. It changes neither tools, authority, leases, profiles, verification, cleanup nor production policy.

## Boundaries

- Native Agent Control runtime ownership is preserved.
- No harness performed operational runtime work.
- No production timeout policy was changed.
- No matched successful baseline/Lean pair exists, so Lean completed-work efficiency remains **NOT PROVEN**.
- No merge, release, deployment, or protected-service change was performed.
