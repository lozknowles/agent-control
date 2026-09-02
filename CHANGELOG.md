# Changelog

## [3.7.0] — unreleased

- Adds Token-Aware Baton Routing with policy-configured `CONTINUE`, `PREPARE_BATON`, `COMPACT`, and `HANDOFF` pressure states (75/85/90% defaults).
- Adds durable per-thread and Work Parcel input/output/total token, context, cost, elapsed-time, authority, transition, route-decision, and sealed-baton evidence.
- Adds provider-neutral adapter telemetry for Codex JSONL and Responses-compatible providers, including GLM-5.3-Flash and local providers. Current context is explicitly `unavailable` where a provider does not expose it; lifetime totals are not misrepresented as occupancy.
- Adds verified baton contents, governed-handoff integration, failed-handoff recovery of the original thread, and multi-model aggregate accounting that survives model changes.
- Adds real-time dashboard/SSE telemetry for active threads and parcel-level chain totals, plus the read-only `GET /api/token-routing` projection.

## Unreleased — Agent Control 3.6

### ACP runtime

- Pins official `@agentclientprotocol/sdk` 1.4.0 and its Zod 4.5.4 peer, and packages the stable protocol-v1 governed adapter as `agent-control acp` over newline-delimited JSON-RPC stdio.
- Adds official-SDK schema dispatch, ordered plan/tool-call updates, durable ACP session reconstruction, identity-bound admission, cancellation and graceful process shutdown.
- Adds official SDK client interoperability tests over the real NDJSON stream. Independent non-SDK conformance, authenticated remote transport and adversarial/recovery expansion remain work in progress.
- Adds explicit authenticated Streamable HTTP and WebSocket adapters using the official SDK server transport, constant-time bearer comparison, origin checks, bounded bodies, exact-path routing and TLS-required non-loopback binding. The `ws` 8.21.3 transport dependency is exact-pinned.
- Adds official HTTP/WebSocket client tests plus an SDK-independent raw wire harness for negotiation, malformed JSON, invalid IDs and unknown methods. Adds a namespaced durable delivery ID for idempotent prompt replay without changing standard ACP fields.
- ACP v2 remains explicitly experimental and is not imported, advertised or claimed.

### Contract and PTY runtime

- Adds a durable contract-owned execution record for `Lane → Contract → Baton → Process/PTY → Agent`, retaining objective, authority, budget, active route, sealed baton, attachments, permissions, pending actions, verification, evidence and history across restart.
- Adds read-only consultation/reconnect, detach without process termination, explicit single-writer requests/transfers, unconditional human takeover, deliberate agent resumption and ownership-generation fencing.
- Adds ordered terminal output, process observation, orphan detection, distinct cancellation/timeout states and independent verification. The redacted dashboard projection is implemented; operating-system-specific process/PTY creation and signal adapters remain a later checkpoint.

### Governed handoffs

- Adds explicit `SACRIFICE`, `SUBSTITUTE`, `DELEGATE`, `YIELD` and `COMPLETE` transitions over contract-owned state. Substitution preserves the parent contract; delegation creates a bounded child and debits parent budget; completion only submits verification.
- Adds AUTO admission for changes inside existing authority/budget and MANUAL approval for cost, privilege, production, destructive or resource-envelope escalation. Approval never manufactures withheld authority.
- Persists source/target identity, parent/child contract, reason, baton hash/size, transferred/withheld authority, budget, before/after state, evidence, approval and verification outcome with restart tests.

### Provider and model lifecycle

- Adds durable session-neutral logical providers with indirect credential references and observed capabilities/model IDs; provider identity is not tied to a machine or controller session.
- Adds immutable exact model recipes and the evidence-gated `DISCOVERED → BENCHMARKING → SHADOW → CANDIDATE → ACTIVE → PREFERRED → DEPRECATED` lifecycle.
- Adds versioned champion/challenger routing policy, historical replay and verified rollback without enabling automatic production Job routing. Missing cost remains unknown.

### Capability-routing benchmark

- Adds a frozen 60-task capability-routing corpus with a 12-task holdout, predeclared safety/success criteria and deterministic `LOCAL → SPARK → STANDARD → FRONTIER` classification.
- Adds a physical-observation contract for exact provider/model identity, verification, latency, attempts, escalation, context/baton size, tokens, cost and change-scope integrity without converting missing telemetry to zero.
- Adds a same-job coordinator experiment with one complete FRONTIER context versus 12 separately accounted minimal child batons.
- The classifier passed 60/60 with zero unsafe false positives, but no physical observations were supplied. Automatic production routing and Spark-by-default remain disabled.

### Physical multi-provider chain

- Qualifies the real `gpt-5.6-luna → local Qwen2.5 3B → z-ai/glm-5.3-flash → gpt-5.6-luna` chain with exact provider/model identities and indirect credentials.
- Records local `YIELD`, GLM `SUBSTITUTE`, minimal sealed batons, fail-closed authority expansion, attach/detach, controller reconstruction and independent child/parent verification.
- Records two unsuccessful GLM attempts before the successful bounded response and leaves unreported token/cost values unknown. This one chain does not qualify automatic production routing.

### Dashboard and runtime observability

- Adds one read-only `/api/runtime` projection for stable ACP v1 transports/sessions, contract/process/PTY ownership, approvals, handoffs and provider/model lifecycle state.
- Extends existing Sessions, Systems and Models views with protocol/authentication state, active identities, node/runtime, participants/writer, baton hashes/sizes, recovery, verification and lifecycle policy without adding a disconnected ACP dashboard.
- Omits prompt/cwd content, objectives, baton payloads, transcripts, handoff requests and credential references; missing transport attribution, usage, cost and reachability remain unknown.

## [3.5.0] — 2026-09-01

### Identity, delegation and sessions

- Adds persistent Actor and Agent identities, immutable session creators, attributed participants, session modes, role/capability checks, opaque secret-use receipts, and deterministic legacy attribution.
- Adds hash-addressed context-transfer records and authority-subset delegation across human-to-agent and agent-to-agent handoffs.
- Adds complete execution provenance across Actor, Session, Work Parcel, Agent, Model, Provider, Runtime, Node, policy events, tools, resources, usage, cost and evidence, including causal-chain reconstruction, aggregation and child-first cancellation.
- Adds fail-closed execution selection that cannot silently replace required sandboxing, locality, governed runners, nodes or models.
- Adds a Sessions dashboard and read-only session, context-transfer, delegation and execution APIs backed by the same durable identity store; the view includes active attributed parcels and baton traces. Authenticated natural-language Work Parcels now ignore client-supplied actor spoofing and carry explicit attribution.
- Enforces participant/session/delegation authority, model and node allow-lists, and filesystem/network envelopes when execution provenance is admitted; policy fields are not merely informational.
- Adds context-deterioration experiment support for full, summary-only, evidence-only, structured-baton and hybrid transfers with recall, precision, evidence retention, contradiction, unresolved and semantic-loss metrics.

### ACP compatibility

- Adds a transport-neutral Agent Client Protocol v1 JSON-RPC adapter for initialize, new/load/resume/list/prompt/cancel/close, session updates and request cancellation.
- Maps every ACP prompt to an Agent Control session, context-transfer record, Work Parcel and attribution record. ACP receives no direct shell, scheduler, lease, model-substitution or tool-policy authority.

### Governed fast execution

- Adds a generic `FAST_EXECUTION_MODEL` class with `gpt-5.3-codex-spark` as the current default-disabled implementation.
- Adds conservative trivial-work classification, protected/sensitive rejection, authenticated exact-model availability probing, model-registry-only selection, sealed minimal batons, one-attempt/zero-subagent Codex execution in disposable clean worktrees, independent verification and visible STANDARD escalation. THIN remains a harness/context profile rather than a synonym for SPARK execution.
- Adds persistent Spark routing/attempt telemetry with Work Parcel, Run and Session identity plus actual model, selection, context, verification, escalation/successor, file scope, usage/cost and evidence; the Sessions dashboard projects it alongside an authenticated Configuration-panel policy editor. Unknown values remain unknown.
- Adds a frozen ten-case classifier and seven-case live benchmark. Current desktop requalification on `codex-cli 0.144.4` classified 10/10 correctly with zero false positives; Spark verified 7/7 at 14.464s median versus the `gpt-5.6-luna` comparison route's 6/7 at 27.100s median. Cost was not reported, so the lane remains disabled by default.
- Uses explicit `--model gpt-5.3-codex-spark`, `--ignore-user-config`, JSONL, output schema and sandbox flags. Current public Codex documentation describes `agents.enabled=false`, but installed client 0.144.4 rejects that shape; 3.5 therefore uses the directly verified compatibility override `features.multi_agent=false` and fails rather than permitting hidden fan-out.

### Compatibility and limits

- Existing Work Parcel snapshots remain version 1 and accept additive attribution. Existing sessions are not fabricated; records without new identity fields receive deterministic legacy attribution when projected through the new path.
- Spark entitlement is not universal, provider monetary cost remains unavailable, file-read telemetry remains unavailable when Codex does not expose it, and automatic production Job adoption is not yet qualified. These limits are not converted into released follow-on functionality.
- The required Luna → local LLM → GLM-5.3-Flash → Luna physical multi-provider qualification remains blocked on this host because no qualified local-LLM or GLM model-registry routes are configured. This does not weaken unit, API, ACP, Spark or full-suite gates and is reported as a limitation rather than simulated evidence.

## [3.4.0] — 2026-09-01

- Adds versioned Job Definitions, schema-validated Saved Jobs, safe export/import, optimistic revisions, logical model roles, explicit model overrides, visible fallback, context profiles, budgets, and concurrency policies.
- Adds the built-in read-only `repository-code-review@1` Job with policy-resolved local or allowlisted remote Git input, exact SHA freezing, isolated read-only checkout, secret/binary exclusion, exhaustive omission reporting, deterministic decomposition, provider-direct strict-schema execution, validated structured findings, and successful-run-only delta baselines.
- Adds persistent immutable parameterised Runs with lifecycle transitions, deterministic scheduled occurrence identity, Work Parcel links, selected provider/model/qualification evidence, response hashes, usage/cost, retries, fallbacks, errors, and restart recovery.
- Adds persistent one-time/cron scheduling with timezone, enable/disable, missed-run policy, overlap protection, duplicate-occurrence prevention, and one shared manual/scheduled execution path.
- Adds first-class dashboard views for Job Definitions, Saved Jobs, Schedules, Runs, schema-generated creation, Run now, and historical review details; adds corresponding authenticated HTTP and `agent-control jobs` CLI operations.
- Adds focused repository, scheduler, routing, lifecycle, API/dashboard, and direct-provider tests plus the detailed `docs/jobs/` developer/operator guide.

Qualification note: the source release is created only if the documented real LocalWalks provider run and bounded near-term schedule evidence are completed. Until then, 3.4 remains a release candidate regardless of passing deterministic tests.

## 3.4 provider/model registry scope

### Added

- Added a first-class provider-neutral model registry with stable provider/model identity, logical roles, ordered fallback, node-scoped qualification and fail-closed routing.
- Added bounded OpenAI-compatible Responses and Chat Completions invocation, normalized usage, explicit unknown cost fields and optional source-attributed pricing.
- Added persistent `UNTESTED`/`QUALIFYING`/`QUALIFIED`/`FAILED`/`DISABLED` qualification records with exact provider, model and node evidence.
- Added isolated Codex external-provider configuration using a temporary `CODEX_HOME`; only Responses-compatible providers are accepted and user configuration is not edited.
- Added a Models dashboard tab, authenticated model/provider configuration, hot-reloaded role mappings and governed model status/qualification/routing APIs.
- Added example OpenAI, OpenRouter/GLM and disabled future local-runtime registrations. External example models remain `UNTESTED` until qualified with operator-supplied credentials.

### Changed

- Work Parcel stages can request a logical model role or explicit model. Agent Control resolves the qualified model against the scheduler-selected node before creating the Job run and persists the exact decision and fallback reason.
- Provider, model and role-map configuration changes apply without process restart; resource and service changes retain explicit restart-required behavior.

## [3.3.1] — 2026-08-31

- Remediates the v3.3.0 REVIEW_REQUIRED findings for terminal invocation finalization, late cancellation, observable execution phases, provider-neutral review configuration, independent verification and queue transition validation.
- Preserves partial provider telemetry and immutable retry/replacement history, including canonical `maximumOutputTokens` handling.
- Adds server-validated operator session states and fail-closed natural-language submission with immediate, auditable Work Parcel intake.
- Adds the first-class Systems execution-readiness dashboard backed by canonical node, provider, worker, run and invocation sources.
- Retains every configured machine, provider and external service in Systems even when it is unprobed, offline or missing authentication.
- Adds an authenticated Configuration dashboard and validated API for adding or editing machines, providers and external services without storing plaintext API keys.
- Adds evidence-driven local context compilation and versioned, auditable provider pricing with verified-outcome cost accounting.

## [3.3.0] — 2026-08-30

### Added

- Added natural-language Work Parcels with governed multi-stage Jobs, durable routing rationale, execution timelines, verification outcomes, and invocation-to-Job-to-stage accounting.
- Added governed browser and ChatGPT UI capability routes, independently qualified headless browsing, and fail-closed separation between public, authenticated web, and Android UI sessions.
- Added canonical provider/model invocation lifecycle records before provider completion, including Run, step, lane, phase, duration, usage, cost, outcome, and verification attribution.
- Added per-Run invocation history and multi-invocation aggregation to Job details.

### Fixed

- Preserved operator-edited dashboard parameters across background refresh while allowing untouched defaults and other live state to update.
- Reconciled provider-reported usage and cost after non-streaming completion while preserving explicit estimated and unknown states; unavailable values are never converted to zero.
- Enforced Job timeouts and owned-process cleanup, final protected-workload revalidation, bounded scheduler concurrency, and nonblocking Android recovery.
- Removed private host/device identifiers and a machine-specific operator context-file default, and extended distributable-text neutrality scanning to YAML.

### Verification

- Retained the complete TypeScript, bootstrap, dashboard, implementation-status, infrastructure-neutrality, telemetry, safety/runtime, packaging, and repository test gates.

## [3.2.1] — 2026-08-30

### Fixed

- Added governed ACCEPT/REJECT completion for Work Queue items in `verification-pending`, including bounded retry, human-review and failure dispositions.
- Preserved lane state across global pause/resume, including human PTY ownership and cancelled/error terminal fences.
- Preserved active worker claims when managed-node observations refresh capability and health data.
- Added run-level `WAITING` state and transition-only persistence for resource, worker, approval and dependency waits.
- Made Persistent Teammate execution jobs stable per profile and retryable from their persisted effective definition after restart; coordinator profiles cannot be specialist delegates.
- Contained scheduler and managed-node observer failures, persisted schedule failure detail, advanced failed occurrences and emitted typed control-plane failure events.
- Added schema-typed dashboard Run parameters with safe validation responses and honest live execution state, elapsed/activity age, provider/model, usage, cost and verification telemetry.

### Verification

- Added deterministic regressions for every accepted Ox/GLM finding and retained the complete TypeScript, bootstrap, dashboard, neutrality, implementation-status and repository test gates.

## [3.2.0] — 2026-08-29

### Added

- Durable provider/model-neutral teammate profiles with roles, bounded instructions, preferred capability requirements, verifier-backed retained working context and reusable operator-saved or verified-run routines.
- Explicit-participant teammate conversations, independently governed specialist delegations and a Coordinator that synthesizes only after at least two specialist Runs verify.
- `JobRuntimeTeammateExecutor`, which represents every specialist assignment and coordinator synthesis as an ordinary capability-placed Job with typed artifacts, Run provenance, linked model-invocation IDs, normalized token/cost telemetry and existing verifier/final-result marking.
- Initial Ask Collingham Engineer, Infrastructure Operator, Independent Auditor, Researcher and Coordinator profiles plus safe `npm run init:teammates` state initialization.
- A deterministic `npm run demo:teammates` proof that delegates to Researcher and Independent Auditor and returns a separately verified Coordinator synthesis across three real Runs.

### Authority and compatibility

- Teammate capability preferences are requirements, never grants; production execution requires a registered model-backed Agent Action below the existing HarnessDispatcher, AdaptiveHarness, ToolPolicy, lease/ownership and verification boundaries.
- Any non-PASS specialist or synthesis result stops the conversation at `REVIEW_REQUIRED`; teammates cannot self-register Actions, choose providers, grant tools, approve risks, verify outputs or accept results.
- Existing providers, lanes, Jobs, schedules, persisted workspace state, and observational THIN/STANDARD/DEEP routing remain unchanged.

## [3.1.0] — 2026-08-28

### Added

- Provider-neutral model-invocation telemetry with explicit unknown values for unavailable fresh/cached/cache-write/output/reasoning tokens, provider/calculated cost, startup component estimates, turns, elapsed time, tools, context sources, provenance, verifier result and final Job outcome.
- Configurable THIN, STANDARD and DEEP harness profiles, a conservative observational-by-default profile router, monotonic reason-coded escalation, and profile/context identity in adaptive recipe fingerprints.
- A provenance-preserving `ContextPacketBuilder`, neutral `ContextGraph` interface with an in-memory adapter, verifier-gated cost-per-verified-outcome aggregation and dashboard/API efficiency diagnostics.
- A frozen 20-job same-model-identity benchmark framework plus Markdown/JSON efficiency reports. The deterministic run is explicitly not live model, billing, cache or latency evidence and cannot production-qualify automatic routing.
- A controlled live same-model harness benchmark with explicit experiment-only profile selection, endpoint/model qualification, typed submission through the existing tool-policy gateway, verifier-gated outcomes, provider token/cache/latency measurement and Markdown/JSON evidence. It cannot be enabled by production configuration and does not treat context retrieval as repository-mutation success.
- A frozen 12-task real repository-mutation suite covering bounded edits through architecture-level changes, with disposable Git workspaces, scoped typed tools, compact repository search, hidden deterministic verifiers, mutation-tested test-addition acceptance, patch evidence and machine-readable provenance.
- EXPERIMENT-only THIN, STANDARD, DEEP and cumulative THIN-to-STANDARD-to-DEEP mutation strategies, an explainable profile predictor, explicit classified escalation reasons and a production-routing qualification gate. The recorded live run leaves automatic routing disabled: adaptive execution matched STANDARD's 2/12 verified outcomes but used materially more cumulative tokens.
- A provider-neutral token-aware command-result layer at the existing live ToolPolicy gateway, with authoritative result artifacts, explicit completeness states, scoped expiring handles, deterministic token estimates, provenance and context-budget-aware initial views.
- Typed read-only ripgrep search and expansion tools supporting summary, file/line index, selected captured matches/files/ranges/context and exact full-result recovery without an unrestricted shell or handle-based filesystem reads.
- A generic oversized-stdout head/tail fallback, API/dashboard context-token telemetry, configurable thresholds and a deterministic 240-file semantic-recovery benchmark.
- Generic agentless Linux managed nodes over existing non-interactive SSH, with fixed read-only discovery, versioned heartbeat/inventory projections and no arbitrary remote-command path.
- Managed-node `ONLINE`/`IDLE`/`BUSY`/`DEGRADED`/`OFFLINE` state, discovered capabilities, protected-workload detection, maintenance state, shared dashboard/TUI/API/status visibility and worker-registry synchronisation.
- Typed, audited inspection and maintenance Job Actions with capability placement, service allowlists, named approvals, BUSY workload fencing, checksummed result artifacts and provenance.
- A read-only managed-node qualification command and real generic-boundary qualification of an Ubuntu DVD worker without altering its workload.
- One cross-platform `agent-control status` command that reads the versioned `AgentControlService` projection used by the web dashboard, either controller-local or through a fixed read-only localhost request over SSH from a configured worker node.
- A non-secret, node-scoped status-client configuration and `--json` mode for the exact dashboard projection.
- Default adaptive-harness dispatch for normal Work Queue agent executions, with durable/inspectable recipe identity and separate worker-placement/model-routing rationale.
- A central `ToolInvocationGateway` that reauthorises every model-originated tool call against recipe grants, live capability/policy state, lease generation, ownership generation and human takeover.
- Explicit named control operations for non-agent maintenance work; a control handler cannot act as an unrestricted legacy agent fallback.
- A durable `verification-pending` Work Queue state separating process completion from verified acceptance.
- A responsive localhost web dashboard with system, lane, provider, typed-event, Git, PTY-observer and verification/evidence views.
- A narrow `AgentControlService` application boundary shared by the TUI and HTTP API, with typed control events over Server-Sent Events.
- Observer/operator separation: browser mutations require an explicitly configured bearer token, JSON requests and origin validation.
- A persisted claim/evidence/verification/acceptance state machine with task-specific evidence policy.
- Capability, health, reliability, cost, latency, duration, privacy, context, tool and resource-aware route selection with durable rationale.
- An executable conceptual-integrity assessment that rejects duplicate state, second control paths, interface-owned authority and provider-owned policy.
- A JSON-Schema-validated, YAML-authored, versioned Job and Schedule catalog with typed parameters and DAG validation.
- An authoritative durable Run ledger with explicit step states, bounded classified retries, approval waits, cancellation, fail-closed restart recovery and immutable effective definitions.
- Capability-advertising worker placement with visible selection/rejection rationale, expiring capabilities and no machine names in Jobs.
- Durable semantic resource locks plus typed, checksummed, provenance-bearing artifact handoff across workers.
- Jobs, Queue, live step progress, schedules and Run history in the web dashboard, plus a shared TUI Jobs view.
- Expanded operational Job detail with searchable Run history, queue age/reasons, worker capability/capacity, resource locks, artifact checksums/provenance and policy-bound cancel/retry/approval controls.
- Fail-closed named approvals now require a matching waiting step and emit a distinct typed `job.run_approved` audit event; browser artifact projections no longer expose managed storage paths.
- A versioned Agent Control 3.1.0 Operator Guide covering installation, deployment patterns, the dashboard, Job scheduler operation, monitoring and recovery, with a rendered PDF under the 3.1.0 release assets.
- A disabled twice-daily Europe/London reference Schedule and safe non-production events workflow qualification.
- A switchable Windows OpenAI provider selection: `auto` prefers a configured Responses API key and otherwise uses official `codex exec` with saved ChatGPT-plan authentication. Both routes are live `SUPPORTED+QUALIFIED`. Returned Agent Control tool requests remain mediated through `ToolPolicy`; no desktop-window automation is claimed.
- A safe, idempotent `npm run init` bootstrap that creates only an empty schema-valid configuration, preserves existing operator state byte-for-byte and fails closed on invalid state.
- A machine-readable implementation/qualification registry with generated Markdown projection and a stale-claim gate in `npm run check`.

### Changed

- Champion/challenger fingerprints can include provider, harness profile and context strategy; verified correctness remains the promotion gate and cost/fresh-token efficiency can only break an otherwise qualified tie.
- `npm run status` now uses the authoritative dashboard projection; the separate configured service/resource bootstrap probe remains available as `npm run status:bootstrap`.
- TUI task submission, reroute and pause/resume now call the shared application service rather than mutating workspace state directly.
- Routing and verification projections are first-class lane state and survive persistence/reload.
- The full test gate is serialised to prevent persistence-focused tests from contaminating one another.
- Manual, scheduled and future trigger adapters now converge on the same `JobRuntime.createRun` path through `AgentControlService`.
- The harmless Job qualification now constructs the complete current manifest/action catalog through the production bootstrap, preventing newer typed Action manifests from silently drifting beyond the release smoke.

### Security and authority

- Managed-node SSH uses one reviewed streamed script, batch public-key authentication, disabled forwarding, bounded output/time and separately validated typed arguments; no Job or approval can supply an arbitrary shell command.
- Protected active workloads block power, optical, package/service mutation, destructive storage and configured competing capabilities unless the exact protected-workload override has been approved.
- Harness construction cannot claim queue work, mutate placement, acquire authority, write a PTY or accept completion.
- Secret-like runtime settings and credentialed runtime URLs fail closed before recipe fingerprinting or persistence.
- The dashboard binds to `127.0.0.1` by default and is read-only when no operator token is configured.
- No web endpoint can directly mutate leases, scheduling internals or PTY input.
- Human takeover uses the existing unconditional PTY fence; autonomous resume is rejected while a human owns the terminal.
- External context and provider adapters remain non-authoritative and cannot verify or accept completion.
- Job manifests cannot grant capabilities, approvals, leases, PTY ownership or production authority; cancellation retains resource locks until execution returns.

### Compatibility

- 3.1 is based on tagged 3.0.1 and retains its infrastructure-neutral configuration, TUI, provider adapters, execution fallback, context store and persisted lane format.
- Existing state migrates additively: missing verification state defaults to `unclaimed`, and missing routing rationale remains absent until a route is selected.

## 3.0.x adaptive-harness recovery — merged baseline

### Added

- Added an experimental, infrastructure-neutral `AdaptiveHarness` that composes worker, provider/model, prompt profile, selected context, qualified skills, restricted tools, runtime settings, authority generations, resource limits, verification policy and escalation policy into a deterministic execution recipe.
- Added a qualified-only `SkillCatalog`; proposed and revoked skills cannot be selected and therefore cannot self-grant capability.
- Added an enforceable `ToolPolicy` that rejects unknown, denied, unavailable or unapproved-risk tools and fails closed on stale lease/ownership generations or human ownership.
- Recovered the provider-economic routing core from local commit `2b187705ca9c0bff3bfd8374c0596c040c47ba3c`, generalized its currency and resource identities, and retained health, qualification, capability, confidence, quality, approval, spend and latency gates.
- Added deterministic tests proving that one task can receive different qualified harness recipes and that a smaller model fixture is unroutable raw but routable with qualified scaffolding.
- Added `docs/concepts.md` and an implementation-matrix evidence report distinguishing implemented, experimental and planned 3.1 capabilities.

### Changed

- Reframed the README and authoritative architecture around the implemented policy-controlled adaptive-harness boundary without changing the immutable 3.0.1 tag.
- Clarified that PTY, Orca, SSH, browser/mobile, local runtimes and API providers are execution substrates below Agent Control policy.

### Not yet implemented

- Dynamic skill creation, security/sandbox qualification, approval and catalog promotion.
- Default scheduler-to-recipe-to-provider dispatch and end-to-end use of the general tool gate by every adapter.
- Durable learned recipe catalog, formal worker registry and universal task-type verification service; these remain 3.1 work.

### Safety

- No production deployment, service, lease, PTY, release tag or external infrastructure was changed.
- The existing execution path remains available; no historical branch was merged wholesale.

## [3.0.1] — 2026-08-24

### Changed

- Replaced the private development-fleet bootstrap with a versioned configuration model for arbitrary resources, transports, providers, services and lanes.
- Separated logical resource identity from local, SSH, HTTP and Orca transports; removed required hostnames, provider ports, hardware models, absolute paths and overlay-network assumptions.
- Made zero-resource, zero-provider and missing-configuration installations fail closed to an explicit `UNCONFIGURED` state.
- Generalized Android resource discovery, recovery, provisioning, node identity, repository path and boot persistence; hardware model is optional observed metadata only.
- Updated the README, architecture, qualification guidance and Android instructions for the infrastructure-neutral boundary.
- Replaced private raw fleet evidence in the distributable tree with a redacted historical qualification summary; immutable `v3.0.0` retains the original authorized record.
- Updated and bundled the Agent Control 3.0.1 Operator Guide PDF under release assets.

### Added

- Configuration validation that rejects duplicate identities, embedded secret material and credentialed URLs.
- Configuration-driven bootstrap and qualification tests covering alternate names/ports, optional unavailable services and safe unconfigured behavior.
- A tracked-tree infrastructure-neutrality regression guard.
- A durable P0 audit ledger with pre-change findings, remediation mapping, retained-constant rationale and post-change evidence.

### Removed

- Product-specific social-media observation code and private-fleet runbooks that were not generic Agent Control responsibilities.
- Built-in provider registrations and machine/device-specific lifecycle defaults.

### Safety

- Agent Control authority semantics are unchanged: scheduling, leases, ownership, takeover fencing, handoffs, clones, shared tasks, approvals and recovery validation remain in Agent Control.
- No production service, machine, deployment, credential or sharing scope is changed by this source release.

## Historical unreleased development notes (pre-3.0.0)

- Added an explicitly approved, read-only hpubuntu ADB observer for Facebook `Your groups`: it inspects only whole-word Collingham group titles, limits candidate posts to visible timestamps within seven days, preserves local screenshot provenance, rejects ambiguous timestamps, deduplicates overlapping screens, and redacts contact details from JSON.
- Put physical reboot qualification behind an explicit durable `--approve-reboot-test` gate; an approved test reboots through ADB and requires keyed Termux SSH to return before qualification.
- Wired boot-hook installation through Android's scoped `run-as com.termux` bridge to the existing fixed installer, and require the installed executable hook to match the repository source SHA-256 before completion.
- Restored the persisted, verified Termux:Boot artifact across provisioning process restarts and rechecks its SHA-256 immediately before device installation.
- Gave the Termux:Boot device installation a dedicated five-minute timeout and fresh package postcondition, and made incomplete device installation resumable instead of consuming both retries under the generic 30-second command limit.
- Changed transient ADB transport qualification failure from a terminal node into a durable resumable review state; a later invocation performs a fresh observation and can complete the same qualification node without repeating pairing approval.
- Fixed the ADB helper postcondition: package installation now has a dedicated five-minute timeout and a fresh observed `adb` takes precedence over a helper process error, preventing successful installs from being mislabeled as privilege denial.
- Migrated persisted pre-helper `NEEDS PRIVILEGE` failures into the resumable install review gate and fixed dependency reconciliation so blocked provisioning nodes can unlock after a recovered prerequisite completes.
- Changed Pixel ADB privilege handling from terminal failure to a durable resumable human-review gate. The approved path now invokes only a fixed root-owned helper through non-interactive sudo; the helper accepts only `install-adb` and runs only the allow-listed `apt-get install adb`. No password is captured or persisted, and pairing remains a separate review gate after fresh ADB observation.
- Added the canonical `npm run provision:pixel` durable Work Queue/Work Executor entrypoint, idempotent graph restoration, explicit `adb` detection, fail-closed allow-listed `apt install adb` authority, Android Wireless Debugging human approval, approval resumption, capability-gated ADB qualification, GitHub Termux:Boot artifact/hash verification, package and boot-hook verification, and modeled unattended-recovery qualification.
- Added explicit human-review approval resumption and bootstrap reconciliation for stale/dead or duplicate owned Pixel-forward records.
- Fixed Pixel provisioning dependency semantics: pairing review is created only after the allow-listed install completes and ADB is observed; failed install/privilege prerequisites durably block pairing and every downstream node. The command now reports only the provisioning subgraph, preserving unrelated demo queue items in storage, and emits explicit `NEEDS AUTHORITY`/`NEEDS PRIVILEGE` failures.
- Added regression coverage for failed-prerequisite blocking, terminal privilege failure, observed ADB transition, durable resume, and mission-scoped output.
- Physical Android/ADB, Termux:Boot hook, and reboot qualification remain outstanding; implementation and automated coverage do not claim device qualification. The live command stops at the durable pairing review gate until the user explicitly resumes it.

All notable Agent Control changes are recorded here. The project is still pre-stable; entries describe qualified development milestones rather than implying production readiness.

## [3.0.0] — 2026-08-23

### Added

- Added a narrow execution-provider contract and Orca-backed provider prototype while preserving Agent Control authority over scheduling, leases, ownership generations, human takeover fencing, handoffs, clone/shared-task identity and recovery validation.
- Added provider-neutral context sources, selective context budgeting, evidence-weighted consensus and provenance reconstruction across batons, repository evidence, tests and optional shared threads.
- Added an official OpenAI ChatKit GET-only reader with bounded pagination, identity validation, redaction, retention policy and fail-closed provider handling.
- Added durable provider-qualification reports and a three-lane consensus demonstration.

### Qualified evidence

- The complete serial validation gate passes 151/151 automated tests on the merged source.
- The official ChatKit live harness authenticates but remains **SUPPORTED+UNQUALIFIED** because the configured project exposes no accessible `cthr_...` thread; no qualification is inferred from documentation.
- Provider/context failure cannot mutate Agent Control scheduling, leases, ownership, PTYs, human takeover state or baton persistence.

### Safety and limitations

- Orca may execute, but Agent Control always decides; the legacy execution path remains available and no production execution provider is deployed by this release.
- ChatGPT Work and Codex task context remain host-only/reference-only outside approved host transports.
- No production service, deployment, billing configuration or sharing scope is changed by this source release.

## [2.0.0 development] — 2026-08-21

### Added

- Continuous Work Executor layered on top of the durable Work Queue.
- Dependency-driven graph progression after completion.
- Compact task-specific execution context instead of replaying full workspace/conversation history.
- Bounded retry handling and semantic outcome fingerprints.
- Automatic repeated-outcome loop escalation to human review.
- Persisted per-work-item outcome history so loop evidence survives queue-store restart.
- Real homogeneous batch execution item by item rather than stopping at batch-lease creation.
- Single-command control-plane lifecycle commands: `npm run up`, `npm run status`, and `npm run down`.
- Health-first discovery/start of the existing hpubuntu llama systemd user services for ports `8080` and `8081`.
- Reuse semantics for healthy ChatGPT Window bridge/adapter services on `8766`/`8767`.
- Pixel bootstrap recovery from SSH-ready state through the known node-start recipe and hpubuntu `18788 -> Pixel:8788` forward.
- Explicit Pixel bootstrap state `SSH-OFFLINE` for the observed case where Tailscale is reachable but Termux SSH `:8022` is not listening.
- One-time Pixel transport-persistence installer `android/install-boot.sh`.
- Termux:Boot hook `android/termux-boot-agent-control.sh` to restore `sshd` after Android reboot and optionally restore the Pixel node when a deliberate Pixel-local token is present.
- Canonical bootstrap-script syntax gate `npm run check:bootstrap`.

### Changed

- `npm run check` now validates TypeScript, control-plane JavaScript syntax and Android shell-script syntax before running the automated test suite.
- The bootstrap status schema is now `agent-control.bootstrap/v3` and reports a structured Pixel lifecycle rather than only a boolean reachability flag.
- Pixel recovery no longer misclassifies an unavailable SSH transport as a failed node-start command.
- `npm run down` remains authority-bounded: it stops only process groups explicitly recorded as Agent-Control-owned.
- `README.md` and `android/README.md` now document the single-command bootstrap and one-time Pixel transport persistence setup.

### Qualified evidence

- Executor Phase 1 reached **75/75 passing automated tests**.
- Restart-persistent loop detection and two-item homogeneous batch execution are covered by the canonical suite.
- Bootstrap test from a partially cold state successfully discovered/started `llama-server.service` and `llama-coder.service`, reused the already healthy ChatGPT Window bridge/adapter, kept Sentinel reachable, and exposed Pixel as the only degraded dependency.
- The physical Pixel failure was correctly narrowed to **Tailscale reachable / SSH `:8022` connection refused**, establishing the transport-persistence requirement now represented explicitly in the lifecycle.
- The next release gate is a one-time Termux:Boot install followed by `npm run up`; expected progression is `SSH-OFFLINE -> NODE-DEGRADED/NODE-READY -> FORWARD-READY -> READY 5/5` without manual hpubuntu recovery commands.

### Safety / authority notes

- Boot persistence restores a known transport and optionally the known Pixel node; it does not expose arbitrary Android control.
- The installer never invents or regenerates the Agent Control node token.
- Occupied-but-unhealthy local ports are still left alone rather than killed or replaced.
- Healthy external ChatGPT Window services are reused rather than claimed as Agent-Control-owned.

## [2.0.0 development] — 2026-08-20

### Added

- Restrained btop/Rethink-inspired semantic colour system for the control-room TUI.
- Workload-class queue meters: cyan interactive, magenta priority, yellow background and green batch.
- Separate capacity/resource utilisation meters that may graduate green/yellow/red with utilisation.
- Compact Work Queue and Resources rendering for narrow terminals.
- Numeric lane context percentage plus compact context meter.
- Explicit `PTY ASSIGNED n/total` header semantics.
- Clear `PIXEL RECOVERY MANUAL/AUTO` presentation separate from Pixel health.
- Isolated synthetic `demo:*` workload covering interactive, priority, background, batch, dependency-blocked, checkpointed and human-review states.
- Idempotent demo injection and tests proving demo cleanup/preservation boundaries.
- Terminal-safe Blessed Activity logging wrapper to prevent legacy/non-ASCII status text corrupting terminal rendering.
- Theme tests covering semantic workload colours, capacity warning colours and terminal-safe text.

### Changed

- Narrow control-room panels now use compact labels and bounded/truncated details instead of hard-wrapping status words.
- Idle/waiting lane presentation is deliberately compact while preserving selected-lane identity accents.
- Queue magnitude no longer turns red merely because a batch is large; red remains a danger/failure semantic.
- Batch-group meters use workload semantics rather than capacity-warning semantics.
- README updated to describe the qualified semantic-colour TUI, demo workload and physical Pixel visual smoke test.

### Fixed

- Mid-word wrapping in Work Queue, provider and lane-summary panels.
- Misleading red full-batch bars that visually implied failure.
- Legacy Unicode/control-room text corruption in the Activity panel by sanitising at the Blessed log boundary.
- TypeScript typing of the terminal-safe Blessed log wrapper.
- UI tests updated to assert semantic content independently of Blessed colour tags while also explicitly testing colour behaviour.

### Qualified evidence

- The semantic-colour/terminal-safe TUI checkpoint reached **69/69 passing tests**.
- The compact semantic-colour TUI was visually smoke-tested from the physical Pixel terminal on 2026-08-20. Activity text rendered cleanly and workload bars retained class colours.
- Pixel-terminal smoke testing also demonstrated useful degraded-state presentation when the resource path was genuinely unavailable from that execution context.

## [2.0.0 development] — 2026-08-19

### Added

- Capability-agnostic resource resolution across Linux, Windows/browser, Android and API/provider resources.
- Durable Work Queue with interactive, priority, background and batch classes.
- Dependency blocking, earliest/deadline scheduling, retry limits and human-review routing.
- Resource scoring using spare capacity, cost/latency constraints and data locality.
- Quiet-period, reserve-capacity and maintenance-window work policy.
- Persistent queue snapshots and restart-safe requeue of preemptible claimed work.
- Interactive preemption of checkpointable background work.
- Homogeneous batch leases, item-by-item commit, yield/checkpoint and low-confidence review continuation.
- Work coordinator separating pure selection from queue mutation.
- Queue observability: backlog/class/status counts, oldest age, batch groups, resource utilisation, throughput and estimated drain time.
- Queue/coordinator telemetry spans and decision events.
- Blessed Work Queue and resource-lifecycle control-room panels plus queue drill-down.
- Canonical `npm run qualify` command (`qualify:all` retained as compatibility alias).
- Qualification gates for hpubuntu Codex, Pixel health/capability resolution, Windows ChatGPT advertised health and functional Responses roundtrip, and Sentinel reachability.
- Separate ChatGPT correctness timeout and latency warning classification; healthy-but-slow no longer fails readiness solely for exceeding 10 seconds.
- Pixel lifecycle model: offline, reachable, SSH-ready, node-degraded, node-ready/forward reconnecting, forward-ready, capability-ready and recovery-failed.
- TUI Pixel probe, manual recovery and AUTO/MANUAL recovery mode controls.
- Allow-listed Pixel node recovery using the existing authenticated SSH identity/token and known node start recipe.
- Idempotent Pixel recovery: healthy recovery requests are no-ops; existing SSH forward is reused.
- Pixel-local and forwarded health verification after recovery.
- Physical Pixel self-recovery qualification evidence in `docs/evidence/pixel-self-recovery-qualified-20260819.md`.
- Focused live test procedure in `TEST-TONIGHT.md`.

### Changed

- Hard contracts migrated to version 2 with explicit capability requests and resource locks.
- Scheduling and routing are expressed in capabilities/resources rather than hard-coded machine/model identity.
- Windows functional readiness now uses a realistic bounded functional timeout while latency is reported independently.
- Operational Pixel lifecycle strings use terminal-safe text after Unicode rendering corruption was observed in Blessed.
- Test command now includes `src/ui/*.test.ts` so UI view-model tests are part of the canonical gate.
- README refreshed to describe the 2.0 control plane, Work Queue, telemetry, qualification matrix and Pixel recovery.

### Fixed

- Type drift in migrated v1/v2 HardContract tests.
- Work-policy, batch and coordinator test implicit-any regressions.
- Batch/coordinator double-claim style mutation by separating scheduler selection from allocation.
- Windows qualification false failure caused by a 10-second functional timeout when correct browser-backed responses took about 13–15 seconds.
- Pixel recovery false-negative caused by treating detached SSH command behavior as authoritative instead of verifying resulting health.
- Pixel detached process lifetime by starting the known node recipe independently of the SSH session.
- Duplicate Pixel starts / `EADDRINUSE` risk by checking remote health before start and making recovery idempotent.
- Failure classification now distinguishes a healthy Pixel node with a reconnecting/unavailable forward from a genuinely unavailable node.

### Qualified evidence

- Local automated suite reached **63 passing tests** after core/control/UI tests were included.
- Post-recovery distributed qualification passed **7 gates, 0 failures, 0 skips** with trace `9cec90ee-8d86-49fa-9891-339277e39850`; Windows functional response was correct but classified slow (~14.7 s).
- Physical Pixel fault injection: healthy PID 8270; recovery request while healthy preserved PID 8270; node deliberately stopped; TUI detected `NODE-DEGRADED`; allow-listed recovery produced PID 9315; existing hpubuntu SSH forward was reused; `/health` returned 200; authenticated `/v2/resource` returned healthy Android/Termux/Codex/logcat capabilities.

### Security / authority notes

- Pixel recovery does not expose arbitrary remote shell execution.
- Recovery does not regenerate credentials.
- Recovery does not replace a healthy SSH forward.
- Runtime state, qualification output, node modules and credentials remain excluded from source control.
- PTY logical ownership is not a claim that raw OS terminal write attachment is production-qualified.
