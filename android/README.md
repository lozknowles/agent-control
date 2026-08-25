# Agent Control 2.0 — Pixel Alpha

This is the physical-Android resource for the capability-agnostic control plane. It remains observation-first and capability-scoped: Agent Control advertises only mechanisms that have been demonstrated on the device.

## Goal

Produce one `agent-control.resource/v2` advertisement from the Pixel using stable logical identity `pixel`. IP addresses are not persisted as identity.

## Install/update in Termux

```sh
pkg update
pkg install -y git
cd ~
git clone -b release/2.0.0-pixel-alpha https://github.com/lozknowles/agent-control.git agent-control-2
cd agent-control-2
chmod +x android/*.sh
./android/pixel-agent.sh | tee pixel-resource.json
```

If the repository already exists:

```sh
cd ~/agent-control-2
git fetch origin
git switch release/2.0.0-pixel-alpha
git pull --ff-only
chmod +x android/*.sh
./android/pixel-agent.sh | tee pixel-resource.json
```

## Persistent transport after Pixel reboot

The hpubuntu single-command bootstrap can recover the Pixel node only after Termux SSH is listening. A physical test on 2026-08-21 demonstrated the useful intermediate state `Tailscale reachable / SSH :8022 offline`, so transport persistence is now explicit rather than being treated as a generic node failure.

These states are deliberately independent. An installed `adb` executable is only a host tool. A saved Wireless Debugging pairing is historical authority, not a current connection. `transport.adb` requires a fresh, unambiguous `adb devices -l` result in `device` state. `transport.ssh` requires a fresh password-disabled proof with the existing Agent Control key. Tailscale reachability proves only network reachability and cannot substitute for either command transport.

One-time Pixel setup:

1. Install **Termux:Boot** from the same trusted source as Termux and open Termux:Boot once so Android enables its boot receiver.
2. In Termux update this repository and run:

```sh
cd ~/agent-control-2
chmod +x android/*.sh
./android/install-boot.sh
```

`install-boot.sh`:

- installs Termux `openssh` if `sshd` is missing;
- installs `android/termux-boot-agent-control.sh` as `~/.termux/boot/agent-control.sh`;
- starts `sshd` immediately if it is not already running;
- never invents or regenerates the Agent Control node token;
- optionally preserves an existing Pixel-local node token when one already exists or is explicitly provided in `AGENT_CONTROL_NODE_TOKEN`.

The boot hook always attempts to restore `sshd`. If a Pixel-local node token is available it can also restore the Agent Control node; otherwise hpubuntu will recover the node through the now-persistent SSH transport using its existing credential.

## Reboot qualification

The final provisioning item uses a durable one-shot approval. Approval and execution are separate states:

1. `NEEDS REBOOT APPROVAL` means no reboot authority is stored.
2. `NEEDS TRANSPORT` means approval is stored but fresh ADB and keyed SSH proofs are not both available. This state does not consume an execution attempt or repeat the approval request.
3. `reboot initiated` means the freshly qualified ADB client accepted `adb reboot`.
4. `waiting for SSH after reboot` lasts for at most three minutes.
5. `reboot recovery qualified` requires keyed Termux SSH to return after that initiated reboot.

The reboot operation performs its own final ADB and SSH preflight to close the gap between scheduling and execution. A failure such as `no devices/emulators found` means the reboot did not start; Agent Control retains the approval and returns to `NEEDS TRANSPORT`. A genuine post-reboot SSH timeout is reported separately and consumes the one-shot approval before any further reboot can occur.

When both ADB and Termux SSH are unavailable, Tailscale alone provides no host-to-phone execution mechanism. Agent Control waits durably and does not ask for a pairing endpoint, a manual `adb connect`, opening Termux, or manually starting `sshd`. A future Pixel-local watchdog would be a separate, currently unimplemented capability.

After installing the hook, normal orchestration returns to hpubuntu:

```sh
cd /fast/repos/agent-control
npm run up
```

The intended lifecycle is:

```text
OFFLINE
  -> SSH-OFFLINE        (Tailscale reachable, Termux sshd unavailable)
  -> NODE-DEGRADED      (SSH ready, node :8788 unavailable)
  -> NODE-READY         (node ready, local forward absent)
  -> FORWARD-READY      (hpubuntu :18788 healthy)
  -> CAPABILITY-READY
```

## Expected baseline capabilities

The probe always advertises:

- `platform.android`
- `device.physical`

It conditionally advertises only capabilities it can prove locally, including:

- `harness.termux`
- `harness.codex`
- `transport.adb`
- `transport.tailscale`
- `observe.android.logcat`
- `privilege.shizuku`

Absence is not failure. Discovery remains evidence-driven.

## Shizuku

The alpha does not request or grant privileges. It only reports Shizuku when a local indicator is available. Shizuku-backed operations will be added as individually scoped capabilities after the mechanism is verified on the Pixel. Do not advertise generic `root` or `privileged` capability merely because Shizuku is installed.

## Safety boundary

2.0 separates observation from execution. Install, package mutation, settings mutation and other write operations require explicit capabilities and policy gates. Pixel recovery is narrowly scoped to the known node-start recipe and SSH forward. Boot persistence restores transport; it does not create generic remote-control authority.

## Return evidence

For qualification capture:

```sh
./android/pixel-agent.sh | tee pixel-resource.json
command -v codex || true
command -v tailscale || true
command -v sshd || true
command -v adb || true
command -v logcat || true
command -v rish || true
```

For boot diagnostics:

```sh
tail -50 ~/.agent-control-boot.log 2>/dev/null || true
pgrep -af sshd || true
pgrep -af 'node android/node-server.mjs' || true
```

The resulting evidence is used to qualify capabilities; installing software alone never creates a capability advertisement.
