# Agent Control 4.5.0 release candidate

Agent Control 4.5 is an **EXPERIMENTAL release candidate**, not a stable
release. The frozen integrated implementation is
`d229ce4b7dd3bd704a331f81ca59600541430682`; Agent Control 4.4.0 remains the
latest formally released baseline.

## Candidate scope

The candidate includes governed skill learning and deterministic skill
promotion, provider-neutral **Your Memories**, the Cross-Device Session Vault,
power-aware evidence, Environment Discovery, the live Estate Map, Process Map,
Control Room, Replay, graphical Compare, Morrow and the six crew roles. These
features remain projections and governed extensions of the existing Work Parcel,
route, execution, memory and evidence sources of truth.

Discovery is read-only by default and separates discovered, qualified,
recommended, approved and active state. Estate Map and Process Map share one
graph language but do not own configuration or execution. Runtime Map WATCH is
read-only; map-originated mutation remains deferred to 4.6 governance work.

Your Memories remains advisory. Session Vault preserves exact source evidence;
Obsidian is optional and does not replace Agent Control's provider-neutral
memory architecture. Deterministic skills require repeated verified sources and
explicit promotion. Model output cannot install executable code.

## Frozen-candidate qualification

The exact candidate passed 1,312/1,312 automated tests. A fresh physical Runtime
Map run exercised six concurrent jobs, a local Qwen model call, real terminal
output, a controlled retry, eight sealed batons, aggregation, independent
verification, Control Room, Replay, graphical Compare and Process/Estate
cross-linking. The final projection had 71 nodes and 75 edges. A separate
read-only discovery scan populated the Estate Map from nine genuine local
resources with no configuration mutation. Real 1920×1080 screenshots from both
runs are in the README.

Every row of the historical 12-route Your Memories matrix remains accounted
for. Eleven exact historical routes are now PASS/FIXED. The exact OpenRouter
GLM-5.3-Flash→Qwen route remains `BLOCKED_EXTERNAL`; a separate production run
proved the same exact GLM model→Qwen pair through the qualified NVIDIA-hosted
adapter without relabelling the blocked route. Qwen→Pixel Gemma 4 E4B passed the
unchanged semantic verifier after the expected bare `nextAction` representation
was made explicit. Its two public aliases represent one physical route, not two
runs. The MSI account-isolated Luna→Sol transition and beneficial Qwen/Sol
consolidation remain preserved historical evidence.

Token and cache use is reported with its authority. The fresh Runtime Map model
call reported 68 input tokens, including 67 cached and one newly processed,
plus 28 output and 96 total tokens. Monetary cost was unavailable and is not
claimed.

## Negative results and release boundary

The exact `openbmb/MiniCPM5-2B-GGUF` Q4_K_M configuration remains `FAILED` for
governed code repair: 0/3 controller-node GPU, 0/1 comparable remote Linux seed and 0/3
CPU. Known-good and scripted real-path controls passed. Agent Control denies only
that immutable configuration and does not label the MiniCPM family failed.

The qualified route-intent specialist consumed more measured-component energy
per verified result than warm Qwen. The specialist-energy advantage is therefore
`DISPROVEN`. The warm-residency route effect is also `DISPROVEN` at the available
measurement resolution. Synchronized whole-node energy remains
`BLOCKED_EXTERNAL`; board and package readings are not whole-node measurements.
No automatic energy, shutdown or residency policy is released.

These were mandatory 4.5 physical acceptance criteria. Consequently the current
verdict is **NOT READY FOR 4.5 RELEASE**. No merge, tag, GitHub Release or
deployment is authorized.

See the [release-closure audit](evidence/agent-control-4.5-release-closure-20260912.md),
[completion gate](evidence/agent-control-4.5-release-gate-completion-20260912.md),
[historical reconciliation](evidence/agent-control-4.5-release-gate-20260912.md),
[skill-learning architecture](agent-control-4.5-skill-learning-architecture-review.md),
[deterministic skill guide](deterministic-skill-promotion.md),
[Your Memories portability guide](project-memory-portability.md),
[Runtime Map guide](runtime-map.md), [Environment Discovery guide](environment-discovery.md),
[energy guide](energy-aware-intelligence.md), and
[deployment/rollback guide](DEPLOYMENT.md).
