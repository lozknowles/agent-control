# Codex external-provider integration

Agent Control can invoke Codex with one registry-selected external model without editing the operator's normal Codex configuration.

`materializeCodexModelConfig` creates a mode-0600 temporary `CODEX_HOME/config.toml` containing only:

- selected provider and provider-native model ID;
- provider display name and base URL;
- `wire_api = "responses"`;
- the approved credential environment-variable name;
- disabled history persistence.

The credential value remains in the process environment and is never written to configuration, output or evidence. `runCodexWithRegisteredModel` sets the temporary `CODEX_HOME`, asks Codex to load it, preserves the existing read-only/ephemeral execution envelope and removes the directory in `finally`.

Current Codex custom-provider configuration supports the Responses wire API. Agent Control therefore rejects a `chat-completions`-only provider for Codex instead of guessing an unsupported setting. The generic provider client can still use Chat Completions directly when configured.

This provider materialization does not bypass Agent Control policy. The model must first be qualified on the selected node, Work Parcel/Job routing records the exact selection, Codex may return only a schema-constrained request, and the existing live `ToolPolicy` gateway authorizes any tool execution.

The operator's existing `~/.codex/config.toml`, profiles and authentication files are neither copied nor modified.
