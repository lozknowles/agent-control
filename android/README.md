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

The node binds to loopback by default, advertises observed capabilities and allows only `android.observe.logs`, `android.adb.status`, and `android.adb.ensure-connected`. Unsupported jobs return 403. It advertises `android.adb.local` and `transport.adb` only after a usable local ADB device is present in `adb devices`.

## Termux-local ADB

`android/adb-local.mjs` uses the installed ADB client's mDNS support to distinguish Android Wireless Debugging pairing and connection endpoints. It never assumes a fixed debugging port.

```bash
node android/adb-local.mjs status --json
node android/adb-local.mjs discover --json
node android/adb-local.mjs ensure-connected --json
```

`ensure-connected` is idempotent. It returns immediately for an existing usable device; otherwise it rediscovers the current `_adb-tls-connect._tcp` endpoint, attempts a bounded connection, and verifies with `adb devices`. It never initiates pairing.

Pairing is a separate human ceremony. First reach the existing `android.provision.pairing-approval` review gate and explicitly approve it. Then display Android's six-digit Wireless Debugging code and enter it without placing it in command arguments or shell history:

```bash
read -r -s -p 'Android pairing code: ' pairing_code; printf '\n'
printf '%s\n' "$pairing_code" | node android/adb-local.mjs pair --json
unset pairing_code
```

The helper accepts exactly six digits through stdin, does not persist the code, redacts six-digit values from command output/errors, pairs against the currently discovered `_adb-tls-pairing._tcp` endpoint, then discovers the normal connection endpoint and verifies it. Approval alone is not pairing success: a subsequent governed `android.adb.status` result and `adb devices` evidence are required before the local ADB capability appears.

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

Run `android/install-boot.sh` from the Android checkout. It stores an already supplied node token with mode 0600, restores Termux SSH, makes one bounded reconnection attempt for an existing Wireless Debugging pairing, and optionally restores the loopback node. Reconnection failure does not block SSH or node startup. The hook never initiates pairing, creates credentials, or exposes the node publicly.
