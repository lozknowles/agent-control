# Agent Control

Agent Control is a terminal mission-control UI and durable control plane for running multiple AI-agent work lanes without tying a task to one model, one process, or one conversation.

The core idea is simple: **the lane owns the work; models are replaceable workers**. Each lane keeps a durable contract and revisioned baton so work can pause, hand off, resume after restart, delegate, clone, or substitute providers without losing authoritative state.

> **2.0 development status:** the control plane, capability resolver, contracts/batons, leases, PTY discovery/ownership model, provider registry, durable Work Queue, batching/preemption/persistence, queue telemetry, continuous Work Executor, cross-platform qualification harness, semantic-colour Work Queue TUI, isolated synthetic workload, single-command bootstrap, allow-listed Pixel Android node recovery, and the durable Pixel self-provisioning entrypoint are implemented. Physical Pixel 8 Pro evidence now covers Wireless Debugging pairing, ADB transport, the GitHub Termux:Boot package, and the hash-verified Termux boot hook. Reboot recovery is not yet qualified. Raw PTY write attachment and general-purpose execution adapters remain intentionally incomplete.

## Quick start

```bash
npm install
npm run check
npm start
```

`npm run check` runs TypeScript validation, bootstrap-script syntax validation, and core/control/UI tests.

To start or resume the durable Pixel provisioning graph from hpubuntu:

```bash
npm run provision:pixel
```

### Read-only Collingham Facebook event observation

With the Pixel unlocked, Facebook already logged in, and exactly one qualified ADB device connected, hpubuntu can perform the fixed read-only journey `Facebook -> Groups -> Your groups`. It inspects only displayed group titles containing the whole word `Collingham`, treats only posts with a visible publication age/date within seven days as eligible, and returns event-like posts as review candidates rather than facts:

```bash
npm run observe:facebook-collingham -- --approve-readonly-navigation
```

The adapter is fixed to `com.facebook.katana`. It can launch the resolved Facebook activity, tap exact semantic navigation labels, scroll, read the Android UI hierarchy, capture screenshots, and run local OCR. It has no text-entry, reaction, comment, post, join, or messaging operation. Ambiguous timestamps fail closed; overlapping screenshots are deduplicated; email addresses and phone numbers are redacted from JSON. Candidate screenshots and JSON remain under ignored `.agent-control/facebook-collingham-events/` state on hpubuntu and require human review before any downstream use.

A physical Pixel 8 Pro pass on 2026-08-22 inspected eight qualifying group titles and produced four reviewed candidates from posts displayed as 22 hours, 12 hours, four days, and six days old. The initial pass took about nine and a half minutes. This proves the post-unlock read-only use case, not unattended cold-boot recovery or automatic event publication.

If the ADB host tool is absent, the command persists `NEEDS PRIVILEGE` until a one-time host setup grants the invoking user non-interactive sudo access to a root-owned helper accepting only `install-adb`; the helper runs only `apt-get install -y --no-install-recommends adb`. Set `AGENT_CONTROL_ALLOW_ADB_INSTALL=1` and resume with `--approve-install`. Agent Control never reads, prompts for, stores, or logs a sudo password. If the helper is unavailable or denied, the item remains safely resumable. Pairing is not reported as actionable until installation completed and a fresh host-tool check observes `adb`. This proves only that the executable exists; `transport.adb` is advertised separately and only while `adb devices -l` identifies one unambiguous connected device (or the configured expected serial). Unrelated `demo:*` queue items remain stored but are excluded from provisioning progress output. When the graph reaches Android Wireless Debugging it persists `HUMAN REVIEW` and exits. Approve pairing on the Pixel, then resume the same queue with:

```bash
npm run provision:pixel -- --approve-pairing
```

The host helper must be installed by an administrator as `/usr/local/libexec/agent-control-privileged`, mode `0755`, owner `root:root`, from `scripts/agent-control-privileged`. The corresponding sudoers rule should grant only the exact helper path, for example:

```text
<operator> ALL=(root) NOPASSWD: /usr/local/libexec/agent-control-privileged
```

Do not grant `NOPASSWD: apt`, a shell, or general sudo. Validate with `sudo -n /usr/local/libexec/agent-control-privileged install-adb`; the command must not accept any other argument.

The final reboot is never implicit. Once the hook is installed and verified, the graph persists `NEEDS REBOOT APPROVAL`. When ready for one deliberate physical reboot, run:

```bash
npm run provision:pixel -- --approve-reboot-test
```

The one-shot approval is stored durably. Before dispatch, Agent Control freshly proves both the selected ADB device and keyed, noninteractive Termux SSH; the reboot operation repeats those proofs immediately before `adb reboot`. If either transport is absent, the item becomes `NEEDS TRANSPORT`, consumes neither the approval nor an execution attempt, and resumes through the same queue when both proofs later succeed. It does not request a pairing endpoint, a manual `adb connect`, Termux startup, or repeated approval.

After a successful reboot command, Agent Control waits up to three minutes for keyed Termux SSH to return. Only that post-reboot proof qualifies unattended recovery. A post-reboot timeout consumes the one-shot approval and is reported separately from a reboot that was never initiated.

The command emits explicit `reboot:preflight-qualified`, `reboot:reboot-initiated`, `reboot:waiting-for-ssh`, and terminal qualification/timeout events. The terminal phase, detail, initiation flag, and observation time are also stored on the durable reboot work item.

The evidence boundaries are explicit:

- **ADB installed** — the host executable responds; no phone transport is implied.
- **Wireless Debugging paired** — Android retains a pairing relationship; no current connection is implied.
- **ADB connected** — a fresh, unambiguous `adb devices -l` row is in `device` state.
- **Tailscale reachable** — the private network reaches the Pixel; no command transport is implied.
- **SSH live** — the existing key completes a bounded, password-disabled Termux SSH proof.
- **Reboot authorised** — one pending approval is persisted; the reboot has not necessarily started.
- **Reboot initiated** — the qualified ADB client accepted the reboot command.
- **Reboot recovery qualified** — keyed SSH returned after that initiated reboot.

When more than one ADB device may be visible, set `AGENT_CONTROL_PIXEL_ADB_SERIAL` (or the standard `ANDROID_SERIAL`) to the expected Pixel serial. Qualification then requires that exact device, and every install, shell, and reboot command is issued with `adb -s` for the same serial. Without an expected serial, multiple device rows fail closed.

For the live distributed qualification matrix:

```bash
npm run qualify
```

Qualification separates provider correctness from latency. A correct but slow ChatGPT Window response is reported as a latency observation rather than falsely marking the provider unavailable.

State is persisted beneath `.agent-control/` by default. Runtime state, qualification output, credentials and node modules are excluded from source control.

## Android self-provisioning mission

The Work Queue now contains an explicit Pixel provisioning mission. It detects the ADB host tool, permits only the allow-listed hpubuntu package operation `apt install adb`, then pauses in a human-review gate for Android Wireless Debugging pairing. After that approval, later work remains capability-gated: fresh ADB device transport and keyed SSH transport are observed independently from tool installation, historical pairing, and Tailscale reachability. Those live capabilities gate artifact installation, hook verification, and reboot dispatch.

This is implemented and covered by automated tests. The live-transport reboot gate and durable approval migration have not themselves requalified a physical reboot in this release; no capability is granted by queue completion or historical evidence alone.

## Single-command control-plane bootstrap

The current operational target is that normal startup should not require a sequence of manual curls, SSH forwards and service starts.

```bash
npm run status
npm run up
npm run down
```

`npm run up` is health-first and idempotent:

- discovers the existing hpubuntu systemd user services whose unit definitions actually reference ports `8080` and `8081`, and starts only those when absent;
- reuses healthy ChatGPT Window bridge/adapter listeners on `8766` and `8767`;
- distinguishes Pixel transport states instead of collapsing them into one recovery failure;
- when Pixel SSH is available, reuses or recovers the allow-listed node on `8788` and creates the hpubuntu `18788 -> Pixel:8788` forward;
- records only processes Agent Control itself starts so `npm run down` cannot indiscriminately stop unrelated services;
- reports an explicit `RESULT READY` or `RESULT DEGRADED` summary.

The bootstrap lifecycle currently exposes the important Pixel boundary:

```text
OFFLINE
SSH-OFFLINE       Tailscale reachable; Termux sshd :8022 unavailable
NODE-DEGRADED     SSH ready; Pixel node :8788 unavailable
NODE-READY        Pixel node ready; hpubuntu forward unavailable
FORWARD-READY     hpubuntu :18788 responds
CAPABILITY-READY  authenticated resource capability validated
```

A 2026-08-21 bootstrap test successfully discovered and started the two llama systemd services and reused both ChatGPT Window services, while correctly exposing the remaining Pixel condition as Tailscale-reachable but SSH-offline. Pixel transport persistence is therefore a one-time device prerequisite, not something hpubuntu can repair when no remote command transport exists.

The repository now provides:

```text
android/install-boot.sh
android/termux-boot-agent-control.sh
```

for a one-time Termux:Boot setup. See `android/README.md`. The boot hook restores `sshd`; if a Pixel-local node token is deliberately present it can also restore the Agent Control node. Otherwise hpubuntu recovers the node after SSH returns using the existing credential.

## Control-room TUI

The Blessed TUI currently presents:

- independently scrollable work lanes with contracts, numeric context utilisation and baton health;
- semantic status colours with restrained lane identity accents;
- terminal-safe Agent Activity Log output;
- Lane Overview and active baton;
- **Work Queue** ready/review/retry counts, workload classes, oldest age, throughput/drain estimate, semantic workload meters and batch groups;
- resource/provider status including Pixel lifecycle and capacity-style utilisation meters;
- live Linux PTY discovery with explicit assigned/total semantics;
- provider health and deterministic ChatGPT Window proof;
- queue detail showing work state, batch identity, resource claims and checkpoints;
- an isolated `demo:*` workload for exercising queue states without mutating real work.

Current footer keys are authoritative. Important 2.0 controls include:

| Key | Action |
| --- | --- |
| `Tab` | Select next lane |
| `I` / `Enter` | Command input |
| `T` | Inspect live PTYs |
| `G` | Probe providers |
| `Y` | Prove ChatGPT Window Responses roundtrip |
| `W` | Work Queue detail |
| `D` | Inject the idempotent isolated demo workload |
| `X` | Probe Pixel lifecycle |
| `Z` | Ensure/recover Pixel node using the allow-listed recovery recipe |
| `A` | Toggle Pixel recovery MANUAL/AUTO mode |
| `R` | Request capability/provider substitution |
| `P` | Pause/resume checkpoint |
| `Q` / `Ctrl-C` | Persist and quit |

## Durable work and execution

Agent Control separates interactive lane work from repetitive/background work. The Work Queue supports:

- `interactive`, `priority`, `background` and `batch` classes;
- dependency blocking;
- deadlines and earliest-start boundaries;
- capability-based resource selection;
- resource load/data-locality scoring;
- resource budgets and maintenance windows;
- quiet-period scheduling for background/batch work;
- homogeneous batch leases;
- item-by-item batch commit;
- checkpoint/yield and restart persistence;
- interactive preemption of preemptible background work;
- retry limits;
- low-confidence routing to human review.

The continuous Work Executor now adds:

- dependency-driven graph progression after each completed item;
- compact task-specific context rather than whole-workspace conversation replay;
- bounded retry handling;
- semantic outcome fingerprints and loop escalation to human review;
- persisted outcome history so loop detection survives queue-store restart;
- real homogeneous batch execution item by item rather than stopping at lease formation.

The scheduler selects work and resources before mutating queue state, avoiding double-claim/accounting behavior during batch formation.

The isolated demo workload intentionally exercises interactive, priority, background, batch, dependency-blocked, checkpointed and human-review states. Re-injection is idempotent and all demo work is namespaced under `demo:` so it can remain separate from real work.

## Queue observability and latency telemetry

The control plane emits traceable queue snapshots and coordinator decisions. Metrics include backlog by class/status, ready count, oldest queued age, review/retry counts, batch sizes, resource utilisation, observed throughput and estimated drain time.

Queue magnitude meters retain their workload-class colour; red is reserved for genuine failure/danger state rather than merely indicating a large batch. Capacity/resource utilisation meters may still graduate green to yellow to red as utilisation increases.

Provider and transport telemetry records latency distributions rather than treating latency as a binary health result. This lets routing distinguish **healthy-but-slow** from unavailable.

## Pixel Android resource and self-recovery

The Pixel resource advertises proven capabilities rather than generic machine authority:

```text
platform.android
device.physical
harness.termux
harness.codex
observe.android.logcat
```

Recovery is deliberately narrow. Agent Control may execute only the known Pixel node-start recipe over the authenticated SSH path. It does **not** expose arbitrary shell execution, regenerate credentials, or overwrite a healthy SSH forward.

Recovery is health-authoritative and idempotent: requesting recovery while healthy is a no-op; if the node is absent it is started detached from the SSH session; Pixel-local and forwarded health are then independently verified. A surviving forward is reused.

On 2026-08-19 this path was qualified on a physical Pixel 8 Pro by deliberately killing the healthy node, observing `NODE-DEGRADED`, recovering through the TUI, obtaining a new node PID, reusing the existing SSH forward, restoring `/health`, and restoring authenticated `/v2/resource` capability advertisement. See `docs/evidence/pixel-self-recovery-qualified-20260819.md`.

The compact/semantic-colour TUI was subsequently viewed from the physical Pixel terminal as an additional smoke test. Small mobile terminals are not the primary desktop control-room target, but this establishes a useful future responsive-TUI test case.

## Cross-platform qualification

The current live qualification harness can prove:

- local TypeScript/tests;
- Codex present on hpubuntu;
- Pixel node health;
- Pixel capability resolution and an allowed Android observation job;
- ChatGPT Window advertised health;
- real ChatGPT Window Responses functional roundtrip;
- ChatGPT Window latency classification;
- Sentinel remote resource reachability.

The current automated core/control/UI suite is **133/133 passing** at the live-transport reboot gate and read-only Facebook observation checkpoint. That includes failed-prerequisite blocking, mission-scoped dispatch that preserves unrelated queued work, separate ADB-tool/device/SSH/Tailscale evidence, durable one-shot reboot authority, non-consuming transport waits, persisted failure migration, final reboot preflight, post-reboot timeout classification, fixed-package read-only navigation, timestamp filtering, candidate deduplication, contact redaction, and approval resumption. Bootstrap scripts are syntax-checked by the canonical `npm run check` gate as well.

## Core architecture

```text
LANE -> CONTRACT -> BATON -> CAPABILITY REQUEST
                              |
                    +---------+----------+
                    |                    |
                Work Queue          direct lane work
                    |
              Coordinator
                    |
               Executor
                    |
          Capability Resolver
                    |
       Resource / Provider selection
          |        |        |        |
      hpubuntu   Pixel   Sentinel   ChatGPT Window
```

A terminal session is not the task, a model is not the task, and a chat transcript is not the task. Durable contracts, batons, queue checkpoints and evidence provide continuity while workers and resources change.

## PTYs and authority

Linux PTYs are discovered from `/proc` and only associated with a lane when the cwd genuinely belongs to that lane. The registry models observe/write/own intent, exclusive logical ownership, transfer and unconditional human takeover. Discovery/ownership is deliberately separate from raw keystroke injection; the current prototype must not be treated as a production shell multiplexer.

## Providers and ChatGPT Window

Provider identity is separate from model/profile/recipe identity. Built-in proof cases include local llama.cpp-style resources and the opt-in ChatGPT Window Responses provider. Tool execution remains on the Codex/control side; the browser bridge must not bypass Codex approval/sandbox policy.

ChatGPT Window qualification uses a fast advertised-health check plus a real functional Responses roundtrip. The functional timeout is intentionally longer than the latency warning threshold so a 10–20 second correct response can be classified `SLOW` without being declared dead.

## Safety boundaries

Agent Control remains conservative around authority:

- human takeover wins;
- unrelated PTYs stay unassigned;
- one PTY has at most one logical owner;
- provider failure does not silently mutate recipes;
- high-risk routing remains approval-gated;
- Pixel recovery is allow-listed and fails closed;
- existing credentials are reused, never generated by recovery;
- bootstrap leaves occupied-but-unhealthy ports alone rather than killing unknown listeners;
- `npm run down` stops only processes recorded as Agent-Control-owned;
- runtime/qualification evidence containing secrets must not be committed;
- benchmark promotion must be reproducible and reversible.

## Development and validation

```bash
npm run typecheck
npm run check:bootstrap
npm test
npm run check
npm run qualify
npm run status
npm run up
npm run down
```

For TUI changes, require both automated checks and a real terminal visual/control smoke test. For physical recovery, preserve evidence without credentials. For bootstrap testing, do not manually repair a failed component before capturing `npm run up` output: the controller should expose the missing lifecycle boundary itself.

## Further documentation

See `ARCHITECTURE.md`, `docs/architecture-v2.md`, `docs/ui-target.md`, `TODO.md`, `TEST-TONIGHT.md`, `android/README.md`, and `docs/evidence/`.

## Design principle

Agent Control is not trying to keep one AI alive forever. It is trying to keep **the work** alive.

Workers should be able to continue, recruit help, hand over, substitute, yield resources, recover at known boundaries, or complete the contract while durable state preserves continuity.
