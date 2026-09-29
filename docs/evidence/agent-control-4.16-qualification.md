# Agent Control 4.16 qualification record

Date: 2026-09-29

This lightweight record identifies the retained physical evidence without embedding machine-specific paths or private host names in the source distribution.

## Image generation

- Result: `PASS_WITH_LIMITATIONS`
- Job status: `SUCCEEDED`
- Provider: Qwen Image 2.1 through ComfyUI 0.37.0 on a local 16 GB GPU
- Operation: `image.generate`; 768x768 PNG; seed `20260929`
- Elapsed/inference time: 385,025 ms
- Model revision: `ec114630a3dbecc925ce764a245232dc450124e7e3e7ec72000f196f25947228`
- Workflow SHA-256: `fed4b66423b7f4e3002e2910c342b93258f64208746a0f321494ee2173daf487`
- Raw image SHA-256: `ad3aee8b3f8b79b14bc473f80bc7371dbe97a075122e136ff1f889e70f30b16c`
- Accounting: provider charge recorded as zero; no claim for electricity or total monetary cost
- Scope: generation only; edit-family and text-render operations unsupported by this provider

The separate image cancellation Job reached `CANCELLED` after three seconds, left no running or pending provider queue entries, and produced neither an image output nor an image-evidence output.

## Blender

- Result: `PASS_WITH_LIMITATIONS`
- Job status: `SUCCEEDED`
- Runtime: Blender 4.5.14 LTS, build `62c1db4208e8`
- Source SHA-256: `8a7f8f7b508439018debcab910a6fe0fe897e5fdb31c3bcdb8a335a9e963839a`
- `.blend` SHA-256: `ddfaf7252b5d41fb440a835918d080a8c4d021772540cf6843cf38cac3802138`
- `.glb` SHA-256: `a70dec87f3185e7542045466f21525e440356aa6dda03b008a894a3c002b840b`
- Validation: scene reopened; object, material, transform, camera, light and Job marker verified

The separate Blender cancellation Job reached `CANCELLED` after three seconds and produced neither an execution receipt nor scene files.

## IMG01–IMG10

| Case | Result | Boundary |
|---|---|---|
| IMG01 text-to-image | PASS_WITH_LIMITATIONS | Fresh physical Job and retained PNG |
| IMG02 single-image transformation | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG03 object addition | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG04 object removal | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG05 background replacement | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG06 preservation instruction | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG07 text rendering | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG08 multiple inputs | UNSUPPORTED_BY_PROVIDER | Rejected before execution |
| IMG09 malformed/unsupported request | PASS | Automated fail-closed admission evidence |
| IMG10 worker loss/cancellation | PASS | Fresh physical cancellation and empty queue |

## Optional and deferred work

The authenticated Colab A100 attempt was blocked because the account already had too many active sessions. Existing sessions were not terminated. No Colab worker or image result is claimed. Historical automatic-video source was not available in the reconciled repositories and is deferred rather than reported as implemented.
