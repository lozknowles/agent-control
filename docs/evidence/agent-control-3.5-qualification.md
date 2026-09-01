# Agent Control 3.5 feature qualification — 2026-09-01

## Scope

Unreleased feature-branch qualification for identity/session/delegation, ACP v1 mapping, context deterioration, Sessions dashboard/API and governed Spark fast execution. No live Agent Control deployment, main merge, tag or release was performed.

## Baseline

- Base: `origin/main` at `4b04f3942201d65748c6c68bf9669cdea1841d19` (Agent Control 3.4.0).
- Baseline `npm run check`: 550 tests, zero failures before implementation.
- Worktree: isolated `/fast/work/agent-control-3.5-identity-delegation-acp`.

## Spark availability

- Installed client: `codex-cli 0.144.4`.
- Authentication: ChatGPT login reported active.
- Exact model: `gpt-5.3-codex-spark`.
- Probe: ephemeral, read-only, user config ignored, exact `SPARK_AVAILABLE` sentinel.
- Result: available; provider usage from the probe was reported, but monetary cost was not.

The first live benchmark launch failed before model execution because client 0.144.4 rejects the newer `agents.enabled=false` configuration type. The runner was corrected to the verified installed-client `features.multi_agent=false` switch. No fixture changes occurred in the failed launch. This incompatibility and both evidence files are retained.

## Frozen fast-execution evidence

Evidence files:

- `artifacts/fast-execution/benchmark-2026-09-01T18-45-33-624Z.json`: classification/availability preflight.
- `artifacts/fast-execution/benchmark-2026-09-01T18-45-50-639Z.json`: failed pre-model launch proving installed config incompatibility.
- `artifacts/fast-execution/benchmark-2026-09-01T18-50-39-151Z.json`: corrected final live comparison.

Classifier: 10/10 correct; 0 false-positive Spark routes; 0 false-negative eligible routes. Ambiguous, multi-file and protected tasks were never sent to Spark.

Final live results:

| Route | Verified | Median latency | Time / verified | Input | Output | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Spark-first | 7/7 | 12.640 s | 13.632 s | 342,056 | 9,172 | unknown |
| `gpt-5.6-luna` baseline | 5/7 | 24.912 s | 31.708 s | 319,833 | 4,580 | unknown |

Spark touched only approved files, stayed within line limits and passed independent fixture verifiers. Luna returned explicit `ESCALATE` for the simple configuration and repository-search fixtures; these were correctly counted as unverified outcomes, not model failures hidden by a retry.

## Baton/context finding

Eligible parent-to-child Context Packets were 24–35 estimated tokens. Spark verified all seven tasks without requesting more context. This supports a small structured baton for the frozen trivial class. It does not prove lower total model input because the Codex host/runtime context dominated reported usage.

## Multi-provider 3.5 experiment

The required Luna → local LLM → GLM-5.3-Flash → Luna physical chain was not executed. Read-only inventory found no qualified local-LLM or GLM model-registry route in this isolated 3.4 base, and the running 3.3.1 dashboards do not expose a reusable 3.4 model registry. Existing live deployments were not mutated. The chain is therefore `NOT_QUALIFIED_ON_THIS_HOST`, not simulated and not claimed passing.

## Final feature-branch gates

- Focused Sessions dashboard/API gate: 24 tests, zero failures.
- Canonical `npm run check`: 587 tests, zero failures, including type checking, bootstrap syntax, dashboard JavaScript syntax, infrastructure-neutrality and implementation-status consistency.
- `config/agent-control.example.json`: accepted by the production `validateConfig` path.
- `git diff --check`: clean.
- `npm pack --dry-run`: `agent-control@3.5.0`, 524 files, 928,214-byte archive estimate and 4,128,700-byte unpacked estimate.
- Evidence scan: no credentials, API keys, bearer values, pairing PINs or local workspace paths in the committed fast-execution artifacts.

## Verdict

Feature implementation and all deterministic/full-suite gates pass. The verdict is `PASS_WITH_LIMITATIONS`: the release-level physical multi-provider chain remains unqualified on this host, ACP transport/client conformance remains deferred, and Spark should remain default-disabled pending broader corpus, entitlement and cost evidence.
