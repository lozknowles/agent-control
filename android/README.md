# Generic Android resource

Android support is manufacturer-, model-, hostname- and topology-neutral. Both bundled implementations expose the same authenticated typed-node contract and remain executors beneath Agent Control scheduling and approval policy.

See [`../docs/android-node-adapter.md`](../docs/android-node-adapter.md) for discovery/configuration/qualification and [`../docs/android-node-security.md`](../docs/android-node-security.md) for the security boundary.

## Termux diagnostic and log adapter

The existing Termux implementation supports a harmless system diagnostic plus its bounded read-only log observation. It cannot advertise or execute NFC because it has no Android foreground reader callback.

```bash
export AGENT_CONTROL_NODE_TOKEN='set outside source control'
export AGENT_CONTROL_NODE_PORT=8788
export AGENT_CONTROL_NODE_HOST='127.0.0.1'
./android/start-node.sh
```

The node generates and persists its own identity when `AGENT_CONTROL_RESOURCE_ID` is omitted. Loopback remains the safe default. To accept discovery through an encrypted private overlay, deliberately bind an appropriate interface/address and retain host firewall/source restrictions. Unsupported or malformed jobs fail closed.

Create the local disable file at `$AGENT_CONTROL_NODE_DISABLE_FILE`, set `AGENT_CONTROL_NODE_ENABLED=0`, or stop the process for unconditional human takeover.

## Native read-only NFC adapter

The native Android app adds `nfc.inspect_tag` without adding a shell, APDU or generic NFC-command surface:

```bash
cd android/native-adapter
./gradlew testDebugUnitTest assembleDebug
```

The APK is written under `app/build/outputs/apk/debug/`. Install it only through an already authorised device workflow. In the foreground app, enter the same high-entropy session token used by the controller, choose an endpoint port and press **Enable typed node**. NFC capabilities are advertised only while NFC is enabled and the activity can safely enter reader mode.

An approved inspection waits visibly for exactly one authorised card. Android discovery metadata is returned with the original ID bytes plus forward and reversed hexadecimal. Reader mode stops after the first tag, timeout, cancellation, activity pause or **Disable / human takeover**.

The source intentionally contains no card write, format, authentication, transceive, protected-sector, cloning, emulation or arbitrary APDU primitive.

## Provisioning and boot recovery

Existing Termux provisioning remains a separate durable Work Queue mission:

```bash
npm run provision:android
npm run provision:android -- --approve-pairing
npm run provision:android -- --approve-reboot-test
```

A missing ADB tool pauses at a scoped privilege gate. Wireless Debugging pairing and physical reboot require explicit human approval. Reboot qualification uses only an already configured keyed transport and does not grant Android execution capability by itself.

`android/install-boot.sh` stores an already supplied Termux node token with mode 0600, restores Termux SSH and can restore the Termux typed node. It neither installs/starts the native NFC app nor exposes a node publicly.
