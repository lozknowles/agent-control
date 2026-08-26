# Capability vocabulary

Agent Control Jobs request semantic capabilities. They do not name a hostname, model, serial number, network address or transport vendor. A worker is eligible only while healthy and while every required capability is current.

## Android and NFC

| Capability | Meaning | Source |
| --- | --- | --- |
| `platform.android` | The authenticated executor reports Android as its platform. | Node advertisement |
| `device.physical` | The executor represents a physical device rather than a simulated provider. | Node advertisement |
| `execution.android.typed_jobs` | The node accepts the versioned allowlisted Android job protocol; it does not imply shell execution. | Node advertisement |
| `android.system.inspect` | The node can perform the harmless typed Android diagnostic. | Node advertisement |
| `device.nfc` | Android reports NFC hardware/service availability. | Native adapter observation |
| `device.nfc.reader` | The foreground native adapter can enter reader mode for an armed job. | Native adapter observation |
| `nfc.inspect.read_only` | The node implements the validated metadata-only `nfc.inspect_tag` policy. | Native adapter observation |
| `observe.android.logcat` | The Termux reference node can return a bounded read-only log snapshot. | Termux adapter observation |
| `transport.secure-overlay` | Agent Control reached the authenticated node through the configured secure-overlay discovery adapter. | Controller observation |
| `device.smartcard.reader` | A separate node reports a usable smart-card reader. It does not imply Android NFC or a particular USB reader. | Reader/PCSC adapter observation |

The NFC Job requires `platform.android`, `execution.android.typed_jobs`, `device.nfc.reader` and `nfc.inspect.read_only`. A non-NFC Android node and an NFC-looking node with expired/failed authentication are rejected with visible missing/stale capability reasons.

Capability advertisements are evidence, not authority. The Android manager has a fixed acceptance allowlist and requires the node to state `agent-control-executor-only`; it discards unknown claims. Worker placement remains distinct from provider/model routing.

## Capability lifecycle

1. A configured discovery adapter finds platform-matching peers.
2. Network reachability is classified without registering a worker.
3. Agent Control probes the typed endpoint.
4. An authenticated resource advertisement is validated.
5. Accepted capabilities are registered with an expiry.
6. The scheduler resolves the Job requirements and records every selected/rejected worker.
7. A missed or failed probe fences the worker; expiry removes placement eligibility until the full validation repeats.
