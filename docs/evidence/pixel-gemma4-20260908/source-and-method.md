# Pixel Gemma 4 qualification: source and method record

This file records preparation only. It is not a model qualification verdict.

## Identity

The requested names resolve to `google/gemma-4-E2B-it` and `google/gemma-4-E4B-it`, the instruction-tuned Gemma 4 models. They are distinct from Gemma 3n E2B/E4B. E means effective: Google describes E2B as 2.3B effective / 5.1B including embeddings, and E4B as 4.5B effective / 8B including embeddings. These counts are not measured RAM use.

Source: https://ai.google.dev/gemma/docs/core/model_card_4

The official model card and selected GGUF/LiteRT-LM repository metadata specify Apache-2.0. Retain the applicable licence and notices with redistributed artifacts; this task does not redistribute model weights. Model metadata and licence identifiers are saved in the adjacent JSON source records.

## Runtime paths

- llama.cpp: upstream supports Android/Termux. GGUF Q4_0 artifacts are selected from ggml-org, with revisions and expected LFS SHA-256 values in model-sources.json. E2B is 2,841,481,184 bytes; E4B is 4,590,807,392 bytes. Only a complete file matching the expected SHA-256 may be loaded.
- Gallery: upstream Gallery revision 33721326a9ff1682f66110430cebcc765c92d3fe, model catalogue 1_0_19, lists both Gemma 4 variants as Android LiteRT-LM models. Its generic packages are approximately 2.59 GB and 3.66 GB. The selected catalogue entries and expected hashes are retained. Gallery source at this revision declares LiteRT-LM 0.11.0. This is not proof that the installed Gallery version uses that library.
- The installed Pixel package reports Gallery versionCode 43. Its human-readable version, loaded weights, selected backend and inference output remain unverified while ADB is unavailable.
- Gallery standalone chat is not an Agent Control endpoint. No authenticated inference-serving API has been discovered or physically qualified for the installed app. MCP client/tool support must not be interpreted as an inference-serving API.
- GGUF Q4_0 and the Gallery LiteRT-LM packages are different conversions. Catalogue metadata does not establish equivalent quantisation. No strictly equivalent speed comparison is justified.

Sources:
- https://github.com/ggml-org/llama.cpp/blob/895c045fd104ced72132160245edcd6a86e50ba0/docs/android.md
- https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/tree/b4243c156154b6dca9324415f8c7ccc098b4aed1
- https://huggingface.co/ggml-org/gemma-4-E4B-it-GGUF/tree/b8093469224f83f5c38f691eb906c380e9e63114
- https://github.com/google-ai-edge/gallery/blob/33721326a9ff1682f66110430cebcc765c92d3fe/model_allowlists/1_0_19.json
- https://github.com/google-ai-edge/gallery/blob/33721326a9ff1682f66110430cebcc765c92d3fe/Android/src/gradle/libs.versions.toml

## Physical setup evidence

Pixel identity: Pixel 8 Pro / Android 17, confirmed through enrolled Termux SSH on port 8022 via qualification controller and Tailscale. Initial inspection showed 11,850,748 kB total RAM, 3,022,740 kB available RAM, and approximately 19 GiB free storage. Later snapshots must be read at their own timestamps.

llama.cpp was compiled physically on the Pixel at revision 895c045fd104ced72132160245edcd6a86e50ba0. It identifies itself as 0.4.0-dev, build 10856, Clang 21.1.8, Android aarch64. Binary SHA-256: 202b42092b6bdce81e2cdc0fa430ce5706a25821a4003a9007aceedcdfbd8e56.

The CPU build disables OpenMP and native host detection and targets armv8.2-a+dotprod. No Vulkan, TPU or Hexagon qualification is claimed. The build's optional web UI fell back from its versioned download to upstream latest; this does not establish a pinned UI artifact. Inference qualification uses the API, not that UI.

The ADB helper reports paired-disconnected, with no matching current mDNS service. Its stale device row is offline. The established ensure-connected path failed truthfully. No guessed debugging port, new pairing, rooting, unlocking or Android protection changes were used. Termux cannot read battery, thermalservice or power/thermal sysfs data under its current permissions. Those measurements remain unavailable.

## Frozen measurement method

Frozen suite SHA-256: 1b041ab749003b88363e90c373bdd63afbc7f85e485f0ad63636ecf64bcb7064.

Five exact prompts cover instruction following, typed JSON extraction, summary, executable Python, and uncertainty. Three sequential repetitions are planned. Settings: temperature 0, seed 42, max output 256, context 2048, thinking disabled. Full streaming events and complete outputs are preserved. Cache reuse is disabled in the request. Quality is checked separately from completion and speed. Summary and uncertainty require review against frozen criteria.

Process-cold model load is measured from process spawn to successful health response, including default runtime warmup. OS page-cache state is uncontrolled and is not described as a cold disk-cache measurement. No cache dropping is performed. First-content latency measured by the controller includes the private transport; it must not be relabelled as device-only TTFT. Runtime timings and runtime-reported token counts remain separate from client timing and character/byte counts.

Generated Python is intended to execute under bubblewrap with no network, read-only system libraries, only the candidate and verifier mounted, and a bounded timeout. Passing syntax or a model saying it is correct cannot replace executable results.

## Agent Control baseline and planned integration

Source release v4.0.0: ff7ed114c08b71583e2a2d67b40d081f0b0a4c33. Source release evidence identifies product checkpoint a08ccac5ced3cd399755bd084ff30fe224ab7860; the Pixel social continuation proves remote social ingress, not Pixel inference.

The primary development checkout was clean at f8552ae882d345520bca2049215d4e95274c88af on feature/adaptive-multi-model-orchestration-20260907. The existing daily workflow dashboard at qualification controller loopback port 19310 was running from a separate 3.9.0 runtime. Source release and live deployment are therefore different facts.

An isolated worktree was created at the isolated experimental worktree on qualification/pixel-gemma4-20260908 from v4.0.0. Existing OpenWA, WhatsApp, OmniVoice and Agent Control services were left in place. The canonical regression check passed 1,014 tests. This is software regression evidence only.

The existing provider-neutral OpenAI-compatible interface already supports explicit Pixel execution identity, routingEligible=false, and purpose=QUALIFICATION. The prepared harness uses those controls, a normal authenticated dashboard Work Parcel, the normal repository-review executor and product transcript runtime, plus an independent arithmetic root-cause gate. It does not introduce a model-specific adapter. It requires a real endpoint/model inventory before startup. No live integration pass is implied by preparation.

Ed's Flip7 will need its own artifact/runtime/backend qualification, actual device execution, available RAM, sustained timing, thermal/battery behaviour, Android lifecycle, private transport, Agent Control job, verification, transcript, recording and disconnection tests. Pixel evidence cannot qualify that device.