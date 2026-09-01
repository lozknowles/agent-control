# Runs

A Run embeds the exact Job Definition/version and resolved parameters. Lifecycle states are `SCHEDULED`, `QUEUED`, `RESOLVING`, `RUNNING`, `VALIDATING`, `SUCCEEDED`, `SUCCEEDED_WITH_FINDINGS`, `FAILED`, `CANCELLED`, and `DEGRADED`; every transition has a timestamp and optional detail.

Persistent evidence includes:

- Saved Job and occurrence identity;
- frozen repository and comparison SHAs;
- selected role/model/provider/provider-model/node and qualification revision;
- explicit fallback and retry histories;
- context profile, file/chunk hashes, changed and omitted files;
- Work Parcel IDs;
- provider-response hashes (not bodies), normalized usage/cost, validation result, findings, evidence, and errors;
- requested, started, and completed times.

Provider completion is not Run success. `PASS` becomes `SUCCEEDED`; validated findings become `SUCCEEDED_WITH_FINDINGS`; `REVIEW_REQUIRED` becomes `DEGRADED`; invalid/failing output becomes `FAILED`. Timeout is a failed budget condition; operator cancellation is `CANCELLED`.

Terminal records are immutable in `parameterized-jobs/runs.json`. An interrupted non-terminal Run is requeued under the same identity on restart and may resume only from an intact snapshot matching the recorded SHA. The dashboard Run view is therefore a historical evidence page, not mutable transient state.
