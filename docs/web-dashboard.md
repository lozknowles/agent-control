# Agent Control web dashboard

The web dashboard is an operator interface over `AgentControlService`. It is not a web scheduler and does not own lane, lease, PTY, verification or provider state.

The default **Jobs** area contains four separate platform views: **Job Definitions**, **Saved Jobs**, **Schedules**, and **Runs**. These sit alongside the existing catalog/Run-ledger projection rather than replacing its Action/DAG workflows. **Lanes** retains the interactive multi-agent control room. **Sessions** projects persistent Actor, participant, delegation, ACP, contract/PTY, handoff, model/runtime and evidence identity. **Systems** shows canonical configured inventory plus ACP transport and lifecycle-recipe readiness. **Models** shows the canonical provider-neutral model registry and immutable 3.6 lifecycle state. **Configuration** provides authenticated, validated inventory and fast-execution policy editing. No view parses terminal text for Run state.

## Parameterised Jobs

Open **Job Definitions** to inspect reusable, versioned contracts. Select **Repository Code Review** to create a Saved Job; the dashboard generates node, repository, ref, scope and comparison controls from the definition schema and adds routing, context, budgets, concurrency and schedule policy. It never asks for provider credentials.

**Saved Jobs** lists configured instances and provides authenticated **Run now**, enable and disable controls. Manual and scheduled starts both enter `ParameterizedJobEngine.createRun`; the browser is not an executor or scheduler. **Schedules** shows persistent one-time or cron policy, timezone, missed-run behavior and next occurrence. **Runs** shows immutable lifecycle, frozen repository SHA/comparison SHA, route, Work Parcels, usage/cost, findings, evidence, retries, fallback and errors.

Selecting a Run opens its **Execution history**. This is a chronological, human-readable projection of the same durable Run, associated Work Parcels, token/governor evidence and sealed batons. Cards distinguish `OPERATOR`, `SYSTEM EVENT`, `AGENT / PROVIDER`, `TOOL / ACTION`, `GOVERNOR`, `BATON` and `ERROR`; they show safe route identity, current-context authority, lifetime usage, cost authority and evidence references where available. The Lane Activity view provides the corresponding lane-local projection. See [`execution-history.md`](execution-history.md).

History terminology is deliberately strict. `HANDOFF_RECOMMENDED` means the governor crossed a threshold but retained the current route. `HANDOFF_REQUESTED` is not proof that a destination accepted or ran. Only a durable successful routing outcome becomes `HANDOFF_COMPLETED`; a failed outcome records source recovery. Likewise, a created baton is a sealed checkpoint, not proof of a completed handoff. Codex exec completion usage is cumulative and is not displayed as current context; Codex context remains unavailable unless a distinct usable signal is emitted. Other explicitly estimated adapter values can be clamped at 100%, but are never described as authoritative provider occupancy.

The headless Agent Control process owns schedule polling. Closing the dashboard, logging out, or not having Codex installed does not stop a due parameterised Job. Full setup and operator examples are in [`jobs/README.md`](jobs/README.md).

## Resilient Run state (3.9)

Run cards now render the durable lifecycle reason and observation source instead of collapsing every nonterminal state into “running.” `AUTHENTICATION_BLOCKED`, `RECONNECTING`, `CANCELLING`, `CLEANUP_UNCERTAIN` and `DISCONNECTED` are distinct. A retry card shows `nextAttemptAt`, `recoveryDeadlineAt` and the remaining retry budget only when those timestamps/budgets actually exist. A locally advancing countdown is display convenience between those fixed timestamps; it does not change scheduler state.

Cancellation remains pending until the execution adapter returns cleanup evidence. The dashboard shows cleanup outcome, reason, requested/verified times, platform and the number of captured process identities. It intentionally does not expose process output or platform command text. `confirmed` permits a terminal cancellation; `uncertain`, `identity-mismatch` or `failed` leaves the Run fenced for reconciliation. Do not interpret a sent TERM/KILL request as completion.

The first page load and every SSE reconnect fetch a complete authoritative snapshot before applying later events. Reloading during provider work, a queue wait or cancellation therefore reconstructs the same Run, execution ID, retry state, Work Parcel and token totals; the browser never creates a replacement Run or infers terminal state from a missing event. Measurement cards show source, authority and freshness. Unavailable values are `unknown`, and stale values retain their observation time instead of becoming current.

## Start

`npm start` starts the TUI and the embedded dashboard on `http://127.0.0.1:4310`. `npm run web` runs the same control service and dashboard without Blessed for a headless operator host. Run one authoritative control-plane process per state directory. Set `AGENT_CONTROL_WEB_ENABLED=0` to disable the embedded dashboard or `AGENT_CONTROL_WEB_PORT` to select another port.

Without `AGENT_CONTROL_WEB_OPERATOR_TOKEN`, all mutation requests return `503 operator_auth_not_configured`; observation still works. To enable operator requests for one process:

```bash
export AGENT_CONTROL_WEB_OPERATOR_TOKEN="$(openssl rand -hex 32)"
npm start
```

Select **Observer mode** in the browser and enter the token. It remains in tab-scoped session storage and is sent as `Authorization: Bearer ...`. The server does not issue an authority cookie.

## Configure systems and models

1. Configure `AGENT_CONTROL_WEB_OPERATOR_TOKEN`, start Agent Control and authenticate using the top-right operator button.
2. Open **Configuration**.
3. Select an existing entry, or choose **Add machine**, **Add provider**, **Add model**, **Add service**, or **Fast execution**.
4. Edit the validated JSON and choose **Save configuration**.
5. Provider and model changes hot-reload. Machine, service and Fast execution changes require a restart; follow the dashboard's `restartRequired` result.
6. Open **Systems** and verify the entry. An unprobed configured system is expected to show `UNKNOWN`; an unreachable observed system shows `OFFLINE`; a provider or service with a missing credential reference shows `AUTH REQUIRED`.

Machines use the same resource schema described in the main configuration model. A provider or external service that requires an API key must use `auth.env`, `credentialEnv` or `credentialFileEnv`, for example:

```json
{
  "id": "example-service",
  "name": "Example external service",
  "requiresAuth": true,
  "credentialEnv": "EXAMPLE_SERVICE_API_KEY"
}
```

Set the referenced environment variable in the Agent Control process environment before restarting. Never paste its value into configuration: plaintext passwords, API keys, tokens and secret fields are rejected. The editor does not create credentials, test arbitrary endpoints or grant capabilities. A saved machine/provider/service becomes inventory; execution still requires qualified capabilities, current readiness and normal scheduler policy.

## API contract

Read projections:

- `GET /api/status`
- `GET /api/configuration` (operator authenticated; returns validated configuration and revision, never credential values)
- `GET /api/lanes`
- `GET /api/lanes/:id`
- `GET /api/lanes/:id/router`
- `GET /api/providers`
- `GET /api/models/providers`, `GET /api/models`, `GET /api/models/:id`, `GET /api/models/routes`
- `GET /api/sessions`, `GET /api/sessions/:id`
- `GET /api/context-transfers`, `GET /api/delegations`
- `GET /api/fast-execution-attempts`
- `GET /api/runtime` (redacted ACP transport/session, contract/PTY, handoff and provider-lifecycle projection)
- `GET /api/executions`, `GET /api/executions/:runId`
- `GET /api/router`
- `GET /api/evidence`
- `GET /api/events` (SSE)
- `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/:id/runs`
- `GET /api/schedules`, `GET /api/runs`, `GET /api/runs/:id`
- `GET /api/job-definitions`, `GET /api/job-definitions/:id`
- `GET /api/saved-jobs`, `GET /api/saved-jobs/:id`, `GET /api/saved-jobs/:id/export`
- `GET /api/job-schedules`
- `GET /api/job-runs`, `GET /api/job-runs/:id`
- `GET /api/queue`, `GET /api/workers`, `GET /api/resources`
- `GET /api/nodes` (managed-node heartbeat, inventory, workload and maintenance projection)
- `GET /api/artifacts/:id` (metadata and checksum, not secret content)
- `GET /api/command-output` (safe handle metadata; no managed storage path or command content)
- `GET /api/command-output/metrics` (bytes, estimated tokens, expansions and context tokens avoided)
- `GET /api/efficiency` (profile/model/provider/lane aggregates and cost per verified outcome)
- `GET /api/efficiency/invocations` (prompt-free invocation metadata, usage composition and verifier result; default 200, maximum 1,000, optionally filtered by `runId` or `jobId`)

Authenticated legacy Job requests are `POST /api/jobs/:id/run`, schedule `enable`/`disable`, and Run `cancel`, `retry` and `approve`. Parameterised Job requests are `POST /api/saved-jobs`, `POST /api/saved-jobs/:id` (update), `POST /api/saved-jobs/:id/run`, `POST /api/saved-jobs/:id/enable`, `POST /api/saved-jobs/:id/disable`, and `POST /api/job-runs/:id/cancel`. Saved Job updates require the current revision. Scoped command-result expansion is `POST /api/command-output/:handle/expand`; operator authentication is necessary but not sufficient, because the supplied task/lane/worker/lease/ownership scope must exactly match the retained result. These calls enter `AgentControlService`. The HTTP layer cannot register a worker, grant a capability, edit a definition, acquire a resource lock, dispatch an Action or write a PTY.

Authenticated inventory changes use `POST /api/configuration/systems` with the current `revision`, a `kind` of `resource`, `provider`, `model` or `service`, an optional `originalId`, and the complete replacement `item`. Model role maps use `POST /api/configuration/model-routing`; fast-execution policy uses `POST /api/configuration/spark`. The server rejects stale revisions, embedded secret material and invalid schema, writes the complete configuration atomically and emits `configuration.changed`. Provider/model/route updates return `restartRequired: false`; resources/services/Spark policy return `true`.

Model qualification and routing mutations are `POST /api/models/:id/qualify` and `POST /api/models/:id/route`. Qualification accepts a `nodeId`; routing accepts `nodeId`, optional `requiredCapabilities` and `allowFallback`. These operations require operator authentication. `UNTESTED`, failed, disabled, wrong-node or capability-unproven models cannot route.

Operator requests under `/api/lanes/:id/` include `pause`, `resume`, `priority`, `mode`, `task`, `reroute`, `handoff`, `clone`, `cancel`, `takeover`, `return-ownership` and verification transitions. These endpoints call application-service methods. There is deliberately no direct lease, scheduler-state, persistence, terminal-input or execution-provider endpoint.

The prominent **Managed Nodes** panel renders the same resource-attached snapshot returned by `/api/status` and `/api/nodes`: state, OS/kernel, heartbeat, uptime, load, memory, workload, maintenance state, secure-overlay connectivity, storage and capabilities. Measurements include source, authority, freshness, observation time and limitations. Android/sysfs-derived CPU busy is visibly derived and not admission-qualified; absent temperature/storage/load data remains unknown. It is an observation panel, not a remote shell. Node operations are created as governed Jobs through the existing scheduler and approval path.

The compact **Harness Efficiency** diagnostic shows verified successes, turns, fresh/cached/cache-write/output token composition, cache effectiveness, escalation rate and cost per verified outcome. A cache read is not a cache write, and neither is subtracted from authoritative total input. Unknown provider measurements are rendered as `unknown`, not zero. A selected Run shows its recorded profile and verifier state; these observations cannot change routing or acceptance through the read-only endpoints.

## Spark fast execution

Open **Configuration → Fast execution** to edit the complete `spark` policy. It is disabled by default and requires a restart after save. The exact keys, defaults, registry prerequisites and qualification commands are documented in [`fast-execution.md`](fast-execution.md). The editor cannot bypass exact-model availability, qualification, classifier or verifier gates, and there is no dashboard control that forces arbitrary work onto Spark.

When a selected Session has fast-execution telemetry, its **Fast execution** panel shows execution class, harness profile, requested and actual model, verification, elapsed time, changed scope, escalation reason, successor and evidence. If Spark is unavailable, the attempt/decision remains visible as unavailable or escalated; Agent Control never labels a substituted model as Spark. Provider fields that were not exposed, including current monetary cost and sometimes file reads, render as `unknown` rather than zero.

## Security model

- Listener default: `127.0.0.1` only.
- Observation: unauthenticated on the local listener; data should be treated as sensitive.
- Mutation: bearer token, `application/json`, origin validation and body-size limit.
- Browser token retention: current tab only; no cookie and no server-side browser session.
- Response protection: no-store, CSP, frame denial, referrer suppression and secret-like key/value redaction.
- Audit: accepted service commands append typed records to the Agent Control event journal.
- Output handles: random, expiring, authority-scoped references that select only data captured by the original result; they are not file paths or repository readers.

Remote binding is not a turnkey security boundary. If explicitly enabled, place the listener behind authenticated TLS, restrict network reachability, set an exact `AGENT_CONTROL_WEB_ALLOWED_ORIGINS` list, rotate the operator token, and verify the reverse proxy does not buffer SSE. Never publish it directly to the public internet.

## PTY and takeover

The terminal panel is an observer projection of session metadata. It has no input facility. Human takeover invokes `PtyRegistry.humanTakeover` through `AgentControlService`, pauses the lane, and prevents resume until ownership is deliberately returned. This is the same fence used by the core, not browser-maintained state.

## 3.6 runtime observability

The Sessions view reads `GET /api/runtime` alongside identity/execution provenance. It shows ACP protocol version, configured transports, connection/authentication state, governed ACP session and parcel references, contracts, active agent/model/provider/node/runtime, process/PTY state, attached participants, current writer, pending approvals, handoff outcomes, baton hash/size, verification and cancellation/recovery state. Usage and cost continue to come from invocation telemetry and remain `unknown` when absent.

The projection deliberately omits ACP prompt/cwd content, contract objectives, sealed baton payloads, PTY transcript text, handoff requests and credential-reference names. A persisted ACP session is transport-neutral, so an active binding is not falsely attributed to stdio or remote transport. Remote ACP can be shown as configured but unobserved; the dashboard does not start or probe its listener.

Systems adds stable ACP stdio, disabled/configured remote ACP, and durable lifecycle recipes. A disabled remote transport remains visible as `UNKNOWN` with its blocker. DISCOVERED/BENCHMARKING recipes remain `UNKNOWN`, SHADOW/CANDIDATE are `DEGRADED`, and only ACTIVE/PREFERRED are `AVAILABLE`. Models displays matching immutable recipe fingerprints, lifecycle state, semantic placement requirements and active policy. These are observations; no web route promotes a recipe or changes routing policy.

## Failure behavior

The dashboard can reconnect to the SSE stream and always refreshes the current durable snapshot. UI or stream failure does not change scheduler state. Missing authentication disables mutation. Invalid origin, content type, JSON, lane, action or evidence fails closed. A missing dashboard never blocks TUI operation or task recovery.

## Live token governor (3.7)

The dashboard’s **Thread Context** panel is driven by `GET /api/status` / `GET /api/token-routing` and refreshes through the normal SSE stream on `token.telemetry`, `token.governor_transition`, `token.context_lifecycle`, `token.baton_created`, and `token.handoff_result`. It lists every observed execution thread with provider/safe account label/model, account plan where its authority is known, context/window/percentage, latest compaction/new-context/resume transition, cumulative total/fresh/cached input, output and total tokens, authority markers, cost, elapsed time, governor state/thresholds, next selected route, and account-aware Work Parcel chain total. Each model-chain leg preserves the same split, and route lookup uses the durable thread ID. It does not turn unavailable provider data into zero or infer current context from lifetime use. The durable routing evidence contains the corresponding timestamped samples and all transition/decision records. See [Token-Aware Baton Routing](token-aware-baton-routing.md).

`GET /api/token-routing` is a read-only projection. It deliberately excludes prompts, baton bodies, credentials, provider requests, and transcripts.

The **Models** view reads `GET /api/models/accounts` and model account projections. It shows account friendly label, provider-execution node, credential-residency node, plan plus metadata authority, availability and independent qualification state. Parameterized Run and live token cards also show the workload node separately. **Check account** dispatches bounded `codex login status` to the selected profile's provider-execution/credential node; `CODEX_HOME` is resolved only there. The dashboard never receives credential environment names, resolved paths, full executable paths, raw process output, email addresses, OAuth tokens, cookies, or authentication-file contents.

The **Retrieval** panel reads the redacted `retrieval` status projection and updates through the existing SSE stream on `retrieval.started`, `retrieval.provider_selected`, `retrieval.escalated`, `retrieval.evidence`, `retrieval.context_compiled`, `retrieval.rehydrated`, `retrieval.invalidated`, `retrieval.fallback`, and `retrieval.failed`. It shows provider/strategy path, calls and escalation, evidence sufficiency/items/tokens, raw bytes avoided, estimated context savings, freshness, locality and latency. A handoff or restart refreshes the same projection after reference revalidation; invalidation and fallback remain visible. Evidence text, repository roots, index paths and raw provider output are excluded. `GET /api/retrieval` is read-only. See [governed retrieval](governed-retrieval.md).

## Persistent context and capability intelligence (3.9)

Each Work Parcel card now includes a **Persistent context** board. It shows the current DAG stage/route, unresolved questions, criterion status, event/baton metrics and bounded history controls. Authenticated operators may answer a stable question, append a steering amendment, add/evaluate a criterion or request a bounded history lookup. These operations enter `AgentControlService`; the page cannot edit event hashes, mark stages successful or bypass verification. An open question names exactly which stages wait, while unrelated running/succeeded stages remain visible.

The **Models** view adds:

- verified model leaders, left empty when evidence is insufficient;
- Capability Watch candidates grouped by lifecycle and native/emulated verified observations;
- frozen evaluation batches and queue state;
- append-only provider/account/model/node/runtime history;
- 7/30/90-day quality/reliability, fresh/cache/total tokens, cache hit ratio, elapsed time and cost per success;
- regression warnings and authenticated evidence-gated lifecycle controls;
- independent Runtime Safety decisions and approval state.

All values come from the capability/model/safety ledgers. Missing cost, unsupported evaluator capability and unqualified leaders display as unavailable, never zero or a fabricated ranking. Provider/model configuration remains separate from observed capability proof.

The core `EventSource` starts independently of optional dashboard projections. If the parameterised Job engine or another optional panel is not configured, that panel reports its own unavailable state while Jobs, Work Parcels and live SSE continue. The top badge changes to `LIVE` only after the browser's event stream opens; reconnect still refreshes the complete authoritative snapshot.
