# Agent Control 3.7.0 release qualification

Date: 2026-09-03

Feature candidate before documentation closure: `3fcc36609c0493f31f8eabd504b00854c8c4a40e`

The final release commit is the descendant identified authoritatively by annotated tag `v3.7.0`. No live Agent Control service is deployed or reconfigured by source release closure.

## Physical acceptance

The real production lifecycle passed across two distinct qualified local provider/model routes. It covered live telemetry, governor assessment, sealed baton creation, destination continuation, independent verification, additive token reconciliation, dashboard SSE reconciliation and failed-handoff recovery. Exact identifiers, hashes, authority markings and limitations are retained in the [physical narrative](agent-control-3.7-physical-qualification-20260902.md) and [sanitized machine record](agent-control-3.7-physical-lifecycle-20260903.json).

## Automated release gates

The exact tagged release commit must pass:

- dependency installation with no lifecycle scripts;
- `npm run check`: PASS including TypeScript, bootstrap/dashboard syntax, neutrality, implementation-status consistency and 664/664 serial tests;
- repository-local Markdown-link validation;
- `git diff --check`;
- `npm pack --dry-run --json`;
- package audit and credential/machine-path scans;
- canonical version consistency across package, source, README, changelog, architecture and implementation-status documents.

The frozen capability-routing benchmark also passed 60/60 classifications with zero unsafe false-positive routes and retained its recommendation to keep automatic production routing disabled until its separate physical sample gate is met.

The GitHub Release records the final commit, source/package provenance and the release-candidate package SHA-256.

## Release verdict

`PASS_WITH_LIMITATIONS`

The token-aware baton lifecycle is physically qualified. Provider-unreported current-context occupancy and monetary cost remain estimated or unavailable; the proof used two distinct local provider configurations rather than a Codex or GLM workload leg; automatic capability routing remains gated by its separate larger benchmark. These limitations are visible and do not weaken route identity, verification, recovery or evidence requirements.
