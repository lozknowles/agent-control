# Agent Control 3.9 — Realtime WhatsApp Voice qualification

Date: 5 September 2026. **Final objective verdict: BLOCKED. Reusable implementation: PARTIAL / EXPERIMENTAL.** No WhatsApp full-duplex call is claimed.

## A. Starting branch / commit / worktree

Started from clean `feature/3.9-social-voice-20260905` at `e831d9f128e9dc89d52f3615fbb59262c94a395b`. Created isolated `feature/3.9-realtime-voice-20260905` in a separate worktree. The original voice-note checkout and private gateway/controller/speech services remain unchanged. Exact machine paths and final commit are in the accompanying local commit record.

## B. Existing WhatsApp / OmniVoice architecture found

Authenticated OpenWA ingress normalizes enrolled direct messages into durable SocialVoiceCoordinator intake. Stable AC references map to governed Work Parcels and owned runtime processes; cancellation stays in that runtime. A separate private speech worker provides CPU Whisper and OmniVoice; outgoing asynchronous replies use Ogg/Opus, one short outcome sentence and 0.9 playback speed. Models are independently routed through Agent Control; no qualified realtime conversation route is configured in this pilot. Durable messaging history and signed delivery acknowledgements remain authoritative for existing voice-note evidence.

## C. WhatsApp calling approaches investigated

Inspected installed rmyndharis/OpenWA v0.23.4 and whatsapp-web.js, official Calling API documentation where accessible, browser WebRTC possibilities, MeowCaller pinned at `27a3c6b18657614c9ec2ed16dfc497eff11de6ec`, whatsapp-rust and a Business Calling WebRTC reference implementation. The architectural decision record compares audio, latency, interruption, codecs, authentication, reliability, maintenance, licensing, account risk, private-protocol dependence, portability, testing and fallback.

## D. Selected transport and justification

Preferred target: an official Calling API media edge using WebRTC, after account eligibility, authenticated signaling and caller binding are verified. **No transport is enabled.** OpenWA's available call API can reject calls or create links, but does not accept calls or expose media. MeowCaller is a credible separate experimental client with PCM input/output and output-stop APIs; its independent pairing, private protocol, codec compatibility and disconnect cleanup remain unqualified on this account. It was not attached to the working gateway. Official documentation retrieval returned HTTP 429; account-specific availability/coexistence must not be guessed. No verified Calling API configuration was found in the pilot, and the optional question about an existing separate setup has not been answered at report preparation.

## E. Architecture implemented

Provider-neutral RealtimeVoiceTransport contract and RealtimeVoiceSession implementation: durable identity/events, explicit observed-caller binding, bounded PCM ingestion, experimental VAD/end-pointing, cancellation generations, output suppression, stale-result fencing, per-caller/global capacity limits, tool grants, deadlines, failure handling and restart closure of uncertain media. Recognition and TTS are replaceable edges. Orchestration is a trusted injected port for existing routing and governed tools; no direct model endpoint, shell or WhatsApp-specific reasoning path was added.

Current speech adapters are explicitly utterance-buffered STT and buffered-then-framed TTS. They do not fulfil partial STT/native streaming goals. The reusable layer has executable behaviour and deterministic tests, but no configured production call/orchestration adapter.

## F. Files changed

New core: `src/control/realtime-voice.ts`, `realtime-voice-speech.ts`, `realtime-voice-authority.ts` and four test files. Dashboard: new `voice-sessions.html`, `dashboard-voice-sessions.js`, link from Social & Voice, authenticated server read endpoints, optional history-store wiring. Documentation: ADR, architecture/setup, qualification, release notes and implementation registry/projection. Dashboard syntax checking includes the new script. Three prior distributable evidence/report files had topology labels generalized to satisfy the existing neutrality gate; original evidence remains preserved in the starting checkout/private archive.

## G. Tests added

23 deterministic tests cover identity binding/revocation, unknown callers, capability rejection, session capacity, duplicate calls/audio, malformed/partial PCM, silence, STT/model/TTS failures, model timeout despite ignored AbortSignal, interruption during pending model/output, late-result fencing, read-only tool grants, context/voice continuity across a fixture model change, disconnect, durable restart, WAV framing/validation, private-worker cancellation and authenticated blocked dashboard endpoints. Fixture model changes are not naturally justified live handoffs.

## H. Full regression result

**PASS: 894 tests, zero failures/skips/cancellations.** Typecheck, bootstrap, dashboard syntax, neutrality, implementation status and the complete test suite passed. This includes 23 new realtime tests and the existing 871 tests.

The starting commit's new qualification documentation caused a neutrality failure when rechecked: host identifiers were embedded outside allowed distributable paths. This branch generalizes those labels without weakening the checker. The earlier reported 871-test run preceded those final documentation edits; it was not a complete clean gate for that final documentation tree. Existing dependency installation was reused read-only from the qualified adjacent worktree because the repository has no npm lockfile; no dependency update was performed.

## I. Physical WhatsApp call result

**BLOCKED.** No call was accepted, no five-minute conversation occurred, and no caller hang-up or overlap was recorded. The active gateway provides no supported call-media interface; the preferred official transport requires verified account setup and identity binding. Existing voice-note success is not used as call evidence.

## J. Barge-in measurements

Actual caller-speech-to-acoustic-output-suppression: **unavailable**. End-of-utterance-to-audible-handset-response: **unavailable**. Automated tests demonstrate cancellation/generation fencing and output suppression requests, not human overlap quality. No arbitrary latency PASS threshold was adopted. Experimental VAD settings are tuning/resource parameters, not release acceptance criteria. Transport acknowledgement and handset acoustics are explicitly distinguished.

## K. STT / model / TTS latency

Actual new PCM bridge against P5000 OmniVoice: **1295.93 ms to first buffered frame**, 149 frames / **2.98 s** audio. Actual CPU Whisper: **529.50 ms**. Recognized text: “Agent control drop 3 completed successfully.” This is a component round trip with an observed word error, not a perfect quality score or a live conversation. Model TTFT, tool time in a call, ingress/jitter and acoustic egress latency are unavailable. Existing asynchronous Ogg generation also passed independently in **1243.38 ms**. Sample counts are too small for meaningful p50/p95.

## L. Model handoff result

**BLOCKED physically.** Contract tests preserve session identity, transcript and configured voice across a fixture model change. Existing routing/handoff architecture was inspected; it was neither bypassed nor secretly sabotaged. No realtime conversation route or naturally justified escalation has been qualified. No invented token/cache/cost values appear.

## M. Tool invocation result

**PARTIAL.** A deterministic governed-port test invokes granted read-only status and rejects an ungranted shell request before dispatch. The port carries actor/session/request-key and cancellation. No live-call tool invocation occurred. Initial exact caller bindings only permit status/models/nodes/health; consequential work retains the existing text-confirmation route.

## N. Dashboard result

New authenticated view shows the transport blocker and separate realtime history. It can render session/model/voice/provider, tools, interruptions, turns, usage/cost and measured latency; missing fields remain unavailable. A real isolated component server was rendered on dedicated virtual display **:102** at 1280px and 390px. No overflow or browser errors. No primary display, caller device, phone number, token or simulated live call was captured. The running voice-note controller was not restarted onto this experimental branch.

## O. Transcript location

Durable per-session human-readable transcript generation and summaries are implemented; no actual-call transcript exists. `realtime-voice-qualification-narrative.md` records this investigation and component qualification. Tests exercise transcript persistence using labelled fixtures. Existing voice-note transcripts remain separate and unchanged.

## P. Video / evidence location

No call video exists because there was no physical call. Dashboard screenshots show the real blocked view, not a pretend connected call. Accompanying JSON records actual speech-component timings, asynchronous Ogg regression and browser checks. Raw full-gate logs are included. The previous voice-note video is not presented as full-duplex evidence.

## Q. Security qualification

Unknown/unbound callers fail closed; exact call identity must be explicitly mapped to a currently enrolled messaging identity. Display names and phone resemblance grant nothing. Revocation is rechecked before audio and tool operations. Ambiguous bindings, consequential initial tool grants, duplicate/stale events and unbounded media are rejected. Session/audio generations fence cancelled work; two sessions maximum and one per caller bound resource exposure. No public media ingress, new account pairing, token migration, production webhook or gateway alteration was introduced. A real transport's signature verification, caller mapping, jitter/AEC and playout queue remain prerequisites, not implied by the interface.

## R. Voice-note regression result

Existing OpenWA adapter, SocialVoiceCoordinator, PrivateSpeechProvider and speech-worker files are byte-unchanged against the starting commit. Original checkout remains clean. Gateway, controller and worker remain active. The existing provider generated valid **audio/ogg; codecs=opus**, 12,802 bytes, and reported ready. The complete gate includes the old messaging, enrolment, voice-note, job-control, cancellation, routing and provider-neutral tests. No new handset delivery was requested; prior actual delivery/listening evidence is preserved rather than relabelled as newly measured.

## S. Known limitations

No enabled WhatsApp call-media adapter, verified official Calling API account, partial STT, native streaming OmniVoice, acoustic echo/jitter qualification, five-minute call, real interruptions, natural model escalation, live-call tool or acoustic latency distribution. The orchestration port still needs an approved integration with the existing runtime. Unknown costs remain unknown. Reconnect ends uncertain media instead of resuming. Fallback preserves voice notes but does not automatically send a call-failure message. The session/adapter layer is experimental, not production-supported.

## T. Commit / branch / push status

Branch: `feature/3.9-realtime-voice-20260905`. Final verified commit and push status are recorded in `realtime-voice-commit.txt`. The user authorized this feature-branch push after consistent implementation/evidence. No merge, tag, GitHub Release, production deployment or new PR publication is performed.

## U. Final verdict

**BLOCKED for genuine interruptible WhatsApp full-duplex conversation. PARTIAL for the reusable realtime voice layer.** The transport/account prerequisite must be resolved before a phone action can establish the requested release gates. This candidate is a tested reusable foundation and an explicit feasibility result, not a successful call demonstration.
