# Social & Voice: chronological human-readable transcript

UTC timestamps below; WhatsApp displays BST (UTC+1). Actual enrolled conversation and durable runtime history. Controlled recovery is labelled separately. Detailed hashes and raw events are in social-voice-live-chain.json.

| UTC | Observation |
|---|---|
| 20:22:07 | Human text: **start test-execution voice** |
| 20:22:08 | Enrolled template grant allows **test-execution** through the governed Work Parcel. |
| 20:22:08 | Bot queues text: Job AC-1 accepted: test-execution.. Full correlation below. |
| 20:22:08 | Bot queues text: Job AC-1: QUEUED / Approved repository tests: QUEUED.. Full correlation below. |
| 20:22:08 | Authoritative runtime: **QUEUED**; node not assigned / unavailable; elapsed 0.0 seconds. |
| 20:22:09 | Bot queues text: Job AC-1: RUNNING / Approved repository tests: RUNNING.. Full correlation below. |
| 20:22:09 | Authoritative runtime: **RUNNING**; node controller; elapsed 1.0 seconds. |
| 20:22:31 | Bot queues text: Job AC-1: FAILED / Approved repository tests: FAILED.. Full correlation below. |
| 20:22:31 | Authoritative runtime: **FAILED**; node controller; elapsed 22.3 seconds. |
| 20:22:34 | Voice generated: earlier summary (text not recorded in this event); 8.22 seconds. Delivery is recorded separately below. |
| 20:28:26 | Authenticated dashboard recovery requests a new short summary for the owned terminal job. This is not a new phone command. |
| 20:28:28 | Voice generated: Job 1 failed in 22 seconds. The detailed report is available in the dashboard.; 5.44 seconds. Delivery is recorded separately below. |
| 20:29:39 | Authenticated dashboard recovery requests a new short summary for the owned terminal job. This is not a new phone command. |
| 20:29:41 | Voice generated: Job 1 failed in 22 seconds. The detailed report is available in the dashboard.; 5.44 seconds. Delivery is recorded separately below. |
| 20:32:41 | Human text: **start test-execution voice** |
| 20:32:42 | Enrolled template grant allows **test-execution** through the governed Work Parcel. |
| 20:32:42 | Bot queues text: Job AC-2 accepted: test-execution.. Full correlation below. |
| 20:32:42 | Bot queues text: Job AC-2: QUEUED / Approved repository tests: QUEUED.. Full correlation below. |
| 20:32:42 | Authoritative runtime: **QUEUED**; node not assigned / unavailable; elapsed 0.0 seconds. |
| 20:32:43 | Bot queues text: Job AC-2: RUNNING / Approved repository tests: RUNNING.. Full correlation below. |
| 20:32:43 | Authoritative runtime: **RUNNING**; node controller; elapsed 1.0 seconds. |
| 20:32:56 | Bot queues text: Job AC-2: SUCCEEDED / Approved repository tests: SUCCEEDED.. Full correlation below. |
| 20:32:56 | Authoritative runtime: **SUCCEEDED**; node controller; elapsed 13.9 seconds. |
| 20:32:58 | Voice generated: Job 2 completed successfully in 14 seconds. The detailed report is available in the dashboard.; 6.52 seconds. Delivery is recorded separately below. |
| 20:34:19 | Actual incoming human voice note accepted from enrolled direct sender. |
| 20:34:22 | CPU STT: **Start test execution**. This transcription is untrusted input. |
| 20:34:22 | Bot queues text: I heard: Start test execution / No action was executed. To confirm and receive a voice result, send this as a new text message: / start test-execution voice |
| 20:34:22 | Bot requires fresh human text: **start test-execution voice**. No execution yet. |
| 20:35:02 | Human text: **start test-execution voice** |
| 20:35:02 | New human text confirms the voice intent; source and confirmation are durably linked. |
| 20:35:02 | Enrolled template grant allows **test-execution** through the governed Work Parcel. |
| 20:35:02 | Bot queues text: Job AC-3 accepted: test-execution.. Full correlation below. |
| 20:35:02 | Bot queues text: Job AC-3: QUEUED / Approved repository tests: QUEUED.. Full correlation below. |
| 20:35:02 | Authoritative runtime: **QUEUED**; node not assigned / unavailable; elapsed 0.0 seconds. |
| 20:35:03 | Bot queues text: Job AC-3: RUNNING / Approved repository tests: RUNNING.. Full correlation below. |
| 20:35:03 | Authoritative runtime: **RUNNING**; node controller; elapsed 1.0 seconds. |
| 20:35:23 | Bot queues text: Job AC-3: SUCCEEDED / Approved repository tests: SUCCEEDED.. Full correlation below. |
| 20:35:23 | Authoritative runtime: **SUCCEEDED**; node controller; elapsed 20.4 seconds. |
| 20:35:25 | Voice generated: Job 3 completed successfully in 20 seconds. The detailed report is available in the dashboard.; 6.52 seconds. Delivery is recorded separately below. |
| 20:39:01 | Authenticated dashboard recovery requests a new short summary for the owned terminal job. This is not a new phone command. |
| 20:39:03 | Voice generated: Agent Control job three completed successfully.; 2.98 seconds. Delivery is recorded separately below. |
| 20:46:31 | Authenticated dashboard recovery requests a new short summary for the owned terminal job. This is not a new phone command. |
| 20:46:31 | Speech unavailable/failed; existing text remains authoritative. |

## Job and dashboard correlation

- **AC-1 FAILED**: parcel `parcel-social-d014f74dd2ae423d3d9ee31a1a1df106947dcdf4fc950844b92cfcce8c3991f6`; runtime `run-149e6ba4-8f0f-41d4-b7f8-a2b8559f571c`.
- **AC-2 SUCCEEDED**: parcel `parcel-social-02df5b5f5dc1aa19cbf678c98e497ce2518f7cde064047f9a40affed69363c64`; runtime `run-d68239f6-0169-4d6a-b4d3-aaf6a836c491`.
- **AC-3 SUCCEEDED**: parcel `parcel-social-b789ef15c136d14ed246c7c01b86af5f0393165657229999da86c08351033666`; runtime `run-e1df8a3b-ac3a-4961-9c74-df4ba0a3763d`.

AC-1 failed and its original detailed action output was lost by the old failure path; a regression-backed fix now preserves failed action output. AC-2 and AC-3 typechecks succeeded, approximately 14 and 20 seconds. No model inference was needed: token, context, cache and cost metrics are unavailable/not applicable.

## Actual voice receipts and human listening

- Outbox 25: **uncertain**.
- Outbox 26: **uncertain**.
- Outbox 27: **delivered**.
- Outbox 32: **delivered**.
- Outbox 38: **delivered**.
- Outbox 39: **delivered**.

The earlier numeric summary sounded like noise. Its retrieved WhatsApp bytes matched generation, proving the defect preceded transport. Spelling job numbers and using one outcome sentence corrected speech. Outbox 39 delivered the corrected AC-3 note. The user then reported **“Clear slightly fast but clear”** in this Codex task. That is human handset listening evidence, not an automated quality score. Playback was subsequently slowed to 0.9; automated generation/codec/STT checks passed, with no second handset listening claim.

## Controlled recovery, separately classified

At 20:46:31 UTC a private speech service outage produced text fallback. A separately authenticated HTTP-triggered liveness run `run-a3b3a04f-8a29-4336-ba3c-8a312daa90ea` ran from 20:46:32 to 20:46:36 during the outage, then cancelled with confirmed SIGTERM process cleanup and no resource locks. Speech was restored. Signed HTTP replay/unauthorized/forwarded fixtures created no duplicate jobs. These are real runtime/HTTP fixtures, not additional WhatsApp commands. Earlier actual WhatsApp cancellation and reconnect remain in the original evidence.

## Recording provenance

130-second chronological excerpts of actual WhatsApp Web and authenticated dashboard, captured separately on dedicated Xvfb :102. No handset/primary display, QR or session secret was captured. No audio track; the corrected retrieved outgoing audio is supplied separately. The video does not simulate a multi-model job.
