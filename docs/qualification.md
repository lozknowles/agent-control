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

Android capability resolution requires an Android resource with a health URL plus its configured credential environment variable:

```bash
npx tsx scripts/prove-android-resolution.ts
```

The proof is read-only and accepts only the bundled Android log-observation operation.
