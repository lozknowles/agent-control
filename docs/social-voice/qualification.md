# Social & Voice qualification — work in progress

Starting 3.9 resilient-execution HEAD: `9e7696fd223a1eb80f5f83c94935b5b5ba8ef20e`; clean worktree, original PR already merged. Baseline complete gate: 829 tests passed. Existing evidence hashes were preserved before implementation.

Implementation branch: `feature/3.9-social-voice-20260905`, isolated from the canonical checkout. Base `282dbc7f8e0ae886aa4d071bf8638944bbeb7acd` also preserves the later qualified OpenWA integration and its existing 846-test gate. No existing tests were removed. Final complete repository gate passed 866/866, including typecheck, bootstrap, dashboard syntax, neutrality and implementation-status checks. Desktop (1280 px) and mobile (390 px) browser checks passed with no overflow or browser errors. All saved original evidence hashes still match.

## Physical speech results

Same pinned source/model, four fixed phrases twice, seed 3901, float32 and 16 sampling steps:

| Measurement | P5000 | MSI integrated Intel Arc |
|---|---:|---:|
| Successful generations | 8/8 | 8/8 after loader correction |
| Process startup | 6.83 s | 12.64 s |
| Median generation | 1.75 s | 4.94 s |
| Generation range | 1.13–2.41 s | 2.68–7.05 s |
| Weighted RTF | 0.379 | 1.067 |
| Audio seconds / wall second | 2.64 | 0.94 |
| Peak sampled process RSS during generation | 1.57 GB | 6.92 GB |
| Identical WAV hashes across repeats | 4/4 phrases | 4/4 phrases |
| Streaming | No | No |

P5000 peak framework allocation: 3,489,684,992 bytes. Protected local-model baseline was approximately 7,037 MiB; combined resident memory with the speech pilot was approximately 10,257 MiB. GPU samples are whole-device values including protected workloads, not speech-only attribution. Isolated P5000 environment footprint 6,107,953,783 logical bytes; model directory 3,267,473,882 logical bytes (includes bundled assets, not just parameters). CPU/GPU/power samples and exact raw results accompany local evidence. MSI free-device-memory and separate GPU-power metrics are unavailable rather than zero. This is eight generations, not a long-duration soak.

The initial MSI load failed because Transformers queried unsupported integrated-XPU free memory. Loading on CPU and moving the model/tokenizer explicitly to XPU removed that block; actual inference then passed. Existing MSI qualification environments and drivers were not modified. Both backends generated a synthetic-reference cloned sample with persisted prompt provenance. Human similarity and subjective listening ratings remain unmeasured.

Whisper tiny.en CPU physically transcribed four generated WAVs. Warm processing was approximately 0.70–0.95 seconds; the first 16.99-second call included lazy initialization/download. Ordinary English status phrases were close to the intended text. The Collingham vocabulary round trip produced place-name errors, which cannot be attributed solely to TTS or STT without human listening. This is generated-audio/STT qualification, not WhatsApp voice delivery.

## Models

Both protected local Qwen endpoints produced real responses. Initial generic JSON-only qualification failed because responses included Markdown fences. An explicit strict output schema and JSON-only instruction corrected the request without weakening the verifier. Both exact model identities then passed the existing bounded coding and identity checks. Original failures and corrected response hashes/usage remain preserved. These probes are model qualification; they are not a social Work Parcel or real handoff. A bounded real repository-review request was then rejected with `model_route_unavailable`: neither coding qualification proves the separate `repository-review` capability. No execution parcel or inference was created for that rejected request. No model route has been enabled for the Social & Voice pilot.

## Live channel and video

Existing gateway account linking, separate operator enrolment, help, test execution, cancellation/cleanup, status, reconnect and signed delivery acknowledgements remain preserved from the OpenWA qualification. The new voice-input → confirmation → Work Parcel → text/audio delivery scenario is pending a real operator voice note. No fixture will substitute for that phone action.

The current evidence recorder uses dedicated Xvfb display `:102`. It combines separately captured **actual WhatsApp Web conversation** and **actual dashboard** surfaces. The chat list and identity header are excluded; QR/session secrets and handset footage are not captured. Raw recording is retained privately. A completed release video and chronological qualification transcript remain pending the actual interaction.

Verdict at this checkpoint: **BLOCKED for complete Social & Voice end-to-end physical qualification**, with functioning physical TTS on both GPUs and CPU STT. This checkpoint is not a release recommendation or production readiness claim.
