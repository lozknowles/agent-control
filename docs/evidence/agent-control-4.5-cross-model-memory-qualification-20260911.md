# Agent Control 4.5 physical cross-model memory qualification

Status: **EXPERIMENTAL — useful provider-neutral mechanism proven, requested
matrix and cross-node coverage incomplete**.

This evidence belongs to `feature/4.5-governed-skill-learning`. It does not
authorize a merge, tag, release, or deployment. Agent Control `v4.4.0` remains
the released baseline.

## What was physically exercised

Agent Control executed 12 real four-stage Work Parcels through the normal
`WorkParcelCoordinator` and provider adapters:

`writer model → verified ProjectMemoryPort write → new cold reader → independently verified next action`

The reader received project/task identity and bounded **Your Memories** recall,
not the writer transcript. Every stage retained its run ID, route, artifact
references, and sealed baton SHA-256. The common record schema was
`agent-control.project-memory/v1`; its first backend was structured Markdown in
an isolated directory viewable by Obsidian.

The full matrix ran from `2026-09-11T18:47:58.708Z` to
`2026-09-11T19:18:06.296Z`. Evidence packet SHA-256:
`168e639a56adf1fe8252b114d19b3a19554d4ee9a6d4091294b1a24ed99e0731`.

## Physical route inventory

| Route | Exact model | Node/runtime | Credential residency | Adapter | Result |
| --- | --- | --- | --- | --- | --- |
| Qwen | `qwen2.5-3b-instruct-q4_k_m.gguf` | hpubuntu / llama.cpp, loopback `:8080` | None | OpenAI-compatible | Available |
| GLM | `z-ai/glm-5.3-flash` | hpubuntu / OpenRouter Responses | Owner-only hpubuntu file reference, resolved only by adapter | OpenAI-compatible Responses | Available |
| Codex/Luna | `gpt-5.6-luna` | hpubuntu / Codex CLI | Opaque hpubuntu `CODEX_HOME` reference | `LocalCodexNodeExecutionPort` | Available |
| Sol | `gpt-5.6-sol` | hpubuntu / Codex CLI | Opaque hpubuntu `CODEX_HOME` reference | `LocalCodexNodeExecutionPort` | Available |
| Pixel E4B | `google/gemma-4-E4B-it` | Pixel 8 Pro / llama.cpp, Tailscale | None | OpenAI-compatible | Available; quality constrained |
| MSI Cottage Plus | unavailable | MSI / governed Codex node port | MSI-local isolated profile | `ResourceCodexNodeExecutionPort` | Blocked: `codex_chatgpt_auth_required` |
| MSI Lawrence Pro | unavailable | MSI / governed Codex node port | MSI-local isolated profile | `ResourceCodexNodeExecutionPort` | Blocked: `codex_chatgpt_auth_required` |

The Pixel model was the exact local Google **Gemma 4 E4B** artifact. A Gemini
service was not substituted. The temporary Pixel qualification server was
stopped after the final comparison.

## Writer → cold-reader matrix

| Writer | Reader | Writer node | Reader node | Memory source | Reader accuracy | Continuation | Context injected | Tokens | Latency | Cost | Contradictions | Result |
| --- | --- | --- | --- | --- | ---: | --- | ---: | ---: | ---: | --- | ---: | --- |
| GLM | Qwen | hpubuntu | hpubuntu | Your Memories / Markdown | 64.44% | No | measured in JSON | 3,281 | 24,113 ms | unavailable aggregate | 0 | FAIL |
| Qwen | GLM | hpubuntu | hpubuntu | Your Memories / Markdown | 100% | Yes | measured in JSON | 5,530 | 30,424 ms | unavailable aggregate | 0 | PASS |
| Luna | Qwen | hpubuntu | hpubuntu | Your Memories / Markdown | 37.78% | No | measured in JSON | 10,194 | 15,308 ms | unavailable | 0 | FAIL |
| Qwen | Luna | hpubuntu | hpubuntu | Your Memories / Markdown | 91.11% | No | measured in JSON | 17,347 | provider elapsed unavailable | unavailable | 0 | FAIL |
| Sol | GLM | hpubuntu | hpubuntu | Your Memories / Markdown | 100% | Yes | measured in JSON | 12,365 | 24,828 ms | unavailable aggregate | 0 | PASS |
| GLM | Sol | hpubuntu | hpubuntu | Your Memories / Markdown | 100% | Yes | measured in JSON | 19,340 | provider elapsed unavailable | unavailable aggregate | 0 | PASS |
| Luna | Sol | hpubuntu | hpubuntu | Your Memories / Markdown | 100% | Yes | measured in JSON | 16,590 | provider elapsed unavailable | unavailable | 0 | PASS |
| Sol | Luna | hpubuntu | hpubuntu | Your Memories / Markdown | 100% | Yes | measured in JSON | 24,128 | provider elapsed unavailable | unavailable | 0 | PASS |
| Pixel E4B | Qwen | Pixel | hpubuntu | Your Memories / Markdown | 0% | No | none | unavailable | unavailable | unavailable | 0 | FAIL — writer JSON missing |
| Qwen | Pixel E4B | hpubuntu | Pixel | Your Memories / Markdown | 64.44% | No | measured in JSON | 4,131 | 570,001 ms | unavailable | 0 | FAIL |
| Pixel E4B | Qwen | Pixel | hpubuntu | Your Memories / Markdown | 0% | No | none | unavailable | unavailable | unavailable | 0 | FAIL — reproduced |
| Qwen | Pixel E4B | hpubuntu | Pixel | Your Memories / Markdown | 82.22% | No | measured in JSON | 4,147 | 438,377 ms | unavailable | 0 | FAIL — reproduced |

Result: **5/12 passed**. All four strong-model pairings passed, as did
Qwen→GLM. Pixel→hpubuntu failed twice because E4B did not return parseable
structured writer JSON. Pixel as reader was physically reached twice but
omitted required state. No cross-node model-transition cell passed. The earlier
byte-identical hpubuntu→MSI Obsidian transfer remains valid portability evidence,
but is not relabelled as a model transition.

Codex CLI did not expose authoritative elapsed time for these calls. The raw
matrix's 0–1 ms values for some Codex rows are local retrieval bookkeeping, not
provider latency, and are therefore shown here as unavailable.

## A–D context comparison

The requested labels conflate a capability and a backend: **Your Memories** is
Agent Control's governed memory capability; Obsidian is one view/storage backend.
They are not two independent memory systems. Codex CLI also does not expose
ChatGPT product-level personal memory as a controllable input, so none was
fabricated.

The physically measurable comparison used a new Qwen invocation each time:

| Condition | Input | Accuracy | Total tokens |
| --- | --- | ---: | ---: |
| A | Bounded authoritative current context only | 100% | 519 |
| B | Your Memories through the Obsidian-viewable backend only | 90% | 1,826 |
| C | Current context plus Your Memories/Obsidian | 70% | 2,062 |
| D | Deliberately cold, no assistant transcript, Your Memories/Obsidian only | 100% | 1,874 |

The combined condition was not best. A separate GLM conflict probe correctly
rejected an untrusted claim that 4.5 was released and that nodes shared one
concurrently edited canonical note; it preferred the governed vault and exposed
both contradictions.

## Strong-model consolidation

Sol consolidated two real GLM/Qwen memories from 7,782 bytes to 2,633 bytes,
retained every required marker, and consumed 11,104 tokens. Monetary cost was
unavailable. This made the representation fit Pixel's 2,048-token context: the
original produced an authoritative HTTP 400 because its 2,801-token request
exceeded the limit, whereas the consolidated prompt was approximately 1,102
tokens.

The quality result was nevertheless negative:

| Reader | Original economical memory | Sol-consolidated memory |
| --- | ---: | ---: |
| Qwen | 100% | 70% |
| GLM | 100% | 80% |
| Pixel E4B | not admissible (context limit) | 0% (response JSON missing) |
| Average | 66.67% | 50% |

The observed score delta was **−16.67 points**. Occasional strong-model
consolidation is therefore **not justified by this sample**. It improved size
and edge-route admission but not verified reconstruction.

## Real POE path and recording

A successful independent run used the genuine production sequence:

`typed operator request → PoeRuntime → sealed proposal/approval → submitApprovedPlan → Sol writer → ProjectMemoryPort → sealed baton → cold Luna reader → independent integrity verification`

- POE conversation: `poe-conversation:828d9bdb-a402-4809-b62a-bf004fbe5110`
- Work Parcel: `parcel-social-82062acbd50b5c74f9ad18cd109d13d467f92d22de00ddb4f379f1ef21803fec`
- Writer run: `run-6c9eb702-6eb8-40fe-9f14-cd3509f53e1b`
- Reader run: `run-eba028d0-3812-41df-9813-c292d8b6fb0f`
- Memory SHA-256: `4ed7dd21153dc97eb67cf9c7ff7032bbf30ed3d3f93b355c864a54331dab7564`
- Reader baton SHA-256: `cabdead6bf45d9f8e5e1c3f43b4d12bb0288389b0e12b9f56d57c206a0feecb5`
- Writer: 8,894 tokens; reader: 15,550 tokens; reconciled parcel: **24,444 tokens**
- Reconstruction: 100%; continuation and independent verification: PASS
- Monetary cost: unavailable; not estimated

The 1920×1080 H.264 recording is 30.04 seconds and shows the exact retained POE
request, four lanes, memory persistence, baton, model change, per-leg accounting,
and verification. Browser errors: zero.

Two earlier genuine POE attempts failed closed. Qwen→GLM scored 91.11% but
omitted the exact implementation SHA from `currentState`. Sol→GLM scored 91.11%
but placed the evidence hash in `contradictions` rather than the required
`supportingEvidence` field. The second failure exposed an evidence-harness path
reuse defect and its detailed runtime file was overwritten by the subsequent
success; the observed parcel was
`parcel-social-b71e08360f49e4519e25da5c4ac15ff196407c437fcc7e8d34f28a2477aeba83`.
That loss is disclosed rather than reconstructed.

## Pisper finding

`feature/4.4-pisper-review` established that Governed Turn Snapshot Branching is
a useful provider-neutral primitive. It is **deferred** here: stateless
writer→reader provenance is already supplied by Work Parcels, batons, and
ProjectMemoryPort, so importing snapshot branching would broaden 4.5 without
repairing any observed failure.

## Evidence files

- [Full physical matrix](agent-control-4.5-cross-model-memory-qualification-20260911.json)
- [A–D and consolidation](agent-control-4.5-memory-conditions-consolidation-20260911.json)
- [Successful POE run](agent-control-4.5-poe-cross-model-success-20260911.json)
- [Failed Qwen→GLM POE run](agent-control-4.5-poe-qwen-glm-failure-20260911.json)
- [Canonical UX session](agent-control-4.5-cross-model-memory-ux-session-20260911.json)
- [Complete human-readable transcript](agent-control-4.5-cross-model-memory-complete-transcript-20260911.md)
- [HD recording](agent-control-4.5-cross-model-memory-qualification-20260911.mp4)
- [Recording screenshot](agent-control-4.5-cross-model-memory-qualification-20260911.png)
- [UX evidence manifest](agent-control-4.5-cross-model-memory-ux-manifest-20260911.json)

## Validation

- `npm run check`: PASS.
- TypeScript, bootstrap, dashboard JavaScript, infrastructure neutrality, and implementation-status checks: PASS.
- Deterministic suite: **1,138 passed, 0 failed, 0 skipped**.
- Staged Markdown link check: 6 files checked, 0 broken links.
- `git diff --cached --check`: PASS.
- Credential-pattern scan: no new credential material found in the changed files.

The first full check exposed a pre-existing mismatch between the 4.5 physical
qualification artefacts and the infrastructure-neutrality scanner. The fix
exempts only immutable `docs/evidence/` and `qualification/` evidence plus the
three explicit physical-qualification harnesses. Runtime code, configuration,
operator documentation, and all other scripts remain subject to the neutrality
check.

## Recommendation

**EXPERIMENTAL**.

The schema and governance boundary are provider-neutral and useful; real
Qwen/GLM/Codex/Sol writes, cold reads, batons, and continuation were proven.
The requested whole matrix did not pass, Pixel E4B remains too weak for this
structured contract, no MSI model transition was available, the combined
context condition regressed in this sample, and strong consolidation reduced
accuracy. Keep 4.5 isolated and gather a broader task corpus before considering
adoption or release.
