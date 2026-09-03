# Credential residency and execution locality

Agent Control 3.8.1 treats three locations independently:

```text
workload/repository node → immutable governed snapshot
provider execution node → provider process
credential residency node → opaque credential-store reference
```

The recommended deployment keeps credentials on the Agent Control controller, or on a designated credential/provider-execution node. Managed workload nodes do not need provider credentials. Remote credential residency remains supported where policy requires it.

Agent Control moves immutable repository bundles, Context and Evidence Packets, Work Parcels, batons, and provider-neutral metadata. It does not move access or refresh tokens, OAuth files, cookies, API keys, or provider credential stores. Workload-node authority does not imply credential-node authority.

## Configuration

An account profile declares provider execution and credential residency explicitly:

```json
{
  "id": "account-a",
  "label": "Account A",
  "providerExecutionNodeId": "controller",
  "credentialResidency": {
    "nodeId": "controller",
    "store": {"type": "codex-home-env", "env": "CODEX_HOME_ACCOUNT_A"}
  }
}
```

Store types are `codex-home-env`, `api-key-env`, `bearer-file-env`, and `provider-secure-store`. Values are references, never credentials. For Codex CLI homes, provider execution must occur on the credential node. The model's qualified `nodes` are provider-execution nodes; a Job's repository `node` is its workload node.

The 3.8 shape remains compatible: `nodeId` becomes both provider-execution and credential-residency node, while `credentialStore` becomes the residency store. New configuration should use the explicit fields.

## Whole-repository review

For a remote Windows repository, the fixed managed-node snapshot operation validates the configured root and Git ref, rejects tracked credential-like paths, records the source commit and dirty-state fingerprint, and returns a content-hashed `git archive`. The controller verifies the archive hash and path safety, extracts it read-only, and sends the frozen context to the selected provider execution node. Mutable working trees and credentials are not copied.

Routing exposes `workloadNodeId`, `providerExecutionNodeId`, and `credentialNodeId`. Qualification and invocation fail closed for a missing/unavailable credential node, disabled or unqualified account, wrong execution node, route identity mismatch, invalid snapshot, source/hash mismatch, or policy mismatch. Predetermined account fallback records every rejected candidate and reason; it is not quota-evasion rotation.

## Windows account status

The governed Windows runner discovers a valid Codex Desktop executable under `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`. `codex login status` runs as a supervised native process with finite input, node-local stdout/stderr files, a bounded lifetime, kill-on-timeout, and cleanup. Only a sanitized classification, CLI version, executable SHA-256, and timestamp return. An unauthenticated account reports `codex_chatgpt_auth_required`; raw process streams and paths never enter durable state.

See [Codex integration](models/CODEX-INTEGRATION.md), [provider/model lifecycle](provider-model-lifecycle.md), [token-aware baton routing](token-aware-baton-routing.md), and the [3.8.1 migration](migration-3.8.1.md).
