# Instruction Resolver and Effective Instruction Manifest

Status: **experimental, shadow only; physical acceptance is pending.** This feature does not qualify Agent Control 4.5 for release.

Agent Control now records instruction provenance at Work Parcel creation, governed Job action dispatch and instrumented provider boundaries. Current prompt assembly remains active. The resolver constructs a separate candidate and records differences; it never sends that candidate to a provider. Codex retains `--ignore-rules` and `project_doc_max_bytes=0`.

## Authority and discovery

Source classes are assigned by trusted controller code, not inferred from claims in source text. A repository file cannot declare itself platform policy. The precedence table is fixed:

| Source | Priority | Domain |
|---|---:|---|
| Platform/controller policy | 100 | Authority |
| Agent Control governance | 90 | Authority |
| Accepted temporary steering | 85 | Task |
| Current user task | 80 | Task |
| Repository instructions | 60 | Guidance |
| Selected skill instructions | 50 | Guidance |
| Continuation/baton | 40 | Advisory |
| Provider capability overlay | 30 | Capability |
| Memory/retrieved evidence | 20 | Advisory |
| Persona | 10 | Persona |

Temporary steering must already have passed the existing Work Parcel amendment controls. Its priority permits an accepted correction to update the original task; it grants no additional operational authority. Existing approval, tool, protected-resource, routing, cancellation and independent verification gates remain authoritative.

`discoverRepositoryInstructions` requires an explicitly approved repository root and relative target file paths. It reads `AGENTS.md` at the root and each ancestor of those files. It observes, but does not load, lowercase `agents.md`. It rejects symlinks, escaped paths, nonregular files, changing reads, invalid UTF-8 and files beyond the discovery budget. It never scans shell profiles or environment configuration. Direct repository review calls discovery on its already approved frozen snapshot, recording the reviewed revision.

Recipe context is classified separately, with its controller provenance. A selected recipe skill whose instruction text is unavailable is recorded as `SELECTED_SKILL_TEXT_NOT_OBSERVED`; the resolver does not invent a skill prompt. Context-source skill IDs must match explicit selected IDs. Arbitrary task-context text remains advisory. Other actions can supply explicitly discovered sources through `withInstructionScope`; this is not a global filesystem scanner.

## Bounded resolution

The resolver selects by scope, audience, explicit skill selection, expiry, privacy and byte budget. Identical source identities/content are deduplicated. Different hashes for the same URI/revision/scope are an unresolved source-identity conflict. Sorting uses source class, repository depth and codepoint-stable identities, without locale-dependent ordering or current timestamps in manifest hashes.

Semantic conflict resolution is deliberately bounded to standalone `instruction.key=value` directives. Current user directives beat repository directives. A nested repository directive wins only for its own descendants. Equally ranked contradictory directives are unresolved and produce `FAIL`. Winning directives are rendered for their applicable target; losing and unresolved directives are omitted from the candidate. Memory, baton, provider overlays and persona are not parsed as authoritative directives.

**Ordinary prose is retained as labelled context, and its contradictions are not exhaustively understood.** The manifest always declares `freeTextConflictCoverage: NOT_EXHAUSTIVE`. A passing bounded resolution is therefore `PASS_WITH_LIMITATIONS`, never a claim of complete instruction understanding. This limitation blocks automatic enforcement.

The default candidate budget is 65,536 UTF-8 bytes, with 16,384 bytes per source and at most 256 sources. Discovery has a separate 262,144-byte per-file limit. Truncated source fragments, excluded sources and candidate-wide truncation are explicit. Incomplete directive lines caused by truncation cannot establish a decision. Excluding or truncating a required platform, governance or user source fails shadow verification. Source rendered hashes describe individual transformed fragments before any final candidate-wide truncation; `shadow.proposalTruncated` identifies that final cut.

## Manifest and evidence

The [JSON schema](../config/schemas/effective-instruction-manifest-v1.schema.json) defines `agent-control.effective-instruction-manifest/v1`. The SHA-256 is computed over canonical JSON excluding the manifest's own ID and hash; the ID is `instructions-<sha256>`.

Records include parcel, run, stage, worker, provider, registered model, provider model, account-profile reference and invocation identity; repository revision; selected/excluded source metadata and hashes; precedence decisions; conflicts; skill IDs; capability outcomes; adapter transformations; accepted temporary instruction IDs; amendment hashes; and the sealed continuation relationship.

Raw source text, raw prompts, credentials, authorization headers and directive values are not persisted. Directive decisions store winning value hashes. Recognizable sensitive content is excluded with its hash. Unknown sensitive formats cannot be exhaustively detected, so callers must use `sensitive: true` where appropriate and must never put secrets in metadata. This does not justify reproducing credentials from the earlier audit; rotation remains a separate operator responsibility.

Manifests are immutable, hash-addressed JSON files under the isolated runtime's `instruction-manifests` directory. Observation events separately record resolution and provider completion/failure times. Work Parcel IDs link to all available manifests, and provider manifests link back to run/stage identities and existing ledgers. Missing or corrupt records remain visible as errors; a failed shadow observer does not grant authority or change the active execution path. The event log is operational metadata, not a signed provider receipt.

Three different hashes answer different questions:

| Field | Meaning |
|---|---|
| `shadow.currentHash` | Existing text presented to the adapter |
| `shadow.proposedHash` | Independently resolved shadow candidate |
| `effectiveInstructionHash` / `shadow.actualHash` | Observed instruction representation at the named adapter boundary; null if unobserved |
| `transformations[].wireHash` | Canonical request envelope hash, excluding authorization headers |

Structured adapters hash the role/message representation; text/CLI adapters hash text. These are not interchangeable representations. `sourceCoverage.presentInCurrent` is an exact substring check of the bounded source against the pre-adapter text, not semantic equivalence. A candidate-selected source may be absent from the current prompt. A hash proves identity of an observed payload, not that a remote model obeyed it or that its provider added no private instructions. `providerReceipt` remains `NOT_ATTESTED`; remote Codex node requests explicitly use `CONTROLLER_TO_EXECUTION_NODE` until a downstream record is available.

Instrumented paths include OpenAI-compatible standard/streaming requests, Responses function requests, structured chat requests, bounded chat loops, local Codex execution and Codex repository-review node dispatch. Providers invoked outside a governed scope produce no invented parcel identity. Selected recipe metadata and wrapper instructions are captured where available.

## Provider capabilities and parallel work

Core requests `native_mid_turn_steering`, `dynamic_reasoning`, `async_tools` and `multi_agent`. An adapter may return `NATIVE`, `CONTINUATION`, `EMULATED` or `UNSUPPORTED`, with an adapter identity, reason and evidence references. Non-unsupported offers require evidence. Ambiguous offers are rejected. Provider-specific flags and wire syntax stay in adapters.

**The currently instrumented adapters report `UNSUPPORTED` for mechanisms they have not qualified.** The negotiation abstraction does not implement native mid-turn steering, dynamic reasoning changes, asynchronous provider tools or native model subagents. Unit tests for an offered mechanism are not physical qualification. Existing governed continuation and the controller's concurrent worker scheduler remain separate operational features; neither is mislabeled native provider support.

The production scheduler already dispatches independent Work Parcel stages up to available worker capacity. Dependent stages wait for successful upstream completion and verified batons. The new integration test exercises this scheduler, preserves distinct worker/parcel/run/manifest identities and checks start/end ordering. Existing cancellation, upstream failure and resource-lock regressions continue to cover negative paths. No scheduler rewrite was needed.

## Operator inspection and acceptance

The Work Parcel card has an **Effective instructions** button. Operator authentication is required for `GET /api/parcels/:id/instructions`; the response contains manifests, observation events, missing references and a plain-language digest. Morrow includes the same provenance explanation in its parcel evidence and completion summary. This is evidence of shadow selection and observed payloads, not a claim that discovered repository advice was applied.

Run `node --import tsx scripts/qualify-instruction-resolver-shadow.ts` for reproducible A–H source fixtures. They are marked `AUTOMATED_ONLY` and execute no models. Run `npm run check` for regression validation.

For physical acceptance, first reconnect the MSI Desktop Commander session and confirm the actual Agent Control instance, checkout and unused development port. Do not restart or alter deployed services. Enroll the bounded development fixture through the existing governed Job/action workflow in an isolated runtime, discover approved repository instructions, and verify all model routes before recording. Use actual registered Astra, Sol and Luna identities, plus a safe available local/non-OpenAI route; never substitute a mock.

Begin a continuous recording at 1920×1080 or better before entering the request into the real Morrow UI. A suitable request is: “In the disposable instruction fixture, correct the greeting function, keep the current user instruction above conflicting repository advice, run its tests, and explain the instruction sources, exclusions, worker routes and verification.” Show Job/Work Parcel creation, actual worker execution, any baton, instruction inspection, verification and Morrow's digest. Retain real IDs, results, hashes, video and model-by-case A–H evidence. Until this is completed, the physical matrix, real acceptance job and video remain blocked and enforcement remains disabled.
