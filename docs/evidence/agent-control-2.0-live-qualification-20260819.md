# Agent Control 2.0 Live Qualification — PASS — 2026-08-19

## Qualified implementation

- Agent Control tested commit: `b3bbd882ea69296bea31adf4b7211c18dd829626`
- ChatGPT Window tested implementation included the response-detection correction committed as `2e18484e1ff5a4ffecaeb83b325db1880ef79e23`
- Qualification trace: `0425bbc9-dc10-41fe-8afa-c40c12fa8b16`

## Automated release matrix

```text
PASS local-types-and-tests
PASS hpubuntu-codex-present
PASS pixel-node-health              HTTP 200
PASS pixel-capability-resolution
PASS windows-chatgpt-responses      HTTP 200
PASS remote-sentinel

RESULT PASS
passed=6
failed=0
skipped=0
```

The local TypeScript/unit gate immediately before qualification was `41/41 PASS` with zero failures/skips.

## Platform evidence

- hpubuntu: Linux Codex CLI observed and qualified by the automated harness.
- Pixel: Android Agent Control node healthy; semantic capability request resolved to `pixel`; authorised observation completed on the physical device.
- MSI/Windows: ChatGPT Window browser provider completed the deterministic Responses round trip and returned the exact sentinel.
- Sentinel: remote Linux resource reachable through the configured SSH/Tailscale path. This attestation does **not** claim Codex is installed on Sentinel.

## Telemetry baseline

30 telemetry events were present after the qualification sequence. Initial timing summary:

| Span | Count | p50 | p95 | max |
|---|---:|---:|---:|---:|
| `transport.node.http` | 6 | 146.863 ms | 905.938 ms | 905.938 ms |
| `resolver.resolve` | 3 | 0.895 ms | 1.190 ms | 1.190 ms |
| `tool.android.observe.logs` | 3 | 804.864 ms | 906.867 ms | 906.867 ms |
| `task.time_to_accepted_result` | 3 | 955.043 ms | 1026.916 ms | 1026.916 ms |

The sample is intentionally treated as a baseline, not statistically mature performance evidence. In particular, p95 values with only three/six samples should not be interpreted as stable service-level percentiles.

## Security/evidence hygiene

The generated qualification and telemetry directories were scanned for the node-token variable name, bearer-token patterns and 64-character lowercase hexadecimal values. No matches were returned. Raw runtime state and generated qualification output are excluded from version control; this document is the sanitised durable attestation.

No credential, private SSH key or raw node bearer token is included here.

## Verdict

**PASS — full current Agent Control 2.0 live matrix completed in one automated run with 6/6 gates passing and zero skipped gates.**

This attestation qualifies the exact tested implementations and topology above. Later code changes require their own qualification; this document must not be treated as blanket approval for subsequent Work Queue, persistent execution-session, Shizuku, arbitrary Android mutation, or other post-2.0 functionality.
