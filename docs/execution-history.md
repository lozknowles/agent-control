# Human-readable execution history

Agent Control 3.8.2 projects existing durable execution evidence into a chronological operator view. It answers what was requested, what route ran, what observable actions occurred, what the provider returned at the validated boundary, how tokens and cost accumulated, what the governor decided, and whether verification accepted the outcome. “Human-readable” means typed durable facts are rendered as concise operator-facing sentences and cards; it does not mean Agent Control captures every process log or model-internal thought.

## Source and association

The view has no independent transcript store. A Saved Job Run is rebuilt from:

- the immutable Job Run and its lifecycle transitions;
- only the Work Parcel IDs recorded on that Run;
- only token threads, governor decisions and batons carrying those parcel IDs;
- repository snapshot, bounded context, route, result, verification and accounting evidence already retained by those stores.

A Lane history is similarly restricted to that Lane's durable objective, activity, baton state, route and verification. Saved Job identity connects the reusable configuration to each immutable Run, and Run-owned Work Parcel IDs provide the only association boundary for provider, telemetry, governor and baton records. Evidence from another Run, Parcel or Lane is not merged by time or by similar display name.

Entries are ordered by their durable timestamps and then stable entry identity. This makes simultaneous events deterministic without inventing causality. The service returns the most recent 160 entries per projection. Reloading reconstructs the view from durable sources; the dashboard reconnects through the existing SSE refresh path and refetches the canonical projection. SSE does not become a second history store.

## Entry semantics

Actors are `OPERATOR`, `SYSTEM EVENT`, `AGENT / PROVIDER`, `TOOL / ACTION`, `GOVERNOR`, `BATON` and `ERROR`. Entries retain the applicable Run, Work Parcel or Lane identity and may include safe provider/account-label/model route information.

- **Operator** entries represent the durable request or Lane instruction.
- **System** entries represent Run transitions, route selection, independent validation and ledger reconciliation.
- **Agent/provider** entries represent a bounded structured request, retained response hash/accounting, or validated human-readable result—not raw provider traffic.
- **Tool/action** entries represent immutable repository/context preparation and Work Parcel audit events.
- **Governor** entries represent the actual persisted pressure state, selected routing action, outcome and reason.
- **Baton** entries represent sealed checkpoint creation and its digest.
- **Error** entries represent fail-closed lifecycle, provider, validation or handoff outcomes using safe diagnostics.

Handoff labels describe evidence, not aspiration:

- `HANDOFF_RECOMMENDED`: the governor reached handoff pressure but selected continuation or compaction;
- `HANDOFF_REQUESTED`: a governed request was recorded, but destination acceptance/execution is not established;
- `HANDOFF_COMPLETED`: the durable `BATON_AND_HANDOFF` outcome is `SUCCEEDED`;
- `HANDOFF_FAILED`: the attempt failed and the original thread remains recoverable.

A `BATON_CREATED` card proves creation and sealing only. It does not claim dispatch, acceptance, destination execution or handoff completion. The current history model has no invented standalone “accepted” state: destination acceptance/continuation must be supported by the governed handoff record and destination invocation before a successful `BATON_AND_HANDOFF` outcome is displayed as completed.

## Telemetry and accounting

Current context and lifetime usage are separate. Context values carry `authoritative`, `estimated` or `unavailable`; cumulative input/output/total values and cost carry their own authority.

- `authoritative`: the provider or execution adapter emitted that exact measurement with unambiguous provenance;
- `estimated`: Agent Control calculated the value from an adapter estimate, configured context limit or price table;
- `unavailable`: the provider did not expose a usable value, so the dashboard shows unavailable rather than zero.

Some providers expose usage only after completion. Their initial history entry therefore shows current context and lifetime usage as unavailable; a completion event can add final usage and, where supported, an explicitly estimated single-turn context value. If estimated current context exceeds the configured window, the dashboard displays 100% and explains that it is a clamp. A displayed estimated 100% is not an exact provider-reported measurement and does not establish that the provider exhausted its context.

The history reconciles Job and Work Parcel totals. Missing cached-input reporting remains unavailable rather than becoming zero; total-token and cost reconciliation can still succeed from their independently retained totals.

## Security and retention

The projection permits validated summaries, typed lifecycle facts, hashes, safe account labels and numeric telemetry. It excludes raw prompts and frozen repository context, raw or rejected provider bodies, hidden reasoning, authorization material, API/OAuth tokens, cookies, email addresses, credential environment values, resolved credential-home locations and local profile paths. Control characters and oversized strings are bounded before display. The existing HTTP redaction boundary is applied after projection as defense in depth; safe numeric context counters are allow-listed without permitting credential-like token fields.

Human-readable execution history is therefore not raw logs, raw JSON, complete unredacted provider request/response traffic, or hidden chain-of-thought. Agent Control stores and displays observable outcomes and governed evidence, not private model reasoning.

`repository_review_provider_schema_invalid` means provider output parsed as JSON but failed the repository-review application contract. Provider-side structured-output validation occurs first where supported; Agent Control then validates independently before repository verification. New failures can show a bounded safe constraint such as `$.findings[0].category:enum`; they do not expose the rejected value. The raw rejected response remains ephemeral, while its hash, usage and safe failure classification can remain durable. Historical failures recorded before path-level diagnostics correctly say that the exact rejected field is unavailable.

In 3.8.2 the provider-facing contract and application semantic contract align on schema literals, enums, ranges, required/non-empty values and location constraints. Independent validation remains fail closed rather than trusting provider transport enforcement.

## Operator use

Open **Saved Jobs → Runs**, select a Run, then open **Execution history**. Read provider and tool/action cards as observed activity, governor cards as policy decisions, baton cards as checkpoint evidence, and the final verification/accounting cards as outcome evidence. Lane-local history appears in **Lanes → Activity**. New SSE activity refreshes these projections without changing their durable source or requiring a page reload. Do not infer destination execution from a baton or a recommendation.
