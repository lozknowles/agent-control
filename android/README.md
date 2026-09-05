# Generic Android resource

The Android integration supports Termux-capable physical devices without assuming a manufacturer, model, hostname or network overlay.

Configure an Android resource in `.agent-control/config.json` with:

- a stable resource ID;
- `platform: "android"`;
- an explicit transport and endpoint;
- node health URLs and remote repository directory;
- the name of the environment variable containing the existing node credential.

The example uses common Termux/node ports only as overrideable examples.

## Node

```bash
export AGENT_CONTROL_RESOURCE_ID=android-1
export AGENT_CONTROL_NODE_TOKEN='set outside source control'
export AGENT_CONTROL_NODE_PORT=8788
./android/start-node.sh
```

The node binds to loopback by default, advertises observed capabilities and allows only `android.observe.logs`, `android.adb.status` and `android.adb.ensure-connected`. Unsupported jobs return 403. ADB status/reconnect do not grant arbitrary shell execution.

## Local wireless ADB

`android/adb-local.mjs` governs the same-device Termux wireless-ADB lifecycle without hard-coded addresses or device names. It distinguishes:

- ADB installed and mDNS command support;
- discovered `_adb-tls-pairing._tcp` and `_adb-tls-connect._tcp` endpoints;
- successful pairing from a currently usable connection;
- stable DNS-SD device identity from a merely reachable endpoint;
- `adb connect` output from independent `adb get-state` plus `adb devices` verification.

Read-only checks and bounded reconnect are:

```bash
node android/adb-local.mjs status --json
node android/adb-local.mjs discover --json
node android/adb-local.mjs ensure-connected --json
```

First pairing requires Android System Settings → Wireless debugging → **Pair device with pairing code** to remain open. The six-digit PIN must be entered locally through hidden stdin. It must never be placed in arguments, chat, configuration, logs or evidence. One shell-safe interactive example is:

```bash
read -r -s -p 'Pairing code: ' ADB_PAIRING_CODE; printf '\n'
printf '%s\n' "$ADB_PAIRING_CODE" | node android/adb-local.mjs pair --json
unset ADB_PAIRING_CODE
```

Pair/reconnect attempts are serialized in an owner-only state record. A stale owner can be recovered by process identity; concurrent attempts receive the visible active phase instead of starting a second `adb pair` or `adb connect`. Discovery and every child command are bounded and cancellable. The helper redacts six-digit values from process output and persists only non-secret attempt/device state.

The node runs one bounded `ensure-connected` on startup and cancels it on shutdown. It never pairs at boot. Base status/reconnect capabilities remain available for diagnosis, but `android.adb.local` and `transport.adb` are published only while a previously paired device is connected and independently verified. Native `adb mdns` support and local DNS-SD visibility remain platform/package constraints; failure leaves capability unavailable rather than accepting a manually guessed endpoint.

## Provisioning

```bash
npm run provision:android
```

Provisioning is a durable Work Queue mission. A missing ADB tool pauses at a narrowly scoped privilege gate. Wireless debugging pairing requires explicit human approval. Termux:Boot is downloaded from its official GitHub release, hashed, installed and observed. The boot hook is hash-verified. Physical reboot is never implicit:

```bash
npm run provision:android -- --approve-pairing
npm run provision:android -- --approve-reboot-test
```

Reboot qualification uses only the configured keyed SSH transport. A failure remains durable and resumable; it does not grant recovery capability.

## Boot hook

Run `android/install-boot.sh` from the Android checkout. It stores an already supplied node token with mode 0600, restores Termux SSH and optionally restores the loopback node. It does not create credentials or expose the node publicly.
