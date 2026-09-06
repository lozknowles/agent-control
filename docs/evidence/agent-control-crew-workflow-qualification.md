# Agent Control Crew workflow qualification

## Verdict

**PASS — isolated Crew workflow projection qualified.**

The Agent Control Crew remained a read-only dashboard projection while a real authenticated request traversed `AgentControlService → WorkParcelCoordinator → JobRuntime`, executed a concurrent stage graph, passed sealed stage batons, produced a structured result and completed independent verification. A live local provider catalogue query and frozen model evaluation ran alongside the Parcel. The simulated gallery was present but was not used as runtime evidence.

This evidence does not merge, release, tag, deploy or alter the live Agent Control environment.

## Source and evidence

- Branch: `feature/3.9-crew-workflow-visualization`
- Recorded source commit: `6157f5da2e266e982caf5e0620b1b17ee0b975e3`
- Recorded source dirty-diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (the empty Git diff)
- Machine evidence: [`agent-control-crew-workflow-qualification.json`](agent-control-crew-workflow-qualification.json)
- Browser/video manifest: [`agent-control-crew-workflow-video.json`](agent-control-crew-workflow-video.json)
- H.264 recording: [`agent-control-crew-workflow.mp4`](agent-control-crew-workflow.mp4)
- Screenshots: [`agent-control-crew-workflow/`](agent-control-crew-workflow/)

The JSON manifests are authoritative for generated IDs, timestamps, hashes, byte sizes and raw measurement samples. The machine evidence SHA-256 is `e3ee947aaf17f8f123acdc109d9123e796f5020a611c1954289215043f40e667`; the video SHA-256 is `607a38f92c9f3eb3d788d3b74d1780e8a1d71767bebba324b57fa093725fae66`.

## What the demonstration exercised

The recorder used an isolated loopback Agent Control service and authenticated browser session. It submitted one real Work Parcel with this dependency graph:

```text
search repository evidence ─┐
                            ├─> compose structured result ─> independently verify
read architecture evidence ─┘
```

The search and read stages ran through separate registered workers at the same time. Each stage was a normal governed Job Action with a declared output schema and independent verification requirement. The composition stage read both predecessor artifacts from its sealed baton; the final stage independently reopened and checked that result. The Parcel recorded eight baton boundaries: dispatch and completion for each of four stages.

The browser also answered the durable format question through the existing authenticated Work Parcel question endpoint. No direct scheduler, worker, lease, stage-state or animation mutation was used.

Alongside the Parcel, Agent Control queried the live local provider catalogue and ran the frozen `coding-v1`, `repository-review-v1` and `structured-output-v1` tasks against `qwen2.5-3b-instruct-q4_k_m.gguf`. All three verified `PASS`; provider-reported totals were 192, 251 and 95 tokens. Monetary cost remained explicitly unavailable. Completion of that evaluation did not qualify or enable the model route: the Crew displayed routing disabled because registry qualification remained `UNTESTED`.

## Truth boundary

`agent-control.dashboard-character-crew/v2` separates:

- canonical operational state;
- current source-backed activity, source ID and classified tool;
- a browser-only animation expression carrying `authority: presentation-only`.

The Crew projected all six roles, the actual Parcel DAG, selected worker routes, two simultaneous `RUNNING` stages, SEARCH and FILE tools, deterministic narration, model lifecycle events and the exact reasons attached to durable Parcel batons. A future waiting stage could not displace a currently running stage's tool. `STILL` states did not receive ambient movement.

No model generated narration. No character code entered the execution dependency graph. The browser animation bundle read `GET /api/status` and typed SSE; it had no execution writer. Closing the browser, hiding the Crew, selecting reduced/off motion or failing the presentation bundle cannot affect the Parcel.

## Idle, wake and terminal behavior

The recording captured both deterministic idle dispositions while operational state stayed `IDLE`:

- recently idle: staggered, discrete look-around;
- sustained idle: closed eyes, subtle opacity breathing and a bounded `Z` signal.

A sleeping character received a one-shot `WAKING` expression only after authoritative Parcel work arrived. Failure/pressure remained restrained and inspectable. Completion used a transition-only acknowledgement; initial load and reconnect are excluded from acknowledgement eligibility.

## Progressive disclosure

- Level 1 showed all six Crew cards, the deterministic headline/narration, actual concurrency and workflow columns.
- Level 2 opened Rook's source-backed explanation and a real baton's event ID, baton ID, time and exact reason.
- Level 3 navigated by pointer to Systems and by keyboard/Enter from Relay to Work Parcels.

The recorded focus interaction completed in approximately 102 ms. Exact timing is in the video manifest.

## Accessibility and responsive behavior

Qualification confirmed native keyboard controls, visible focus behavior, descriptive accessible names, textual operational/activity equivalents, icons in addition to colour, static baton reasons and system/user reduced-motion handling. Reduced mode retained only `bot-blink`; Work Parcel and baton transitions remained visible as static state.

At a 390 × 844 viewport all six cards remained available in a 310 px snap-aligned horizontal worker strip (`scrollWidth` 1940 px, `clientWidth` 368 px). Work Parcel, baton and provider/model columns collapsed to one column.

## Performance

Measurements use Chromium DevTools renderer metrics, `requestAnimationFrame`, and in-page typed-SSE receipt-to-Crew-render timestamps. They are renderer-process measurements, not whole-machine CPU measurements.

- Full motion without video capture: 4.89% renderer task share over 1.81 s; 109 frames; mean 16.55 ms, p95 16.70 ms, maximum 16.80 ms; no interval over 50 ms; heap delta +36,760 bytes.
- Reduced motion without video capture: 5.69% renderer task share over 1.81 s; 109 frames; p95 16.70 ms; no interval over 50 ms; heap delta +28,768 bytes. The small full/reduced share inversion is measurement noise; both retained a 60 Hz cadence.
- Real concurrent two-worker interval while recording: 26.57% renderer task share; 45 measured frames over 1.80 s; p95 interval 66.70 ms. This interval includes video capture and simultaneous qualification work and is not used as the normal-browser CPU estimate.
- SSE receipt to completed Crew render: 38 samples; median 144.7 ms, p95 452.7 ms, maximum 667.2 ms.

An earlier implementation animated whole-body SVG groups and caused layout on nearly every frame. Qualification discovered that presentation defect. Whole-body ambient/sleep/pressure motion now uses opacity on the HTML portrait, look-around is discrete, redundant nested idle transforms were removed, and the clean no-video measurement fell to two layouts in 1.81 seconds. Continuous role/tool movement remains bounded to active work. Agent Control itself performs no animation work.

## Physical evidence result

The accepted video is 1920 × 1080 H.264 at 25 fps and 36.48 seconds. It visibly covers initial idle looking/sleeping, all six concurrently animated roles, two real stage workers, SEARCH/FILE tools, a clickable sealed-baton reason, Level 2 explanation, Level 3 navigation, final verified completion, reduced motion and the mobile worker strip. Browser console and HTTP error lists were empty.

The real runtime evidence includes:

- one authenticated natural-language request;
- deterministic planning and a durable operator question;
- four governed Job Runs and four selected workers;
- two concurrent entry stages;
- eight sealed Parcel baton boundaries;
- structured composition from both predecessor artifacts;
- independent verification and lane evidence acceptance;
- one real local provider catalogue query;
- one three-task frozen local-model evaluation;
- 41 typed control events reconciled through status/SSE.

## Limitations

- Quill reports planning/readiness because no separately instrumented prompt-review worker exists.
- The bounded Parcel did not require a token-governor model escalation. Token/model handoff rendering is deterministically covered from genuine routing-record fixtures; this video demonstrates real Parcel-stage baton movement and exact-reason disclosure.
- NVIDIA was not contacted for this isolated no-credential demonstration. The same provider-neutral `provider.catalog_changed` projection is tested with NVIDIA-shaped `LIMITED`, HTTP failure and routing-disabled records; a real NVIDIA lifecycle still depends on its own governed discovery/qualification workflow emitting those facts.
- Headless video capture materially affects the concurrent frame sample; the separate no-video window is the representative steady-state renderer measurement.

## Validation

Focused validation covers state/activity/expression separation, source precedence, tool taxonomy, real concurrency, no fake progress, token/Parcel/lane baton origins, terminal handoff clearing, exact failure projection, deterministic narration, waking, reduced motion, mobile behavior and execution isolation.

Final commands:

```bash
node --test scripts/dashboard-bots.test.mjs
node --import tsx --test src/control/dashboard-characters.test.ts src/control/web-server.test.ts
npm run typecheck
npm run check:dashboard
npm run record:crew-workflow
npm run check
git diff --check
```

Results:

- focused TypeScript/API projection tests: 56/56 passed;
- focused browser/presentation tests: 8/8 passed;
- full repository suite: 900/900 passed;
- infrastructure-neutrality tests: 3/3 passed;
- implementation-status check: 47/47 entries passed;
- TypeScript, bootstrap syntax, dashboard syntax, Markdown local-link validation and `git diff --check`: passed;
- clean-source recording: PASS with nine screenshots, one H.264 video and no browser errors.

No live deployment was touched.
