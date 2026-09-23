# Agent Control v4.14.0 — Reliable Execution

**Draft only. Candidate `4.14.0-rc.0` is not approved for release.** These notes describe the integration work under qualification, not generally available behaviour.

## Proposed changes

- **Simpler model tool use:** An opt-in native function-call interface translates model-facing names to existing governed tool IDs. The old bounded JSON tool path remains available. This interface has research-task evidence; normal Job admission wiring and cross-model release qualification remain open.
- **Safer tool execution:** The bounded parser accepts only schema-valid, granted operations and records deterministic representation repairs. It does not invent targets or broaden permissions. False-repair qualification is not yet large enough for a release claim.
- **Safer source writes:** The disposable mutation workspace now returns plain file content with line numbers as metadata and rejects copied numbered read-display text in whole-file writes and exact replacements before those mutations. This is not a general guard across arbitrary harnesses or every source-write adapter.
- **Model solvability preflight:** A frozen five-task direct-control assessor records model, provider, fixture and evidence identity and fails closed below its configured threshold. It is not yet a generic Job admission preflight.
- **No-progress detection and recovery:** An opt-in detector fingerprints completed tool request/result pairs, identifies bounded cycles, records factual warnings and replan/escalation signals, and can terminate repeated reads. It cannot select a correct next action. Its small research corpus and one unsuccessful external control do not establish field false-positive safety or causal resource savings.
- **Better failure diagnostics:** Metadata-only semantic lifecycle events separate parsing, validation, translation and dispatch stages in the research tool loop. Their ordinary Job ledger integration and new v4.14 diagnostic evaluation remain open.
- **Privacy-safe forensics:** A synthetic-fixture response vault requires an explicit grant and sanitises selected credential patterns. Raw response capture is off for ordinary operation; a production permission, revocation and retention design is not qualified.
- **Live video evidence and stable Job identity:** The Factory observer derives identity colour from immutable Run ID and keeps status separate. A fresh three-Job local demonstration recorded live runtime events with 14.2 seconds of overlap and a verified 18.13-second video. The video establishes this bounded demonstration, not end-to-end release qualification.

## Defaults and exclusions

No new tool mode, no-progress detector, raw capture, paid escalation or video recording is enabled by default through normal Job configuration. AutomationBench and AWS Strands adapters are excluded from this candidate. Multi-file edits remain sequential rather than transactional.

## Carried-forward boundaries

The v4.13.0 diagnostic coverage remains **PARTIAL**; its classifier evaluation remains the small, correlated AI-reviewed 47-case held-out sample. Pixel physical identity remains unverified. The research AutomationBench reference control did not pass its task and is not Agent Control benchmark qualification. Live video is unsigned visual evidence. Local inference has no API-equivalent dollar cost claim.

Do not publish these notes as a GitHub release until the required physical, security, installation, upgrade, rollback, concurrency, evidence and claim gates pass.
