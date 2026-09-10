# Agent Control Natural Execution Transcript

> Product-generated during execution from authoritative durable records. This is not an after-the-fact narrative and excludes credentials, raw provider transport payloads, and private chain-of-thought.

## Origin

- Channel: `poe/dashboard`
- Modality: `dashboard`
- Received: `2026-09-10T19:14:31.630Z`
- Authentication: `dashboard-bearer`
- Governed actor: `web-operator`
- Authority: `conversation:poe-conversation:0611f95b-94b8-4644-b21b-f3d8e75a6b5c`, `operation:af17dfe262acbc47741807a5a26c4572018b998569fcda83a6d525f769d25d4e`, `approved-sha256:275419021d703ecacb1190c57841a3aff383ec6e2e1d8533ed6ddcaa0dc744c2`
- Identity reference: `e5080846bd37ef302d36dbc1faaf87772f59a2f7ad370016bd035bc2affacf82`
- Message/audio reference: `af17dfe262acbc47741807a5a26c4572018b998569fcda83a6d525f769d25d4e`

## Authoritative initiating request

> Run the token-aware repository review. Have Luna inspect the frozen reservation-service repository first. If the independent quality gate finds unresolved root causes, create a sealed baton and escalate the unfinished analysis to Sol. Show the model transition, baton contents, verification, and token totals.

- Schema: `agent-control.execution-transcript/v1`
- Job Run: `dac71e0b-333c-4b39-b8aa-71655f25e455`
- Saved Job: `crew-wopr-quality-review`
- Job: Crew/WOPR quality-escalation review
- Status: `FAILED`
- Execution mode: `LIVE` — live/real execution
- Work Parcels: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Source retention: complete-durable; uncapped=yes

## Chronological execution record

### 0001 · 2026-09-10T19:14:32.576Z · JOB_REQUEST

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:requested`
- Actor: OPERATOR
- Outcome: `INFO`

**Crew/WOPR quality-escalation review requested**

> Review a frozen Git revision and produce evidence-backed, validated findings. Scope full; requested ref d289f66c13a48f6eebbaae6af99ec7c5edd75b91.

### 0002 · 2026-09-10T19:14:32.576Z · OPERATOR_OBJECTIVE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:operator-objective`
- Actor: OPERATOR
- Outcome: `INFO`

**Exact governed review instruction**

> You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.

### 0003 · 2026-09-10T19:14:32.576Z · JOB_QUEUED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:transition:2026-09-10T19:14:32.576Z:QUEUED`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Job queued**

> Awaiting the governed scheduler.

### 0004 · 2026-09-10T19:14:32.586Z · JOB_RESOLVING

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:transition:2026-09-10T19:14:32.586Z:RESOLVING`
- Actor: SYSTEM EVENT
- Outcome: `INFO`

**Resolving immutable target and route**

> Resolving the immutable repository revision, execution node, provider route, and bounded context.

### 0005 · 2026-09-10T19:14:32.586Z · REPOSITORY_SNAPSHOT

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:repository`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**Immutable repository revision resolved**

> reservation-service-fixture at d289f66c13a48f6eebbaae6af99ec7c5edd75b91; requested ref d289f66c13a48f6eebbaae6af99ec7c5edd75b91; snapshot clean.

- Evidence: `d289f66c13a48f6eebbaae6af99ec7c5edd75b91`

### 0006 · 2026-09-10T19:14:32.586Z · CONTEXT_COMPILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:context`
- Actor: TOOL / ACTION
- Outcome: `SUCCEEDED`

**THIN review context compiled**

> 1 bounded chunk(s), 8 file(s), 0 omitted file(s). Provider input is represented by the governed instruction and frozen context manifest; raw repository context is not duplicated into transcript storage.

- Evidence: `240aabbf5df25e8d82eaf3d74bfdf91c0d891cce70b69dc094bb9eb2e4b5cf67`

### 0007 · 2026-09-10T19:14:32.586Z · ROUTE_SELECTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:route`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governed provider route selected**

> codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller. Route purpose EXECUTION; qualification evidence controller-account-a-codex-v1; initial route fallback no.

### 0008 · 2026-09-10T19:14:32.586Z · PROVIDER_REQUEST

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:provider-request`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Read-only structured review requested**

> You are performing a governed, read-only repository review. Input used 1 frozen context chunk(s). Credentials, environment values, hidden reasoning, and raw prompt payloads are not retained in this human-readable projection.

### 0009 · 2026-09-10T19:14:32.674Z · JOB_RUNNING

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:transition:2026-09-10T19:14:32.674Z:RUNNING`
- Actor: SYSTEM EVENT
- Outcome: `RUNNING`

**Provider execution started**

> The selected provider is executing the read-only structured review.

### 0010 · 2026-09-10T19:14:32.690Z · WORK_PARCEL_CREATED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:created`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Work Parcel parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69 created**

> Objective: Review frozen d289f66c13a48f6eebbaae6af99ec7c5edd75b91 context chunk context-1-240aabbf5df2
> Planner: deterministic — Repository Job deterministically decomposed frozen context
> Execution owner: direct-repository-review-executor
> Current durable status at transcript projection: FAILED

### 0011 · 2026-09-10T19:14:32.690Z · PROVENANCE_JOB-RUN

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:job-run:15`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: job-run**

> dac71e0b-333c-4b39-b8aa-71655f25e455

- Evidence: `dac71e0b-333c-4b39-b8aa-71655f25e455`

### 0012 · 2026-09-10T19:14:32.690Z · PROVENANCE_REQUEST-ORIGIN

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:request-origin:16`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: request-origin**

> poe/dashboard:af17dfe262acbc47741807a5a26c4572018b998569fcda83a6d525f769d25d4e

- Evidence: `poe/dashboard:af17dfe262acbc47741807a5a26c4572018b998569fcda83a6d525f769d25d4e`

### 0013 · 2026-09-10T19:14:32.690Z · PROVENANCE_EXECUTION-MODE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:execution-mode:17`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: execution-mode**

> LIVE

- Evidence: `LIVE`

### 0014 · 2026-09-10T19:14:32.690Z · PROVENANCE_REVIEWED-SHA

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:reviewed-sha:18`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: reviewed-sha**

> d289f66c13a48f6eebbaae6af99ec7c5edd75b91

- Evidence: `d289f66c13a48f6eebbaae6af99ec7c5edd75b91`

### 0015 · 2026-09-10T19:14:32.690Z · PROVENANCE_EXECUTION-LOCALITY

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:execution-locality:19`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: execution-locality**

> workload=controller;provider=controller;credential=controller

- Evidence: `workload=controller;provider=controller;credential=controller`

### 0016 · 2026-09-10T19:14:32.690Z · PROVENANCE_TRANSPORT-CONTEXT

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.690Z:transport-context:20`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: transport-context**

> bdfeca85da9903ea4b2240e5e1f213c9708bff397671c7d86324bcf710367e72

- Evidence: `bdfeca85da9903ea4b2240e5e1f213c9708bff397671c7d86324bcf710367e72`

### 0017 · 2026-09-10T19:14:32.690Z · PARCEL_TASK_RECEIVED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-8f1ffc50-490d-4a8b-a7c3-bcfdc8f8d1b6`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Frozen review chunk received**

> context-1-240aabbf5df2

### 0018 · 2026-09-10T19:14:32.690Z · PARCEL_ROUTE_RESOLVED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-4064b050-13bb-4f54-8c84-49a3d20df03a`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**codex-chatgpt/Controller Account A/codex-luna-controller-a@controller**

> Qualification controller-account-a-codex-v1; fallback false; purpose EXECUTION

### 0019 · 2026-09-10T19:14:32.690Z · PARCEL_TRANSPORT_CONTEXT_BOUND

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-907ba053-e233-4355-9168-f1eff92dfa3d`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Transport Context Contract bound to Work Parcel**

> bdfeca85da9903ea4b2240e5e1f213c9708bff397671c7d86324bcf710367e72 · COMPLETE

### 0020 · 2026-09-10T19:14:32.714Z · PROVENANCE_RETRIEVAL_FALLBACK

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:14:32.714Z:retrieval.fallback:21`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: retrieval.fallback**

> frozen-context

- Evidence: `frozen-context`

### 0021 · 2026-09-10T19:14:32.714Z · PARCEL_READINESS_CHECKED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-5bd1b170-6766-4c87-9d3d-29a6d998455d`
- Actor: TOOL / ACTION
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Governed retrieval unavailable; controlled frozen context retained**

> retrieval_disabled

### 0022 · 2026-09-10T19:14:32.721Z · PARCEL_INVOCATION_STARTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-b0887e0d-309a-4319-85b6-8e3719cd4c81`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**codex-chatgpt/Controller Account A/codex-luna-controller-a@controller provider invocation started**

> Thread repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2; frozen context context-1-240aabbf5df2; structured schema agent-control.repository-review/v1; invocation profile provider-default

### 0023 · 2026-09-10T19:14:32.727Z · TELEMETRY_STARTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0024 · 2026-09-10T19:14:32.746Z · GOVERNOR_DECISION

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:governor:token-route:887d8f48-8294-4b4b-b38d-35994851d9a9`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:887d8f48-8294-4b4b-b38d-35994851d9a9`

### 0025 · 2026-09-10T19:14:32.752Z · TELEMETRY_SAMPLE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live telemetry sample 2**

> Latest sample: current context unavailable (codex_jsonl_does_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0026 · 2026-09-10T19:15:05.901Z · TELEMETRY_SAMPLE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Live telemetry sample 3**

> Latest sample: current context unavailable (codex_exec_turn_usage_is_not_current_context). Lifetime usage: 12,012 input (12,012 fresh + 0 cached), 1,643 output, 13,655 total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: 12,012 input (12,012 fresh + 0 cached), 1,643 output, 13,655 total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0027 · 2026-09-10T19:15:06.173Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:invocation:sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**codex-chatgpt/codex-luna-controller-a invocation accounted**

> Outcome completed; verifier pending-repository-validation; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority authoritative; elapsed 33,420 ms. Lifetime usage 12,012 input (12,012 fresh + 0 cached + unavailable cache write), 1,643 output, unavailable reasoning, 13,655 total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`

### 0028 · 2026-09-10T19:15:06.173Z · PROVENANCE_PROVIDER-RESPONSE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:06.173Z:provider-response:22`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: provider-response**

> sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c

- Evidence: `sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`

### 0029 · 2026-09-10T19:15:06.173Z · PARCEL_INVOCATION_COMPLETED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-c0aa6fd9-fefe-4430-9091-0d6b40d702d6`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**codex-chatgpt/Controller Account A/codex-luna-controller-a@controller returned structured review output**

> Response sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c; finish completed

### 0030 · 2026-09-10T19:15:06.182Z · PROVENANCE_QUALITY-GATE-FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:06.182Z:quality-gate-failed:23`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: quality-gate-failed**

> reservation-cache-root-cause-v1:sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c

- Evidence: `reservation-cache-root-cause-v1:sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`

### 0031 · 2026-09-10T19:15:06.182Z · PARCEL_VERIFICATION_COMPLETED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-185e555a-81f0-4600-8548-a5972359377c`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Independent quality gate rejected codex-chatgpt/codex-luna-controller-a**

> reservation-cache-root-cause-v1; Schema-valid review did not satisfy 1 acceptance-level root-cause criterion.; evidence fixture:test/acceptance.test.mjs, fixture:README.md, provider-response:sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c; unresolved In suggestedRemediation, name issuedAtSeconds, maxAgeSeconds and nowMs and state their dimensionally valid normalization before the strict expiry comparison.

### 0032 · 2026-09-10T19:15:06.188Z · HANDOFF_REQUESTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:governor:token-route:7a340488-24d7-43e8-ac96-9ee32838db13`
- Actor: GOVERNOR
- Outcome: `RECOMMENDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governed handoff requested**

> State CONTINUE; action BATON_AND_HANDOFF; outcome RECORDED; reason quality_gate_failed_governed_fallback_selected:reservation-cache-root-cause-v1. A request is not proof of dispatch, acceptance, destination execution, or completion.

- Evidence: `token-route:7a340488-24d7-43e8-ac96-9ee32838db13`

### 0033 · 2026-09-10T19:15:06.193Z · BATON_CREATED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:baton:token-baton:1874aeea-1d93-4bfe-8818-714e705438c6`
- Actor: BATON
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Verified baton created and sealed**

> Objective: You are performing a governed, read-only repository review.
> Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification.
> Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.
> Frozen repository: reservation-service-fixture at d289f66c13a48f6eebbaae6af99ec7c5edd75b91. Next action: Using the same frozen repository, original objective and unresolved acceptance criteria in this baton, complete only the missing root-cause analysis and return a schema-valid read-only repository review.. SHA-256 638e9f0cdd68b9d7302b83e357a8addbc39275c65e1fabc57e0ccf13a72865d8. Creation does not by itself mean dispatch, acceptance, destination execution, or completed handoff.

- Evidence: `token-baton:1874aeea-1d93-4bfe-8818-714e705438c6`, `638e9f0cdd68b9d7302b83e357a8addbc39275c65e1fabc57e0ccf13a72865d8`

### 0034 · 2026-09-10T19:15:06.202Z · HANDOFF_REQUESTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:governor:token-route:3a7c7869-a03b-47ff-90d7-caedd20b062f`
- Actor: GOVERNOR
- Outcome: `RECOMMENDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governed handoff requested**

> State CONTINUE; action BATON_AND_HANDOFF; outcome RECORDED; reason verified_baton_ready_for_explicit_handoff. A request is not proof of dispatch, acceptance, destination execution, or completion.

- Evidence: `token-route:3a7c7869-a03b-47ff-90d7-caedd20b062f`, `token-baton:1874aeea-1d93-4bfe-8818-714e705438c6`

### 0035 · 2026-09-10T19:15:06.209Z · PARCEL_INVOCATION_STARTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-a2f6c4b8-c5ed-4020-9b49-1676c246ce1a`
- Actor: AGENT / PROVIDER
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**codex-chatgpt/Controller Account A/codex-sol-controller-a@controller provider invocation started**

> Thread repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:quality:codex-sol-controller-a; frozen context context-1-240aabbf5df2; structured schema agent-control.repository-review/v1; invocation profile provider-default; continuation baton token-baton:1874aeea-1d93-4bfe-8818-714e705438c6

### 0036 · 2026-09-10T19:15:06.215Z · TELEMETRY_STARTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:quality:codex-sol-controller-a:0`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-sol-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-sol-controller-a

**Live token measurement pending provider completion**

> Initial sample: current context unavailable (provider_not_yet_reported). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0037 · 2026-09-10T19:15:06.220Z · GOVERNOR_DECISION

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:governor:token-route:c0a5a3a5-fa3e-49e8-95ed-37fd6c43b514`
- Actor: GOVERNOR
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-sol-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-sol-controller-a

**Governor CONTINUE: CONTINUE**

> State CONTINUE; action CONTINUE; outcome RECORDED; reason current_context_unavailable.

- Evidence: `token-route:c0a5a3a5-fa3e-49e8-95ed-37fd6c43b514`

### 0038 · 2026-09-10T19:15:06.225Z · TELEMETRY_SAMPLE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:quality:codex-sol-controller-a:1`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-sol-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-sol-controller-a

**Live telemetry sample 2**

> Latest sample: current context unavailable (codex_jsonl_does_not_report_current_context). Lifetime usage: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: unavailable input (unavailable fresh + unavailable cached), unavailable output, unavailable total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0039 · 2026-09-10T19:15:44.436Z · TELEMETRY_SAMPLE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:telemetry:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2:quality:codex-sol-controller-a:2`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-sol-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-sol-controller-a

**Live telemetry sample 3**

> Latest sample: current context unavailable (codex_exec_turn_usage_is_not_current_context). Lifetime usage: 9,684 input (9,684 fresh + 0 cached), 1,804 output, 11,488 total. Cached input remains part of total input and is not subtracted from context occupancy. Cost unavailable (unavailable). Governor CONTINUE.

- Telemetry:
  - Current context: unavailable / 272,000 tokens; percentage unavailable; unavailable.
  - Lifetime: 9,684 input (9,684 fresh + 0 cached), 1,804 output, 11,488 total.
  - Cost: unavailable; unavailable.
  - Governor: CONTINUE.

### 0040 · 2026-09-10T19:15:44.722Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:invocation:sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-sol-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-sol-controller-a

**codex-chatgpt/codex-sol-controller-a invocation accounted**

> Outcome completed; verifier pending-repository-validation; harness profile THIN; provider invocation profile provider-default; request dispatched yes; usage authority authoritative; elapsed 38,497 ms. Lifetime usage 9,684 input (9,684 fresh + 0 cached + unavailable cache write), 1,804 output, unavailable reasoning, 11,488 total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`

### 0041 · 2026-09-10T19:15:44.722Z · PROVENANCE_PROVIDER-RESPONSE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.722Z:provider-response:24`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: provider-response**

> sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55

- Evidence: `sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`

### 0042 · 2026-09-10T19:15:44.722Z · PARCEL_INVOCATION_COMPLETED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-95cc489a-3513-4fdd-a85e-14fbedbc3099`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**codex-chatgpt/Controller Account A/codex-sol-controller-a@controller returned structured review output**

> Response sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55; finish completed

### 0043 · 2026-09-10T19:15:44.734Z · PROVENANCE_QUALITY-GATE-FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.734Z:quality-gate-failed:25`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: quality-gate-failed**

> reservation-cache-root-cause-v1:sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55

- Evidence: `reservation-cache-root-cause-v1:sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`

### 0044 · 2026-09-10T19:15:44.734Z · PARCEL_VERIFICATION_COMPLETED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-0303eb77-38a2-488a-b565-ab4059e6197b`
- Actor: SYSTEM EVENT
- Outcome: `SUCCEEDED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Independent quality gate rejected codex-chatgpt/codex-sol-controller-a**

> reservation-cache-root-cause-v1; Schema-valid review did not satisfy 1 acceptance-level root-cause criterion.; evidence fixture:test/acceptance.test.mjs, fixture:README.md, provider-response:sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55; unresolved In suggestedRemediation, name issuedAtSeconds, maxAgeSeconds and nowMs and state their dimensionally valid normalization before the strict expiry comparison.

### 0045 · 2026-09-10T19:15:44.740Z · HANDOFF_FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:governor:token-route:d213a471-976c-4e3e-9450-4ecc53554533`
- Actor: GOVERNOR
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Governed handoff failed; source remains recoverable**

> State CONTINUE; action CONTINUE; outcome FAILED; reason handoff_failed_resume_original_thread:repository_review_quality_gate_failed_after_escalation:reservation-cache-root-cause-v1. The handoff is not marked complete and the source thread remains recoverable.

- Evidence: `token-route:d213a471-976c-4e3e-9450-4ecc53554533`, `token-baton:1874aeea-1d93-4bfe-8818-714e705438c6`

### 0046 · 2026-09-10T19:15:44.749Z · PROVENANCE_QUALITY-ESCALATION-RECOVERY

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.749Z:quality-escalation-recovery:26`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: quality-escalation-recovery**

> repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2

- Evidence: `repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1:context-1-240aabbf5df2`

### 0047 · 2026-09-10T19:15:44.749Z · PARCEL_ROUTE_CHANGED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:audit-7d0f02e9-b5c2-435e-bc0e-aceb72805cea`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Quality escalation failed closed; original provider thread remains recoverable**

> handoff_failed_resume_original_thread:repository_review_quality_gate_failed_after_escalation:reservation-cache-root-cause-v1

### 0048 · 2026-09-10T19:15:44.756Z · MODEL_INVOCATION_ACCOUNTED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:invocation:provider-failure:610e13c2-9bcc-4e32-a475-e763de5a35ff`
- Actor: AGENT / PROVIDER
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Route: codex-chatgpt / Controller Account A / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**codex-chatgpt/codex-luna-controller-a invocation accounted**

> Outcome provider-failed:execution-failed; verifier not-applicable-transport-failure; harness profile THIN; provider invocation profile provider-default; request dispatched unavailable; usage authority unavailable; elapsed unavailable ms. Lifetime usage unavailable input (unavailable fresh + unavailable cached + unavailable cache write), unavailable output, unavailable reasoning, unavailable total. Provider cost unavailable; calculated cost unavailable; selected basis unavailable.

- Evidence: `provider-failure:610e13c2-9bcc-4e32-a475-e763de5a35ff`

### 0049 · 2026-09-10T19:15:44.756Z · PROVENANCE_PROVIDER-ATTEMPT-ACCOUNTING

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.756Z:provider-attempt-accounting:27`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: provider-attempt-accounting**

> provider-failure:610e13c2-9bcc-4e32-a475-e763de5a35ff:usage-unavailable

- Evidence: `provider-failure:610e13c2-9bcc-4e32-a475-e763de5a35ff:usage-unavailable`

### 0050 · 2026-09-10T19:15:44.766Z · STAGE_FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:stage:review`
- Actor: ERROR
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Review context-1-240aabbf5df2: FAILED**

> Job repository-code-review@1. Dependencies: none. Required capabilities: repository-review. Requested route: provider policy-selected; account cottage-plus; model codex-luna-controller-a; role review.default; fallback allowed; purpose EXECUTION. Actual route: provider codex-chatgpt; account Controller Account A; model codex-luna-controller-a; workload node controller; execution node controller. Error: repository_review_quality_escalation_failed:reservation-cache-root-cause-v1.

### 0051 · 2026-09-10T19:15:44.766Z · PROVENANCE_FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.766Z:failed:28`
- Actor: SYSTEM EVENT
- Outcome: `FAILED`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: failed**

> repository_review_quality_escalation_failed:reservation-cache-root-cause-v1

- Evidence: `repository_review_quality_escalation_failed:reservation-cache-root-cause-v1`

### 0052 · 2026-09-10T19:15:44.775Z · PROVENANCE_ADAPTIVE-OUTCOME

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:parcel:parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69:provenance:2026-09-10T19:15:44.775Z:adaptive-outcome:29`
- Actor: SYSTEM EVENT
- Outcome: `INFO`
- Work Parcel: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

**Provenance: adaptive-outcome**

> provider-failure:provider invocation failed

- Evidence: `provider-failure:provider invocation failed`

### 0053 · 2026-09-10T19:15:44.783Z · PROVIDER_EXECUTION_FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:execution:repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1`
- Actor: ERROR
- Outcome: `FAILED`
- Route: codex-chatgpt / cottage-plus / codex-luna-controller-a @ controller
- Provider/model: codex-chatgpt / default account / codex-luna-controller-a

**Route-bound provider attempt 1: FAILED**

> Execution repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1; started 2026-09-10T19:14:32.682Z; workload node controller; provider execution node controller; credential node controller; active turn not reported.

- Evidence: `repository-review:dac71e0b-333c-4b39-b8aa-71655f25e455:1`

### 0054 · 2026-09-10T19:15:44.792Z · JOB_FAILED

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:transition:2026-09-10T19:15:44.792Z:FAILED`
- Actor: ERROR
- Outcome: `FAILED`

**Job failed closed**

> execution failed without safe recovery classification

### 0055 · 2026-09-10T19:15:44.792Z · RUN_ERROR

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:error:0`
- Actor: ERROR
- Outcome: `FAILED`

**Recorded run error 1**

> execution_failed_without_safe_recovery_classification

### 0056 · 2026-09-10T19:15:44.792Z · PROVIDER_RESPONSE

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:provider-response`
- Actor: AGENT / PROVIDER
- Outcome: `SUCCEEDED`
- Provider/model: codex-chatgpt / Controller Account A / codex-luna-controller-a

**Provider output recorded**

> Provider response evidence was retained by hash; no validated human-readable result is available.

- Evidence: `sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`, `sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`, `provider_response_sha256:bf54e8932fd81b27129bdd9bca7a1778beb4b8ff1aea3472e040e966f2716a6c`, `provider_response_sha256:dec1a519c49491af235b3bd4781c86c722b12a3a5122fd7db974d8cddd95bb55`

### 0057 · 2026-09-10T19:15:44.792Z · LEDGER_RECONCILIATION

- Event ID: `dac71e0b-333c-4b39-b8aa-71655f25e455:ledger`
- Actor: SYSTEM EVENT
- Outcome: `UNAVAILABLE`

**Accounting reconciliation incomplete**

> Job ledger: unavailable input; fresh/cache split unavailable + unavailable output = unavailable total; unavailable. Work Parcel ledger: unavailable reported/fresh input; cached-input component unavailable + unavailable output = unavailable total; unavailable. Accounted invocations 3; invocations with unavailable token usage 1. Agent Control does not manufacture exact aggregate usage when any dispatched attempt lacks authoritative usage.

- Evidence: `parcel-f9e6f6ec-b0fa-4aa4-9b41-83101db2ef69`

## Integrity and scope

- Entries: 57
- Ordering: timestamp, then deterministic source-projection sequence; durable event identifiers are shown for traceability.
- Authority: Job Run state, Work Parcel audit/provenance, model invocation ledger, token/governor lifecycle, and sealed baton records.
- Deliberately excluded: credential values, authentication material, raw rejected provider payloads, and hidden/private model reasoning.
- The adjacent JSON manifest records the SHA-256 of this complete Markdown document and its deterministic source projection.

