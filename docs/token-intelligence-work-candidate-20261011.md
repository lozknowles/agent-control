# Token Intelligence Work candidate — 11 October 2026

This local candidate extends the 39b0aed99 ingestion prototype. It is opt-in and experimental. No production state, native usage ledger, pricing table, provider routing, or historical usage visibility record is changed by external ingestion.

## Operator boundary

The web process enables external usage only when `AGENT_CONTROL_EXTERNAL_USAGE_MANIFEST` names an absolute JSON manifest path. The manifest is read at startup and contains explicit absolute source files; HTTP requests cannot supply source paths or trigger discovery. Example:

```json
{"schema":"agent-control.external-usage-manifest/v1","files":[{"source":"codex","file":"/authorized/path/session.jsonl"},{"source":"claude","file":"/authorized/path/session.jsonl"}]}
```

Windows paths must use valid JSON escaping. External evidence is stored under the configured Agent Control state directory at `external-usage/evidence.json`. Keep that directory private. The process checks for new complete records every 30 seconds. Refresh failures leave previously committed evidence visible with stale-source status; corrupt storage fails closed. A stale writer lock requires operator inspection before manual recovery.
Source paths are resolved once at startup to their canonical targets. A later symlink change does not switch the configured source. File replacement and truncation are recorded as source generations and coverage gaps.

The inspection CLI can also persist explicit files with `--store`; this does not enable the dashboard by itself.

## Accounting contract

- Stored rows retain token counters, source and evidence hashes, revisions, coverage gaps and resumable cursors. Source file paths and conversation text are not stored in the evidence projection.
- Identical copies are deduplicated; divergent fork evidence is excluded and reported as a conflict. Session identity alone cannot resolve every Codex fork.
- Claude messages have observed event times. Codex totals are cumulative: the first observation has unknown start, later deltas are attributed only to wholly observed intervals inside the requested period. Intervals crossing a boundary remain unallocated; model changes make interval model attribution unknown.
- Counter regressions make subsequent intervals unallocated until a new source generation. Intervals crossing a source rewrite or truncate boundary are unallocated even when the new counters increase.
- External sessions appear in their own Usage & Cost tab. Native totals, API charges, energy, retries, outcomes and visibility-reset behaviour are unchanged. No combined native/external total is offered.
- Native request-ID matches are possible overlaps. An explicit matching provider identity and attested message counter semantics can confirm an evidence overlap, while a mismatched counter record is a conflict. Evidence overlap does not prove identical billing; no external observation is subtracted from native accounting.
- External model filters apply exactly. Other native dimensions are reported as unsupported for the external view and return no external rows.
- External rows respect the Usage & Cost query limit (maximum 1,000); coverage reports matching and returned counts. Conflict and gap samples are bounded in the dashboard response while their full counts remain visible.

## Architecture gate

The required PLAN review was triggered by the requested durable ingestion and dashboard integration. It found path-scoped copy IDs, cumulative period ambiguity, absent native request identity and an incomplete prior regression run. The primary chose a separate atomic store and read-only dashboard projection, retained unknown intervals and possible overlaps, and kept the canonical ledger unchanged.

The NO-PROGRESS review was triggered by repeated OpenWA test-worker shutdown stalls. It advised checking worker teardown separately from assertion failures, using matched baseline/candidate runs, and reporting any intervention. The primary terminated only the verified stalled test worker and kept suite completion unqualified.

The COMPLETION review of `0fc5b92` found that regressed cumulative evidence could inflate a later interval, whole-period spanning intervals disappeared, source-generation boundaries were lost, background corrupt-store refresh could reject from the timer, and native `ADDITIONAL` reasoning semantics could be falsely confirmed as overlapping. The primary fixed these in the next local commit, added focused tests, and retained the release gate until validation of the frozen commit.

## Remaining limits

Only explicitly listed files are ingested. Source and store size are capped at 64 MiB; each refresh advances at most 1 MiB per file and verifies the consumed prefix, so large unchanged files still have linear verification cost. Oversized lines need a larger configured ingestion chunk. File and directory power-loss durability is not independently qualified on every platform. No invoice reconciliation, subscription/quota model, Git attribution, context-waste recommendation or automatic optimisation is claimed.
