# Agent Control 3.1.0 release documentation evidence

Date: 2026-08-24 (Europe/London)

## Source verified

- `README.md` documents installation, dashboard access, Jobs/Schedules, monitoring, safety and the current guide location.
- `ARCHITECTURE.md` is the authoritative 3.1 boundary and explicitly states that the Jobs dashboard is a projection rather than a second scheduler.
- `CHANGELOG.md` records the dashboard, scheduler, approval, artifact and guide additions under 3.1.0.
- `docs/Agent-Control-3.1.0-Operator-Guide.md` documents installation, deployment patterns, dashboard operation, scheduler policy, monitoring, recovery, rollback and validation.
- `scripts/generate-operator-guide.py` derives title/version metadata from the selected source guide and can still render historical versioned guides.

## Experimentally verified

- The 3.1.0 Markdown source was rendered with ReportLab into `assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.pdf`.
- `pdfinfo` reported A4, six pages, PDF 1.4, no encryption, no form and no JavaScript.
- All six pages were rendered to PNG with Poppler and visually inspected. No clipped text, overlap, broken table, unreadable code block or footer defect was observed.
- PDF SHA-256: `498a55d74bec3064e18220757a6bb98767fc294900f1a18dd699d3bc7860e0fe`.
- Repository tests assert that the Markdown contains the dashboard/scheduler authority boundary and that the versioned PDF is a non-empty PDF with the expected title and EOF marker.
- Final canonical gate: 205/205 tests passed, 0 failed, 0 skipped; TypeScript, bootstrap syntax, dashboard syntax and infrastructure neutrality also passed.
- Safe Job qualification: `PASS_SAFE_NON_PRODUCTION`, Run `run-d3e3ef69-9e35-446c-912d-7b733edfdfb8`, evidence SHA-256 `f9d77fe583eea1ee3de6333408bf0d31ebeb33847b0be46e0dc1ed053fefaf34`.

## Inferred

- The generic generator should remain suitable for later versioned guides because title, cover version and footer version are derived from the Markdown heading. Every future PDF must still be rendered and inspected.

## Not tested

- The expanded Jobs dashboard still lacks a fresh in-app-browser visual acceptance because the localhost qualification URL was rejected by browser URL policy. That restriction was not bypassed.
- Authenticated external event discovery and production publication remain outside this source-release documentation qualification.

## Release boundary

This evidence qualifies the documentation artifacts, not a production deployment. No Schedule was enabled, no dashboard was exposed beyond localhost, no credentials were created and no production service was changed.
