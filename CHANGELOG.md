# Changelog

## Unreleased

- Fixed the ADB helper postcondition: package installation now has a dedicated five-minute timeout and a fresh observed `adb` takes precedence over a helper process error, preventing successful installs from being mislabeled as privilege denial.
- Migrated persisted pre-helper `NEEDS PRIVILEGE` failures into the resumable install review gate and fixed dependency reconciliation so blocked provisioning nodes can unlock after a recovered prerequisite completes.
- Changed Pixel ADB privilege handling from terminal failure to a durable resumable human-review gate. The approved path now invokes only a fixed root-owned helper through non-interactive sudo; the helper accepts only `install-adb` and runs only the allow-listed `apt-get install adb`. No password is captured or persisted, and pairing remains a separate review gate after fresh ADB observation.
- Added the canonical `npm run provision:pixel` durable Work Queue/Work Executor entrypoint, idempotent graph restoration, explicit `adb` detection, fail-closed allow-listed `apt install adb` authority, Android Wireless Debugging human approval, approval resumption, capability-gated ADB qualification, GitHub Termux:Boot artifact/hash verification, package and boot-hook verification, and modeled unattended-recovery qualification.
- Added explicit human-review approval resumption and bootstrap reconciliation for stale/dead or duplicate owned Pixel-forward records.
- Fixed Pixel provisioning dependency semantics: pairing review is created only after the allow-listed install completes and ADB is observed; failed install/privilege prerequisites durably block pairing and every downstream node. The command now reports only the provisioning subgraph, preserving unrelated demo queue items in storage, and emits explicit `NEEDS AUTHORITY`/`NEEDS PRIVILEGE` failures.
- Added regression coverage for failed-prerequisite blocking, terminal privilege failure, observed ADB transition, durable resume, and mission-scoped output.
- Physical Android/ADB, Termux:Boot hook, and reboot qualification remain outstanding; implementation and automated coverage do not claim device qualification. The live command stops at the durable pairing review gate until the user explicitly resumes it.

All notable Agent Control changes are recorded here. The project is still pre-stable; entries describe qualified development milestones rather than implying production readiness.

## [2.0.0 development] — 2026-08-21

### Added

- Continuous Work Executor layered on top of the durable Work Queue.
- Dependency-driven graph progression after completion.
- Compact task-specific execution context instead of replaying full workspace/conversation history.
- Bounded retry handling and semantic outcome fingerprints.
- Automatic repeated-outcome loop escalation to human review.
- Persisted per-work-item outcome history so loop evidence survives queue-store restart.
- Real homogeneous batch execution item by item rather than stopping at batch-lease creation.
- Single-command control-plane lifecycle commands: `npm run up`, `npm run status`, and `npm run down`.
- Health-first discovery/start of the existing hpubuntu llama systemd user services for ports `8080` and `8081`.
- Reuse semantics for healthy ChatGPT Window bridge/adapter services on `8766`/`8767`.
- Pixel bootstrap recovery from SSH-ready state through the known node-start recipe and hpubuntu `18788 -> Pixel:8788` forward.
- Explicit Pixel bootstrap state `SSH-OFFLINE` for the observed case where Tailscale is reachable but Termux SSH `:8022` is not listening.
- One-time Pixel transport-persistence installer `android/install-boot.sh`.
- Termux:Boot hook `android/termux-boot-agent-control.sh` to restore `sshd` after Android reboot and optionally restore the Pixel node when a deliberate Pixel-local token is present.
- Canonical bootstrap-script syntax gate `npm run check:bootstrap`.

### Changed

- `npm run check` now validates TypeScript, control-plane JavaScript syntax and Android shell-script syntax before running the automated test suite.
- The bootstrap status schema is now `agent-control.bootstrap/v3` and reports a structured Pixel lifecycle rather than only a boolean reachability flag.
- Pixel recovery no longer misclassifies an unavailable SSH transport as a failed node-start command.
- `npm run down` remains authority-bounded: it stops only process groups explicitly recorded as Agent-Control-owned.
- `README.md` and `android/README.md` now document the single-command bootstrap and one-time Pixel transport persistence setup.

### Qualified evidence

- Executor Phase 1 reached **75/75 passing automated tests**.
- Restart-persistent loop detection and two-item homogeneous batch execution are covered by the canonical suite.
- Bootstrap test from a partially cold state successfully discovered/started `llama-server.service` and `llama-coder.service`, reused the already healthy ChatGPT Window bridge/adapter, kept Sentinel reachable, and exposed Pixel as the only degraded dependency.
- The physical Pixel failure was correctly narrowed to **Tailscale reachable / SSH `:8022` connection refused**, establishing the transport-persistence requirement now represented explicitly in the lifecycle.
- The next release gate is a one-time Termux:Boot install followed by `npm run up`; expected progression is `SSH-OFFLINE -> NODE-DEGRADED/NODE-READY -> FORWARD-READY -> READY 5/5` without manual hpubuntu recovery commands.

### Safety / authority notes

- Boot persistence restores a known transport and optionally the known Pixel node; it does not expose arbitrary Android control.
- The installer never invents or regenerates the Agent Control node token.
- Occupied-but-unhealthy local ports are still left alone rather than killed or replaced.
- Healthy external ChatGPT Window services are reused rather than claimed as Agent-Control-owned.

## [2.0.0 development] — 2026-08-20

### Added

- Restrained btop/Rethink-inspired semantic colour system for the control-room TUI.
- Workload-class queue meters: cyan interactive, magenta priority, yellow background and green batch.
- Separate capacity/resource utilisation meters that may graduate green/yellow/red with utilisation.
- Compact Work Queue and Resources rendering for narrow terminals.
- Numeric lane context percentage plus compact context meter.
- Explicit `PTY ASSIGNED n/total` header semantics.
- Clear `PIXEL RECOVERY MANUAL/AUTO` presentation separate from Pixel health.
- Isolated synthetic `demo:*` workload covering interactive, priority, background, batch, dependency-blocked, checkpointed and human-review states.
- Idempotent demo injection and tests proving demo cleanup/preservation boundaries.
- Terminal-safe Blessed Activity logging wrapper to prevent legacy/non-ASCII status text corrupting terminal rendering.
- Theme tests covering semantic workload colours, capacity warning colours and terminal-safe text.

### Changed

- Narrow control-room panels now use compact labels and bounded/truncated details instead of hard-wrapping status words.
- Idle/waiting lane presentation is deliberately compact while preserving selected-lane identity accents.
- Queue magnitude no longer turns red merely because a batch is large; red remains a danger/failure semantic.
- Batch-group meters use workload semantics rather than capacity-warning semantics.
- README updated to describe the qualified semantic-colour TUI, demo workload and physical Pixel visual smoke test.

### Fixed

- Mid-word wrapping in Work Queue, provider and lane-summary panels.
- Misleading red full-batch bars that visually implied failure.
- Legacy Unicode/control-room text corruption in the Activity panel by sanitising at the Blessed log boundary.
- TypeScript typing of the terminal-safe Blessed log wrapper.
- UI tests updated to assert semantic content independently of Blessed colour tags while also explicitly testing colour behaviour.

### Qualified evidence

- The semantic-colour/terminal-safe TUI checkpoint reached **69/69 passing tests**.
- The compact semantic-colour TUI was visually smoke-tested from the physical Pixel terminal on 2026-08-20. Activity text rendered cleanly and workload bars retained class colours.
- Pixel-terminal smoke testing also demonstrated useful degraded-state presentation when the resource path was genuinely unavailable from that execution context.

## [2.0.0 development] — 2026-08-19

### Added

- Capability-agnostic resource resolution across Linux, Windows/browser, Android and API/provider resources.
- Durable Work Queue with interactive, priority, background and batch classes.
- Dependency blocking, earliest/deadline scheduling, retry limits and human-review routing.
- Resource scoring using spare capacity, cost/latency constraints and data locality.
- Quiet-period, reserve-capacity and maintenance-window work policy.
- Persistent queue snapshots and restart-safe requeue of preemptible claimed work.
- Interactive preemption of checkpointable background work.
- Homogeneous batch leases, item-by-item commit, yield/checkpoint and low-confidence review continuation.
- Work coordinator separating pure selection from queue mutation.
- Queue observability: backlog/class/status counts, oldest age, batch groups, resource utilisation, throughput and estimated drain time.
- Queue/coordinator telemetry spans and decision events.
- Blessed Work Queue and resource-lifecycle control-room panels plus queue drill-down.
- Canonical `npm run qualify` command (`qualify:all` retained as compatibility alias).
- Qualification gates for hpubuntu Codex, Pixel health/capability resolution, Windows ChatGPT advertised health and functional Responses roundtrip, and Sentinel reachability.
- Separate ChatGPT correctness timeout and latency warning classification; healthy-but-slow no longer fails readiness solely for exceeding 10 seconds.
- Pixel lifecycle model: offline, reachable, SSH-ready, node-degraded, node-ready/forward reconnecting, forward-ready, capability-ready and recovery-failed.
- TUI Pixel probe, manual recovery and AUTO/MANUAL recovery mode controls.
- Allow-listed Pixel node recovery using the existing authenticated SSH identity/token and known node start recipe.
- Idempotent Pixel recovery: healthy recovery requests are no-ops; existing SSH forward is reused.
- Pixel-local and forwarded health verification after recovery.
- Physical Pixel self-recovery qualification evidence in `docs/evidence/pixel-self-recovery-qualified-20260819.md`.
- Focused live test procedure in `TEST-TONIGHT.md`.

### Changed

- Hard contracts migrated to version 2 with explicit capability requests and resource locks.
- Scheduling and routing are expressed in capabilities/resources rather than hard-coded machine/model identity.
- Windows functional readiness now uses a realistic bounded functional timeout while latency is reported independently.
- Operational Pixel lifecycle strings use terminal-safe text after Unicode rendering corruption was observed in Blessed.
- Test command now includes `src/ui/*.test.ts` so UI view-model tests are part of the canonical gate.
- README refreshed to describe the 2.0 control plane, Work Queue, telemetry, qualification matrix and Pixel recovery.

### Fixed

- Type drift in migrated v1/v2 HardContract tests.
- Work-policy, batch and coordinator test implicit-any regressions.
- Batch/coordinator double-claim style mutation by separating scheduler selection from allocation.
- Windows qualification false failure caused by a 10-second functional timeout when correct browser-backed responses took about 13–15 seconds.
- Pixel recovery false-negative caused by treating detached SSH command behavior as authoritative instead of verifying resulting health.
- Pixel detached process lifetime by starting the known node recipe independently of the SSH session.
- Duplicate Pixel starts / `EADDRINUSE` risk by checking remote health before start and making recovery idempotent.
- Failure classification now distinguishes a healthy Pixel node with a reconnecting/unavailable forward from a genuinely unavailable node.

### Qualified evidence

- Local automated suite reached **63 passing tests** after core/control/UI tests were included.
- Post-recovery distributed qualification passed **7 gates, 0 failures, 0 skips** with trace `9cec90ee-8d86-49fa-9891-339277e39850`; Windows functional response was correct but classified slow (~14.7 s).
- Physical Pixel fault injection: healthy PID 8270; recovery request while healthy preserved PID 8270; node deliberately stopped; TUI detected `NODE-DEGRADED`; allow-listed recovery produced PID 9315; existing hpubuntu SSH forward was reused; `/health` returned 200; authenticated `/v2/resource` returned healthy Android/Termux/Codex/logcat capabilities.

### Security / authority notes

- Pixel recovery does not expose arbitrary remote shell execution.
- Recovery does not regenerate credentials.
- Recovery does not replace a healthy SSH forward.
- Runtime state, qualification output, node modules and credentials remain excluded from source control.
- PTY logical ownership is not a claim that raw OS terminal write attachment is production-qualified.
