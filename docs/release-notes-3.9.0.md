# Agent Control 3.9.0 release-candidate notes

Agent Control 3.9.0 is the resilient-execution and trustworthy-telemetry candidate. It carries forward the 3.8.2 cached-input correction and adds the minimum provider-neutral mechanisms needed to survive transport loss, controller restart and cancellation without duplicating work or inventing terminal state.

## Included

- exact durable execution identity and same-route reconciliation for normal and parameterised Jobs;
- actionable authentication/reconnect/retry states with bounded deadline and budget;
- owned process execution and verified Linux process-group / Windows process-tree cleanup adapters;
- two-phase cancellation/timeout and explicit cleanup uncertainty;
- complete dashboard/SSE reconstruction with real reasons, deadlines, freshness and cleanup evidence;
- provenance-aware `/proc`, Node `os` and Android sysfs resource measurements;
- a bounded same-device Android wireless-ADB discovery/pair/reconnect helper with stdin-only PIN handling and capability publication only after verification;
- provider-neutral stable/volatile prompt blocks, capability-gated Responses cache controls, cache-write telemetry/pricing and controlled baseline/candidate measurement;
- deterministic regression coverage and updated operator/architecture/migration documentation.

## Physical evidence

A real isolated dashboard run exercised two concurrent lanes: one owned process remained live while a second same-Job Run waited under queue concurrency, a real Codex repository review completed with fresh/cached token accounting, the MSI browser reloaded mid-run and reconstructed the same state through HTTP/SSE, and operator cancellation reached `CANCELLED` only after confirmed Linux process-group cleanup. The recording and sanitized JSON projections are content-addressed in the [qualification report](evidence/agent-control-3.9-qualification.md).

The Pixel emitted a current two-sample sysfs cpuidle-derived busy value with source/authority/limitations intact. It did not have a discovered local wireless-ADB pairing/connect endpoint and no local human PIN ceremony was available, so ADB pairing, reconnect and execution/resume did not pass physically. The node correctly withheld `android.adb.local` and `transport.adb`.

The alternating real Codex cache comparison records prompt/stable-prefix hashes, tokens and latency. Across four calls per arm, the 3.9 shape used fewer aggregate tokens but produced zero accepted review outcomes versus two for the baseline; all eight responses were schema-valid. The available CLI uses provider-managed automatic caching and does not expose explicit Responses cache controls, cache writes, authoritative current context or billed cost. Outcome quality was not equivalent, so the candidate claims truthful structure and accounting—not a repeatable token, latency or economic saving.

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

External-provider qualification is opt-in and requires an already qualified indirect credential reference. It never runs as part of `npm run check`.

## Review boundary

The candidate gate passed TypeScript, syntax, dashboard, neutrality, all 39 implementation-status claims, 773/773 tests, package dry-run and a clean temporary install whose CLI reported `3.9.0`. The release reviewer must still verify the branch commit, clean worktree, physical evidence hashes and explicit limitations before authorising merge or tag. No current evidence permits claiming the Pixel ADB physical gate or a cache-saving gate as passed.
