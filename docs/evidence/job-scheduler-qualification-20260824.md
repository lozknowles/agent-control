# Agent Control 3.1 Job Catalog and Scheduler qualification

## Verdict

`PARTIAL` for the complete 3.1 release acceptance gate.

The scheduler/catalog/runtime subsystem is implemented and its safe non-production reference workflow is qualified. The release is not called `READY_FOR_3.1` because real authenticated Facebook discovery, reuse of the existing LocalWalks publisher, and a non-production deployment target were not available in this isolated Agent Control source worktree. No inference converts the fixture proof into production qualification.

## Evidence classification

### EXPERIMENTALLY VERIFIED

- Source commit under test: `9a6f91f561a5c3cd10ac740447f1c744e66c8800`.
- Environment: isolated Linux x64 qualification host, Node `v24.19.0`, npm `11.17.0`, exported source beneath `/tmp`; no production service was used.
- `npm run check`: PASS. TypeScript, bootstrap syntax, neutrality 3/3 and complete serial suite 201/201 passed on 2026-08-24.
- `npm run qualify:jobs -- /tmp/agent-control-3.1-jobs-evidence.json`: `PASS_SAFE_NON_PRODUCTION` at `2026-08-24T07:05:40.653Z`.
- Run: `run-2e422b42-f6ab-461d-a212-1fda1622d982`.
- Discovery completed on `qualification-mobile`; artifact `artifact-89d99ba7-2d88-451f-aa39-7d55508063c5` (`events/v3`) had SHA-256 `63b14c7b65b3212cab1013539044462eff7e1216e01617128f2cf869e7cbf3d7`.
- With the publisher offline, reconciliation became `WAITING_FOR_WORKER` with reason `No worker satisfies localwalks.publisher`; the discovery artifact remained unchanged.
- After the publisher became healthy, reconciliation/build/safe no-op publication completed on `qualification-publisher`; target verification completed on `qualification-observer`. All five steps and five declared verification policies passed in one attempt.
- Lane lease, baton, lane status and PTY owner were identical before and after the Run. The scheduler exposed no PTY writer and the manifest granted no capability.
- The candidate Schedule remained disabled. London calculations produced summer `2026-08-24T06:00:00.000Z` and winter `2026-12-24T07:00:00.000Z` for local 07:00.
- Focused tests cover schema/version/action/dependency/cycle/parameters, timezone/DST, due/missed/duplicate scheduling, capability expiry/offline, artifact checksum/handoff, approval waits, retry bounds, resource contention/restart, fail-closed execution recovery, cancellation fencing, verification failure, API authentication and unchanged lane authority.

The exact generated fields are preserved in `docs/evidence/job-scheduler-qualification-20260824.json`. It is a whitespace-compacted durable transcription with SHA-256 `407e4cc46784359c08aaab4d9dd30c703094e0c77f309385393b0c84bf2c64db`. The original pretty-printed generated source JSON SHA-256 was `cdad2a521cc49c13785edaf68d16534ce2a6603e8edb567ff6b7cfbed36e6715`.

### SOURCE VERIFIED

- Job and Schedule JSON Schemas: `config/schemas/`.
- Manifest parsing, schema validation, typed parameters, dependency/cycle validation, cron/DST: `src/control/job-catalog.ts`.
- Worker registry, placement rationale, Run ledger/state machine, resource locks, artifacts, retries, verification and scheduler: `src/control/job-runtime.ts`.
- Shared TUI/web boundary: `src/control/application-service.ts`; API/SSE: `src/control/web-server.ts`.
- Job/Queue/Run dashboard and TUI Jobs projection: `assets/dashboard/` and `src/index.ts`.
- Reference Job/Schedule: `config/jobs/`; safe Actions: `src/control/reference-actions.ts`.

### INFERRED

- Real Action adapters can use the same contract for remote/browser/mobile/Orca execution without changing Job policy, but those adapters are not implemented here.
- The artifact contract is suitable for a future remote object transport; only the Agent Control-managed local store is implemented.

### NOT TESTED

- Authenticated Facebook UI discovery.
- The existing LocalWalks event reconciliation/release implementation.
- Any staging or production publication.
- Webhook, repository-change, artifact-created, health-condition or agent-request triggers.
- Reattachment to an in-flight remote Action after controller restart; current behavior intentionally fails closed to `DISCONNECTED`.
- Visual browser acceptance of the new Jobs screen: authenticated HTTP/API/assets are tested, but the in-app browser's localhost URL policy blocked the temporary test page. The previously qualified 3.1 lane dashboard baseline remains unchanged.

## Safety and non-actions

No production configuration, deployment, production service, real authenticated session, PTY input, lease, ownership generation, human takeover fence, provider routing decision or external sharing state was changed. The twice-daily Schedule definition is present but disabled. The qualification performed no external network request and no publication attempt.
