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

Provider and model edits hot-reload through the authenticated dashboard/API. Do not treat a successful endpoint health check as model qualification: qualification requires bounded inference evidence for the exact provider model and node.
