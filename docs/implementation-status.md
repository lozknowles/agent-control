# Implementation status

Release boundary: **3.9.0**. Registry updated: **2026-09-05**.

This document is generated from `config/implementation-status.json`. Update the registry and run `npm run status:implementation -- --write`; do not edit this projection directly. `IMPLEMENTED` means executable source and focused tests exist. `QUALIFIED` additionally requires recorded real evidence. `PARTIAL`, `PLANNED` and `NOT_IMPLEMENTED` remain explicit gaps.

| Capability | Status | Executable truth | Remaining boundary |
| --- | --- | --- | --- |
| Replaceable governed Social and Voice capabilities (`social-voice.providers`) | **PARTIAL** | Actual enrolled WhatsApp voice intake, untrusted STT, fresh text confirmation, governed AC-3 Work Parcel execution and delivered short voice summary passed. Human confirmed corrected summary clear. Physical OmniVoice inference passed on P5000 and integrated Intel Arc; provider-neutral boundaries and durable history remain authoritative. | Private pilot only. General speech quality, real model handoff, repository-review routing, multi-lane video, long-duration soak and production deployment remain unqualified. Final 0.9 playback rate has codec/STT evidence but no second handset rating. |
| Optional governed OpenWA messaging pilot (`messaging.openwa-pilot`) | **PARTIAL** | Signed direct commands, authenticated two-step enrolment, immutable template grants, durable runtime request keys, outbound recovery and private dashboard setup are implemented and automatically tested. | Live enrolment, help, typecheck, status, cancellation with cleanup and delivered reports passed; real reconnect and controlled duplicate replay passed. Evidence uses actual gateway messages beside separately captured dashboard frames, not handset footage. Handset dashboard links and real model handoff remain unqualified; no qualified review provider exists and benchmark execution remains gated. |
| Persistent Work Parcel context ledger and bounded baton views (`context.persistent-parcel-ledger`) | **QUALIFIED** | Each Work Parcel retains immutable goal and steering provenance, concise active state, a SHA-linked durable event ledger, governed historical retrieval and content-hashed bounded baton projections. Compaction or handoff can remove history from the current view without deleting it, and exact retrieval can recover excluded failures for later execution. | None recorded. |
| Asynchronous Work Parcel DAGs and evidence-gated completion (`work-parcels.async-dag-criteria`) | **QUALIFIED** | Validated Work Parcel dependency graphs dispatch policy-allowed independent stages concurrently, pause only branches named by stable asynchronous questions, resume them after a durable answer and require structured success criteria with provenance and evidence before parcel success. Steering remains append-only and never rewrites the original goal. | None recorded. |
| Provider-neutral capability intelligence and capabilities-first routing (`models.capability-intelligence`) | **QUALIFIED** | Normalized observations distinguish supported from unsupported, native from Agent Control-emulated and verified from advertised capability across provider, account, model, runtime, version and node identities. Routing filters on required verified capabilities before optimizing quality, reliability, latency, cost and token/cache efficiency; external discoveries enter an auditable candidate lifecycle rather than changing architecture automatically. | None recorded. |
| Frozen model qualification and historical outcome intelligence (`models.historical-evaluation-intelligence`) | **PARTIAL** | A content-hashed frozen suite records every repetition in an append-only ledger with exact candidate identity, scoring, failure class, elapsed time, provider usage, fresh/cache token split and cost authority. Rolling 7/30/90-day and all-time projections expose task economics, regressions, conservative lifecycle state and evidence-gated leaders without overwriting prior results. | Two real llama.cpp candidates completed two frozen batches and all 204 attempts persisted. Browser/computer/workflow evaluators, authoritative local current-context occupancy and monetary/energy cost were unavailable, while same-day history is intentionally insufficient for automatic preferred-model promotion. |
| Independent runtime safety supervision (`runtime.independent-safety-supervisor`) | **QUALIFIED** | A provider-independent supervisor evaluates requested goal, action class, repository/filesystem scope, remote node, credential use, external communication and destructive/deployment consequences before Job execution. ALLOW, ALLOW_WITH_AUDIT, REQUIRE_APPROVAL, DENY, PAUSE and ESCALATE decisions plus reasons and approvals are durable and do not delegate governance to provider safety systems. | None recorded. |
| Live context, capability and model-intelligence dashboard (`dashboard.capability-context-intelligence`) | **QUALIFIED** | The authenticated dashboard projects Work Parcel context metrics, criteria, asynchronous questions, bounded retrieval, model leaders, capability watch, frozen batches, rolling history, cache/fresh-token economics, lifecycle controls, regressions and independent safety decisions from durable stores. Core SSE remains live when an optional dashboard projection is unavailable. | None recorded. |
| Durable execution identity and bounded recovery (`execution.resilient-recovery`) | **QUALIFIED** | Normal and parameterised Jobs persist exact execution identity, classify transport/enrolment/authentication/configuration failures, reconcile rather than replay unresolved work after restart, and expose bounded route-preserving retry state with real deadlines and remaining budget. | Representative physical qualification proved separate-authority reconciliation after an actual controller SIGKILL, same-route authentication recovery, bounded retry exhaustion and cancellation during backoff without replay or duplicate accounting. Provider/runtime combinations that do not expose authoritative reattachment still fail closed and require their own qualification. |
| Owned process trees and verified cancellation cleanup (`execution.verified-process-cleanup`) | **QUALIFIED** | Actions receive an owned-execution port. Linux captures process start identity and terminates/verifies the process group; Windows uses fixed CIM inventory plus bounded tree termination; cancellation, timeout and handoff retain explicit confirmed, uncertain, identity-mismatch or failed cleanup evidence. | Linux process-group and Windows process-tree cancellation are physically qualified, including descendants, timeout, identity mismatch and retained protection under cleanup uncertainty. Other substrates deliberately report uncertainty when descendant absence cannot be proven. |
| Truthful resilient lifecycle and telemetry dashboard (`dashboard.resilient-live-lifecycle`) | **QUALIFIED** | The Jobs dashboard renders durable authentication, reconnect, cancellation, cleanup uncertainty, reason, retry deadline/budget, telemetry source/freshness, token/cache composition and process-cleanup evidence; reload and SSE reconnect reconcile a full authoritative snapshot without browser-owned state. | None recorded. |
| Provenance-aware resource telemetry and procfs fallbacks (`nodes.provenance-aware-telemetry`) | **PARTIAL** | Managed-node measurements preserve value, source, authority, freshness, limitations and admission qualification. Linux prefers procfs; bounded Node os fallbacks and two-sample Android sysfs cpuidle busy derivation keep unavailable/stale/reset data distinct from zero. | A physical Pixel produced a current derived cpuidle busy sample, explicitly not qualified for admission. Its temperature and storage were unavailable in that observation; the fallback is not a universal Android resource-telemetry qualification. |
| Governed local Android wireless-ADB reliability (`android.local-adb-reliability`) | **QUALIFIED** | A bounded helper serializes pairing/reconnect ownership, recovers stale attempts, accepts pairing PIN only through local stdin, discovers pairing/connect DNS-SD services, preserves stable device identity, distinguishes paired from usable, verifies connection independently and publishes ADB transport capability only while qualified. | Physically qualified on the recorded Android 17 / Termux / ADB 35.0.2 environment for hidden-stdin pairing, intended-device verification, capability withdrawal, same- and changed-endpoint reconnect, governed typed execution and fresh-process session resume. Other Android/ADB builds remain capability-assessed, and first pairing remains an explicit local ceremony. |
| Portable prompt-cache boundary and truthful accounting (`providers.portable-prompt-cache-boundary`) | **PARTIAL** | Provider-neutral stable/volatile prompt blocks preserve deterministic rendering. Responses adapters add hashed cache keys or explicit breakpoints only when provider and model both advertise the qualified capability; cache reads, writes, fresh/total input and configured costs remain separate through execution and dashboard accounting. | A matched known-answer comparison produced equal independent quality scores, but the candidate used more tokens and elapsed time. The Codex CLI route exposes automatic cache-read observations but not explicit Responses controls, cache-write counts, authoritative current context or billed cost; no token, latency or economic saving is claimed. |
| Human-readable execution history and schema diagnostics (`dashboard.human-readable-execution-history`) | **QUALIFIED** | Saved Job Runs and Lanes expose a bounded redacted chronological projection derived from their existing durable Run, Work Parcel, token-governor and baton records. Actor, association, telemetry authority, governor, baton, provider-result, verification and accounting semantics remain explicit without adding a transcript store or mutation path. Repository-review provider and application schemas now express the same semantic constraints and retain safe failing paths while validation remains fail closed. | The v3.8.1 rejected provider bodies were intentionally ephemeral, so their exact failing field/value cannot be reconstructed; new failures record only safe field paths and constraints. The browser recording is content-addressed external qualification media rather than a product dependency, and no actual 3.8.2 baton transfer is claimed. |
| Credential residency and provider execution locality (`providers.credential-residency`) | **QUALIFIED** | Provider-neutral account profiles distinguish workload/repository, provider-execution and credential-residency nodes. Remote repositories cross the existing managed-node boundary only as hash-verified immutable archives; credentials remain opaque node-local references. Routes, batons, contracts, telemetry, recovery and dashboard/ledger views preserve all three localities, while legacy 3.8 profile configuration is normalized compatibly. | Remote Windows-node-to-controller immutable repository transfer, two-account baton continuation/fallback, remote account-status, and a GLM whole-repository review are physically qualified. Spark remains disabled by default; intentionally ignored and .git-internal mutations remain outside its mutation ledger and are a documented deferred hardening risk. |
| Governed retrieval and context intelligence (`context.governed-retrieval`) | **QUALIFIED** | An opt-in provider-neutral retrieval governor supplies bounded content-addressed Evidence Packets through local exact/BM25 and optional zg semantic/hybrid adapters, assesses sufficiency from observable exact/coverage/freshness signals, binds evidence to repository content, revalidates portable references after restart and handoff, selects index use through a generic resource policy, and streams redacted lifecycle telemetry over existing SSE. | The 12-task physical mutation comparison qualified context reduction and fail-safe lifecycle behaviour, not broader Qwen2.5 3B capability: all lanes verified only 2/12. Retrieval remains opt-in, weak evidence falls back, index mutation requires separate authority, and the cross-provider-implementation baton variant remains unexercised. |
| Persistent identity, sessions and delegation (`identity.sessions-delegation`) | **PARTIAL** | Actors, Agents, immutable session creators, attributed participants, context-transfer hashes, authority-subset delegation, opaque secret-use receipts and execution lineage are persistent; execution admission enforces participant/session/delegation authority plus model, node, filesystem and network envelopes, while the Sessions dashboard projects parcels, batons, delegations, runtimes and chain accounting. | The physical Luna to local Qwen to GLM-5.3-Flash to Luna chain is qualified for one bounded contract, including detach/restart, yield/substitution and independent verification. The 50-attempt production-routing gate remains unqualified. |
| Contract-owned process and PTY runtime (`execution.contract-pty-runtime`) | **PARTIAL** | A durable versioned contract owns objective, criteria, authority, budget, route, sealed baton, process/PTY identity, attachments, permissions, pending actions, verification and evidence. Consultation/reconnect are read-only, write ownership is singular and explicitly transferred, human takeover fences agents, and cancellation, timeout, orphaning and output ordering reconstruct after restart. | The durable authority model, governed handoffs and redacted dashboard projection are implemented; operating-system-specific PTY creation and signal delivery remain adapters beneath this record. |
| Governed worker handoff outcomes (`execution.governed-handoffs`) | **IMPLEMENTED** | SACRIFICE, SUBSTITUTE, DELEGATE, YIELD and COMPLETE have exact durable transitions over contract-owned state. AUTO remains inside authority and budget; risky, privileged, production, destructive, expanded-envelope and explicit MANUAL requests require operator approval without manufacturing withheld authority. | None recorded. |
| ACP v1 governed session adapter (`interop.acp-v1-adapter`) | **PARTIAL** | The official ACP SDK validates and frames a transport-neutral stable-v1 core; agent-control acp serves NDJSON stdio and the explicit remote adapter serves authenticated Streamable HTTP/WebSocket with TLS-gated non-loopback binding. Durable session lifecycle, prompts, ordered plan/tool updates, idempotent namespaced delivery and cancellation map into Actors, governed Sessions, context transfers and Work Parcels without adding a control path. | Official SDK clients qualify stdio, Streamable HTTP and WebSocket on ephemeral loopback, and an independent raw-wire harness covers malformed/invalid traffic. Production TLS exposure and cancellation while provider, permission or client-owned tool work is pending remain unqualified. ACP v2 is disabled and not claimed. |
| Provider and model lifecycle management (`models.provider-lifecycle`) | **IMPLEMENTED** | Session-neutral logical providers, immutable exact model recipes, evidence-gated lifecycle states, versioned champion/challenger routing, historical replay and verified rollback are durable. Credentials remain indirect references and placement requirements remain semantic rather than machine identities. | The lifecycle is implemented, but physical multi-provider promotion and automatic production Job adoption remain gated by physical observations for the frozen benchmark. |
| Frozen capability-routing and coordinator/baton benchmark (`models.capability-routing-benchmark`) | **PARTIAL** | A frozen 60-task corpus with a 12-task holdout predeclares route-safety and physical-outcome criteria across LOCAL, SPARK, STANDARD and FRONTIER. It also compiles a same-job twelve-child coordinator experiment with separate parent/baton accounting. | The deterministic classifier passed 60/60 with zero unsafe false positives, but no physical model observations exist. Provider success, latency, token/cost, change-integrity and coordinator integration gates remain unqualified; automatic production routing stays disabled. |
| Physical Luna/local/GLM/Luna governed chain (`models.physical-multi-provider-chain`) | **QUALIFIED** | A real bounded contract ran through exact gpt-5.6-luna, loopback qwen2.5-3b-instruct-q4_k_m.gguf, OpenRouter z-ai/glm-5.3-flash and Luna integration. Local YIELD, GLM SUBSTITUTE, minimal batons, controller reconstruction and independent child/parent verification all completed. | GLM required three bounded attempts, token/cost telemetry was unavailable, and this one synthetic contract does not satisfy the larger automatic-routing benchmark. |
| Redacted ACP contract handoff and lifecycle dashboard projection (`dashboard.runtime-observability`) | **IMPLEMENTED** | GET /api/runtime and the existing Sessions, Systems and Models views project stable ACP v1 transport/session state, contract/process/PTY ownership, approvals, handoffs, baton hashes/sizes and immutable provider/model lifecycle without adding mutation authority. | Persisted ACP bindings are transport-neutral, so per-session stdio versus remote attribution remains unknown. Remote listener liveness is configured-but-unobserved rather than inferred. |
| Token-aware baton routing and live telemetry (`routing.token-aware-baton`) | **QUALIFIED** | Provider-neutral thread telemetry keeps cumulative lifetime tokens separate from current context occupancy and preserves total/fresh/cached input independently through Job, Work Parcel, baton, history and live dashboard records. Missing cache detail remains unknown, discount-sensitive cost fails closed, Codex cumulative turn usage is never relabeled as current context, and explicit unavailable post-compaction counts clear stale pressure. Configurable governor transitions, context lifecycle, sealed baton provenance, failed-handoff recovery and account/model/node-chain totals remain durable. Account-bound Codex review uses the existing local/remote node port with a strict immutable-context capability envelope, while the dashboard streams the reconciled projection over existing SSE. | The post-3.8.2 matched Codex sequences proved truthful cache/context accounting and removal of observed native command execution, but prompt-cache hits varied from 35% to 0% under identical prompts and no reliable token or latency saving was established. Codex exec supplies no authoritative current-context or turn-cost field. Persistent native sessions/compaction remain disabled until lifecycle isolation and a practical benefit are qualified. |
| Governed fast-execution model class (`models.fast-execution-spark`) | **PARTIAL** | Conservative trivial-work classification, authenticated Spark probing, exact registry selection, minimal sealed batons, clean-worktree Codex execution, one-attempt/zero-subagent policy, independent verification, escalation and telemetry are executable; the frozen live benchmark verified all seven Spark cases. | Research-preview entitlement is not universal, cost was unreported, the corpus is small and production Job adoption is not yet qualified; keep spark.enabled false by default. |
| Persistent Teammates and verified coordination (`teammates.persistent-coordination`) | **QUALIFIED** | Named teammates retain bounded instructions, evidence-backed context and routines; controlled conversations delegate specialist and synthesis work through ordinary capability-placed Jobs with telemetry and verifier gates. | None recorded. |
| Safe empty-configuration bootstrap (`bootstrap.safe-empty-config`) | **IMPLEMENTED** | An idempotent initializer creates a schema-valid empty configuration without discovering infrastructure or overwriting operator state. | None recorded. |
| Universal authoritative status command (`status.universal-authoritative-command`) | **IMPLEMENTED** | The same agent-control status command reads the versioned AgentControlService projection used by the web dashboard, locally or through one fixed read-only localhost request over SSH. | None recorded. |
| Generic managed Linux nodes (`nodes.generic-linux-management`) | **QUALIFIED** | Authorised Linux/SSH resources receive fixed read-only discovery, heartbeat and workload projection plus typed governed inspection and maintenance Actions without an arbitrary remote-command path. | None recorded. |
| Default adaptive-harness dispatch (`harness.default-work-dispatch`) | **IMPLEMENTED** | Normal WorkExecutor agent work builds and records an ExecutionRecipe and receives only a live policy gateway. | None recorded. |
| Central live ToolPolicy gateway (`tools.central-live-policy`) | **IMPLEMENTED** | Gateway tools are checked against recipe grants, worker compatibility, live lease and ownership generations, approvals and human ownership. | None recorded. |
| Token-aware command output and ripgrep expansion (`output.token-aware-command-results`) | **QUALIFIED** | Authoritative local or remote command results can be represented as complete, compacted, truncated or artifact-only context with scoped progressive expansion, provenance and token accounting; ripgrep has a structured semantic index. | None recorded. |
| Harness efficiency telemetry and context profiles (`harness.efficiency-context-routing`) | **PARTIAL** | Provider-neutral invocation telemetry, THIN/STANDARD/DEEP profiles, context packets, a neutral context-graph port, bounded structured mutation execution, deterministic diff verification, cumulative escalation outcomes and dashboard/API projections are executable; routing stays observational with STANDARD applied. | The 12-task same-model real-mutation run did not qualify THIN, immediate DEEP selection or adaptive escalation: only 2/12 STANDARD outcomes verified and adaptive fresh tokens per verified outcome were materially higher. Keep production routing observational with STANDARD applied until a larger deterministic suite demonstrates success non-regression and cumulative-resource improvement. |
| Job Catalog, scheduler and Run Ledger (`jobs.catalog-scheduler-ledger`) | **IMPLEMENTED** | Versioned Jobs and Schedules produce durable Runs with capability placement, locks, retries, artifacts, approvals and recovery. | None recorded. |
| Parameterised Jobs, schedules and repository review (`jobs.parameterized-platform`) | **QUALIFIED** | Versioned Job Definitions and typed parameters produce portable Saved Jobs, deterministic persistent schedules, immutable Runs and attributable Work Parcels; the built-in read-only repository review freezes exact Git revisions, handles successful delta baselines, routes a qualified provider directly, validates findings and preserves usage, cost and evidence. | None recorded. |
| Capability-advertising Worker Registry (`workers.capability-registry`) | **IMPLEMENTED** | Workers advertise semantic capabilities and health separately from provider/model routing. | None recorded. |
| Provider-neutral external model registry (`models.provider-neutral-registry`) | **QUALIFIED** | Configured providers, models, node-scoped qualification, logical roles, explicit fallbacks, normalized usage, ephemeral Codex provider materialization and dashboard/API projections are executable and fail closed; a real governed GLM-5.3-Flash route completed direct-provider repository reviews with structured evidence and cost accounting. | None recorded. |
| Model-backed Job Action bridge (`jobs.model-backed-action`) | **QUALIFIED** | Agent Actions delegate through HarnessDispatcher, return tool requests through ToolPolicy and stop at the verification boundary. | None recorded. |
| OpenAI Responses API execution (`providers.openai-responses`) | **QUALIFIED** | A real Responses API Job returned a policy-gated function call and a verified checksummed artifact. | None recorded. |
| Codex execution with ChatGPT-plan authentication (`providers.openai-codex-chatgpt-plan`) | **QUALIFIED** | Real Codex Jobs use saved ChatGPT authentication under a strict ephemeral read-only envelope. Immutable structured review ignores user/rule/project context, disables known native action-capable tool surfaces, preserves provider-reported total/fresh/cached usage, and leaves current context unavailable when Codex exposes only cumulative turn usage; returned Agent Control tool requests still use the central gateway. | None recorded. |
| Universal verification-to-acceptance coverage (`verification.universal-adapter-coverage`) | **PARTIAL** | Claim, evidence, verification and acceptance are distinct and model-backed Jobs are gated, but every adapter and task type is not yet universally covered. | Add task-specific verification policies and enforce them across every adapter and Action family. |
| Opaque CLI internal-tool mediation (`executors.opaque-cli-internal-tools`) | **PARTIAL** | CLI processes can be constrained by an approved capability envelope, and immutable Codex review now disables its known native shell, multi-agent, retrieval and interactive action surfaces under strict config validation. Internal CLI actions are still not individually authorised by ToolPolicy; observed item types are post-run evidence only. | Keep provider-specific native surfaces disabled where the workload does not require them; add authoritative per-action mediation or immediate process suspension before claiming universal ToolPolicy coverage for an opaque CLI. |
| Qualified skill selection (`skills.qualified-selection`) | **IMPLEMENTED** | Only qualified, evidence-carrying skills may satisfy recipe capability requirements and skills cannot expand tool authority. | None recorded. |
| Governed skill proposal and promotion (`skills.governed-lifecycle`) | **PLANNED** | Agents may eventually propose skills, but Agent Control must statically check, sandbox-test, qualify, approve and grant them. | No proposal, security-review, sandbox-qualification or promotion workflow is implemented. |
| Automatic governed recipe learning (`recipes.automatic-learning`) | **PLANNED** | Successive halving exists, but winners are not automatically promoted into a durable governed recipe catalog. | Persist qualification evidence and require policy approval before learned recipes influence routing. |

## Evidence map

### Replaceable governed Social and Voice capabilities

- Source: [`src/control/social-voice.ts`](../src/control/social-voice.ts), [`src/control/social-voice-providers.ts`](../src/control/social-voice-providers.ts), [`src/control/openwa-social-provider.ts`](../src/control/openwa-social-provider.ts), [`src/control/speech-http-provider.ts`](../src/control/speech-http-provider.ts), [`scripts/speech-worker.py`](../scripts/speech-worker.py)
- Tests: [`src/control/social-voice.test.ts`](../src/control/social-voice.test.ts), [`src/control/speech-http-provider.test.ts`](../src/control/speech-http-provider.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/social-voice/README.md`](../docs/social-voice/README.md), [`docs/social-voice/security.md`](../docs/social-voice/security.md), [`docs/social-voice/qualification.md`](../docs/social-voice/qualification.md)

### Optional governed OpenWA messaging pilot

- Source: [`src/control/openwa.ts`](../src/control/openwa.ts), [`src/control/messaging-commands.ts`](../src/control/messaging-commands.ts), [`src/control/repository-test-actions.ts`](../src/control/repository-test-actions.ts)
- Tests: [`src/control/openwa.test.ts`](../src/control/openwa.test.ts)
- Qualification evidence: [`docs/openwa/README.md`](../docs/openwa/README.md), [`docs/openwa/live-qualification.md`](../docs/openwa/live-qualification.md)

### Persistent Work Parcel context ledger and bounded baton views

- Source: [`src/control/parcel-context.ts`](../src/control/parcel-context.ts), [`src/control/work-parcels.ts`](../src/control/work-parcels.ts)
- Tests: [`src/control/parcel-context.test.ts`](../src/control/parcel-context.test.ts), [`src/control/work-parcels.test.ts`](../src/control/work-parcels.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-qualification.json`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.json)

### Asynchronous Work Parcel DAGs and evidence-gated completion

- Source: [`src/control/work-parcels.ts`](../src/control/work-parcels.ts), [`src/control/parcel-context.ts`](../src/control/parcel-context.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts)
- Tests: [`src/control/work-parcels.test.ts`](../src/control/work-parcels.test.ts), [`src/control/parcel-context.test.ts`](../src/control/parcel-context.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-qualification.json`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.json)

### Provider-neutral capability intelligence and capabilities-first routing

- Source: [`src/control/capability-intelligence.ts`](../src/control/capability-intelligence.ts), [`src/control/model-registry.ts`](../src/control/model-registry.ts)
- Tests: [`src/control/capability-intelligence.test.ts`](../src/control/capability-intelligence.test.ts), [`src/control/model-registry.test.ts`](../src/control/model-registry.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-qualification.json`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.json)

### Frozen model qualification and historical outcome intelligence

- Source: [`src/control/model-intelligence.ts`](../src/control/model-intelligence.ts), [`src/control/model-evaluation-runtime.ts`](../src/control/model-evaluation-runtime.ts), [`config/qualification-suite-v1.json`](../config/qualification-suite-v1.json)
- Tests: [`src/control/model-intelligence.test.ts`](../src/control/model-intelligence.test.ts), [`src/control/model-evaluation-runtime.test.ts`](../src/control/model-evaluation-runtime.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-qualification.json`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.json)

### Independent runtime safety supervision

- Source: [`src/control/runtime-safety-supervisor.ts`](../src/control/runtime-safety-supervisor.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts)
- Tests: [`src/control/runtime-safety-supervisor.test.ts`](../src/control/runtime-safety-supervisor.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-qualification.json`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.json)

### Live context, capability and model-intelligence dashboard

- Source: [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-models.js`](../assets/dashboard/dashboard-models.js), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js), [`assets/dashboard/dashboard-parameterized-jobs.js`](../assets/dashboard/dashboard-parameterized-jobs.js)
- Tests: [`src/control/web-server.test.ts`](../src/control/web-server.test.ts), [`scripts/browser-dashboard.test.mjs`](../scripts/browser-dashboard.test.mjs)
- Qualification evidence: [`docs/evidence/agent-control-3.9-provider-neutral-qualification.md`](../docs/evidence/agent-control-3.9-provider-neutral-qualification.md), [`docs/evidence/agent-control-3.9-provider-neutral-dashboard-video.json`](../docs/evidence/agent-control-3.9-provider-neutral-dashboard-video.json), [`docs/evidence/agent-control-3.9-provider-neutral-dashboard.mp4`](../docs/evidence/agent-control-3.9-provider-neutral-dashboard.mp4)

### Durable execution identity and bounded recovery

- Source: [`src/control/execution-recovery.ts`](../src/control/execution-recovery.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/parameterized-job-engine.ts`](../src/control/parameterized-job-engine.ts), [`src/control/parameterized-job-types.ts`](../src/control/parameterized-job-types.ts)
- Tests: [`src/control/execution-recovery.test.ts`](../src/control/execution-recovery.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts), [`src/control/parameterized-jobs.test.ts`](../src/control/parameterized-jobs.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-evidence-gap-matrix.md`](../docs/evidence/agent-control-3.9-evidence-gap-matrix.md), [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md)

### Owned process trees and verified cancellation cleanup

- Source: [`src/control/owned-process.ts`](../src/control/owned-process.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/contract-runtime.ts`](../src/control/contract-runtime.ts), [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts)
- Tests: [`src/control/owned-process.test.ts`](../src/control/owned-process.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts), [`src/control/contract-runtime.test.ts`](../src/control/contract-runtime.test.ts), [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md)

### Truthful resilient lifecycle and telemetry dashboard

- Source: [`assets/dashboard/dashboard-running-state.js`](../assets/dashboard/dashboard-running-state.js), [`assets/dashboard/dashboard-parameterized-jobs.js`](../assets/dashboard/dashboard-parameterized-jobs.js), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js), [`assets/dashboard/dashboard.js`](../assets/dashboard/dashboard.js), [`src/control/application-service.ts`](../src/control/application-service.ts)
- Tests: [`scripts/dashboard-running-state.test.mjs`](../scripts/dashboard-running-state.test.mjs), [`scripts/browser-dashboard.test.mjs`](../scripts/browser-dashboard.test.mjs), [`src/control/execution-history.test.ts`](../src/control/execution-history.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md)

### Provenance-aware resource telemetry and procfs fallbacks

- Source: [`src/control/resource-telemetry.ts`](../src/control/resource-telemetry.ts), [`src/control/managed-node.ts`](../src/control/managed-node.ts), [`scripts/managed-node-probe.sh`](../scripts/managed-node-probe.sh)
- Tests: [`src/control/resource-telemetry.test.ts`](../src/control/resource-telemetry.test.ts), [`src/control/managed-node.test.ts`](../src/control/managed-node.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md)

### Governed local Android wireless-ADB reliability

- Source: [`android/adb-local.mjs`](../android/adb-local.mjs), [`android/node-server.mjs`](../android/node-server.mjs), [`android/resource-agent.sh`](../android/resource-agent.sh)
- Tests: [`android/adb-local.test.mjs`](../android/adb-local.test.mjs)
- Qualification evidence: [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md)

### Portable prompt-cache boundary and truthful accounting

- Source: [`src/control/provider-prompt.ts`](../src/control/provider-prompt.ts), [`src/control/openai-compatible-provider.ts`](../src/control/openai-compatible-provider.ts), [`src/control/codex-repository-review-client.ts`](../src/control/codex-repository-review-client.ts), [`src/control/work-parcels.ts`](../src/control/work-parcels.ts), [`scripts/qualify-provider-cache-boundary.ts`](../scripts/qualify-provider-cache-boundary.ts)
- Tests: [`src/control/provider-prompt.test.ts`](../src/control/provider-prompt.test.ts), [`src/control/openai-compatible-provider.test.ts`](../src/control/openai-compatible-provider.test.ts), [`src/control/direct-repository-review-executor.test.ts`](../src/control/direct-repository-review-executor.test.ts), [`src/control/harness-efficiency.test.ts`](../src/control/harness-efficiency.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.9-qualification.md`](../docs/evidence/agent-control-3.9-qualification.md), [`docs/evidence/agent-control-post-3.8.2-context-efficiency.md`](../docs/evidence/agent-control-post-3.8.2-context-efficiency.md)

### Human-readable execution history and schema diagnostics

- Source: [`src/control/execution-history.ts`](../src/control/execution-history.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/direct-repository-review-executor.ts`](../src/control/direct-repository-review-executor.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-parameterized-jobs.js`](../assets/dashboard/dashboard-parameterized-jobs.js), [`assets/dashboard/dashboard.js`](../assets/dashboard/dashboard.js), [`assets/dashboard/dashboard-jobs.css`](../assets/dashboard/dashboard-jobs.css)
- Tests: [`src/control/execution-history.test.ts`](../src/control/execution-history.test.ts), [`src/control/direct-repository-review-executor.test.ts`](../src/control/direct-repository-review-executor.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/execution-history.md`](../docs/execution-history.md), [`docs/evidence/agent-control-3.8.2-human-readable-history-qualification.md`](../docs/evidence/agent-control-3.8.2-human-readable-history-qualification.md)

### Credential residency and provider execution locality

- Source: [`src/control/provider-account-profile.ts`](../src/control/provider-account-profile.ts), [`src/control/model-registry.ts`](../src/control/model-registry.ts), [`src/control/account-profile-qualification.ts`](../src/control/account-profile-qualification.ts), [`src/control/codex-node-execution.ts`](../src/control/codex-node-execution.ts), [`src/control/resource-repository-resolver.ts`](../src/control/resource-repository-resolver.ts), [`src/control/parameterized-job-engine.ts`](../src/control/parameterized-job-engine.ts), [`scripts/codex-node-windows.ps1`](../scripts/codex-node-windows.ps1), [`scripts/repository-snapshot-windows.ps1`](../scripts/repository-snapshot-windows.ps1), [`assets/dashboard/dashboard-models.js`](../assets/dashboard/dashboard-models.js), [`assets/dashboard/dashboard-parameterized-jobs.js`](../assets/dashboard/dashboard-parameterized-jobs.js), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js)
- Tests: [`src/control/credential-residency.test.ts`](../src/control/credential-residency.test.ts), [`src/control/model-registry.test.ts`](../src/control/model-registry.test.ts), [`src/control/codex-node-execution.test.ts`](../src/control/codex-node-execution.test.ts), [`src/control/config.test.ts`](../src/control/config.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/credential-residency.md`](../docs/credential-residency.md), [`docs/evidence/agent-control-3.8.1-qualification.md`](../docs/evidence/agent-control-3.8.1-qualification.md), [`docs/evidence/agent-control-3.8.1-resumed-physical-evidence.json`](../docs/evidence/agent-control-3.8.1-resumed-physical-evidence.json), [`docs/evidence/agent-control-3.8.1-high-remediation-physical.json`](../docs/evidence/agent-control-3.8.1-high-remediation-physical.json), [`docs/evidence/agent-control-3.8.1-final-glm-review.md`](../docs/evidence/agent-control-3.8.1-final-glm-review.md)

### Governed retrieval and context intelligence

- Source: [`src/control/governed-retrieval.ts`](../src/control/governed-retrieval.ts), [`src/control/retrieval-resource-policy.ts`](../src/control/retrieval-resource-policy.ts), [`src/control/direct-repository-review-executor.ts`](../src/control/direct-repository-review-executor.ts), [`src/control/harness-efficiency.ts`](../src/control/harness-efficiency.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js)
- Tests: [`src/control/governed-retrieval.test.ts`](../src/control/governed-retrieval.test.ts), [`src/control/retrieval-resource-policy.test.ts`](../src/control/retrieval-resource-policy.test.ts), [`src/control/direct-repository-review-executor.test.ts`](../src/control/direct-repository-review-executor.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.8-retrieval-benchmark.json`](../docs/evidence/agent-control-3.8-retrieval-benchmark.json), [`docs/evidence/agent-control-3.8-local-model-retrieval.json`](../docs/evidence/agent-control-3.8-local-model-retrieval.json), [`docs/evidence/agent-control-3.8-phase2-qualification.json`](../docs/evidence/agent-control-3.8-phase2-qualification.json), [`docs/evidence/agent-control-3.8-phase2-qualification.md`](../docs/evidence/agent-control-3.8-phase2-qualification.md), [`docs/evidence/agent-control-3.8.0-release-qualification.md`](../docs/evidence/agent-control-3.8.0-release-qualification.md)

### Persistent identity, sessions and delegation

- Source: [`src/control/identity-control-plane.ts`](../src/control/identity-control-plane.ts), [`src/control/context-deterioration.ts`](../src/control/context-deterioration.ts), [`src/control/work-parcels.ts`](../src/control/work-parcels.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-sessions.js`](../assets/dashboard/dashboard-sessions.js)
- Tests: [`src/control/identity-control-plane.test.ts`](../src/control/identity-control-plane.test.ts), [`src/control/context-deterioration.test.ts`](../src/control/context-deterioration.test.ts), [`src/control/work-parcels.test.ts`](../src/control/work-parcels.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.5-qualification.md`](../docs/evidence/agent-control-3.5-qualification.md)

### Contract-owned process and PTY runtime

- Source: [`src/control/contract-runtime.ts`](../src/control/contract-runtime.ts)
- Tests: [`src/control/contract-runtime.test.ts`](../src/control/contract-runtime.test.ts)
- Qualification evidence: [`docs/contract-pty-runtime.md`](../docs/contract-pty-runtime.md)

### Governed worker handoff outcomes

- Source: [`src/control/handoff-runtime.ts`](../src/control/handoff-runtime.ts), [`src/control/contract-runtime.ts`](../src/control/contract-runtime.ts)
- Tests: [`src/control/handoff-runtime.test.ts`](../src/control/handoff-runtime.test.ts), [`src/control/contract-runtime.test.ts`](../src/control/contract-runtime.test.ts)
- Qualification evidence: [`docs/governed-handoffs.md`](../docs/governed-handoffs.md), [`docs/contract-pty-runtime.md`](../docs/contract-pty-runtime.md)

### ACP v1 governed session adapter

- Source: [`src/acp.ts`](../src/acp.ts), [`src/acp-remote.ts`](../src/acp-remote.ts), [`src/control/acp-bootstrap.ts`](../src/control/acp-bootstrap.ts), [`src/control/acp-runtime.ts`](../src/control/acp-runtime.ts), [`src/control/acp-remote.ts`](../src/control/acp-remote.ts), [`src/control/acp-adapter.ts`](../src/control/acp-adapter.ts), [`src/control/identity-control-plane.ts`](../src/control/identity-control-plane.ts), [`scripts/agent-control.mjs`](../scripts/agent-control.mjs)
- Tests: [`src/control/acp-runtime.test.ts`](../src/control/acp-runtime.test.ts), [`src/control/acp-remote.test.ts`](../src/control/acp-remote.test.ts), [`src/control/acp-adapter.test.ts`](../src/control/acp-adapter.test.ts), [`src/control/identity-control-plane.test.ts`](../src/control/identity-control-plane.test.ts)
- Qualification evidence: [`docs/acp-compatibility.md`](../docs/acp-compatibility.md)

### Provider and model lifecycle management

- Source: [`src/control/provider-lifecycle.ts`](../src/control/provider-lifecycle.ts), [`src/control/model-registry.ts`](../src/control/model-registry.ts)
- Tests: [`src/control/provider-lifecycle.test.ts`](../src/control/provider-lifecycle.test.ts), [`src/control/model-registry.test.ts`](../src/control/model-registry.test.ts)
- Qualification evidence: [`docs/provider-model-lifecycle.md`](../docs/provider-model-lifecycle.md), [`docs/models/ADDING-A-PROVIDER.md`](../docs/models/ADDING-A-PROVIDER.md)

### Frozen capability-routing and coordinator/baton benchmark

- Source: [`src/control/capability-routing-benchmark.ts`](../src/control/capability-routing-benchmark.ts), [`scripts/benchmark-capability-routing.ts`](../scripts/benchmark-capability-routing.ts)
- Tests: [`src/control/capability-routing-benchmark.test.ts`](../src/control/capability-routing-benchmark.test.ts)
- Qualification evidence: [`docs/capability-routing-benchmark.md`](../docs/capability-routing-benchmark.md), [`docs/evidence/capability-routing-benchmark-v1.json`](../docs/evidence/capability-routing-benchmark-v1.json)

### Physical Luna/local/GLM/Luna governed chain

- Source: [`src/control/contract-runtime.ts`](../src/control/contract-runtime.ts), [`src/control/handoff-runtime.ts`](../src/control/handoff-runtime.ts)
- Tests: [`src/control/contract-runtime.test.ts`](../src/control/contract-runtime.test.ts), [`src/control/handoff-runtime.test.ts`](../src/control/handoff-runtime.test.ts)
- Qualification evidence: [`docs/physical-multi-provider-qualification.md`](../docs/physical-multi-provider-qualification.md), [`docs/evidence/physical-multi-provider-chain-20260901.json`](../docs/evidence/physical-multi-provider-chain-20260901.json)

### Redacted ACP contract handoff and lifecycle dashboard projection

- Source: [`src/control/runtime-observability.ts`](../src/control/runtime-observability.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-sessions.js`](../assets/dashboard/dashboard-sessions.js), [`assets/dashboard/dashboard-models.js`](../assets/dashboard/dashboard-models.js), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js)
- Tests: [`src/control/runtime-observability.test.ts`](../src/control/runtime-observability.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/web-dashboard.md`](../docs/web-dashboard.md), [`docs/security-3.6.md`](../docs/security-3.6.md), [`docs/evidence/agent-control-3.6-development-qualification.md`](../docs/evidence/agent-control-3.6-development-qualification.md)

### Token-aware baton routing and live telemetry

- Source: [`src/control/token-aware-baton-routing.ts`](../src/control/token-aware-baton-routing.ts), [`src/control/direct-repository-review-executor.ts`](../src/control/direct-repository-review-executor.ts), [`src/control/parameterized-job-engine.ts`](../src/control/parameterized-job-engine.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts), [`src/control/contract-runtime.ts`](../src/control/contract-runtime.ts), [`src/control/handoff-runtime.ts`](../src/control/handoff-runtime.ts), [`src/control/provider-account-profile.ts`](../src/control/provider-account-profile.ts), [`src/control/account-profile-qualification.ts`](../src/control/account-profile-qualification.ts), [`src/control/codex-node-execution.ts`](../src/control/codex-node-execution.ts), [`src/control/codex-repository-review-client.ts`](../src/control/codex-repository-review-client.ts), [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/model-registry.ts`](../src/control/model-registry.ts), [`src/control/openai-compatible-provider.ts`](../src/control/openai-compatible-provider.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`scripts/codex-node-windows.ps1`](../scripts/codex-node-windows.ps1), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js), [`assets/dashboard/dashboard-models.js`](../assets/dashboard/dashboard-models.js)
- Tests: [`src/control/token-aware-baton-routing.test.ts`](../src/control/token-aware-baton-routing.test.ts), [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/codex-node-execution.test.ts`](../src/control/codex-node-execution.test.ts), [`src/control/account-profile-qualification.test.ts`](../src/control/account-profile-qualification.test.ts), [`src/control/model-registry.test.ts`](../src/control/model-registry.test.ts), [`src/control/openai-compatible-provider.test.ts`](../src/control/openai-compatible-provider.test.ts), [`src/control/direct-repository-review-executor.test.ts`](../src/control/direct-repository-review-executor.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/token-aware-baton-routing.md`](../docs/token-aware-baton-routing.md), [`docs/evidence/agent-control-3.7-development-qualification.md`](../docs/evidence/agent-control-3.7-development-qualification.md), [`docs/evidence/agent-control-3.7-physical-qualification-20260902.md`](../docs/evidence/agent-control-3.7-physical-qualification-20260902.md), [`docs/evidence/agent-control-3.7-physical-lifecycle-20260903.json`](../docs/evidence/agent-control-3.7-physical-lifecycle-20260903.json), [`docs/evidence/agent-control-post-3.8.2-context-efficiency.md`](../docs/evidence/agent-control-post-3.8.2-context-efficiency.md)

### Governed fast-execution model class

- Source: [`src/control/fast-execution.ts`](../src/control/fast-execution.ts), [`scripts/benchmark-fast-execution.ts`](../scripts/benchmark-fast-execution.ts), [`src/control/config.ts`](../src/control/config.ts), [`src/control/configuration-store.ts`](../src/control/configuration-store.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-enhancements.js`](../assets/dashboard/dashboard-enhancements.js), [`assets/dashboard/dashboard-sessions.js`](../assets/dashboard/dashboard-sessions.js)
- Tests: [`src/control/fast-execution.test.ts`](../src/control/fast-execution.test.ts), [`src/control/config.test.ts`](../src/control/config.test.ts), [`src/control/configuration-store.test.ts`](../src/control/configuration-store.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.5-qualification.md`](../docs/evidence/agent-control-3.5-qualification.md), [`artifacts/fast-execution/benchmark-2026-09-01T19-56-37-144Z.json`](../artifacts/fast-execution/benchmark-2026-09-01T19-56-37-144Z.json)

### Persistent Teammates and verified coordination

- Source: [`src/control/teammates.ts`](../src/control/teammates.ts), [`src/control/teammates-demo.ts`](../src/control/teammates-demo.ts), [`config/teammates.initial.json`](../config/teammates.initial.json), [`scripts/init-teammates.ts`](../scripts/init-teammates.ts), [`scripts/demo-persistent-teammates.ts`](../scripts/demo-persistent-teammates.ts)
- Tests: [`src/control/teammates.test.ts`](../src/control/teammates.test.ts)
- Qualification evidence: [`docs/evidence/persistent-teammates-3.2.0-verification.md`](../docs/evidence/persistent-teammates-3.2.0-verification.md)

### Safe empty-configuration bootstrap

- Source: [`scripts/config.mjs`](../scripts/config.mjs), [`scripts/init-config.mjs`](../scripts/init-config.mjs)
- Tests: [`scripts/init-config.test.mjs`](../scripts/init-config.test.mjs)
- Qualification evidence: [`docs/evidence/truthful-bootstrap-status-20260825.md`](../docs/evidence/truthful-bootstrap-status-20260825.md)

### Universal authoritative status command

- Source: [`scripts/agent-control.mjs`](../scripts/agent-control.mjs), [`scripts/status-client.mjs`](../scripts/status-client.mjs), [`src/control/application-service.ts`](../src/control/application-service.ts)
- Tests: [`scripts/agent-control.test.mjs`](../scripts/agent-control.test.mjs), [`scripts/status-client.test.mjs`](../scripts/status-client.test.mjs), [`src/control/application-service.test.ts`](../src/control/application-service.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)

### Generic managed Linux nodes

- Source: [`src/control/managed-node.ts`](../src/control/managed-node.ts), [`src/control/managed-node-ssh.ts`](../src/control/managed-node-ssh.ts), [`src/control/managed-node-actions.ts`](../src/control/managed-node-actions.ts)
- Tests: [`src/control/managed-node.test.ts`](../src/control/managed-node.test.ts), [`src/control/managed-node-ssh.test.ts`](../src/control/managed-node-ssh.test.ts), [`src/control/managed-node-actions.test.ts`](../src/control/managed-node-actions.test.ts)
- Qualification evidence: [`docs/evidence/macubuntu-managed-node-qualification-20260826.md`](../docs/evidence/macubuntu-managed-node-qualification-20260826.md)

### Default adaptive-harness dispatch

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts), [`src/control/work-executor.ts`](../src/control/work-executor.ts)
- Tests: [`src/control/harness-dispatch.test.ts`](../src/control/harness-dispatch.test.ts), [`src/control/work-executor.test.ts`](../src/control/work-executor.test.ts)

### Central live ToolPolicy gateway

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts)
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts), [`src/control/harness-dispatch.test.ts`](../src/control/harness-dispatch.test.ts)

### Token-aware command output and ripgrep expansion

- Source: [`src/control/token-aware-output.ts`](../src/control/token-aware-output.ts), [`src/control/repository-search.ts`](../src/control/repository-search.ts), [`src/control/context.ts`](../src/control/context.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts)
- Tests: [`src/control/token-aware-output.test.ts`](../src/control/token-aware-output.test.ts), [`src/control/token-aware-context.test.ts`](../src/control/token-aware-context.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/token-aware-output-benchmark-20260827.json`](../docs/evidence/token-aware-output-benchmark-20260827.json)

### Harness efficiency telemetry and context profiles

- Source: [`src/control/harness-efficiency.ts`](../src/control/harness-efficiency.ts), [`src/control/harness-efficiency-benchmark.ts`](../src/control/harness-efficiency-benchmark.ts), [`src/control/harness-mutation-benchmark.ts`](../src/control/harness-mutation-benchmark.ts), [`src/control/harness-mutation-context.ts`](../src/control/harness-mutation-context.ts), [`src/control/harness-mutation-workspace.ts`](../src/control/harness-mutation-workspace.ts), [`src/control/harness-mutation-verifier.ts`](../src/control/harness-mutation-verifier.ts), [`src/control/structured-chat-loop-provider.ts`](../src/control/structured-chat-loop-provider.ts), [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts)
- Tests: [`src/control/harness-efficiency.test.ts`](../src/control/harness-efficiency.test.ts), [`src/control/harness-efficiency-benchmark.test.ts`](../src/control/harness-efficiency-benchmark.test.ts), [`src/control/harness-mutation-benchmark.test.ts`](../src/control/harness-mutation-benchmark.test.ts), [`src/control/harness-mutation-workspace.test.ts`](../src/control/harness-mutation-workspace.test.ts), [`src/control/harness-mutation-verifier.test.ts`](../src/control/harness-mutation-verifier.test.ts), [`src/control/harness-mutation-reference-verifier.test.ts`](../src/control/harness-mutation-reference-verifier.test.ts), [`src/control/structured-chat-loop-provider.test.ts`](../src/control/structured-chat-loop-provider.test.ts), [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts), [`src/control/harness-dispatch.test.ts`](../src/control/harness-dispatch.test.ts), [`src/control/harness-job-action.test.ts`](../src/control/harness-job-action.test.ts), [`src/control/job-bootstrap.test.ts`](../src/control/job-bootstrap.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/harness-mutation-report.md`](../docs/harness-mutation-report.md), [`artifacts/harness-mutation-report.json`](../artifacts/harness-mutation-report.json)

### Job Catalog, scheduler and Run Ledger

- Source: [`src/control/job-catalog.ts`](../src/control/job-catalog.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts), [`scripts/qualify-jobs.ts`](../scripts/qualify-jobs.ts)
- Tests: [`src/control/job-catalog.test.ts`](../src/control/job-catalog.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts), [`scripts/qualify-jobs.test.mjs`](../scripts/qualify-jobs.test.mjs)

### Parameterised Jobs, schedules and repository review

- Source: [`src/control/parameterized-job-types.ts`](../src/control/parameterized-job-types.ts), [`src/control/parameterized-job-registry.ts`](../src/control/parameterized-job-registry.ts), [`src/control/parameterized-job-engine.ts`](../src/control/parameterized-job-engine.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts), [`src/control/repository-review-definition.ts`](../src/control/repository-review-definition.ts), [`src/control/repository-review-runtime.ts`](../src/control/repository-review-runtime.ts), [`src/control/direct-repository-review-executor.ts`](../src/control/direct-repository-review-executor.ts), [`assets/dashboard/dashboard-parameterized-jobs.js`](../assets/dashboard/dashboard-parameterized-jobs.js)
- Tests: [`src/control/parameterized-jobs.test.ts`](../src/control/parameterized-jobs.test.ts), [`src/control/openai-compatible-provider.test.ts`](../src/control/openai-compatible-provider.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.4.0-release-qualification.md`](../docs/evidence/agent-control-3.4.0-release-qualification.md)

### Capability-advertising Worker Registry

- Source: [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts)
- Tests: [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts)

### Provider-neutral external model registry

- Source: [`src/control/model-registry.ts`](../src/control/model-registry.ts), [`src/control/model-qualification.ts`](../src/control/model-qualification.ts), [`src/control/openai-compatible-provider.ts`](../src/control/openai-compatible-provider.ts), [`src/control/codex-model-config.ts`](../src/control/codex-model-config.ts), [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/work-parcels.ts`](../src/control/work-parcels.ts), [`src/control/application-service.ts`](../src/control/application-service.ts), [`src/control/web-server.ts`](../src/control/web-server.ts), [`assets/dashboard/dashboard-models.js`](../assets/dashboard/dashboard-models.js)
- Tests: [`src/control/model-registry.test.ts`](../src/control/model-registry.test.ts), [`src/control/model-qualification.test.ts`](../src/control/model-qualification.test.ts), [`src/control/openai-compatible-provider.test.ts`](../src/control/openai-compatible-provider.test.ts), [`src/control/codex-model-config.test.ts`](../src/control/codex-model-config.test.ts), [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/work-parcels.test.ts`](../src/control/work-parcels.test.ts), [`src/control/configuration-store.test.ts`](../src/control/configuration-store.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)
- Qualification evidence: [`docs/evidence/agent-control-3.4.0-release-qualification.md`](../docs/evidence/agent-control-3.4.0-release-qualification.md)

### Model-backed Job Action bridge

- Source: [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts)
- Tests: [`src/control/harness-job-action.test.ts`](../src/control/harness-job-action.test.ts), [`src/control/responses-provider-job.test.ts`](../src/control/responses-provider-job.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-harness-qualification-20260824.md`](../docs/evidence/windows-openai-harness-qualification-20260824.md)

### OpenAI Responses API execution

- Source: [`src/control/responses-provider.ts`](../src/control/responses-provider.ts)
- Tests: [`src/control/responses-provider.test.ts`](../src/control/responses-provider.test.ts), [`src/control/responses-provider-job.test.ts`](../src/control/responses-provider-job.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-responses-live-20260824.json`](../docs/evidence/windows-openai-responses-live-20260824.json)

### Codex execution with ChatGPT-plan authentication

- Source: [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/openai-provider-selector.ts`](../src/control/openai-provider-selector.ts)
- Tests: [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/openai-provider-selector.test.ts`](../src/control/openai-provider-selector.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-chatgpt-plan-live-20260824.json`](../docs/evidence/windows-openai-chatgpt-plan-live-20260824.json), [`docs/evidence/agent-control-post-3.8.2-context-efficiency.md`](../docs/evidence/agent-control-post-3.8.2-context-efficiency.md)

### Universal verification-to-acceptance coverage

- Source: [`src/control/verification.ts`](../src/control/verification.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts)
- Tests: [`src/control/verification.test.ts`](../src/control/verification.test.ts), [`src/control/harness-job-action.test.ts`](../src/control/harness-job-action.test.ts)

### Opaque CLI internal-tool mediation

- Source: [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/execution-provider.ts`](../src/control/execution-provider.ts)
- Tests: [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/orca-execution-provider.test.ts`](../src/control/orca-execution-provider.test.ts)

### Qualified skill selection

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts)
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts)

### Governed skill proposal and promotion

- Source: not implemented
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts)

### Automatic governed recipe learning

- Source: [`src/control/experiments.ts`](../src/control/experiments.ts)
- Tests: [`src/control/control.test.ts`](../src/control/control.test.ts)
