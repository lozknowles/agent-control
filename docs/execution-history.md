# Human-readable execution history

Agent Control 3.8.2 projects existing durable execution evidence into a chronological operator view. It answers what was requested, what route ran, what observable actions occurred, what the provider returned at the validated boundary, how tokens and cost accumulated, what the governor decided, and whether verification accepted the outcome.

## Source and association

The view has no independent transcript store. A Saved Job Run is rebuilt from:

- the immutable Job Run and its lifecycle transitions;
- only the Work Parcel IDs recorded on that Run;
- only token threads, governor decisions and batons carrying those parcel IDs;
- repository snapshot, bounded context, route, result, verification and accounting evidence already retained by those stores.

A Lane history is similarly restricted to that Lane's durable objective, activity, baton state, route and verification. The service returns a maximum of 160 entries per projection. The dashboard reconnects through the existing SSE refresh path; SSE does not become a second durable history.

## Entry semantics

Actors are `OPERATOR`, `SYSTEM EVENT`, `AGENT / PROVIDER`, `TOOL / ACTION`, `GOVERNOR`, `BATON` and `ERROR`. Entries retain the applicable Run, Work Parcel or Lane identity and may include safe provider/account-label/model route information.

Handoff labels describe evidence, not aspiration:

- `HANDOFF_RECOMMENDED`: the governor reached handoff pressure but selected continuation or compaction;
- `HANDOFF_REQUESTED`: a governed request was recorded, but destination acceptance/execution is not established;
- `HANDOFF_COMPLETED`: the durable `BATON_AND_HANDOFF` outcome is `SUCCEEDED`;
- `HANDOFF_FAILED`: the attempt failed and the original thread remains recoverable.

A `BATON_CREATED` card proves creation and sealing only. It does not claim dispatch, acceptance, destination execution or handoff completion.

## Telemetry and accounting

Current context and lifetime usage are separate. Context values carry `authoritative`, `estimated` or `unavailable`; cumulative input/output/total values and cost carry their own authority. Provider-completion-only estimates are labelled as estimates. If estimated current context exceeds the configured window, the dashboard displays 100% and explains that it is a clamp, not exact provider occupancy.

The history reconciles Job and Work Parcel totals. Missing cached-input reporting remains unavailable rather than becoming zero; total-token and cost reconciliation can still succeed from their independently retained totals.

## Security and retention

The projection permits validated summaries, typed lifecycle facts, hashes, safe account labels and numeric telemetry. It excludes raw prompts and frozen repository context, raw or rejected provider bodies, hidden reasoning, authorization material, API/OAuth tokens, cookies, email addresses, credential environment values, resolved `CODEX_HOME` locations and Windows profile paths. Control characters and oversized strings are bounded before display.

Provider schema failures remain fail closed. New failures can show a safe constraint such as `$.findings[0].category:enum`; they do not expose the rejected field value. Historical failures recorded before path-level diagnostics correctly say that the exact rejected field is unavailable.

## Operator use

Open **Saved Jobs → Runs**, select a Run, then open **Execution history**. Read provider and tool/action cards as observed activity, governor cards as policy decisions, baton cards as checkpoint evidence, and the final verification/accounting cards as outcome evidence. Do not infer destination execution from a baton or a recommendation.
