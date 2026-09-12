# Morrow and robotic crew validation

Date: 2026-09-12. Scope: original Morrow identity replacing the public POE presentation, plus a consistent appearance for all six existing robotic crew members.

This is the original isolated identity record. The later user-authorised 4.5 merge and combined validation are recorded in the [integration report](../morrow-4.5-integration/validation.md); publication status below is historical.

## Isolation

- Dedicated independent checkout and branch: `feature/morrow-host-identity`.
- Base: `2e74d88db57e3ad15ce1d85ec93220d087b9592f` (published main).
- Active release-gate branch checked at `544a4fb4c8a9f6702adb944ab43de90daa7e67d6`.
- No overlapping changed files with that published release-gate branch.
- No edits to another checkout, merge, tag, release, live state, configured provider or production service.
- Private uncommitted work on the remote machines was not observable: the remote desktop connector reported MSI offline.

## Checks

| Check | Result |
| --- | --- |
| `npm run check` | PASS: TypeScript, bootstrap, dashboard, neutrality, implementation status, and 1,157 tests; 0 failed, 0 skipped |
| Final focused host-model, knowledge and robot-renderer tests | PASS; see [follow-up log](focused-checks.txt) |
| Legacy conversation restoration | PASS: historical greeting, actor/schema identifiers and sealed proposal hash retained |
| New and legacy text/voice invocation | PASS with controlled transcription fixtures; no Work Parcel created by read-only questions |
| Morrow voice interruption | PASS with controlled speech fixture; targets existing playback, no work cancellation |
| Crew state and animation-policy logic | PASS: role identities, colours, state vocabulary, sleep/wake, motion and completion freshness retained |
| Repeated robot SVGs | PASS: unique gradient IDs and local references; no inline style requirement under the production CSP |
| Standalone preview script and embedded JavaScript | PASS syntax checks |
| Artwork | Seven production SVGs exported and rendered offline for visual inspection |
| `git diff --check` | PASS |

The full check preceded the final added gradient-identity regression test and help-text refinements. The final focused run covers that additional test and the changed model/knowledge surfaces. The production runtime code was not changed after those checks.

## Limits and next integration step

The cloud browser rejected local HTTP and local-file preview URLs. No browser-policy bypass was attempted. The [artwork board](../../evidence-archive.md) is an offline SVG render, **not** a browser screenshot. The [standalone preview](preview.html) uses the current artwork and production robot renderer, with explicitly simulated state controls. Desktop/mobile layout, microphone recognition of “Morrow”, and physical OmniVoice playback are not newly qualified by this change.

The currently configured designed voice, seed and hash are preserved. No new voice was generated or deployed. Existing 4.5 qualification evidence is unchanged and does not establish physical validation of the new identity.

The replacement is prepared for normal integration review on its own branch. It has not been deployed into the running Agent Control instance. Complete the normal browser/device checks during an agreed integration window, without restarting a service that is executing active 4.5 work.

See [machine-readable evidence](validation.json), [full check log](full-check.txt), and [identity/compatibility guide](../../morrow.md).
