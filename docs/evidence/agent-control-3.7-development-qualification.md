# Agent Control 3.7 development qualification

Date: 2026-09-02  
Branch: `feature/3.7-token-aware-baton-routing`  
Base: `5acdde13e41d58b511a33ac0e15f3dc6d3930613` (Agent Control 3.6 product checkpoint)

## Deterministic coverage

The focused TypeScript suite covers the durable governor and its integration boundaries:

- monotonically increasing authoritative context pressure at 74%, 75%, 85%, and 91%;
- a 100k lifetime-token thread with only 12k current context, plus unavailable and estimated context values;
- partial configuration validation against the same 75/85/90 defaults used at runtime;
- sealed baton provenance, SHA-256, Git/diff/test/next-action state, successful handoff, failed-handoff recovery, and original-thread recoverability;
- Sol 184k, Luna 31k, and GLM-5.3-Flash 18k accounting that remains 233k after durable reload;
- Responses-compatible direct review telemetry, Codex JSONL start/completion usage normalization, active/completed thread state for advancing elapsed time, redacted `GET /api/token-routing`, and the real SSE event stream.

## Telemetry authority

Codex JSONL provides a live `thread.started` event and completion usage from `turn.completed`. The current Codex CLI integration does not expose authoritative in-thread context occupancy, so 3.7 records the configured context-window limit when known and marks current context and percentage `unavailable`; it never derives them from lifetime tokens.

Responses-compatible adapters normalize provider usage and use configured pricing only as an `estimated` cost. A provider-native current-context field may be represented as `authoritative` without changing core routing policy.

## Boundary still requiring physical qualification

This is development evidence, not a live provider promotion. Before enabling automatic production handoff, run a bounded qualified provider exercise that proves provider/model identity, live telemetry authority, independent verification, a successful governed handoff, recovery from an intentionally failed handoff, and final Work Parcel/evidence reconciliation. Missing live context telemetry must remain `unavailable` during that exercise.
