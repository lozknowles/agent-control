# Governed retrieval and context intelligence

Agent Control 3.8 adds an opt-in provider-neutral retrieval layer between a Work Parcel and context compilation. It retrieves compact evidence; it does not grant a model arbitrary search/index administration or replace independent verification.

## Configuration

```json
{
  "retrieval": {
    "enabled": true,
    "providers": ["exact", "lexical", "zg"],
    "maximumCalls": 4,
    "maximumEvidenceItems": 12,
    "maximumEvidenceTokens": 8192,
    "minimumConfidence": 0.55,
    "requiredCoverage": 0.6,
    "contextPressurePercent": 75,
    "contextPressureEvidenceFraction": 0.5,
    "allowRemote": false,
    "zgExecutable": "zg"
  }
}
```

Retrieval is disabled by default. `exact` and `lexical` are dependency-free local providers. `zg` is optional and is invoked only as `zg query`; Agent Control does not install, build, rebuild, or delete an index. `zgExecutable` must be a command name resolved by the deployment environment, not an absolute or repository-private path. Missing or failing providers fall through the configured progression and ultimately retain the immutable frozen context.

`allowRemote` is false by default. It takes both policy permission and intent permission to call a REMOTE/HYBRID provider. Repository contents therefore do not leave the node merely because retrieval is enabled.

## Retrieval governor

The default progression is exact, lexical, then optional semantic/hybrid. Each attempt is bounded by call/item/token limits. Coverage, confidence, freshness, prior failures, latency/cost and context pressure determine whether evidence is sufficient. At or above `contextPressurePercent`, the evidence budget is multiplied by `contextPressureEvidenceFraction`. This uses active occupancy when supplied; cumulative lifetime tokens are not treated as context occupancy.

The 3.7 token governor remains responsible for model continuation, compaction and handoff. Retrieval runs before raw context expansion. A baton carries portable content-addressed Evidence Packet references alongside its normal objective, decisions, Git state and next action. Provider-private state is never the only continuation representation.

## Evidence and freshness

Evidence Packet v1 records provider, repository identity, Git SHA/tree/dirty fingerprint, path/range, strategy, query, confidence, freshness, content hash, bounded text, provenance, token estimate, retrieval latency/cost and verification state. Packets and decisions are persisted under the Agent Control state directory with mode `0600`; API/dashboard projection omits evidence text and repository roots.

Freshness is one of `CURRENT`, `POSSIBLY_STALE`, or `INVALID`. An indexed Git mismatch is invalid. Dirty-state uncertainty is possibly stale. The production repository-review flow accepts no invalid packet and records a controlled frozen-context fallback instead of presenting stale evidence as current.

Evidence nodes extend the existing ContextGraph and compile through the existing ContextPacketBuilder as non-broad task context. Content hashes and packet references let later retrieval avoid carrying unnecessary raw context.

## Authority and operations

- Execution agents may receive `retrieval.search` and `retrieval.inspect`.
- Index build/rebuild/drop requires separate `retrieval.index.manage` authority outside the model execution port.
- Retrieval cannot mutate a repository, model route, policy or global index.
- zg/MCP/provider-native adapters remain optional implementations of the generic port.

## Dashboard and audit

`GET /api/retrieval` returns redacted policy, attempts, packet metadata and totals. Existing SSE publishes `retrieval.started`, `retrieval.escalated`, `retrieval.evidence`, and `retrieval.failed`; the dashboard updates without refresh. It shows strategy/provider path, evidence count/tokens, raw bytes avoided, context tokens saved, freshness, calls/escalations, locality and latency. Durable evidence contains every decision and bounded packet for reconciliation.

## Qualification and troubleshooting

Run:

```bash
npm run typecheck
node --import tsx --test src/control/governed-retrieval.test.ts src/control/direct-repository-review-executor.test.ts src/control/web-server.test.ts
node --import tsx scripts/benchmark-governed-retrieval.ts .
ZG_EXECUTABLE=zg node --import tsx scripts/benchmark-governed-retrieval.ts .
```

An explicit operator may build a disposable benchmark index separately and record its cold time/RSS. Never hide this cost or let an execution agent perform it. If zg is absent, omit it from `providers`; exact/lexical and frozen-context fallback remain operational.

The five-task retrieval benchmark found all targets with full context and zg hybrid, but only two with the initial built-in exact/BM25 lane. A real Qwen2.5 3B answer remained verified while provider-reported input dropped from 20,912 tokens (full) to 2,480 (built-in) and 1,556 (zg). This is promising, not a production-routing qualification; see [benchmark evidence](evidence/agent-control-3.8-retrieval-benchmark.json) and [local-model evidence](evidence/agent-control-3.8-local-model-retrieval.json).
