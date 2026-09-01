# GLM-5.3-Flash qualification on Agent Control 3.6

Verdict: **FAIL**

This evidence branch records an empirical comparison of direct and Agent-Control-governed `z-ai/glm-5.3-flash` work against the clean, pushed Agent Control 3.6 checkpoint `5acdde13e41d58b511a33ac0e15f3dc6d3930613`.

Neither lane completed the mandatory read-only architecture assessment within six provider responses. Consequently neither lane entered implementation, changed a file, added a test, or produced a verified fix. Both unchanged worktrees passed the independent complete gate with 628/628 tests.

Lane A scored **20/100**. Lane B scored **24/100**. Lane B's four-point improvement is solely the value of Agent Control's explicit durable failure handling: the bounded child and parent recorded `YIELD` after the assessment gate failed. It is not an improvement in GLM analysis or implementation.

The result supports retaining GLM-5.3-Flash as `BENCHMARKING`. It does not support `ACTIVE`, `PREFERRED`, `CANDIDATE`, or autonomous full-repository use.

## Frozen identity

- Baseline branch: `feature/agent-control-3.6-acp-runtime-routing`
- Baseline commit: `5acdde13e41d58b511a33ac0e15f3dc6d3930613`
- Agent Control version: 3.6.0
- Provider: OpenRouter
- Requested and returned model: `z-ai/glm-5.3-flash`
- Catalog revision: `z-ai/glm-5.3-flash-20260826`
- Debt-brief SHA-256: `2a357c8098ed0ddc02cbdb0c278eec77f801d5c75ba9315619e149e57374109c`
- Assessment-prompt SHA-256: `0a5b435c6e6925c742f5e1c2136e4bc09b50648b1b4bc3ccf8a128b50d1728f5`
- Resource-envelope SHA-256: `b43e7645cda6a22228717e6af6035332fbeafa00456ecd82f0b865c48f01d79d`

## Evidence map

- `inputs/`: complete frozen manifest, debt brief, implementation prompt, and resource envelope.
- `baseline/`: live model/catalog probes and deterministic routing report.
- `harness/`: frozen typed runner, governed Contract wrapper, and documented pre-lane transport correction.
- `lane-a/`: direct-lane score, incomplete terminal output, timing, and runner result.
- `lane-b/`: governed-lane score, Contract/handoff state, incomplete terminal output, timing, and runner result.
- `artifacts/`: the byte-exact compressed assessment prompt, complete-gate logs, bounded raw provider responses, and preserved failed preflights.
- `comparison.md`: metric table and answers to the qualification questions.
- `reproduction.md`: commands and constraints needed to inspect or repeat the experiment.
- `limitations.md`: scope and interpretation limits.
- `SHA256SUMS`: hashes for every evidence file except the checksum file itself.

The canonical README, changelog, architecture, and usage guidance are intentionally unchanged. A failed qualification is not accepted product capability.
