# Agent Control 3.8.2 final release qualification

Date: 2026-09-04

Qualified RC evidence checkpoint: `fa112f3f9e470041d22a0e91b93543ba946cbd62`.

Qualified implementation commit: `9be253fb06f97ae0c010d2c26f0f74a263338ee4`.

The exact final release commit is the descendant identified authoritatively by annotated tag `v3.8.2`. This record is committed before that self-identifying Git object exists; the tag and GitHub Release record its final SHA without a circular self-hash.

## Release-only delta

The promotion commits change package/runtime version, changelog date, final release and migration notes, README/architecture release wording, generated implementation-status projection, and this final release record. The package-install gate also exposed that the declared CLI version smoke command was absent; the final delta adds only the local read-only `agent-control --version` command and its regression test. Provider execution, schema validation, history projection, routing and physical evidence are unchanged.

## Qualification basis

The provider/application schema correction, strict validation, safe diagnostics, human-readable Run/Lane history, telemetry authority, baton/handoff semantics, redaction, tests and physical Controller Account A proof are recorded in [3.8.2 RC qualification evidence](agent-control-3.8.2-human-readable-history-qualification.md). That evidence retains the truthful v3.8.1 failures rather than rewriting them.

The physical production-path Run `a0d646b0-77ae-41b3-85ed-a02a86f4880e` and Work Parcel `parcel-bccb41f1-c1b1-4ff2-8f1d-b3d8c61c2c07` passed both schema boundaries and independent verification. Its 13,092 input plus 194 output tokens reconciled to 13,286 total at calculated USD 0.026960. The 21-entry history remained associated with that Run and Parcel.

Two browser recordings are content-addressed by the RC evidence report. They show candidate identity and the successful/historical execution-history views. No actual 3.8.2 baton transfer was physically exercised or claimed.

## Architecture and security boundary

Execution history derives from provider-neutral durable records and does not couple core behavior to any provider, model, account, operating system, host, controller or browser. Qualification environments and provider adapters do not become core dependencies. Raw prompts, rejected responses, hidden reasoning, credentials, account emails and resolved credential paths remain excluded.

## Final gate contract

The exact tagged commit must pass `npm run check`, TypeScript, bootstrap/dashboard syntax, provider/platform neutrality, implementation-status consistency, `git diff --check`, all local Markdown links, exact package installation, CLI version smoke execution and packed-artifact inspection. The GitHub Release records the final commit and package SHA-256/SHA-512 integrity.

No live deployment is part of this source release.
