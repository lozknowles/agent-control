# Changelog

All notable Agent Control changes are recorded here. The project is still pre-stable; entries describe qualified development milestones rather than implying production readiness.

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

- Core/control/UI automated suite had reached **66/66 passing tests** before the final three theme tests were added; the current checkpoint target is **69 tests** and must be re-run locally after pulling the terminal-safe wrapper typing fix.
- The compact semantic-colour TUI was visually smoke-tested from the physical Pixel terminal on 2026-08-20. Activity text rendered cleanly and workload bars retained class colours.
- Pixel-terminal smoke testing also demonstrated useful degraded-state presentation (`Pixel OFFLINE / Tailscale unreachable`) when the resource path was genuinely unavailable from that execution context.

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
