# Agent Control 4.4 MARM memory qualification — 2026-09-11

Verdict: **PASS — PHYSICAL MEMORY EXPERIMENT**

Architectural classification: **C — GENERIC MEMORY ABSTRACTION**

## Executive summary

An isolated Agent Control Work Parcel compared the current governed reconstruction path with provenance-bound persistent memory over real released Agent Control history. Both arms answered 8/8 frozen questions correctly. Memory reduced supplied context from 6,022 to 550 estimated tokens and provider input from 7,844 to 1,608 tokens. Every accepted memory retained current source hashes. Adversarial memory did not override authoritative state.

This qualifies the technique, not a release implementation. MARM remains optional. No production state or protected service changed.

## Provenance

- Agent Control source: `c389a7a2fc79caeea021226532ec7fff05de7420` (`v4.3.0`), tree `46bbb130290a808bc3abbca58b2edea705df351c`
- Isolated branch: `feature/4.4-marm-memory-qualification`
- MARM source: `0b4013de9e854fccd211d7fdb8e35ff6596ec4a1`; runtime package 2.48.0
- Model: `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf`
- Endpoint: controller loopback llama.cpp-compatible service
- Hardware: Quadro P5000; 1,546 MiB free VRAM at start
- Protected services stopped: no
- Work Parcel: `parcel-97ea84f4-551c-4897-a428-37d9fe8d790a`
- Work Parcel stages: corpus, baseline, consolidate, memory, safety and compare; all `SUCCEEDED`

## Method

The corpus copied ten records totalling 353,504 bytes from current README, architecture, changelog, deployment, release notes and prior qualification evidence. Every copy was SHA-256 addressed. Two small qualification records quoted current architecture facts and included the original architecture hash to disambiguate repeated historical prose.

Arm A used Agent Control's current `GovernedRetrievalRuntime` with built-in exact/BM25 providers, Evidence Packets and current-source validation. Arm B used the same packets to create eight compact memories. Qwen generated only compact text and status; Agent Control bound complete provenance. MARM stored and embedded the records in an isolated SQLite database and performed semantic recall. Agent Control then required `CURRENT`, verified, same-task/scope memory with non-empty source references whose whole-file hashes still matched.

Both arms used new stateless model calls, the same model, frozen questions and deterministic required/forbidden answer checks.

## Measurements

| Measure | Arm A | Arm B | Result |
| --- | ---: | ---: | ---: |
| Correct | 8/8 | 8/8 | equal |
| Context bytes | 24,076 | 2,189 | -90.91% |
| Estimated supplied-context tokens | 6,022 | 550 | -90.87% |
| Provider input tokens | 7,844 | 1,608 | -79.50% |
| Cached input tokens | 7,836 | 497 | recorded, not used as sole benefit claim |
| Output tokens | 291 | 277 | -4.81% |
| Total tokens | 8,135 | 1,885 | -76.83% |
| Authoritative source files represented | 8 | 8 | equal |
| Retrieval operations | 8 | 8 | equal |
| Retrieval latency | 42 ms | 1,200 ms | memory slower by 1,158 ms |
| Model latency | 5,848 ms | 6,233 ms | memory slower by 385 ms |

Memory formation created eight useful candidates in 10,372 ms. Fourteen ingest requests included duplicate and adversarial controls; exact deduplication collapsed a duplicate and the resulting database held 12 embedded rows. Final database size was 262,144 bytes.

Monetary cost is **UNAVAILABLE**. The local backend did not report authoritative billing data. Current context occupancy is also **UNAVAILABLE**; supplied context size and cumulative provider usage are separate measures.

## Safety results

| Test | Result |
| --- | --- |
| Contradictory historical release records | PASS — current release answer retained |
| Superseded NVIDIA architecture | PASS — current `PARTIAL / DO_NOT_ADMIT / disabled` retained |
| Exact duplicate | PASS — native duplicate collapse observed |
| Similar-project false 9.9.0 fact | PASS — project filter excluded it |
| Different provider/session false 6.6.0 fact | PASS — session filter excluded it |
| Unverified false 8.8.0 fact | PASS — adapter rejected it |
| Missing-provenance false 7.7.0 fact | PASS — adapter rejected it |
| Superseded stale configuration | PASS — adapter rejected it |
| Authoritative source changed after formation | PASS — whole-file hash mismatch rejected memory |
| Source restoration | PASS — original SHA-256 restored |

The source mutation changed `944d59d915e1051ff17346bc734ca747943c38977a3e8b819aedc4fed9456282` to `17712e8065bc75a0d83bc516717fc7fbaa9ae01cecc456ed40fddbce6dcaa86a`; restoration returned to the original hash.

## Observed defects and limits

- The first harness revision registered Jobs before Actions and failed closed as `invalid_action`; registration order was corrected.
- Broad exact retrieval over repeated historical prose was correctly classified ambiguous. Each question was scoped to its authoritative record.
- Qwen altered an opaque evidence ID when asked to bind provenance. The design was corrected so Agent Control binds the complete packet; models never establish their own provenance.
- MARM `auto` recall missed release and deployment paraphrases in a bounded pre-final run. The final arm used explicit semantic mode and records this adapter requirement.
- Passing five semantic hits plus full provenance JSON initially increased context. The final adapter filters by verified current task scope and transmits only memory text plus an opaque packet reference; full hashes remain durable.
- The same local inference provider ran both arms. Cross-provider memory consumption and idle stronger-model switching remain unproven.
- Memory did not reduce source-provenance reads and was slower on this small corpus.

## Evidence integrity

- Raw result: `docs/evidence/agent-control-4.4-marm-memory-qualification-20260911.json`
- Raw result SHA-256 before repository copy: `a7bdce9a6852484d4460a48defb16211f036019a3f67dfb3e6fc926dd99a2c6a`
- Isolated database SHA-256: `64328a8809279f13d6ff6bfb0e063635b8224e3d0c6a8c5437645170373c158d`
- Full isolated database path is outside the repository and is not a product dependency.
- Evidence manifest: `docs/evidence/agent-control-4.4-marm-memory-manifest-20260911.json`

## Validation

- `npm run typecheck`: pass
- Python backend bytecode compilation: pass
- Governed physical experiment: pass; six of six Work Parcel stages succeeded
- `npm run check`: pass
- Complete deterministic suite: 1,119/1,119 passed; zero failed, skipped or cancelled
- `git diff --check`: pass

## Conclusion

The physical evidence supports a provider-neutral memory abstraction with MARM as an optional adapter. It does not support making MARM authoritative, mandatory, or a replacement for existing Agent Control state, evidence, batons, retrieval, cache or token-governor mechanisms.
