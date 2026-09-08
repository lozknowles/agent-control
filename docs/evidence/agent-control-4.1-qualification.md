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
