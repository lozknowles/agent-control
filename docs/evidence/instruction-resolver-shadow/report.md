# Instruction Resolver shadow implementation — 2026-09-12

**Recommendation: EXPERIMENTAL — PHYSICAL ACCEPTANCE BLOCKED — NOT RELEASE READY.**

**Credential rotation is UNVERIFIED.** The preceding audit reported an exposure. This task did not display the credential, read shell profiles, dump environments, rotate credentials or change private configuration. The operator must confirm rotation separately.

## Baseline

The authoritative candidate was `feature/4.5-release-gate-completion` at `0dc4fa30e9ee1f4d5218bdde956676201047ec9c`, including the published Morrow identity and robotic crew. Its identical tree had previously passed 1,165/1,165 tests, as recorded in the [Morrow integration evidence](../morrow-4.5-integration/validation.md). That existing result is the baseline, not a newly invented pre-edit run.

Implementation uses the independent checkout `/workspace/scratch/acf319a4081b/agent-control-instruction-resolver`, branch `feature/4.5-instruction-resolver-shadow`. The original checkout and remote 4.5/main branches were left unchanged. MSI-side worktrees could not be inspected through the unavailable connector; this is why development stayed in the separate environment. No merge, tag, release, deployment or production restart was performed.

[Baseline metadata](baseline.json) records source/tree identities and invariants. All **338 existing qualification/evidence files** remain unchanged. The existing completion evidence verifier passes and retains its experimental recommendation.

## Implemented

- Bounded, provider-neutral source discovery and selection, explicit authority domains, nested scope, user precedence, deterministic conflict decisions, privacy exclusions and UTF-8 budgets.
- Canonical hash-addressed manifests with actual worker/model identity when observed, source hashes, exclusions, transformations, steering amendments and sealed baton relationships.
- Shadow comparison at governed Work Parcel, Job and provider boundaries. Current request assembly remains active; Codex argument generation is byte-for-byte unchanged.
- Explicit capability negotiation with evidence-bearing adapter offers. Unqualified mechanisms return `UNSUPPORTED`.
- Authenticated **Effective instructions** inspection on Work Parcel cards and the same instruction explanation in Morrow's evidence/completion summary.
- A–H deterministic source fixtures, schema checks, privacy and provider-byte equivalence tests, and production-scheduler integration coverage.

See the [architecture and operator guidance](../../instruction-resolver.md) and [manifest schema](../../../config/schemas/effective-instruction-manifest-v1.schema.json). `files-changed.txt` lists the complete change set.

## Test results and regression

**Final result: 1,179/1,179 tests passed; 14/14 focused tests passed. TypeScript, bootstrap/dashboard syntax, neutrality and implementation-status checks passed.** The final `npm run check` result is recorded in [full-check.txt](full-check.txt); [focused-tests.txt](focused-tests.txt) records resolver and runtime integration checks. These are automated tests, including explicitly labelled controlled provider/action fixtures. They are not physical model evidence.

The suite covers existing Work Parcels, batons, memory and continuation, learned/deterministic skills, routing, resource protection, cancellation, workers/crew and Morrow. The new scheduler test starts two independent stages together, holds the dependent stage until both finish, verifies distinct worker identities, persists manifests and confirms the join's sealed baton. It exercises the production scheduler without replacing it.

[Legacy evidence verification](legacy-evidence-verification.txt) validates the unchanged 4.5 completion evidence. [Shadow comparisons](shadow-comparisons.json) contain eight reproducible source-fixture manifests with stable hashes under reversed source ordering. None has a physical provider receipt.

## Instruction manifest and capability results

Manifest structure, canonical integrity, privacy exclusion, precedence, scoped conflict resolution, temporary instructions, skills, source discovery and shadow observation pass automated checks. A provider-boundary test proves identical outgoing request bytes with shadow observation enabled. Provider hashes attest only the named observed boundary; provider-private instructions remain unobserved.

Ordinary prose conflict coverage is **NOT_EXHAUSTIVE**. The structured directive grammar is `instruction.key=value`; unresolved equal-priority conflicts fail shadow verification. Candidate-selected sources are not necessarily present in existing prompts. Raw prompts and directive values are not retained in provenance.

Negotiation supports the portable outcomes `NATIVE`, `CONTINUATION`, `EMULATED` and `UNSUPPORTED`. Current adapters have no physically qualified offer for the four newly requested mechanisms and report `UNSUPPORTED`. Existing controller parallelism and sealed continuation are not represented as native provider features. Selected recipe skill metadata may lack instruction text; that absence is recorded explicitly.

## Physical model results, real Job and video

**MSI is running, as the operator confirmed.** Desktop Commander nevertheless rejected repeated harmless `hostname` probes with “No devices available.” This is a connector/access failure, not evidence that MSI is powered off. The isolated environment has no Codex executable or accessible authenticated MSI model route. No alternative browser mechanism was used to bypass the local-browser restriction.

| Requested route | A–H result | Actual model executions |
|---|---|---:|
| GPT-6 Astra | BLOCKED at access precheck | 0 |
| GPT-5.6 Sol | BLOCKED at access precheck | 0 |
| GPT-5.6 Luna | BLOCKED at access precheck | 0 |
| Safe local/non-OpenAI worker | BLOCKED at access precheck | 0 |

The [physical matrix](physical-matrix.json) records 32 blocked cells and distinguishes access checks from actual execution attempts. [Access evidence](physical-access.json) records the connector limitation without secrets.

Real acceptance Job ID: **none**. Real Work Parcel ID: **none**. Physical Morrow digest: **not produced**. Video path and SHA-256: **none**. No scripted imitation, synthetic dashboard, mock transcript or automated fixture is substituted for these deliverables.

## Failures and exact closure work

| Finding | State | Cause / closure evidence or required work |
|---|---|---|
| MSI physical access | **OPEN** | Connector rejects probes while MSI is running. Reconnect Desktop Commander to this chat, verify the actual controller checkout and unused development runtime, then run the full physical A–H matrix. |
| Real Morrow acceptance and HD video | **OPEN** | Requires the restored connection and actual registered model routes. Enroll a disposable bounded development fixture, begin recording before request entry, submit through Morrow, show real Job/parcel creation, execution, instruction inspection, verification and digest; preserve IDs and video hash. |
| Prior exposed credential rotation | **OPEN — UNVERIFIED** | Obtain operator confirmation that the affected credential has been rotated. Do not print the credential or change credentials as part of this task. |
| Complete prose interpretation / enforcement | **OPEN** | Free-text contradictions are not exhaustively resolved. Review representative real instructions and prove bounded equivalence/safety before any enforcement proposal. Keep shadow mode and ignore-rules controls active. |
| Adapter mechanisms and complete instruction-text coverage | **OPEN** | Current mechanisms are unsupported and some selected skill definitions contain metadata only. Implement/qualify explicit route-specific offers and observable skill/source mappings; retain truthful unknown/excluded states where content cannot be observed. |
| Existing heartbeat timing test | **FIXED AND RETESTED** | A fixed 18 ms wait assumed two 5 ms callbacks under load; the assertion could fail and leave its interval alive. The test now awaits actual heartbeat events, has a bounded test timeout and always releases the operation. Focused and final full suites pass. The interrupted first check is retained in `initial-check-interrupted.txt`. |
| Initial integration fixture setup | **FIXED AND RETESTED** | The fixture registered actions after the catalog captured its action set and initially supplied an invalid request key. It now builds the catalog from registered actions and uses a valid hash key; production scheduler integration passes. |
| Streaming observation outcome typo | **FIXED AND RETESTED** | TypeScript rejected an undeclared outcome name. Observation now uses the existing `COMPLETED` enum; TypeScript and streaming regressions pass. |
| Fixture F source composition/status | **FIXED AND RETESTED** | The first source-fixture composition duplicated the current-user identity with different content. It now supplies one coherent source set and asserts the resolver's actual result before recording status; all A–H fixtures regenerate successfully. |
| Evidence log persistence | **FIXED AND RETESTED** | The repository ignores `.log` files. Validation output is now stored as tracked `.txt` files and included in the evidence hash manifest; clean-checkout verification must pass before publication. |
| Restart ordering and strict manifest validation | **FIXED AND RETESTED** | Manifests now follow recorded resolution order after reload, and durable records must pass the published schema as well as the hash check. Restart, schema and corruption checks pass. |

## Branch, HEAD and evidence paths

Branch: `feature/4.5-instruction-resolver-shadow`. Baseline HEAD is recorded above; the implementation HEAD is the Git commit containing this report and the accompanying machine-readable evidence. Commit identity is reported separately to avoid a self-referential evidence hash.

Evidence directory: `docs/evidence/instruction-resolver-shadow/`. The evidence manifest binds file hashes and validation outcomes. Video path remains null until the real physical run is completed. `TODO.md` separates implemented work from blocked acceptance and enforcement gates.
