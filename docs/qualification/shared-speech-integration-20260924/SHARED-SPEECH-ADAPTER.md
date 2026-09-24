# Shared Speech optional application adapter

Status: implementation under qualification, NOT a release candidate.

Built on public main 9ffa265a5df81b87c0c35a695eec157151fa3ea6. Reuses the unmodified SDK from the independently qualified speech-services candidate 3d23884564562738870a0c5b1224186959b5f602, not that repository's older main. SDK provenance and MIT licence are retained under src/vendor/shared-speech. No provider implementation or private audio is included.

Opt in with backend-only AGENT_CONTROL_SHARED_SPEECH_URL and AGENT_CONTROL_SHARED_SPEECH_TOKEN. Endpoint must be HTTPS or loopback HTTP. AGENT_CONTROL_SHARED_SPEECH_FALLBACK=standard explicitly permits ordinary TTS fallback; default none. Never treat fallback as Mallow. Missing service leaves normal text available.

STT enters existing PoeRuntime.ask with UNTRUSTED_DATA provenance. Raw transcript and service correlation are retained separately from request interpretation under existing conversation evidence policy. Final governed text is sent unchanged, split at the SDK's size limit. Existing admission, approval and Work Parcel paths remain authoritative; microphone text has no new approval authority. The SDK owns remote generation fencing; the existing browser playback epoch fences its local queue.

The qualified contract exposes completed audio transcription, generation cancel and client-owned playback. PCM segmentation internally detects speech but only after a complete HTTP body has been read; it is not a live event available to this SDK. Acoustic barge-in is therefore BLOCKED. Push-to-talk and explicit Stop are separate capabilities and cannot pass the acoustic gate.

No historical human listening or standalone latency is claimed as integration evidence. A release candidate requires fresh MSI microphone/speaker conversation, explicit human assessment, physical cancellation/restart/fallback and governance parity. No release version bump, tag, publication or deployment is performed before these gates pass.
