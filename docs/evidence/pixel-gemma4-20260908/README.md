# Pixel 8 Pro Gemma 4 qualification — 8 September 2026

Both models executed physically on the Pixel and completed a genuine authenticated Agent Control 4.0 repository-review job with an independently validated finding. This is **partial qualification for explicit experimental use**, not production eligibility. Gallery, battery/thermal behaviour and authoritative remote cancellation remain unqualified.

| Model / runtime | Standalone Pixel | Agent Control worker | Frozen quality | Routing verdict |
|---|---|---|---|---|
| Gemma 4 E2B-it / llama.cpp CPU Q4_0 | PASS | PASS for the recorded manual job | 9/15 | Experimental only; short checked summaries and explicit uncertainty responses |
| Gemma 4 E4B-it / llama.cpp CPU Q4_0 | PASS | PASS at 2,048 context with an explicit 8-minute job budget; earlier 4,096/4-minute attempt timed out | 12/15 | Experimental only; tiny verified coding/review work where latency is acceptable |
| Gemma 4 E2B-it / AI Edge Gallery | BLOCKED | BLOCKED | Not measured | Excluded: qualified UI/device transport unavailable; serving endpoint unverified |
| Gemma 4 E4B-it / AI Edge Gallery | BLOCKED | BLOCKED | Not measured | Excluded for the same reasons; installed package is not inference evidence |

PASS means the specified experiment succeeded. It does not mean model-wide quality, continuous duty, Android lifecycle, cancellation or production readiness passed. All workers were experimental, `routingEligible: false`, with no automatic roles. No merge, release tag or production routing change was made.

## Baseline and isolation

The device identified itself as Pixel 8 Pro, Android 17. At 06:52 UTC it reported 11,850,748 KiB total RAM, 3,273,144 KiB available RAM and about 18 GiB free storage. These are point-in-time observations, not guaranteed usable budgets. Existing runtimes, workloads, storage and services were inspected before installation. A pinned llama.cpp binary was compiled within an owned Termux cache directory; no rooting, bootloader change or Android protection change was performed.

The existing primary Agent Control checkout was on `feature/adaptive-multi-model-orchestration-20260907` at `f8552ae882d345520bca2049215d4e95274c88af`. Release source `v4.0.0` was `ff7ed114c08b71583e2a2d67b40d081f0b0a4c33`. The 4.0 release evidence's product checkpoint was `a08ccac5ced3cd399755bd084ff30fe224ab7860`. The existing daily live dashboard separately reported **3.9.0 Collingham daily**; a source release is not proof that this deployment is 4.0. These jobs used an isolated 4.0 dashboard/worktree based on the exact release commit, on branch `qualification/pixel-gemma4-20260908`.

The controller connected through the established Tailscale/Termux SSH identity on port 8022. Tailscale used DERP London during observations. Inference listened only on Pixel loopback, forwarded to controller loopback through authenticated SSH. The model API itself had no bearer key inside loopback; SSH identity/Tailscale and the authenticated dashboard provided the access boundaries. This does not isolate the listener from other processes within the same local trust boundary. No public inference listener was created.

The previously enrolled ADB helper repeatedly reported `paired-disconnected`, with no matching wireless-debugging service. Its old offline endpoint was not treated as qualified access. The user was asked to enable Wireless debugging while independent Termux work continued; no restored qualified connection was observed. Consequently Gallery UI, charging state, battery level, starting temperature and thermal readings could not be qualified. Termux battery/thermal service and sysfs attempts were unavailable or permission denied. Values are **unavailable**, not estimated. A normal Termux wake-lock request does not prove charging or screen state.

## Exact model and runtime identity

“Gemma 4 E2B/E4B” resolves to **`google/gemma-4-E2B-it`** and **`google/gemma-4-E4B-it`**, not Gemma 3n. The E names describe effective parameter sizes: approximately 2.3B/4.5B effective, with approximately 5.1B/8B total including embeddings. Official model/build metadata uses Apache 2.0; weight files are not redistributed in this evidence pack. See the [official Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [E2B repository](https://huggingface.co/google/gemma-4-E2B-it) and [E4B repository](https://huggingface.co/google/gemma-4-E4B-it).

| Physical GGUF | Source revision | Bytes | SHA-256 |
|---|---|---:|---|
| `ggml-org/gemma-4-E2B-it-GGUF`, `gemma-4-E2B-it-Q4_0.gguf` | `b4243c156154b6dca9324415f8c7ccc098b4aed1` | 2,841,481,184 | `8e30dff3ac4c8434c49a7036fa15564bdbb6044e42bf04550bf1a096ad7e6a52` |
| `ggml-org/gemma-4-E4B-it-GGUF`, `gemma-4-E4B-it-Q4_0.gguf` | `b8093469224f83f5c38f691eb906c380e9e63114` | 4,590,807,392 | `a555b900214b477d8880e7832e0b8925e139b0159640036b09fe472b6f2097f2` |

Both final files were hash-verified physically before loading. Failed/incomplete transfers were never treated as models. Only one model process was loaded at a time. Runtime: llama.cpp `0.4.0-dev`, b10856, commit `895c045fd104ced72132160245edcd6a86e50ba0`, built on Android aarch64 with clang 21.1.8. Binary SHA-256: `202b42092b6bdce81e2cdc0fa430ce5706a25821a4003a9007aceedcdfbd8e56`. Backend: CPU; 4 inference and batch threads, one slot, zero GPU layers, Jinja, reasoning off, default warmup and Android scheduling. CPU architecture was `armv8.2-a+dotprod`; OpenMP/native autodetection were disabled. [Pinned Android build guidance](https://github.com/ggml-org/llama.cpp/blob/895c045fd104ced72132160245edcd6a86e50ba0/docs/android.md). No GPU, NPU, vision or audio inference was qualified. An optional embedded web-UI download fell back to an unpinned latest asset; the tested API binary hash and build log are retained.

Gallery package `com.google.ai.edge.gallery` was installed, versionCode 43. Upstream Gallery source `33721326a9ff1682f66110430cebcc765c92d3fe` declares LiteRT-LM 0.11.0 and lists Gemma 4 LiteRT packages. That is source compatibility evidence, not the installed app's runtime/backend proof. Pinned candidate LiteRT-LM revisions/hashes are in `gallery-model-sources.json` and `gallery-artifact-hashes.json`. Catalogue RAM thresholds were 8/12 GB. LiteRT-LM packages differ from these GGUF Q4_0 builds; quantisation equivalence was not established and no cross-runtime speed comparison is claimed. Gallery chat/MCP-client support does not establish an Agent Control serving API.

## Frozen quality and performance

The exact five-prompt suite has SHA-256 `1b041ab749003b88363e90c373bdd63afbc7f85e485f0ad63636ecf64bcb7064`. Each task ran three times, sequentially, with context 2,048, temperature 0, seed 42, maximum 256 output tokens, thinking disabled and prompt caching disabled. Exact requests, complete streaming events, outputs, runtime timings and verifier results are retained. Coding ran in an isolated controller bubblewrap environment with no network, read-only inputs and bounded memory/CPU/time. Semantic reviews are explicitly assistant reviews, not human observations.

| Task | E2B | E4B | Evidence-based finding |
|---|---:|---:|---|
| Exact three-line instruction | 3/3 | 3/3 | Required colours/order/format followed |
| JSON-only extraction | 0/3 | 0/3 | Both wrapped otherwise useful JSON in Markdown fences; strict instruction failed |
| Two-sentence summary | 3/3 | 3/3 | Required dates, closure duration, returns and online services retained |
| Executable `unique_sorted` coding | 0/3 | 3/3 | E2B deduplicated but did not sort; E4B passed executable cases and preserved input |
| Explicit uncertainty | 3/3 | 3/3 | Both correctly declined to infer a sealed object's colour from weight |

| Measured metric | E2B | E4B |
|---|---:|---:|
| Initial process-cold load to healthy endpoint, context 2,048 | 17.277 s | 35.404 s |
| Client first content, range | 1.102–1.778 s | 3.859–10.259 s |
| Runtime generation tokens/s, min / median / max | 8.90 / 13.19 / 14.07 | 0.57 / 5.31 / 7.12 |
| Total response time, range | 1.370–6.880 s | 7.050–56.856 s |
| Five-response totals, repetitions 1 / 2 / 3 | 19.506 / 19.902 / 17.166 s | 107.757 / 58.748 / 62.734 s |
| Median tokens/s by repetition | 12.46 / 12.75 / 13.95 | 3.59 / 6.06 / 4.16 |
| Largest sampled benchmark RSS | 3,073,780 KiB | 3,131,220 KiB |
| Kernel process RSS high-water mark after benchmark | 3,208,204 KiB | 3,223,416 KiB |
| Lowest sampled system MemAvailable | 2,336,868 KiB | 1,366,340 KiB |
| Post-benchmark process swap | 82,424 KiB | 219,216 KiB |
| Requests completed / owned process termination | 15/15; none observed | 15/15; none observed |
| Battery, charging, temperature, thermal trend | Unavailable | Unavailable |

The cold-load measurement includes process launch and default warmup until health readiness; OS page-cache state was uncontrolled. It is not a disk-cold measurement. Client first-content latency includes the private HTTP/SSH path; it is not device-only TTFT. Token rates/counts come from runtime responses, while output character/UTF-8 byte lengths are separately retained per sample. No guessed token counts are reported as measurements.

E4B had a large first JSON response outlier and substantial variability; swap of 814,216 KiB was also observed during its early load/use. RSS excludes other memory costs and varies with paging. Neither three short repetitions nor the available telemetry establishes a thermal slowdown curve, sustainable duty cycle or immunity from Android process killing. E2B showed no monotonic slowdown in this short suite; that is not thermal qualification. Benchmarks are separate from integration: E2B integration overlapped E4B download and its latency is not a clean comparative benchmark.

## Genuine Agent Control execution

The browser authenticated normally and submitted the natural prompt through the normal parcel API. The existing provider-neutral OpenAI-compatible worker path performed inference on the Pixel; the controller owned the frozen repository and independent verifier. A deterministic planner selected the registered review job only; it did not supply the review answer. The fixture's `add` incorrectly returned `a - b`. Both accepted runs identified the faulty expression and recommended `a + b`, without changing the fixture.

First substantive transcript content is the complete initiating prompt:

> Review the frozen arithmetic fixture. Explain why add(2, 3) returns the wrong answer, identify the exact faulty expression, and recommend a correction. Do not modify any files. Verify the finding. Run only on the experimental Pixel model; do not substitute another model.

| Accepted run | E2B | E4B |
|---|---|---|
| Evidence directory | `e2b-integration-05` | `e4b-integration-02` |
| Run ID | `73ace0bb-ecf0-43af-8feb-a1f28056490c` | `ac76b94b-15fd-4909-9b1b-213ba2af9285` |
| Tested product commit | `b3d913d7a1f9007ff6babf218d3de1305b3bb640` | `4dbc189123f040ba791481ab103b82d7e1dca9a5` |
| Context / configured job budget | 4,096 / 4 minutes | 2,048 / 8 minutes |
| Result | SUCCEEDED_WITH_FINDINGS | SUCCEEDED_WITH_FINDINGS |
| Runtime-reported input / output / total | 308 / 405 / 713 | 308 / 344 / 652 |
| Fallback | None | None |
| Full transcript scroll / browser errors | PASS / none | PASS / none |

E4B's accepted job transitioned QUEUED → RESOLVING → RUNNING → VALIDATING → SUCCEEDED_WITH_FINDINGS, from 09:14:14 to 09:16:21 UTC. Its runtime reported 17.200 seconds prompt processing and 109.438 seconds generation, 126.639 seconds total model processing. Dashboard elapsed rounded to 128 seconds. The earlier E4B 4,096-context/4-minute attempt reached `DISCONNECTED` with `job_timeout_budget_exceeded:execution_state_unproven`; its complete evidence is preserved. Both context and budget changed for the successful profile, so the experiment does not isolate causality or prove all 4,096-context work fails.

Normal records retain routes, requests/responses, validated findings, transitions, accounting and transcript hashes. Job/parcel totals match the raw runtime responses. A limitation remains: the aggregate usage `source` field says `unavailable` despite numeric counts being present; raw HTTP/runtime records are the authority for their reported provenance. The dashboard labels context occupancy estimates separately. Costs and any unavailable usage are not fabricated.

The recordings show Jobs, Lanes, Models and Systems, provider execution node `pixel`, model/runtime, real state changes, the initiating prompt and the full scrollable natural transcript. They are screen recordings of real execution, not simulated demonstrations. MP4 conversion preserves timing; original WebM files are in the raw archive.

## Recovery and remaining gates

Both models underwent an in-flight private-forward disconnection after an actual model request began. The Pixel logs show task processing followed by cancellation and slot release. Agent Control recorded a transient transport failure, one retry on the same route, then FAILED. There was no replacement model. Interrupted requests have unknown usage, not zero usage or invented successful output.

Authenticated dashboard cancellation during reconnect backoff was also exercised. The normal records remained DISCONNECTED with cancellation cleanup unproven. Device-side abort evidence does not provide authoritative cancellation acknowledgment through the current generic client. **Truthful fail-closed reporting passed; complete governed cancellation/reconciliation remains BLOCKED.** This must be resolved before production eligibility. Earlier failed setup attempts and both final cancellation recordings' failed end-scroll assertions remain in the archive; they are not substituted for the two accepted success recordings.

Minimal generic changes preserve authenticated initiating provenance, show configured provider locality, project the sealed fallback policy accurately, preserve transcript scroll through refresh, and provide opt-in bounded physical qualification tooling. Model-specific identity, context and budgets remain configuration. No new model-specific provider implementation was necessary.

Ed's Flip7 requires independent device identity/connectivity, model/runtime compatibility and hashes, physical execution, quality, memory/storage, charging/thermal/sustained-load, Android lifecycle, recovery and dashboard/transcript tests. None of the Pixel or earlier controller results qualifies the Flip7.

## Evidence map

- `E2B-dashboard.mp4`, `E4B-dashboard.mp4`: accepted real dashboard recordings.
- `E2B-transcript.md`, `E4B-transcript.md`: complete normal product transcripts, byte-preserved against manifests.
- `E2B-benchmark-transcript.md`, `E4B-benchmark-transcript.md`: all 30 outputs with exact prompts and checks.
- `raw-evidence.zip`: all attempts, raw benchmark JSONL/SSE, telemetry, normal ledgers/transcripts/manifests, source recordings/screenshots, model/build/download logs, settings and reproduction scripts. No weights or authentication secrets.
- `reproduction.md`: exact private-path build, launch, benchmark and dashboard commands; use fresh state directories.
- `provenance.json`, `final-check.log`, `final-device-and-services.txt`, `SHA256SUMS.txt`: final commit/push, checks, cleanup and integrity evidence.

See provenance for the final evidence commit. The successful runs deliberately retain their actual earlier source SHAs; an evidence-only commit does not retroactively change which code executed.

Final verification: `npm run check` passed 1,015/1,015 tests, with no failures or skips. The staged evidence also passed all three infrastructure-neutrality checks and `git diff --check`; ten retained product transcripts matched their manifests. The owned Pixel model PID was gone and controller loopback ports 19481/19482/19483 were closed. Both final GGUFs and the runtime remain installed. Hash-verified redundant E4B parts were removed, reclaiming 4,590,807,392 bytes; final free storage was approximately 14 GiB. Existing protected services were active and primary/release HEADs unchanged. These are service/process observations, not a fresh WhatsApp conversation or voice playback test.
