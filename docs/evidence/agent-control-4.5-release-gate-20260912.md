# Agent Control 4.5 authoritative release-gate reconciliation

Status: **EXPERIMENTAL**. This report does not authorize merge, tag, release or deployment.

## Results

| Gate | Status | Evidence |
| --- | --- | --- |
| Governed deterministic-skill lifecycle | **PROVEN** | 45/45 promoted deterministic executions passed; changed input rejected and governed fallback passed. |
| Your Memories cross-model matrix | **PARTIAL** | 5/12 historical cells passed; 2 failed cells were repaired and rerun successfully, while genuine model limitations remain. |
| MSI cross-node memory transition | **BLOCKED** | Both governed node-local Codex profiles returned codex_chatgpt_auth_required; no transition was claimed. |
| Strong-model memory consolidation | **DISPROVEN** | The measured consolidated-memory average fell from 66.67% to 50%. |
| Specialist-model energy advantage | **DISPROVEN** | The retained specialist consumed more measured-component energy per verified result than warm Qwen. |
| Deterministic reuse benefit | **PROVEN** | Repository/test skills reduced measured-component joules per verified result by 99.37–99.45%; baton check reached zero incremental after baseline subtraction. |
| Fallback after deterministic rejection | **PROVEN** | Novel input was rejected before deterministic execution and the ordinary model fallback passed independent verification. |
| Production POE Work Parcel | **PROVEN** | A real POE request created a Job/Work Parcel, executed the selected route, sealed batons and passed independent verification. |
| Warm residency route effect | **PARTIAL** | Measured component delta 0.5602278831243162 W was smaller than the approximate 95% uncertainty 4.297212154588172 W; no policy change was admitted. |
| Whole-node power claim | **BLOCKED** | The available RAPL plus GPU-board boundary excludes motherboard, storage, PSU losses, networking and peripherals. |
| Fresh genuine-runtime HD evidence | **PROVEN** | Live observer recorded the real POE-created Work Parcel while durable stages changed; 1920×1080. |

## Memory failure classification

All seven historical failed cells are classified in the [machine-readable matrix](../../qualification/agent-control-4.5-release-gate-20260912/memory-matrix.json). Provider-neutral field mapping and a governed repair attempt resolved Luna→Qwen and Qwen→Luna without weakening semantic verification. GLM→Qwen remains a schema-valid semantic failure. Pixel E4B failures remain preserved rather than simulated or counted as passes.

## MSI

Both configured MSI Codex profiles were checked through the production governed node port. Both returned `codex_chatgpt_auth_required`; therefore cross-node model continuation is **BLOCKED**, not failed or passed. No credential material or node-local credential path was persisted.

## Power and residency

The follow-up measured synchronized Intel package + DRAM and NVIDIA board samples for idle and a warm resident specialist. The observed difference was within uncertainty, so residency break-even is unavailable and no routing policy changed. This is not whole-node evidence.

## Fresh POE runtime evidence

The [HD video](../../qualification/agent-control-4.5-release-gate-20260912/live-poe-run/agent-control-4.5-live-poe-memory-qualification.mp4) records a fresh genuine POE-created Work Parcel while the durable runtime changes. The page is explicitly a read-only qualification observer, not a replay or a substitute production dashboard. It shows the real operator request, Job/Run identities, stages, provider/model routes, sealed baton hashes, verification and final token accounting. See the [complete transcript](../../qualification/agent-control-4.5-release-gate-20260912/complete-human-readable-transcript.md) and [manifest](../../qualification/agent-control-4.5-release-gate-20260912/evidence-manifest.json).

## Recommendation

**EXPERIMENTAL**. Useful deterministic-skill and provider-neutral memory mechanisms are proven, but model capability failures, blocked MSI authentication, disproven specialist energy advantage and unavailable whole-node power evidence keep mandatory gates open.
