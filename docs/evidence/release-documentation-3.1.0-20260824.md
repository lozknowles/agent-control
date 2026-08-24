# Agent Control 3.1.0 release documentation evidence

Date: 2026-08-24 (Europe/London)

## Source verified

- `README.md` documents installation, dashboard access, Jobs/Schedules, monitoring, safety and the current guide location.
- `ARCHITECTURE.md` is the authoritative 3.1 boundary and explicitly states that the Jobs dashboard is a projection rather than a second scheduler.
- `CHANGELOG.md` records the dashboard, scheduler, approval, artifact and guide additions under 3.1.0.
- `docs/Agent-Control-3.1.0-Operator-Guide.md` documents installation, deployment patterns, adaptive-harness dispatch, tool policy, dashboard operation, scheduler policy, monitoring, recovery, rollback and validation.
- `scripts/generate-operator-guide.py` derives title/version metadata from the selected source guide and can still render historical versioned guides.

## Experimentally verified

- The 3.1.0 Markdown source was packaged byte-for-byte as `assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.md` and rendered with ReportLab into the companion PDF.
- Markdown SHA-256: `4eca4576779bc588c0a264767a0c9acbf7252867f99c9652954a9ce4f5078a28`.
- The updated guide contains eight A4 pages. Text extraction confirmed the adaptive-harness, `ToolInvocationGateway`, `verification-pending`, Windows OpenAI return-data, explicit qualification status and Job sections.
- All eight pages were rendered to PNG with Poppler and visually inspected at readable resolution. No clipped text, overlap, broken table, unreadable code block or footer defect was observed.
- PDF SHA-256: `d5351b177b77abca2ab6a7338f29f9c685ed5f7fd19e0139060a27ae4d1f0941`.
- Repository tests assert that the release Markdown equals the canonical source, contains the dashboard/scheduler authority boundary, and that the versioned PDF is a non-empty PDF with the expected title and EOF marker.
- Current adaptive-harness branch gate: 246/246 tests passed, 0 failed, 0 skipped; TypeScript, dashboard syntax, bootstrap JavaScript syntax and infrastructure neutrality also passed. The complete `npm run check` reached Bash syntax after TypeScript passed, but this Windows host has neither Git Bash nor an installed WSL distribution; all platform-independent gates were therefore rerun separately and passed.
- Windows OpenAI return-data supports automatic authentication selection: a present `OPENAI_API_KEY` selects the Responses API, while an absent key selects the saved ChatGPT-plan Codex login. Both routes completed real model-backed Jobs, centrally authorised their returned tool requests and produced verified artifacts. The earlier Responses HTTP 429 is retained as failed-attempt evidence rather than overwritten.
- Safe Job qualification: `PASS_SAFE_NON_PRODUCTION`, Run `run-d3e3ef69-9e35-446c-912d-7b733edfdfb8`, evidence SHA-256 `f9d77fe583eea1ee3de6333408bf0d31ebeb33847b0be46e0dc1ed053fefaf34`.

## Inferred

- The generic generator should remain suitable for later versioned guides because title, cover version and footer version are derived from the Markdown heading. Every future PDF must still be rendered and inspected.

## Not tested

- The expanded Jobs dashboard still lacks a fresh in-app-browser visual acceptance because the localhost qualification URL was rejected by browser URL policy. That restriction was not bypassed.
- Authenticated external event discovery and production publication remain outside this source-release documentation qualification.

## Release boundary

This evidence qualifies the documentation artifacts, not a production deployment. No Schedule was enabled, no dashboard was exposed beyond localhost, no credentials were created and no production service was changed.
