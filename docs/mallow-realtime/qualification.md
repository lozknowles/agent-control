# Mallow realtime voice and agent presence qualification

## Result

**EXPERIMENTAL**

This prototype proves that a Mallow foreground conversation can remain responsive while a genuine governed Agent Control Job runs independently. It also proves deterministic progress queries, phrase-boundary result delivery, cancellation, late-result fencing, cached speech identity/invalidation and a live event-driven dashboard projection.

It does not prove a natural audible realtime conversation. The proof uses deterministic transcripts, a rules conversation provider and synthetic streaming audio frames. No microphone, VAD, STT model, loudspeaker, echo cancellation or physical audio loop was used.

## Provenance

- Agent Control baseline: public `v4.12.1`, commit `cb7bd58030c1ba3fe6f38d075607342837ab7f25`
- Feature branch: `feature/mallow-realtime-presence-20260922`
- Reference: `QwenAudio/qwen-audio-agent` at `b103fb75bc283a03f0affabce6d793de7381b8ff`
- Reference disposition: [qwen-audio-agent-audit.md](../research/qwen-audio-agent-audit.md)
- No upstream code, model checkpoint or runtime dependency was copied or downloaded.

## Architecture decision

The implementation adapts the useful separation in the reference architecture without replacing Agent Control authority:

1. A foreground session owns turn and speech state.
2. A deterministic/provider-neutral router selects direct conversation, progress lookup or governed background work.
3. `AgentControlBackgroundJobPort` creates and observes registered Jobs through the existing `JobRuntime`.
4. The Run ledger, worker placement, artifacts and cancellation remain authoritative.
5. A redacted typed JSONL event record drives the presence projection; it is not a second Job ledger.
6. Result speech can begin only when the result binding is current and a phrase boundary is available.
7. Interruption advances the speech generation, aborts current generation and suppresses obsolete late chunks.

Provider contracts cover realtime input, speech, VAD, conversation, routing and governed background work. The proof therefore has no hard dependency on Qwen, OpenAI, WebRTC, one TTS engine or one model API.

## Demonstrated scenario

The repeatable script performs the requested sequence:

1. greeting and direct response;
2. planning request routed to a registered governed Job;
3. immediate acknowledgement while the Job remains active;
4. a second conversational question while the Job is active;
5. truthful progress from the Run ledger;
6. Job completion and artifact-backed result delivery;
7. a later long response interrupted by a corrected request;
8. obsolete speech is suppressed and the corrected response completes.

The background proof records a Run ID, lane `governed-research`, worker `demo-governed-worker`, skill `planning-search`, tool `mallow.planning-search`, terminal status and artifact evidence reference.

## Telemetry boundary

The runtime records all requested latency fields. It uses `null` when a stage is not observed. In particular, `result -> first_generated_token` is unavailable in this proof because the deterministic provider performs no model generation. The browser shows P50/P95 only for metrics with observations.

The final synthetic demo measured 29 ms P50 provider-to-first-frame latency and a 30 ms speech-end-to-first-acknowledgement frame for the background turn. Runtime interruption-to-output-suppression was 1 ms at millisecond clock resolution. The completed Job result reached its first synthetic answer frame 256 ms after speech end in this deliberately gated demo. None of these values is an acoustic measurement. A physical microphone/speaker loop is required before any may be described as audible first response or playback-stop latency.

The governed phrase-cache probe compares the exact allowlisted phrase `One moment.` on a cache miss and hit. The final run recorded 28.404 ms live and 0.083 ms cached first-frame latency, a 28.321 ms reduction. Its retained report labels the result `SYNTHETIC_RUNTIME_ONLY`; it measures provider-to-first-frame delay and does not measure a speaker.

## Evidence

Generated evidence is intentionally kept outside source distribution under:

```text
.agent-control/evidence/mallow-realtime-presence/
  events.jsonl
  demo-report.json
  ledger.json
  artifacts/
  speech-cache/
  SHA256SUMS
  browser/
    browser-qualification.json
    01-mallow-presence-desktop.png
    02-mallow-presence-mobile-portrait.png
    03-mallow-presence-mobile-landscape.png
```

The browser qualification uses the production authenticated dashboard server and the read-only `/api/mallow/presence` projection. Desktop, portrait and landscape Chromium viewports passed with no browser errors and no body overflow. This is responsive browser evidence, not physical mobile or audible voice evidence.

No video was produced. A video of synthetic frames and a silent browser state would risk implying audible realtime qualification that did not occur. The existing video-evidence capability remains available for a later physical-audio qualification.

## Verification

- focused realtime/presence tests: 11 passed;
- shared theme tests: 12 passed;
- TypeScript type check: passed;
- dashboard source check: passed;
- browser qualification: passed at `1440x1000`, `390x844` and `844x390`;
- complete regression suite: 2,021 passed, 0 failed, 0 skipped in 262.291 seconds;
- source-distribution policy: passed with zero violations across 1,553 tracked files.

Focused coverage includes event ordering, interruption, cancellation, simultaneous conversation and Job work, result delivery, corrected-request stale-result rejection, cache hit/invalidation, provider/TTS/input failure, Job failure with continued conversation, progress accuracy, cleanup, redaction, event-store restart and authenticated UI/API access.

## Remaining qualification gates

- physical microphone ingestion and VAD;
- real STT latency and recognition quality;
- a real streaming TTS or speech-to-speech provider;
- loudspeaker stop timing, queued-device audio flushing and acoustic barge-in;
- AEC and full-duplex talk-over behavior;
- prosody/crossfade quality at acknowledgement-to-result handoff;
- model-backed conversational latency and quality;
- WebRTC behavior over a real client connection;
- physical mobile qualification and an audible demonstration recording.

Until those gates pass, the answer to “can Mallow maintain a natural, interruptible realtime conversation while Agent Control performs real governed work in parallel?” is: **the governance and concurrency architecture is demonstrated; natural realtime audio remains unqualified.**
