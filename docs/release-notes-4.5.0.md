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
cross-model matrix remains partial at 9/12 reconciled cells. Both controller
directions, Pixel Gemma 4 E4B→Qwen and a POE-initiated MSI
`Cottage Plus/Luna → Lawrence Pro/Sol` Work Parcel passed independent
verification. The MSI transition reconciled 15,570 tokens and preserved sealed
route and baton identities. Qwen→Pixel remains a real semantic model limitation,
and GLM→Qwen remains authentication-blocked.

Power evidence distinguishes measured Intel package/DRAM and NVIDIA board values
from unavailable whole-node energy. Deterministic reuse reduced measured energy
by 99.37–99.45% for the qualified bounded operations. The tested retained
specialist consumed more energy per verified result than warm Qwen, and the warm
residency delta remained inside measurement uncertainty. No automatic power,
shutdown or residency policy is released.

The complete deterministic suite passed 1,157/1,157 at the completion checkpoint.
The historical candidate includes an HD recording; the exact completion candidate
does not have a new recording and does not reuse that video as current evidence.
It includes a complete human-readable transcript, machine-readable gate matrix,
failure analysis and checksummed evidence manifest. See the [completion gate](evidence/agent-control-4.5-release-gate-completion-20260912.md), the [historical release-gate reconciliation](evidence/agent-control-4.5-release-gate-20260912.md),
[skill-learning architecture](agent-control-4.5-skill-learning-architecture-review.md),
[deterministic skill guide](deterministic-skill-promotion.md),
[Your Memories portability guide](project-memory-portability.md),
[energy guide](energy-aware-intelligence.md), and
[deployment/rollback guide](DEPLOYMENT.md).

Stable `v4.5.0` publication remains gated by unresolved physical criteria. The
candidate now proves the MSI cross-node transition and beneficial strong-model
consolidation, but does not claim complete cross-model portability, a beneficial
specialist-energy route, whole-node power measurement, or an exact-candidate HD
recording.
