# Cost-aware OpenRouter routing implementation evidence

Date: 2026-09-20

## Result

Agent Control now has a provider-neutral cost/performance routing policy with an optional OpenRouter request translator. The policy is opt-in. Existing providers and invocations remain unchanged when no policy is configured.

Configured policies are resolved in this precedence order: estate, provider, model, suite, job, invocation. A narrower policy may lower authority directly. Raising a price ceiling, spending budget, token ceiling, or enabling cross-model fallback requires an existing approval record. Decisions, overrides, and reconciliations are appended to a hash-chained JSONL ledger.

The normal direct-inference path and governed Lab Job model invocation path resolve configured policies before provider dispatch. The ledger-derived actual spend for the same job is supplied to each subsequent preflight, so an insufficient remaining job budget blocks before credential resolution or network access.

## Verified OpenRouter schema

Official documentation inspected on 2026-09-20:

- <https://openrouter.ai/docs/guides/routing/provider-selection>
- <https://openrouter.ai/docs/guides/routing/model-fallbacks>
- <https://openrouter.ai/docs/api/api-reference/generations/get-request-&-usage-metadata-for-a-generation>

The adapter emits only the documented `provider` object. Verified fields are `sort` (`price`, `throughput`, `latency`, or `{by, partition: "none"}`), `preferred_min_throughput`, `preferred_max_latency`, `max_price.prompt`, `max_price.completion`, `only`, `ignore`, `quantizations`, and `allow_fallbacks`. Prices are USD per million tokens. `max_price` is a provider-rate filter and is never described or enforced as a total request/job budget.

## Evidence and qualification boundary

- Deterministic policy, translation, failure, approval, reconciliation, immutability, API, CLI, configuration, and compatibility tests passed.
- The repository-wide check passed: 2,001 tests, 0 failures, 0 skipped in 395,369 ms. Distribution, TypeScript, bootstrap syntax, dashboard syntax, neutrality, implementation status, and limitations carry-forward gates also passed.
- No active OpenRouter credential reference was present in the isolated worker environment. No paid request was sent and no cost was incurred. Live endpoint selection, OpenRouter-internal fallback count, and follow-up generation-metadata retrieval remain physically unqualified.
- Actual cost is authoritative when returned in the provider response. If the provider omits actual cost, Agent Control calculates it only when complete, non-cached advertised-rate evidence is available; otherwise it records `UNAVAILABLE`.
- Cross-model fallback is blocked as unsupported until an explicit governed model list and accounting contract are supplied. It is never silently enabled.
- The dashboard exposes authenticated policy projection and dry-run explanation. Persistent policy editing remains configuration-controlled; the dashboard does not yet write policy configuration.

No production credential, deployment, service restart, merge, tag, release, or protected installation was changed during this work.
