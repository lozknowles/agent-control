# Agent Control 3.1.0 release documentation evidence

Date: 2026-08-24 (Europe/London)

## Source verified

- `README.md` documents installation, dashboard access, Jobs/Schedules, monitoring, safety and the current guide location.
- `ARCHITECTURE.md` is the authoritative 3.1 boundary and explicitly states that the Jobs dashboard is a projection rather than a second scheduler.
- `CHANGELOG.md` records the dashboard, scheduler, approval, artifact and guide additions under 3.1.0.
- `docs/Agent-Control-3.1.0-Operator-Guide.md` documents installation, deployment patterns, adaptive-harness dispatch, tool policy, dashboard operation, scheduler policy, monitoring, recovery, rollback and validation.
- `scripts/generate-operator-guide.py` derives title/version metadata from the selected source guide and can still render historical versioned guides.

## Experimentally verified

- The 3.1.0 Markdown source was rendered with ReportLab into `assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.pdf`.
- The updated guide contains seven A4 pages. Text extraction confirmed the adaptive-harness, `ToolInvocationGateway`, `verification-pending` and Job sections.
- All seven pages were rendered to PNG with PyMuPDF and visually inspected as a contact sheet; the new harness page was also inspected at full resolution. No clipped text, overlap, broken table, unreadable code block or footer defect was observed.
- PDF SHA-256: `8994e027314dfed2ccd8cbd3b2b67a3e10f3892273d53effbf42f1d88df41e12`.
- Repository tests assert that the Markdown contains the dashboard/scheduler authority boundary and that the versioned PDF is a non-empty PDF with the expected title and EOF marker.
- Current adaptive-harness branch gate: 226/226 tests passed, 0 failed, 0 skipped; TypeScript, dashboard syntax, bootstrap JavaScript syntax and infrastructure neutrality also passed. Bash syntax was not re-run in the Windows worktree.
- Safe Job qualification: `PASS_SAFE_NON_PRODUCTION`, Run `run-d3e3ef69-9e35-446c-912d-7b733edfdfb8`, evidence SHA-256 `f9d77fe583eea1ee3de6333408bf0d31ebeb33847b0be46e0dc1ed053fefaf34`.

## Inferred

- The generic generator should remain suitable for later versioned guides because title, cover version and footer version are derived from the Markdown heading. Every future PDF must still be rendered and inspected.

## Not tested

- The expanded Jobs dashboard still lacks a fresh in-app-browser visual acceptance because the localhost qualification URL was rejected by browser URL policy. That restriction was not bypassed.
- Authenticated external event discovery and production publication remain outside this source-release documentation qualification.

## Release boundary

This evidence qualifies the documentation artifacts, not a production deployment. No Schedule was enabled, no dashboard was exposed beyond localhost, no credentials were created and no production service was changed.
