# Natural-language task entry and Work Parcels

The dashboard accepts an ordinary-language objective and retains it verbatim. `CatalogNaturalLanguagePlanner` converts a directly named Job deterministically, selects an explicitly registered constrained routine where one exists, or delegates complex planning through the `WorkParcelPlanner` port. If no reasoning planner is configured, an ambiguous request remains rejected as `work_parcel_reasoning_planner_unconfigured`; the dashboard never invents an executable shell workflow.

A proposed plan is data, not authority. Agent Control validates every stage ID, registered versioned Job reference, dependency and cycle before persisting a parcel. The existing `JobRuntime` remains the only executor: it owns parameter validation, capability placement, locks, approvals, retries, action dispatch, artifacts and verification.

`WorkParcelCoordinator` adds only parent orchestration:

- starts a stage after every declared dependency succeeds;
- records the child Run ID and typed artifact references in an `agent-control.work-parcel-baton/v1` baton;
- blocks all dependent stages after a failed gate;
- reconstructs state from the parcel and Run ledgers after restart;
- aggregates elapsed time and existing per-invocation token/cost telemetry without converting unknown values to zero;
- records requested and actual route information separately.

Every newly submitted parcel also carries `agent-control.work-attribution/v1`: Actor, Session, optional Agent/delegation, authority snapshot, creation time and legacy marker. The authenticated dashboard selects `web-operator` server-side and ignores a body-supplied actor. Existing callers without the 3.5 identity service receive deterministic legacy attribution rather than an invented authenticated identity.

The initial runtime executes one ready stage at a time. Dependencies are stored as arrays and cycle-validated, so later parallel DAG scheduling does not require a persistence-format replacement. This is deliberately not a general workflow language.

## FreeToken dogfood routine

The included five-stage qualification routine is an isolated safety test, not a production provider definition. Its model root comes only from `AGENT_CONTROL_FREETOKEN_MODEL_ROOT`; no operator topology is stored in the canonical repository. Inventory is read-only. The readiness Job requires at least 8192 MiB of free VRAM and a compatible HF/FTW checkpoint before any isolated service, benchmark or provider qualification stage can run. A failed gate blocks all later stages and cannot change production routing.
