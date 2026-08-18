# Agent Control 2.0 — Pixel Alpha

This is the first physical-Android capability probe for the capability-agnostic control plane. It is deliberately **observation-first**: it discovers what the Pixel can actually provide and does not assume ADB, Shizuku, Codex or Tailscale are present.

## Goal

Produce one `agent-control.resource/v2` advertisement from the Pixel using stable logical identity `pixel`. IP addresses are not persisted as identity.

## Install in Termux

```sh
pkg update
pkg install -y git
cd ~
git clone -b release/2.0.0-pixel-alpha https://github.com/lozknowles/agent-control.git agent-control-2
cd agent-control-2
chmod +x android/pixel-agent.sh
./android/pixel-agent.sh | tee pixel-resource.json
```

If the repository already exists:

```sh
cd ~/agent-control-2
git fetch origin
git switch release/2.0.0-pixel-alpha
git pull --ff-only
chmod +x android/pixel-agent.sh
./android/pixel-agent.sh | tee pixel-resource.json
```

## Expected baseline

The probe should always advertise:

- `platform.android`
- `device.physical`

It conditionally advertises only capabilities it can prove locally, including:

- `harness.termux`
- `harness.codex`
- `transport.adb`
- `transport.tailscale`
- `observe.android.logcat`
- `privilege.shizuku`

Absence is not failure. The first test is discovery.

## Shizuku

The alpha does not request or grant privileges. It only reports Shizuku when a local indicator is available. Shizuku-backed operations will be added as individually scoped capabilities after the mechanism is verified on the Pixel. Do not advertise generic `root` or `privileged` capability merely because Shizuku is installed.

## Safety boundary

2.0 separates observation from execution. The Pixel alpha should first prove read-only/diagnostic capabilities. Install, package mutation, settings mutation and other write operations require separate explicit capabilities and policy gates.

## Return evidence

For the first run capture:

```sh
./android/pixel-agent.sh | tee pixel-resource.json
command -v codex || true
command -v tailscale || true
command -v adb || true
command -v logcat || true
command -v rish || true
```

The resulting JSON is the evidence Agent Control will use to build the next real resource adapter.
