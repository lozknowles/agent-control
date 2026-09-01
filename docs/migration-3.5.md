# Migration to Agent Control 3.5

3.5 is additive over 3.4 and does not require rewriting existing Work Parcel, Job, model-registry or lane state.

## Existing data

- Existing Work Parcel snapshot version remains supported. New parcels add optional `attribution`.
- Existing run/parcel actor strings are mapped deterministically with `legacyAttribution`; they are not silently asserted to be authenticated humans.
- Existing persistent teammate profiles remain valid. An Agent identity is a separate control-plane record and does not change a profile's authority.
- Historical `Ox`, `ox-alpha` and `Ox Alpha` model labels project as aliases of canonical `GLM-5.3-Flash`.
- Existing model roles and STANDARD routing remain unchanged.

## Configuration

The new `spark` block is optional. Omission is equivalent to disabled. A conservative example is:

```json
{
  "spark": {
    "enabled": false,
    "model": "gpt-5.3-codex-spark",
    "modelRole": "fast-execution",
    "maximumFiles": 1,
    "maximumChangedLines": 80,
    "maximumAttempts": 1,
    "maximumSubagents": 0,
    "maximumContextTokens": 2048,
    "verificationRequired": true
  }
}
```

To become routable, the model registry must also contain a qualified model whose provider-native identity exactly matches `spark.model`, capability includes `trivial.coding`, node qualification includes the target node, and role `fast-execution` selects it. Configuration alone does not qualify availability.

Use the authenticated **Configuration → Fast execution** editor or `POST /api/configuration/spark`. A restart is required because availability probing and runner construction are startup policy. Keep `enabled: false` until local qualification is reviewed.

## Upgrade checks

1. Run `npm install` and `npm run check`.
2. Start an isolated state directory and confirm the default operator Session appears.
3. Submit a non-production task and confirm Work Parcel attribution.
4. Confirm legacy parcels still load and show deterministic legacy attribution.
5. If evaluating Spark, run `npm run benchmark:fast-execution -- --live`; do not enable it from availability alone.
6. Run ACP adapter conformance tests if an external client is being introduced.

No deployment, live configuration change or tag is performed by this feature branch.
