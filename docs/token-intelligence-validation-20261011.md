# Token Intelligence validation — 11 October 2026

Historical validation of `adf9a601`, superseded by [token-intelligence-work-candidate-20261011.md](token-intelligence-work-candidate-20261011.md). The dashboard and storage statements below apply to the prototype only.

Status: experimental library/CLI candidate; NOT RELEASE QUALIFIED. Nothing pushed, merged or deployed.

Starting commit: 80cbbff4f8b94b0ba430562e69ff5efa67c65745
Implementation commit: adf9a601cf1d54fe0db8ac797d07c812de2adc38

## Results

- Original external-token-normalization tests: 4/4 pass on starting branch.
- Final focused command: node --import ./scripts/test-environment.mjs --import tsx --test src/control/external-token-normalization.test.ts src/control/external-session-usage.test.ts src/control/usage-intelligence.test.ts
  Result: 39 passed, zero failures. Includes CLI execution, normalization, ingestion and native accounting isolation.
- npm run typecheck: passes after final TypeScript changes.
- Expanded focused web/accounting run: 95 tests, 94 pass, 1 fails with provider_credential_store_permissions_invalid.
  This run preceded the final CLI fixture and final parser metadata guards.
- npm run check:neutrality: 3/3 pass.
- npm run check:dashboard: passes syntax validation; no browser qualification claimed.
- git diff --check: passes.
- npm test broader run: 2,460 tests reported; 2,290 pass, 162 fail, 8 skipped, zero cancelled; exit 1; about 475 seconds.
  The full run overlapped implementation work and is NOT exact-final-commit qualification. Its stalled openwa.test.ts worker was explicitly terminated to let subsequent files run; these totals include that intervention.

## Baseline comparisons

Detached checkout of the unchanged starting SHA reproduced:
- web-server provider catalogue API/dashboard/SSE test: provider_credential_store_permissions_invalid.
- Four selected OpenWA tests (definition drift, delivery acknowledgement, normalized voice intake and voice outbox): Windows EPERM during temporary directory removal.
- POE documentation symlink containment fixture: Windows EPERM creating the symlink.

These selected baseline reproductions do NOT prove all 162 broad failures are pre-existing.
Other reported failures include permission-sensitive state/credential tests, bootstrap tests, execution/qualification fixtures and platform-dependent tests. They remain unclassified. Security and unrelated runtime code were not weakened to obtain a green run.

## Retained local logs

Logs remain in the isolated checkout, ignored by Git. No private machine paths or raw test output are added to distribution.

SHA-256:
- regression-token-intelligence.log: 05a5ef5b11ce78a2f82191cfbcad83edce53deb8ea286fb24f4ab7be67ae6d47
- focused-core-token-intelligence.log: 3f09d876b4b23ed48a74bf2c57e7439a15f21c42d7fe919b4c2b417a10f00d41
- focused-token-intelligence.log: 4e2d5e7fbba154038ab39852bce64d327dfbf3cd2242c69df56ace6e30983617

## Release blockers

An exact-final-commit green regression run, classification of remaining failures, platform matrix, path authorization for any future web boundary, durable external revision storage, fork/native reconciliation, period allocation, incremental performance and browser/invoice evidence remain required.
External data is opt-in explicit-file inspection, with source hashes and no native billing/accounting effect. The dashboard is not live-wired to ingestion. See token-intelligence-ingestion-candidate.md for detailed limits.
