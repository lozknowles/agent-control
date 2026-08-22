# Live Pixel Capability Resolution — PASS — 2026-08-18

## Gate state

Immediately before this live proof, Agent Control 2.0 passed its full local gate:

```text
TypeScript: PASS
Tests: 33/33 PASS
Failures: 0
```

## Live request

Agent Control requested capabilities without naming a machine or model implementation:

- `platform.android`
- `device.physical`
- `harness.codex`
- `observe.android.logcat`

The remote Pixel node advertisement was ingested as a generic `Resource` through the node client and supplied to the capability resolver.

## Resolution

Observed sentinel:

```text
AGENT-CONTROL-PIXEL-RESOLUTION-PASS
```

Observed resolution:

```text
resources: [pixel]
satisfied:
  - platform.android
  - device.physical
  - harness.codex
  - observe.android.logcat
missing: []
```

## Executed job

After capability resolution, Agent Control invoked the node's authorised `android.observe.logs` operation. It completed successfully on resource `pixel` and returned physical-device identity evidence:

```text
manufacturer: Google
model: Pixel 8 Pro
device: husky
Android: 17
SDK: 37
```

## Transport and authority context

The Pixel node remained bound to Pixel loopback. hpubuntu reached it through the previously qualified SSH-over-Tailscale local forward. Node bearer authentication and deny-by-default job authority had already been separately proven; arbitrary `android.execute.shell` returned HTTP 403.

No credential or raw Tailscale IP is recorded here.

## Verdict

PASS: Agent Control 2.0 selected a real remote physical resource from semantic capability requirements and executed an authorised operation on that selected resource. The contract/request did not depend on Pixel hardware identity, a Tailscale IP, or a named model implementation.

This is the first live proof of the 2.0 capability-agnostic scheduler boundary across a physical remote device.
