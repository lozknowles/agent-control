# Optional Glances monitoring

This integration deploys Glances 4.5.6 from PyPI into an owned virtual environment. It is opt-in: importing the ordinary control plane does not register monitoring jobs, discover devices, install packages, or route workloads. `scripts/glances-run.ts` uses the actual `JobRuntime`, named approval gate, capability placement, semantic locks, verification, run ledger, and checksummed artifacts. Remote execution reuses `executeSsh` and `sshResourceArgs`; local execution uses that bounded process adapter without a shell. No model/provider is required.

## Operator inventory and execution

Supply an external JSON array of explicitly authorized nodes. Each record contains `id`, a Tailscale IPv4 `address`, `platform` (`linux`, `windows`, or experimental `android`), `python` executable path, `allowed` client IP list, and the existing Agent Control `transport` structure. SSH identities remain paths to existing keys; no credential material is accepted in job parameters. `transport.type=local` is supported for the controller. A Linux central node additionally has `servers: [{id,address}]`. Discovery is disabled.

```sh
node --import tsx scripts/glances-run.ts INVENTORY STATE_ROOT NODE inspect
node --import tsx scripts/glances-run.ts INVENTORY STATE_ROOT NODE install --approve-change
node --import tsx scripts/glances-run.ts INVENTORY STATE_ROOT CENTRAL central --approve-change
node --import tsx scripts/glances-run.ts INVENTORY STATE_ROOT NODE qualify
node --import tsx scripts/glances-run.ts INVENTORY STATE_ROOT NODE restart --approve-change
```

The approval flag records an already authorized operator decision under `monitoring.glances.change`. Without it, a mutation waits for approval and performs no remote work. Use one CLI invocation at a time per state root; the standalone runner is not a concurrent control-plane daemon. Keep operator inventory and state outside version control. Job success records completion of the requested operation; installation success alone is not physical qualification.

## Access and authentication

Collectors listen only on their configured Tailscale IPv4 address, port 61208. The central native Glances web browser listens on its Tailscale address, port 61210, at `/browser`. It polls an explicit REST server list; selecting a row navigates the viewing device directly to that collector. Both the central host and viewing device must therefore be allowed collector clients.

Tailscale supplies encrypted peer authentication. An ASGI peer gate authorizes only the explicitly listed IPs and rejects other socket peers with HTTP 403. It ignores forwarding headers and forces Uvicorn proxy-header handling off. Glances `webui_allowed_hosts` rejects other Host headers with HTTP 400; CORS is limited to the local collector origin. Basic authentication is not enabled in this design. There is no public listener, Funnel, port forwarding, or new firewall rule. Changing the allowlist requires editing the operator inventory and repeating installation on affected nodes. Do not add arbitrary discovered tailnet devices.

The wrapper uses the pinned Glances/FastAPI startup interface; requalify the peer gate whenever upgrading. Never start an alternate unwrapped Glances web service on a non-loopback address. Authorized clients can inspect process details; recorded evidence must redact usernames and arguments before rendering.

## Lifecycle and paths

Linux installation: `~/.local/share/agent-control-glances`. Services: `~/.config/systemd/user/agent-control-glances.service` and, on the central host, `agent-control-glances-browser.service`. They run as the existing unprivileged operator, with `NoNewPrivileges`, `UMask=0077`, and restart-on-failure. `loginctl enable-linger` is attempted as a bounded normal self-service request; if denied, the service is limited to the user-session lifecycle until an administrator enables lingering. No root grant is created.

Windows installation: `%LOCALAPPDATA%\AgentControl\Glances`. The native `AgentControl-Glances` scheduled task runs with a limited interactive token at operator login, allows battery operation, and has no execution-time limit. It does **not** provide startup before login. Its virtual environment uses the inventoried native Python interpreter; preserve that base interpreter or rebuild the environment before removing it. No WSL is used.

Installation requires an ownership marker and refuses an unrelated existing directory or Linux unit. Repeated installation reuses the venv, replaces only owned configuration, and restarts the same collector. There is one Windows task and one Linux collector unit per node. PyPI provenance is retained in `pip-install-report*.json`, and installed versions in `requirements-installed.txt`.

## Recovery, upgrade, rollback

Use the governed `start`, `stop`, and `restart` operations for collector lifecycle. For direct emergency administration, use `systemctl --user restart agent-control-glances` on Linux or `Start-ScheduledTask -TaskName AgentControl-Glances` on Windows. The central browser can be restarted with `systemctl --user restart agent-control-glances-browser`.

Before an upgrade, retain configuration, service definitions, requirements, and installation reports. Review current upstream release/security guidance, update the explicit package pin in `scripts/glances/node.py`, and rerun installation and physical qualification. A dependency freeze is evidence of the installation, not a universal cross-platform lockfile. Rebuild in a new reviewed venv if the base Python changes. Roll back by restoring the saved venv/configuration and restarting only these monitoring units.

To uninstall on Linux, stop and disable the named monitoring units, remove only their unit files, reload the user daemon, and remove the owned installation directory after checking its absolute path and marker. Do not disable lingering if other user services use it. On Windows, stop and unregister only `AgentControl-Glances`, then remove the owned directory after verifying the path; preserve the base Python and other scheduled tasks. No network/firewall change needs reversal.

Terminal central view: run the venv's `python -m glances --browser --disable-autodiscover -C PATH_TO_BROWSER_CONF` from an authorized client with that explicit server list. The rollout physically verifies the web view; terminal invocation is documented from upstream support.

## Android experimental boundary

The first upstream psutil install can reject Android. The installer can use Termux's maintained `python-psutil` and `python-cryptography` packages and expose those packages only to the new monitoring venv. It does not upgrade the existing interpreter or edit Codex, model, credential, boot, or service configuration. Package building is bounded. No Android persistent service is registered by this integration. `/proc` access and lifecycle must be qualified separately; a working dependency import is not a working collector.

## Verification

Run `npm run check` and `python3 scripts/glances/test_peer_gate.py`. Focused tests exercise mutation approval, input/transport rejection, remote failure, invalid reports, and socket-peer authorization despite forged forwarding headers. Physical qualification samples real APIs twice, records service state, available process/GPU data, and Host/peer rejection. Separately test a stopped collector becoming OFFLINE, recovery to ONLINE, and restart. Capture the actual rendered overview and node pages with changing values. Do not confuse simulated adapter tests with these observations.

## Upstream references reviewed

- https://github.com/nicolargo/glances/tree/v4.5.6
- https://glances.readthedocs.io/en/latest/install.html
- https://glances.readthedocs.io/en/latest/quickstart.html
- https://glances.readthedocs.io/en/latest/config.html
- https://glances.readthedocs.io/en/latest/aoa/gpu.html

The native central web mode is `--browser -w`; registration uses `[serverlist]` with REST ports. Intel GPU support is documented for Linux, not Windows. Keep actual per-node capability observations in the deployment evidence rather than promising identical metrics.
