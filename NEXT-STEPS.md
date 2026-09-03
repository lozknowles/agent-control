# Next steps

These items are intentionally deferred from Agent Control 3.8 development:

- Improve and re-benchmark the built-in lexical ranker before it can influence automatic broad semantic routing; the first frozen suite retrieved the expected file for only 2/5 tasks.
- Expand the local-model A/B/C trial beyond one bounded Qwen2.5 3B question, including mutation tasks, independent verification, baton/handoff size and cost-per-verified-outcome.
- Qualify provider-native and MCP retrieval adapters only after their locality, freshness and search-versus-index authority contracts are explicit.
- Review zg cold-index memory (roughly 954 MB peak in this run) and warm latency on controller-class and edge nodes before recommending it as a default.

- Add production TLS termination and deployment qualification for the authenticated ACP remote transport. The current HTTP/WebSocket evidence is bounded to loopback.
- Propagate ACP cancellation while provider, permission or client-owned tool work is pending.
- Add operating-system-specific PTY creation and signal-delivery adapters beneath the durable contract-owned PTY authority model.
- Collect at least 50 independent physical observations for the frozen capability-routing benchmark, including provider-reported latency, token usage and monetary cost when available.
- Run the complete coordinator-versus-monolithic execution experiment; the current evidence compares compiled context and batons, not provider outcomes.
- Keep automatic production capability routing disabled until all frozen safety, verification, integrity, latency and cost gates pass; repeat qualification after model, provider or Codex CLI changes.
- Extend session lifecycle mutation APIs only after defining external authentication and participant-admission policy; the dashboard remains read-only for sessions.
