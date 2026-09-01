# Qualification

Run the local release gate first:

```bash
npm run check
npm run qualify
```

The harness always runs the local gate. It then reads the same configuration used by the control plane and performs only non-mutating health checks for configured services, resources and providers. Missing configuration is recorded as `SKIP configured-infrastructure`, not replaced by private defaults.

Optional SSH checks are explicit:

```bash
AGENT_CONTROL_REMOTE_CHECKS='worker-a|operator@worker-a.example|echo AGENT-CONTROL-REMOTE-PASS' npm run qualify
```

Results are timestamped JSON in ignored `qualification-results/`. A configured endpoint is not considered functionally qualified unless the relevant live proof has run and its exact identity/evidence is retained. Source support, configured availability and live qualification are separate claims.

The token-aware output benchmark is deterministic and local:

```bash
npm run benchmark:token-output
```

It generates a temporary 240-file/48,000-line source tree, runs small, medium, broad and pathological searches, compares normal ripgrep output with the compact/indexed path, performs selected and full expansion, and fails unless match/file counts agree, the exact authoritative stream is recoverable, and broad/high-match initial reduction is at least 70%. It deletes the fixture after the run. Recorded evidence is [`docs/evidence/token-aware-output-benchmark-20260827.json`](evidence/token-aware-output-benchmark-20260827.json).

## Real repository-mutation harness experiment

The real-mutation matrix is an opt-in live qualification, not part of the configuration-free local gate:

```bash
AGENT_CONTROL_HARNESS_MUTATION_BASE_URL=http://127.0.0.1:PORT/v1 \
AGENT_CONTROL_HARNESS_MUTATION_MODEL=qualified-model-id \
npm run benchmark:harness-mutation:live
```

It verifies the endpoint/model identity, checks the frozen fixture hash, creates a fresh disposable Git workspace per task/strategy, dispatches through `HarnessDispatcher` and `ToolPolicy`, and independently verifies each real diff. It compares THIN, STANDARD, DEEP and cumulative adaptive escalation with the same model/settings. Production routing qualifies only if every versioned gate criterion passes; a successful benchmark process does not itself enable routing. See [`harness-mutation-report.md`](harness-mutation-report.md) and [`../artifacts/harness-mutation-report.json`](../artifacts/harness-mutation-report.json).

Android capability resolution requires an Android resource with a health URL plus its configured credential environment variable:

```bash
npx tsx scripts/prove-android-resolution.ts
```

The proof is read-only and accepts only the bundled Android log-observation operation.

## Spark fast-execution qualification

Spark qualification is opt-in and is not part of the configuration-free local gate. First check the exact installed Codex executable, ChatGPT authentication, frozen classifier and bounded exact-model availability probe:

```bash
codex --version
codex login status
npm run benchmark:fast-execution
```

Only after that preflight passes, run both mutation arms in disposable Git worktrees:

```bash
npm run benchmark:fast-execution -- --live --standard-model gpt-5.6-luna
```

Acceptance requires 10/10 frozen classifier decisions with no false-positive Spark route; exact requested/actual `gpt-5.3-codex-spark` identity; approved file/line scope; a single attempt with no subagents; and independent verification for each accepted outcome. Unavailable Spark, requested context, scope growth, low confidence or verifier failure must be recorded as failure/escalation and must not trigger a hidden model substitution or Spark retry.

The qualified desktop client is `codex-cli 0.144.4` and uses the directly tested `features.multi_agent=false` compatibility switch because that installed version rejects the currently documented `agents.enabled=false` boolean shape. Requalify this control after upgrading Codex. Provider monetary cost is currently unavailable and must remain `null`/`unknown`, not zero. The current evidence files and interpretation are listed in [`evidence/agent-control-3.5-qualification.md`](evidence/agent-control-3.5-qualification.md); detailed operator guidance is in [`fast-execution.md`](fast-execution.md).
