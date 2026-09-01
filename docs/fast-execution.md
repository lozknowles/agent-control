# Governed fast execution

`FAST_EXECUTION_MODEL` is a generic execution class for trivial, bounded coding. `gpt-5.3-codex-spark` is the current implementation. THIN remains a context profile: a THIN task is not automatically Spark-eligible.

## Eligibility

All conditions must hold:

- `spark.enabled` is true;
- authenticated bounded availability probe passed for the exact configured model;
- model registry role `fast-execution` resolves that exact provider model on the selected node with proven `trivial.coding` capability and no fallback;
- request is explicitly one of documentation, simple configuration, symbol rename, single-file bug, lint, simple test addition or repository search;
- THIN profile, low risk, deterministic verifier;
- within configured file, line and context limits;
- no protected path or sensitive signal.

Sensitive signals include architecture, security, authentication/authorization, data migration, governance, release, deployment, production and protected configuration. Ambiguous, multi-file and deep-context work escalates before invocation.

## Availability

`probeCodexSparkAvailability` runs:

1. `codex --version`;
2. `codex login status` and requires ChatGPT authentication;
3. a bounded ephemeral read-only `codex exec --model gpt-5.3-codex-spark` expecting one exact sentinel response.

The probe strips API-key environment variables. A model string in configuration or a successful CLI version check is not availability evidence.

## Execution

`CodexFastExecutionRunner` requires an absolute, disposable, initially-clean Git worktree. It explicitly selects the model with `--model`, sets `--sandbox workspace-write`, ignores user config, disables the installed client's stable `features.multi_agent` capability, applies an output schema and supplies a sealed baton containing task, allowed files, line limit, forbidden actions, context identity and verifier commands.

The installed qualification client was `codex-cli 0.144.4`. It rejects the newer `agents.enabled=false` configuration shape, so the runner uses the verified `features.multi_agent=false` switch. The current public manual documents both current subagent configuration and explicit model selection; runtime behavior wins for this installed client.

Agent Control computes touched files and changed lines from Git, hashes the diff, and independently invokes the verifier. Model success text alone is insufficient. Failure, verifier failure, scope growth, low confidence or context requests produce visible escalation. `maximumAttempts` is fixed at one and `maximumSubagents` at zero.

## Telemetry

Each routing decision records Work Parcel, Run and Session identity; requested/actual model; provider; availability and selection reasons; task class and harness profile; parent/delegated context; attempt; elapsed time; outcome; verification; escalation and successor; files read where the runner exposes them; changed files/lines; reported input/output tokens; reported cost/currency; final verified outcome; and evidence. Missing file-read, usage, cost or successor-model data remains `null`.

`FileFastExecutionLedger` persists these records beneath Agent Control state using atomic mode-0600 writes. `GET /api/fast-execution-attempts` and the session-scoped **Fast execution** panel show execution class, actual model, verification, escalation and successor without turning the dashboard into an execution path.

## Frozen benchmark

Run classifier and availability only:

```bash
npm run benchmark:fast-execution
```

Run disposable live Spark and standard arms:

```bash
npm run benchmark:fast-execution -- --live --standard-model gpt-5.6-luna
```

The suite contains documentation, configuration, rename, single-file bug, lint, test addition, search, ambiguous, multi-file and protected tasks. The final 2026-09-01 run produced:

| Metric | Spark-first | Standard baseline |
| --- | ---: | ---: |
| Verified outcomes | 7/7 | 5/7 |
| Median latency | 12.640 s | 24.912 s |
| Time per verified outcome | 13.632 s | 31.708 s |
| Input tokens (all attempts) | 342,056 | 319,833 |
| Output tokens (all attempts) | 9,172 | 4,580 |
| Reported cost | unknown | unknown |

Classifier results were 10/10 correct with zero false positives and zero false negatives. The Spark batons were 24–35 estimated tokens and all seven verified, showing that a small compiled baton was sufficient for these frozen tasks. It does not show low total provider context: Codex startup/tool context dominated input usage.

## Recommendation

Keep Spark disabled by default. The one-host result supports continued opt-in qualification and demonstrates a strong latency/verification result, but Spark is research preview, entitlement is not universal, cost was unavailable, output usage was higher, and the corpus is small. A future fast model can occupy `fast-execution` by passing the same registry, classifier, baton, verifier and benchmark contracts; policy code does not need a new model-specific branch.
