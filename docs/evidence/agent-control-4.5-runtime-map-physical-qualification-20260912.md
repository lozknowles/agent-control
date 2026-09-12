# Agent Control 4.5 Runtime Map physical qualification

Status: **PASS — PHYSICALLY QUALIFIED ON THE ISOLATED CANDIDATE**

This is feature-branch evidence, not release, merge, tag or deployment evidence.
The immutable runtime records retain the qualification worktree path as
execution provenance. This is a filesystem location only; it contains no
credential material and is not a deployment assumption.
The run began at `2026-09-12T13:24:26.561Z` on
`feature/4.5-runtime-map`. Its recorded pre-commit implementation base was
`8609ea2e9cf95d360c4ad85f4a211a93583e5ff5`; the final feature checkpoint is
recorded after validation.

## Genuine execution

The operator entered the natural-language task through the authenticated live
dashboard. Agent Control created Work Parcel
`parcel-d489494c-1a99-4d3e-8293-69127830d204` and ran four independent branches
concurrently before aggregation and independent verification:

1. a real strict-schema call to controller-loopback llama.cpp using
   `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf`;
2. an owned-process repository inspection;
3. an owned-process focused Runtime Map test gate;
4. a controlled retry that failed once, remained visible as degraded, then
   recovered through the normal retry policy;
5. evidence aggregation after all dependencies;
6. an independent owned-process verifier.

All six stages and the Work Parcel succeeded. The projection contained 54 nodes,
56 edges, six groups, 48 timestamped events, one model call, three execution
sessions, six sealed stage batons, aggregation, validation and a final result.
The final honest summary was 0 running, 0 waiting, 47 successful, 1 recovered
degraded retry and 0 failed.

Provider-reported lifetime usage was 68 input tokens (67 cached, 1 freshly
processed), 28 output and 96 total. llama.cpp supplied authoritative cache/token
timing. Monetary cost remained unavailable and was not treated as zero.

## Live UI, replay and failure behaviour

The 1920×1080 browser recording shows authenticated submission, the live graph,
parallel branches, Control Room, terminal/session drill-down, graph return,
completion and Replay. During active execution the Runtime Map API was briefly
disconnected. The viewer reported the failure, the Work Parcel continued, and
the next authoritative event reconciled the view. Replay restored pre-start
branches and the final state from recorded timestamps.

The final CSP-safe SVG rendering was required because Agent Control deliberately
forbids inline styles. CSP was retained; dynamic graph geometry is represented
with SVG attributes.

## Evidence

- Machine report: `qualification/agent-control-runtime-map-20260912/qualification.json`
- Complete natural transcript: `qualification/agent-control-runtime-map-20260912/complete-human-readable-transcript.md`
- Video: `qualification/agent-control-runtime-map-20260912/agent-control-4.5-runtime-map-physical-qualification.mp4`
  - SHA-256: `5cdb5a8708b4b08a0d68271a3914ca3742c67b64128e4d1bb50e78c8819df035`
  - 1920×1080 H.264, 25 fps, 22.48 seconds, 3,719,811 bytes
- Screenshot: `qualification/agent-control-runtime-map-20260912/runtime-map-complete.png`
  - SHA-256: `712bf9b34fd344d07313f9b76223456e597ce070c17b10b0889f15a05a6e066b`
- Durable runtime records: `qualification/agent-control-runtime-map-20260912/runtime/`

No browser page errors were recorded. The evidence bundle contains no provider
credential because the physically exercised local provider requires none.

## Measured overhead

- projection: 1,000 physical-evidence projections in 4,769 ms; 4.77 ms average;
- transient heap delta over that loop: 4,248,536 bytes;
- isolated evidence storage: 331,812 bytes across 16 files;
- dashboard batching: 250 ms, at most four projection refreshes per second;
- 55-job deterministic projection: approximately 30–42 ms in focused tests.

The UI is not on the execution authority path. These measurements do not claim
identical performance on another controller.

## Limitations

- Compare has a provider-neutral authenticated delta endpoint, but synchronized
  visual dual-replay remains deferred.
- Runtime Map is WATCH-only. It reuses existing governed controls and does not
  add interactive terminal takeover.
- Protected reasoning, secrets and unadmitted raw output are intentionally not
  visible.
