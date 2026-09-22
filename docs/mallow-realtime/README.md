# Mallow realtime presence prototype

This isolated prototype tests whether Mallow can keep a conversation responsive while a genuine governed Agent Control Job runs independently.

The implementation adds:

- a provider-neutral typed presence event contract;
- a redacted append-only JSONL event store and read-only projection;
- a fast-routing boundary for direct, background and progress intents;
- a `JobRuntime` adapter that preserves Run, worker, artifact and cancellation authority;
- speech-generation fencing, user interruption and stale-result rejection;
- an allowlisted, voice-versioned speech cache;
- a read-only authenticated live presence page at `/mallow-presence.html`;
- a deterministic repeatable demonstration using synthetic audio frames and a real governed Job.

The retained demo report also compares an allowlisted phrase on a cache miss and hit. The values are explicitly classified as synthetic provider-to-first-frame measurements; they are not physical audible latency.

Run the focused proof:

```sh
npm run demo:mallow-presence -- .agent-control/evidence/mallow-realtime-presence
```

To expose the resulting projection through the normal authenticated dashboard server:

```sh
AGENT_CONTROL_MALLOW_PRESENCE_EVENTS=.agent-control/evidence/mallow-realtime-presence/events.jsonl npm run web
```

`AGENT_CONTROL_MALLOW_PRESENCE_EVENTS` is optional. When absent, the new API returns `mallow_realtime_presence_unconfigured`; existing dashboard, text Mallow and voice transport behavior stay unchanged.

## Authority and safety

The presence event file is a durable operational record for this prototype, not a second Job ledger. Background state is always reread from `JobRuntime`. The API uses the existing `control.read` operator authentication. Events pass through Agent Control credential redaction before append. Cached phrases are explicit allowlisted text and are invalidated by provider and voice identity/version.

## Qualification boundary

The deterministic proof uses a synthetic streaming frame source and a rules-based conversation provider. It establishes orchestration, event ordering, concurrent Job ownership, phrase-boundary handoff, runtime output suppression, cancellation and stale-result fencing. It does **not** establish audible conversation, microphone/VAD/STT quality, acoustic interruption latency, AEC, crossfade/prosody continuity, physical WebRTC behavior, or model-backed conversational quality.

See [qualification.md](qualification.md) for the evidence inventory, measured prototype timings and remaining physical qualification gates.

Phase 2 continues this work with a real governed Ask Collingham adapter and physical-audio edges. See the [physical audio inventory](physical-audio-inventory.md) and [physical voice qualification](physical-voice-qualification.md). The current installed speech providers are buffered, so Phase 2 remains experimental until a live physical browser session and the required streaming boundaries are qualified.

## Optional shared speech service

The physical bridge can use the independent loopback speech service for both recognition and Mallow's established voice. Set `AGENT_CONTROL_SHARED_SPEECH_URL` and the private server-side `AGENT_CONTROL_SHARED_SPEECH_TOKEN`; the browser never receives that credential. The adapter reports queue and provider health, retains the configured Mallow voice identity, and keeps speech interruption separate from governed Job cancellation.

Remove those two settings to return to the previously configured direct recognition and synthesis providers. Text Mallow and governed Jobs remain available when either speech path is unavailable. This is an isolated integration and does not switch a live Agent Control installation.
