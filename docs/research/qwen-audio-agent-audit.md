# Qwen Audio Agent architecture audit

## Scope and provenance

This audit inspected the canonical `QwenAudio/qwen-audio-agent` repository at commit `b103fb75bc283a03f0affabce6d793de7381b8ff`. The upstream repository declares Apache-2.0. Agent Control did not vendor source, copy assets, add an upstream runtime dependency, or download a speech/model checkpoint.

The comparison is architectural. It is not a claim that Agent Control implements the Gateway Client Protocol, ACP adapter, provider wire protocols, or audio behavior of qwen-audio-agent.

## Architecture observed

The reference separates a realtime **Frontend Agent**, an **Orchestration Runtime/Gateway**, and a persistent **Backend Agent**. Clients normally use one typed WebSocket session; an optional WebRTC package moves client media to an isolated media worker without changing task semantics. The realtime-model boundary is a provider interface. The backend boundary is `BackendPort`, with ACP, A2A and custom adapters keeping their protocol details outside task semantics.

`spawn_thinking` accepts background work without awaiting it. `get_agent_task_status` is the foreground status path; cancellation and permission responses are explicit tools. The documented task lifecycle covers queued, running, delegated, finalizing, completed, cancelling, cancelled and failed states. Accepted work can outlive a foreground connection. Result delivery is correlated back into the active conversation rather than implemented as an unscoped callback.

The voice pipeline normalizes provider events, maintains response/playback identity, clears queued playback on interruption, rejects late callbacks, and distinguishes provider speech-stop decisions from actual client playback receipts. This is stronger than treating `response.cancel` as proof that sound stopped at the speaker.

## Disposition

| Reference concept | Decision | Agent Control treatment |
|---|---|---|
| Frontend conversation separate from backend work | **ADAPT** | A Mallow conversation session owns speech/turn state while `JobRuntime` retains authoritative work ownership. |
| Protocol-neutral backend port | **ADAPT** | `GovernedBackgroundPort` maps only to registered Agent Control Jobs. It does not introduce another executor. |
| Immediate accepted-task receipt | **ADAPT** | Acknowledgement speech begins in parallel with governed Job creation and dispatch. |
| Persistent task lifecycle and status query | **REUSE existing Agent Control capability** | The Run ledger, worker placement, cancellation, artifacts and evidence remain authoritative. |
| Typed realtime events | **REIMPLEMENT** | Agent Control owns a redacted append-only JSONL event record and provider-neutral projection using the event names required by this prototype. |
| Provider registry boundary | **ADAPT** | Input, VAD, conversation and speech interfaces are independent of model/provider APIs. |
| Playback identity and late-callback fencing | **ADAPT** | Speech generations and stale Job bindings prevent obsolete chunks/results from reaching the current turn. |
| WebRTC/WebSocket Gateway runtime | **REJECT for this prototype** | Agent Control already has an authenticated WebRTC voice transport. Replacing it would duplicate runtime and authority. |
| ACP as the production work boundary | **REJECT** | Agent Control Jobs, Work Parcels, workers and policy are the production authority. ACP can remain an adapter where separately justified. |
| Qwen-specific realtime provider implementation | **REJECT** | It would couple the proof to one provider and requires unqualified credentials/model service. |
| Upstream local speech-to-speech stack | **DEFER** | No large model download is authorised. Physical latency, echo cancellation and local speech quality require a separate qualification. |
| Client-reported acoustic stop as assumed truth | **REJECT** | This proof reports runtime output suppression only; an acoustic microphone/speaker loop is not observed. |

## Task lifecycle mapping

| qwen-audio-agent | Agent Control prototype |
|---|---|
| `spawn_thinking` | deterministic fast route → registered Job → `JobRuntime.createRun`/`dispatch` |
| task ID | Run ID exposed as `jobId` |
| queued/running/delegated/finalizing | existing Run and step states projected to RUNNING / WAITING_FOR_TOOL / WAITING_FOR_MODEL |
| progress tool | a fresh read of the authoritative Run ledger through `GovernedBackgroundPort.status` |
| cancellation | `JobRuntime.cancel`; the presence layer marks corrected work stale before cancellation |
| result delivery | terminal Run/artifact summary is spoken only if the binding is current and a phrase boundary is free |

## Transport and audio implications

Upstream WebSocket is the default; WebRTC is optional between client and Gateway and does not silently fall back. Its documentation also separates provider generation cancellation, playback queue clearing and client playback confirmation. Agent Control should preserve that distinction. This prototype provides streaming frame contracts and an optional governed phrase cache, but uses synthetic frames for repeatable qualification. It therefore does not establish microphone ingestion, VAD accuracy, STT latency, audible prosody continuity, echo cancellation, crossfade quality, loudspeaker stop time, or full-duplex physical behavior.

## Dependency and licence implications

No qwen-audio-agent code or binary is included, so no Apache-2.0 NOTICE or attribution payload is introduced into distribution artifacts by this work. This research document records the source and revision. If a future change vendors or derives source, the Apache-2.0 licence and NOTICE obligations must be reassessed at that time.

## Recommendation

Adopt the separation of foreground conversation and durable background work, correlated typed events, provider boundaries, task-status queries and late-result fencing. Keep Agent Control Jobs and evidence as the authority. Do not add qwen-audio-agent as a dependency merely to obtain those concepts. Qualify an actual streaming input/speech adapter and physical barge-in loop before describing Mallow as realtime-voice qualified.
