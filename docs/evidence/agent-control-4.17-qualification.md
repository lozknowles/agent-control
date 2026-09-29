# Agent Control 4.17 release qualification

Date: 2026-09-29  
Base: released `v4.16.0`, `ed57f10bea0d7f52118e933862fdc7b177db3600`  
Verdict: **QUALIFIED FOR RELEASE**

## Automatic evidence

The provider-neutral runtime, immutable manifest, authoritative overlay, dashboard toggle, authenticated/same-origin policy endpoint and Job artifact binding are complete. Normal Windows web startup registers `ffmpeg-windows-desktop`. The Job Runtime now performs evidence admission through a dispatch guard before it creates an operational attempt or invokes the action.

Physical qualification ran from implementation commit `03f07801b466d16b6fda15d8bb2f66700f944c6e` on MSI with Blender 4.5.14 and FFmpeg 8.1.1:

- successful Job `run-9f23b665-660c-4418-8d5e-25dca8d49b18`, operational worker `controller-local-blender`, capture provider `ffmpeg-windows-desktop`;
- evidence record `visual-evidence-f53528d7-2443-4fb6-9422-ae3e8ed239e1`, Job artifact `artifact-e28925d3-bc45-406e-936b-483f0be89879`;
- capture began `2026-09-29T11:21:48.247Z`, before the operational attempt at `2026-09-29T11:21:48.750Z`, and ended normally before terminal Job completion;
- playable H.264 MP4, 1920x1080 at 10 fps, 14.5 seconds, 2,130,069 bytes, SHA-256 `75ce3eed500d6c100d8204e256d277291e97269a1555eb169d4a7ebb470539db`;
- visual inspection confirmed the real Blender result and the correct Agent Control Job, stage and worker overlay;
- duplicate evidence begin for the same Job was refused.

The tracked evidence manifest SHA-256 is `154d7c8294376e3d255a0354ba1a9e830a18b23bfd3bfde8008acb7b16023d79`. Protected physical files remain outside source distribution; the manifest retains their exact names, sizes and hashes.

Cancellation Job `run-ee66b420-4c6b-412b-910a-cc7e30c02650` retained evidence record `visual-evidence-dd1a2474-ced5-4032-83d0-886e5f54988c` as `CANCELLED`. Its 6.7-second 1920x1080 MP4 has SHA-256 `8d3bd644476d2519465c75be11b303690fd149db2601be5c562a66799f50af89`; Blender process-tree cleanup was confirmed and no capture process remained orphaned.

Required-unavailable Job `run-feee190a-6bcb-4e24-88f4-baec8c7fa7d1` failed with `dispatch_admission_failed:automatic_evidence_unavailable`, zero attempts and zero operational calls. The explicit `UNAVAILABLE` manifest was retained. Result: **PHYSICALLY QUALIFIED WITH THE DOCUMENTED WINDOWS BOUNDARY**.

The dashboard test verifies the visible OFF/ON control, authenticated read, rejected wrong-origin mutation, accepted authorized mutation and authoritative policy projection. Refresh reads the effective runtime state. Restart reconstructs policy from startup configuration, so it does not falsely claim that an in-memory selection persisted.

## Image capabilities and benchmark

Capability admission covers operation, input count/MIME, dimensions/multiples, formats, seed, masks, control images, transparency, batch and progress. Tests prove an incompatible provider is never called, a compatible provider can be selected, and unsupported requests never silently downgrade. Qwen continues to advertise only `image.generate`, deterministic seed and cancellation; IMG02–IMG08 remain unsupported.

The reusable benchmark freezes request identity and rejects drift/duplicate provider observations. It records output and source hashes, elapsed/inference time, retries/failures, provider identity, metrics and evidence location; subjective quality remains `HUMAN_ADJUDICATION_REQUIRED` with no generated score. Inventory found no second image model/provider already available, and the Colab notebook is another Qwen route rather than a distinct provider. Result: **CONTRACT TESTED; CROSS-PROVIDER PHYSICAL COMPARISON INCOMPLETE**.

### Qwen physical follow-up

Frozen request: 768x768 PNG, seed `20260929` (fresh-seed warm run `20260930`), unchanged cobalt-blue-cube/brass-ruler prompt, workflow SHA-256 `fed4b66423b7f4e3002e2910c342b93258f64208746a0f321494ee2173daf487`, model SHA-256 `ec114630a3dbecc925ce764a245232dc450124e7e3e7ec72000f196f25947228`.

| State | Job | Elapsed | Execution/model load | Peak VRAM | Average GPU | Peak process RSS | Raw output SHA-256 |
|---|---|---:|---:|---:|---:|---:|---|
| Cold | `run-00bd6cdc-7d81-46ed-bf11-0e00b8f6bd7c` | 382,090 ms | 382,017 ms | 13,795 MiB | 76.81% | 12,744,956 KiB | `6daa665f4bd98372b9d4465f622313b9ebf01db5c9d75d1d8e67b01d12a3d281` |
| Cached repeat | `run-a59145fb-d9e7-480e-8ab1-3f84eb4bc6c4` | 1,073 ms | 1,010 ms | 11,493 MiB | 0% (two samples) | 7,938,644 KiB | `370a8f185904620b84634b2b039899c575de5910cfaf4aaefcfda206c0fe3285` |
| Warm inference, fresh seed | `run-23b2ed17-0654-40bf-b70b-fc549173ac7a` | 299,479 ms | 299,414 ms | 13,795 MiB | 99.03% | 8,935,216 KiB | `3a7b74b9b0ab1cfa17f03b0e81d2fbaeff8505c81180690eea11c202836d7c6e` |

Warm inference was 21.6% faster than cold. Submission and output fetch were tens of milliseconds; model execution/load dominated. The cached repeat is not an inference-performance result. Power samples are component observations only and are not reported as attributable energy.

## Blender learned procedure

Two distinct supervised Jobs (`run-3d39a7f9-5336-4358-a440-a9032474d017`, `run-68ff4361-5e15-4e80-9e60-d41cf51f857a`) produced semantic traces. Agent Control extracted `bounded-industrial-mezzanine-room`, SHA-256 `695d9576f7bdcd177d899563878cb0e367303fdfba429482f8c7b17b736d752c`, with prerequisites, six ordered capability actions, checkpoints, expected validation, recovery, cancellation and completion criteria; it contains no raw Python or supervisor transcript.

Independent replay Job `run-52dbf4d9-ab9f-4e51-9c1d-6ccfa93e6c78` used a fresh file and varied dimensions/palette. It passed all 17 required checks, saved/reopened/exported the scene, reported confirmed cleanup, required no human intervention and recorded zero supervisor operational actions. `.blend` SHA-256: `6321cff0d2db4e862badf2d976790a06b451b2ec2f6ad1160ade339aa453721c`; `.glb`: `45fbd3e45a6b7dd12cd3a2fc0dff10b46775032216914d1d5d4f7dfb09447c7b`. Classification: **QUALIFIED_SKILL WITH LIMITATIONS** for this bounded procedure only.

## Colab/A100

Fresh authenticated UI observation showed CPU, T4 and v5e-1 available, while A100 was disabled and premium access was offered. The dialog was cancelled without changing or connecting a runtime. Result: **ACCESS_BLOCKED / NOT A MODEL FAILURE**. No user session was terminated and T4 was not substituted.

## Release decision

The former automatic-evidence blocker is closed by pre-dispatch admission and physical evidence. The exact complete supported-Linux result for the final versioned commit is recorded in the release publication after the post-version gate. Rollback remains released `v4.16.0` at `ed57f10bea0d7f52118e933862fdc7b177db3600`. This is a software release only; production is unchanged.

