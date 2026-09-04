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

## Resumed physical qualification — 2026-09-04

The preceding blocked result is retained as historical evidence. Qualification resumed from repository checkpoint `e50697874c0838d7b2acdf918a4f0cad7b8e4356` without changing product code, repository history, deployment state, or the global Codex authentication home.

### Controller account profiles

Agent Control's production profile resolver and `qualifyAccountProfile` path independently resolved and qualified `controller-account-a` and `cottage-plus` on the controller. The profiles have different opaque account IDs, different credential environment references, and different isolated Codex homes. Profile B was authenticated through its own supported Codex device flow; the same waiting process received approval and exited successfully. Both subsequent production status checks returned `QUALIFIED` with `codex-chatgpt-authenticated`. No credential file was read, copied, fingerprinted, or persisted, and the process-global `CODEX_HOME` was unchanged.

### MSI Git and immutable repository snapshot

Governed discovery established that Git was absent from MSI's noninteractive `PATH`, standard Git-for-Windows locations, and common application-bundled locations. Windows Package Manager was available, so the trusted `Git.Git` package was installed for the Windows user without changing Agent Control. A new governed SSH session resolved `git version 2.55.0.windows.3`; the executable SHA-256 was `7b7971dd13f0c3a284e538601f2f9770b3a87dfaccb5fb52d68141c67ed22364`.

Both pre-existing MSI Agent Control worktrees were dirty and were left untouched. A disposable clean clone of the newer MSI repository was created at commit `c37b54b00fa7318ac3261109641c8c5e68795eec`. The unchanged production `ResourceRepositoryResolver` then executed its fixed PowerShell snapshot operation, resolved the exact commit, rejected credential-like tracked paths, ran `git archive`, verified archive and extraction safety, and produced a read-only `remote-immutable-archive`. Archive SHA-256: `f5b9bd9f89a7e67f3da3e8e7ebdd9a7a73f272d0e9c5a8bab7b018842d1e9276`. The snapshot was clean and its source identity remained hashed; no Windows absolute repository path was persisted.

### Physical account A to account B baton lifecycle

The normal `DirectRepositoryReviewExecutor` production lifecycle reviewed two real immutable repository chunks using the documented qualification-only governor thresholds (`0.1/0.2/0.3/0.4` percent) while retaining the production assessment, baton, contract, handoff, provider invocation, and validator implementations.

- Job: `repository-code-review@1`
- Run: `5dd1a95d-719c-4503-af43-f464bb102c37`
- Work Parcel: `parcel-5de60fb2-69ed-4b94-b10e-221e297590fd`
- Source: `codex-chatgpt/controller-account-a/account-a-review`, workload `msi`, provider execution and credential residency `controller`
- Destination: `codex-chatgpt/cottage-plus/account-b-review`, workload `msi`, provider execution and credential residency `controller`
- Token baton: `token-baton:ff96cc1a-63ae-41cb-b991-2e7df7b09c5d`
- Token-baton SHA-256: `9b969d6b1c0a2724c5def43d1e0a3282cbba44162a23826cb22f4fa09b004c2d`
- Governed handoff: `handoff:0a0f0343-29f1-40bd-87ff-a2348ddcec23`, `DELEGATE`, `COMPLETED`
- Destination contract: `contract:33d44107-d5fd-4ffa-bcbf-ed89b62b25b8`, independent verification `PASSED`
- Final review verdict: `PASS`

The governor recorded unavailable live context at invocation start, then estimated ephemeral single-turn occupancy from authoritative completed usage: A `13,029 / 32,768` tokens (`39.76%`) and B `13,178 / 32,768` (`40.22%`). It recorded `CONTINUE`, threshold `COMPACT_AND_CONTINUE`, bounded-work `BATON_AND_HANDOFF`, sealed-baton readiness, destination continuation, and successful handoff while preserving the source thread as recoverable. Current-context occupancy is explicitly estimated; completed cumulative token usage is provider-reported. Provider cost was unavailable. Qualification-only configured pricing produced estimated/calculated route cost solely to exercise lower-cost selection.

Accounting reconciled exactly across every durable view: A `12,859` input + `170` output = `13,029`; B `12,830` input + `348` output = `13,178`; Work Parcel total `25,689` input + `518` output = `26,207`. Calculated qualification-routing cost was `0.131990 + 0.013526 = 0.145516 USD`; it is not claimed as provider billing.

### Governed account fallback

Account A was made temporarily ineligible only in the in-memory qualification registry; its authentication was not exhausted, corrupted, or logged out. Agent Control considered A and rejected it with `account-profile-disabled`, considered B as eligible, selected B with fallback reason `account-a-review:account-profile-disabled`, executed the real provider call, and independently verified `PASS`. The temporary policy disappeared at process exit.

- Run: `fbf1fcc9-0fb9-42d6-96c6-4d6ef9889b05`
- Work Parcel: `parcel-9009aa24-364e-4936-b741-31e674c97960`
- Selected account: `cottage-plus`
- Usage: `12,378` input + `192` output = `12,570` total tokens
- Calculated qualification-routing cost: `0.012762 USD`; provider cost unavailable

This proves governed configured-profile fallback. It is not represented as live quota or rate-limit failover.

### Recovered GLM credential reference and provider qualification

The initial shell-only check was insufficient. Historical Ox/Ox Alpha launch configuration identified `OPENROUTER_API_KEY_FILE` and the established `/etc/agent-control/openrouter.key` reference. The file remained present with owner-only permissions; its value was never printed, copied, or persisted. The current qualification shell and service manager did not inherit either OpenRouter variable, and the canonical example retained only the direct environment reference. Agent Control's generic file-reference compatibility was restored without a provider-specific shortcut.

The first real `qualifyModel` run authenticated and proved exact `openrouter/z-ai/glm-5.3-flash` identity but exhausted the hard-coded 256-token allowance during structured output. After a bounded 1,024-token allowance was applied to nontrivial capability checks, the production qualifier passed identity, coding/structured output, reasoning, and tool-use. Provider-reported qualification usage and costs were retained; no credential value or path entered the evidence. Qualification evidence root: `/fast/qualification/agent-control-3.8.1-glm-KvSmy8`.

Machine-readable resumed evidence is recorded in `agent-control-3.8.1-resumed-physical-evidence.json`. Operational full-fidelity records remain under `/fast/qualification/agent-control-3.8.1-accounts-1AJFlB`, `/fast/qualification/agent-control-3.8.1-fallback-LSq14w`, and `/fast/qualification/agent-control-3.8.1-msi-gsP6he`.

Final regression at this resumed checkpoint passed `npm run check`: TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, and all 32 implementation-status claims passed; the complete deterministic suite passed 702/702 tests with zero failures, cancellations, skips, or todos. The evidence JSON parsed successfully, `git diff --check` passed, and a bounded secret/path scan found no credential values or Windows absolute paths in the persisted evidence.

Current verdict: **QUALIFICATION IN PROGRESS — GLM PROVIDER QUALIFIED; FULL REPOSITORY REVIEW PENDING**.
