# Agent Control 4.5 work plan

## Runtime Map / Process Explorer workstream

- [x] Project authoritative Work Parcels, Runs, workers, model calls, terminal
      sessions, decisions, batons, cache, memory, retries and verification into
      one provider-neutral graph schema.
- [x] Add live accessible graph layout, automatic clustering, pan/zoom/fit,
      Control Room, drill-down, authenticated session links and Replay.
- [x] Add grounded Morrow references, redaction/access boundaries, 50+ job tests,
      physical parallel qualification, HD video and complete transcript.
- [ ] Add synchronized graphical dual-run Compare when the historical evidence
      model can support aligned replay without compromising Live/Replay.
- [ ] Add governed map-originated pause/cancel/retry/approval controls only by
      delegating to existing authorization and audit APIs; WATCH remains the
      default and current Runtime Map authority.

This file records the implementation order for governed local skill learning. It
is not a release declaration. Agent Control 4.4.0 remains the released baseline.

## Cross-device Session Vault workstream

Branch: `feature/4.5-cross-device-session-vault` from governed checkpoint
`5bd72802b6525a1ccce05df2a42be2e04c456d67`.

Objective: preserve provider-native session evidence as immutable objects,
normalize it into provider-neutral searchable provenance, replicate stable
objects, and create governed contextual continuations on another node without
mutating or silently reopening the source session.

Architectural decisions:

- Session Vault is historical evidence, not a replacement for Your Memories,
  Work Parcels, batons, execution sessions, UX sessions or artifacts.
- Your Memories promotion uses the existing `ProjectMemoryPort` admission and
  retains Session Vault object hashes as provenance; capture alone never creates
  durable memory.
- The existing structured-Markdown/Obsidian-compatible memory port remains the
  optional memory backend. Obsidian is neither mandatory nor the Session Vault.
- Provider-native files remain immutable source evidence. The core event,
  decision, provenance, replication and continuation contracts are provider
  neutral; Codex JSONL is the first adapter.
- Cross-device continuation creates a new governed session and Work Parcel,
  requires repository-state verification and an exclusive lease, and preserves
  the original session unchanged.

Current work:

- [x] Inspect existing Your Memories, Obsidian-compatible Markdown, exchange,
      consolidation, route qualification, evidence, session and Work Parcel layers.
- [x] Inspect the installed Codex 0.154.0 session location and observed JSONL
      record envelopes without treating Codex fields as the core schema.
- [x] Implement immutable capture, normalization, indexes, provenance,
      replication, policy, continuation/branching and lease boundaries.
- [x] Integrate authenticated API, Session Vault dashboard and governed POE
      inspection/continuation operations.
- [x] Add focused tests and all required architecture, threat, schema, operator,
      recovery and migration documentation.
- [x] Physically qualify scenarios A–H on at least two available nodes, including
      Your Memories provenance and Obsidian-enabled/disabled operation.

Checkpoint result: physical A–H pass across two governed Linux nodes, including
a real Codex 0.154 source session, governed continuation Work Parcel, immutable
replication, split-brain denial audit, synthetic-secret and tamper gates, and a
provider-neutral non-Codex adapter. The existing ProjectMemoryPort path and
Obsidian-disabled survival pass. Direct exercise of the configured Windows Obsidian
application remains blocked by unavailable SSH authentication, so the workstream
recommendation remains EXPERIMENTAL.

Unresolved risks and physical gates:

- Session files may be actively appended and must never be labelled complete.
- Provider evidence can contain secrets and private source; regex scanning alone
  is insufficient, so replication requires policy classification and encryption
  or exclusion where appropriate.
- Exact commit/line attribution may remain ambiguous and must carry confidence.
- A second reachable node, stable repository snapshot and approved harmless
  continuation are required for physical A–E; no pass may be simulated.
- Release remains **EXPERIMENTAL** until every mandatory integrity, access,
  split-brain, dashboard and cross-device gate is physically proven.

## Governed skill-learning workstream

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
