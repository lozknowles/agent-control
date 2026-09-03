# Agent Control 3.8 development qualification

Verdict: **SUPERSEDED BY PHASE 2 PASS**. This document preserves the first development checkpoint. The release-candidate decision and later physical evidence are in [Agent Control 3.8 Phase 2 qualification](agent-control-3.8-phase2-qualification.md).

## Provenance and scope

- Base: released `v3.7.0`, commit `41ae59c6bd0e0228e419a91959efe7130fe086f2`.
- Branch: `feature/3.8-governed-retrieval-context-intelligence`.
- No merge, tag, release or live deployment was performed.
- zg review: official [`zvec-ai/zvec-grep`](https://github.com/zvec-ai/zvec-grep), source commit `81a80f478f2d3ec76556cd3c993d0d064cc9580a`, package 0.2.1.

## Implementation evidence

The production parameterized repository-review executor now performs optional retrieval before provider invocation. It records intent/attempt decisions, builds a bounded packet tied to repository state, compiles it as existing task context, adds packet/hash provenance to the Work Parcel, and puts portable evidence references into any 3.7 baton. Retrieval failure records its sanitized reason and keeps the immutable frozen chunk. The redacted projection and typed lifecycle events use the existing HTTP/SSE service.

Exact and BM25 are built in. zg is a search-only optional adapter using the documented `query --hybrid|--vector`, compact preview, bounded limit and wait-for-fresh options. The execution port contains no index build/rebuild/drop operation. The independently authorized benchmark index contained 524 files/5,640 entities and cost 21.41 seconds with 954,000 KiB peak RSS; no monetary/electricity estimate is invented.

## Retrieval benchmark

Five frozen repository questions tested exact symbol, exact error, configuration, architecture and cross-file concepts. Correct-file evidence was checked before model use.

| Lane | Correct retrieval | Estimated input tokens | Peak packet | Retrieval latency |
| --- | ---: | ---: | ---: | ---: |
| A repeated full repository | 5/5 | 5,957,300 | 1,191,460 | n/a |
| B built-in exact/BM25 | 2/5 | 8,263 | 2,048 | 486 ms |
| C zg 0.2.1 hybrid | 5/5 | 5,437 | 1,346 | 12,299 ms |

Against Lane A, Lane C reduced estimated injected tokens by 99.91% while preserving 5/5 retrieval correctness. Lane B reduced tokens by 99.86% but failed the quality gate, so its current ranker is not approved for automatic broad/conceptual routing. Full details are machine-readable in [retrieval benchmark](agent-control-3.8-retrieval-benchmark.json).

## Local-model result

A real loopback Qwen2.5 3B Instruct model answered one repository question from each lane and passed the same deterministic answer-term verification. Provider-reported input was 20,912 tokens for 90 KB broad context, 2,480 for built-in retrieval, and 1,556 for zg evidence. This supports the hypothesis for one bounded read task, not for coordinated mutation or automatic routing. See [local-model evidence](agent-control-3.8-local-model-retrieval.json).

## Security and failure gates

- LOCAL is the default and REMOTE requires both policy and per-intent permission.
- API/dashboard packets omit evidence text, repository root and raw provider output.
- Search/inspect capabilities are distinct from `retrieval.index.manage`.
- Git/index mismatch becomes INVALID; dirty mismatch becomes POSSIBLY_STALE.
- Missing index/provider/vector/MCP/zg degrades through available providers and then immutable context.
- Context pressure shrinks evidence; lifetime token totals are not used as occupancy.
- Existing 3.7 handoff/recovery and aggregate accounting tests remain passing; evidence references do not replace portable baton state.

## Validation

- `npm run check`: PASS. TypeScript, bootstrap scripts, dashboard JavaScript, infrastructure-neutrality checks, implementation-status checks, and all 680 deterministic tests passed (0 failed, 0 skipped) after the final path/index hardening delta.
- The focused governed-retrieval/provider-technique, production-integration, API/SSE and dashboard gate passed 48/48 tests.
- Repository Markdown link scan: PASS. All 392 local links across 104 Markdown files resolve.
- `git diff --check`: PASS.
- The temporary benchmark index was moved out of the worktree after measurement; no generated `.zvec-grep`, model payload, credential, repository absolute path, or raw provider response is included in the branch.

## Phase 2 resolution

Phase 2 constrained weak retrieval with observable sufficiency signals and governed fallback, ran the frozen 12-task physical mutation comparison, measured a real retrieval-derived baton handoff, qualified restart rehydration and source-hash invalidation, exercised zg failure modes and introduced generic index resource policy. The same Qwen2.5 Coder 3B model verified only 2/12 in every lane, so no expanded model capability is claimed. The complete current verdict, measurements and limitations are recorded in [human-readable Phase 2 evidence](agent-control-3.8-phase2-qualification.md) and the [machine-readable summary](agent-control-3.8-phase2-qualification.json).
