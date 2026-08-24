# Agent Control 3.1 web dashboard

The web dashboard is an operator interface over `AgentControlService`. It is not a web scheduler and does not own lane, lease, PTY, verification or provider state.

The default **Jobs** view shows the versioned catalog, Schedules, last/next Run, current structured step progress, Queue reasons, worker placement, artifacts, verification and provenance. The **Lanes** view retains the interactive multi-agent control room. Neither view parses terminal text for Run state.

## Start

`npm start` starts the TUI and the embedded dashboard on `http://127.0.0.1:4310`. `npm run web` runs the same control service and dashboard without Blessed for a headless operator host. Run one authoritative control-plane process per state directory. Set `AGENT_CONTROL_WEB_ENABLED=0` to disable the embedded dashboard or `AGENT_CONTROL_WEB_PORT` to select another port.

Without `AGENT_CONTROL_WEB_OPERATOR_TOKEN`, all mutation requests return `503 operator_auth_not_configured`; observation still works. To enable operator requests for one process:

```bash
export AGENT_CONTROL_WEB_OPERATOR_TOKEN="$(openssl rand -hex 32)"
npm start
```

Select **Observer mode** in the browser and enter the token. It remains in tab-scoped session storage and is sent as `Authorization: Bearer ...`. The server does not issue an authority cookie.

## API contract

Read projections:

- `GET /api/status`
- `GET /api/lanes`
- `GET /api/lanes/:id`
- `GET /api/lanes/:id/router`
- `GET /api/providers`
- `GET /api/router`
- `GET /api/evidence`
- `GET /api/events` (SSE)
- `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/:id/runs`
- `GET /api/schedules`, `GET /api/runs`, `GET /api/runs/:id`
- `GET /api/queue`, `GET /api/workers`, `GET /api/resources`
- `GET /api/artifacts/:id` (metadata and checksum, not secret content)

Authenticated Job requests are `POST /api/jobs/:id/run`, schedule `enable`/`disable`, and Run `cancel`, `retry` and `approve`. They call `AgentControlService`, which delegates to the one authoritative `JobRuntime`. The HTTP layer cannot register a worker, grant a capability, edit a manifest, acquire a resource lock, dispatch an Action or write a PTY.

Operator requests under `/api/lanes/:id/` include `pause`, `resume`, `priority`, `mode`, `task`, `reroute`, `handoff`, `clone`, `cancel`, `takeover`, `return-ownership` and verification transitions. These endpoints call application-service methods. There is deliberately no direct lease, scheduler-state, persistence, terminal-input or execution-provider endpoint.

## Security model

- Listener default: `127.0.0.1` only.
- Observation: unauthenticated on the local listener; data should be treated as sensitive.
- Mutation: bearer token, `application/json`, origin validation and body-size limit.
- Browser token retention: current tab only; no cookie and no server-side browser session.
- Response protection: no-store, CSP, frame denial, referrer suppression and secret-like key/value redaction.
- Audit: accepted service commands append typed records to the Agent Control event journal.

Remote binding is not a turnkey security boundary. If explicitly enabled, place the listener behind authenticated TLS, restrict network reachability, set an exact `AGENT_CONTROL_WEB_ALLOWED_ORIGINS` list, rotate the operator token, and verify the reverse proxy does not buffer SSE. Never publish it directly to the public internet.

## PTY and takeover

The terminal panel is an observer projection of session metadata. It has no input facility. Human takeover invokes `PtyRegistry.humanTakeover` through `AgentControlService`, pauses the lane, and prevents resume until ownership is deliberately returned. This is the same fence used by the core, not browser-maintained state.

## Failure behavior

The dashboard can reconnect to the SSE stream and always refreshes the current durable snapshot. UI or stream failure does not change scheduler state. Missing authentication disables mutation. Invalid origin, content type, JSON, lane, action or evidence fails closed. A missing dashboard never blocks TUI operation or task recovery.
