# Pixel Remote Agent Control Node — PASS — 2026-08-18

## Physical resource

- Logical Agent Control identity: `pixel`
- Tailscale endpoint discovered: `pixel-8-pro`
- Device: Google Pixel 8 Pro (`husky`)
- Android: 17 / API 37
- Termux user: `u0_a438`
- Codex present locally

Raw Tailscale IP is deliberately omitted from durable identity/evidence because Agent Control treats addresses as transient transport metadata.

## Transport proof

`hpubuntu` successfully reached `pixel-8-pro` with Tailscale ping. Termux OpenSSH was reachable on port 8022. A dedicated ED25519 client key on hpubuntu completed a password-disabled SSH proof returning `REMOTE-PIXEL-KEY-PASS`.

The Pixel Agent Control node remained bound to Pixel loopback `127.0.0.1:8788`. hpubuntu accessed it only through an SSH local forward at hpubuntu loopback `127.0.0.1:18788` over the Tailscale path.

Remote health returned:

```json
{"status":"ok","node":"pixel","version":"2.0.0-pixel-alpha.2"}
```

## Authentication proof

A request with an incorrect bearer credential returned `unauthorized`. A request with the node's current credential returned the authenticated resource advertisement.

No bearer credential is recorded in this evidence.

## Capability advertisement

Authenticated `/v2/resource` advertised only the capabilities proven by the Pixel alpha:

- `platform.android`
- `device.physical`
- `harness.termux`
- `harness.codex`
- `observe.android.logcat`

It did not claim ADB, Shizuku, root or generic shell execution capability.

## Allowed operation proof

Authenticated `POST /v2/jobs` with:

```json
{"type":"android.observe.logs","lines":10}
```

completed successfully. Evidence identified Google Pixel 8 Pro / husky / Android 17 / API 37 and returned ten real `logcat` entries. The returned evidence included the exact deterministic command shape used by the node.

## Deny-by-default authority proof

Authenticated `POST /v2/jobs` attempting:

```json
{"type":"android.execute.shell","command":"id"}
```

returned:

```text
HTTP/1.1 403 Forbidden
```

with:

```json
{"error":"capability_not_authorized","allowed":["android.observe.logs"]}
```

This proves that transport reachability and successful authentication do not confer arbitrary execution authority.

## Verdict

PASS for the Pixel alpha remote node:

- Tailscale reachability: PASS
- SSH identity/key transport: PASS
- loopback-only node forwarding: PASS
- node health: PASS
- bearer authentication: PASS
- resource/capability discovery: PASS
- authorised Android observation: PASS
- deny-by-default arbitrary execution: PASS

The proof does not qualify Shizuku, ADB, package mutation, settings mutation, arbitrary shell execution, autonomous remote Codex jobs, or long-duration node reliability.

## Security follow-up

The qualification bearer token was exposed during interactive testing and must be rotated before stable use. Stable credential setup should generate/store node credentials without printing or committing them and should preserve the capability/authority separation demonstrated here.
