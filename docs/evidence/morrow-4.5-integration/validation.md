# Morrow and crew integration into the 4.5 candidate

Date: 2026-09-12. Status: **EXPERIMENTAL — NOT RELEASE READY**.
Target branch: `feature/4.5-release-gate-completion` (draft PR #14).

## Source integration

The user explicitly authorised merging and pushing the Morrow work after the other 4.5 workstream completed. The earlier publication block recorded in the isolated identity evidence is historical and is superseded by this authorisation.

- Completed 4.5 evidence parent: `5bd72802b6525a1ccce05df2a42be2e04c456d67`.
- Completed 4.5 implementation: `544a4fb4c8a9f6702adb944ab43de90daa7e67d6`.
- Original identity and crew parent: `72fe340f9983e99c65bfefb56a44f67324b2b6a7`.
- Integration prepared locally on `integration/4.5-morrow-crew` with a two-parent merge, retaining both workstreams' history.
- Both branches shared changes only in generated implementation-status files. Git merged them cleanly; regeneration and the status check confirm the combined result.
- Current README, architecture, changelog, release notes, deployment/testing guidance and Morrow documentation describe the combined candidate. Physical POE recordings, transcripts, manifests and their original source identities remain intact.

## Combined validation

| Check | Result |
| --- | --- |
| `npm run check` | **PASS: 1165/1165 tests**, 0 failed, 0 skipped; TypeScript, bootstrap, dashboard, neutrality and generated status also passed |
| `npm run verify:release-gate-completion-4.5` | **PASS**: 24 completion evidence manifest entries verified; all 12 routes retain their original terminal classifications |
| Preservation comparison against the completed 4.5 parent | **PASS**: 165 files byte-identical, including qualification evidence, memory/learning/routing code, changed completion scripts, package metadata, crew state logic and designed voice configuration |
| Documentation | Current-facing identity and integration guidance reconciled; local links checked separately |
| Publication hygiene | Diff whitespace and high-confidence secret-pattern checks recorded separately |

The tests cover Morrow's new and legacy invocation, restored conversations and sealed proposal hashes, once-only new greetings, speech interruption, robot state/policy behaviour and repeated SVG gradient identities. These are automated checks; controlled transcriptions do not establish physical microphone recognition.

The original seven-character [artwork board](../../evidence-archive.md) and [standalone preview](../morrow-host-identity/preview.html) use the implemented source artwork. The original [identity validation](../morrow-host-identity/validation.md) records its offline visual inspection and browser limitations. No new browser or device qualification is claimed for this integration.

## Evidence and remaining testing

- [Complete combined check log](full-check.txt)
- [Independent completion evidence verification](completion-evidence-check.txt)
- [Preserved file comparison](preservation-check.json)
- [Local documentation link check](link-check.json)
- [High-confidence secret-pattern scan](secret-scan.json)
- [Machine-readable integration validation and hashes](validation.json)

The historic HD recording retains SHA-256 `72f2462c42469076bb74fa1087d54c96ff91630c9c2aa0094e1b6700c3c2922d`. The completion recommendation remains EXPERIMENTAL: nine routes PASS/FIXED, two aliases UNSUPPORTED, and one BLOCKED_EXTERNAL. Unsupported Pixel readers, unavailable GLM authentication, negative energy findings and absent whole-node measurement retain their existing classifications.

Use the [Morrow testing guide](../../DEPLOYMENT.md#morrow-integration-testing) for physical desktop/mobile presentation, reduced/off motion, enrolled Morrow and legacy social/voice invocation, and a harmless governed Work Parcel. New recordings must identify the combined source commit they exercise. No stable main merge, tag, release, runtime deployment or service restart is performed by this source integration.
