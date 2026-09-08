# Agent Control Natural Execution Transcript

> Product-generated during execution from authoritative durable records. This is not an after-the-fact narrative and excludes credentials, raw provider transport payloads, and private chain-of-thought.

## Origin

- Channel: `dashboard`
- Modality: `dashboard`
- Received: `2026-09-08T09:31:03.350Z`
- Authentication: `operator-token`
- Governed actor: `web-operator`
- Authority: `parcel.create`
- Identity reference: `d321dbf1aae2c81956d001d280043aff0f826b634a436c62a627ad74e161646a`
- Message/audio reference: `2c018806e499aa871791b0bd458de7dfcb8269abb1eff240df150c7a0d154a5a`

## Authoritative initiating request

> Review the frozen arithmetic fixture. Explain why add(2, 3) returns the wrong answer, identify the exact faulty expression, and recommend a correction. Do not modify any files. Verify the finding. Run only on the experimental Pixel model; do not substitute another model.

- Schema: `agent-control.execution-transcript/v1`
- Job Run: `08413aa3-304f-4464-af21-f80528434f94`
- Saved Job: `experimental-inference-review`
- Job: Experimental Pixel inference
- Status: `DISCONNECTED`
- Execution mode: `LIVE` — live/real execution
- Work Parcels: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Source retention: complete-durable; uncapped=yes

## Chronological execution record

### 0001 · 2026-09-08T09:31:03.563Z · JOB_REQUEST

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:requested`
- Actor: OPERATOR
- Outcome: `INFO`

**Experimental Pixel inference requested**

> Review a frozen Git revision and produce evidence-backed, validated findings. Scope full; requested ref c46d087b5e773302966f6b33d3e70c84d3f42fba.

### 0002 · 2026-09-08T09:31:03.563Z · OPERATOR_OBJECTIVE

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:operator-objective`
- Actor: OPERATOR
- Outcome: `INFO`

**Exact governed review instruction**

> You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.

### 0003 · 2026-09-08T09:31:03.563Z · JOB_QUEUED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:03.563Z:QUEUED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Job queued**

> Awaiting the governed scheduler.

### 0004 · 2026-09-08T09:31:03.580Z · JOB_RESOLVING

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:03.580Z:RESOLVING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Resolving immutable target and route**

> Resolving the immutable repository revision, execution node, provider route, and bounded context.

### 0005 · 2026-09-08T09:31:03.580Z · REPOSITORY_SNAPSHOT

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:repository`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**Immutable repository revision resolved**

> arithmetic-fixture at c46d087b5e773302966f6b33d3e70c84d3f42fba; requested ref c46d087b5e773302966f6b33d3e70c84d3f42fba; snapshot clean.

- Evidence: `c46d087b5e773302966f6b33d3e70c84d3f42fba`

### 0006 · 2026-09-08T09:31:03.580Z · CONTEXT_COMPILED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:context`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**THIN review context compiled**

> 1 bounded chunk(s), 2 file(s), 0 omitted file(s). Provider input is represented by the governed instruction and frozen context manifest; raw repository context is not duplicated into transcript storage.

- Evidence: `1fd21d023f121dd653a0d7ea03d5b192bfe67c42c9447f11bf55619d7a18565c`

### 0007 · 2026-09-08T09:31:03.580Z · ROUTE_SELECTED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:route`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Governed qualification route selected**

> private-inference / default account / gemma4-e4b-pixel @ pixel. Route purpose QUALIFICATION; qualification evidence physical-qualification-pending; initial route fallback no. A qualification-purpose selection does not grant production routing admission.

### 0008 · 2026-09-08T09:31:03.580Z · PROVIDER_REQUEST

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:provider-request`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Read-only structured review requested**

> You are performing a governed, read-only repository review. Input used 1 frozen context chunk(s). Credentials, environment values, hidden reasoning, and raw prompt payloads are not retained in this human-readable projection.

### 0009 · 2026-09-08T09:31:03.698Z · JOB_RUNNING

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:03.698Z:RUNNING`
- Actor: SYSTEM EVENT
- Outcome: `RUNNING`

**Provider execution started**

> The selected provider is executing the read-only structured review.

### 0010 · 2026-09-08T09:31:03.714Z · WORK_PARCEL_CREATED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:created`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Work Parcel parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8 created**

> Objective: Review frozen c46d087b5e773302966f6b33d3e70c84d3f42fba context chunk context-1-1fd21d023f12
> Planner: deterministic — Repository Job deterministically decomposed frozen context
> Execution owner: direct-repository-review-executor
> Current durable status at transcript projection: FAILED

### 0011 · 2026-09-08T09:31:03.714Z · PROVENANCE_JOB-RUN

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.714Z:job-run:15`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: job-run**

> 08413aa3-304f-4464-af21-f80528434f94

- Evidence: `08413aa3-304f-4464-af21-f80528434f94`

### 0012 · 2026-09-08T09:31:03.714Z · PROVENANCE_REQUEST-ORIGIN

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.714Z:request-origin:16`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: request-origin**

> dashboard:2c018806e499aa871791b0bd458de7dfcb8269abb1eff240df150c7a0d154a5a

- Evidence: `dashboard:2c018806e499aa871791b0bd458de7dfcb8269abb1eff240df150c7a0d154a5a`

### 0013 · 2026-09-08T09:31:03.714Z · PROVENANCE_EXECUTION-MODE

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.714Z:execution-mode:17`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: execution-mode**

> LIVE

- Evidence: `LIVE`

### 0014 · 2026-09-08T09:31:03.714Z · PROVENANCE_REVIEWED-SHA

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.714Z:reviewed-sha:18`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: reviewed-sha**

> c46d087b5e773302966f6b33d3e70c84d3f42fba

- Evidence: `c46d087b5e773302966f6b33d3e70c84d3f42fba`

### 0015 · 2026-09-08T09:31:03.714Z · PROVENANCE_EXECUTION-LOCALITY

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.714Z:execution-locality:19`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: execution-locality**

> workload=controller;provider=pixel;credential=none

- Evidence: `workload=controller;provider=pixel;credential=none`

### 0016 · 2026-09-08T09:31:03.714Z · PARCEL_TASK_RECEIVED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:audit-dd3baba8-1c83-4013-b53f-4fdd610314bd`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Frozen review chunk received**

> context-1-1fd21d023f12

### 0017 · 2026-09-08T09:31:03.714Z · PARCEL_ROUTE_RESOLVED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:audit-aa4375a4-870c-40a8-9c90-59947ef61636`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**private-inference/default/gemma4-e4b-pixel@pixel**

> Qualification physical-qualification-pending; fallback false; purpose QUALIFICATION

### 0018 · 2026-09-08T09:31:03.723Z · PROVENANCE_RETRIEVAL_FALLBACK

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.723Z:retrieval.fallback:20`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: retrieval.fallback**

> frozen-context

- Evidence: `frozen-context`

### 0019 · 2026-09-08T09:31:03.723Z · PARCEL_READINESS_CHECKED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:audit-57864743-c5cd-49ae-a616-ffb87c620cf2`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Governed retrieval unavailable; controlled frozen context retained**

> retrieval_disabled

### 0020 · 2026-09-08T09:31:03.732Z · PARCEL_INVOCATION_STARTED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:audit-6869cae3-af17-4f12-be7e-0998d30e882b`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**private-inference/default/gemma4-e4b-pixel@pixel provider invocation started**

> Thread repository-review:08413aa3-304f-4464-af21-f80528434f94:1:context-1-1fd21d023f12; frozen context context-1-1fd21d023f12; structured schema agent-control.repository-review/v1; invocation profile provider-default

### 0021 · 2026-09-08T09:31:03.748Z · TELEMETRY_STARTED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:telemetry:repository-review:08413aa3-304f-4464-af21-f80528434f94:1:context-1-1fd21d023f12:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 2,048 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0022 · 2026-09-08T09:31:03.770Z · GOVERNOR_DECISION

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:governor:token-route:54af295f-1ba4-4b58-9f9a-f113a109d697`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:54af295f-1ba4-4b58-9f9a-f113a109d697`

### 0023 · 2026-09-08T09:31:03.780Z · TELEMETRY_SAMPLE

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:telemetry:repository-review:08413aa3-304f-4464-af21-f80528434f94:1:context-1-1fd21d023f12:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live telemetry sample 2**

> Latest sample: current context unavailable (provider_did_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 2,048 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0024 · 2026-09-08T09:31:03.823Z · PROVENANCE_PROVIDER-INVOCATION-FAILED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.823Z:provider-invocation-failed:21`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: provider-invocation-failed**

> transient-transport:transient_transport_failure

- Evidence: `transient-transport:transient_transport_failure`

### 0025 · 2026-09-08T09:31:03.823Z · PARCEL_INVOCATION_FAILED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:audit-704f92f2-2c8d-428b-98d6-c3e5f6162fdf`
- Actor: AGENT / PROVIDER
- Outcome: `FAILED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**private-inference/default/gemma4-e4b-pixel@pixel provider invocation failed**

> Classification transient-transport; transient_transport_failure; transport failure is not model-quality evidence

### 0026 · 2026-09-08T09:31:03.823Z · TELEMETRY_SAMPLE

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:telemetry:repository-review:08413aa3-304f-4464-af21-f80528434f94:1:context-1-1fd21d023f12:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live telemetry sample 3**

> Latest sample: current context unavailable (provider_failed_before_complete_usage). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 2,048 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0027 · 2026-09-08T09:31:03.837Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:invocation:provider-failure:ec2ede03-2a63-47fb-bb4a-e0c7d5c10e2b`
- Actor: AGENT / PROVIDER
- Outcome: `FAILED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**private-inference/gemma4-e4b-pixel invocation accounted**

> Outcome provider-failed:transient-transport; verifier not-applicable-transport-failure; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority unavailable; elapsed 42 ms. Lifetime usage unavailable input (unavailable fresh + unavailable cached + unavailable cache write), unavailable output, unavailable reasoning, unavailable total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `provider-failure:ec2ede03-2a63-47fb-bb4a-e0c7d5c10e2b`

### 0028 · 2026-09-08T09:31:03.837Z · PROVENANCE_PROVIDER-ATTEMPT-ACCOUNTING

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.837Z:provider-attempt-accounting:22`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: provider-attempt-accounting**

> provider-failure:ec2ede03-2a63-47fb-bb4a-e0c7d5c10e2b:usage-unavailable

- Evidence: `provider-failure:ec2ede03-2a63-47fb-bb4a-e0c7d5c10e2b:usage-unavailable`

### 0029 · 2026-09-08T09:31:03.849Z · STAGE_FAILED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:stage:review`
- Actor: ERROR
- Outcome: `FAILED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Review context-1-1fd21d023f12: FAILED**

> Job repository-code-review@1. Dependencies: none. Required capabilities: repository-review. Requested route: provider policy-selected; account policy-selected; model gemma4-e4b-pixel; role review.default; fallback disabled; purpose QUALIFICATION. Actual route: provider private-inference; account default; model gemma4-e4b-pixel; workload node controller; execution node pixel. Error: provider_unavailable.

### 0030 · 2026-09-08T09:31:03.849Z · PROVENANCE_FAILED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:parcel:parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8:provenance:2026-09-08T09:31:03.849Z:failed:23`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

**Provenance: failed**

> provider_unavailable

- Evidence: `provider_unavailable`

### 0031 · 2026-09-08T09:31:03.869Z · JOB_RECONNECTING

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:03.869Z:RECONNECTING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**RECONNECTING**

> transient transport failure

### 0032 · 2026-09-08T09:31:03.869Z · RETRY_SCHEDULED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:retry:2026-09-08T09:31:03.869Z:1`
- Actor: SYSTEM EVENT
- Outcome: `RECOMMENDED`

**Bounded same-route retry 1 scheduled**

> Classification transient-transport; reason transient_transport_failure; next attempt 2026-09-08T09:31:23.869Z. This retry retained the sealed route identity.

### 0033 · 2026-09-08T09:31:05.205Z · JOB_CANCELLING

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:05.205Z:CANCELLING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**CANCELLING**

> cancelled by:web-operator

### 0034 · 2026-09-08T09:31:05.220Z · JOB_DISCONNECTED

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:transition:2026-09-08T09:31:05.220Z:DISCONNECTED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**DISCONNECTED**

> cancellation cleanup unproven

### 0035 · 2026-09-08T09:31:05.220Z · PROVIDER_EXECUTION_UNKNOWN

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:execution:repository-review:08413aa3-304f-4464-af21-f80528434f94:1`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Route-bound provider attempt 1: UNKNOWN**

> Execution repository-review:08413aa3-304f-4464-af21-f80528434f94:1; started 2026-09-08T09:31:03.705Z; workload node controller; provider execution node pixel; credential node provider default; active turn not reported.

- Evidence: `repository-review:08413aa3-304f-4464-af21-f80528434f94:1`

### 0036 · 2026-09-08T09:31:05.220Z · RUN_ERROR

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:error:0`
- Actor: ERROR
- Outcome: `FAILED`

**Recorded run error 1**

> cancelled_by:web-operator

### 0037 · 2026-09-08T09:31:05.220Z · LEDGER_RECONCILIATION

- Event ID: `08413aa3-304f-4464-af21-f80528434f94:ledger`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`

**Accounting reconciliation incomplete**

> Job ledger: unavailable input; fresh/cache split unavailable + unavailable output = unavailable total; unavailable. Work Parcel ledger: unavailable reported/fresh input; cached-input component unavailable + unavailable output = unavailable total; unavailable. Accounted invocations 1; invocations with unavailable token usage 1. Agent Control does not manufacture exact aggregate usage when any dispatched attempt lacks authoritative usage.

- Evidence: `parcel-523ecb3d-9e60-49ae-bd90-470ece5a92e8`

## Integrity and scope

- Entries: 37
- Ordering: timestamp, then deterministic source-projection sequence; durable event identifiers are shown for traceability.
- Authority: Job Run state, Work Parcel audit/provenance, model invocation ledger, token/governor lifecycle, and sealed baton records.
- Deliberately excluded: credential values, authentication material, raw rejected provider payloads, and hidden/private model reasoning.
- The adjacent JSON manifest records the SHA-256 of this complete Markdown document and its deterministic source projection.

