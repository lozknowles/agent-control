# External session ingestion candidate — 11 October 2026

Experimental, not release qualified. Based on 80cbbff4f8b94b0ba430562e69ff5efa67c65745.
No production services, canonical historical ledger, pricing tables or scheduler changed.

## Implemented boundary

- Explicit read-only file access; no automatic discovery, home scans, polling or telemetry.
- Canonical real-path fingerprints and SHA-256 raw-line/content hashes; conversation text and paths are not returned.
- Bounded file snapshots (16 MiB default; maximum 64 MiB) and 1 MiB record limit.
- Codex session metadata, model turn context and cumulative token_count evidence. Repeated counters do not sum; cumulative updates retain evidence revisions.
- Claude assistant message usage keyed by session/message; streaming revisions replace active rows, retaining evidence hashes.
- Corrupt records, partial final writes, missing identity, last-only Codex counters and regressions become coverage gaps.
- Re-read reconciliation deduplicates evidence hashes. Decreasing subsequent snapshots retain prior counters and report gaps.
- Optional fifth usageProjection argument accepts already-read snapshots and adds externalSessions separately. Existing callers, totals, history/reset behavior, billing and POE answers retain their existing contract.
- Missing Claude cache writes now keep total processed tokens unknown instead of silently assuming zero.

## Limits and remaining qualification

This is a library integration boundary, not a live dashboard feature. No web route or dashboard controls enable log reads.
Cross-file forks/copies and native overlaps remain unresolved. Path-scoped IDs prevent accidental collision, but cannot establish distinct billable executions. External rows must never be added to native totals.
Codex counters are session cumulative observations, not per-invocation or per-period usage. Last-only logs are reported as gaps.
No durable external ledger, incremental cursor, rotation reconciliation, cache-write lifetime pricing, quota, task/Git attribution, context-waste analytics or outcome comparisons.
SHA-256 hashes reference observed evidence; they do not authenticate the producer or archive raw evidence.
The reader resolves real paths but does not provide an authorization allowlist or symlink containment boundary. It must only be called with explicitly authorized file paths; any future HTTP boundary needs its own path authorization.
Concurrent append is bounded by the initial file size; partial tails are deferred. Concurrent in-place rewriting is not a consistent snapshot guarantee.
Only synthetic fixture logs were read. No personal session logs, paid provider runs or production state used.
Windows tests do not qualify Linux/macOS/WSL/Android, browser UX, large-history polling or invoice reconciliation.

## Validation

Focused fixtures include inclusive/exclusive cache semantics, invalid/unsafe counters, repeated pings, cumulative revisions, Claude streaming, corruption/partial tails, bounded read-only access, path privacy, snapshot regression and native accounting isolation.
Validation results and exact commit are reported in the handoff; this document makes no release qualification claim.

## Manual inspection

From the repository root:
```sh
node --import tsx scripts/inspect-external-session-usage.ts codex /explicit/authorized/session.jsonl
node --import tsx scripts/inspect-external-session-usage.ts claude /explicit/authorized/session.jsonl
```
Pass at most 32 files. Output is JSON observations, revisions and coverage gaps on stdout; the command writes neither source logs nor Agent Control state. This is inspection only and does not establish permission to read other paths. File-access failures are redacted to avoid leaking private paths.
