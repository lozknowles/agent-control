# Agent Control 4.4 — governed Pisper review

Date: 2026-09-11

Agent Control base: `v4.4.0`, `0a3d136c38ec2c75afb4fb946fba1fb12a9dd5f8`

Review branch start: `294482596636133036677669d86aecc385780c37`

Pisper source: `release`, `e3ef30f0744907f0a92578313c28c9679b56206e` (`app-v0.1.36`)

Pisper component versions at that commit: desktop `0.5.59`, runtime/package `0.5.41`

## Verdict

Pisper demonstrates three techniques worth adapting without adopting Pisper or Pi as a dependency:

1. an immutable session derivation from any completed turn;
2. a fixed hot-tool surface plus governed discovery/call gateway for large optional catalogs;
3. one provider-neutral worker lifecycle projection shared by user interfaces.

Agent Control already executes independent Work Parcel branches concurrently. Its durable Work Parcels, sealed batons, route/account/node identity, independent verification, token/cache/cost evidence, recovery, and governed memory are stronger than Pisper's equivalents for control-plane work. Pisper therefore does not justify replacing Agent Control's scheduler, baton, cache, memory, or provider abstractions.

**Recommendation:** add provider-neutral **Governed Turn Snapshot Branching** as a first-class 4.4 primitive. It should complement, not replace, Work Parcels and batons.

## Method

- Cloned Pisper into an isolated reference directory and pinned the exact commit above.
- Read its repository instructions, source, public docs, and tests for session derivation, multi-agent execution, workflows, tool activation, prompt-cache diagnostics, memory, SSE recovery, remote pairing, and lifecycle projection.
- Inspected the released Agent Control 4.4 source and tests at the corresponding Work Parcel, Job Runtime, context, baton, identity, cache, provider, dashboard, POE, and recovery boundaries.
- Ran Pisper's focused tests and complete runtime suite.
- Ran the same deterministic three-branch fan-out/join workload through Pisper `WorkflowService` and Agent Control `WorkParcelCoordinator -> JobRuntime` using real scheduler/persistence paths and bounded local adapters.
- Ran an isolated equal-catalog schema-footprint probe for Pisper's hot/cold tool mechanism.

No production service, provider credential, protected llama.cpp endpoint, deployment, release, or external account was touched.

## Physical comparison

Machine-readable evidence: `docs/evidence/agent-control-4.4-pisper-physical-comparison-20260911.json`

| Measurement | Agent Control 4.4 | Pisper runtime 0.5.41 |
| --- | ---: | ---: |
| Result | `SUCCEEDED` | `completed` |
| Branch work if serial | 660 ms | 660 ms |
| Observed wall clock | 402 ms | 338 ms |
| Maximum simultaneous branch invocations | 3 | 3 |
| Branch adapter invocations | 3 | 3 |
| Independent execution identities | 3 run IDs | 3 session IDs |
| Failures / retries in matched success run | 0 / 0 | 0 / 0 |
| Join | Verified Work Parcel stage; sealed baton retained | Completed workflow notification node |
| Durable run representation | Work Parcel, run ledger, event chain, criteria, artifact and baton hashes | Workflow/run/node state JSON |

All three Agent Control branch actions began at the same millisecond. Pisper's three prompts began within two milliseconds. The result proves actual overlap in both products and disproves the concern that Agent Control only schedules independent stages sequentially.

The 64 ms wall-clock difference is not a valid product-performance ranking. Both runtimes were exercised simultaneously on one host, the delay fixtures are short, Agent Control performs more verification/evidence writes, and Pisper completion was polled at 10 ms intervals.

The adapters deliberately made no external model request. Input/output tokens, cached tokens, context occupancy, provider failures, and monetary cost are therefore `unavailable`; none were inferred. “Model calls” in this evidence means scheduler adapter invocations only.

No failure was injected into the identical success workload, so its failure and
retry counts are both zero. Recovery conclusions come from the tested production
paths, not an invented benchmark incident: the Agent Control full suite covers
restart, bounded retry, cancellation and failed dependency blocking; Pisper's
full suite covers workflow retry/skip, cancellation, SSE resume and conversion
of active records to `interrupted` after restart.

### Hot/cold tool probe

An equal synthetic catalog of 49 tool schemas occupied 11,034 bytes. Pisper's fixed hot set plus discovery/call gateway kept 9 schemas resident at 1,874 bytes, a reduction of 9,160 bytes (83.02%). This proves the mechanism, not an Agent Control production saving. Agent Control already injects only tools explicitly granted by the immutable recipe, so it must first measure large dynamic catalogs before adopting a gateway.

## Capability matrix

| Pisper capability | Agent Control equivalent | AC status | Evidence | Action |
| --- | --- | --- | --- | --- |
| Independent background Agents and parallel workflow branches | DAG Work Parcel stages, worker capacity, concurrent `JobRuntime.dispatch`, aggregation and verification | EQUIVALENT | Both reached three simultaneous invocations in the matched run; AC test `independent Work Parcel branches dispatch...` | ALREADY PRESENT |
| Derive a session from any completed turn while source remains byte-identical | Lane `clone`, sealed batons, context transfers and replay snapshots operate at current governed state, not arbitrary historical turn boundaries | MISSING | Pisper `session-lifecycle.mjs` and `session-derivation.test.mjs`; AC `ControlPlane.clone` copies current contract/baton | ADAPT |
| Branch keeps model, context, cwd and permission/run modes | Session permissions, model/node route, immutable repository snapshot, context packet and baton are represented separately | PARTIAL | AC has stronger components but no single content-addressed historical-turn snapshot | ADAPT |
| Compact child context and direct follow-up messaging | Bounded baton views, context selection hashes, token governor, account/node-qualified handoff | SUPERIOR | AC batons include objective, decisions, evidence, next action, route identity and recovery | ALREADY PRESENT |
| Fixed hot tools with `discover_tools` / `call_tool` for optional capabilities | Immutable recipe grants and provider schemas expose only policy-selected tools | PARTIAL | 83.02% synthetic footprint reduction; AC has no generic optional-tool gateway | ADAPT after production measurement |
| Gateway validates schema and authorizes the real underlying tool identity | `ToolInvocationGateway` validates grants, lease/ownership generation and policy | EQUIVALENT | Both fail before execution on invalid or unauthorized calls | ALREADY PRESENT |
| Stable recursive tool ordering and prompt-shape hashes with change reasons | Recipe fingerprint, stable context blocks, request-prefix SHA-256 and Warm Cache Runtime | SUPERIOR | AC has physically qualified cache reuse, compatibility, invalidation, route scoring and authority labels | ALREADY PRESENT; ADAPT concise change-reason diagnostics |
| Per-session model/context/cwd/permissions | Governed session permissions plus per-stage route/node and repository snapshot | EQUIVALENT | Pisper is cohesive at session level; AC is stronger at authority and credential residency | ALREADY PRESENT; close historical snapshot gap |
| Visual DAG workflows, conditions, approval, retry, skip and schedules | Jobs, Work Parcels, POE approval, retries, gates, dependencies, schedules and dashboard Crew | SUPERIOR | AC adds independent verification, fail-closed policy, evidence ledger and route accounting | ALREADY PRESENT; ADAPT visual authoring only if demanded |
| Memory candidates require confirmation before recall | **Your Memories** advisory acceptance/rejection, provenance, staleness and policy controls | SUPERIOR | AC prevents memories overriding Work Parcels, policy, evidence or execution state | ALREADY PRESENT |
| Desktop/TUI/mobile embedded or paired runtime; LAN and Iroh transport | Controller/dashboard, managed nodes, SSH/Tailscale, Pixel/Termux, WhatsApp/OpenWA and POE | PARTIAL | Pisper offers a cohesive packaged mobile client and resumable transport; AC spans more governed execution surfaces | ADAPT capability projection and cursor-based client recovery; do not adopt Iroh dependency by default |
| TLS fingerprint, device Bearer and explicit pairing approval | Managed-resource authentication and credential-residency boundaries | EQUIVALENT | Both preserve node-local credentials; AC route identity includes provider/account/model/node | ALREADY PRESENT |
| Normalized runtime-to-UI agent event bridge | Control events, Work Parcel SSE, token/cache streams, Crew and POE projections | PARTIAL | AC data is richer but lifecycle vocabularies remain split across projections | ADOPT one additive provider-neutral worker lifecycle envelope |
| Restart marks active agents/workflows interrupted; completed records persist | Durable queue/run/parcel ledgers, lease recovery, checkpoints, resumable source thread and fail-closed handoff | SUPERIOR | Pisper has sound interruption/retry semantics; AC additionally retains governed evidence and verification state | ALREADY PRESENT |
| Best-effort pet observer maps runtime events to character state | Crew/POE animation driven by real Work Parcel and lifecycle telemetry | SUPERIOR | AC already separates decorative observation from operational state | ALREADY PRESENT |

## Turn Branching decision

### Recommendation: ADAPT as a first-class core primitive

The primitive should be provider-, model- and runtime-neutral:

`completed governed turn -> content-addressed snapshot -> N restricted branches -> independent execution -> evidence -> reconciliation`

Minimum contract:

- branch only from a completed, persisted turn/event boundary;
- leave source state immutable and recoverable;
- persist source session/parcel, boundary ID, parent snapshot, source evidence-chain head, repository/workspace identity, model route, context source hashes, and creation time;
- carry permissions, secrets, filesystem, network, model and node authority only as an equal-or-smaller subset;
- materialize provider-native history only inside adapters; core stores provider-neutral context blocks and references;
- give every branch its own run/session identity, workspace strategy, route and ledger totals;
- reconcile outputs through normal Work Parcel criteria and independent verification;
- use a sealed baton as the bounded transport view when crossing agent/model/provider/node boundaries;
- never clone hidden provider state or claim KV/prompt cache portability unless the backend reports it authoritatively.

This simplifies fan-out from a proven reasoning point and makes “explore three alternatives from here” explicit. It does not replace DAG scheduling, baton handoff, token-aware routing, cache-aware expertise, or consensus. Implementing it is deferred until a focused design and tests are approved; this review contains no speculative product implementation.

## Failure and recovery findings

- Pisper workflow branches use memoized node promises, `Promise.all` for dependencies and `Promise.allSettled` for the graph. A failed node retries according to its bounded retry count, can fail or skip according to policy, and prevents dependent execution when not skipped.
- Pisper multi-agent records persist completed output and usage. On restart, formerly active records become truthfully `interrupted`; they are not silently resumed. Interrupt/follow-up generations are serialized so stale output cannot replace a newer run.
- Pisper resumable SSE uses a run ID and monotonic cursor. Buffer gaps trigger resynchronization rather than fabricated continuity.
- Agent Control already persists run/parcel state, restores queue state, records retry/failure classifications, blocks dependants after failed gates, preserves original handoff state, and requires independent verification. No replacement is warranted.

## Cache findings

Pisper sorts tool definitions and nested schema keys before hashing system/tool/runtime shapes. It reports whether system, tools or runtime caused a prefix change. This is a useful diagnostic presentation pattern.

Agent Control 4.4 already has stable recipe/context fingerprints, provider-reported versus derived authority, request-prefix hashes, cross-route compatibility, invalidation, Warm Experts, route scoring, aggregate accounting, and a live Warm Cache Runtime dashboard. Pisper does not demonstrate stronger cache governance or physical cache evidence. Adopt only its concise shape-change explanation where it can reuse Agent Control's existing hashes.

## Validation

- Focused Pisper runtime tests: **49 passed, 0 failed**.
- Full Pisper runtime suite: **1,973 passed, 0 failed, 2 skipped**, 50.0 s.
- Matched physical scheduler comparison: both completed, maximum concurrency **3** each.
- Agent Control full validation: **1,125 passed, 0 failed**; typecheck,
  bootstrap syntax, dashboard syntax, infrastructure neutrality and the
  55-entry implementation-status registry all passed.

The two skipped Pisper tests were platform-specific and not silently counted as passes. `npm ci` reported two high-severity dependency advisories; this review did not mutate or audit-fix the external project because that could introduce unrelated breaking changes.

## POE digest

Pisper taught us that a completed conversation turn can be a clean, immutable branching boundary; that optional tool catalogs can remain discoverable without keeping every schema in context; and that one compact lifecycle event vocabulary makes desktop, mobile and character interfaces easier to reconcile.

Agent Control already did the control-plane work better: true governed parallel execution, sealed provenance-bearing batons, explicit provider/account/model/node routes, independent verification, durable token/cache/cost accounting, recovery, and advisory **Your Memories**. The matched run proves Agent Control does not merely queue independent lanes one by one.

For 4.4, add Governed Turn Snapshot Branching, consider an optional governed tool-discovery gateway only after measuring real recipe overhead, and unify worker lifecycle events additively. Do not adopt Pisper, Pi, Iroh, its scheduler, or its memory/cache systems as dependencies.
