# Agent Control 3.7 review of Codex 0.153

Date: 2026-09-03  
Official source tag: `rust-v0.153.0`  
Official source commit: `41e22fee981a63b3698df7ed36bad393cda24715`

## Native Codex capabilities

Codex 0.153 adds disabled-by-default `features.context_management.experimental_mode`. Source commit `05ae59c414b6b92cea8496cce819fa3da967cbd2` enables token-budget context guidance, the history/notes extension and model-callable `new_context` for eligible ChatGPT Plus, Pro and Pro Lite sessions using Codex backend routes. It excludes API-key/custom-provider routes and temporary structured threads. `new_context` starts a new window without automatically summarizing prior conversation, so the model guidance requires durable notes containing goal, decisions, progress, learnings and next steps first.

The app server exposes `thread/tokenUsage/updated` with cumulative `total`, latest-response/current-window `last`, and `modelContextWindow`; `thread/compact/start`; `contextCompaction` lifecycle items; and `thread/resume`/`thread/fork`. Response token usage is persisted in rollout history by `5f79a92e3936274318d2122ae3244e5edd80dd1f`, including immediate replay after resume. Raw per-response usage metadata is preserved by `e017e93aceafb2fe04bed1c926e448a5fb4f913d`, but its app-server notification is explicitly internal-only. Turn-cost lookup added by `e39ab0c1854dbd567172fd5a79dbfff9067cb609` emits `codex.turn_cost` OpenTelemetry for ChatGPT sessions; it is not a field in the current exec JSONL stream. Shared histories participate in rollout compression and compressed rollouts remain resumable.

## Generic techniques adopted

- Separate cumulative lifetime usage from current-window occupancy.
- Treat context changes as first-class durable lifecycle events.
- Checkpoint objective, decisions, progress and exact next action before a context boundary.
- Preserve cumulative accounting across compaction, continuation, resume and provider/model handoff.
- Replay persisted usage on recovery and retain an authority/source marker for every normalized field.

Agent Control implements these independently of Codex as `COMPACTION`, `NEW_CONTEXT`, `CONTINUATION` and `RESUME` records plus the existing sealed baton and Work Parcel ledger. If Codex disappeared, providers could still emit the same generic records and Agent Control could still compact, baton, route, recover and reconcile.

## Provider-specific boundary

Codex feature flags, plan/backend eligibility, history notes, the model-only `new_context` tool, app-server JSON-RPC methods and events, raw Responses metadata, rollout format and OTEL turn-cost lookup remain in the Codex adapter. Agent Control does not expose them as core policy concepts or infer authoritative values that the public wire format cannot prove.

The current production Codex route is `codex exec --ephemeral --json --ignore-user-config`. It emits `thread.started` and completion usage but neither enables the experimental feature nor supplies app-server context events or turn-cost telemetry. It therefore continues to report current context and cost as `unavailable`. The 0.153 normalizer supports `thread/tokenUsage/updated` and completed `contextCompaction` events for a future qualified app-server route. Thread context is marked `estimated` because Codex can populate the same public `last` field from provider usage or a local post-compaction recomputation without exposing an authority discriminator.

## Design decision

`new_context` is a useful Codex-native implementation of a context continuation only after a compact durable note exists and only on an eligible execution surface. It is not a replacement for Agent Control's sealed baton: the baton crosses providers/accounts/nodes, preserves governance and verification, and provides recovery when the destination fails. A future Codex adapter may choose native `new_context` for same-route continuation and emit a generic `NEW_CONTEXT` record; cross-route work continues to use the sealed baton.

## Deterministic evidence

Focused tests prove 0.153 app-server usage normalization, honest mixed-authority labeling, context-compaction normalization, explicit current-route capability limits, 60/75/85/90 policy transitions, durable context lifecycle, SSE projection and aggregate totals surviving context reset/restart. Full-suite results are recorded in the development qualification document.
