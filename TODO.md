# Agent Control 4.5 work plan

This file records the implementation order for governed local skill learning. It
is not a release declaration. Agent Control 4.4.0 remains the released baseline.

- [x] Establish an isolated branch from the clean `v4.4.0` product checkpoint.
- [x] Inventory reusable model, routing, Work Parcel, verification, evidence,
  Warm Expert, dashboard and POE boundaries.
- [x] Record the pre-runtime architecture and current-hardware training decision.
- [x] Implement the provider-neutral learned-skill lifecycle and durable Skill
  Adapter Registry.
- [x] Add dataset, frozen-evaluation, training, qualification and failure gates.
- [x] Admit only qualified base-model-plus-skill candidates to normal governed
  routing; keep learned skill and cache warmth independent.
- [x] Add read-only dashboard and POE projections for Learned Specialists.
- [x] Add deterministic lifecycle, isolation, provenance, routing, recovery and
  leakage tests.
- [x] Run one real bounded baseline, adaptation and frozen-evaluation experiment
  without disturbing protected services.
- [x] Physically prove positive specialist routing and an inappropriate-task
  rejection through the production Work Parcel path.
- [ ] Reconcile metrics, hashes, environment, limitations and failure exercises
  in a reproducible evidence bundle.
- [ ] Update canonical 4.5 documentation, run the complete validation suite, and
  commit/push the isolated feature branch. Do not merge, tag, release or deploy.

## Morrow integration follow-up

- [x] Combine the original Morrow identity and coordinated six-robot artwork with the completed 4.5 route-governance branch.
- [x] Preserve the existing qualification bundle and its experimental recommendation.
- [ ] Qualify the combined candidate on desktop/mobile with reduced/off motion, physical voice/social invocation and a harmless governed Work Parcel. Keep new evidence separate from historical POE runs.

See the [combined integration record](docs/evidence/morrow-4.5-integration/validation.md) for automated checks and the exact source parents. Earlier unchecked items above describe the original skill-learning workstream; the [completion report](docs/evidence/agent-control-4.5-release-gate-completion-20260912.md) records its later qualification outcomes.

## Instruction Resolver — isolated shadow implementation

- [x] Start from published Morrow/4.5 candidate `0dc4fa30e9ee1f4d5218bdde956676201047ec9c` in an independent checkout.
- [x] Add provider-neutral source classification, bounded scope/precedence/conflict resolution, privacy exclusions, truncation and deterministic hashes.
- [x] Publish the Effective Instruction Manifest JSON schema and retain immutable hash-only provenance on Work Parcel, Job and instrumented provider paths.
- [x] Preserve current prompt assembly, Codex ignore-rules controls, protected-resource gates and historical qualification evidence.
- [x] Add explicit capability negotiation; unqualified adapter mechanisms remain `UNSUPPORTED`.
- [x] Add authenticated Work Parcel instruction inspection and Morrow's evidence digest.
- [x] Exercise production dependency-aware scheduling, independent identity, typed batons and authenticated inspection in automated integration tests.
- [x] Record reproducible A–H shadow fixtures, regression results, preserved historical evidence and all known limitations.
- [x] Obtain explicit approval to publish the new feature branch to public GitHub. The operator approved publication after the initial automatic-review block.
- [ ] Reconnect Desktop Commander to the running MSI machine; confirm the real development checkout and isolated runtime before physical execution.
- [ ] Physically run A–H on registered Astra, Sol and Luna routes and an available safe local/non-OpenAI route. Current matrix is BLOCKED; no model execution is claimed.
- [ ] Complete a genuine Morrow-driven bounded development Job/Work Parcel, independent verification, instruction inspection and human-readable digest.
- [ ] Capture a continuous HD recording beginning before actual request entry; retain real IDs, video hash and evidence manifest.
- [ ] Confirm rotation of the credential identified in the previous audit; status is UNVERIFIED. Do not reproduce it or inspect secret-bearing shell configuration.
- [ ] Qualify broader instruction-text coverage and any adapter continuation/emulation/native capability offers before claiming support. Ordinary prose conflict coverage remains non-exhaustive.
- [ ] Demonstrate bounded equivalence and safety physically before any proposal to enforce resolved prompts. Agent Control 4.5 remains experimental.

See [resolver architecture](docs/instruction-resolver.md) and the [implementation and acceptance report](docs/evidence/instruction-resolver-shadow/report.md).
