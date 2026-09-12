# Agent Control 4.5.0 release candidate

Agent Control 4.5 introduces governed skill learning, deterministic skill
promotion, provider-neutral **Your Memories** portability experiments and
power-aware execution evidence. It is currently an **EXPERIMENTAL release
candidate**, not a stable release.

Repeated verified reasoning may be nominated as a deterministic skill only when
its source Work Parcels, originating route, contracts, assumptions, handler
identity, freshness, invalidation conditions and independent verifier are
durable. Promotion remains explicit. Contract mismatch, novel state, stale
evidence or failed verification rejects reuse and records a governed model
fallback. Physical qualification passed 45/45 deterministic executions and the
changed-input fallback.

The learned-specialist lifecycle keeps the base model, adaptation, frozen
dataset, framework/runtime compatibility and qualification evidence distinct.
The initial 135M CPU LoRA experiment improved its frozen task but did not beat
warm Qwen on measured-component energy per verified result. It therefore does
not support a general specialist-energy-saving claim, and learned routing remains
disabled by default.

The provider-neutral ProjectMemoryPort stores advisory structured memories with
provenance, freshness, conflict handling and content-addressed synchronization.
The user-facing capability remains **Your Memories**; Obsidian and MARM are
optional backends rather than Agent Control's memory identity. The physical
cross-model matrix remains partial. A fresh Qwen-to-Luna POE Work Parcel passed
independent verification and reconciled 9,760 tokens, while real GLM/Qwen and
Pixel Gemma limitations remain preserved.

Power evidence distinguishes measured Intel package/DRAM and NVIDIA board values
from unavailable whole-node energy. Deterministic reuse reduced measured energy
by 99.37–99.45% for the qualified bounded operations. The tested retained
specialist consumed more energy per verified result than warm Qwen, and the warm
residency delta remained inside measurement uncertainty. No automatic power,
shutdown or residency policy is released.

The complete deterministic suite passed 1,154/1,154 at the qualified checkpoint.
The candidate includes an HD recording, complete human-readable transcript,
machine-readable gate matrix, failure analysis and checksummed evidence manifest.
See the [authoritative release-gate reconciliation](evidence/agent-control-4.5-release-gate-20260912.md),
[skill-learning architecture](agent-control-4.5-skill-learning-architecture-review.md),
[deterministic skill guide](deterministic-skill-promotion.md),
[Your Memories portability guide](project-memory-portability.md),
[energy guide](energy-aware-intelligence.md), and
[deployment/rollback guide](DEPLOYMENT.md).

Stable `v4.5.0` publication remains gated by the unresolved physical criteria in
the authoritative reconciliation. In particular, this candidate does not claim
complete cross-model portability, an MSI cross-node transition, a beneficial
specialist-energy route, a beneficial strong-model consolidation, or whole-node
power measurement.
