# Android node security boundary

The Android adapter is an external executor. Agent Control retains scheduling, leases, ownership, approval policy, verification and acceptance authority. A valid node response can report execution evidence; it cannot grant itself a capability outside the controller allowlist or make another Run authoritative.

## Trust and threat model

The controller, its state directory and approval boundary are trusted. The secure overlay supplies encrypted peer transport and peer reachability, but overlay membership alone is not Agent Control authentication. The Android OS/NFC service and the human-presented authorised card are inputs. The remote node may be unavailable, stale, malformed or compromised and is treated as non-authoritative.

Threats include an overlay peer probing the endpoint, a replayed mutation, a malicious capability advertisement, oversized or malformed requests/results, an accidental nearby tag, a stalled job, stale capabilities after disconnect, token disclosure, and an adapter attempting to influence control-plane state.

## Controls

| Boundary | Enforcement |
| --- | --- |
| Authentication | Resource discovery and every job operation require a bearer session token. Comparison is constant-time. Configuration stores only the environment-variable name. The unauthenticated health response exposes no stable node identity. |
| Network source | Bundled HTTP endpoints accept loopback and standard non-public transport source ranges only, without embedding a vendor-specific overlay prefix. Tailscale DERP remains an encrypted valid route and is not treated as a trust upgrade. |
| Authenticated identity | A persistent local UUID derives the generic resource ID. The controller accepts it only in an authenticated `agent-control.resource/v2` advertisement for platform `android`. |
| Authorisation | Controller and node independently allowlist `android.system.inspect` and `nfc.inspect_tag`. The Termux implementation also retains its bounded legacy `android.observe.logs`; it cannot advertise NFC. No arbitrary shell or command API exists. |
| Capability containment | The controller copies only known Android execution/observation/NFC capabilities. Unknown or authority-like claims are discarded. Required baseline capabilities and `agent-control-executor-only` must be present. |
| NFC policy | NFC routing requires `device.nfc.reader`, `nfc.inspect.read_only` and the named `android.nfc.read-only` approval. Payloads reject APDU or unknown keys. Source policy tests reject connect, transceive, authenticate, write, format and host-card-emulation primitives. |
| Replay protection | Mutating requests carry a UUID and ISO timestamp. Nodes reject missing, reused or older-than-window evidence and bound the nonce cache. |
| Bounds | Native/Termux request bodies are limited to 16 KiB, header count/line size is bounded natively, retained jobs/nonces are capped, log output is capped, controller responses are capped at 1 MiB, and NFC timeout is 5–120 seconds. |
| Timeout and cancellation | Agent Control enforces action timeout and issues remote cancellation. The NFC node also owns its presentation timer. Cancellation, timeout, activity pause and on-device disable turn off reader mode. |
| Human takeover | The native app exposes an unconditional **Disable / human takeover** control. Termux supports process stop, `AGENT_CONTROL_NODE_ENABLED=0` and a local disable file. Re-enable is a deliberate local act. |
| Provenance | Runs retain capability placement, selected worker reference, status changes, attempts, verification and Agent Control provenance. Nodes return their own bounded per-job state transitions. Qualification evidence hashes peer/resource identities and omits credentials and raw topology. |
| Offline/reconnect/staleness | A failed peer probe is offline. A reachable peer without an endpoint remains network-only. A missed discovery immediately degrades and fences the worker; expiry makes it offline. Reconnect must re-run health, authentication and capability validation before scheduling. |
| Malformed/compromised node | Invalid schemas, identities, platform, authority, health or capabilities fail closed. A node never receives a control-plane token, lease mutation API, approval grant, scheduler method or authority to register other nodes. |

## NFC data boundary

The allowed result schema is `agent-control.nfc-inspection/v1` with `policy: read-only`. The controller validates ordered raw identifier bytes and their exact forward/reversed hexadecimal encodings. It rejects result keys associated with transceive commands, APDUs, keys, authentication, writes, sectors, blocks, NDEF contents, cloning or emulation.

Android metadata acquisition uses only values available from the discovery callback and cached technology getters. The adapter never calls `TagTechnology.connect()`, `transceive()`, MIFARE authentication, tag write/format operations or host card emulation.

Identifiers are sensitive operational evidence even when unprotected. Qualification output should retain only redacted/hashes unless the operator deliberately stores a protected comparison artifact.

## Residual risks and operational requirements

- The bearer token is shared session material. Rotate it after suspected disclosure and do not pass it on a command line that is logged.
- The native app must remain foregrounded for NFC. Android lifecycle or power management may stop it; Agent Control must then expire its capabilities rather than assume recovery.
- HTTP is intentionally supported for encrypted private-overlay transport. It must not be exposed to a public or untrusted network; use authenticated TLS for any broader exposure.
- App source/build tests do not prove installation, remote endpoint reachability or physical NFC hardware. Those remain live qualification gates.
- A card identifier may itself be insufficient to reproduce OMNIKEY behaviour. No protected-card access is authorised by this adapter.
