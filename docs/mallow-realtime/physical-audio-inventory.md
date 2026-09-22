# Mallow realtime physical-audio inventory

Observed on `hpubuntu` on 2026-09-22. This inventory separates a configured endpoint from a physically proven transducer.

## Audio host

| Area | Observed state | Qualification meaning |
|---|---|---|
| Audio server | PulseAudio 16.1, local user socket | Available |
| Default format | `s16le`, stereo, 44.1 kHz | Server default only |
| Capture endpoint | `alsa_input.pci-0000_00_1f.3.analog-stereo`, 2 channel, 48 kHz | Endpoint exists |
| Playback endpoint | `alsa_output.pci-0000_00_1f.3.analog-stereo`, 2 channel, 48 kHz | Endpoint exists |
| Browser | Chromium 153 | `getUserMedia`, WebRTC and Web Audio available |
| Acceleration | NVIDIA Quadro P5000, 16 GiB, driver 580.173.02 | Available; current speech workers are CPU based |

A bounded two-second capture from the ALSA/Pulse capture endpoint contained zero-amplitude PCM (`RMS 0`, `peak 0`) and was deleted immediately. The endpoint therefore exists but a working physical microphone on that host is **not proven**. A 350 ms tone was accepted by the Pulse playback endpoint in 366 ms. That proves dispatch to the configured sink, not that a human heard it.

The private browser/WebRTC sidecar binds only to the Tailscale interface and requests browser `echoCancellation`, `noiseSuppression`, `autoGainControl` and one audio channel. It converts physical browser audio to 16 kHz mono PCM frames and returns 48 kHz WebRTC audio. A separate transient Phase 2 service uses port 8444 and the candidate bridge on loopback port 19322; the existing qualified service on 8443/19222 is unchanged.

## Installed speech components

| Component | Exact installed implementation | Health | Streaming boundary |
|---|---|---|---|
| VAD | Candidate bounded energy VAD over 20 ms PCM frames | Focused tests pass | Frame streaming; not an acoustic ground-truth detector and not AEC |
| STT | `Systran/faster-whisper-small.en`, revision `d1d751a5f8271d482d14ca55d9e2deeebbae577f`, CPU int8, protected loopback port 19224 | Authenticated health 200 | Utterance buffered; no partial transcript API |
| TTS | Existing private OmniVoice worker, CPU, protected loopback port 19197 | Authenticated health 200 | Generates a complete WAV before the candidate exposes 20 ms PCM frames |
| Cached speech | Agent Control allowlisted, voice/version keyed cache | Focused tests pass | Real PCM artifacts include text, provider, voice identity/version, 16 kHz sample rate, duration, SHA-256 and timestamp |
| WebRTC | Existing `aiortc` sidecar and browser client | Running | Real browser media transport; physical Phase 2 session still requires operator speech |

No speech model was downloaded for this parcel. The installed STT and TTS can support a physical buffered-audio experiment. They cannot establish the brief's primary *streaming STT partials* or *native streaming TTS before a complete WAV exists* requirements.

Accordingly:

- `BLOCKED_BY_STREAMING_STT` for partial transcripts and partial-correction timing.
- `BLOCKED_BY_STREAMING_TTS` for the primary incremental synthesis qualification.
- buffered physical speech may still be qualified and retained as a comparison path.

## Ask Collingham and conversation stack

The current guarded LocalWalks route is available on loopback. A fresh Agent Control Job completed through it as run `run-45f2ffec-a1b4-45d3-934b-4e369cfd9911`.

Observed components:

- LocalWalks guarded Ask Collingham proxy on loopback port 18127;
- healthy AnythingLLM container on port 3001;
- `llama.cpp` serving `qwen2.5-3b-instruct-q4_k_m.gguf` on port 8080;
- LanceDB storage containing the Ask Collingham reviewed staging collection.

The run retained one answer artifact and the event chain `request.started → response.first_event → response.validated`. This is real governed retrieval/generation evidence. It is not human answer-accuracy adjudication.

## Security and retention

- STT, TTS and the Agent Control bridge require existing bearer authentication and remain on loopback.
- Browser media is exposed only on the existing Tailscale address with TLS.
- The Phase 2 input adapter does not retain raw microphone frames by default.
- The bounded ALSA inventory recording was deleted.
- Event records contain frame metadata, transcripts, route decisions, Job references and output timing; they do not contain raw PCM.
- No production service, port or credential was replaced.
