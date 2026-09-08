# Agent Control 4.1 qualification

Status: **CANDIDATE — RELEASE GATES INCOMPLETE**.

Release and deployment are authorized only after all required gates pass. This
record does not promote historical checks, component audio or automated browser
fixtures to physical qualification.

## Recovered provenance

- Base release: `v4.0.0`, source `ff7ed114c08b71583e2a2d67b40d081f0b0a4c33`.
- Isolated branch: `feature/poe-dashboard-operator-20260908`.
- Recovered checkpoint: `ef4f409dcf496a9ba64f52b184a31e91b7328372`, clean on recovery.
- Prior full runner checkpoint: `6946a9a895398af663f628cb2cdfcf384f74ae5a`.
  The complete `npm run check` passed with 1,070 tests at that checkpoint.
- The later thousands-formatting repair passed eight focused checks; that is not
  a final full-suite result.
- Original blocked physical records remain immutable, with SHA-256
  `0c1555e755dbc8aa20d384f75907f5c0526f27076b40d10fe949e73c7e12bd89` (JSON) and
  `981967f5ef5243f8d7ea2545d6324e19b81e1fb5d43d8dac0ce17921e74150a1` (Markdown).

## Current evidence and open gates

| Gate | Evidence / remaining work |
| --- | --- |
| Floating layout | Automated desktop/mobile, keyboard and reduced-motion checks passed before the final documentation/model-identity candidate; rerun for the final candidate. |
| Spoken tour sequencing | Controlled tests cover actual playback-end gating, autoplay failure/retry, decoding failure and interrupted old audio. A real Jobs explanation played and unlocked Next afterward. |
| Voice content | Original male OmniVoice identity is configured. Real synthesis/transcription checks and browser playback occurred. Human intelligibility confirmation remains pending. |
| Short capture | At recovered checkpoint, native Windows capture produced 3,323 frames, 3840×2040, 30 fps, 110.766667 seconds, with a real Windows output track containing the greeting. Full-tour crop must preserve navigation. |
| Physical microphone and barge-in | Complete qualifying operator interaction and accepted audiovisual evidence remain pending. Synthetic permission-denial tests do not satisfy this gate. |
| Grounded conversation | Approved Codex route has produced real sourced replies. Complete final-candidate question coverage remains pending. |
| Jobs, schedules and workflow | Real local and read-only remote registries are wired. Final recorded walkthrough remains pending; no Facebook publication is authorized for the demo. |
| Governed work and Crew | Normal registered job, explicit approval, real handover/receipt and final verification must be recorded and reconciled on the final candidate. |
| Network | Private HTTPS Serve configuration preserves loopback backend binding and no Funnel. Distinguish direct Windows tests from configuration-based access restrictions in final evidence. |
| Full regression and install | Run all final-candidate checks and isolated installation validation; historical totals do not satisfy this gate. |
| Full and public videos | Full recording remains private. Public edit, captions, transcript, complete intelligibility/sync/privacy review and public playback are pending. |
| Release and deployment | No 4.1 release tag, merge or production rollout is claimed. |

## Continuation evidence, 8 September 2026

The version consistency repair passed the full suite at `c639187` (1,072 tests).
The approved-benchmark handover/completion repair passed at `f432be4` (1,073
tests, zero failures or skips). It reconciles only server-owned, approved
benchmark parcels belonging to the authenticated conversation, along with that
conversation's ordinary job requests. Its integration check executes the normal
two-stage runtime, observes a real sealed baton and receipt, checks isolation and
one-time announcements, and prevents early completion.

An isolated clean configuration started successfully at `f432be4`: the API and
CLI both reported 4.1.0, the dashboard loaded, private conversation access returned
401 without authentication, and authenticated conversation/configuration reads
succeeded. The owned test process stopped afterward. Package dry-run inspection
found no credential/state directories in its 873-file, approximately 90.6 MB
source archive. These results precede subsequent conversation-quality fixes;
the final candidate requires a fresh runner and installation record.

The real Windows Edge conversation
`poe-conversation:264c1497-42ae-4c07-9b5b-77ba1dc4bb00` contains all 20 requested
typed questions, a repeated role question after correction, and the exact
registered-job follow-up. Its source packets distinguish the commits used by
each answer. The original role answer described an internal response port;
the corrected answer introduces the conversational operator and part-time tour
guide. An approval question exposed a missing natural-language topic match,
subsequently repaired with a regression check.

The operator reviewed the actual `operator-system-observation@1.1.0` proposal and
approved it through the interface at 20:51:50 UTC. Work Parcel
`parcel-social-24c40a95958fefc1369d4ee9edb7e00df3cbaf4d01fe9c761d3bfb02f510c413`
completed its observation and separate persisted-artifact verification, followed
by POE's reconciled completion at 20:51:51 UTC. This deterministic control job
invoked no model. Its verifier is a separate checking step, not an independent
model agent. Private evidence retains the complete transcript, approval seal,
source observations, parcel and verification records under
`typed-browser-20260908/`.

These typed and approval checks do not satisfy the audiovisual gate. The next
native capture attempt failed its minimum-HD guard; Windows capture returned
`IGraphicsCaptureItemInterop.CreateForMonitor` error `0x80070057`, and native
window activation failed. The attempt was stopped. The user has been asked to
restore the unlocked display and complete real microphone input, interruption
and human voice/intelligibility confirmation. No accepted full recording, public
edit or physical barge-in is claimed.

Production discovery identified the isolated qualification dashboard but no
existing general production dashboard supervisor/state target. Separate
Collingham and monitoring units are preserved. The requested production target
identity remains necessary to prepare its exact state backup and rollback.

The separate website candidate `58405a9` adds the Agent Control link immediately
after Murmuration for desktop and mobile, and a native-video overview page.
The publication privacy build and all 13 existing Python tests pass. Headless
1920, 390 and 320 pixel checks verify link order, layout and media references;
desktop overview and narrow mobile homepage screenshots were visually reviewed.
Accepted media, captions/transcript, release links and public playback are still
pending. No website deployment has occurred.

## Discovered defects retained in evidence

Previous video attempts captured the wrong physical tab, incorrect monitor bounds
or stopped before the interaction completed. Browser automation screenshots did
not prove what native desktop capture recorded. The corrected workflow selects
the native POE tab, checks HD bounds, makes a short capture and inspects actual
video and speaker audio before starting the full recording.

An earlier speech formatter split comma-grouped counts, such as `1,070`. The
recovered repair normalizes thousands in synthesis and content comparison.
Regression narration now describes the supplied snapshot as a past observation,
because synthesis can outlast a runner phase. Earlier incorrect narration is
retained as failure evidence and must not appear as accepted narration.

## Evidence handling and release reconciliation

The private evidence set retains exact initiating prompts, complete natural
transcripts, real speech text and voice identity, source and configuration hashes,
route/usage observations, approval seals, Work Parcel/Run/baton IDs, verification,
browser/capture timestamps and media checksums. Do not publish tokens, credential
homes, private conversations, identity material or sensitive operational details.

The final release manifest must identify the tested product SHA and tag SHA,
explain any evidence-only delta, record full-suite counts from the runner, and
link the reviewed public overview separately from private qualification media.
Merge, tag, deployment and website publication remain gated by this record.

See [installation and deployment](../installation-deployment-4.1.md) and
[POE's event-to-animation mapping](../poe-dashboard-operator.md#state-and-animation-provenance).
