# Agent Control 4.17.0

Agent Control 4.17.0 adds provider-neutral image capability negotiation, a frozen image benchmark contract, bounded semantic Blender procedure learning/replay, and governed automatic visual evidence.

## Automatic visual evidence

- Normal Windows web startup registers the platform-specific `ffmpeg-windows-desktop` adapter behind the provider-neutral capture contract.
- A Job dispatch guard now resolves and starts REQUIRED capture before creating an operational attempt or invoking the action.
- Required unavailability is explicit and retained; deterministic qualification recorded zero attempts and zero operational calls.
- Captured MP4 bytes, immutable manifest, Job and evidence IDs, timestamps, overlay history, SHA-256 hashes and retention policy are bound to the Job artifact store.
- Cancellation finalises evidence as `CANCELLED` and uses ordinary owned-process cleanup for the operational application.
- The authenticated, same-origin dashboard switch controls the same in-memory policy used by Job admission. Restart state is reconstructed from startup configuration and reported as such; persistence of an interactive selection across restart is not claimed.

Physical qualification used Blender 4.5.14 and FFmpeg 8.1.1 on MSI. The successful ordinary Job produced a 14.5-second 1920x1080 H.264 MP4 with visible Agent Control overlay and Blender result. The separate cancellation run produced a 6.7-second MP4 and confirmed process-tree cleanup.

## Image and Blender capabilities

- Image admission negotiates operation, input constraints, dimensions, formats, seed, masks, control/reference input, transparency, batching, progress, cost and cancellation without silently dropping requirements.
- Qwen Image 2.1 remains physically qualified only for IMG01 generation. IMG02-IMG08 remain unsupported and are rejected before execution.
- A second legitimate image provider was unavailable, so no physical cross-provider quality comparison is claimed.
- The learned Blender result qualifies one bounded six-stage procedure. Independent fresh-file replay passed 17/17 checks with zero human intervention and zero supervisor operational actions; this is not general Blender autonomy.

## Retained boundaries

- Colab A100 remained `ACCESS_BLOCKED`; it was not converted to a model failure and no session was changed.
- Qwen cold inference was 382.1 seconds and genuine fresh-seed warm inference was 299.5 seconds, a 21.6% improvement. The roughly 1.1-second same-seed repeat was cache reuse, not inference.
- This GitHub software release is not a production deployment. No production service or configuration was changed.
- Rollback remains `v4.16.0` at `ed57f10bea0d7f52118e933862fdc7b177db3600`.

See the [qualification report](evidence/agent-control-4.17-qualification.md), [evidence manifest](evidence/agent-control-4.17-evidence-manifest.json), and [known limitations](known-limitations-4.17.md).
