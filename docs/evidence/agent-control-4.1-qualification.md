# Agent Control 4.1 qualification

Status: **QUALIFIED PRODUCT AND EDITED MEDIA ACCEPTED FOR AUTHORIZED RELEASE**.

Rollout and public delivery are recorded separately in the release manifest and deployment evidence.

This record supersedes the earlier continuation status below the same filename.
It distinguishes physical browser evidence, automated checks, configuration
observations and human listening. The operator explicitly directed release and deployment using the existing
qualification evidence on 9 September 2026. No additional listening attestation
is inferred from that direction; the evidence limitations remain explicit.

## Candidate and regression

- Base release: `v4.0.0`, `ff7ed114c08b71583e2a2d67b40d081f0b0a4c33`.
- Isolated branch: `feature/poe-dashboard-operator-20260908`.
- Tested product: `de1525f299dcc53a9d7d501a21c42360d0ba8d18`.
- Full `npm run check`: **1,083 passed, 0 failed, 0 skipped**.
- Runner: `219dc8d1-d5b2-4345-8684-803d86ccfe70`, from
  `2026-09-09T03:34:15.278Z` to `03:36:30.177Z`, 134,899 ms, exit 0.
- Isolated installation: six startup/API/authentication checks passed and the
  CLI reported 4.1.0; its owned process stopped afterward.
- Seven automated responsive/keyboard/reduced-motion checks passed against this
  product revision. These include a 390-pixel layout and remain automated checks,
  not physical-phone qualification.

The 1,070/1,073/1,078/1,082 totals in historical records are superseded by this
runner. Any later documentation/evidence commit must be reconciled separately
from this tested product SHA in the release manifest.

## Physical Windows qualification

The real Windows Edge session used private authenticated HTTPS, the configured
Codex/ChatGPT route and the original male OmniVoice identity. Its full natural
transcript starts with the initiating prompt and retains 57 turns:

- Conversation: `poe-conversation:500f649d-4fb7-4919-93cb-b106e002d533`.
- Transcript SHA-256:
  `644aaaabc11aa8e78f27515e1ed3a779611816a4ab88beb52e5101e4f97ab00b`.
- Final private export: `physical-accepted-de1525f/` in the owner's
  `poe-dashboard-operator-20260908` qualification evidence set.

| Gate | Observed evidence |
| --- | --- |
| POE and tour | Original moustached, waistcoated floating SVG companion; 15 actual feature steps, with real browser speech, captions, highlighted views and audio-ended Next gating. |
| Typing and grounding | Earlier retained conversation contains the 20 requested typed questions. Subsequent recorded tour and rechecks explain real catalogue/readiness, schedules, routing, Crew, approvals, verification and the Facebook discovery/publication boundary. |
| Microphone | Real browser permission and physical input captured in `physical-preflight-e048d45/`; recognized operator questions include “Is there anything running?” and “Why not?”. |
| Interruption | Two physical push-to-talk interruptions in the preflight, plus actual Stop speaking at `2026-09-09T03:29:20.928Z` on `861177f`. The latter stopped audible speech and retained INTERRUPTED, without cancelling jobs or a later false audio error. |
| Speaking animation | Mouth/activity changes observed while the actual Windows audio track played; speaking stopped after interruption. Runtime-linked role activity and gestures retain their event provenance. |
| Model identity | Actual reasoning model `gpt-5.6-luna` through the configured Codex/ChatGPT route. Model-registry identity and invoked model remain distinct. Unreported context/cost remain unavailable. |
| Work Parcel and Crew | Two real, explicitly approved, two-stage read-only observation parcels; four jobs passed their persisted-evidence verification. Two real sealed batons and receipts were narrated. |
| Completion | The owned batch reconciled 4 requested / 4 succeeded / 0 failed, blocked, cancelled, active or awaiting verification. POE's completion followed the actual terminal job records. |
| Final recheck | The final product resolved the selected parcel's explicit object link to its actual SUCCEEDED result and spoke the fresh 1,083-test result through the Windows browser. |

The full tour was recorded at `5510c37`; later answer-grounding corrections were
physically rechecked at `861177f` and `de1525f`. All 32 enumerated dashboard,
animation, voice-worker, voice-identity, progress and observation components are
byte-identical between the recorded tour and final product. The private
`release-evidence-de1525f/qualification.json` retains their individual hashes.
This is explicit component reconciliation, not a claim that every frame was
recorded from the final SHA.

### Actual governed work

Both sealed plans used the registered `operator-system-observation@1.1.0`, with
dependent `observation-a` and `observation-b` stages. The operator accepted the
real confirmation dialog; the second approval was captured after the operator's
unattended pause. No model executed this deterministic control job. Relay and
Verity are presentations of recorded operational roles, narrated by POE, not
additional autonomous agents or independent model invocations.

The second parcel's seal is
`0334d2ba1ee810d94d9c06dc493761dd46c898d56ba62f0873841b11a28e8188`.
Its baton `parcel-baton-2ba37b81-53ca-4fcc-a54b-88badae4109d` was created at
`03:19:04.141Z` and received at `03:19:04.153Z`, SHA-256
`6fad6dd2b6387e795171672120ef075209b81a126e9661b9d1c234d92495ac93`.
The receipt event's initial verification snapshot is PENDING; the separate
terminal stage/job records establish the later verified success.

The Facebook job was explained from actual read-only registries. Its recorded
daily 09:00 UK discovery run failed when its configured Pixel transport was
unavailable. No Facebook events were published and no unrelated consequential
job was run for this demonstration.

## Voice and capture provenance

Voice identity: `poe-original-male-hotelier-v2`, SHA-256
`7acf70f6f74a8878ec78d9c6b9babb521112106387e170035ba61e0f5ded8700`.
OmniVoice revision: `c5fdb5ccb189668d56333f77ba2629f4cd7535f4`, seed 4102.
The worker renders complete sentences with 150 ms pauses using this same
original voice. Whisper tiny.en revision
`87c7102498dcde7456f24cfd30239ca606ed9063` is the separate recognition/validation
engine; it is not the speech synthesizer.

The short preflight established actual picture and Windows output audio before
the full recording. The full two-part tour is 3840×2120 at 30 fps. The later
approval, handover, interruption and corrected-answer captures retain their
original dimensions, capture clocks, audio tracks and DOM/event observations.
Source checksums and failures are private evidence. A missing early DOM trace
was an instrumentation finding; it is not represented as a complete trace.

The public edit is 1920×1080, 30 fps, approximately **6 minutes 12 seconds**, with
21 chapters, 99 caption cues and an actual-audio transcript. It uses actual
Windows output, never separately generated narration. Waiting gaps, including
the unattended approval pause, are omitted; the four-second actual confirmation
transition remains. Captions describe only the spoken prefix of an interrupted
answer. Private account details are masked. The cut manifest preserves source
clips, SHA-256, timing offsets and corresponding turns. The corrected export passed a 372-frame privacy scan covering the complete
timeline at one-second intervals, whole-timeline contact-sheet/selected-frame
visual review, and browser caption/seek checks. One moving-panel account-label
mask was corrected and the earlier export retained privately as a finding.
The longest observed silence is 5.112 seconds around the actual confirmation.
Final video SHA-256 is
`392580298750a0763dbe1630c7556e08bdfb8123c1a238bb7ec9a8293973bce7`.
Human listening review of this exact shortened export remains pending.

Synthesis and content validation complete before playback. CPU generation is
not streaming TTS and can take longer than the spoken reply; the concise public
edit is not a latency benchmark. Human confirmation of intelligibility and the
male voice remains separate from successful playback and ASR comparisons.

## Private access and operational boundaries

Direct Windows checks confirmed tailnet membership, peer DNS resolution, HTTPS
200, unauthenticated conversation refusal (401), authenticated access, secure
context, microphone permission and actual browser audio. Real dashboard updates
continued through the qualification session.

The exact authorized operational command was:

```bash
sudo tailscale serve --bg --https=19196 http://127.0.0.1:19196
```

The backend remained loopback-only. Existing Serve configuration was inspected
and preserved; no reset, Funnel, public binding or SSH forwarding-policy change
was used. Tailnet-only restriction is supported by the Serve/listener
configuration. **An independent off-tailnet connection test was not performed.**
Remove only this listener if it remains solely a qualification listener.

Separate Collingham, monitoring and Social & Voice workers were preserved.
Only the owned qualification dashboard and original-male worker were changed.
Production discovery found no existing general POE dashboard unit. The prepared
cutover uses two dedicated user-systemd units, an immutable versioned release
and a quiesced private state backup. The existing private Serve listener is
retained as the production route. Unrelated services are not repointed.

## Findings corrected and retained

- Incorrect Systems/topic retrieval: corrected topic matching and evidence
  ranking, followed by real spoken rechecks.
- Speech number/negation handling and overlong synthesis: preserved validation,
  added sentence-chunk generation and retained false-ASR findings.
- Late events from retired audio: fenced by playback epoch; genuine interruption
  recheck remained stopped without a false FAILED transition.
- Voice engine versus recognition confusion and transcript availability:
  grounded in actual configuration/capability observations and rechecked.
- Explicit parcel link returned generic documentation: final revision resolves
  the exact supplied object ID against real evidence. A regression executes and
  verifies the parcel, checks the link, and confirms a Delete request stays
  blocked without further execution.
- Earlier non-HD/wrong-tab captures were rejected. They remain historical
  failure evidence and are not substituted for the accepted actual recordings.

## Release reconciliation and rollout record

The final documentation revision must remain product-byte-identical to the
tested `de1525f` checkpoint. The release manifest records that comparison, the
merged/tagged commit and package hashes. Existing physical evidence and the
edited media are accepted by the operator; no new human listening result is
fabricated. The release has documented limits for non-streaming TTS, sampled
export review and off-tailnet testing.

Production acceptance requires authenticated browser conversation and actual
audio after the scoped cutover. Public delivery requires the published MP4,
audio, captions, seeking, transcript and desktop/mobile navigation checks.
Their actual outcomes and rollback locations are retained with the final
release/deployment evidence, separately from this pre-rollout source record.

See [installation and deployment](../installation-deployment-4.1.md),
[release notes](../release-notes-4.1.0.md) and
[event-to-animation mapping](../poe-dashboard-operator.md#state-and-animation-provenance).
