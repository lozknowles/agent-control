# Migrating to the Agent Control 4.0 release candidate

`4.0.0-rc.1` is an additive integration candidate based on the released 3.9 control plane. It does not automatically enable Saved Jobs, adaptive routing, OpenWA, Social & Voice, remote ACP, provider credentials, NVIDIA routes or deployment.

Back up the controller state with Agent Control stopped. Install the candidate in an isolated checkout/state directory, run `npm run check`, start it on unused loopback ports and authenticate the dashboard with a new operator token. Existing additive snapshots load without a bulk rewrite. New request-origin and execution-session fields are optional for historical records; Agent Control does not fabricate origin metadata for old Runs.

Review these settings before qualification:

- `adaptiveOrchestration.enabled` and its evidence/quality/cost policy;
- configured provider/account/model/node qualification and credential residency;
- OpenWA signed gateway, enrolled direct sender and hash-pinned template grants;
- Social & Voice speech/STT endpoints and separate text-confirmation policy;
- protected-resource constraints and typed Action effect policies;
- execution-session adapter limitations and `WATCH_ONLY` protected actions.

Run a disposable, non-production Work Parcel and reconcile Jobs, Lanes, Models, Routing, Systems, Crew, Sessions, complete transcript and durable evidence. A 4.0 candidate is not release-ready merely because the deterministic suite passes; the full natural lifecycle and any controlled fault injection must be separately evidenced.

Rollback by stopping the candidate, restoring the prior state backup and starting the released 3.9 package/checkout. Do not point two controller versions at the same mutable state. Provider credential stores, OpenWA sessions and remote node credentials remain external residency domains and must not be copied as part of source rollback.
