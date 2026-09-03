# Agent Control 3.8.1 qualification evidence

Status: in progress; no release claim.

## Provenance

- Immutable base: `v3.8.0`, commit `09ac94a3a818b08ecd49beb87ea6acb383e425b4`.
- Published 3.8.0 package SHA-256: `d458a46dbe3268a69b30ed817ef4fd33635df0097c459022a423d19062f34a1f`.
- Candidate branch: `feature/3.8.1-credential-residency`.
- Candidate commit and snapshot hashes: pending final candidate commit.

## 3.8.0 coupling audit

The released profile `nodeId` simultaneously selected credential lookup, Codex process placement, model qualification placement, routing identity, baton identity, and dashboard node display. Parameterized repository review also passed the repository node into model routing, making workload placement implicitly constrain provider/account placement. The Windows account-status operation attached Codex stdout/stderr directly to a process reached through SSH, allowing descendants to retain the remote pipe until the outer timeout.

3.8.1 preserves the legacy fields as migration inputs but normalizes them into `workloadNodeId`, `providerExecutionNodeId`, and `credentialNodeId`. Account qualification and provider execution use only the latter two. Repository resolution uses only workload locality. Routes, sealed batons, contracts, telemetry, verification/recovery, and parcel ledgers preserve all three.

## Deterministic evidence

The focused locality/configuration/model/Codex/dashboard set passed 72/72. The complete `npm run check` gate passed: TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, implementation-status consistency, and 702/702 tests. Markdown link validation passed across 97 documents and `git diff --check` passed. Tests cover separated locality, same-node account isolation/fallback, unavailable credentials, legacy migration, immutable cross-node archives, route sealing, sanitized Windows execution, and local compatibility.

## Physical gates

- MSI repository → controller credentials/provider execution: pending.
- Account A → sealed baton → account B: pending.
- Governed A-unavailable → B fallback: pending.
- Remote Windows credential residency/account status: pending.
- Production GLM 5.3 whole-repository review: pending.
- Dashboard recording and durable-state reconciliation: pending.

No credential values, paths, raw provider streams, or account email addresses belong in this document.
