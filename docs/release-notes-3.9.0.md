# Agent Control 3.9.0 release-candidate notes

Agent Control 3.9.0 is the resilient-execution, persistent-context and capability-intelligence candidate. It carries forward the 3.8.2 cached-input correction, survives transport loss/controller restart/cancellation without inventing terminal state, and adds provider-neutral mechanisms for long-running Work Parcel context, asynchronous DAG execution and evidence-based model routing.

## Included

- exact durable execution identity and same-route reconciliation for normal and parameterised Jobs;
- actionable authentication/reconnect/retry states with bounded deadline and budget;
- owned process execution and verified Linux process-group / Windows process-tree cleanup adapters;
- two-phase cancellation/timeout and explicit cleanup uncertainty;
- complete dashboard/SSE reconstruction with real reasons, deadlines, freshness and cleanup evidence;
- provenance-aware `/proc`, Node `os` and Android sysfs resource measurements;
- a bounded same-device Android wireless-ADB discovery/pair/reconnect helper with stdin-only PIN handling and capability publication only after verification;
- provider-neutral stable/volatile prompt blocks, capability-gated Responses cache controls, cache-write telemetry/pricing and controlled baseline/candidate measurement;
- layered Work Parcel context: immutable original goal, concise active state, SHA-linked events, governed retrieval and bounded baton views;
- first-class evidence criteria, append-only steering and stable non-blocking questions over concurrent dependency graphs;
- normalized provider/runtime capabilities with native versus Agent Control-emulated and verified versus advertised distinctions;
- capabilities-first route eligibility followed by observed quality, reliability, latency, cost, token/cache efficiency, account/node/locality and privacy policy;
- a content-hashed 17-task/three-repetition frozen suite, append-only model attempt history, rolling trends, task economics, conservative lifecycle transitions and regression warnings;
- dashboard leader/capability/history/review-queue/safety/context controls backed by the same durable stores and live SSE;
- an independent runtime safety supervisor with explicit allow/audit/approval/deny/pause/escalate outcomes;
- deterministic regression coverage and updated operator/architecture/migration documentation.

## Physical evidence

A real isolated dashboard run exercised two concurrent lanes: one owned process remained live while a second same-Job Run waited under queue concurrency, a real Codex repository review completed with fresh/cached token accounting, the MSI browser reloaded mid-run and reconstructed the same state through HTTP/SSE, and operator cancellation reached `CANCELLED` only after confirmed Linux process-group cleanup. The recording and sanitized JSON projections are content-addressed in the [qualification report](evidence/agent-control-3.9-qualification.md).

The Pixel emitted a current two-sample sysfs cpuidle-derived busy value with source/authority/limitations intact. It did not have a discovered local wireless-ADB pairing/connect endpoint and no local human PIN ceremony was available, so ADB pairing, reconnect and execution/resume did not pass physically. The node correctly withheld `android.adb.local` and `transport.adb`.

The alternating real Codex cache comparison records prompt/stable-prefix hashes, tokens and latency. Across four calls per arm, the 3.9 shape used fewer aggregate tokens but produced zero accepted review outcomes versus two for the baseline; all eight responses were schema-valid. The available CLI uses provider-managed automatic caching and does not expose explicit Responses cache controls, cache writes, authoritative current context or billed cost. Outcome quality was not equivalent, so the candidate claims truthful structure and accounting—not a repeatable token, latency or economic saving.

A separate clean physical run exercised the provider-neutral additions against two live llama.cpp/Qwen2.5 3B routes. Context recovery retained 103,526 bytes of historical events while handing the later stage a 4,941-byte baton; exact retrieval found the excluded failed approach and beta completed with alpha attempted once. A three-stage Parcel showed the left branch succeed while the question-dependent right branch waited and the join remained queued; after answer, all three passed their explicit criterion.

The frozen suite ran 17 tasks × 3 repetitions × 2 candidates twice: 204 immutable attempts persisted and reloaded. The instruct route recorded 36/48 measured passes and 8,976 total tokens; the coder route recorded 38/60 and 15,125 tokens. Unsupported workflow/browser/computer evaluator classes remained explicit unavailable. The `code.modify` route correctly excluded the instruct model and selected the coder from verified native evidence. The `LIVE` 1920×1080 dashboard recording and JSON are content-addressed in the [provider-neutral qualification report](evidence/agent-control-3.9-provider-neutral-qualification.md).

## Compatibility and defaults

- Existing 3.8.2 configuration and historical records remain readable; new runtime fields are additive.
- No Job, Schedule, Spark route, provider, remote listener, Android pairing flow or deployment is enabled by upgrade.
- Existing retry values continue to work. New multiplier/deadline settings are optional.
- Prompt-cache controls are disabled unless both provider and exact model carry a qualified capability.
- Missing resource or provider telemetry remains null/unknown.
- Authentication/credential residency and account routing are unchanged.

## Candidate limitations

- Android local-ADB pairing/reconnect and downstream ADB execution/resume are not physically qualified in this candidate.
- Windows process-tree cleanup is regression-tested but was not physically cancelled during this candidate qualification.
- Provider authentication-block/retry and same-execution reconnect are deterministically tested; the dashboard physical run did not force every external failure class.
- Cache measurement is observational and does not prove stable token, latency or monetary savings.
- The two local candidates do not have governed browser/computer evaluators; those frozen tasks remain capability-unavailable.
- Current-context occupancy is estimated from each local one-shot request, while lifetime token usage remains provider-reported and separate.
- No local energy meter/tariff was configured, so monetary cost and cost per success remain unavailable.
- Same-day evidence is intentionally insufficient for automatic `PREFERRED` promotion or fabricated leaderboard winners.
- This branch is for review. It is not merged, tagged, published or deployed by the candidate preparation task.

## Upgrade and reproduction

Follow [`migration-3.9.md`](migration-3.9.md). The core gate is:

```bash
npm ci
npm run check
npm pack --dry-run
```

Focused Android and cache commands are:

```bash
npm run test:android-adb
npm run qualify:provider-cache -- --output=/absolute/evidence.json --repository=/absolute/repository --files=src/example-a.ts,src/example-b.ts
```

The opt-in provider-neutral runner and recording are:

```bash
AGENT_CONTROL_QUALIFICATION_CANDIDATES_JSON='[...]' npm run qualify:provider-neutral -- --state-dir /absolute/private/state --evidence-file /absolute/evidence.json --host 127.0.0.1 --port 4390 --hold-ms 10000
AGENT_CONTROL_QUALIFICATION_CANDIDATES_JSON='[...]' AGENT_CONTROL_CHROMIUM=/absolute/path/to/chromium AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN='qualification-only-token' npm run record:provider-neutral
```

External-provider qualification is opt-in and requires an already qualified indirect credential reference. It never runs as part of `npm run check`.

## Review boundary

The final candidate gate passed TypeScript, bootstrap/shell syntax, dashboard syntax, infrastructure neutrality, all 45 implementation-status claims, 817/817 repository tests, 602 local Markdown links, package dry-run and a clean-prefix install whose CLI reported `agent-control 3.9.0`. Exact physical evidence hashes and focused results are in the provider-neutral qualification report. The release reviewer must still verify the branch commit, clean worktree and explicit limitations before authorising merge or tag. No current evidence permits claiming the Pixel ADB physical gate, browser/computer model capability, automatic model promotion or a cache-saving gate as passed.
