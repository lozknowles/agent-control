# Agent Control 4.18 limitations

This release register supplements the historical public-release ledger. It does not rewrite earlier evidence. The machine-readable computer-use register is `config/computer-use-limitations.json`.

| ID | Status | Limitation |
|---|---|---|
| AC-4.18-LIM-01 | PROVIDER_ACCESS_UNAVAILABLE | No legitimate Coasty endpoint, credentials or approved spend authority was available; no adapter was fabricated. |
| AC-4.18-LIM-02 | COMPARISON_UNAVAILABLE | A second legitimate physical computer-use provider was unavailable, so no cross-provider latency, quality or cost comparison is claimed. |
| AC-4.18-LIM-03 | EXPERIMENTAL | The Windows Sky desktop bridge requires explicit endpoint and token-file configuration and is not a production route. |
| AC-4.18-LIM-04 | DEFERRED_FOR_FULL_QUALIFICATION | OSWorld was not run. No official-task score or benchmark claim is made. |
| AC-4.18-LIM-05 | QUALIFIED_WITH_LIMITATIONS | STEP/MANAGED_RUN orchestration is qualified through focused tests and a disposable browser path. This does not establish unrestricted desktop autonomy. |
| AC-4.18-LIM-06 | NOT_DEPLOYED | This GitHub software release changes no production service or configuration. |

Rollback remains `v4.17.0` at `49282a711b592ba82cf0fb4fcdfba6e5338d81d3`.
