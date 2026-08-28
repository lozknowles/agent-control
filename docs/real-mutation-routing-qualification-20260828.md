# Real-mutation routing qualification — 2026-08-28

## Verdict

**PARTIAL.** The real-mutation execution and correctness gates passed, but automatic production context-profile routing did not demonstrate the predeclared resource or latency advantage. Production remains observational and applies STANDARD.

## Frozen identities

- Baseline release: `v3.1.0` / `eaa1d4904b6d91b0149ee36f693499c2c663276f`
- Harness freeze: `bfd48963deddee7c6fa5b9683221ea507ed09af6`
- Final qualification code and suite: `0087fe19fda09de7a6ce2477e62f835de1acee29`
- Fixture SHA-256: `628e659cb1f1151b50c38319d0747857b030514235bcaf02d823353a696635a1`
- Suite JSON SHA-256: `b102de69d4f9a50a0f1f741513e89cd0d22920600b3e6707659daa765774f5fc`
- Authoritative ignored full report SHA-256: `25b12fc173e811d493ef2e032037d5c80641bd1897cfdf686bc02a5cf1e488c8`

The first suite freeze was superseded before held-out execution because development task MUT-012 referred to documented escalation reasons that the fixture did not actually list. The public architecture contract was corrected, all reference/non-satisfying gates were rerun, and the suite was resealed. No held-out task had been executed at that point.

## Satisfiability and split

- 24 deterministic repository-mutation tasks.
- 15 development tasks and 9 held-out tasks.
- All 24 independent reference mutations passed.
- All 24 non-satisfying in-scope mutations were rejected by their hidden verifier.
- The canonical Agent Control checkout was never used as an agent mutation target.

## Final same-model result

Execution model: `gpt-5.4` through the existing authenticated ChatGPT-plan CLI adapter. The model could request only the typed `mutation.repository.edit` tool. ToolPolicy, live authority, disposable workspaces and independent verification remained outside the model.

| Strategy | Verified | Held-out | Fresh input | Cached input | Output | Processed / verified | Median latency | Escalations | Verifier failures | Timeouts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| STANDARD | 24/24 | 9/9 | 111,012 | 207,872 | 13,089 | 13,832.2 | 14,407 ms | 0 | 0 | 0 |
| Predicted adaptive | 24/24 | 9/9 | unknown | unknown | unknown | unknown | 14,234 ms | 1 | 1 | 1 |

Predicted routing selected THIN, STANDARD and DEEP directly from the frozen explainable classifier. One held-out STANDARD-profile attempt timed out, classified the failure, escalated once to DEEP and then verified. The failed invocation supplied no usage object, so cumulative predicted token totals remain unknown rather than being invented or discarded.

Median latency improved by approximately 1.2%, below the predeclared 5% production gate. The completion-boundary experiment was also rejected before freeze: it retained 1/3 verified outcomes while increasing processed tokens by 53.9% and latency by 44.2% against bounded verifier repair.

## Gate decision

Passed:

- sample size;
- at least 95% overall verified success;
- no verified-success regression versus STANDARD;
- at least 95% held-out verified success;
- no held-out regression versus STANDARD;
- bounded classified escalation;
- ToolPolicy, stale lease, stale ownership and human takeover;
- STANDARD fallback;
- provider/model neutrality.

Failed:

- meaningful cumulative resource or latency improvement.

Therefore automatic production routing is not enabled. The evidence supports model capability, real typed mutation, immediate profile classification and bounded recovery, but not a claim that predictive routing is cheaper or materially faster.

## Cost and cache

STANDARD cache effectiveness was 65.2%. Predicted cumulative cache effectiveness is unknown because provider usage was unavailable for the timed-out invocation. Monetary cost per verified outcome remains unknown; the ChatGPT-plan adapter exposes no authoritative per-run price.

## Evidence locations

- Full ignored JSON: `qualification-results/final-production-routing-v2.json`
- Full ignored Markdown: `qualification-results/final-production-routing-v2.md`
- Patch evidence: `qualification-results/final-production-routing-v2-evidence/`
- Machine-readable tracked summary: `artifacts/real-mutation-routing-qualification-20260828.json`

