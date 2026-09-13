# Agent Control first-run installation

This guide describes the 4.6.0-rc.1 review candidate. It has not been released or deployed. Start from the supplied exact candidate checkout. Follow the [supported installation instructions](DEPLOYMENT.md) for your platform; Android users first need the [Termux prerequisites](../android/README.md#fresh-termux-prerequisites).

## Run and monitor

Environment Discovery and every other mutation require an authenticated operator
session. Obtain a private random token of at least 32 characters from your
password manager, enter it at the hidden prompt, and start one headless
controller from the same shell:

```bash
read -rsp "Agent Control operator token: " AGENT_CONTROL_WEB_OPERATOR_TOKEN
printf '\n'
export AGENT_CONTROL_WEB_OPERATOR_TOKEN
npm run web
```

The terminal should report the local dashboard address. Open that address from
the same machine, click the top-right operator button, and enter the same private
token. The button must change to **Operator authenticated** before continuing.
Then use **Settings → Installation** to confirm source provenance and **Settings
→ Environment Discovery → First Run Setup** to perform the first read-only scan.
If the page is unavailable, keep the terminal open and check its startup error;
do not expose the listener publicly to work around a local connection problem.

Complete the provider-free first-run check through the same authenticated
dashboard. Open **Morrow**, type this exact request, and select **Ask**:

```text
Start operator-system-observation@1.1.0
```

Morrow must show **Review job proposal** and must not start it immediately. Expand
**Jobs, schedules, approvals & evidence**, review the displayed job identity,
empty inputs and SHA-256, then select **Approve this job**.
Open its Work Parcel and choose **Runtime Map → Process Map**. The genuine
run contains `observe → verify`: it records registered worker health as a local
JSON artifact, then a separate deterministic verifier checks that artifact.
Successful completion is **SUCCEEDED** with both stages visible and independently
verified. Both stages require the built-in `agent-control.operator-observation.read`
capability; the worker has no model, shell or remote-node capability. This proves
the local governed lifecycle only; it does not qualify a provider, remote machine
or model.

Other operator commands are:

```bash
npm start
npm run status
npm run up
npm run qualify
```

Run `npm link` once per installed node to expose the cross-platform `agent-control` package command. `agent-control status` (also available as `npm run status` inside the checkout) reads the same versioned `AgentControlService` projection as the web dashboard. A controller reads its localhost API; a worker uses a node-scoped SSH client configuration to perform one fixed read-only request against that same localhost API without exposing the dashboard listener. See [`docs/status-command.md`](status-command.md). The older configured service/resource bootstrap inspection is retained as `npm run status:bootstrap`.

`npm start` opens the control-room TUI and its embedded web client. `npm run web` runs the same control service and web dashboard without the TUI for a headless operator host; run one authoritative control-plane process per state directory. `agent-control status` is read-only. `up` starts only explicitly configured services/processes and records ownership. `down` stops only processes that the same Agent Control state directory recorded as owned.

The TUI also starts the web dashboard on `http://127.0.0.1:4310` by default. To
use the TUI instead of the headless controller, set the token with the same
hidden-prompt procedure above and run:

```bash
npm start
```

Enter the token using the top-right operator button in the dashboard. It is
retained only in the browser tab's session storage and sent as a bearer header;
Agent Control does not create a browser authority cookie. Use
`AGENT_CONTROL_WEB_ENABLED=0` to disable the dashboard or
`AGENT_CONTROL_WEB_PORT` to select another port. Binding beyond localhost is an
explicit security decision and should be placed behind authenticated TLS with a
matching `AGENT_CONTROL_WEB_ALLOWED_ORIGINS` allowlist.

Monitor either interface for the same authoritative lanes, scheduler projection, providers, resources, PTY ownership, routing rationale and claim/evidence/verification state. The web terminal panel is observer-only; it never receives a PTY write primitive. Qualification writes timestamped JSON beneath ignored `qualification-results/`.

The dashboard's **Systems** tab is the canonical execution inventory. Every configured machine, provider and external service remains listed when it is unreachable, unprobed or missing authentication; those conditions are shown as `OFFLINE`, `UNKNOWN` or `AUTH REQUIRED` rather than hiding the system. **Models** is the model registry projection. After operator authentication, use **Configuration** to add or edit systems and models as validated JSON. Saves are revision checked and atomic. Provider, model and role-map changes hot-reload; machine and service changes explicitly require restart. See [`docs/web-dashboard.md`](web-dashboard.md#configure-systems-and-models) for the operator procedure.

The optional **Crew** turns canonical Agent Control state into a human-readable operational scene without adding agents or authority. Cadence dispatches lanes, Quill reviews Work Parcel readiness, Relay projects real tools and execution, Lumen shows provider/model discovery and routing, Rook watches nodes/resources, and Verity exposes verification. Operational state, current activity and presentation-only animation are separate fields. Real Parcel dependency graphs show one mini worker per actually running stage; sealed baton motion requires a durable Parcel, lane or token-routing event, and opens the exact recorded reason. Deterministic narration and the three Crew → human explanation → engineering evidence levels lead back to the existing Jobs, Models, Systems, transcripts, token/cache and evidence views.

Full motion gives newly idle characters bounded, staggered look-around behavior and sustained-idle characters a gentle sleep/peek cycle; authoritative work wakes them once without changing controller state. Reduced, Off and Hidden settings are browser-local, system reduced-motion is respected, and narrow screens use a scrollable worker strip. The dashboard and Agent Control continue normally if this presentation is disabled or fails. See [dashboard operational Crew](dashboard-characters.md) for the exact schema, event/tool mappings, accessibility, performance boundary and real qualification evidence.

Agent Control 4.0 adds an original WOPR-inspired **Activity Matrix** beneath the Crew. Its labelled controller, queue, lane, model request/response, tool, baton/escalation, verification and node indicators are computed from canonical state and retained typed events; they never blink randomly to imply work. Every lamp is keyboard-inspectable and explains its source, event/time, lane/model, persistence and stale/disconnected behavior. A slow decorative page heartbeat is explicitly labelled `NOT WORK ACTIVITY`.

A compact **Live usage** strip remains present while navigating Jobs, Lanes, Sessions, Systems, Models, Crew and Configuration. Operators can select a thread or lane and see route, operational state, elapsed time, governor state, context authority, fresh/cache-read/cache-write/input/output totals, cost authority and the additive Work Parcel model chain. Missing current context or cost stays `Unavailable`, not zero. The 4.0 qualification physically demonstrated an explicit quality-gate model change from local Qwen to Codex/Controller Account A/Luna through the production `observe → assess → sealed baton → governed handoff → destination → verification` path. The [human-readable transcript](evidence/agent-control-4.0-pixel-social-continuation-transcript.md) starts with the exact authenticated request and gives a timestamped source → destination record without exposing private reasoning; the [qualification report](evidence/agent-control-4.0-pixel-social-continuation.md) links the continuous video and machine evidence. The source release does not deploy or enable services automatically.

Configured Linux/SSH resources can opt into the generic `managedNode` policy. Agent Control then streams a fixed read-only inventory probe over the existing non-interactive SSH route, synchronises discovered capabilities and workload state into the Worker Registry, and shows the same heartbeat, `IDLE`/`BUSY`/`DEGRADED`/`OFFLINE` state, load, memory, storage, current workload and maintenance status in the dashboard, TUI, API and `agent-control status`. It installs no daemon and exposes no arbitrary SSH command surface.

Managed-node inspection and maintenance are typed Job Actions. Package/service/runtime/power operations require a named approval; an active protected workload additionally requires `managed-node.protected-workload-override`, and configured disruptive or competing capabilities are unavailable for placement while BUSY. See [`docs/managed-nodes.md`](managed-nodes.md) for generic onboarding, discovery, operation and failure behavior.


## Token-aware command output

Advanced execution and telemetry remain available in the [operating reference](README-4.5-history.md). The Dashboard welcome, Environment Discovery, Estate Map and Usage & Cost are accessible through the main navigation. Keep the existing crew and Mallow guide visible; each opens the established crew or POE conversation.

## Discovery evidence

Authenticate before starting discovery. Observe actual adapter stages and inspect the completed scan. A discovered resource still requires the appropriate execution capability and permission. Blank Usage & Cost is truthful until accounting evidence exists.
