# Agent Control 4.3 physical qualification

Generated: 2026-09-09T17:23:27.378Z

## Verdict

- WARM-EXPERT DELEGATION: **PROVEN**
- CACHE REUSE: **PROVEN**
- ROUTING BENEFIT: **MEASURED**
- PERFORMANCE BENEFIT: **MEASURED**
- MONETARY SAVING: **UNAVAILABLE**

The cold first invocation reported 0 reused / 1328 processed tokens. The compatible follow-on reported 1327 reused / 1 processed tokens and 65.32× lower prompt-processing time. Agent Control changed the declared route only after the Warm Expert supplied a verified HOT/HIGH cache score. The incompatible control applied no warm bonus. Material context and backend-process changes invalidated or isolated prior warmth. Every stage, provider invocation and independent routing decision passed verification.

MONETARY SAVING UNAVAILABLE because this local backend supplies no authoritative pricing or billing data.

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

## Source and media

- Branch: feature/4.3-cache-aware-expert-delegation
- HEAD: bfec20317361fd20f886bba5a1b752d570fc2cbe
- Repository archive SHA-256: ed686e0a42dcbb9fb4ca7c6f04734105a0e36d16776968d7ced3a22afb310546
- Video: /fast/qualification/agent-control-cache-aware-experts-20260909/agent-control-4.3-cache-aware-expert-qualification.mp4
- Video SHA-256: da447b27b2c0518797e413b0a5cec854522336e5294c82248e1d6655ac9eb124
- Video: 1920×1080, 30fps, 308.6s

## Controlled gate assertions

- allParcelsSucceeded: PASS
- everyStageSucceeded: PASS
- everyInvocationIndependentlyVerified: PASS
- everyRoutingDecisionVerified: PASS
- coldPopulationAuthoritative: PASS
- warmExpertChangedRoute: PASS
- warmExpertBeatColdCandidate: PASS
- warmReuseAuthoritative: PASS
- incompatibleRouteRejected: PASS
- materialContextInvalidated: PASS
- restartedBackendUnknown: PASS
- restartSelectedCold: PASS
- oldWarmDoesNotMatchNew: PASS
- monetarySavingUnavailable: PASS

## Routing decisions

### f-backend-restart — cache-decision-74f6058a-51cf-446d-9138-2b638f207127

- Parcel: parcel-9fb2bd53-0b69-4e58-b488-85229df2ee55
- Selected: local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification#3729246
- Warm Expert ID: none
- Changed declared route: false
- Decision verifier: PASS
- Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.

| Candidate | Eligible | Cache state | Compatibility | Authority | Base | Cache | Load | Total | Reasons |
|---|---|---|---|---|---:|---:|---:|---:|---|
| local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification#3729246 | true | HOT | INCOMPATIBLE | AUTHORITATIVE | 1.000000 | 0.000000 | 0.000000 | 1.000000 | cache-compatibility-incompatible; worker-load-0pct |
| local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3734206 | true | CACHE STATE UNKNOWN | UNKNOWN | UNAVAILABLE | 0.950000 | 0.000000 | 0.000000 | 0.950000 | cache-evidence-unavailable; worker-load-0pct |

```text
# Cache-Aware Expert Routing Transcript

Work Parcel: parcel-9fb2bd53-0b69-4e58-b488-85229df2ee55
Stage: f-backend-restart
Decision: cache-decision-74f6058a-51cf-446d-9138-2b638f207127
Recorded: 2026-09-09T17:17:14.776Z

## What Agent Control considered

- local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification: governed eligible; cache HOT/INCOMPATIBLE; evidence AUTHORITATIVE; base 1.0000 + cache 0.0000 - load 0.0000 = 1.0000; current load 0%; expected reuse unavailable; context delta 100% (estimated); cache-compatibility-incompatible, worker-load-0pct.
- local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification: governed eligible; cache CACHE STATE UNKNOWN/UNKNOWN; evidence UNAVAILABLE; base 0.9500 + cache 0.0000 - load 0.0000 = 0.9500; current load 0%; expected reuse unavailable; context delta unavailable; cache-evidence-unavailable, worker-load-0pct.

## Decision

Selected route: local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification
Selection authority: cache-score
Route changed from declared order: no
Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
Independent decision verifier: PASS

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

This transcript records operational facts and routing reasons only. It contains no private model reasoning or raw prompt content.
```

### e-context-invalidation — cache-decision-aed87f1f-4ebe-451f-8ec0-92ca9345dc18

- Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
- Selected: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249
- Warm Expert ID: none
- Changed declared route: false
- Decision verifier: PASS
- Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.

| Candidate | Eligible | Cache state | Compatibility | Authority | Base | Cache | Load | Total | Reasons |
|---|---|---|---|---|---:|---:|---:|---:|---|
| local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249 | true | HOT | INCOMPATIBLE | AUTHORITATIVE | 1.000000 | 0.000000 | 0.000000 | 1.000000 | cache-compatibility-incompatible; worker-load-0pct |

```text
# Cache-Aware Expert Routing Transcript

Work Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
Stage: e-context-invalidation
Decision: cache-decision-aed87f1f-4ebe-451f-8ec0-92ca9345dc18
Recorded: 2026-09-09T17:14:43.800Z

## What Agent Control considered

- local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification: governed eligible; cache HOT/INCOMPATIBLE; evidence AUTHORITATIVE; base 1.0000 + cache 0.0000 - load 0.0000 = 1.0000; current load 0%; expected reuse unavailable; context delta 100% (estimated); cache-compatibility-incompatible, worker-load-0pct.

## Decision

Selected route: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification
Selection authority: cache-score
Route changed from declared order: no
Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
Independent decision verifier: PASS

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

This transcript records operational facts and routing reasons only. It contains no private model reasoning or raw prompt content.
```

### d-incompatible-control — cache-decision-7fbab1c5-537f-4be8-b832-9fcffbc58b24

- Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
- Selected: local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification#3729246
- Warm Expert ID: none
- Changed declared route: false
- Decision verifier: PASS
- Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.

| Candidate | Eligible | Cache state | Compatibility | Authority | Base | Cache | Load | Total | Reasons |
|---|---|---|---|---|---:|---:|---:|---:|---|
| local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification#3729246 | true | CACHE STATE UNKNOWN | UNKNOWN | UNAVAILABLE | 1.000000 | 0.000000 | 0.000000 | 1.000000 | cache-evidence-unavailable; worker-load-0pct |
| local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249 | true | HOT | INCOMPATIBLE | AUTHORITATIVE | 0.950000 | 0.000000 | 0.000000 | 0.950000 | cache-compatibility-incompatible; worker-load-0pct |

```text
# Cache-Aware Expert Routing Transcript

Work Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
Stage: d-incompatible-control
Decision: cache-decision-7fbab1c5-537f-4be8-b832-9fcffbc58b24
Recorded: 2026-09-09T17:14:38.431Z

## What Agent Control considered

- local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification: governed eligible; cache CACHE STATE UNKNOWN/UNKNOWN; evidence UNAVAILABLE; base 1.0000 + cache 0.0000 - load 0.0000 = 1.0000; current load 0%; expected reuse unavailable; context delta unavailable; cache-evidence-unavailable, worker-load-0pct.
- local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification: governed eligible; cache HOT/INCOMPATIBLE; evidence AUTHORITATIVE; base 0.9500 + cache 0.0000 - load 0.0000 = 0.9500; current load 0%; expected reuse unavailable; context delta 100% (estimated); cache-compatibility-incompatible, worker-load-0pct.

## Decision

Selected route: local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification
Selection authority: cache-score
Route changed from declared order: no
Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
Independent decision verifier: PASS

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

This transcript records operational facts and routing reasons only. It contains no private model reasoning or raw prompt content.
```

### b-compatible-follow-on — cache-decision-cf61fb5b-65c4-4917-bc35-3701b89a6b6f

- Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
- Selected: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249
- Warm Expert ID: expert-4cede3b07784fa759989d9a8
- Changed declared route: true
- Decision verifier: PASS
- Reason: Warm Expert preference applied within qualified policy order; Warm Expert HOT/HIGH contributed 0.1051.

| Candidate | Eligible | Cache state | Compatibility | Authority | Base | Cache | Load | Total | Reasons |
|---|---|---|---|---|---:|---:|---:|---:|---|
| local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification#3729246 | true | CACHE STATE UNKNOWN | UNKNOWN | UNAVAILABLE | 1.000000 | 0.000000 | 0.000000 | 1.000000 | cache-evidence-unavailable; worker-load-0pct |
| local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249 | true | HOT | HIGH | AUTHORITATIVE | 0.950000 | 0.105146 | 0.000000 | 1.055146 | warm-expert-high-hot; worker-load-0pct |

```text
# Cache-Aware Expert Routing Transcript

Work Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
Stage: b-compatible-follow-on
Decision: cache-decision-cf61fb5b-65c4-4917-bc35-3701b89a6b6f
Recorded: 2026-09-09T17:14:34.231Z

## What Agent Control considered

- local-cache-cold/default/qwen-cache-cold@controller-cache-expert-qualification: governed eligible; cache CACHE STATE UNKNOWN/UNKNOWN; evidence UNAVAILABLE; base 1.0000 + cache 0.0000 - load 0.0000 = 1.0000; current load 0%; expected reuse unavailable; context delta unavailable; cache-evidence-unavailable, worker-load-0pct.
- local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification: governed eligible; cache HOT/HIGH; evidence AUTHORITATIVE; base 0.9500 + cache 0.1051 - load 0.0000 = 1.0551; current load 0%; expected reuse 93%; context delta 0% (estimated); warm-expert-high-hot, worker-load-0pct.

## Decision

Selected route: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification
Selection authority: cache-score
Route changed from declared order: yes
Reason: Warm Expert preference applied within qualified policy order; Warm Expert HOT/HIGH contributed 0.1051.
Independent decision verifier: PASS

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

This transcript records operational facts and routing reasons only. It contains no private model reasoning or raw prompt content.
```

### a-cold-population — cache-decision-881a47d9-403d-4fd1-96dd-60b119b94f38

- Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
- Selected: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249
- Warm Expert ID: none
- Changed declared route: false
- Decision verifier: PASS
- Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.

| Candidate | Eligible | Cache state | Compatibility | Authority | Base | Cache | Load | Total | Reasons |
|---|---|---|---|---|---:|---:|---:|---:|---|
| local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification#3729249 | true | CACHE STATE UNKNOWN | UNKNOWN | UNAVAILABLE | 1.000000 | 0.000000 | 0.000000 | 1.000000 | cache-evidence-unavailable; worker-load-0pct |

```text
# Cache-Aware Expert Routing Transcript

Work Parcel: parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816
Stage: a-cold-population
Decision: cache-decision-881a47d9-403d-4fd1-96dd-60b119b94f38
Recorded: 2026-09-09T17:14:28.637Z

## What Agent Control considered

- local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification: governed eligible; cache CACHE STATE UNKNOWN/UNKNOWN; evidence UNAVAILABLE; base 1.0000 + cache 0.0000 - load 0.0000 = 1.0000; current load 0%; expected reuse unavailable; context delta unavailable; cache-evidence-unavailable, worker-load-0pct.

## Decision

Selected route: local-cache-warm/default/qwen-cache-warm@controller-cache-expert-qualification
Selection authority: cache-score
Route changed from declared order: no
Reason: Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
Independent decision verifier: PASS

A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

This transcript records operational facts and routing reasons only. It contains no private model reasoning or raw prompt content.
```

## Work Parcel parcel-a01e919a-ddac-4ab0-8e4b-2fae1fb04816

Operator request: Run Agent Control 4.3 Cache-Aware Expert Delegation qualification
Status: SUCCEEDED

- 2026-09-09T17:14:27.790Z · task.received · Natural-language task accepted — Verbatim prompt retained before planning
- 2026-09-09T17:14:27.790Z · task.classified · Task queued for governed planning — Registered Job selection remains authoritative
- 2026-09-09T17:14:27.790Z · planning.started · Selecting registered Job — Planner may only select Jobs present in the canonical catalog
- 2026-09-09T17:14:27.799Z · plan.selected · Work Parcel selected — Explicitly gated 4.3 physical qualification plan; every stage uses normal production routing and execution
- 2026-09-09T17:14:27.799Z · route.requested · a-cold-population · A · Cold population on candidate Warm Expert route requested — Requested provider policy-selected; account policy-selected; model qwen-cache-warm; role policy-selected; fallback disabled; profile THIN; Establish a genuine verified cold population on the designated candidate route
- 2026-09-09T17:14:27.799Z · route.requested · b-compatible-follow-on · B/C · Compatible follow-on with cold competitor route requested — Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; Compare the equally capable cold primary with the compatible measured Warm Expert
- 2026-09-09T17:14:27.799Z · route.requested · d-incompatible-control · D · Incompatible task control route requested — Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; Material task/dependency context changed; cache affinity must not select the prior Warm Expert
- 2026-09-09T17:14:27.799Z · route.requested · e-context-invalidation · E · Material context invalidation route requested — Requested provider policy-selected; account policy-selected; model qwen-cache-warm; role policy-selected; fallback disabled; profile THIN; Run incompatible work in the same warm backend scope so displaced retained context is invalidated after observation
- 2026-09-09T17:14:28.637Z · cache.experts_assessed · a-cold-population · Warm Expert candidates assessed — local-cache-warm/qwen-cache-warm CACHE STATE UNKNOWN/UNKNOWN cache=0.0000 authority=UNAVAILABLE
- 2026-09-09T17:14:28.647Z · cache.expert_selected · a-cold-population · Governed route selected without warm affinity — Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
- 2026-09-09T17:14:28.652Z · stage.dispatched · a-cold-population · A · Cold population on candidate Warm Expert dispatched — Job non-openai-cache-stable@1.0.0; Run run-dc5eb0ea-2ee4-4c79-9ba3-ac56ef6b7ca5; requested route Requested provider policy-selected; account policy-selected; model qwen-cache-warm; role policy-selected; fallback disabled; profile THIN; Establish a genuine verified cold population on the designated candidate route; resolved local-cache-warm/qwen-cache-warm on controller-cache-expert-qualification; qualification llama.cpp-b9371-cache-aware-expert-qualification
- 2026-09-09T17:14:28.814Z · route.resolved · a-cold-population · A · Cold population on candidate Warm Expert actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model qwen-cache-warm; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:33.147Z · route.resolved · a-cold-population · A · Cold population on candidate Warm Expert actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:30.794Z · cache.expert_observed · a-cold-population · Cache expertise observed: HOT — inv-514c877b-091a-4a5d-9c9d-a4def292bcb5; DERIVED; reused 0; processed 1328; verifier UNKNOWN
- 2026-09-09T17:14:32.321Z · cache.expert_observed · a-cold-population · Cache expertise observed: HOT — inv-ccb3136f-9936-4908-93a8-ff509aa88ca5; AUTHORITATIVE; reused 1359; processed 206; verifier UNKNOWN
- 2026-09-09T17:14:32.900Z · cache.expert_observed · a-cold-population · Cache expertise observed: HOT — inv-8fa9bd00-6473-4785-ad85-8b435647fedf; AUTHORITATIVE; reused 1630; processed 114; verifier UNKNOWN
- 2026-09-09T17:14:30.794Z · invocation.completed · a-cold-population · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-514c877b-091a-4a5d-9c9d-a4def292bcb5; 1360 tokens; provider cost not reported
- 2026-09-09T17:14:32.321Z · invocation.completed · a-cold-population · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-ccb3136f-9936-4908-93a8-ff509aa88ca5; 1631 tokens; provider cost not reported
- 2026-09-09T17:14:32.900Z · invocation.completed · a-cold-population · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-8fa9bd00-6473-4785-ad85-8b435647fedf; 1765 tokens; provider cost not reported
- 2026-09-09T17:14:33.262Z · route.resolved · a-cold-population · A · Cold population on candidate Warm Expert actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available, satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:34.231Z · cache.experts_assessed · b-compatible-follow-on · Warm Expert candidates assessed — local-cache-cold/qwen-cache-cold CACHE STATE UNKNOWN/UNKNOWN cache=0.0000 authority=UNAVAILABLE; local-cache-warm/qwen-cache-warm HOT/HIGH cache=0.1051 authority=AUTHORITATIVE
- 2026-09-09T17:14:34.237Z · cache.expert_selected · b-compatible-follow-on · Warm Expert route selected — Warm Expert preference applied within qualified policy order; Warm Expert HOT/HIGH contributed 0.1051.
- 2026-09-09T17:14:34.239Z · stage.dispatched · b-compatible-follow-on · B/C · Compatible follow-on with cold competitor dispatched — Job non-openai-cache-stable@1.0.0; Run run-9bfdd173-a998-459f-a010-b1cdb049f010; requested route Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; Compare the equally capable cold primary with the compatible measured Warm Expert; resolved local-cache-warm/qwen-cache-warm on controller-cache-expert-qualification; qualification llama.cpp-b9371-cache-aware-expert-qualification
- 2026-09-09T17:14:34.421Z · route.resolved · b-compatible-follow-on · B/C · Compatible follow-on with cold competitor actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model qwen-cache-warm; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:34.289Z · route.changed · b-compatible-follow-on · local-cache-warm/Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf → local-cache-warm/qwen-cache-warm — Observed execution strategy non-openai-cache.real-repository-mutation; previous verifier PASS; incremental provider cost not reported
- 2026-09-09T17:14:37.246Z · route.resolved · b-compatible-follow-on · B/C · Compatible follow-on with cold competitor actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:34.927Z · cache.expert_observed · b-compatible-follow-on · Cache expertise observed: HOT — inv-94d15a39-ed8b-48a4-bd75-f18188f7ae6f; AUTHORITATIVE; reused 1327; processed 1; verifier UNKNOWN
- 2026-09-09T17:14:36.455Z · cache.expert_observed · b-compatible-follow-on · Cache expertise observed: HOT — inv-f3c5653a-0cba-4252-a2f8-da32f1690b04; AUTHORITATIVE; reused 1359; processed 206; verifier UNKNOWN
- 2026-09-09T17:14:37.031Z · cache.expert_observed · b-compatible-follow-on · Cache expertise observed: HOT — inv-d4b5befd-aca2-425a-884c-df0fb5286305; AUTHORITATIVE; reused 1630; processed 114; verifier UNKNOWN
- 2026-09-09T17:14:34.927Z · invocation.completed · b-compatible-follow-on · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-94d15a39-ed8b-48a4-bd75-f18188f7ae6f; 1360 tokens; provider cost not reported
- 2026-09-09T17:14:36.455Z · invocation.completed · b-compatible-follow-on · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-f3c5653a-0cba-4252-a2f8-da32f1690b04; 1631 tokens; provider cost not reported
- 2026-09-09T17:14:37.031Z · invocation.completed · b-compatible-follow-on · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-d4b5befd-aca2-425a-884c-df0fb5286305; 1765 tokens; provider cost not reported
- 2026-09-09T17:14:37.375Z · route.resolved · b-compatible-follow-on · B/C · Compatible follow-on with cold competitor actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available, satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:38.431Z · cache.experts_assessed · d-incompatible-control · Warm Expert candidates assessed — local-cache-cold/qwen-cache-cold CACHE STATE UNKNOWN/UNKNOWN cache=0.0000 authority=UNAVAILABLE; local-cache-warm/qwen-cache-warm HOT/INCOMPATIBLE cache=0.0000 authority=AUTHORITATIVE
- 2026-09-09T17:14:38.435Z · cache.expert_selected · d-incompatible-control · Governed route selected without warm affinity — Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
- 2026-09-09T17:14:38.437Z · stage.dispatched · d-incompatible-control · D · Incompatible task control dispatched — Job non-openai-cache-changed-prefix@1.0.0; Run run-87ade7bb-1d25-476e-bacd-d46eecce1a2e; requested route Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; Material task/dependency context changed; cache affinity must not select the prior Warm Expert; resolved local-cache-cold/qwen-cache-cold on controller-cache-expert-qualification; qualification llama.cpp-b9371-cache-aware-expert-qualification
- 2026-09-09T17:14:38.590Z · route.resolved · d-incompatible-control · D · Incompatible task control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model qwen-cache-cold; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:38.511Z · route.changed · d-incompatible-control · local-cache-warm/Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf → local-cache-cold/qwen-cache-cold — Observed execution strategy non-openai-cache.real-repository-mutation; previous verifier PASS; incremental provider cost not reported
- 2026-09-09T17:14:42.861Z · route.resolved · d-incompatible-control · D · Incompatible task control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:40.750Z · cache.expert_observed · d-incompatible-control · Cache expertise observed: HOT — inv-bf163831-b3d3-42ef-842a-c12ef10f1ae8; DERIVED; reused 0; processed 1336; verifier UNKNOWN
- 2026-09-09T17:14:42.120Z · cache.expert_observed · d-incompatible-control · Cache expertise observed: HOT — inv-d6f09adb-a1d6-47e0-9ac6-f0aebc10c95a; AUTHORITATIVE; reused 1383; processed 76; verifier UNKNOWN
- 2026-09-09T17:14:42.682Z · cache.expert_observed · d-incompatible-control · Cache expertise observed: HOT — inv-7d6c1b6d-f02c-4b31-9b98-1a0302260764; AUTHORITATIVE; reused 1524; processed 114; verifier UNKNOWN
- 2026-09-09T17:14:40.750Z · invocation.completed · d-incompatible-control · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-bf163831-b3d3-42ef-842a-c12ef10f1ae8; 1384 tokens; provider cost not reported
- 2026-09-09T17:14:42.120Z · invocation.completed · d-incompatible-control · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-d6f09adb-a1d6-47e0-9ac6-f0aebc10c95a; 1525 tokens; provider cost not reported
- 2026-09-09T17:14:42.682Z · invocation.completed · d-incompatible-control · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-7d6c1b6d-f02c-4b31-9b98-1a0302260764; 1659 tokens; provider cost not reported
- 2026-09-09T17:14:42.910Z · route.resolved · d-incompatible-control · D · Incompatible task control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available, satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:43.800Z · cache.experts_assessed · e-context-invalidation · Warm Expert candidates assessed — local-cache-warm/qwen-cache-warm HOT/INCOMPATIBLE cache=0.0000 authority=AUTHORITATIVE
- 2026-09-09T17:14:43.803Z · cache.expert_selected · e-context-invalidation · Governed route selected without warm affinity — Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
- 2026-09-09T17:14:43.805Z · stage.dispatched · e-context-invalidation · E · Material context invalidation dispatched — Job non-openai-cache-changed-prefix@1.0.0; Run run-6c578c05-59f0-4b05-a1de-fa9c331c3877; requested route Requested provider policy-selected; account policy-selected; model qwen-cache-warm; role policy-selected; fallback disabled; profile THIN; Run incompatible work in the same warm backend scope so displaced retained context is invalidated after observation; resolved local-cache-warm/qwen-cache-warm on controller-cache-expert-qualification; qualification llama.cpp-b9371-cache-aware-expert-qualification
- 2026-09-09T17:14:43.882Z · route.resolved · e-context-invalidation · E · Material context invalidation actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model qwen-cache-warm; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:43.861Z · route.changed · e-context-invalidation · local-cache-cold/Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf → local-cache-warm/qwen-cache-warm — Observed execution strategy non-openai-cache.real-repository-mutation; previous verifier PASS; incremental provider cost not reported
- 2026-09-09T17:14:47.821Z · route.resolved · e-context-invalidation · E · Material context invalidation actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:14:45.694Z · cache.expert_observed · e-context-invalidation · Cache expertise observed: WARM — inv-59a68e3f-2fd4-497c-bcfe-a6a6f9efc77d; AUTHORITATIVE; reused 497; processed 839; verifier UNKNOWN
- 2026-09-09T17:14:47.067Z · cache.expert_observed · e-context-invalidation · Cache expertise observed: HOT — inv-fcca06db-e47d-4359-90c2-bda78527cb8d; AUTHORITATIVE; reused 1383; processed 76; verifier UNKNOWN
- 2026-09-09T17:14:47.638Z · cache.expert_observed · e-context-invalidation · Cache expertise observed: HOT — inv-e8d8159d-89ff-47f4-b883-3f3e6113798b; AUTHORITATIVE; reused 1524; processed 114; verifier UNKNOWN
- 2026-09-09T17:14:45.694Z · invocation.completed · e-context-invalidation · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-59a68e3f-2fd4-497c-bcfe-a6a6f9efc77d; 1384 tokens; provider cost not reported
- 2026-09-09T17:14:47.067Z · invocation.completed · e-context-invalidation · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-fcca06db-e47d-4359-90c2-bda78527cb8d; 1525 tokens; provider cost not reported
- 2026-09-09T17:14:47.638Z · invocation.completed · e-context-invalidation · local-cache-warm / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-e8d8159d-89ff-47f4-b883-3f3e6113798b; 1659 tokens; provider cost not reported
- 2026-09-09T17:14:47.888Z · route.resolved · e-context-invalidation · E · Material context invalidation actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-warm; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available, satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available

### Baton chain

- a-cold-population · SUCCEEDED · run run-dc5eb0ea-2ee4-4c79-9ba3-ac56ef6b7ca5 · decision cache-decision-881a47d9-403d-4fd1-96dd-60b119b94f38 · expert none · artifacts artifact-ec0e5785-6aba-405f-8b2d-0ef7ee67e557, artifact-f3bc11e0-9ebe-4b0f-86fd-ca96ccf68fdf
- b-compatible-follow-on · SUCCEEDED · run run-9bfdd173-a998-459f-a010-b1cdb049f010 · decision cache-decision-cf61fb5b-65c4-4917-bc35-3701b89a6b6f · expert expert-4cede3b07784fa759989d9a8 · artifacts artifact-87cd4130-2183-4df1-8167-330f39d7f20f, artifact-1b53c008-9115-42b6-a30f-cccb945c7c9b
- d-incompatible-control · SUCCEEDED · run run-87ade7bb-1d25-476e-bacd-d46eecce1a2e · decision cache-decision-7fbab1c5-537f-4be8-b832-9fcffbc58b24 · expert none · artifacts artifact-3c560c17-44eb-496d-9a4d-2ef6345ce7d6, artifact-58cf55f0-e499-4b08-820f-cbfe8b2db871
- e-context-invalidation · SUCCEEDED · run run-6c578c05-59f0-4b05-a1de-fa9c331c3877 · decision cache-decision-aed87f1f-4ebe-451f-8ec0-92ca9345dc18 · expert none · artifacts artifact-2449f632-5787-4f65-a78e-f978c2ec085a, artifact-edb5af9a-3460-4b16-9b66-0846abd9a62a

### Model invocation and cache measurements

- 2026-09-09T17:14:28.774Z → 2026-09-09T17:14:30.794Z · a-cold-population · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 0 · processed 1328 · prompt 1359.341 ms · total 1360 · elapsed 2020 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:30.800Z → 2026-09-09T17:14:32.321Z · a-cold-population · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1359 · processed 206 · prompt 254.48 ms · total 1631 · elapsed 1521 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:32.338Z → 2026-09-09T17:14:32.900Z · a-cold-population · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1630 · processed 114 · prompt 146.139 ms · total 1765 · elapsed 562 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:34.289Z → 2026-09-09T17:14:34.927Z · b-compatible-follow-on · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1327 · processed 1 · prompt 20.81 ms · total 1360 · elapsed 638 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:34.930Z → 2026-09-09T17:14:36.455Z · b-compatible-follow-on · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1359 · processed 206 · prompt 254.343 ms · total 1631 · elapsed 1525 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:36.468Z → 2026-09-09T17:14:37.031Z · b-compatible-follow-on · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1630 · processed 114 · prompt 145.371 ms · total 1765 · elapsed 563 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:38.511Z → 2026-09-09T17:14:40.750Z · d-incompatible-control · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 0 · processed 1336 · prompt 1312.971 ms · total 1384 · elapsed 2239 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:40.751Z → 2026-09-09T17:14:42.120Z · d-incompatible-control · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 1383 · processed 76 · prompt 116.515 ms · total 1525 · elapsed 1369 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:42.133Z → 2026-09-09T17:14:42.682Z · d-incompatible-control · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 1524 · processed 114 · prompt 145.211 ms · total 1659 · elapsed 549 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:43.861Z → 2026-09-09T17:14:45.694Z · e-context-invalidation · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 497 · processed 839 · prompt 845.246 ms · total 1384 · elapsed 1833 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:45.697Z → 2026-09-09T17:14:47.067Z · e-context-invalidation · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1383 · processed 76 · prompt 115.009 ms · total 1525 · elapsed 1370 ms · authority authoritative · verifier PASS
- 2026-09-09T17:14:47.079Z → 2026-09-09T17:14:47.638Z · e-context-invalidation · local-cache-warm/qwen-cache-warm@controller-cache-expert-qualification · reused 1524 · processed 114 · prompt 144.998 ms · total 1659 · elapsed 559 ms · authority authoritative · verifier PASS

## Work Parcel parcel-9fb2bd53-0b69-4e58-b488-85229df2ee55

Operator request: Run Agent Control 4.3 backend restart control
Status: SUCCEEDED

- 2026-09-09T17:17:14.453Z · task.received · Natural-language task accepted — Verbatim prompt retained before planning
- 2026-09-09T17:17:14.453Z · task.classified · Task queued for governed planning — Registered Job selection remains authoritative
- 2026-09-09T17:17:14.453Z · planning.started · Selecting registered Job — Planner may only select Jobs present in the canonical catalog
- 2026-09-09T17:17:14.480Z · plan.selected · Work Parcel selected — Explicitly gated backend-restart negative control through normal production routing
- 2026-09-09T17:17:14.480Z · route.requested · f-backend-restart · F · Backend restart control route requested — Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; A new backend instance has no inherited cache authority; the declared cold primary must remain selected
- 2026-09-09T17:17:14.776Z · cache.experts_assessed · f-backend-restart · Warm Expert candidates assessed — local-cache-cold/qwen-cache-cold HOT/INCOMPATIBLE cache=0.0000 authority=AUTHORITATIVE; local-cache-warm/qwen-cache-warm CACHE STATE UNKNOWN/UNKNOWN cache=0.0000 authority=UNAVAILABLE
- 2026-09-09T17:17:14.783Z · cache.expert_selected · f-backend-restart · Governed route selected without warm affinity — Warm Expert preference applied within qualified policy order; No cache-affinity bonus contributed.
- 2026-09-09T17:17:14.787Z · stage.dispatched · f-backend-restart · F · Backend restart control dispatched — Job non-openai-cache-stable@1.0.0; Run run-511d6b20-3e6b-4f91-a065-0ef38ebe2543; requested route Requested provider policy-selected; account policy-selected; model policy-selected; role cache.follow-on; fallback allowed; profile THIN; A new backend instance has no inherited cache authority; the declared cold primary must remain selected; resolved local-cache-cold/qwen-cache-cold on controller-cache-expert-qualification; qualification llama.cpp-b9371-cache-aware-expert-qualification
- 2026-09-09T17:17:14.887Z · route.resolved · f-backend-restart · F · Backend restart control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model qwen-cache-cold; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:17:18.731Z · route.resolved · f-backend-restart · F · Backend restart control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available
- 2026-09-09T17:17:16.433Z · cache.expert_observed · f-backend-restart · Cache expertise observed: WARM — inv-ffb51129-c617-4d62-a94d-ddfb99dcf1a1; AUTHORITATIVE; reused 497; processed 831; verifier UNKNOWN
- 2026-09-09T17:17:17.947Z · cache.expert_observed · f-backend-restart · Cache expertise observed: HOT — inv-6e7ea2a3-ce2d-4708-b086-1fa0098171ee; AUTHORITATIVE; reused 1359; processed 206; verifier UNKNOWN
- 2026-09-09T17:17:18.534Z · cache.expert_observed · f-backend-restart · Cache expertise observed: HOT — inv-3da95787-22c9-4d0d-9ba8-3e8297b36838; AUTHORITATIVE; reused 1630; processed 114; verifier UNKNOWN
- 2026-09-09T17:17:16.433Z · invocation.completed · f-backend-restart · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-ffb51129-c617-4d62-a94d-ddfb99dcf1a1; 1360 tokens; provider cost not reported
- 2026-09-09T17:17:17.947Z · invocation.completed · f-backend-restart · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-6e7ea2a3-ce2d-4708-b086-1fa0098171ee; 1631 tokens; provider cost not reported
- 2026-09-09T17:17:18.534Z · invocation.completed · f-backend-restart · local-cache-cold / Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf invocation completed — inv-3da95787-22c9-4d0d-9ba8-3e8297b36838; 1765 tokens; provider cost not reported
- 2026-09-09T17:17:18.780Z · route.resolved · f-backend-restart · F · Backend restart control actual route recorded — Workers controller-cache-expert-qualification; provider local-cache-cold; account default; model Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf; profile THIN; satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available, satisfies:model.execute, satisfies:repository.mutation.typed, satisfies:repository.verify.public, healthy, available

### Baton chain

- f-backend-restart · SUCCEEDED · run run-511d6b20-3e6b-4f91-a065-0ef38ebe2543 · decision cache-decision-74f6058a-51cf-446d-9138-2b638f207127 · expert none · artifacts artifact-b43219ff-64d0-47c4-abc6-8b50a63366db, artifact-94936bfc-6a92-4a3b-af65-b59d97e3df29

### Model invocation and cache measurements

- 2026-09-09T17:17:14.849Z → 2026-09-09T17:17:16.433Z · f-backend-restart · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 497 · processed 831 · prompt 858.6 ms · total 1360 · elapsed 1584 ms · authority authoritative · verifier PASS
- 2026-09-09T17:17:16.437Z → 2026-09-09T17:17:17.947Z · f-backend-restart · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 1359 · processed 206 · prompt 253.193 ms · total 1631 · elapsed 1510 ms · authority authoritative · verifier PASS
- 2026-09-09T17:17:17.963Z → 2026-09-09T17:17:18.534Z · f-backend-restart · local-cache-cold/qwen-cache-cold@controller-cache-expert-qualification · reused 1630 · processed 114 · prompt 146.872 ms · total 1765 · elapsed 571 ms · authority authoritative · verifier PASS

