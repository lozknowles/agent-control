# Mallow realtime voice Phase 2 qualification

## Current result

**EXPERIMENTAL**

The real Ask Collingham route is now a registered Agent Control Job and has completed one fresh governed execution. The candidate also contains generic physical PCM input, energy VAD, protected buffered STT/TTS adapters, output dispatch receipts and transport-cancellation evidence. Physical browser microphone, audible output, audible barge-in and the full scripted conversation still require a live operator session. Native streaming STT partials and native streaming TTS are unavailable in the installed stack.

## Gate 0

### Phase 1 candidate

`7b4875b57c8c3c6f8b471a9067808f9efe207b17` did **not** wire the real Ask Collingham stack. Its background action was the fixture `mallow.planning-search@1.0.0`, its conversation provider was rules based and its audio frames were synthetic.

**ASK COLLINGHAM REAL PATH in Phase 1: NOT VERIFIED**

### Historical delivery defect

The separate retained Ask Collingham continuation reproduced the historical state: 23/23 baseline API responses contained text while 22/23 final browser deliveries were blank. The defect was caused by per-event sanitisation returning a terminal status-only AnythingLLM SSE event and discarding already assembled text.

The repair validates the assembled answer, preserves the guardrail, and emits a deterministic final `textResponse`. All 23 retained responses replayed visibly with zero model calls. The relevant retained digests are:

- baseline comparison: `48fe074ee59304149df9a12704c5c85aa2b463ba87a3b604c34b21c60b76f8bf`
- baseline event ledger: `18b5baecdfd252e838d4e3648897790ed2abe571d8b772f188ebc5804a475a58`

**22/23 DELIVERY DEFECT: REPRODUCED AND REPAIRED in the separate isolated Ask Collingham continuation; not silently merged into LocalWalks.**

### Phase 2 candidate

The Phase 2 candidate adds a bounded loopback Ask Collingham adapter and registers it as `mallow-ask-collingham@1.0.0`. It does not own or duplicate LocalWalks model/retrieval policy. A fresh run completed:

- Run: `run-45f2ffec-a1b4-45d3-934b-4e369cfd9911`
- Worker: `mallow-collingham-worker`
- Status: `SUCCEEDED`
- Started: `2026-09-22T05:53:49.008Z`
- Ended: `2026-09-22T05:53:49.151Z`
- Answer artifact: `artifact-5f595e2b-0622-43a0-8bcd-26384f958628`
- Qualification SHA-256: `c7f4d36f52f8b1f90367220e5005774be28551faaf4d13b0e7260cd4296f763b`
- Ledger SHA-256: `2ed4e3f18b996a057cc97d15da3007b89e3cd7e294b1ece63f31a7f5d02c83a7`

This establishes a genuine Agent Control JobRuntime chain to the current Qwen2.5-3B/AnythingLLM/llama.cpp/LanceDB stack. It does not establish answer accuracy.

## Implemented Phase 2 boundaries

- physical PCM input contract with opened/frame/closed/device-lost events;
- 20 ms, 16 kHz mono browser media frames;
- bounded energy VAD with immediate software barge-in at speech detection;
- utterance-buffered protected Faster-Whisper STT;
- real JobRuntime Ask Collingham action, worker placement, artifact and ledger;
- buffered OmniVoice WAV decoding to 20 ms PCM frames;
- playback-start receipts from the browser media edge;
- output queue cancellation receipts separate from acoustic-stop claims;
- allowlisted real PCM acknowledgement cache with voice/version invalidation;
- deterministic progress from the Job ledger;
- stale Job result fencing and corrected-job cancellation;
- no default raw microphone retention.

## Honest boundary

The installed STT service returns only a final utterance transcript. It cannot emit `voice.transcript.partial`. The installed TTS service returns a complete WAV; exposing that WAV as 20 ms frames improves playback and cancellation but is **buffered-then-framed**, not native streaming synthesis. These limitations cannot be relabelled as streaming qualification.

The hpubuntu ALSA input endpoint produced digital silence. The practical physical path is therefore the private Tailscale browser/WebRTC service using the MSI microphone and output device. That live operator interaction is pending.

## Deterministic failure coverage

Focused tests cover input-device loss, STT failure propagation, TTS/provider failure, empty/non-deliverable Ask Collingham answers, unavailable Ask Collingham transport, output interruption, stale result fencing, corrected Job cancellation and session cleanup. Upstream llama.cpp, AnythingLLM and retrieval failures surface as a failed governed Ask Collingham step; the adapter does not invent a more specific upstream stage when the guarded endpoint does not expose it.

## Evidence

```text
.agent-control/evidence/mallow-realtime-physical/
  ask-collingham/
    ledger.json
    artifacts/
    qualification.json
    SHA256SUMS
  session/                 # created by the transient physical bridge
```

Phase 1 evidence remains untouched under `.agent-control/evidence/mallow-realtime-presence/`.

No video has been produced. Video remains gated on an actual audible physical session.

## Report fields

- Baseline commit: `7b4875b57c8c3c6f8b471a9067808f9efe207b17`
- Candidate commit: pending isolated commit
- Branch: `feature/mallow-realtime-physical-20260922`
- Working tree: isolated; changes under qualification
- Ask Collingham real path: **VERIFIED in Phase 2**
- 22/23 delivery defect status: **REPRODUCED / REPAIRED in separate retained continuation**
- Input device: hpubuntu ALSA endpoint silent; MSI browser device pending live session
- Output device: hpubuntu Pulse dispatch passed without acoustic confirmation; MSI browser device pending
- VAD: implemented and focused-tested; physical timing pending
- STT: authenticated Faster-Whisper ready; buffered final transcript only
- Conversation provider: deterministic bounded control for direct turns; real Ask Collingham for knowledge turns
- TTS: authenticated OmniVoice ready; buffered complete-WAV path
- Real Ask Collingham: **PASS, one fresh governed run**
- Qwen: running Qwen2.5-3B Q4_K_M through llama.cpp
- AnythingLLM: healthy
- LanceDB: observed Ask Collingham collection
- Governed Job: **PASS**
- Concurrent Jobs: software tests pass; real physical scenario pending
- Cached acknowledgement: real PCM cache implemented; physical playback pending
- Live TTS: installed buffered provider ready; native streaming unavailable
- Seamless handoff: unqualified
- Physical barge-in: pending
- Software cancellation: focused tests pass with transport cancellation event
- Acoustic stop measurement: unavailable
- AEC: browser requests WebRTC echo cancellation; physical effectiveness unqualified
- Speech-end → first acknowledgement: pending physical session
- Speech-end → meaningful answer: pending physical session
- STT final latency: pending physical session
- TTS first-frame: pending physical session
- Playback-start latency: pending physical session
- Stale-result fencing: software tests pass
- Correction handling: software tests pass
- Progress query: deterministic from Job state; physical scenario pending
- Full tests: pending
- Focused tests: 17 passed, 0 failed, 0 skipped
- Event count: pending physical session
- Evidence hash: Ask Collingham qualification `c7f4d36f52f8b1f90367220e5005774be28551faaf4d13b0e7260cd4296f763b`
- Video evidence: not produced; correctly gated
- Known limitations: no streaming STT partials; no native streaming TTS; no physical microphone/output/AEC/barge-in proof yet; no human Ask Collingham answer-accuracy adjudication

**CLASSIFICATION: EXPERIMENTAL**
