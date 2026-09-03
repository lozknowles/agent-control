# Agent Control 3.8.1 qualification evidence

Status: in progress; no release claim.

## Provenance

- Immutable base: `v3.8.0`, commit `09ac94a3a818b08ecd49beb87ea6acb383e425b4`.
- Published 3.8.0 package SHA-256: `d458a46dbe3268a69b30ed817ef4fd33635df0097c459022a423d19062f34a1f`.
- Candidate branch: `feature/3.8.1-credential-residency`.
- Initial candidate commit: `4bfb6002da0a7f0c68c08913890061a0c7d8aaa9`.

## 3.8.0 coupling audit

The released profile `nodeId` simultaneously selected credential lookup, Codex process placement, model qualification placement, routing identity, baton identity, and dashboard node display. Parameterized repository review also passed the repository node into model routing, making workload placement implicitly constrain provider/account placement. The Windows account-status operation attached Codex stdout/stderr directly to a process reached through SSH, allowing descendants to retain the remote pipe until the outer timeout.

3.8.1 preserves the legacy fields as migration inputs but normalizes them into `workloadNodeId`, `providerExecutionNodeId`, and `credentialNodeId`. Account qualification and provider execution use only the latter two. Repository resolution uses only workload locality. Routes, sealed batons, contracts, telemetry, verification/recovery, and parcel ledgers preserve all three.

## Deterministic evidence

The focused locality/configuration/model/Codex/dashboard set passed 72/72. The complete `npm run check` gate passed: TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, implementation-status consistency, and 702/702 tests. Markdown link validation passed across 97 documents and `git diff --check` passed. Tests cover separated locality, same-node account isolation/fallback, unavailable credentials, legacy migration, immutable cross-node archives, route sealing, sanitized Windows execution, and local compatibility.

## Physical results — 2026-09-03

The production controller-local `qualifyAccountProfile` path qualified one isolated Codex account (`controller-account-a`) on `controller` at `2026-09-03T20:40:31.854Z`. The installed client was `codex-cli 0.144.4`, executable SHA-256 `134063e133f0b4244fa3b251acf973d4fe4b4aeeacbdc135211bf480f59f1477`. No second authenticated controller-local profile/reference was present. An existing separate profile directory returned the native unauthenticated result; it was not populated from the active profile because credential copying is prohibited.

The fixed production remote path was then exercised as `qualifyAccountProfile → ResourceCodexNodeExecutionPort.accountStatus → configured Windows SSH Resource → audited PowerShell runner`. The `cottage-plus` account completed from `2026-09-03T20:40:16.192Z` to `20:40:17.247Z` and returned the sanitized expected result `codex_chatgpt_auth_required`, not `codex_node_timeout`. The second remote reference returned the same classification. This physically proves finite stdin, node-local stream redirection, bounded process completion, and safe unauthenticated classification; it does not qualify a remote authenticated account.

The governed `ResourceRepositoryResolver` was exercised against two existing Git working-tree candidates on the Windows workload node. Both returned sanitized `repository_snapshot_failed`. A bounded diagnostic established the cause: the noninteractive Windows execution environment has no usable Git executable on `PATH` or in the standard installed locations, and WSL has no installed distribution. The working trees exist, SSH succeeds with the configured noninteractive identity, and the fixed PowerShell operation starts; `git rev-parse`/`git archive` cannot run. Agent Control did not install software, copy a mutable tree, or substitute an ungoverned archive.

Consequently the mandatory MSI immutable-snapshot → controller-account execution cannot start. Account A → baton → account B and governed A-unavailable → B fallback also cannot be physically exercised because only one controller account is authenticated. No Work Parcel, run, baton, token/cost record, or dashboard/video evidence was manufactured.

The GLM whole-repository review and recording are explicitly conditional on all preceding physical multi-account gates passing. They were not started. The configured GLM credential was not read or exposed.

## Remaining external prerequisites

1. Provide a second independently authenticated controller-local Codex profile/reference; do not copy the active account store.
2. Make a qualified Git executable available to the governed noninteractive Windows Resource, or provide an already-supported immutable repository exporter on that node.
3. If remote authenticated residency is required for the release gate, authenticate one remote profile in its existing node-local store; the fixed unauthenticated path already fails promptly and safely.

Final verdict for this run: **BLOCKED — REQUIRED CREDENTIAL/PROVIDER RESOURCE UNAVAILABLE**.

No credential values, paths, raw provider streams, or account email addresses are recorded in this document.
