# Glances rollout — physical qualification, 5 September 2026

Dashboard: **http://100.69.27.39:61210/browser** (sentinel).

Use Tailscale from an allowlisted device. The five explicitly named rollout devices are allowed clients. The overview polls from sentinel; clicking a machine opens that collector directly on port 61208. Other viewing devices require an explicit allowlist update. This deployment uses Tailscale peer authentication and application peer authorization, without a separate Glances password.

| Node | Result | Installation and observed metrics | Startup / limitation |
|---|---|---|---|
| hpubuntu | PASS | Ubuntu 24.04.4, Python 3.12.3, Glances 4.5.6; CPU, memory, filesystems, disk I/O, network, processes; Quadro P5000 utilization/memory/temperature and Intel HD 630 frequency-derived metric | Unprivileged systemd user collector enabled; Linger=yes |
| sentinel | PASS | Ubuntu 26.04, Python 3.14.4, Glances 4.5.6; CPU, memory, filesystems, disk I/O, network, processes; Quadro P3000 utilization/memory/temperature | Collector and central browser enabled; Linger=yes. About 21 days uptime and low initial load justified central placement |
| macomarchy | PASS | Omarchy 4.0.2 / Arch, Python 3.14.7, Glances 4.5.6; CPU, memory, filesystems, disk I/O, network, processes; Intel frequency-derived metric, no GPU memory/temperature | Unprivileged systemd user collector enabled; Linger=yes |
| MSI | PARTIAL | Windows 11 Pro 10.0.26200, native Python 3.12.14 venv, Glances 4.5.6; CPU, memory, filesystems, disk I/O, network and processes. Intel Arc plugin returns no GPU data | Limited scheduled task running and restart/recovery passed. Starts at operator login; unattended startup before login remains unconfigured |
| Pixel | BLOCKED | Android 17 / Termux Python 3.14.6. Patched psutil reads memory, but CPU `/proc/stat`, network `/proc/net/dev` and disk `/sys/block` all return Permission denied | Upstream psutil initially rejected Android; retry with Termux packages hit the 420-second web dependency build limit. No Glances service registered; background lifecycle unqualified |

PASS applies to the supported desktop/server scope and configured startup settings, not to identical GPU coverage. No machine was rebooted. MSI's native base Python is the Codex bundled runtime at `C:\Users\Loz\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`; retain it or rebuild the venv before replacing that runtime.

## Physical evidence

All four installed collectors were observed ONLINE in the actual rendered native central browser. The recording visits all four and scrolls their disk/network sections. CPU samples changed: hpubuntu 15.9→16.0%, sentinel 1.0→1.1%, macomarchy 3.2→3.3%, MSI 4.7→8.0%. Memory, disk and network samples are retained in the JSON evidence. GPU observations were read from the real plugins; no inference load was added to manufacture GPU utilization.

Each collector was stopped through a governed Run, observed OFFLINE in the central API, started and observed ONLINE, then separately restarted and resampled. The central service remained available while sentinel's collector was stopped. Install repetition reused the same paths and service/task names.

Invalid Host headers returned HTTP 400 on all four. An unapproved local source returned HTTP 403 on the three Linux nodes even with a forged forwarding header. Windows refused that source route at the OS layer (`WinError 10051`), so its peer rejection is covered by the shared gate test rather than falsely claimed as that physical 403 test. MSI independently accessed every collector over Tailscale. The endpoints bind only the assigned Tailscale IPv4 addresses. No firewall, router, public proxy or Funnel configuration was changed.

The final recording contains real readings with process usernames and command arguments redacted in browser responses before rendering. Browser page-error count: zero. Raw first-pass captures remain private in the remote evidence directory and are not included in the delivered bundle.

## Agent Control execution and provenance

Source baseline: tagged Agent Control 3.8.2, peeled commit `b51623d`, isolated branch `feature/glances-monitoring-20260905` at `/fast/work/agent-control-glances-20260905`. Original checkout `/fast/repos/agent-control` remained on `feature/3.7-token-aware-baton-routing` at `e7fe5c010bbea75e41f8ec875aab08caaa738104`.

The existing managed-node adapter had no typed isolated-venv/Windows monitoring installation operation. The optional integration adds fixed Glances operations with the real JobRuntime and existing bounded SSH adapter. All collector installs, repeats, service stops/starts/restarts, central setup and final sampling were executed inside those governed runs, with the named approval recorded from the user's authorization. hpubuntu used the adapter's local process path; other nodes used SSH.

Bootstrap actions outside Agent Control: source/worktree inspection and file transfer, read-only host/Tailscale/privilege checks, dependency setup for the isolated source checkout, browser recording, MSI client-access verification, and evidence collection. These are not represented as Agent Control remote installation runs. This is a standalone invocation of the real runtime with retained state; it was not inserted into an existing running dashboard process.

| Final sample | Agent Control run ID |
|---|---|
| hpubuntu | `run-02fc1543-ceab-469b-a736-35933272ae82` |
| sentinel | `run-89676b76-100b-43ad-8683-a27a41570140` |
| macomarchy | `run-baf1de1d-5416-42a9-a3c8-95a174e9c9fc` |
| MSI | `run-f4db884d-26f5-4a9d-a1a5-155e8384520a` |

All install, retry, failure, central, stop/start and restart identifiers are in the delivered JSON reports and run ledgers. Remote authoritative state: `.agent-control/glances/jobs` and `.agent-control/glances-recovery/jobs` inside the isolated worktree. Artifact metadata retains SHA-256 checksums. Remote evidence: `.agent-control/glances-evidence`. Installation provenance and dependency freezes are retained in each node's owned installation directory.

## Automated checks and outstanding actions

`npm run check`: 721 tests passed, with typecheck, bootstrap, dashboard, neutrality and status checks. Two Python tests passed for peer authorization/forwarding-header rejection and timed-out process-tree cleanup. These automated tests are separate from the physical observations above.

For MSI startup before login, an administrator must provision a suitable non-interactive service/task principal. The current limited login task remains operational. Intel Arc monitoring is unavailable in the tested Glances plugin; adding another GPU telemetry tool is outside this rollout.

Pixel cannot satisfy full system monitoring under the current unrooted Android permissions. No further phone action is required for the four-node dashboard. If revisited, use a supported Termux dependency set and explicitly qualify the limited metrics and background lifecycle; do not root or weaken Android protections. The new optional venv and Termux packages are recorded for rollback; Codex configuration, credentials, models and existing services were not edited.

See `operations.md` in the delivered bundle, or `docs/glances-monitoring.md` in the branch, for installation, recovery, upgrades and removal. No Agent Control merge, tag or release was performed.
