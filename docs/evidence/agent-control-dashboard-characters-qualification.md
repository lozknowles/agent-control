# Agent Control dashboard characters — qualification evidence

## Verdict

**PASS — DASHBOARD CHARACTER SYSTEM QUALIFIED**

The character system was exercised from implementation commit `ba19b0fe02d86d5fe381edabfb50ad1ef32fb00e` on `feature/animated-dashboard-bots`. The run used an isolated `AgentControlService` over loopback and did not deploy, mutate production state, or use external credentials.

## Governed exercise

The browser submitted one real bounded Work Parcel through the authenticated dashboard. Agent Control planned two dependent stages, dispatched both through `JobRuntime`, held one worker at capacity, accepted one durable operator answer through the web path, ran a frozen three-task model evaluation against the locally available provider, and independently accepted verification evidence.

| Evidence | Result |
| --- | --- |
| Work Parcel | `parcel-ada0213f-36ee-471e-aca8-5c38b02b6a33` — `SUCCEEDED` |
| Job Runs | `run-50b29b38-0b30-41f8-b5de-d4b78aab45ab`, `run-97ae9ae4-90bc-485e-a00c-296a22454e5b` — both succeeded |
| Stage batons | `f58521ad0605b59eb019254f5762b833452ccfb56738b77f212e498281135480`, `071deada7af28f3580ce8401452f5f10254e0b31f7048f5ce37b5083bb6a25f5` |
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

The [43.48-second MP4](../evidence-archive.md) is H.264 at 1920×1080 and 25 fps. SHA-256: `4faba20d80e41e34d9ad6e1e699a95a93c4634a4ac6e6a6682c1e284ec0d8907`.

At `2026-09-06T13:45:11.041Z`, all six operational cards were simultaneously inside the 1920×1080 viewport for a four-second recorded dwell. The browser sampled each Web Animation twice, approximately 650 ms apart. Every animation timeline advanced and every sampled transform changed:

| Character | Stable accent | Running animations during real state |
| --- | --- | --- |
| Cadence | `#4f8cff` | float, blink, conduct |
| Quill | `#a879ff` | float, blink |
| Relay | `#35c7be` | float, blink, dispatch |
| Lumen | `#ff9b4a` | float, blink, scan |
| Rook | `#55c979` | warning, blink, gauge |
| Verity | `#e3b84e` | float, blink, inspect |

Before work submission, the same real status projection also showed both ambient idle dispositions at once. Quill and Relay retained canonical `idle` while sleeping with breathing, nod, closed-eye/periodic-peek and drifting-`Z` animations. Rook retained canonical `idle` while looking around with eye, head and antenna movement. The recorder sampled the required `bot-sleep-breathe` and `bot-look-around` animations approximately 1,017 ms apart; every timeline advanced and every transform changed. This motion did not create or alter an Agent Control event.

The full bounds, timeline deltas, transform-change assertions, browser version, lifecycle states and hashes are in the [video manifest](agent-control-dashboard-characters-video.json). The browser reported `LIVE`, no console errors and no HTTP errors. Rook navigation was exercised by pointer to `#systems-list`; Relay navigation was exercised with keyboard Enter to `#parcel-list`. Reduced mode left only the infrequent blink animation active.

## Screenshots

- [Initial authoritative Crew](../evidence-archive.md)
- [All six visible during real concurrent activity](../evidence-archive.md)
- [Rook navigation to resource evidence](../evidence-archive.md)
- [All six visible after the governed exercise](../evidence-archive.md)
- [Reduced-motion setting](../evidence-archive.md)
- [Clearly simulated mixed gallery on a light canvas](../evidence-archive.md)
- [Clearly simulated stale gallery on a dark canvas](../evidence-archive.md)
- [Responsive 390×844 Crew and gallery](../evidence-archive.md)

All screenshot hashes and dimensions are recorded in the video manifest.

## Coverage boundary

Physically demonstrated from canonical runtime events:

- idle, working, awaiting-operator, resource-pressure, reviewing, completed and blocked primary poses;
- simultaneous real idle look-around and sleep/breathe/periodic-wake behavior without changing canonical `idle` state;
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
- focused character/web suite — `PASS`; `51/51` tests.
- `npm run check` — `PASS`; TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, 45 implementation-status entries, and `846/846` tests.
- `git diff --check` — `PASS` before the implementation checkpoint and repeated before evidence commit.

Machine-readable qualification: [agent-control-dashboard-characters-qualification.json](agent-control-dashboard-characters-qualification.json), SHA-256 `d4408700d922885a2a8c334f07210ce117e3b4726e258785b777a034fd35135e`.

Video manifest: [agent-control-dashboard-characters-video.json](agent-control-dashboard-characters-video.json), SHA-256 `7d16c516bf13f936ef7a4e641c06292b4fad8692ad355ac617a394e431f80e02`.
