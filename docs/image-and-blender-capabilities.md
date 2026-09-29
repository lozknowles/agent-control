# Governed image and Blender capability boundaries

Agent Control owns the job, policy, routing, cancellation, evidence and artifacts. Providers and application adapters execute bounded operations; they do not become independent schedulers.

## Image workloads

The provider-neutral operations are `image.generate`, `image.edit`, `image.multi_edit`, `image.inpaint`, `image.outpaint`, `image.upscale` and `image.text_render`. Providers advertise only operations they actually implement, input MIME/count limits, output formats and dimensions, exact model/runtime identity, locality, privacy, capacity, expected cost and latency, and qualification state.

Attachments are Job-owned artifacts with an immutable SHA-256, MIME type, original filename, byte size, dimensions and explicit role (`source`, `reference`, `mask`, `style_reference` or `subject_reference`). Their job ownership and hash are checked before provider admission.

Example: “Use the attached image and replace the background with a Victorian railway station.” The caller ingests the attachment as `source`, submits `image.edit`, and selects `AUTO` or an explicit provider/model route. Admission rejects external processing when the job is `PRIVATE`, rejects unavailable or incompatible providers before execution, and records any fallback. Success requires an independently hashed output owned by the same Job and provider/model/revision/host provenance. A provider response alone is not completion.

The `image.execute@1.0.0` Action runs inside the ordinary Job lifecycle. Its output and evidence are Job-owned artifacts, while provider routing remains capability-based. The included private-loopback ComfyUI adapter advertises `image.generate` only. It supports bounded submission, polling, output retrieval and cancellation; it does not claim edit, multi-edit, inpaint, outpaint, upscale or text-render support. Unsupported operations fail admission before provider execution.

The 4.17 capability contract additionally negotiates minimum dimensions, dimension multiples, deterministic seed, mask/control input, transparent output, batch limits and progress reporting. Requirements are recorded in evidence. Routing may select a compatible provider, but it never calls an incompatible provider or silently removes a requested feature. A frozen benchmark contract retains exact request/provider/output identities and measurable resource fields; visual quality deliberately remains for later human adjudication.

`COLAB` is a route constraint, not core image semantics. A future Colab adapter may use an authenticated browser only to bootstrap a canonical worker; it must never extract cookies or reproduce Google authentication. Qwen is likewise an adapter/model identity, not a core operation. The 4.16 physical qualification used a local Qwen Image 2.1 generation provider through the ordinary Job runtime and established generation and cancellation only, with retained limitations for latency, single-host coverage, visual subjectivity and absent editing support.

## Blender workloads

Stable operations use names under `blender.scene.*`, `blender.object.*`, `blender.mesh.*`, `blender.material.*`, `blender.camera.*`, `blender.light.*`, `blender.transform.*`, `blender.import.*`, `blender.export.*`, `blender.render.*` and `blender.validate.*`.

Raw Python is explicit as `blender.python.execute`. The governed request retains source hash, parameters, inputs, target scene identity, stdout/stderr, resulting scene hash, artifacts, validation and rollback reference. Obvious process/network escape is rejected at this boundary; host sandboxing and Blender-side allowlisting remain mandatory adapter responsibilities.

A successful one-off is only a reusable pattern. Promotion to `QUALIFIED_SKILL` requires repeated distinct jobs, a bounded contract, understood output, validation, failure handling, portability and no hidden environment assumptions. Application-specific scene logic stays in its application repository.

The 4.17 experiment extracts a semantic procedure only after multiple successful source Jobs. The procedure records prerequisites, parameter names, ordered capabilities, checkpoints, validation, recovery, cancellation and completion criteria; raw supervisor commands are excluded. Independent replay is classified `QUALIFIED_SKILL` only when a fresh parameterised Job succeeds with no human intervention and no supervisor operational actions. This is intentionally a bounded classification, not a claim of general Blender autonomy.

The `blender.execute@1.0.0` Action also runs through the ordinary Job lifecycle. The 4.16 physical qualification created, saved, reopened, validated and exported a deterministic scene with Blender 4.5.14 LTS; a separate cancellation run terminated before producing a receipt or scene files. This qualifies the bounded adapter path, not arbitrary Blender scripts or application-specific scene techniques.
