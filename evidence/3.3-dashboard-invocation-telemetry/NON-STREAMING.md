# Non-streaming reproduction

The synthetic dispatcher test deliberately leaves its executor promise unresolved, matching `stream: false` waiting behaviour. Before resolving, the shared ledger exposes provider, model, Run, step, lane, start time, RUNNING state, `waiting for provider`, and unknown usage/cost. Resolving the same invocation replaces the pending record with supplied usage, reported cost, duration and outcome while retaining its invocation ID.

Failure, timeout, cancellation and success-without-usage fixtures retain provider/model identity and use unknown values rather than fabricated zeroes.
