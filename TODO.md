# Agent Control 4.5 work plan

This file records the implementation order for governed local skill learning. It
is not a release declaration. Agent Control 4.4.0 remains the released baseline.

- [x] Establish an isolated branch from the clean `v4.4.0` product checkpoint.
- [x] Inventory reusable model, routing, Work Parcel, verification, evidence,
  Warm Expert, dashboard and POE boundaries.
- [x] Record the pre-runtime architecture and current-hardware training decision.
- [ ] Implement the provider-neutral learned-skill lifecycle and durable Skill
  Adapter Registry.
- [ ] Add dataset, frozen-evaluation, training, qualification and failure gates.
- [ ] Admit only qualified base-model-plus-skill candidates to normal governed
  routing; keep learned skill and cache warmth independent.
- [ ] Add read-only dashboard and POE projections for Learned Specialists.
- [ ] Add deterministic lifecycle, isolation, provenance, routing, recovery and
  leakage tests.
- [ ] Run one real bounded baseline, adaptation and frozen-evaluation experiment
  without disturbing protected services.
- [ ] Physically prove positive specialist routing and an inappropriate-task
  rejection through the production Work Parcel path.
- [ ] Reconcile metrics, hashes, environment, limitations and failure exercises
  in a reproducible evidence bundle.
- [ ] Update canonical 4.5 documentation, run the complete validation suite, and
  commit/push the isolated feature branch. Do not merge, tag, release or deploy.

