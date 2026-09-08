# Agent Control Natural Execution Transcript

> Product-generated during execution from authoritative durable records. This is not an after-the-fact narrative and excludes credentials, raw provider transport payloads, and private chain-of-thought.

## Origin

- Channel: `openwa`
- Modality: `text`
- Received: `2026-09-08T05:22:31.000Z`
- Authentication: `enrolled-direct-sender`
- Governed actor: `messaging:618b18f417be1bc883a9c4fb`
- Authority: `template:governed-adaptive-crew`
- Identity reference: `d59c1d40c76215cfef095e32d0d5c11f1ed7827cc60246e57a00cf1081948abf`
- Message/audio reference: `640332396d86e2b535ad185f2bc4089995d220926655a4bee3eb097cd8cbbd2f`

## Authoritative initiating request

> start governed-adaptive-crew

- Schema: `agent-control.execution-transcript/v1`
- Job Run: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806`
- Saved Job: `crew-wopr-quality-review`
- Job: Crew/WOPR quality-escalation review
- Status: `SUCCEEDED_WITH_FINDINGS`
- Execution mode: `LIVE` — live/real execution
- Work Parcels: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Source retention: complete-durable; uncapped=yes

## Chronological execution record

### 0001 · 2026-09-08T05:22:43.569Z · JOB_REQUEST

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:requested`
- Actor: OPERATOR
- Outcome: `INFO`

**Crew/WOPR quality-escalation review requested**

> Review a frozen Git revision and produce evidence-backed, validated findings. Scope full; requested ref 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020.

### 0002 · 2026-09-08T05:22:43.569Z · OPERATOR_OBJECTIVE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:operator-objective`
- Actor: OPERATOR
- Outcome: `INFO`

**Exact governed review instruction**

> You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.

### 0003 · 2026-09-08T05:22:43.569Z · JOB_QUEUED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:transition:2026-09-08T05:22:43.569Z:QUEUED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Job queued**

> Awaiting the governed scheduler.

### 0004 · 2026-09-08T05:22:43.581Z · JOB_RESOLVING

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:transition:2026-09-08T05:22:43.581Z:RESOLVING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Resolving immutable target and route**

> Resolving the immutable repository revision, execution node, provider route, and bounded context.

### 0005 · 2026-09-08T05:22:43.581Z · REPOSITORY_SNAPSHOT

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:repository`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**Immutable repository revision resolved**

> reservation-service-fixture at 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020; requested ref 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020; snapshot clean.

- Evidence: `2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020`

### 0006 · 2026-09-08T05:22:43.581Z · CONTEXT_COMPILED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:context`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**THIN review context compiled**

> 1 bounded chunk(s), 5 file(s), 0 omitted file(s). Provider input is represented by the governed instruction and frozen context manifest; raw repository context is not duplicated into transcript storage.

- Evidence: `1f6ffbfee231e2c088844f597a482bb6e13368c67bbba6336e3669fded39566c`

### 0007 · 2026-09-08T05:22:43.581Z · ROUTE_SELECTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:route`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Governed provider route selected**

> local-llama / default account / qwen-local-small-reviewer @ controller. Route purpose EXECUTION; qualification evidence live-llama-cpp-preflight-v1; initial route fallback no.

### 0008 · 2026-09-08T05:22:43.581Z · PROVIDER_REQUEST

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:provider-request`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Read-only structured review requested**

> You are performing a governed, read-only repository review. Input used 1 frozen context chunk(s). Credentials, environment values, hidden reasoning, and raw prompt payloads are not retained in this human-readable projection.

### 0009 · 2026-09-08T05:22:43.661Z · JOB_RUNNING

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:transition:2026-09-08T05:22:43.661Z:RUNNING`
- Actor: SYSTEM EVENT
- Outcome: `RUNNING`

**Provider execution started**

> The selected provider is executing the read-only structured review.

### 0010 · 2026-09-08T05:22:43.675Z · WORK_PARCEL_CREATED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:created`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Work Parcel parcel-aaa68806-9012-4367-b602-075f8efe6da8 created**

> Objective: Review frozen 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020 context chunk context-1-1f6ffbfee231
> Planner: deterministic — Repository Job deterministically decomposed frozen context
> Execution owner: direct-repository-review-executor
> Current durable status at transcript projection: SUCCEEDED

### 0011 · 2026-09-08T05:22:43.675Z · PROVENANCE_JOB-RUN

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.675Z:job-run:15`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: job-run**

> f0db7dea-d0ed-4268-81a9-dfb7d6cd8806

- Evidence: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806`

### 0012 · 2026-09-08T05:22:43.675Z · PROVENANCE_REQUEST-ORIGIN

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.675Z:request-origin:16`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: request-origin**

> openwa:640332396d86e2b535ad185f2bc4089995d220926655a4bee3eb097cd8cbbd2f

- Evidence: `openwa:640332396d86e2b535ad185f2bc4089995d220926655a4bee3eb097cd8cbbd2f`

### 0013 · 2026-09-08T05:22:43.675Z · PROVENANCE_EXECUTION-MODE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.675Z:execution-mode:17`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: execution-mode**

> LIVE

- Evidence: `LIVE`

### 0014 · 2026-09-08T05:22:43.675Z · PROVENANCE_REVIEWED-SHA

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.675Z:reviewed-sha:18`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: reviewed-sha**

> 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020

- Evidence: `2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020`

### 0015 · 2026-09-08T05:22:43.675Z · PROVENANCE_EXECUTION-LOCALITY

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.675Z:execution-locality:19`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: execution-locality**

> workload=controller;provider=controller;credential=none

- Evidence: `workload=controller;provider=controller;credential=none`

### 0016 · 2026-09-08T05:22:43.675Z · PARCEL_TASK_RECEIVED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-1bbd32f9-2deb-494a-a490-146076e65ca9`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Frozen review chunk received**

> context-1-1f6ffbfee231

### 0017 · 2026-09-08T05:22:43.675Z · PARCEL_ROUTE_RESOLVED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-9aad6add-d430-4963-be1c-93c91da1d3e2`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**local-llama/default/qwen-local-small-reviewer@controller**

> Qualification live-llama-cpp-preflight-v1; fallback false; purpose EXECUTION

### 0018 · 2026-09-08T05:22:43.687Z · PROVENANCE_RETRIEVAL_FALLBACK

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:43.687Z:retrieval.fallback:20`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: retrieval.fallback**

> frozen-context

- Evidence: `frozen-context`

### 0019 · 2026-09-08T05:22:43.687Z · PARCEL_READINESS_CHECKED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-b2e503d9-a4c7-44b6-80f8-59eb5f7911c4`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Governed retrieval unavailable; controlled frozen context retained**

> retrieval_disabled

### 0020 · 2026-09-08T05:22:43.693Z · PARCEL_INVOCATION_STARTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-b62e62bf-a020-41bf-aad7-927e038f3ecb`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**local-llama/default/qwen-local-small-reviewer@controller provider invocation started**

> Thread repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231; frozen context context-1-1f6ffbfee231; structured schema agent-control.repository-review/v1; invocation profile provider-default

### 0021 · 2026-09-08T05:22:43.698Z · TELEMETRY_STARTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 32,768 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0022 · 2026-09-08T05:22:43.711Z · GOVERNOR_DECISION

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:governor:token-route:1e8e038f-f635-4415-898c-339933446960`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:1e8e038f-f635-4415-898c-339933446960`

### 0023 · 2026-09-08T05:22:43.716Z · TELEMETRY_SAMPLE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Live telemetry sample 2**

> Latest sample: current context unavailable (provider_did_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 32,768 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0024 · 2026-09-08T05:22:58.318Z · TELEMETRY_SAMPLE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Live telemetry sample 3**

> Latest sample: 1,421 / 32,768 tokens, 4.34% displayed, estimated. Lifetime usage: 773 input (1 fresh + 772 cached), 648 output, 1,421 total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: 1,421 / 32,768 tokens; 4.34%; estimated.
  - Lifetime: 773 input (1 fresh + 772 cached), 648 output, 1,421 total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0025 · 2026-09-08T05:22:58.323Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:invocation:sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**local-llama/qwen-local-small-reviewer invocation accounted**

> Outcome stop; verifier PASS_WITH_FINDINGS; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority authoritative; elapsed 14,601 ms. Lifetime usage 773 input (1 fresh + 772 cached + unavailable cache write), 648 output, unavailable reasoning, 1,421 total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`

### 0026 · 2026-09-08T05:22:58.323Z · PROVENANCE_PROVIDER-RESPONSE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:58.323Z:provider-response:21`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: provider-response**

> sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815

- Evidence: `sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`

### 0027 · 2026-09-08T05:22:58.323Z · PARCEL_INVOCATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-7405b3ee-c1f8-4b3e-a97c-774008de25ed`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**local-llama/default/qwen-local-small-reviewer@controller returned structured review output**

> Response sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815; finish stop

### 0028 · 2026-09-08T05:22:58.330Z · PROVENANCE_QUALITY-GATE-FAILED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:22:58.330Z:quality-gate-failed:22`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: quality-gate-failed**

> reservation-cache-root-cause-v1:sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815

- Evidence: `reservation-cache-root-cause-v1:sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`

### 0029 · 2026-09-08T05:22:58.330Z · PARCEL_VERIFICATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-a90d7890-13b9-4497-8d39-94dda0ef4255`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Independent quality gate rejected local-llama/qwen-local-small-reviewer**

> reservation-cache-root-cause-v1; Schema-valid review did not satisfy 4 acceptance-level root-cause criteria.; evidence fixture:test/acceptance.test.mjs, fixture:README.md, provider-response:sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815; unresolved Identify the reservation operation as a non-atomic check-then-update sequence, explicitly or by proving both callers check before either updates ownership., Explain that both callers can observe the resource as unowned before either caller updates ownership., Identify that createdAt - now reverses the cache-age subtraction and yields a negative age for stale entries., State that cache age must be calculated as now - entry.createdAt.

### 0030 · 2026-09-08T05:22:58.337Z · HANDOFF_REQUESTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:governor:token-route:e64657c4-3ff2-40c0-ba8f-a395c548b54d`
- Actor: GOVERNOR
- Outcome: `RECOMMENDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Governed handoff requested**

> State CONTINUE; action BATON_AND_HANDOFF; outcome RECORDED; reason quality_gate_failed_governed_fallback_selected:reservation-cache-root-cause-v1. A request is not proof of dispatch, acceptance, destination execution, or completion.

- Evidence: `token-route:e64657c4-3ff2-40c0-ba8f-a395c548b54d`

### 0031 · 2026-09-08T05:22:58.342Z · BATON_CREATED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:baton:token-baton:0f555e37-5d79-4940-82bc-58a4d4353706`
- Actor: BATON
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Verified baton created and sealed**

> Objective: You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.
> Frozen repository: reservation-service-fixture at 2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020. Next action: Using the same frozen repository and original objective, explain both failing acceptance-test root causes precisely and return a schema-valid read-only repository review.. SHA-256 76b32e624b47ea680697b4fc7c56db72c575e11e77bb3c24c671ce4a42b282a0. Creation does not by itself mean dispatch, acceptance, destination execution, or completed handoff.

- Evidence: `token-baton:0f555e37-5d79-4940-82bc-58a4d4353706`, `76b32e624b47ea680697b4fc7c56db72c575e11e77bb3c24c671ce4a42b282a0`

### 0032 · 2026-09-08T05:22:58.349Z · HANDOFF_REQUESTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:governor:token-route:773ea403-aab2-4d70-bc18-57c95098ce8c`
- Actor: GOVERNOR
- Outcome: `RECOMMENDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Governed handoff requested**

> State CONTINUE; action BATON_AND_HANDOFF; outcome RECORDED; reason verified_baton_ready_for_explicit_handoff. A request is not proof of dispatch, acceptance, destination execution, or completion.

- Evidence: `token-route:773ea403-aab2-4d70-bc18-57c95098ce8c`, `token-baton:0f555e37-5d79-4940-82bc-58a4d4353706`

### 0033 · 2026-09-08T05:22:58.359Z · PARCEL_INVOCATION_STARTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-a9b8c8c8-1846-42ec-a3e9-62fedc95a0ee`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**codex-chatgpt/Controller Account A/codex-luna-controller-a@controller provider invocation started**

> Thread repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:quality:codex-luna-controller-a; frozen context context-1-1f6ffbfee231; structured schema agent-control.repository-review/v1; invocation profile provider-default; continuation baton token-baton:0f555e37-5d79-4940-82bc-58a4d4353706

### 0034 · 2026-09-08T05:22:58.365Z · TELEMETRY_STARTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:quality:codex-luna-controller-a:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0035 · 2026-09-08T05:22:58.369Z · GOVERNOR_DECISION

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:governor:token-route:f77899d1-abb7-4281-8e62-fe7b03fe80c2`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:f77899d1-abb7-4281-8e62-fe7b03fe80c2`

### 0036 · 2026-09-08T05:22:58.374Z · TELEMETRY_SAMPLE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:quality:codex-luna-controller-a:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live telemetry sample 2**

> Latest sample: current context unavailable (codex_jsonl_does_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0037 · 2026-09-08T05:23:16.228Z · TELEMETRY_SAMPLE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:telemetry:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1:context-1-1f6ffbfee231:quality:codex-luna-controller-a:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live telemetry sample 3**

> Latest sample: current context unavailable (codex_exec_turn_usage_is_not_current_context). Lifetime usage: 8,133 input (8,133 fresh + 0 cached), 847 output, 8,980 total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: 8,133 input (8,133 fresh + 0 cached), 847 output, 8,980 total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0038 · 2026-09-08T05:23:16.455Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:invocation:sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**codex-chatgpt/codex-luna-controller-a invocation accounted**

> Outcome completed; verifier PASS_WITH_FINDINGS; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority authoritative; elapsed 18,081 ms. Lifetime usage 8,133 input (8,133 fresh + 0 cached + unavailable cache write), 847 output, unavailable reasoning, 8,980 total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`

### 0039 · 2026-09-08T05:23:16.455Z · PROVENANCE_PROVIDER-RESPONSE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:23:16.455Z:provider-response:23`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: provider-response**

> sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819

- Evidence: `sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`

### 0040 · 2026-09-08T05:23:16.455Z · PARCEL_INVOCATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-c1e53338-f23c-4dae-8d0a-a5e69485b5f1`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**codex-chatgpt/Controller Account A/codex-luna-controller-a@controller returned structured review output**

> Response sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819; finish completed

### 0041 · 2026-09-08T05:23:16.464Z · PROVENANCE_QUALITY-GATE-PASSED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:23:16.464Z:quality-gate-passed:24`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: quality-gate-passed**

> reservation-cache-root-cause-v1:sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819

- Evidence: `reservation-cache-root-cause-v1:sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`

### 0042 · 2026-09-08T05:23:16.464Z · PARCEL_VERIFICATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-1ffc3a7e-18c7-4496-9fbc-815baf54599d`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Independent quality gate accepted codex-chatgpt/codex-luna-controller-a**

> reservation-cache-root-cause-v1; The review proves both acceptance-test root causes: the non-atomic reservation interleaving and the reversed cache-age subtraction.; evidence fixture:test/acceptance.test.mjs, fixture:README.md, provider-response:sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819; unresolved none

### 0043 · 2026-09-08T05:23:16.472Z · HANDOFF_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:governor:token-route:7d20f38e-b7c1-4ce2-b958-92175d196d55`
- Actor: GOVERNOR
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Governed handoff completed**

> State CONTINUE; action BATON_AND_HANDOFF; outcome SUCCEEDED; reason handoff_completed_original_thread_recoverable.

- Evidence: `token-route:7d20f38e-b7c1-4ce2-b958-92175d196d55`, `token-baton:0f555e37-5d79-4940-82bc-58a4d4353706`

### 0044 · 2026-09-08T05:23:16.478Z · PROVENANCE_GOVERNED-VERIFICATION-CONTRACT

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:23:16.478Z:governed-verification-contract:25`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: governed-verification-contract**

> contract:f8c1e598-4aba-4de0-afdc-81babdc52d67

- Evidence: `contract:f8c1e598-4aba-4de0-afdc-81babdc52d67`

### 0045 · 2026-09-08T05:23:16.478Z · PARCEL_ROUTE_CHANGED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-a959d37b-fa01-4766-b870-c257fb3101c3`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Quality gate reservation-cache-root-cause-v1 selected codex-chatgpt/codex-luna-controller-a; destination passed independently**

> contract:f8c1e598-4aba-4de0-afdc-81babdc52d67

### 0046 · 2026-09-08T05:23:16.485Z · STAGE_SUCCEEDED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:stage:review`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Review context-1-1f6ffbfee231: SUCCEEDED**

> Job repository-code-review@1. Dependencies: none. Required capabilities: repository-review. Requested route: provider policy-selected; account policy-selected; model qwen-local-small-reviewer; role review.default; fallback allowed; purpose EXECUTION. Actual route: provider local-llama; account default; model qwen-local-small-reviewer; workload node controller; execution node controller.

### 0047 · 2026-09-08T05:23:16.485Z · PROVENANCE_PROVIDER-COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:23:16.485Z:provider-completed:26`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: provider-completed**

> Provider local-llama; model qwen-local-small-reviewer; structured review returned

- Evidence: `Provider local-llama; model qwen-local-small-reviewer; structured review returned`

### 0048 · 2026-09-08T05:23:16.505Z · PROVIDER_EXECUTION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:execution:repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Route: local-llama / default account / qwen-local-small-reviewer @ controller
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Route-bound provider attempt 1: COMPLETED**

> Execution repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1; started 2026-09-08T05:22:43.668Z; workload node controller; provider execution node controller; credential node provider default; active turn not reported.

- Evidence: `repository-review:f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:1`

### 0049 · 2026-09-08T05:23:16.517Z · JOB_VALIDATING

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:transition:2026-09-08T05:23:16.517Z:VALIDATING`
- Actor: SYSTEM EVENT
- Outcome: `RUNNING`

**Independent validation started**

> Agent Control is validating provider output independently.

### 0050 · 2026-09-08T05:23:16.528Z · PROVENANCE_VERIFICATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:parcel-aaa68806-9012-4367-b602-075f8efe6da8:provenance:2026-09-08T05:23:16.528Z:verification.completed:27`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Provenance: verification.completed**

> PASS_WITH_FINDINGS

- Evidence: `PASS_WITH_FINDINGS`

### 0051 · 2026-09-08T05:23:16.528Z · PARCEL_VERIFICATION_COMPLETED

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:parcel:audit-9faf9213-d0dc-47c1-8a6a-b840eb4f6812`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

**Independent repository validation: PASS_WITH_FINDINGS**

> Parameterized Job validation accepted the consolidated repository-review result

### 0052 · 2026-09-08T05:23:16.542Z · JOB_SUCCEEDED_WITH_FINDINGS

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:transition:2026-09-08T05:23:16.542Z:SUCCEEDED_WITH_FINDINGS`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`

**Job completed with validated findings**

> PASS WITH FINDINGS

### 0053 · 2026-09-08T05:23:16.542Z · PROVIDER_RESPONSE

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:provider-response`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Provider output recorded**

> The supplied acceptance invariants are violated by two proven implementation defects: reservation ownership is checked before an await, allowing concurrent callers to pass the check, and cache freshness computes the age with reversed operands, marking old entries fresh.

- Evidence: `sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`, `sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`, `provider_response_sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`, `provider_response_sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`

### 0054 · 2026-09-08T05:23:16.542Z · VALIDATED_RESULT

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:validated-result`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Provider/model: local-llama / default account / qwen-local-small-reviewer

**Validated repository-review result: PASS_WITH_FINDINGS**

> The supplied acceptance invariants are violated by two proven implementation defects: reservation ownership is checked before an await, allowing concurrent callers to pass the check, and cache freshness computes the age with reversed operands, marking old entries fresh.
>
> Areas reviewed: Reservation exclusivity and concurrent acquisition behavior, Snapshot cache TTL freshness calculation, Acceptance tests and documented invariants, Package test configuration
> Areas not reviewed: none
> Positive observations: The acceptance tests directly exercise both documented invariants, including a controlled interleaving for the concurrency defect and a concrete old-entry timestamp for cache expiry.; The repository is small and the relevant implementation and acceptance evidence are present in the supplied frozen revision.

- Evidence: `sha256:7289e0328a72d47bfb2eba2ed1e083501f6e0bdb62066d460966b48a65afe815`, `sha256:eda093ce03747972596cdc3720952a4a95d7c0e25eaddb0d3ae09eddf6356819`

### 0055 · 2026-09-08T05:23:16.542Z · VALIDATED_FINDING

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:finding:reservation-concurrency-check-then-act`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`

**HIGH — Concurrent reservations can both acquire the same resource**

> Location: src/reservation-ledger.mjs:5-8
> Category: correctness
> Evidence: reserve() checks #owners.has(resourceId) on line 6, awaits audit() on line 7, and only records ownership on line 8. The acceptance test invokes two reserves concurrently with an audit gate that lets both calls reach the await before either writes ownership.
> Operational reasoning: Both calls can observe the resource as unowned before either call executes #owners.set(). Because the asynchronous audit yields control between the check and the ownership write, both calls resume and set the same resource to different owners, and both return true. This violates the invariant that at most one concurrent caller may acquire an unowned resource and causes the first acceptance assertion to fail.
> Impact: Concurrent callers can both receive successful acquisition results, producing inconsistent ownership and violating exclusive reservation semantics.
> Suggested remediation: Make the check-and-claim operation atomic with respect to concurrent reserve calls: claim the resource before any await, or serialize reservation operations so no second caller can pass the ownership check until the first claim is committed. Preserve the intended audit failure semantics explicitly when choosing the ordering.
> Confidence: 1
> Validation: VALID — no additional reasons

- Evidence: `reservation-concurrency-check-then-act`

### 0056 · 2026-09-08T05:23:16.542Z · VALIDATED_FINDING

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:finding:snapshot-age-reversed`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`

**MEDIUM — Cache freshness uses a reversed age calculation**

> Location: src/snapshot-cache.mjs:1-3
> Category: correctness
> Evidence: isFresh() returns entry.createdAt - now < ttlMs. The acceptance test passes createdAt=1,000, now=10,000, and ttlMs=100; this expression evaluates to -9,000 < 100, which is true, although the entry is 9,000 ms old and must be stale.
> Operational reasoning: The documented age is current time minus creation time, but the implementation subtracts current time from creation time. For an older entry this produces a negative value that is less than any positive TTL, so stale entries are incorrectly classified as fresh. The second acceptance assertion therefore fails.
> Impact: Expired cache entries may be served as fresh, causing stale snapshot data to be used beyond its configured TTL.
> Suggested remediation: Compute age as now - entry.createdAt and compare that age against ttlMs, while defining and testing behavior for boundary, negative-TTL, and future-created timestamps as appropriate for the service contract.
> Confidence: 1
> Validation: VALID — no additional reasons

- Evidence: `snapshot-age-reversed`

### 0057 · 2026-09-08T05:23:16.542Z · LEDGER_RECONCILIATION

- Event ID: `f0db7dea-d0ed-4268-81a9-dfb7d6cd8806:ledger`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`

**Job and Work Parcel accounting reconcile**

> Job ledger: 8,906 input (8,134 fresh + 772 cached) + 1,495 output = 10,401 total; unavailable. Work Parcel ledger: 8,906 input (8,134 fresh + 772 cached) + 1,495 output = 10,401 total; unavailable. Accounted invocations 2; invocations with unavailable token usage 0.

- Evidence: `parcel-aaa68806-9012-4367-b602-075f8efe6da8`

## Integrity and scope

- Entries: 57
- Ordering: timestamp, then deterministic source-projection sequence; durable event identifiers are shown for traceability.
- Authority: Job Run state, Work Parcel audit/provenance, model invocation ledger, token/governor lifecycle, and sealed baton records.
- Deliberately excluded: credential values, authentication material, raw rejected provider payloads, and hidden/private model reasoning.
- The adjacent JSON manifest records the SHA-256 of this complete Markdown document and its deterministic source projection.
