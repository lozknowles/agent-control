# Agent Control dashboard characters — qualification evidence

## Verdict

**PASS — DASHBOARD CHARACTER SYSTEM QUALIFIED**

The character system was exercised from implementation commit `5285626917a6ed4e473079b9fe18fba6f471e165` on `feature/animated-dashboard-bots`. The run used an isolated `AgentControlService` over loopback and did not deploy, mutate production state, or use external credentials.

## Governed exercise

The browser submitted one real bounded Work Parcel through the authenticated dashboard. Agent Control planned two dependent stages, dispatched both through `JobRuntime`, held one worker at capacity, accepted one durable operator answer through the web path, ran a frozen three-task model evaluation against the locally available provider, and independently accepted verification evidence.

| Evidence | Result |
| --- | --- |
| Work Parcel | `parcel-dcf63093-3b10-4e2e-9f2e-201650a2201d` — `SUCCEEDED` |
| Job Runs | `run-d3be2241-dee9-48e3-82dd-330fa8b01453`, `run-f6e994a4-4e03-4619-b8b5-22b2d47af424` — both succeeded |
| Stage batons | `0792ae60bb3f9d552e5612e61c8b1261ce7870360780532cd9f707116a0c5eed`, `b63d49ea2c5bf2fd744280c9e34c63eb0dde6e4753faed1857de13875cbabbc0` |
| Operator question | answered through the authenticated dashboard as `web-operator` |
| Model route | `local-dashboard-qualification` / `local-dashboard-qualification-model` / `qwen2.5-3b-instruct-q4_k_m.gguf` / `qualification-worker` |
| Frozen evaluations | coding `192`, repository review `251`, structured output `95` provider-reported tokens; all `PASSED` |
| Cost | unavailable; the local provider has no configured monetary pricing, so no zero-cost claim is made |
| Event transport | 26 retained typed events across Parcel, Run, model-intelligence and verification transitions |

The actual concurrent state visible in the video was:

| Character | Real state | Real supporting condition |
| --- | --- | --- |
| Cadence | `working` | two active executions, one queued/waiting condition and one blocked lane |
| Quill | `awaiting_operator` | one durable high-priority question awaited a dashboard answer |
| Relay | `working` | one Work Parcel stage was running |
| Lumen | `working` | one frozen provider-neutral model evaluation batch was running |
| Rook | `resource_pressure` | the only qualified worker was busy at capacity |
| Verity | `reviewing` | independent verification/evidence collection was active |

The recording then shows Relay and Verity settle to `completed`, Quill and Rook return to `idle`, and Lumen truthfully report `blocked` because the completed evaluation did not itself promote the registry route to qualified.

## Video and animation proof

The [40.88-second MP4](agent-control-dashboard-characters.mp4) is H.264 at 1920×1080 and 25 fps. SHA-256: `13705a2216630a5b78f73daa1343f9bfc76e136d52877626f30ec7e33a1156e4`.

At `2026-09-06T13:24:37.017Z`, all six operational cards were simultaneously inside the 1920×1080 viewport for a four-second recorded dwell. The browser sampled each Web Animation twice, approximately 633 ms apart. Every animation timeline advanced and every sampled transform changed:

| Character | Stable accent | Running animations during real state |
| --- | --- | --- |
| Cadence | `#4f8cff` | float, blink, conduct |
| Quill | `#a879ff` | float, blink |
| Relay | `#35c7be` | float, blink, dispatch |
| Lumen | `#ff9b4a` | float, blink, scan |
| Rook | `#55c979` | warning, blink, gauge |
| Verity | `#e3b84e` | float, blink, inspect |

The full bounds, timeline deltas, transform-change assertions, browser version, lifecycle states and hashes are in the [video manifest](agent-control-dashboard-characters-video.json). The browser reported `LIVE`, no console errors and no HTTP errors. Rook navigation was exercised by pointer to `#systems-list`; Relay navigation was exercised with keyboard Enter to `#parcel-list`. Reduced mode left only the infrequent blink animation active.

## Screenshots

- [Initial authoritative Crew](agent-control-dashboard-characters/01-crew-initial.png)
- [All six visible during real concurrent activity](agent-control-dashboard-characters/02-crew-concurrent-live.png)
- [Rook navigation to resource evidence](agent-control-dashboard-characters/03-resource-navigation.png)
- [All six visible after the governed exercise](agent-control-dashboard-characters/04-crew-completed.png)
- [Reduced-motion setting](agent-control-dashboard-characters/05-crew-reduced-motion.png)
- [Clearly simulated mixed gallery on a light canvas](agent-control-dashboard-characters/06-simulated-gallery-light.png)
- [Clearly simulated stale gallery on a dark canvas](agent-control-dashboard-characters/07-simulated-gallery-stale-dark.png)
- [Responsive 390×844 Crew and gallery](agent-control-dashboard-characters/08-crew-mobile.png)

All screenshot hashes and dimensions are recorded in the video manifest.

## Coverage boundary

Physically demonstrated from canonical runtime events:

- idle, working, awaiting-operator, resource-pressure, reviewing, completed and blocked primary poses;
- concurrent active, queued, blocked, question, pressure and verification badges/counts;
- actual event-driven pose changes, full animation, completion acknowledgement, reduced motion, pointer navigation, keyboard navigation, desktop and mobile layout;
- HTTP status reconciliation and typed SSE refresh;
- Work Parcel, Job, baton, provider/model-evaluation and independent-verification sources.

Deterministically tested without fabricating runtime evidence:

- precedence under mixed activity;
- stale active telemetry remaining stale rather than failed;
- waiting, recovery and explicit blocking remaining distinct;
- pending cancellation versus confirmed cancellation;
- a pending handoff pose clearing after a later success/failure result;
- completion acknowledgement suppression on initial load, stale state and reconnect;
- offline, unknown and failed mappings;
- complete 17-state vocabulary, text/icon equivalents and gallery controls.

Simulated and labelled as such:

- arbitrary character/state combinations, all-stale and mixed presets, and light/dark inspection canvases. These controls use browser memory only and never write Agent Control state.

Known limitation: Agent Control has no separately instrumented prompt-review worker. Quill therefore reports Work Parcel planning/readiness and durable questions with `partial` coverage; it does not claim independent prompt review.

## Validation

Commands and results:

- `npm run record:dashboard-characters` — `PASS`; real governed exercise, browser recording, eight screenshots and evidence reconciliation.
- `npm run check` — `PASS`; TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, 45 implementation-status entries, and `845/845` tests.
- `git diff --check` — `PASS` before the implementation checkpoint and repeated before evidence commit.

Machine-readable qualification: [agent-control-dashboard-characters-qualification.json](agent-control-dashboard-characters-qualification.json), SHA-256 `96df9652eaaac290dd3aae239092e1f44f460e40eff47a65a9f071c414cdff3c`.

Video manifest: [agent-control-dashboard-characters-video.json](agent-control-dashboard-characters-video.json), SHA-256 `8b931de1d55b15310bf61618fb97bea11abc21d1158b7b0a77819da8da3132b9`.
