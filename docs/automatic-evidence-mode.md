# Governed automatic visual evidence

Automatic visual evidence is a provider-neutral Job-lifecycle capability. The dashboard exposes `VIDEO EVIDENCE · OFF/ON`; its authenticated, same-origin policy endpoint controls whether visual Jobs attempt capture. Core recognises image, Blender, browser, desktop/computer-use and other visual-application task classes without naming a recording product.

The runtime defines a replaceable capture-provider port. A compatible provider must advertise supported task classes, video formats, overlay support, duration and byte limits. Agent Control supplies authoritative Job state for a restrained overlay: Job ID, task, stage, worker/provider, elapsed time, status and observation time. Capture records use immutable IDs, refuse overwrite, bind output to the Job ID, hash bytes, retain source hashes and record success, cancellation, timeout or failure.

`OFF`, capture unavailability and capture failure remain different states. Policy can permit continuation with an explicit limitation or require capture. Cancellation/failure finalisation calls the provider session and stores either captured bytes plus manifest or an explicit manifest-only limitation as a normal Job artifact.

## 4.17 qualification boundary

The core contract, dashboard control, authentication/origin checks, overlay derivation, immutable manifests and deterministic lifecycle tests are **QUALIFIED** for the bounded Windows path. Normal web startup registers `ffmpeg-windows-desktop`, which captures the real desktop through FFmpeg `gdigrab` and retains an H.264 MP4. Other platforms advertise this adapter as unavailable; they require another compatible provider.

Evidence admission is a synchronous Job dispatch guard. For REQUIRED evidence, compatible provider resolution and capture startup complete before the operational attempt is created. Unavailability produces an explicit retained `UNAVAILABLE` manifest, `step.dispatch_admission_failed`, zero attempts and zero operational action calls. OPTIONAL evidence may continue only with the explicit limitation record.

The dashboard `VIDEO EVIDENCE` control reads and writes the same authoritative runtime policy used by the Job guard. Reads require operator authentication; writes additionally require mutation authorization and an allowed origin. Refresh reads current runtime state. A process restart reconstructs policy from startup configuration and therefore reports the newly effective state rather than claiming the prior in-memory selection survived. No persistent cross-restart preference is claimed.

Physical qualification on MSI used Blender 4.5.14 and FFmpeg 8.1.1. The successful recording is a playable 1920x1080 H.264 MP4 with visible Job overlay and real Blender result; a separate cancelled Job retained `CANCELLED` video and confirmed Blender process-tree cleanup. See the [4.17 qualification](evidence/agent-control-4.17-qualification.md).

