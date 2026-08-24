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

The node binds to loopback by default, advertises observed capabilities and allows only `android.observe.logs`. Unsupported jobs return 403.

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
