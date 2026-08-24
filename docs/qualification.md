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

Android capability resolution requires an Android resource with a health URL plus its configured credential environment variable:

```bash
npx tsx scripts/prove-android-resolution.ts
```

The proof is read-only and accepts only the bundled Android log-observation operation.
