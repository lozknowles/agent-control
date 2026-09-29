# Governed image and Blender capability boundaries

Agent Control owns the job, policy, routing, cancellation, evidence and artifacts. Providers and application adapters execute bounded operations; they do not become independent schedulers.

## Image workloads

The provider-neutral operations are `image.generate`, `image.edit`, `image.multi_edit`, `image.inpaint`, `image.outpaint`, `image.upscale` and `image.text_render`. Providers advertise only operations they actually implement, input MIME/count limits, output formats and dimensions, exact model/runtime identity, locality, privacy, capacity, expected cost and latency, and qualification state.

Attachments are Job-owned artifacts with an immutable SHA-256, MIME type, original filename, byte size, dimensions and explicit role (`source`, `reference`, `mask`, `style_reference` or `subject_reference`). Their job ownership and hash are checked before provider admission.

Example: “Use the attached image and replace the background with a Victorian railway station.” The caller ingests the attachment as `source`, submits `image.edit`, and selects `AUTO` or an explicit provider/model route. Admission rejects external processing when the job is `PRIVATE`, rejects unavailable or incompatible providers before execution, and records any fallback. Success requires an independently hashed output owned by the same Job and provider/model/revision/host provenance. A provider response alone is not completion.

`COLAB` is a route constraint, not core image semantics. A future Colab adapter may use the existing authenticated browser only to bootstrap a canonical worker; it must never extract cookies or reproduce Google authentication. Qwen is likewise an adapter/model identity, not a core operation.

## Blender workloads

Stable operations use names under `blender.scene.*`, `blender.object.*`, `blender.mesh.*`, `blender.material.*`, `blender.camera.*`, `blender.light.*`, `blender.transform.*`, `blender.import.*`, `blender.export.*`, `blender.render.*` and `blender.validate.*`.

Raw Python is explicit as `blender.python.execute`. The governed request retains source hash, parameters, inputs, target scene identity, stdout/stderr, resulting scene hash, artifacts, validation and rollback reference. Obvious process/network escape is rejected at this boundary; host sandboxing and Blender-side allowlisting remain mandatory adapter responsibilities.

A successful one-off is only a reusable pattern. Promotion to `QUALIFIED_SKILL` requires repeated distinct jobs, a bounded contract, understood output, validation, failure handling, portability and no hidden environment assumptions. Application-specific scene logic stays in its application repository.
