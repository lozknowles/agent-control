# Agent Control 3.1 dashboard and control-plane qualification

Date: 2026-08-24 (Europe/London)

Base: `v3.0.1`, `9d751ee076c634e4b4311c451af3e6d3e1891b9c`

Branch: `release/3.1.0-control-plane-dashboard`

Environment: isolated Windows worktree; isolated temporary checkout and state on a configured remote Linux qualification host

Production changes: none

## Verdict

`READY_FOR_3.1`

The web dashboard and TUI use one application/control service. Web requests cannot directly mutate persistence, scheduler internals, leases or PTY input. Human takeover calls the existing unconditional fence. Routing rationale and verification state are durable lane data. The infrastructure-neutral 3.0.1 checks remain green.

## Experimentally verified

### Release gate

Executed in a fresh temporary checkout:

```text
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run qualify
```

Observed:

- TypeScript: PASS
- bootstrap JavaScript and shell syntax: PASS
- infrastructure neutrality: 3/3 PASS
- full serial suite: 177/177 PASS, 0 failed/skipped
- qualification: `PASS local-release-gate`; configured-infrastructure correctly skipped because the disposable checkout had no configuration
- qualification trace: `84950ce2-cf11-409d-9b4a-ad7379f6429d`
- qualification JSON SHA-256: `bf71c4b14adc067a45e018bdce0c8e2d44ab585745c60db796ba52d81d58f21d`

### Live web/API/SSE

A temporary non-production dashboard used a dedicated state directory and a disposable qualification token. No service definition, firewall, production state or production port was changed.

- `GET /api/status`: HTTP 200, version `3.1.0`, health `healthy`
- dashboard asset and API smoke: PASS
- task request: lane task became `Harmless dashboard qualification task`
- pause request: lane became `paused`
- resume request: lane became `waiting`
- scheduler projection: next lane `1`
- lease holder before/after: empty; browser commands did not acquire a lease
- PTY count: `0`; no PTY was created or written
- baton revision after task/pause/resume: `4`
- typed stream observed `lane.task_changed` and two `lane.status_changed` events

### Browser rendering and interaction

- Desktop operational layout: PASS
- Mobile viewport at 390 x 844: PASS; document/client width matched and no horizontal overflow was observed
- Lane selection/detail: PASS
- Activity, terminal, Git and evidence tabs: PASS
- Terminal view explicitly reported observer-only/no ownership capability: PASS
- Evidence view distinguished claim, evidence, verified and accepted: PASS
- Observer clicking `Pause` opened the operator gate and left lane state unchanged: PASS
- Initial rendering exposed and led to correction of a `hidden`-attribute CSS conflict; the corrected build was retested

### TUI compatibility

`npm start` was launched with the web listener disabled in an isolated state directory and a real pseudo-terminal. The TUI rendered `AGENT CONTROL 3.1.0`, lanes, queue, resources and provider state, then exited with status 0 when sent `q`.

### Authority and recovery tests

Automated tests prove:

- TUI and web projections share the same authoritative lane object
- pause and priority commands do not mutate an existing lease
- human takeover replaces the agent owner unconditionally
- autonomous resume is rejected while the human owns the PTY
- ownership can be deliberately returned before resume
- reroute requests do not directly substitute the current model
- no HTTP route exists for direct lease, scheduler or PTY-input mutation
- missing operator authentication fails closed
- invalid browser origin is rejected
- route rationale survives a reconstructed service
- verification changes do not alter lease or PTY ownership
- claim-only and failed-evidence cases cannot become verified

## Source verified

- `src/control/application-service.ts`: common projection and command boundary
- `src/control/web-server.ts`: HTTP/SSE, auth, origin/content-type/body limits, headers and redaction
- `src/control/verification.ts`: claim/evidence/verification/acceptance policy
- `src/control/routing.ts`: eligibility gates, multi-factor choice and rationale
- `src/control/architecture.ts`: executable conceptual-integrity rules
- `src/index.ts`: TUI task/reroute/pause paths call the common service
- `src/web.ts`: headless web host uses the same service and persisted state model
- `assets/dashboard/`: expendable browser projection with no direct authority primitive
- `ARCHITECTURE.md`: authoritative 3.1 component and authority graph

## Inferred

- A correctly configured authenticated TLS reverse proxy can provide remote operator access. This follows from the server's explicit host/origin controls, but the proxy configuration is deployment-specific.
- Larger lane fleets should retain the responsive layout because lane and system columns collapse at documented breakpoints; only the one-lane disposable state was visually exercised.

## Not tested

- Production deployment or production state
- Public internet exposure, TLS termination, SSO or a reverse proxy
- A real browser PTY transcript stream; 3.1 intentionally exposes metadata only and no web input primitive
- Real approval-provider integration; outstanding approval count remains a projection placeholder
- Visual rendering with dozens of lanes or very large event/evidence histories
- Multi-process concurrent writers to one state directory; operators are instructed to run one authoritative process per state directory
- Configured-infrastructure qualification in the disposable release-gate checkout

## Cleanup

The temporary dashboard listener was stopped after browser qualification. Task-generated temporary checkouts, state directories, logs and archives were removed. No production process or service was stopped or modified.
