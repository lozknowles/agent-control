# Adding an external provider

1. Add a provider with a stable ID, base URL and wire API (`responses` or `chat-completions`).
2. Reference an environment variable; never put the credential value in JSON.
3. Add one or more model entries using the provider's exact model identifier.
4. Add or update logical role mappings.
5. Start Agent Control with the referenced environment variable present.
6. Qualify each model on every node where it may execute.
7. Test the intended role and fallback policy before using it in a Work Parcel.

Example provider:

```json
{
  "id": "external",
  "name": "External Responses provider",
  "kind": "openai-compatible",
  "enabled": true,
  "baseUrl": "https://provider.example/v1",
  "wireApi": "responses",
  "auth": {"type": "bearer-env", "env": "EXTERNAL_PROVIDER_API_KEY"},
  "capabilities": ["responses"]
}
```

For a secret file, set `auth.type` to `bearer-file-env`; `auth.env` then names an environment variable whose value is the file path. `none` is appropriate only for an intentionally unauthenticated local endpoint.

The configuration validator rejects duplicate IDs, unknown provider/model references, role cycles, malformed limits/pricing and embedded secret-like fields. A missing environment variable reports authentication required and makes qualification fail closed.

For a Codex CLI provider with more than one authenticated account, add `accountProfiles` beneath that provider and bind every provider model to one `accountProfile`. Store only a `codex-home-env` reference; authenticate the corresponding home interactively outside Agent Control. Account selection must be explicit workload policy or a predeclared role route. Do not add utilization-driven fallback intended to evade or pool usage/rate limits. See [Codex integration](CODEX-INTEGRATION.md).

Provider and model edits hot-reload through the authenticated dashboard/API. Do not treat a successful endpoint health check as model qualification: qualification requires bounded inference evidence for the exact provider model and node.

## 3.6 lifecycle registry

On the unreleased 3.7 branch, configuration remains the operator-facing definition while the [provider/model lifecycle registry](../provider-model-lifecycle.md) records session-neutral discovery, immutable model recipes, qualification evidence and versioned champion/challenger policy. Register the exact provider model and recipe version, then advance it in order through benchmark, shadow and candidate evidence before ACTIVE/PREFERRED routing. Do not mutate a recipe in place or promote a model from endpoint reachability alone. Automatic production Job adoption remains disabled until the larger frozen benchmark qualifies it.
