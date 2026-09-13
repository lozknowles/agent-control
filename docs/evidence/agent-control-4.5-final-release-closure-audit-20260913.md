# Agent Control 4.5 final release-closure audit

- Date: 2026-09-13
- Release target: `4.5.0`
- Branch: `feature/4.5-release-closure`
- Implementation candidate: `31ccdf07f9aeb96cec0ea87a8cfb2bf1607ae86b`
- Evidence checkpoint before this audit: `8399cc657eb8be77bbcde61be8fcd2fbf16015bd`
- Released baseline: `v4.4.0`
- Verdict: **PASS WITH LIMITATIONS — READY FOR 4.5 RELEASE**
- Release action: **NONE** — this audit does not merge, tag, release or deploy.

## Purpose and authority

This is the single current-facing Agent Control 4.5 closure record. It
reconciles the complete 4.5 specification with the existing physical evidence;
it does not rerun passed qualifications merely to make additional media.

Earlier evidence remains immutable and authoritative for what happened at its
recorded commit. In particular, the earlier
[release-closure report](agent-control-4.5-release-closure-20260912.md) correctly
records its then-current `NOT READY` conclusion. The subsequent
acceptance-contract audit established that the specialist-energy and
warm-residency items were hypotheses that 4.5 had to test, not predetermined
positive product outcomes, and that unavailable whole-node instrumentation
blocks a whole-node claim rather than safe operation. The later operator release
authorization accepted that interpretation, then paused release for the final
virgin-install, source-distribution and live-estate qualification. Those added
gates are now complete.

This report supersedes older documents only for the **current release-readiness
calculation**. It does not rewrite their measurements, failures, hashes or
historical verdicts.

## Frozen boundary

| Item | Audited value |
| --- | --- |
| Product version | `4.5.0` |
| Candidate product commit | `31ccdf07f9aeb96cec0ea87a8cfb2bf1607ae86b` |
| Candidate tree | `0253a07125859bac247e951c85d16051849980fa` |
| Evidence-only descendant | `8399cc657eb8be77bbcde61be8fcd2fbf16015bd` |
| Evidence-only delta | One 4.5 virgin-bootstrap/runtime report; no product code |
| Remote branch parity before audit | Local and `origin/feature/4.5-release-closure` both `8399cc657eb8be77bbcde61be8fcd2fbf16015bd` |
| `origin/main` before audit | `4f54031d88587ec4eb70072559d8bf54f56f91ec` |
| `v4.5.0` | Absent |
| 4.6 product implementation | None included; 4.6 remains roadmap only |

The final complete candidate validation passed **1,331/1,331 tests** together
with TypeScript, bootstrap syntax, dashboard syntax, infrastructure-neutrality,
implementation-status and source-distribution checks. Its preserved log is
`agent-control-4.5-candidate-31ccdf0-full-check.log`, SHA-256
`512ea7e62388f1e1f8ade70ad24907c68eb1e2b8333fdb135e5bb49c1ecfd99e`.
This audit reuses that exact result and does not rerun the full suite.

## Status vocabulary

- **PASS** — the requirement is implemented and its required deterministic or
  physical evidence passed.
- **PASS WITH LIMITATIONS** — the requirement is safely satisfied, but a
  bounded unsupported route, unavailable measurement or deliberately deferred
  control remains. The limitation is not an active product claim.
- **BLOCKED** — the exact requested physical route or measurement could not be
  exercised. A blocked row is a release blocker only when the acceptance
  contract requires that exact route/measurement for a released claim.

Model or experiment outcomes such as `FAILED` and `DISPROVEN` appear inside the
evidence column. They are not relabelled as model successes. The status column
answers whether Agent Control met the requirement to qualify, govern and report
that outcome safely.

## Specification coverage

The matrix below traces the complete current 4.5 scope assembled by the
governed workstream, including later corrections and release-gate additions:

| Specification family | Matrix section |
| --- | --- |
| Governed Local Skill Learning and Specialist Model Training | B |
| Deterministic skill promotion and energy-minimal hierarchy | B, D |
| ChatGPT/Obsidian cross-node Your Memories and portability matrix | C |
| Power-Aware Intelligence and Specialist Models | D |
| Cross-Device Session Vault and decision provenance | E |
| Setup & Environment Discovery Wizard, CLI/runtime and custom capability extensions | F |
| Live Estate Map and unified Process/Estate graph | G |
| Runtime Map visual acceptance, six-job run, Control Room, Replay and Compare | H |
| Release closure, source-distribution separation and virgin Sentinel/Moto install | A, I |

Later instructions narrow earlier ones where they conflict: uncontrolled network
scanning remains prohibited; absent products need not be installed to make a
discovery test pass; a disproven optimisation must remain disabled; historical
media stays outside the normal source clone; and existing passed physical tests
are reused rather than restaged.

## Complete requirement matrix

### A. Release boundary, governance and evidence

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Exact branch, version, source and evidence identity | PASS | Candidate, tree, evidence descendant, main and absent tag are recorded above. |
| Preserve existing physical evidence | PASS | Historical reports and external assets remain unchanged and hash-addressed. |
| Do not fabricate unavailable values or successful routes | PASS | Cost, whole-node power, unsupported discovery and unavailable routes remain explicitly unavailable/blocked. |
| No 4.6 implementation in 4.5 | PASS | 4.6 Agent Orchestrator and desired-state work remains roadmap-only. |
| Full deterministic regression | PASS | Preserved exact-candidate result: 1,331/1,331. |
| TypeScript, bootstrap and dashboard syntax | PASS | Preserved final candidate validation passed. |
| Infrastructure neutrality and implementation status | PASS | Preserved final candidate validation passed. |
| Documentation links and distribution boundary | PASS | Current lightweight evidence links resolve; heavyweight evidence is external. |
| Secret-safe evidence boundary | PASS | Final evidence scan covered 89 files / 84,983,196 bytes with no current credential or operator token. |
| Release mutation prohibited during audit | PASS | No merge, tag, GitHub Release or deployment is performed by this audit. |

### B. Governed skill learning and deterministic reuse

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Reuse Work Parcels, routes, batons, verification and evidence | PASS | Skill learning is integrated through existing governed abstractions; no second engine exists. |
| Provider-, model- and runtime-neutral learning contracts | PASS | Core lifecycle is generic; the physical LoRA implementation is an adapter. |
| Research and select an efficient bounded technique | PASS | CPU LoRA over pinned SmolLM2-135M was selected and documented for the exact route-intent task. |
| `OBSERVE → IDENTIFY → DATASET → BASELINE → TRAIN → QUALIFY → REGISTER → ROUTE → MONITOR → RETIRE` lifecycle | PASS | Lifecycle, statuses and durable registry are implemented and tested. |
| Candidate discovery cannot initiate training | PASS | Observation only nominates candidates; approval and policy gates remain mandatory. |
| Teacher/student provenance and data governance | PASS | Reviewed examples, source identities and authority are retained; model output cannot install code. |
| Frozen, disjoint evaluation and baseline | PASS | 120-example training and 40-example held-out sets are separately hashed; baseline is preserved. |
| Real local adaptation | PASS | Four-epoch CPU LoRA completed through an approved Work Parcel without disturbing protected GPU services. |
| Immutable specialist identity and registry | PASS | Base revision, adapter SHA-256, runtime, dataset, evaluator and qualification are bound. |
| Material capability improvement | PASS WITH LIMITATIONS | Exact task improved from 0.00 to 0.40 exact accuracy and 1.00 schema validity; this is not a broad quality claim. |
| Governed specialist route | PASS | A real positive Work Parcel selected the exact specialist, emitted `LANE_REVIEW` and passed independent verification. |
| Inappropriate-task rejection and fallback | PASS | Ineligible work failed closed before model invocation; base/general routes remain available. |
| Wrong base/runtime, stale or corrupt composition rejection | PASS | Qualification and deterministic regressions fail closed. |
| Warm cache and learned specialist remain distinct | PASS | Registry/routing do not equate cache warmth with learned capability. |
| Adapter composition | PASS WITH LIMITATIONS | Investigated but not claimed or enabled without independent qualification. |
| No uncontrolled online learning | PASS | Runtime outcomes cannot mutate weights or silently promote a candidate. |
| Failure, interruption and rollback behavior | PASS | Required failure classes and retained fallback are covered without weakening validation. |
| Human-readable dashboard/POE explanation | PASS | Learned Specialists and Morrow expose identity, lifecycle, measured result, limits and route reason. |
| Reproducibility | PASS | Frozen identities, hashes, commands and evidence are documented; heavy model artifacts remain external/local by hash. |
| Deterministic skill promotion gate | PASS | Versioned handler, source parcels, contracts, freshness and independent verifier are required. |
| Deterministic reuse physical benefit | PASS | 45/45 physical executions passed; measured-component reductions were 99.37–99.45% for eligible bounded operations. |
| Novel/changed input rejection | PASS | Changed repository state rejected deterministic reuse and escalated to Qwen with independent PASS. |
| Energy-minimal execution hierarchy | PASS | Deterministic result/tool/memory/skill precede models only when qualified; capability and verification remain authoritative. |

### C. Your Memories and cross-model portability

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| One provider-neutral Your Memories architecture | PASS | `ProjectMemoryPort` and structured Markdown are reused; no competing memory subsystem was introduced. |
| Obsidian optional, not mandatory | PASS | Obsidian-compatible Markdown is a selectable representation/backend; core behavior survives its removal. |
| Memory content, indexing, storage, provenance, governance and retrieval remain distinct | PASS | Contracts and evidence preserve these boundaries. |
| Node-local namespaces and governed synchronization | PASS | Byte-identical cross-node transfer and content-hash reconciliation are proven; shared concurrent canonical editing is rejected. |
| Relevance, provenance, confidence and freshness checks | PASS | Retrieval is bounded and advisory; stale, conflicting and irrelevant records are rejected. |
| Historical evidence cannot become memory automatically | PASS | Promotion requires existing admission policy, approval and independent validation. |
| Memory retains source-evidence linkage | PASS | Promoted records preserve supporting evidence hashes. |
| Cold reconstruction without originating transcript | PASS | Physically exercised across supported writer/reader routes with semantic verification. |
| Memory versus full context versus no memory comparison | PASS | The three-condition comparison and token/context effects are recorded without turning keywords into semantic success. |
| Strong-model consolidation | PASS | Qwen/Sol consolidation improved average semantic reconstruction from 86.37% to 90.91%. |
| Cross-node MSI continuation | PASS | Cottage Plus/Luna → Lawrence Pro/Sol completed with account/node isolation, token reconciliation and independent verification. |
| Exact 12-row historical matrix accounting | PASS WITH LIMITATIONS | 11/12 exact routes are PASS/FIXED. OpenRouter GLM-5.3-Flash→Qwen remains `BLOCKED_EXTERNAL`. |
| Provider-neutral GLM→Qwen capability | PASS | The same GLM-5.3-Flash→Qwen model pair passed physically through the qualified NVIDIA adapter; this does not relabel OpenRouter. |
| Pixel Gemma 4 E4B writer and reader | PASS | Writer passed repeated trials; reader passed the unchanged semantic verifier after the required bare `nextAction` representation was explicit. |
| Unsupported memory routes fail before entrusted execution | PASS | Route qualification records enforce contract/runtime freshness and safe deny/escalation. |
| Exact OpenRouter GLM→Qwen route | BLOCKED | Authentication/provider availability blocked this provider-specific cell; it is not active or counted as a pass. |

### D. Power-aware qualification and specialist hypotheses

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Scope-safe power telemetry | PASS | GPU-board, Intel package and DRAM boundaries are identified separately with measured authority. |
| Never present component readings as whole-node power | PASS | Reports and routing retain the narrower measurement boundary. |
| Baseline → train → held-out qualify → compare | PASS | All stages completed with frozen task/data identities and independent correctness checks. |
| Energy to verified completion | PASS | Failed attempts and fallback are included; only correct results count. |
| Memory energy comparison | PASS | Real `ProjectMemoryPort` retrieval passed 15/15; no measurable saving was found or claimed. |
| Training energy and break-even | PASS | 5,232.820 incremental measured-component joules were recorded; no positive specialist break-even exists. |
| Specialist-energy advantage hypothesis | PASS WITH LIMITATIONS | Experiment completed and result is `DISPROVEN`: retained specialist used 22.674 J/result versus warm Qwen 20.426 J/result. No energy-saving route is admitted. |
| Warm-residency routing hypothesis | PASS WITH LIMITATIONS | Synchronized component experiment closed as `DISPROVEN`/not measurable at available resolution; residency energy is prohibited from influencing routing. |
| Synchronized whole-node measurement | BLOCKED | No qualified whole-node meter exists. This blocks a whole-node claim, not safe product operation; no such claim is released. |
| Expected-total-energy routing | PASS | Deterministic execution is preferred when eligible; direct warm general model wins where failed specialist plus fallback costs more. |
| Escalation remains available | PASS | Rejected deterministic and specialist paths retain governed fallback. |
| POE energy digest | PASS | Digest exposes result, route, scope and baseline and reports savings only for comparable measurements. |
| Exact MiniCPM5-2B Q4_K_M code-repair qualification | PASS WITH LIMITATIONS | Qualification completed with genuine `FAILED` result (0/3 GPU, 0/1 comparable remote seed, 0/3 CPU); exact configuration is unroutable. The family is not blacklisted. |

The two `DISPROVEN` outcomes satisfy the requirement to test those hypotheses
truthfully. They would block graduation of the tested energy optimisation as a
positive capability; 4.5 does not graduate, enable or advertise that
optimisation. The `BLOCKED` whole-node row similarly prevents a whole-node
energy claim. None prevents the safe, fail-closed product capabilities from
being released.

### E. Cross-Device Session Vault

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Extend Your Memories rather than replace it | PASS | Session Vault is immutable evidence; curated memory remains `ProjectMemoryPort`. |
| Discover provider-native sessions safely | PASS | Codex is the first adapter; core schema does not require Codex fields. |
| Immutable content-addressed capture | PASS | Native source bytes and object hashes are preserved; active/incomplete state is represented. |
| Normalized provider-neutral events | PASS | Available/unavailable fields and source references are explicit. |
| Repository/commit attribution | PASS | Physical scenario B linked repository, commit, session, node and evidence with confidence. |
| Decision provenance and “why changed” | PASS | Explicit rationale is preferred; inference must be labelled and evidence-linked. |
| Search and historical retrieval | PASS | Scenario A retrieved replicated context while the source node was unavailable. |
| Safe cross-device continuation | PASS | Scenario D created a new governed session/Work Parcel with repository checks and preserved source. |
| Branching, lease and split-brain denial | PASS | Scenario E denied conflicting mutation while retaining read-only inspection. |
| Replication backend neutrality | PASS | Stable content-addressed replication and a non-Codex path use the same core contracts. |
| Privacy, retention and synthetic-secret policy | PASS | Scenario F excluded/redacted/encrypted protected content; logs did not expose the fixture. |
| Tamper detection | PASS | Scenario G rejected the modified object and displayed degradation. |
| Dashboard explorers and POE | PASS | Session, Decision, Repository, Continuation, Replication and Policy views use authoritative evidence. |
| Migration, operator, threat and recovery documentation | PASS | Canonical guides and schemas are present and linked. |
| Physical A–H matrix | PASS | All eight required scenarios passed. |
| MSI Obsidian desktop application in the original A–H run | PASS WITH LIMITATIONS | It was blocked in that run, but later MSI/Obsidian-backed memory continuation passed; Obsidian-off survival remains proven. |

### F. Setup, Environment Discovery and capability registry

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Permanent first-run/rescan/add/import wizard | PASS | First Run, Quick/Full scan and governed add/import paths are available under Environment Discovery. |
| Dashboard available before discovery | PASS | Physically proven on the clean Moto installation. |
| Local OS/CPU/RAM/GPU/VRAM/disk/network discovery | PASS WITH LIMITATIONS | Generic adapters and physical Linux/Sentinel observations pass; absent or inaccessible fields remain unknown. |
| Local LLM runtime and model discovery | PASS | llama.cpp/Qwen were physically found on hpubuntu; absent runtimes/models on clean Moto remained absent. |
| CLI/agent/runtime classification | PASS | Generic types, installed/running/auth/health/qualification states and adapters are implemented. |
| Ollama, llama.cpp, LM Studio, vLLM and OpenAI-compatible adapter coverage | PASS WITH LIMITATIONS | Detection/health contracts are deterministic and llama.cpp is physical; not every product was installed for physical qualification. |
| Codex and other CLI-agent discovery | PASS WITH LIMITATIONS | Codex was physically discovered; Claude Code/Gemini remain adapter-qualified only where not installed. |
| User-specified executable, endpoint and remote path support | PASS | Capability registry accepts machine-bound references without moving or modifying executables. |
| Imported capability definitions are untrusted | PASS | `REVIEW → VALIDATE → TEST → APPROVE → ENABLE` strips executable behavior and requires governance. |
| Pluggable adapter contract | PASS | Identity, detection, probes, auth, capabilities, execution, qualification and security are separated from core. |
| Unknown capability handling | PASS | Unknown resources are not guessed or executed automatically. |
| Credential-presence/authentication discovery | PASS | Opaque references and fixed safe states are used; file existence alone does not imply authentication. |
| No raw credential in inventory, evidence or browser payload | PASS | Deterministic and physical secret scans pass. |
| Optional Your Memories/Obsidian discovery | PASS | Explicit selection does not grant route access or activate memory. |
| Quick Test / Full Qualification boundary | PASS | Qualification reuses existing governed framework; potentially costly/stateful checks require authority. |
| Recommended topology is advisory | PASS | Recommendation revision/hash and approval boundaries prevent discovery from activating routes. |
| Change detection and history | PASS | `NEW`, `CHANGED`, `REMOVED`, `OFFLINE`, auth/model/endpoint changes persist without secrets. |
| `DISCOVERED → QUALIFIED → RECOMMENDED → APPROVED → ACTIVE` boundary | PASS | Material apply becomes a normal governed Work Parcel. |
| Safe configured remote-node discovery | PASS WITH LIMITATIONS | Known/configured host adapters are supported; uncontrolled scanning is prohibited. |
| Unconfigured Tailscale peer auto-discovery | PASS WITH LIMITATIONS | Clean Moto did not infer its qualification transport. This is truthful and matches the operator's no-injection/no-uncontrolled-scan boundary. |
| Mobile/edge install and local discovery | PASS | Normal full clone/bootstrap, dashboard, scan, job and Estate transition passed physically on Android 15/Termux. |
| Mobile model/runtime discovery | PASS WITH LIMITATIONS | Capability exists, but the clean Moto contained no model/runtime; none was fabricated. Pixel Gemma execution is proven separately. |
| Discovery remains read-only | PASS | Physical scans created zero proposals/configuration mutations/provider calls. |
| Partial adapter failure and unavailable-resource handling | PASS | Failures are isolated and surfaced; stale observations cannot remain falsely healthy. |
| Deterministic discovery/security suite | PASS | Included in the preserved 1,331-test full candidate run. |

### G. Live Estate Map and Process/Estate continuity

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Reuse Runtime Map graph architecture | PASS | Process and Estate are projections of one graph/event language, not separate engines. |
| Live Estate rather than static inventory | PASS | Discovery establishes topology; current observations and heartbeat establish live state. |
| Device/transport/endpoint/runtime/model/agent/tool/provider relationships | PASS | Only evidenced relationships are rendered; no label-based identity inference. |
| Multiple transport relationships | PASS | Generic typed edges support multiple transports without assuming one topology. |
| Hierarchy, search, filters, zoom and collapse | PASS | Dense first-run estate grouping and bounded layout are implemented and physically inspected. |
| Resource and connection inspectors | PASS | Safe machine/runtime/model/agent/edge metadata and fixed credential masks are available. |
| `DISCOVERED`, `REACHABLE`, `AUTHENTICATED`, `QUALIFIED`, `AVAILABLE`, `ACTIVE` separation | PASS | Clean-node and hpubuntu scans demonstrate truthful distinctions. |
| “Alive” requires current verification | PASS | Resource-specific freshness prevents historical discovery from masquerading as health. |
| Estate heartbeat | PASS | Current verified counts derive from live state, not inventory totals. |
| Process Map → Show in Estate | PASS | Genuine Moto Work Parcel resolved exact worker identity to Estate. |
| Estate → active/recent work → Process Map | PASS | Inverse action returned to the same authoritative parcel. |
| Availability is not active work | PASS | Qualification-discovered defect fixed at `357fc6e`; regression added. |
| Exact identity survives missing node assertion | PASS | Fixed at `17b7f2c`; actual node mismatch still fails closed. |
| Genuine health transition | PASS | Final candidate observed `HEALTHY → OFFLINE/REMOVED → HEALTHY/CHANGED` from a disposable loopback endpoint. |
| Recovered resource is `CHANGED`, not `UNCHANGED` | PASS | Final candidate fix `31ccdf0` is physically evidenced and tested. |
| Credential/connection security | PASS | Fixed-length mask, permission-aware metadata and no reveal function are enforced. |

### H. Runtime Map, Control Room, Replay and Compare

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Projection of actual governed state | PASS | Work Parcels, Runs, sessions, batons, model/cache/memory and verification remain source of truth. |
| Dynamic directed graph | PASS | Topology is derived from execution; no six-job structure is hard-coded. |
| Parallel and nested work | PASS | Deterministic 1/6/20/55-job tests plus real six-root fan-out/fan-in pass. |
| Clustering, semantic collapse, pan/zoom/fit | PASS | Large graphs retain readable labels and progressive detail. |
| Accessible live state vocabulary | PASS | State uses label/icon/border as well as colour and respects reduced motion. |
| Honest animated execution path | PASS | Six roots changed independently; aggregation waited for real dependencies. |
| Required runtime node types | PASS | Requests, planners, parcels, jobs, lanes, workers, models, decisions, cache, memory, tools, terminals, gates, retries, approvals, batons, aggregation and results map from events. |
| Progressive map → job → worker → step → session → evidence | PASS | Physically demonstrated in the exact-candidate Runtime Map run. |
| Actual live terminal/session WATCH | PASS | Authenticated read-only stream advanced while the real job ran. |
| Governed model/tool/decision/cache/memory/baton inspectors | PASS | Safe metadata, route rationale and evidence links are shown without secrets. |
| Adaptive Control Room | PASS | Six real concurrent tiles displayed worker, model authority, activity, elapsed state and safe output. |
| WATCH versus CONTROL boundary | PASS WITH LIMITATIONS | WATCH is complete. Map-originated mutation is deferred because no safe adapter delegates to existing control authority; no backdoor was added. |
| Evidence integration | PASS | Every graph element resolves to authoritative identities/references where available. |
| Historical Replay and scrubber | PASS | Timestamp-bounded state and terminal evidence reconstruct the recorded run. |
| Graphical Compare | PASS | Distinct 13-operation baseline and 71-operation candidate compare topology and evidence facets. |
| Grounded Morrow/POE narration | PASS | Narration derives from actual transitions and focuses associated evidence. |
| Large-graph responsiveness | PASS | 55-job/nested projection remains under the 250 ms deterministic bound. |
| Measured runtime overhead | PASS WITH LIMITATIONS | 13.644 ms mean / 19.457 ms p95 projection and 114 ms bounded SSE sample are recorded for the qualified controller, not universal claims. |
| Viewer disconnect/reconnect safety | PASS | Aborted refresh did not affect execution; later event reconciled authoritative state. |
| Redaction and permissions | PASS | Secrets are removed at evidence/session boundaries rather than hidden by CSS. |
| Genuine physical acceptance run | PASS | Six roots, model, terminal, decision, retry, eight batons, aggregation and verification completed. |
| HD recording and transcript | PASS | 1920×1080 recording, complete transcript and manifest are preserved externally by hash. |
| Executive and engineering usability | PASS | Leader KPIs and progressive technical drill-down passed visual acceptance. |

### I. Virgin install, source distribution and first use

| Requirement | Status | Authoritative result |
| --- | --- | --- |
| Normal public clone excludes heavyweight historical evidence | PASS | Full non-shallow Moto clone transferred 5.93 MiB; evidence remains in a checksummed public archive. |
| Historical evidence retained with provenance | PASS | Pre-rewrite bundle, archive, manifest and old/new relationships are public and hash-verified. |
| Normal documented clone; no shallow/partial workaround | PASS | Final clean Moto attempt used the ordinary full-clone procedure. |
| Linux/Windows/Termux prerequisites are documented | PASS | Virgin attempts exposed and corrected missing/ambiguous instructions. |
| Bootstrap install from clean checkout | PASS | Clean Moto and Sentinel paths completed after generic fixes. |
| Owner-only, no-overwrite first config | PASS | Termux hard-link restriction now falls back to exclusive copy; mode and hash were verified. |
| Idempotent reinstall/config preservation | PASS | Second install returned `UNCHANGED_EMPTY`; config hash remained unchanged. |
| Android owned-process cleanup | PASS | `android` uses the physically proven procfs/process-group adapter; descendant cleanup passed. |
| Start control plane before Environment Discovery | PASS | First dashboard was available before first-run scan. |
| New-user walkthrough follows product documentation | PASS WITH LIMITATIONS | Initial failures are preserved and generic docs/bootstrap were fixed. Sentinel SSH forwarding remained prohibited; a temporary read-only relay was qualification infrastructure, not an install step. |
| Sentinel physical baseline and install screenshots | PASS | Real clone, bootstrap, check, controller and first-dashboard captures are externally preserved. |
| First-run Environment Discovery | PASS | Moto `FIRST_RUN`/`QUICK_TEST` found 37 actual local resources and no invented provider/model. |
| Estate Map populated from observations | PASS | 40 nodes / 39 edges with LIVE freshness from the scan. |
| First genuine governed job | PASS | Human request, sealed approval, Work Parcel, Run, baton and independent verification are recorded. |
| Process/Estate navigation | PASS | The real job moved from Process to exact Estate worker and back. |
| Safe live health transition | PASS | Genuine disposable endpoint stop/restart was observed; no production service changed. |
| Restart/bootstrap persistence | PASS | Repeat bootstrap/install and controller lifecycle preserved configuration and evidence. |
| Moto supported role | PASS WITH LIMITATIONS | Full Termux controller/worker/discovery/job role passed; no absent local model or qualification transport is claimed as discovered. |
| Screenshot/video safety | PASS | Public assets passed scoped secret review; one private TTY token echo was rotated and excluded from evidence. |
| Full final candidate regression after fixes | PASS | 1,331/1,331 on controller; prior final clean Moto suite 1,327 pass plus one platform-inapplicable Linux-PTY skip. |

## Remaining gaps and their release effect

| Gap retained | Classification | Active release claim? | Release effect |
| --- | --- | --- | --- |
| OpenRouter GLM-5.3-Flash→Qwen exact route | `BLOCKED_EXTERNAL` | No; exact route is not available/active | None; fail closed. NVIDIA evidence proves portability but does not relabel OpenRouter. |
| MiniCPM5-2B Q4_K_M exact code-repair configuration | `FAILED` | No; exact artifact/runtime is unroutable | None; negative qualification is preserved. |
| Specialist energy advantage | `DISPROVEN` | No; no saving is advertised or used for routing | None; experiment is complete and safer direct routing is selected. |
| Warm-residency energy benefit | `DISPROVEN` / below resolution | No; residency energy is excluded from routing | None; closed negative result. |
| Synchronized whole-node energy | `BLOCKED_EXTERNAL` | No whole-node claim | None; narrower component measurements remain accurately labelled. |
| Automatic discovery of an unconfigured Tailscale peer | Not discovered | No; uncontrolled network scanning is prohibited | None; configured/authorised remote discovery remains supported. |
| Every optional third-party runtime physically installed | Not tested where absent | No universal-install claim | None; adapter tests plus truthful installed-estate discovery satisfy scope. |
| Runtime Map mutation controls | Deferred to 4.6 | No; Runtime Map is explicitly WATCH-only | None; existing governed control APIs remain authoritative. |

There is no remaining **release-blocking** requirement. There are bounded
unsupported resources and measurements, all of which fail closed or remain
outside released claims.

## Embedded physical evidence

Heavy media is intentionally hosted outside the normal product clone. The
following images are embedded directly from the public, immutable
[Agent Control qualification evidence release](https://github.com/lozknowles/agent-control-qualification-evidence/releases/tag/source-separation-20260912).
All URLs returned HTTP 200 during this audit.

### Clean installation and first dashboard

The first Sentinel clone exposed the heavyweight-history packaging defect. It
is retained as evidence rather than hidden.

![Sentinel virgin installation at the original public repository clone stage](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/sentinel-install-02-public-repository-clone.png)

The corrected documented bootstrap completed without an undocumented product
workaround.

![Sentinel documented Agent Control bootstrap completed](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/sentinel-install-07-bootstrap-complete.png)

![Sentinel complete installed validation passed](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/sentinel-install-09-full-check-complete.png)

![Sentinel first Agent Control dashboard connection](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/sentinel-install-11-first-dashboard.png)

### Real Environment Discovery and Estate Map

These are real dashboard captures from the previously qualified frozen 4.5
Runtime/Estate candidate. Later virgin-install fixes did not replace their
runtime evidence; their exact source identity remains in the historical report.

![Agent Control 4.5 Environment Discovery dashboard populated by a real read-only scan](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/dashboard-overview.png)

![Agent Control 4.5 Estate Map populated from actual discovery observations](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/estate-map-real-discovery.png)

### Real parallel Process Map, Control Room and Compare

![Agent Control 4.5 Process Map with six genuine concurrent jobs](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/process-map-six-jobs-running.png)

![Agent Control 4.5 Control Room showing the same six concurrent jobs](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/process-map-control-room.png)

![Agent Control 4.5 Compare view showing a 13-operation baseline beside the 71-operation candidate](https://github.com/lozknowles/agent-control-qualification-evidence/releases/download/source-separation-20260912/process-map-compare.png)

## Evidence index

- [Virgin bootstrap, first-run, governed job and health transition](agent-control-4.5-virgin-bootstrap-runtime-qualification-20260913.md)
- [Source-distribution remediation and clean Moto install](agent-control-4.5-source-distribution-remediation-20260912.md)
- [Runtime Map visual acceptance](agent-control-4.5-runtime-map-visual-acceptance-20260912.md)
- [Environment Discovery qualification](agent-control-4.5-environment-discovery-qualification-20260912.md)
- [Session Vault A–H physical qualification](agent-control-4.5-session-vault-physical-qualification-20260912.md)
- [Governed skill-learning qualification](agent-control-4.5-governed-skill-learning-20260911.md)
- [Deterministic skill promotion](agent-control-4.5-deterministic-skill-promotion-20260911.md)
- [Specialist-energy negative result](agent-control-4.5-specialist-energy-qualification-20260911.md)
- [Historical 12-row closure reconciliation](agent-control-4.5-release-closure-20260912.md)
- [MiniCPM exact-configuration failure](minicpm5-2b-qualification-closure-20260912.md)
- [4.5 release-candidate notes](../release-notes-4.5.0.md)
- [Deployment and rollback guide](../DEPLOYMENT.md)
- [Public heavyweight evidence archive](https://github.com/lozknowles/agent-control-qualification-evidence/releases/tag/source-separation-20260912)

## Final verdict

**PASS WITH LIMITATIONS — READY FOR 4.5 RELEASE**

Agent Control 4.5 satisfies the current acceptance contract. Every historical
matrix row and release finding remains visible. Unsupported routes and the
failed MiniCPM configuration are excluded from routing; negative energy and
residency results remain negative; unavailable whole-node instrumentation is
not promoted into a claim. Source installation, first run, discovery, live
Estate/Process projections, governed execution, memory/skill behavior,
security, evidence and rollback boundaries are qualified.

This is a recommendation only. **No merge, tag, GitHub Release or deployment
has been performed.**
