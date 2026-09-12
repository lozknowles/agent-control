# Agent Control 3.9 Crew/WOPR and model-escalation qualification

## Verdict

**PASS — GENUINE AUTOMATIC QUALITY-GATE MODEL ESCALATION DEMONSTRATED**

This qualifies the isolated integration candidate only. It does not merge, tag, release or deploy it, and it does not alter the existing live Agent Control deployment.

## Provenance and scope

- Branch: `integration/3.9-crew-wopr-escalation-candidate`
- Qualified implementation commit: `a549e22b189585b786ff5ae4fc1698cf2adb8719`
- Approved Crew source: `6157f5da2e266e982caf5e0620b1b17ee0b975e3`
- Frozen fixture commit: `2ee7ea70fb1d09407b76cc4d8bd5c8cc5bd2f020`
- Fixture file hashes: retained in the [machine-readable evidence](agent-control-3.9-crew-wopr-escalation.json)
- Production state mutation: none
- Simulated runtime evidence: none

The exercised task is a bounded, read-only repository review with two deterministic failing acceptance tests. It qualifies real provider selection, response parsing, independent acceptance, escalation, continuation and verification; it does not claim a source-code mutation workflow.

## Exact request and execution identity

> Review the frozen reservation-service fixture. Explain whether concurrent callers can both acquire the same resource and whether expired cache entries can be accepted as fresh. Preserve evidence, use the configured quality gate, and escalate only if the first route misses either root cause.

- Parent Work Parcel: `parcel-2febccc3-571c-4dad-a76f-733b102441ff`
- Parent Runs: `run-8d233b28-bfa5-4aec-a71a-3eda614f55ec`, `run-edf1f826-2a74-431c-927a-53b330ef4e28`, `run-3e209523-0e86-4ea5-9374-920ce45f922c`, `run-1179b53e-8751-4ccc-a5a7-707370255984`
- Parameterized review Run: `d08a007b-74f1-4cc5-b93e-c9f65a99cab7`
- Provider-owned Work Parcel: `parcel-44deb8fa-71dd-477c-b555-a6caf8fb728e`
- Source: `local-llama/default/qwen-local-small-reviewer@controller` (`qwen2.5-3b-instruct-q4_k_m.gguf`)
- Destination: `codex-chatgpt/Controller Account A (cottage-plus)/codex-luna-controller-a@controller` (`gpt-5.6-luna`)

## What caused the model change

The local Qwen route returned complete, schema-valid `PASS_WITH_FINDINGS` output. Agent Control did not instruct it to fail, starve its output, simulate a provider error or manufacture context pressure. Independent gate `reservation-cache-root-cause-v1` rejected the result because it missed four acceptance-level details: the non-atomic check/await/update sequence, both callers observing no owner, the reversed `createdAt - now` subtraction and the required `now - entry.createdAt` calculation.

At `2026-09-06T17:49:02.011Z`, the provider-neutral governor recorded:

```text
trigger = QUALITY_GATE
action  = BATON_AND_HANDOFF
reason  = quality_gate_failed_governed_fallback_selected:reservation-cache-root-cause-v1
from    = local-llama/default/qwen-local-small-reviewer@controller
to      = codex-chatgpt/Controller Account A/codex-luna-controller-a@controller
```

Source current context was only 4.3% and was explicitly `estimated`; this was not a context-limit handoff. Agent Control sealed baton `token-baton:7d4bbe19-c982-4b76-a11a-f151c69c27ba` with SHA-256 `0928bb07a767b95df52fb9337711239274d05dd0a2b16f04deded1943bea6e97`. It retained the objective, completed source review, evidence hashes, frozen Git SHA, four unresolved criteria, exact next action, route identity and token state. The Codex destination continued the same frozen review, passed the same gate, and the independent final verifier passed. The original Qwen thread remained recoverable.

The [human-readable transcript](agent-control-3.9-crew-wopr-escalation-transcript.md) starts with the exact request and contains a dedicated source → destination section plus timestamped tool actions, model selections, quality decision, baton creation, destination result and verification. It is a deterministic projection of durable evidence and contains neither private model reasoning nor credentials.

## Reconciled telemetry

| Leg | Input | Fresh input | Cache read | Cache write | Output | Total | Current context | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| local Qwen | 773 | 1 | 772 | Unavailable | 633 | 1,406 | 1,406 / 32,768 = 4.3%, estimated single-turn occupancy | Unavailable |
| Codex / Controller Account A / Luna | 8,128 | 8,128 | 0 | Unavailable | 738 | 8,866 | Unavailable / 272,000; Codex turn usage is not current occupancy | Unavailable |
| **Work Parcel** | **8,901** | **8,129** | **772** | **Unavailable** | **1,371** | **10,272** | kept separate per leg | **Unavailable** |

`1,406 + 8,866 = 10,272`. The parameterized Run, provider-owned Work Parcel audit, token-routing projection and independent verification all contain that same aggregate. No handoff reset or duplicate accumulation occurred. Neither provider supplied authoritative monetary cost; no zero-cost claim is made.

## Dashboard and recording

- [Continuous 1920×1080 video](../evidence-archive.md), 57.64 seconds, H.264, 25 fps
- Video SHA-256: `cc8b1b19d36ce7d060306b3134b8f8076d3319ec2a4e1ef93dc62085dabaea46`
- [Video/evidence manifest](agent-control-3.9-crew-wopr-escalation-video.json)
- Manifest SHA-256: `f09977dedd2dfce2421434b03e1396852db84bfacc3a0bbf8d62e80f97da5f61`
- [Machine-readable lifecycle evidence](agent-control-3.9-crew-wopr-escalation.json)
- Lifecycle evidence SHA-256: `5c395122c13a857a257115fecb646b9a983c0c082774b6772db96669e65299be`
- [Human-readable transcript](agent-control-3.9-crew-wopr-escalation-transcript.md)
- Transcript SHA-256: `be0d9f6a598c7d06cec9f1232b25da63971204f79d1cf0fed81f770a7c0c5d2d`
- [Thirteen source screenshots](../evidence-archive.md)

The video is one continuous trial, unspliced and played at 1×. It shows the exact prompt, two concurrent control Jobs, all six animated Crew characters, an inspected event-backed tool indicator, live Qwen usage, the independent rejection and exact baton reason, destination account/provider/model activity, independent verification, final model chain and durable Job history. The Social & Voice navigation remains present and unchanged.

The browser received 39 typed events and produced 52 canonical refresh renders. Required `job.run_changed`, `token.telemetry`, `token.governor_transition`, `token.baton_created` and `token.handoff_result` events were all observed without page refresh. There were no unexpected console or HTTP errors. The isolated harness intentionally omitted optional model/capability-intelligence services, whose explicit `503` responses are separately classified in the manifest.

Reduced-motion validation reported `none` for all nine matrix animation names and zero transition duration. At 390×844, document width was exactly 390 pixels, all nine indicators and six Crew cards existed, and the persistent usage strip remained visible.

### Capture overhead

The under-capture 1.525-second browser sample recorded 37.84 ms of renderer task time, 42 animation frames, three intervals over 50 ms and an 83.4 ms maximum interval. This is a measurement while Chromium video capture was active, not an isolated estimate of recorder overhead. FFmpeg transcoding occurred only after browser capture and cannot affect provider or governor timings. No unsupported subtraction or claim about dashboard-only versus recorder-only cost is made.

## Implementation defects found and fixed

- The production repository-review lifecycle had no independent quality-triggered route into the existing governor; `QUALITY_GATE` now uses the same sealed-baton/handoff abstractions and retains typed trigger evidence.
- The provider/application review contract did not state clearly that a completed severe finding is `PASS_WITH_FINDINGS`, while `FAILED` means an unusable/incomplete review; both boundaries now agree without weakening validation.
- Repeated SSE snapshots replaced Crew card DOM nodes and restarted animation continuously; keyed reconciliation now preserves unchanged cards.
- Inline context-pressure style was blocked by CSP; a semantic `<progress>` element and CSP-safe styling replaced it.
- The narrow primary navigation exceeded a 390-pixel viewport; it is now a bounded horizontal scroller.
- The recorder originally treated explicit optional-projection `503` responses as fatal and had brittle live-node timing; it now classifies only the known optional endpoints and waits on canonical state.
- Qualification setup now pins TAP output for Node 24, uses the canonical model role, admits its random loopback origin, and evaluates acceptance semantics instead of overfitting one expected phrase.

Validation remains fail closed. A schema-invalid provider response still fails before the quality gate, an invalid gate result is rejected, a missing qualified fallback cannot silently accept the source, and a destination that fails the same gate cannot be labelled successful.

## Validation

```bash
npm run check
# 910 tests, 910 passed, 0 failed

npm run record:crew-wopr-escalation
# PASS; continuous video + 13 screenshots

sha256sum docs/evidence/agent-control-3.9-crew-wopr-escalation.mp4
# cc8b1b19d36ce7d060306b3134b8f8076d3319ec2a4e1ef93dc62085dabaea46
```

The full gate also passed TypeScript, bootstrap syntax, dashboard syntax, infrastructure-neutrality and implementation-status checks. Focused integration/dashboard tests are included in the 910-test total.

## Reproduction

Use an isolated checkout and state directory. A reachable qualified llama.cpp route must expose the configured Qwen model, and `CODEX_HOME_COTTAGE_PLUS` must reference an already authenticated controller-local profile. Do not put credential values in command arguments or evidence.

```bash
export CODEX_HOME_COTTAGE_PLUS='<controller-local isolated profile home>'
export AGENT_CONTROL_QUALIFICATION_SOURCE_URL='http://127.0.0.1:8080'
export AGENT_CONTROL_QUALIFICATION_SOURCE_MODEL='qwen2.5-3b-instruct-q4_k_m.gguf'
export AGENT_CONTROL_QUALIFICATION_DESTINATION_MODEL='gpt-5.6-luna'
npm run record:crew-wopr-escalation
npm run check
```

The recorder generates its operator token in memory, binds an isolated loopback dashboard on an ephemeral port, creates a temporary owner-only state directory and deletes/replaces only its exact evidence targets. It does not address the live dashboard.

## Deployment and rollback boundary

No deployment was authorized or performed. Before any future deployment, preserve the current live commit, package/artifact hash, service definition, configuration revision and owner-only state backup; install this candidate through the repository's established deployment path; then verify `agent-control --version`, health, SSE, Social & Voice, Work Parcel submission and rollback readiness. Do not reuse the qualification state directory as production state.

If a later authorized deployment fails, restore the preserved prior package/commit and service definition, keep the existing durable state/configuration unless its documented migration requires otherwise, restart only the Agent Control-owned service and verify the same health/status checks. The current task requires no rollback because the live deployment was never changed.

## Limitations

- This is an integration candidate, not a release.
- The physical task proves a real read-only code-review escalation, not autonomous source mutation.
- The quality gate is an explicitly injected repository-review acceptance boundary; Agent Control does not infer arbitrary quality policy from model prose.
- Qwen current context is an estimated one-turn value. Codex current context is unavailable. Both monetary costs are unavailable.
- The controller-local Codex account-status path confirmed authentication but did not report a trustworthy CLI version or executable hash in this run; those fields remain `locally-qualified`/`unavailable` rather than invented.
- Capture overhead was not independently isolated from dashboard renderer work.
