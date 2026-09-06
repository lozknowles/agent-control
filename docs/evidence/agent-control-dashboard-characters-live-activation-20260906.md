# Agent Control dashboard characters — live activation evidence

## Verdict

**PASS — ANIMATED CREW ACTIVE ON THE EXISTING LIVE PILOT**

The telemetry-driven dashboard Crew was activated on the existing Agent Control 3.9 Social & Voice pilot at `2026-09-06T14:55:31+01:00`. The activation preserved the pilot's existing features and configuration; it did not merge to `main`, create a tag or release, or expose credential values.

## Provenance and rollback

| Item | Value |
| --- | --- |
| Integrated branch | `integration/3.9-social-voice-animated-dashboard` |
| Integrated commit | `9e5bdc63c4029634a2ae113b681e871801bb4440` |
| Previous live branch | `feature/3.9-social-voice-20260905` |
| Previous live commit / rollback checkpoint | `e831d9f128e9dc89d52f3615fbb59262c94a395b` |
| Character feature commit | `8ab4bce4f9d5d26756265bca7affe49b9f8dd168` |

Before restart, the scheduler queue was empty and no Work Parcel was active. The existing service was replaced in one bounded restart using the same credential environment reference and resource limits. The previous branch and exact commit remain the rollback checkpoint.

## Integration validation

The merge preserves both dashboard extensions:

- the pre-existing Social & Voice navigation and assets;
- the Crew tab, six character assets, status projection and animation runtime.

Validation before activation:

- combined focused Social/Voice and Crew coverage — `PASS`, `86/86` tests;
- `npm run check` — `PASS`, including TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, implementation-status verification and `888/888` tests;
- `git diff --check` — `PASS`;
- working tree at activation — clean.

## Live runtime checks

The restarted service reported:

- service state `active/running`;
- Agent Control version `3.9.0`;
- global health `healthy`;
- status schema `agent-control.system-status/v1`;
- Crew schema `agent-control.dashboard-character-crew/v1`;
- six canonical Crew members;
- Social & Voice page available;
- no warning-or-higher journal entries after activation.

The JavaScript and CSS served by the live service matched the integrated working tree byte-for-byte:

| Asset | SHA-256 |
| --- | --- |
| `dashboard-bots.js` | `a17fa20e2a6a054d35832e8dbc47542bba9f4687b8d8945294211d6353d4c887` |
| `dashboard-bots.css` | `9e4e35d08096e349400a1635476a407a9dafca3a404fb0619707df4bc36952b6` |

## Real animation proof

A Chromium browser opened the actual live dashboard, selected Crew and received a `LIVE` stream. All six character cards were visible. Browser animation samples taken approximately 1.1 seconds apart showed advancing animation timelines and changed transforms for every character. There were no browser console errors.

The live ledger projected these truthful canonical states:

| Character | Canonical state | Visual behaviour |
| --- | --- | --- |
| Cadence | `failed` | failed-state acknowledgement motion |
| Quill | `idle` | sleeping: closed eyes, breathing, nodding, drifting `Z` and periodic glance |
| Relay | `failed` | failed-state acknowledgement motion |
| Lumen | `unknown` | unknown-state ambient motion |
| Rook | `idle` | looking: eye movement, head tilt and antenna curiosity |
| Verity | `failed` | failed-state acknowledgement motion |

The historical `failed` and `unknown` states above are existing ledger outcomes, not activation failures. Idle disposition is presentation-only: Quill and Rook both remain canonically `idle`. The browser derives `looking` for a recently updated idle member and `sleeping` after 45 seconds (or when no update timestamp is available). It does not write a synthetic event or mutate Agent Control state.

Motion preference and lifecycle controls remain intact: full motion enables character behaviour, reduced motion retains only the infrequent blink, motion-off disables animation, and animations pause while the dashboard is hidden or offscreen.

## Feature qualification

The isolated governed qualification remains the reproducible proof of the complete active lifecycle, all six simultaneous operational animations, idle looking/sleeping behaviour, reduced motion and navigation:

- [qualification report](agent-control-dashboard-characters-qualification.md)
- [machine-readable evidence](agent-control-dashboard-characters-qualification.json)
- [video manifest](agent-control-dashboard-characters-video.json)
- [43.48-second qualification video](agent-control-dashboard-characters.mp4), SHA-256 `4faba20d80e41e34d9ad6e1e699a95a93c4634a4ac6e6a6682c1e284ec0d8907`

No release action was performed. The live activation is independently reversible to the recorded previous live commit.
