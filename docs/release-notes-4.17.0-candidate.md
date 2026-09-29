# Agent Control 4.17.0 candidate checkpoint

Status: **NOT_RELEASED**. Package version remains `4.16.0`; no tag, push, publication or production deployment was performed.

This checkpoint adds provider-neutral image capability negotiation, a frozen image benchmark contract, governed automatic-visual-evidence contracts and dashboard controls, and semantic Blender procedure extraction/replay. Focused implementation checks and physical Qwen/Blender experiments succeeded, but the automatic-evidence mandatory gate is not complete.

## Proven in this checkpoint

- incompatible image features are rejected before provider invocation and may be rerouted only to a compatible provider;
- Qwen Image 2.1 remains generation-only, with IMG02–IMG08 unsupported;
- frozen benchmark requests retain exact identity, hashes, timings, failures and resource fields without inventing a quality score;
- two supervised Blender Jobs yielded a six-step semantic procedure rather than a command transcript;
- an independent fresh-file replay with varied dimensions/palette passed all 17 objective checks with zero human or supervisor operational actions;
- genuine cold and fresh-seed warm Qwen runs retained raw outputs and telemetry.

## Release blocker

Automatic evidence has contract/unit/UI coverage but no registered physical capture provider. Moreover, required capture is started from the Job event stream after dispatch, so capture unavailability cannot yet fail admission before the operational action. This contradicts the mandatory continuation-policy requirement and prevents a 4.17.0 release decision.

