# Token Intelligence: Codeburn-inspired integration candidate (11 October 2026)

**Status: EXPERIMENTAL / NOT RELEASE READY.** Isolated integration branch; no production dashboard, scheduler, deployment, price table or canonical ledger modified.

## Repository inspection
The main branch (v4.20.0) already exposes native Usage & Cost breakdowns, model history, cache and retry evidence, energy, local-vs-API, invocation drill-downs, retention visibility resets, and authority-aware unknown values. Do not duplicate or replace them.

Source projects reviewed:
- https://github.com/rebroad/codeburn (fork)
- https://github.com/getagentseal/codeburn (upstream)
- docs/providers/codex.md, docs/providers/claude.md, docs/yield.md and docs/design/perf-cache-fix.md in the fork.

## Integration contract
1. Keep Agent Control as owner of task IDs, baton transitions, governance, execution evidence and outcomes.
2. Treat external tool session files as **observations**, never as trusted provider invoices or authoritative Agent Control executions.
3. Read-only connectors initially for Codex and Claude, optionally expanding to other tools. Discovery must be opt-in, scoped to authorized paths and support Windows, Linux and macOS.
4. Canonical external IDs must carry provider, source path fingerprint, session ID and event identity. On re-read and session forks, deduplicate idempotently and preserve revisions; do not infer identity from timestamp alone.
5. Handle Codex last-per-turn and cumulative counters, repeated events, cached input inclusive of input, null usage pings and file truncation; no character-derived token estimate may masquerade as observed usage.
6. Handle Claude repeated streaming message IDs, cache-read tokens, distinct cache-write lifetimes and separate price categories.
7. Keep **actual billed API cost**, **estimated list-price equivalent**, **subscription capacity**, **local electricity** and **hardware allocation** strictly separate. Prices require SKU/route, effective date, currency and source. An unknown price stays unknown.
8. Map session -> turns -> optional project/branch/task -> Agent Control work/parcel/outcome with explicit confidence and evidence references. Timestamp-based Git attribution is heuristic. Never classify absent commits as proven wasted spend.
9. Add incremental source fingerprinting, bounded parsing, resumable cursor, errors-as-coverage-gap, sealed raw evidence hashes, retention policy and inspectable dedup diagnostics.
10. Reuse the native dashboard: new External Sessions, Context Waste and Before/After views where appropriate, linked to the existing Usage & Cost history. Include unaccounted, missing, estimated and observed counters separately.
11. Recommendations can flag large repeated context, unused tool descriptors, context growth, retry tax and routing comparisons, but require review before any automatic change.
12. Historical event ledger must survive resets and software/model upgrades; dashboard visibility reset must not delete forensic evidence.
13. No new paid-provider runs, external telemetry upload or destructive file scans for qualification without explicit operator approval.

## Delivery gates
- Correctness fixtures: repeated Codex token_count events; cumulative-only stream; resumed/forked sessions; Claude streamed duplicates; mixed inclusive/exclusive cache; missing counters; numeric strings rejected; corrupt JSONL; partial writes; overlapping external and native execution.
- Reconciliation: compare observed sums with independently retained session evidence and, where applicable, invoices; publish coverage and discrepancy reports.
- UX: filters, attribution-confidence markers, date comparison, cumulative trends, accessible mobile layout, no misleading 0 for unknown.
- Platform: Windows native, WSL, Ubuntu, Android Linux where supported.
- Runtime: incremental polling benchmark with large immutable history and one appended session, proving no stale snapshots.
- Governance: full suite/typecheck/browser testing and explicit human release approval before merge, deployment or publication.

## Initial executable slice (superseded by ingestion candidate)
`src/control/external-token-normalization.ts` provides a pure, non-I/O normalization boundary and focused tests. The follow-up library reader, reconciliation and optional projection adapter are documented in [the ingestion candidate](token-intelligence-ingestion-candidate.md). Runtime/dashboard reads remain disabled. No functionality should be described as live until connector, persistence, reconciliation and UX gates pass.

## Follow-up work order
1. Audit existing canonical usage row types and aggregation paths; define an adapter compatible with their coverage semantics.
2. Build read-only streaming Codex connector and fixture corpus, then Claude connector.
3. Add deterministic external/native dedup and reconciliation.
4. Implement context overhead, quota, Git/PR attribution and cost-per-verified-outcome as layered analytics, not blended totals.
5. Add dashboard drill-downs and historical comparisons; qualify full platform matrix.
