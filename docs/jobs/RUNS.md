# Runs

A Run embeds the exact Job Definition/version and resolved parameters. Lifecycle states are `SCHEDULED`, `QUEUED`, `RESOLVING`, `AUTHENTICATION_BLOCKED`, `RECONNECTING`, `RUNNING`, `VALIDATING`, `CANCELLING`, `DISCONNECTED`, `SUCCEEDED`, `SUCCEEDED_WITH_FINDINGS`, `FAILED`, `CANCELLED`, and `DEGRADED`; every transition has a timestamp and optional detail.

Persistent evidence includes:

- Saved Job and occurrence identity;
- frozen repository and comparison SHAs;
- selected role/model/provider/provider-model/node and qualification revision;
- explicit fallback and retry histories;
- durable execution sequence/identity, recovery reason, observation time, real retry deadline and remaining budget;
- context profile, file/chunk hashes, changed and omitted files;
- Work Parcel IDs;
- provider-response hashes (not bodies), normalized tokens, provider-reported cost, independently calculated configured-price cost, conservative effective budget cost/basis, validation result, findings, evidence, and errors;
- requested, started, and completed times.

Provider completion is not Run success. `PASS` becomes `SUCCEEDED`; validated findings become `SUCCEEDED_WITH_FINDINGS`; `REVIEW_REQUIRED` becomes `DEGRADED`; invalid/failing output becomes `FAILED`. Timeout is a failed budget condition. Operator cancellation first becomes `CANCELLING`; it becomes `CANCELLED` only after the execution adapter confirms cleanup. Unknown or unverified cleanup remains `DISCONNECTED` and visible.

Terminal records are immutable in `parameterized-jobs/runs.json`. An interrupted provider execution is never blindly requeued: restart marks it `DISCONNECTED`, preserves its exact provider/account/model/node execution identity, and asks the configured executor to reconcile it. Only proven continuity can reconnect or consume a recovered terminal response; otherwise operator reconciliation is required. A pre-provider local `RESOLVING` state may safely return to the queue because no active execution identity exists. The dashboard Run view is therefore a durable evidence page, not mutable browser state.
