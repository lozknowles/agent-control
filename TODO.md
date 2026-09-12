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
