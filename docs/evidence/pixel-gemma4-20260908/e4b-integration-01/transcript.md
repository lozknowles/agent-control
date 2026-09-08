# Agent Control Natural Execution Transcript

> Product-generated during execution from authoritative durable records. This is not an after-the-fact narrative and excludes credentials, raw provider transport payloads, and private chain-of-thought.

## Origin

- Channel: `dashboard`
- Modality: `dashboard`
- Received: `2026-09-08T09:05:51.939Z`
- Authentication: `operator-token`
- Governed actor: `web-operator`
- Authority: `parcel.create`
- Identity reference: `d321dbf1aae2c81956d001d280043aff0f826b634a436c62a627ad74e161646a`
- Message/audio reference: `7e08f4384cbec07bc3534a12115a169f9c300088c70484cddd768b5d33dd5437`

## Authoritative initiating request

> Review the frozen arithmetic fixture. Explain why add(2, 3) returns the wrong answer, identify the exact faulty expression, and recommend a correction. Do not modify any files. Verify the finding. Run only on the experimental Pixel model; do not substitute another model.

- Schema: `agent-control.execution-transcript/v1`
- Job Run: `685c2763-c618-4698-917d-c6ae935cfbaa`
- Saved Job: `experimental-inference-review`
- Job: Experimental Pixel inference
- Status: `DISCONNECTED`
- Execution mode: `LIVE` — live/real execution
- Work Parcels: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Source retention: complete-durable; uncapped=yes

## Chronological execution record

### 0001 · 2026-09-08T09:05:52.091Z · JOB_REQUEST

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:requested`
- Actor: OPERATOR
- Outcome: `INFO`

**Experimental Pixel inference requested**

> Review a frozen Git revision and produce evidence-backed, validated findings. Scope full; requested ref 2992e79e84cf75dfa02a52e9dc318cf1d964e8cb.

### 0002 · 2026-09-08T09:05:52.091Z · OPERATOR_OBJECTIVE

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:operator-objective`
- Actor: OPERATOR
- Outcome: `INFO`

**Exact governed review instruction**

> You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.

### 0003 · 2026-09-08T09:05:52.091Z · JOB_QUEUED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:transition:2026-09-08T09:05:52.091Z:QUEUED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Job queued**

> Awaiting the governed scheduler.

### 0004 · 2026-09-08T09:05:52.100Z · JOB_RESOLVING

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:transition:2026-09-08T09:05:52.100Z:RESOLVING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Resolving immutable target and route**

> Resolving the immutable repository revision, execution node, provider route, and bounded context.

### 0005 · 2026-09-08T09:05:52.100Z · REPOSITORY_SNAPSHOT

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:repository`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**Immutable repository revision resolved**

> arithmetic-fixture at 2992e79e84cf75dfa02a52e9dc318cf1d964e8cb; requested ref 2992e79e84cf75dfa02a52e9dc318cf1d964e8cb; snapshot clean.

- Evidence: `2992e79e84cf75dfa02a52e9dc318cf1d964e8cb`

### 0006 · 2026-09-08T09:05:52.100Z · CONTEXT_COMPILED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:context`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**THIN review context compiled**

> 1 bounded chunk(s), 2 file(s), 0 omitted file(s). Provider input is represented by the governed instruction and frozen context manifest; raw repository context is not duplicated into transcript storage.

- Evidence: `1fd21d023f121dd653a0d7ea03d5b192bfe67c42c9447f11bf55619d7a18565c`

### 0007 · 2026-09-08T09:05:52.100Z · ROUTE_SELECTED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:route`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Governed qualification route selected**

> private-inference / default account / gemma4-e4b-pixel @ pixel. Route purpose QUALIFICATION; qualification evidence physical-qualification-pending; initial route fallback no. A qualification-purpose selection does not grant production routing admission.

### 0008 · 2026-09-08T09:05:52.100Z · PROVIDER_REQUEST

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:provider-request`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Read-only structured review requested**

> You are performing a governed, read-only repository review. Input used 1 frozen context chunk(s). Credentials, environment values, hidden reasoning, and raw prompt payloads are not retained in this human-readable projection.

### 0009 · 2026-09-08T09:05:52.183Z · JOB_RUNNING

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:transition:2026-09-08T09:05:52.183Z:RUNNING`
- Actor: SYSTEM EVENT
- Outcome: `RUNNING`

**Provider execution started**

> The selected provider is executing the read-only structured review.

### 0010 · 2026-09-08T09:05:52.193Z · WORK_PARCEL_CREATED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:created`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Work Parcel parcel-af875ec0-f564-4e63-b749-1caf1693b8ae created**

> Objective: Review frozen 2992e79e84cf75dfa02a52e9dc318cf1d964e8cb context chunk context-1-1fd21d023f12
> Planner: deterministic — Repository Job deterministically decomposed frozen context
> Execution owner: direct-repository-review-executor
> Current durable status at transcript projection: FAILED

### 0011 · 2026-09-08T09:05:52.193Z · PROVENANCE_JOB-RUN

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.193Z:job-run:13`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: job-run**

> 685c2763-c618-4698-917d-c6ae935cfbaa

- Evidence: `685c2763-c618-4698-917d-c6ae935cfbaa`

### 0012 · 2026-09-08T09:05:52.193Z · PROVENANCE_REQUEST-ORIGIN

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.193Z:request-origin:14`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: request-origin**

> dashboard:7e08f4384cbec07bc3534a12115a169f9c300088c70484cddd768b5d33dd5437

- Evidence: `dashboard:7e08f4384cbec07bc3534a12115a169f9c300088c70484cddd768b5d33dd5437`

### 0013 · 2026-09-08T09:05:52.193Z · PROVENANCE_EXECUTION-MODE

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.193Z:execution-mode:15`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: execution-mode**

> LIVE

- Evidence: `LIVE`

### 0014 · 2026-09-08T09:05:52.193Z · PROVENANCE_REVIEWED-SHA

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.193Z:reviewed-sha:16`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: reviewed-sha**

> 2992e79e84cf75dfa02a52e9dc318cf1d964e8cb

- Evidence: `2992e79e84cf75dfa02a52e9dc318cf1d964e8cb`

### 0015 · 2026-09-08T09:05:52.193Z · PROVENANCE_EXECUTION-LOCALITY

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.193Z:execution-locality:17`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: execution-locality**

> workload=controller;provider=pixel;credential=none

- Evidence: `workload=controller;provider=pixel;credential=none`

### 0016 · 2026-09-08T09:05:52.193Z · PARCEL_TASK_RECEIVED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:audit-f9838649-5e38-4090-be79-89b834ece7a0`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Frozen review chunk received**

> context-1-1fd21d023f12

### 0017 · 2026-09-08T09:05:52.193Z · PARCEL_ROUTE_RESOLVED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:audit-8ddfa3c1-1ab5-4561-b763-f899abd26a9f`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**private-inference/default/gemma4-e4b-pixel@pixel**

> Qualification physical-qualification-pending; fallback false; purpose QUALIFICATION

### 0018 · 2026-09-08T09:05:52.198Z · PROVENANCE_RETRIEVAL_FALLBACK

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:05:52.198Z:retrieval.fallback:18`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: retrieval.fallback**

> frozen-context

- Evidence: `frozen-context`

### 0019 · 2026-09-08T09:05:52.198Z · PARCEL_READINESS_CHECKED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:audit-745f82c2-aff4-42d9-b66f-8966369774b5`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Governed retrieval unavailable; controlled frozen context retained**

> retrieval_disabled

### 0020 · 2026-09-08T09:05:52.204Z · PARCEL_INVOCATION_STARTED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:audit-d14ef2ca-30a8-40c3-9778-cadd19ef76f5`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**private-inference/default/gemma4-e4b-pixel@pixel provider invocation started**

> Thread repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1:context-1-1fd21d023f12; frozen context context-1-1fd21d023f12; structured schema agent-control.repository-review/v1; invocation profile provider-default

### 0021 · 2026-09-08T09:05:52.211Z · TELEMETRY_STARTED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:telemetry:repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1:context-1-1fd21d023f12:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 4,096 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0022 · 2026-09-08T09:05:52.228Z · GOVERNOR_DECISION

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:governor:token-route:4da175f4-1adc-4a71-8cbd-5d23ee02a860`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:4da175f4-1adc-4a71-8cbd-5d23ee02a860`

### 0023 · 2026-09-08T09:05:52.235Z · TELEMETRY_SAMPLE

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:telemetry:repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1:context-1-1fd21d023f12:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live telemetry sample 2**

> Latest sample: current context unavailable (provider_did_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 4,096 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0024 · 2026-09-08T09:09:52.107Z · PROVENANCE_PROVIDER-INVOCATION-FAILED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:09:52.107Z:provider-invocation-failed:19`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: provider-invocation-failed**

> execution-failed:execution_failed_without_safe_recovery_classification

- Evidence: `execution-failed:execution_failed_without_safe_recovery_classification`

### 0025 · 2026-09-08T09:09:52.107Z · PARCEL_INVOCATION_FAILED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:audit-538c5e74-6b3c-4475-96ca-72cff6b69d24`
- Actor: AGENT / PROVIDER
- Outcome: `FAILED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**private-inference/default/gemma4-e4b-pixel@pixel provider invocation failed**

> Classification execution-failed; execution_failed_without_safe_recovery_classification; transport failure is not model-quality evidence

### 0026 · 2026-09-08T09:09:52.108Z · TELEMETRY_SAMPLE

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:telemetry:repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1:context-1-1fd21d023f12:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Live telemetry sample 3**

> Latest sample: current context unavailable (provider_failed_before_complete_usage). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 4,096 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0027 · 2026-09-08T09:09:52.132Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:invocation:provider-failure:a766ff8e-a55c-4489-a0ab-94b6e2177c18`
- Actor: AGENT / PROVIDER
- Outcome: `FAILED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**private-inference/gemma4-e4b-pixel invocation accounted**

> Outcome provider-failed:execution-failed; verifier not-applicable-transport-failure; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority unavailable; elapsed 239,869 ms. Lifetime usage unavailable input (unavailable fresh + unavailable cached + unavailable cache write), unavailable output, unavailable reasoning, unavailable total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `provider-failure:a766ff8e-a55c-4489-a0ab-94b6e2177c18`

### 0028 · 2026-09-08T09:09:52.132Z · PROVENANCE_PROVIDER-ATTEMPT-ACCOUNTING

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:09:52.132Z:provider-attempt-accounting:20`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: provider-attempt-accounting**

> provider-failure:a766ff8e-a55c-4489-a0ab-94b6e2177c18:usage-unavailable

- Evidence: `provider-failure:a766ff8e-a55c-4489-a0ab-94b6e2177c18:usage-unavailable`

### 0029 · 2026-09-08T09:09:52.142Z · STAGE_FAILED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:stage:review`
- Actor: ERROR
- Outcome: `FAILED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Review context-1-1fd21d023f12: FAILED**

> Job repository-code-review@1. Dependencies: none. Required capabilities: repository-review. Requested route: provider policy-selected; account policy-selected; model gemma4-e4b-pixel; role review.default; fallback disabled; purpose QUALIFICATION. Actual route: provider private-inference; account default; model gemma4-e4b-pixel; workload node controller; execution node pixel. Error: provider_cancelled.

### 0030 · 2026-09-08T09:09:52.142Z · PROVENANCE_FAILED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:parcel:parcel-af875ec0-f564-4e63-b749-1caf1693b8ae:provenance:2026-09-08T09:09:52.142Z:failed:21`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

**Provenance: failed**

> provider_cancelled

- Evidence: `provider_cancelled`

### 0031 · 2026-09-08T09:09:52.154Z · JOB_DISCONNECTED

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:transition:2026-09-08T09:09:52.154Z:DISCONNECTED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**DISCONNECTED**

> timeout cleanup unproven

### 0032 · 2026-09-08T09:09:52.154Z · PROVIDER_EXECUTION_UNKNOWN

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:execution:repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: private-inference / default account / gemma4-e4b-pixel @ pixel
- Provider/model: private-inference / default account / gemma4-e4b-pixel

**Route-bound provider attempt 1: UNKNOWN**

> Execution repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1; started 2026-09-08T09:05:52.188Z; workload node controller; provider execution node pixel; credential node provider default; active turn not reported.

- Evidence: `repository-review:685c2763-c618-4698-917d-c6ae935cfbaa:1`

### 0033 · 2026-09-08T09:09:52.154Z · RUN_ERROR

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:error:0`
- Actor: ERROR
- Outcome: `FAILED`

**Recorded run error 1**

> job_timeout_budget_exceeded:execution_state_unproven

### 0034 · 2026-09-08T09:09:52.154Z · LEDGER_RECONCILIATION

- Event ID: `685c2763-c618-4698-917d-c6ae935cfbaa:ledger`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`

**Accounting reconciliation incomplete**

> Job ledger: unavailable input; fresh/cache split unavailable + unavailable output = unavailable total; unavailable. Work Parcel ledger: unavailable reported/fresh input; cached-input component unavailable + unavailable output = unavailable total; unavailable. Accounted invocations 1; invocations with unavailable token usage 1. Agent Control does not manufacture exact aggregate usage when any dispatched attempt lacks authoritative usage.

- Evidence: `parcel-af875ec0-f564-4e63-b749-1caf1693b8ae`

## Integrity and scope

- Entries: 34
- Ordering: timestamp, then deterministic source-projection sequence; durable event identifiers are shown for traceability.
- Authority: Job Run state, Work Parcel audit/provenance, model invocation ledger, token/governor lifecycle, and sealed baton records.
- Deliberately excluded: credential values, authentication material, raw rejected provider payloads, and hidden/private model reasoning.
- The adjacent JSON manifest records the SHA-256 of this complete Markdown document and its deterministic source projection.

