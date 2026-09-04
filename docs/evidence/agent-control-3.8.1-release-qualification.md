# Agent Control 3.8.1 final release qualification

Date: 2026-09-04

Qualified implementation/evidence checkpoint: `93ce5ab08e41e5853eadaf453bddbbced7f98689`.

The exact final release commit is the descendant identified authoritatively by annotated tag `v3.8.1`. This record is committed before that self-identifying Git object exists; the tag and GitHub Release record its final SHA without a circular self-hash.

## Release-only delta

The promotion commit changes release metadata only: changelog date/status, final release notes, README release links, implementation-status qualification projection, and this final release record. It changes no executable product code and does not alter the accepted physical evidence.

## Qualification basis

Credential residency, two-account baton continuation/fallback, remote account status, immutable cross-node repository transfer, repository-review retry identity, Spark untracked-file containment, telemetry reconciliation, and the final governed GLM-5.3-Flash review are recorded in [3.8.1 qualification evidence](agent-control-3.8.1-qualification.md). Sanitized machine proof is retained in [physical High-remediation evidence](agent-control-3.8.1-high-remediation-physical.json), [resumed physical evidence](agent-control-3.8.1-resumed-physical-evidence.json), and the [final GLM review](agent-control-3.8.1-final-glm-review.md).

The final review found no Critical or High defect. Its remaining Medium finding is accepted and deferred: intentionally ignored and `.git`-internal Spark mutations remain outside the mutation ledger. Spark is disabled by default, single-attempt, disposable-worktree-only, and independently verified. The release does not represent this limitation as fixed.

No interactive dashboard video exists or is claimed. No credential value, token, profile/cache content, device-auth code, resolved credential path, raw provider response, or sensitive environment data is part of the release evidence.

## Final gate contract

The exact tagged commit must pass `npm run check`, focused lifecycle/direct/state tests, TypeScript, bootstrap/dashboard syntax, provider/platform neutrality, implementation-status consistency, `git diff --check`, all local Markdown links, evidence JSON parsing, exact package installation and CLI version smoke execution, and a resolved packed-artifact dependency audit. The GitHub Release records the final commit and package SHA-256/SHA-512 integrity.

No live deployment is part of this source release.
