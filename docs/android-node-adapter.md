# Generic Android node adapter

The Android node is a capability-advertising executor below the Agent Control authority boundary. Discovery begins with the configured secure-overlay adapter, not with a hostname, device model, serial number, IP address or predeclared resource. A peer becomes schedulable only after its health endpoint responds and its authenticated resource advertisement passes schema, platform, identity, authority and capability checks.

## State model

| State | Observed evidence | Schedulable |
| --- | --- | --- |
| `OFFLINE` | The overlay reports the peer offline, it has no usable address, or the overlay probe fails. | No |
| `TAILSCALE_RELAY_REACHABLE` | A supported Tailscale ping succeeds and structured peer state has no active direct address; DERP is retained as a valid route. | No |
| `TAILSCALE_DIRECT_REACHABLE` | A supported Tailscale ping succeeds and structured peer state reports an active direct address. | No |
| `AGENT_CONTROL_REACHABLE` | The typed node health endpoint responds, but authenticated identity/capability validation is absent or fails. | No |
| `AGENT_CONTROL_CAPABLE` | Health and an authenticated executor-only capability advertisement validate. | Yes, subject to current capabilities |

Tailscale discovery uses `tailscale status --json`. The liveness probe uses `tailscale ping --until-direct=false`; a successful DERP path is reachable, not offline. Human-oriented ping output is used only as a bounded fallback for latency/route diagnostics when structured status does not contain the current route.

## Configuration

The controller names the credential environment variable, never the secret:

```json
{
  "schemaVersion": 1,
  "androidDiscovery": {
    "enabled": true,
    "credentialEnv": "AGENT_CONTROL_ANDROID_NODE_TOKEN",
    "endpointPort": 8788,
    "endpointProtocol": "http",
    "probeIntervalSeconds": 30,
    "staleAfterSeconds": 90,
    "jobTimeoutSeconds": 130,
    "secureOverlay": {
      "adapter": "tailscale",
      "command": "tailscale"
    }
  },
  "resources": [],
  "providers": [],
  "services": [],
  "lanes": []
}
```

Set the same high-entropy session token in the controller environment and on the Android adapter. HTTP is suitable only inside the authenticated encrypted overlay; use HTTPS when an endpoint is exposed outside that boundary. Both bundled HTTP implementations reject sources outside loopback and standard non-public address ranges without embedding a vendor-specific overlay prefix.

## Implementations sharing one contract

`android/node-server.mjs` extends the existing Termux observation node. It now has a persistent self-generated identity, authenticated resource advertisement, replay-protected typed jobs, bounded output and a local disable file. It advertises diagnostic/log capabilities but deliberately does not advertise NFC.

`android/native-adapter/` implements the same health, resource and typed-job contract with Android NFC APIs. It is necessary because Termux JavaScript cannot safely receive Android foreground NFC reader callbacks. It is not a second scheduler or authority path: both implementations are discovered, validated, registered, scheduled and audited by the same `AndroidNodeManager`, Worker Registry and Job runtime.

Build the native adapter with Android SDK 35 and Java 17:

```bash
cd android/native-adapter
./gradlew testDebugUnitTest assembleDebug
```

Install the resulting debug APK only through an already authorised device workflow. Open the app, enter the controller's session token and endpoint port, then choose **Enable typed node**. The token remains in app memory and is cleared from the field. **Disable / human takeover**, pausing/destroying the activity, stopping the process or disabling NFC immediately fences NFC work.

## Endpoint contract

- `GET /health` is an unauthenticated, identity-free liveness response.
- `GET /v2/resource` requires bearer authentication and advertises the stable node identity, Android platform/version, health, capabilities and `agent-control-executor-only` authority.
- `POST /v2/jobs` accepts only typed allowlisted jobs with a request UUID and fresh timestamp.
- `GET /v2/jobs/{id}` returns bounded status/result/provenance.
- `DELETE /v2/jobs/{id}` requests cancellation when the job is not terminal.

No endpoint accepts a command line, shell fragment, APDU, NFC transceive, authentication key, sector request or write operation.

## Capabilities and routing

Every validated native Android node advertises:

- `platform.android`
- `device.physical`
- `execution.android.typed_jobs`
- `android.system.inspect`

When the app is foregrounded and Android reports NFC enabled, it additionally advertises:

- `device.nfc`
- `device.nfc.reader`
- `nfc.inspect.read_only`

The controller adds the observed transport capability `transport.secure-overlay`. Advertisements are allowlisted; a node cannot introduce scheduler, lease, approval or control-plane authority. Capabilities expire after `staleAfterSeconds`, and a missed discovery immediately makes the worker unavailable for new placement. See [capabilities.md](capabilities.md).

## Typed jobs

`android.system.inspect` returns bounded Android version/device and NFC availability metadata. It is harmless and does not require a human presentation.

`nfc.inspect_tag` requires all NFC routing capabilities and the named Agent Control approval `android.nfc.read-only`. It accepts only a bounded `timeoutMs` value. The lifecycle is:

```text
JOB_CREATED
  -> ROUTED_TO_ANDROID_NFC_NODE
  -> WAITING_FOR_CARD
  -> CARD_DETECTED
  -> SAFE_METADATA_READ
  -> RESULT_RETURNED
  -> JOB_COMPLETE
```

The native app enables foreground reader mode only while one authorised job is waiting. It performs no connection or transceive operation. It reads only discovery-time values cached by Android's `Tag` and technology objects, preserves the tag ID as ordered unsigned bytes, and supplies forward and byte-reversed hexadecimal forms. It disables reader mode after one tag, timeout, cancellation, activity pause or human takeover.

Possible metadata includes technology class names, tag ID, NFC-A ATQA/SAK, NFC-B application/protocol information, ISO-DEP historical/high-layer response, NFC-F manufacturer/system code, NFC-V DSF/response flags and non-protected MIFARE/barcode type/size descriptors. Fields are emitted only when Android exposes them.

## Qualification

Run discovery and the harmless diagnostic without arming NFC:

```bash
AGENT_CONTROL_CONFIG=/path/to/config.json \
AGENT_CONTROL_ANDROID_NODE_TOKEN='supplied out of band' \
npm run qualify:android-node
```

The command writes a mode-0600, redacted JSON evidence file. Peer and resource identities are hashed in the report. It reports Tailscale reachability separately from endpoint controllability and exits nonzero when no authenticated capable Android worker exists.

Only after the app genuinely advertises NFC and a human has approved the read-only operation may the operator add `--arm-nfc`. The Run visibly reaches `WAITING_FOR_CARD`; the qualification command cancels after observing that state when no card is presented. It never invents card evidence.

The OMNIKEY comparison remains a separate two-reader experiment. Compare the Android tag ID with the relevant PC/SC card identifier after preserving raw bytes and considering forward/reversed hexadecimal, leading zeros and driver-generated ATR wrappers. Do not compare a generated contactless ATR directly with Android's UID and declare a mismatch.
