# Safety and Runtime Remediation Implementation

Final implementation/test commit: `4c93080a9709ff7c9f1476842617a0616a7a08c6`

## SR-1 - enforced Job timeouts

`JobRuntime` now races each declared step timeout against its action, aborts the action, rejects late output, records `TIMED_OUT`, fails the Job, releases locks and worker capacity, and writes structured timeout evidence to the run event ledger. `OwnedProcessManager` starts each Linux child as its own process group and terminates only that tracked group (SIGTERM followed by bounded SIGKILL); Windows uses `taskkill /PID <exact-pid> /T /F`. No executable-name matching is used.

## SR-2 - final protected-workload gate

`ManagedNodeManager.execute` retains the initial authorization, then for every non-read-only operation calls `poll(id)` immediately before `transport.execute`. A protected workload newly active since the initial snapshot raises `managed_node_protected_workload_changed`; the disruptive transport call is not made. The Job action retains this rejection in step and run errors. Read-only work does not incur or wait on this gate.

## SR-3 - bounded production concurrency

The serialization point was `startJobScheduler`'s global `busy` flag around an awaited `runJobSchedulerTick`, whose `runtime.tick()` awaited one complete Job step before another runnable Job could be discovered. The scheduler now performs short guarded discovery, uses synchronous dispatch marking to prevent duplicates, tracks in-flight completions, and dispatches up to the bounded sum of healthy worker capacities (hard-capped at 32). Job dependencies, `no-overlap`/queue semantics, resource locks, worker placement and worker capacity remain enforced by `JobRuntime`.

## SR-4 - nonblocking Android recovery

Synchronous `spawnSync` and `Atomics.wait` were removed. Recovery now uses the shared owned-process execution primitive, promises, abortable timers, a total recovery timeout, bounded command output and cancellation propagation. TUI handlers launch asynchronous probe/recovery and prevent duplicate recovery. As a small inseparable credential fix, the recovery token is sent to fixed `ssh ... sh -s` over stdin and decoded remotely; raw and encoded credentials are absent from process arguments.

No dashboard, neutrality, storage, provider-health, telemetry or other Ox findings were changed.
