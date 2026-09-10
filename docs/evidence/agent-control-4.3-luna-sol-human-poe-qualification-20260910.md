# Agent Control 4.3 human-initiated POE Luna-to-Sol qualification

Date: 2026-09-10

Verdict: **PASS — HUMAN POE REQUEST PRODUCED A GENUINE, VERIFIED LUNA-TO-SOL BATON HANDOFF**

This is isolated post-release qualification and defect-correction evidence. It does not merge, tag, release, or deploy Agent Control.

## Human request entered through POE

The recording shows this complete request being typed into POE:

> Run the token-aware repository review. Have Luna inspect the frozen reservation-service repository first. If the independent quality gate finds unresolved root causes, create a sealed baton and escalate the unfinished analysis to Sol. Show the model transition, baton contents, verification, and token totals.

POE resolved the natural request to the registered `Token-aware repository review` job, presented a sealed proposal and live worker preflight, and required explicit operator approval. The internal identifier was not typed by the operator.

## Result

- Parent Work Parcel: `parcel-social-ba9337ed712a748f38a15111fc307007e5406e3e98e6f00bae995b7e76dd67f1`
- Parameterized review Run: `698bccf9-c9ac-43df-bd05-4667fe421469`
- Provider-owned Work Parcel: `parcel-d2d4ca52-d604-4ef6-bbfc-fe9c06efed3a`
- Source: `codex-chatgpt / Controller Account A / Luna`
- Destination: `codex-chatgpt / Controller Account A / Sol`
- Handoff: `SUCCEEDED`
- Independent verification: `PASSED`
- Source thread recoverable: `true`

Luna returned complete and schema-valid output. The independent gate rejected it because its lease remediation did not explicitly name `issuedAtSeconds`, `maxAgeSeconds`, and `nowMs` and state a dimensionally valid normalization before the strict expiry comparison. This was a quality-triggered escalation, not a provider failure, context-pressure event, or silent model substitution.

Agent Control created baton `token-baton:dad9c9a2-33c0-44bf-8708-ed516933b812`, SHA-256 `d8dfdb2da398821e9a7cfd8ae56914e7f12e20c475dc4776d076817ec273432c`. It preserved the objective, completed Luna work, route decision, immutable Git state, test/evidence references, exact unresolved issue, exact next action, source identity and thread, token state, and Work Parcel totals. Sol received those fields, supplied the exact unit normalization, passed the same gate, and completed independent verification.

## Token reconciliation

| Leg | Input | Fresh input | Cached input | Output | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Luna | 7,885 | 973 | 6,912 | 1,453 | 9,338 |
| Sol | 9,693 | 9,693 | 0 | 1,636 | 11,329 |
| Combined Work Parcel | 17,578 | 10,666 | 6,912 | 3,089 | 20,667 |

The ledger reconciles exactly: `9,338 + 11,329 = 20,667`.

Provider-reported current-context occupancy was unavailable and remains distinct from lifetime tokens. The configured context limit was 272,000. Authoritative per-run monetary cost was unavailable for this ChatGPT-plan route and is recorded as unavailable, not zero.

## Qualification-discovered defect and correction

Two attempts before the passing run correctly failed closed. In both, the durable baton stored the independent gate's `unresolvedIssues`, but `DirectRepositoryReviewExecutor.prompt()` omitted that field when rendering the destination provider prompt. Sol therefore did not receive the exact gate failure even though the durable ledger retained it.

The narrow correction adds the baton's existing `unresolvedIssues` to the provider-neutral continuation prompt. It does not weaken the gate, change route policy, manufacture a failure, or add provider-specific behavior. Focused regression coverage proves the destination prompt receives the unresolved criterion.

The failed attempts remain preserved as truthful evidence:

- `agent-control-4.3-luna-sol-human-poe-attempt-1-failed-transcript-20260910.md`
- `agent-control-4.3-luna-sol-human-poe-attempt-2-failed-transcript-20260910.md`

The aborted partial screenshot directories and the superseded pre-expansion recording were removed; they were incomplete intermediate captures, not accepted qualification artifacts. The immutable failed execution narratives remain in the two transcripts above.

## Video

- File: `agent-control-4.3-luna-sol-human-poe-20260910.mp4`
- Resolution: 1920 x 1080
- Duration: 92.56 seconds
- Codec: H.264
- Frame rate: 25 fps
- Size: 12,377,216 bytes
- SHA-256: `20fd092bb608a7d29642e1a0f03f3d29d8d9c1ea9157632ad14a76a4c491474f`
- Continuous capture: yes
- Edited or spliced: no

The recording shows POE typing the full request, the sealed proposal and approval, Luna working, the independent rejection, baton creation, Sol activation, Jobs/Lanes/Models/Systems/Crew views, independent verification, reconciled usage, and the complete human-readable transcript.

## Evidence integrity

- Machine evidence SHA-256: `4fca95f69afc1757c2b3ebe6f78e886bb9f178ebe0b84cf1bbb7dbaafea0e3ce`
- Human-readable transcript SHA-256: `d81d7a3fd53ce6a67f638f1f59d384b2f4f230c6f96816e2e6b263b75682bc6d`
- Video manifest SHA-256: `8c5b13271e69d378821ce54570636e1fc4df4677239ded0d23ee3ff4936ad246`
- Video SHA-256: `20fd092bb608a7d29642e1a0f03f3d29d8d9c1ea9157632ad14a76a4c491474f`

The product-generated `BATON_CREATED` transcript entry expands the exact durable baton fields passed to Sol. Credentials, private model reasoning, raw authentication material, and unavailable values represented as zero are excluded.

## Validation

- Focused POE, handoff-prompt, and execution-transcript tests: **35/35 passed**.
- Complete `npm run check` regression: **1,120/1,120 passed**.
- TypeScript, bootstrap, dashboard, provider-neutrality, implementation-status, and runtime/package version checks: **passed**.
- `git diff --check`: **passed**.
