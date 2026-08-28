# Agent Control 3.1.0 release qualification

Date: 2026-08-28

Decision: **PARTIAL** for automatic context-profile routing; **release-safe** for the benchmark, telemetry, typed execution and qualification infrastructure.

## Source lineage

- Baseline harness/context implementation: `be72754f3320c516c4bfc257deeeeebf93112399`.
- Real-mutation implementation: `a62006fd75c54766356522f55c86234d1593201e`.
- Pre-merge `origin/main`: `31d9c2378a23d37df8c8a29bd752c30752383c74`.
- Clean integration branch: `integration/3.1-real-mutation-release-20260828`.
- The transient dependency link is ignored and absent from the source tree.

## Deterministic and live qualification

- Complete repository gate: 385/385 tests passed; TypeScript, bootstrap scripts, dashboard syntax, implementation-status projection and `git diff --check` passed.
- Infrastructure neutrality: 3/3 passed against the staged tree.
- Credential-pattern scan: passed for tracked text and losslessly compressed patch evidence.
- Frozen fixture SHA-256: `d1b5e8ebec19378b5d2112e8be5e73671a51c40bc328af8ded815be44edb6b27`.
- Live mutation benchmark ID: `805da318b2fb205c663ff11d93f8932ad76219f66bd5e58d240355b22caff2fc`.
- Machine-readable mutation report SHA-256: `93136bb763816f925a7c301c4d810ba51c8bb22d73f970afc31e42f28d3f433a`.
- Harmless Job qualification: `PASS_SAFE_NON_PRODUCTION`; evidence SHA-256 `50f6bfa9d78576ff0fa0b4b5989e190f2f39b9e7e7e3e7581997fb25bb822e97`.
- Real governed model-backed Job: `REAL_HARNESS_EXECUTION_QUALIFIED`; evidence SHA-256 `66c2a9c09a20579edd3ad28a8d667ec0f8f3f0979380ce6012357981effda852`.
- Live ToolPolicy denials passed for ungranted tool, stale lease generation, stale ownership generation and human takeover.
- Configured-infrastructure checks were honestly skipped because this isolated release worktree had no operator configuration.

## Routing decision

STANDARD and DEEP each verified 2/12 tasks. THIN verified 0/12. Adaptive THIN-to-STANDARD-to-DEEP also verified 2/12 but accumulated 38,639.5 fresh and 255,213 processed tokens per verified outcome, versus 11,964.5 fresh and 56,064 processed tokens for STANDARD. The sample is also below the 20-task production minimum.

Automatic production routing is therefore not qualified. Production remains observational with STANDARD applied. No monetary saving is claimed because authoritative provider pricing was unavailable.

## Protected services

Both protected model services were active before and after live qualification. Their main process IDs remained `3778037` and `3778036`, and the qualified health endpoint returned `{"status":"ok"}` before and after. No cache reset, restart or service disruption was performed.

## Evidence locations

- `artifacts/harness-mutation-report.json`
- `docs/harness-mutation-report.md`
- `artifacts/harness-mutation-evidence/`
- `qualification-results/qualification-2026-08-28T07-45-59-940Z.json`
- `qualification-results/jobs-2026-08-28T07-48-47-899Z.json`
- `qualification-results/real-harness-job.json`
