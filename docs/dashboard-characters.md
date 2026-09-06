# Dashboard operational characters

Agent Control can present six compact operational characters beside the dashboard areas they describe. They are a read-only presentation of the same canonical `AgentControlService` snapshot used by the rest of the dashboard. They do not create agents, invoke models, schedule work, infer hidden progress, or gain control-plane authority.

## Roster

| Name | Role | Identity | Non-colour identifier | Canonical area |
| --- | --- | --- | --- | --- |
| Cadence | Lane Master | blue | conductor baton and three-lane crown | Lanes, scheduler queue, Run concurrency and capacity |
| Quill | Master Prompt Reviewer | purple | document visor and marking quill | natural-language entry, Work Parcel planning and durable questions |
| Relay | Work Parcel Coordinator | teal | parcel harness and relay baton | Work Parcels, dependencies and recorded handoffs |
| Lumen | Model Scout | orange | survey lens and signal dish | Models registry and frozen qualification batches |
| Rook | Resource Guardian | green | shield frame and pressure gauge | Systems readiness, capacity and managed-node measurements |
| Verity | Quality Inspector | gold | inspection lens and check seal | Job Run, step and independent-verification evidence |

Identity colour is stable and never carries severity by itself. State text, an icon, expression, state prop, supporting reason and signal badges carry operational meaning. The characters are personalities only in the presentation layer.

Quill has deliberately partial instrumentation. Agent Control has no independent prompt-review worker in this release, so Quill reports only durable planning, readiness and open-question state. The card says so rather than implying a review that did not occur.

## Authoritative data flow

```text
Lane / scheduler / Run / Work Parcel / model / system / token records
                              |
                 AgentControlService.snapshot()
                              |
              projectDashboardCharacterCrew()
                              |
       GET /api/status + existing typed SSE refresh signal
                              |
         text/icon/card pose + optional CSS animation
```

`projectDashboardCharacterCrew` is deterministic and read-only. Its output is `agent-control.dashboard-character-crew/v1`. The browser does not parse terminals, provider prose or animation state to decide what happened. SSE events trigger a new authoritative status read; the existing five-second refresh remains a recovery fallback.

## Shared state vocabulary

The projection supports `idle`, `queued`, `working`, `reviewing`, `waiting`, `awaiting_operator`, `blocked`, `resource_pressure`, `recovering`, `handing_over`, `completed`, `failed`, `cancelling`, `cancelled`, `offline`, `stale`, and `unknown`.

The visual action is role-specific where the evidence supports active work: Cadence directs traffic, Quill marks a document, Relay dispatches a parcel, Lumen scans candidates, Rook checks a gauge, and Verity inspects evidence. A freshly idle character looks around; after 45 seconds without a newer authoritative update, the same truthful `idle` state settles into a breathing sleep pose with periodic brief wake-and-glance motion. This is browser presentation only and never changes, advances or infers operational state. Waiting, obstacle, warning, repair, handoff, completion, failure, cancellation, disconnected, stale and unknown props remain recognisable without colour or motion.

### Source mapping and precedence

| Character | Primary sources | High-to-low primary-state precedence |
| --- | --- | --- |
| Cadence | lanes, ordinary/parameterised Runs, scheduler pause, approvals, token handoff decisions | global pause; active recorded handoff; working; cancelling; recovering; operator wait; blocked; dependency wait; queued; failed; cancelled; idle |
| Quill | Work Parcel planning and durable open questions | operator question; reviewing/planning; queued; recorded planning failure; idle |
| Relay | Work Parcels/stages, Runs, token handoff decisions | active recorded handoff; working; cancelling; recovering; operator question; blocked; waiting; queued; failed; cancelled; completed; idle |
| Lumen | Models registry and frozen evaluation batches | running evaluation; queued evaluation; blocked/partial evidence; no inventory; no qualified route; idle |
| Rook | Systems readiness, provider auth, capacity and node measurements | measured pressure; active workload; auth required; all observed systems offline; all unknown; idle |
| Verity | Runs, steps and lane verification phases | reviewing; cancelling; blocked; failed; cancelled; completed; queued; idle |

One pose cannot represent every concurrent condition. The primary pose follows the table, while badges and counts preserve concurrent active, queued, waiting, blocked, recovery, operator, failure and completion facts. For example, three active lanes remain `working` while a separate blocked badge reports one blocked lane; neither fact hides the other.

An active observation older than 120 seconds is `stale`. Staleness replaces only an otherwise-live primary pose and retains the last-update age; it never invents failure. Missing observations remain `unknown` or explicitly unavailable. A cancellation request remains `cancelling` while cleanup/confirmation is pending and becomes `cancelled` only after canonical terminal state confirms it.

A handoff pose requires the latest handoff decision for a currently active token-governor thread to be a pending `BATON_AND_HANDOFF` record. A later `SUCCEEDED` or `FAILED` handoff result clears the pose. Merely crossing a threshold or creating a baton is not shown as a completed transfer. Provider, account and model route text appears only when the underlying stage reports it.

## Dashboard controls

Each operational card is a native keyboard-activatable button with a visible focus ring and an accessible name containing its identity, role, state and summary. Activating it opens and focuses the existing authoritative area:

- Cadence → Lanes;
- Quill → natural-language task entry;
- Relay → Work Parcels;
- Lumen → Models;
- Rook → Systems;
- Verity → Job Platform Runs and Run History.

Cards show the role/state, concise current fact and reason, relevant counts, elapsed and last-update age when available, the next operator action, telemetry coverage and any limitation. The click is navigation only; it does not mutate operational state.

## Motion and display settings

Open **Crew** in the primary dashboard navigation. Defaults are:

- operational characters: **Shown**;
- animation: **Full**;
- gallery canvas: **Dashboard**.

Choose **Reduced** for infrequent blink-only motion, **Off** for no character animation, or **Hidden** to remove operational cards while retaining the normal dashboard. In Full mode, fresh idle characters scan their surroundings and sustained-idle characters sleep, breathe, emit a small visual `Z`, and periodically wake to glance around. Preferences stay in browser-local storage as `agent-control-character-motion` and `agent-control-character-display`; they are not server configuration or durable Agent Control state. A system `prefers-reduced-motion: reduce` setting caps Full at Reduced. Hidden views, off-screen characters and background browser tabs pause animation.

No state relies on animation, flashing, sound or an overlay. Text/icon equivalents and focus operation remain in Reduced and Off modes. Card geometry is fixed across state changes; responsive breakpoints use three, two and one columns. Character colours use the dashboard variables, and the inspection gallery provides explicit dashboard, light and dark canvases.

Completion acknowledgement is brief and transition-only. It requires a previous non-completed state, a fresh current completed state and a live stream. Initial load, periodic reconstruction while disconnected, stale data and the first reconciliation after `RECONNECTING` suppress it, so a reload cannot replay old success.

To disable the entire web dashboard, set `AGENT_CONTROL_WEB_ENABLED=0`. To keep the dashboard but disable this presentation locally, open **Crew**, choose **Hidden**, and choose animation **Off**. These controls do not affect other users or server execution.

## Inspection gallery

The Crew view contains a clearly marked **SIMULATED — PREVIEW ONLY** gallery. Each character can be placed in any supported state; presets cover mixed activity and stale telemetry; one control can put the full roster into a selected state. The gallery uses an isolated in-memory map and never writes an API, creates a Job, alters the authoritative crew projection or enters durable evidence.

Use the gallery for visual inspection of accessories, expressions, text equivalents, reduced motion, light/dark canvases and responsive layout. It is not physical runtime evidence. Qualification must separately identify states demonstrated through real canonical events, deterministic projector tests and gallery-only previews. The browser recorder also rejects a run unless real `idle` cards demonstrate both look-around and sleep dispositions, their expected animation timelines advance, and their transforms visibly change while canonical state remains `idle`.

## Limitations and rollout

- Prompt clarity has no separately instrumented reviewer; Quill is partial by design.
- The cards aggregate several canonical surfaces. Badges expose coexistence, while the linked source remains authoritative for individual records.
- Last-update age advances locally from an authoritative timestamp; it does not advance workflow state.
- The 120-second freshness threshold is a presentation constant in this first rollout, not a scheduler timeout or failure policy.
- A browser without `IntersectionObserver` still renders correctly but cannot pause individual off-screen SVG animation; tab visibility and motion settings still apply.
- Characters add no provider/model requests, background daemon, secret flow, operational mutation or deployment requirement.

Roll out by reviewing the Crew gallery, leaving operational characters Shown, and monitoring the first normal dashboard lifecycle. Roll back presentation immediately with **Crew → Hidden** and **Animation → Off**; removing the feature bundle does not require state migration because no character state is persisted server-side.

The isolated governed dashboard run, all-six animation measurements, screenshots, video hashes and physical-versus-simulated coverage boundary are recorded in [dashboard character qualification evidence](evidence/agent-control-dashboard-characters-qualification.md).
