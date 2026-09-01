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

## Fast execution

The separate `CodexFastExecutionRunner` is a mutation-capable, more tightly bounded path for the generic `FAST_EXECUTION_MODEL` class. It is not a broader version of this schema-constrained read-only tool-request provider. The execution hierarchy is `LOCAL → SPARK → STANDARD → FRONTIER`; THIN remains a harness/context profile, not a model alias. The route requires a disposable clean Git worktree, exact model-registry selection, a sealed one-file baton, one attempt, disabled multi-agent fan-out and independent Git/test verification.

Spark availability is proved with an authenticated bounded `codex exec --model gpt-5.3-codex-spark` invocation expecting an exact fixed response. The mutation runner then uses explicit `--model gpt-5.3-codex-spark`, `--ignore-user-config`, `--sandbox workspace-write`, JSONL/output-schema controls and a one-attempt policy. If exact availability or routing fails, Agent Control records the reason and may create a visible STANDARD handoff; it never silently substitutes a different model while reporting SPARK.

On qualified `codex-cli 0.144.4`, the current documented `agents.enabled=false` boolean is rejected because that client expects an `AgentRoleToml` object. A bounded direct test confirmed `features.multi_agent=false`, and 3.5 uses that installed-client compatibility switch. After any Codex CLI update, run `codex --version`, `codex login status` and `npm run benchmark:fast-execution` before the live benchmark. A changed configuration schema must be requalified in code, tests and documentation; do not remove the no-fan-out control merely to make an invocation start. See [`../fast-execution.md`](../fast-execution.md).
