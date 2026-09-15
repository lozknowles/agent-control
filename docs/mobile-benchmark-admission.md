# Mobile model benchmark: admission checkpoint

Status: INCOMPLETE. No best overall Pixel model has been established.

## Source and architecture

Public base: `57c593b4f88965acc54239f6c1a5321329ce6cef` (Agent Control 4.8.0).
Isolated branch: `experiment/mobile-model-qualification-20260915`.
Changes remain uncommitted and unpublished. This is an experimental implementation, not a released capability.

The generic model/hardware qualification job commissions immutable, hash-bound requests through WorkParcelCoordinator and JobRuntime. It records fixtures, configuration, admissions, raw responses, deterministic quality verdicts and physical observations in the native ArtifactStore. Canonical model-invocation accounting joins the existing ledger, process map, Node Dashboard and Run Inspector. The Benchmark tab is conditional on retained Lab evidence. Ordinary devices gain no empty benchmark panels.

A transport-neutral llama.cpp adapter receives its target, transport and resource admission policy from configuration. Pixel identifiers, private endpoints, model paths and temporary service-restoration instructions are private qualification configuration, not benchmark-core assumptions. An hpubuntu CPU smoke exercised the same job and adapter using a different execution transport.

Comparison groups retain both case and configuration hashes. Descriptive performance statistics do not discard quality failures, infer missing counters as zero, or declare an overall winner. Reports render the same checksum-validated native artifacts used by the dashboard.

## Physically demonstrated

- Pixel 8 Pro / Android 17 / Tensor G3 / Termux, existing CPU llama.cpp runtime build 10856, commit 895c045fd.
- Gemma 4 E2B Q4_0: 12 attempts, 12 executions succeeded, 9 deterministic quality passes and 3 strict JSON failures.
- Gemma 4 E4B Q4_0: 12 attempts, 12 executions succeeded, 9 deterministic quality passes and 3 strict JSON failures.
- Both selected the correct read-only tool but wrapped their JSON in Markdown fences. The original outputs and failed verdicts remain unchanged.
- Qwen3 0.6B Q8_0: 27 executions succeeded across nine cases, with 9 strict output-contract passes. All three 1,146-input-token retrieval attempts returned the wrong marker. Extracted Python functions passed six sandbox checks each; extracted structured JSON passed its schema, without altering the original format failures. Exact-wording summary failures are a fixture limitation, not proof that all extracted facts were wrong.
- Original idle model service was temporarily suspended under explicit operator approval and restoration was confirmed after every Pixel attempt.
- hpubuntu: three Qwen2.5-3B instruction checks passed through the same benchmark abstraction. This is cross-target execution proof, not a comparative performance qualification.

Each call used a new owned runtime process. Filesystem caches were not cleared. Short responses do not establish sustained generation speed. SmolLM3 3B Q4_K_M completed 11 physical executions after verified transfer: six strict passes and five formatting failures. A 40 C battery admission stop prevented remaining cases. The original v7 collector incorrectly created 16 failed accounting entries for pre-dispatch denials. The separate source-bound assessment in `smol-results-v1` preserves and identifies those original entries; 27 accounting entries are not 27 executions. Broader Smol qualification remains incomplete.

## Automated and visual qualification

Fresh complete suite after cancellation/deadline classification: 1,620 passed, 0 failed, 0 skipped; 168.61 seconds. Linux 6.8.0-139, Node v24.21.0. Type checking and focused metadata safety tests passed.

Browser qualification used actual retained Pixel invocations at desktop 1440x1000, portrait 390x844 and landscape 844x390. Estate -> Pixel -> benchmark run -> exact invocation -> input/output -> readable history -> Markdown download passed, with reduced motion and no browser errors. Recorded physical RAM/storage observations now survive the explicit safe metadata projection. Browser viewport checks are not physical phone UI qualification. Historical observations remain labelled as recorded/stale rather than live.

## Evidence and reproducibility boundaries

Native private evidence: `/fast/qualification/pixel-local-models-20260915`.
Latest generated exports: `report-checkpoint-v3` (54 native model invocations; Markdown, JSON, CSV, SVG, SHA256SUMS) and `measured-checkpoint-v1` (concise results and limitations).
Browser evidence: `browser-evidence-v6` and `qwen-final-browser-evidence`. Read-only previews independently returned 401 without authentication, 200 for authorised reads and 403 for attempted mutation.
Convenient local copy: MSI Downloads / Agent-Control-Pixel-Benchmark-20260915.
Private evidence includes device-specific identifiers and is not approved for automatic publication.

## Mandatory work remaining

1. Finish compatible candidate admission and broader physical workload coverage.
2. Expand summarisation, coding and retrieval comparisons beyond the completed Qwen cases; qualify sustained thermal/battery behaviour and practical context limits.
3. Qualify cancellation and recovery of a remotely owned runtime if its controller or transport disappears; do not equate normal finally-based restoration with interruption recovery.
4. Automatic checkpoint continuation remains unsupported. Reusing an existing run was tested and safely refused without changing its historical artifacts. Automated cancellation and timeout controls preserve separate statuses and a fresh restoration signal; these do not qualify physical transport-loss recovery.
5. Complete comparative suitability classifications using both quality and performance, with enough sustained observations.
6. Preserve unavailable GPU utilisation/power/throttling as unavailable until a defensible collector exists.
7. Keep private qualification wrappers separate from generic product changes before any integration review.

No push, merge, tag, release or operational deployment was performed.

## Corrections demonstrated during physical qualification

The public benchmark projection now exposes numeric `ttftSeconds`, validated as finite and nonnegative, without relaxing generic secret redaction or changing canonical timing records. API and desktop/portrait/landscape checks confirmed the retained latency is visible.

Typed admission blocking now stops subsequent dispatch, retains an evidence reference, reports BLOCKED, and bypasses model accounting for the unstarted attempt. Unknown token values remain unavailable, never measured zero. Focused controls cover denial before any model call and after a completed call, including restoration. Historical v7 accounting is not rewritten.

The optional official Qwen2.5 7B Q4_K_M files total 4,683,073,632 bytes. A governed storage observation projected 5,330,642,848 bytes remaining, below the retained 5 GiB floor. No 7B download or execution occurred; this is not proof of incompatibility.
