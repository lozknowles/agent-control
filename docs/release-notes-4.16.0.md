# Agent Control 4.16.0

Agent Control 4.16.0 adds governed provider-neutral image and Blender workloads without introducing a second scheduler or provider-specific core semantics.

## Added

- `image.execute@1.0.0` as an ordinary Action/Job path with capability admission, privacy and route constraints, immutable Job-owned attachments, output hashing, provider provenance, budget enforcement and cancellation.
- A private-loopback ComfyUI adapter that advertises only the operations it implements and supports bounded submit, poll, retrieve and cancel behavior.
- `blender.execute@1.0.0` as an ordinary Action/Job path with source, parameters, inputs, stdout/stderr, scene hashes, artifacts, validation and cancellation receipts.
- Conservative Blender technique classification: a successful one-off is a reusable pattern, not an automatically qualified skill.
- Qualification scripts and deterministic tests for image/Blender Jobs, routing, attachments, budgets, provider incompatibility and cancellation.

## Qualification

- Supported Linux full regression passed at the integrated candidate: 2,348 tests, 2,348 passed, zero failed, cancelled or skipped. Publication requires and records the same complete gate at the exact release commit.
- A fresh local Qwen Image 2.1/ComfyUI Job produced a 768x768 PNG with retained output, workflow and model hashes. A separate cancellation Job stopped after three seconds, left no queued work and produced no image/evidence output.
- A fresh Blender 4.5.14 LTS Job created, saved, reopened, validated and exported a deterministic scene. A separate cancellation Job produced no receipt or scene files.
- The filesystem attachment integration test ingests real PNG bytes, maps the immutable source artifact into the next step and verifies Job identity and SHA-256 at a fixture edit provider. It is contract evidence, not physical Qwen edit qualification.

## Limits

- The qualified Qwen adapter supports text-to-image generation only. Edit, multi-edit, inpaint, outpaint, upscale and text-render workloads are rejected before execution.
- Image evidence is from one local GPU host and one generation workflow; latency was approximately 385 seconds. Visual assessment is inherently bounded.
- Provider charge was zero. Electricity, depreciation and complete monetary economics were not measured and are not claimed.
- Colab/A100 remains experimental. The authenticated optional attempt was blocked by existing-session capacity; no user-owned session was terminated.
- Historical automatic-video source was unavailable and is deferred from 4.16. Dashboard video presentation code is not treated as recording implementation evidence.
