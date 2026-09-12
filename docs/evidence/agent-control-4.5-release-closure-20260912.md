# Agent Control 4.5 release-closure audit

Date: 2026-09-12
Verdict: **NOT READY FOR 4.5 RELEASE**

This report reconciles every historical Agent Control 4.5 release finding with
the frozen integrated candidate. It does not rewrite the historical evidence:
earlier failures remain truthful for the commits on which they were observed,
and later results are recorded as separate qualification evidence.

## Frozen source boundary

| Item | Value |
| --- | --- |
| Branch | `feature/4.5-release-closure` |
| Released baseline | `v4.4.0` |
| Current `origin/main` and merge-base | `2e74d88db57e3ad15ce1d85ec93220d087b9592f` |
| Frozen implementation candidate | `d229ce4b7dd3bd704a331f81ca59600541430682` |
| Version | `4.5.0` |
| Candidate relation to main | 4.5 integration commits applied after the current `origin/main` merge-base |
| Release action | None; no merge, tag, release or deployment performed |

The candidate combines the 4.5 Environment Discovery/Estate Map and Runtime
Map work with the governed skill-learning, Your Memories, Session Vault,
Morrow and MiniCPM qualification-safety changes. Agent Control 4.6 remains a
documentation-only backlog; no 4.6 implementation is included.

## Complete automated validation

`npm test` completed against the exact candidate with **1,312 passed, 0 failed,
0 skipped, 0 cancelled and 0 todo**. The final documentation/evidence checkpoint
also runs TypeScript, bootstrap, dashboard, infrastructure-neutrality,
implementation-status, Markdown-link, whitespace and secret-safe validation.
The final command results are recorded in the evidence manifest beside this
report.

## Fresh physical dashboard and runtime evidence

### Runtime Map / Process Map

The exact candidate created a genuine eight-stage Work Parcel,
`parcel-b97e3004-e64a-4d25-8357-4da283d4a191`. Six root jobs overlapped for
5,235 ms, then aggregation and independent verification completed. The final
projection contained 71 nodes, 75 edges, 62 successful nodes, one truthful
degraded/retry node, zero failed nodes, eight groups and 72 authoritative
events. All eight stage batons were present.

One real local Qwen invocation reported 68 input tokens, of which 67 were
cached and one was freshly processed, plus 28 output tokens and 96 total tokens.
Token authority was authoritative; monetary cost was unavailable and remains
unclaimed. Replay, graphical Compare, Control Room, live session inspection,
grounded Morrow status, Process Map to Estate Map linking, and execution survival
through viewer disconnect all passed. Compare shows the 13-operation baseline
`parcel-c43b103a-3b61-4f6a-bc21-7b07ddcf2093` beside the 71-operation candidate.

The 1920×1080, 25 fps recording is 63.84 seconds and 13,155,335 bytes:

`qualification/agent-control-4.5-release-closure-20260912/runtime-map/agent-control-4.5-runtime-map-six-job-visual-acceptance.mp4`

SHA-256: `b539bda2d58e4156f14a6eb34209e5b019df12399eb7229b5d5ad72c0a455256`

### Environment Discovery / Estate Map

A read-only local physical scan produced inventory
`discovery-0d25bda3-59d2-4b32-9931-a3c6d19d337e`: nine resources, including one
machine, one GPU, one local model, one agent, one tool and one memory source.
Six were healthy, three required qualification and none was reported unavailable.
The Estate Map projected 10 nodes and nine edges with LIVE freshness from the
governed discovery inventory. It created no proposal and changed no
configuration. The isolated scan did not configure remote discovery, so it is
not represented as proof of a whole-estate remote rescan.

The 1920×1080, 25 fps recording is 7.76 seconds and 2,078,595 bytes:

`qualification/agent-control-4.5-release-closure-20260912/environment-discovery/agent-control-environment-discovery-physical.mp4`

SHA-256: `a644fb76332a3265082121d64f0788b19af074929783d9bfd916498b2290ebcf`

The README uses real captures from these two exact-candidate runs, including
the populated Estate Map, six-job Process Map, Control Room and graphical
Compare. They are not mockups.

## Historical 12-row Your Memories matrix reconciliation

The rows below retain their original route identities. A later success on a
different provider is supplemental evidence, not a relabelling of the historical
route. Likewise, the two Pixel public aliases map to one physical route and the
fresh run is counted once as execution evidence while reconciling both rows.

| # | Historical writer → reader | Historical terminal state | Frozen-candidate reconciliation | Current classification |
| ---: | --- | --- | --- | --- |
| 1 | OpenRouter GLM-5.3-Flash → local Qwen | `BLOCKED_EXTERNAL`; historical semantic score 64.44% | Exact OpenRouter route remains credential-blocked. A separate production run proved the exact `z-ai/glm-5.3-flash` model through the qualified NVIDIA adapter → local Qwen at 100%, without changing this route's identity. | `BLOCKED_EXTERNAL`; `ALTERNATE_PROVIDER_PASS` |
| 2 | local Qwen → OpenRouter GLM-5.3-Flash | `PASS` | Historical physical semantic and continuation pass preserved. | `PASS` |
| 3 | Codex Luna → local Qwen | `FIXED` | Canonical ProjectMemoryExchange repair remains valid at 100%. | `FIXED` |
| 4 | local Qwen → Codex Luna | `FIXED` | Canonical ProjectMemoryExchange repair remains valid at 100%. | `FIXED` |
| 5 | Codex Sol → OpenRouter GLM-5.3-Flash | `PASS` | Historical physical semantic and continuation pass preserved. | `PASS` |
| 6 | OpenRouter GLM-5.3-Flash → Codex Sol | `PASS` | Historical physical semantic and continuation pass preserved. | `PASS` |
| 7 | Codex Luna → Codex Sol | `PASS` | Historical physical semantic and continuation pass preserved. | `PASS` |
| 8 | Codex Sol → Codex Luna | `PASS` | Historical physical semantic and continuation pass preserved. | `PASS` |
| 9 | Pixel Gemma 4 E4B → local Qwen | `FIXED` | Repeated writer success remains preserved. | `FIXED` |
| 10 | local Qwen → Pixel Gemma 4 E4B | `UNSUPPORTED`; schema-valid but exact-action semantic failure | Fresh physical run passed the unchanged semantic verifier after the writer prompt required the exact bare operation token. | `FIXED` |
| 11 | Pixel Gemma 4 E4B public alias → local Qwen | `FIXED` | Alias of the same physically passing writer capability; no second execution is invented. | `FIXED` |
| 12 | local Qwen → Pixel Gemma 4 E4B public alias | `UNSUPPORTED`; alias of row 10 | Same fresh physical route as row 10; one execution reconciles both public aliases. | `FIXED` |

The exact-route total is now **11/12 PASS or FIXED**, with row 1 still
`BLOCKED_EXTERNAL`. The supplementary NVIDIA-hosted GLM→Qwen run proves the
model pair and provider-neutral adapter path, but does not convert the
OpenRouter-specific row into a pass.

### Fresh GLM→Qwen evidence

`nvidia-hosted/default/glm-5.3-flash@hpubuntu` →
`local-qwen/default/qwen-hpubuntu@hpubuntu` completed Work Parcel
`parcel-social-262dc8fa88985a83c5a4c83fe202e4a1f177b5c49641d1179bf97ac6f6c205d6`.
Both first attempts were valid JSON, application-schema valid and semantically
valid, with 100% reconstruction and a verified continuation. The reader baton
SHA-256 is `39b2ffbb0b29ae0f1829ffe6e218b09e7f99757e19a8930489c98db3577f4f56`.
Usage was 1,040 input, 594 output and 1,634 total tokens. Tokens were
authoritative; cost was unavailable.

### Fresh Qwen→Pixel evidence

`local-qwen/default/qwen-hpubuntu@hpubuntu` →
`pixel-llama/default/pixel-gemma-e4b@pixel-8-pro` completed Work Parcel
`parcel-social-6ef9441202d282342c0d13c0d4a3817f75a95a2d89f060eae21434e905a04baa`.
Both first attempts were schema-valid and semantically valid, with 100%
reconstruction and a verified continuation. The reader baton SHA-256 is
`00e680af0c9dfd0bb0d11598f37f753d60160712e1488f9b4dda2d59f5a5ebc0`.
Usage was 1,121 input, 666 output and 1,787 total tokens, including one cached
input token. Tokens were authoritative; cost was unavailable. The Pixel service
remained resident; qualification used the existing Termux SSH path and a bounded
temporary tunnel that was removed after the run.

## Historical release-gate reconciliation

No gate is removed from the earlier 12-gate report.

| Historical gate | Earlier state | Frozen-candidate state | Finding |
| --- | --- | --- | --- |
| Governed deterministic-skill lifecycle | `PROVEN` | `PROVEN` | 45/45 prior physical executions, rejection and fallback retained. |
| Your Memories cross-model matrix | `BLOCKED_EXTERNAL` | `PARTIAL` | 11/12 exact route rows pass/fixed; OpenRouter GLM→Qwen remains externally blocked, with a separately proven NVIDIA-hosted realization. |
| Provider-neutral route qualification | `PROVEN` | `PROVEN` | Exact provider/account/model/node and contract identities continue to fail closed. |
| MSI cross-node memory transition | `PROVEN` | `PROVEN` | Cottage Plus/Luna → Lawrence Pro/Sol evidence remains valid, independently verified and token-reconciled. |
| Strong-model memory consolidation | `PROVEN` | `PROVEN` | The later Qwen/Sol average improvement from 86.37% to 90.91% remains the authoritative consolidation result. |
| Specialist-model energy advantage | `DISPROVEN` | `DISPROVEN` | The specialist used more measured-component joules per verified result than warm Qwen. This negative result remains visible and no energy-saving route is admitted. |
| Deterministic reuse benefit | `PROVEN` | `PROVEN` | 99.37–99.45% measured-component reductions for bounded deterministic operations remain valid. |
| Fallback after deterministic rejection | `PROVEN` | `PROVEN` | Changed-input rejection and governed Qwen fallback remain valid. |
| Production POE Work Parcel | `PROVEN` | `PROVEN` | The POE-created route-rejection/escalation run remains checksummed historical evidence. |
| Warm residency route effect | `DISPROVEN` | `DISPROVEN` | Observed delta remained below measurement uncertainty; no residency-based routing policy is admitted. |
| Whole-node power claim | `BLOCKED_EXTERNAL` | `BLOCKED_EXTERNAL` | No synchronized whole-node meter exists on the qualified estate. GPU-board or CPU-package measurements are not promoted to whole-node claims. |
| Exact-candidate HD recording | `PROVEN` for prior candidate | `PROVEN` for `d229ce4…` | Fresh exact-candidate Runtime Map and Estate Map recordings and screenshots are preserved. |

## Remaining 4.5 feature audit

| Feature or boundary | Classification | Evidence/result |
| --- | --- | --- |
| Estate Discovery and Estate Map | `PROVEN` | Fresh read-only physical scan, live map, drill-down, zero mutation. |
| Process Map LIVE/HISTORICAL, MAP, Control Room, Replay and Compare | `PROVEN` | Fresh six-job run and 13-vs-71 graphical comparison. |
| Parallel Work Parcels, aggregation and verification | `PROVEN` | Six concurrent roots, eight stages, aggregation and independent verification. |
| Baton, retry and degraded evidence | `PROVEN` | Eight sealed batons and one genuine recovered retry retained. |
| Model/cache/memory accounting | `PROVEN_WITH_LIMITATIONS` | Authoritative token/cache values retained; monetary cost unavailable; exact OpenRouter row remains blocked. |
| Runtime/transport integrity and governed execution | `PROVEN` | Existing fail-closed contracts and physical runtime paths retained. |
| Dashboard disconnect safety and redaction | `PROVEN` | Viewer disconnect did not affect execution; browser/security checks report no credential leakage. |
| Session Vault / Your Memories / Obsidian-independent operation | `PROVEN_WITH_LIMITATIONS` | Existing A–H and cross-node evidence retained; user-facing memory stays advisory and source-linked. |
| MiniCPM5-2B Q4_K_M governed code repair | `FAILED` | 0/3 GPU, 0/1 comparable remote Linux seed and 0/3 CPU. Known-good and scripted controls pass; only the exact immutable configuration is denied, not the model family. |
| Specialist energy-saving hypothesis | `DISPROVEN` | More measured-component energy than warm Qwen; no positive training break-even. |
| Warm-residency energy route effect | `DISPROVEN` | Below available measurement uncertainty. |
| Whole-node energy | `BLOCKED_EXTERNAL` | Required synchronized meter unavailable. |

## Evidence index

- Machine-readable closure:
  `qualification/agent-control-4.5-release-closure-20260912/release-closure.json`
- Closure evidence manifest:
  `qualification/agent-control-4.5-release-closure-20260912/evidence-manifest.json`
- Runtime Map report, complete transcript, screenshots and video:
  `qualification/agent-control-4.5-release-closure-20260912/runtime-map/`
- Environment Discovery report, complete transcript, screenshots and video:
  `qualification/agent-control-4.5-release-closure-20260912/environment-discovery/`
- Fresh GLM→Qwen evidence:
  `qualification/agent-control-4.5-release-closure-20260912/memory-glm-to-qwen/`
- Fresh Qwen→Pixel evidence:
  `qualification/agent-control-4.5-release-closure-20260912/memory-qwen-to-pixel/`
- Preserved historical completion matrix:
  `qualification/agent-control-4.5-release-gate-completion-20260912/memory-matrix.json`
- MiniCPM exact-configuration closure:
  `docs/evidence/minicpm5-2b-qualification-closure-20260912.md`

## Finite release blockers

1. The mandatory specialist-energy advantage is **DISPROVEN** for the qualified
   specialist; the candidate cannot truthfully claim the required beneficial
   energy route.
2. The mandatory warm-residency routing benefit is **DISPROVEN** at the available
   measurement resolution; no residency-based policy may be enabled from this
   evidence.
3. Synchronized whole-node power remains **BLOCKED_EXTERNAL** because the estate
   has no suitable whole-node meter. Component/board measurements cannot close
   that gate.

The exact OpenRouter GLM→Qwen route remains a visible provider-specific
limitation, and the exact MiniCPM configuration remains a visible failed model
qualification. Both fail closed and neither is concealed as a pass.

## Final recommendation

**NOT READY FOR 4.5 RELEASE**

The integrated candidate, full regression, physical dashboard evidence and
memory remediations are reviewable, but the original mandatory physical power
acceptance criteria are not all satisfied. No merge, tag, release or deployment
is authorized by this report.
