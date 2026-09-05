# Adding an external provider

1. Add a provider with a stable ID, base URL and wire API (`responses` or `chat-completions`).
2. Reference an environment variable; never put the credential value in JSON.
3. Add one or more model entries using the provider's exact model identifier.
4. Add or update logical role mappings.
5. Start Agent Control with the referenced environment variable present.
6. Qualify each model on every node where it may execute.
7. Test the intended role and fallback policy before using it in a Work Parcel.
8. Map provider-native techniques into normalized capability observations; do not add provider-name branches to core policy.
9. Queue the exact model/runtime candidate against the frozen qualification suite and review historical evidence before promotion.

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

For a Codex CLI provider with more than one authenticated account, add `accountProfiles` beneath that provider, bind each profile to its execution `nodeId`, and bind every provider model to one `accountProfile` with a matching qualified node. Store only a `codex-home-env` reference; authenticate the corresponding home interactively on that node outside Agent Control. Account selection must be explicit workload policy or a predeclared role route. Do not add utilization-driven fallback intended to evade or pool usage/rate limits. See [Codex integration](CODEX-INTEGRATION.md).

Provider and model edits hot-reload through the authenticated dashboard/API. Do not treat a successful endpoint health check as model qualification: qualification requires bounded inference evidence for the exact provider model and node.

## Capability adapter boundary (3.9)

A provider adapter may observe a native feature such as caching, resume, structured tools, asynchronous interaction, browser/computer use or provider review. It must normalize that observation into Agent Control's capability record with:

- stable capability ID;
- exact provider/model/runtime/version subject;
- `SUPPORTED` or `UNSUPPORTED`;
- `NATIVE` or `AGENT_CONTROL_EMULATED`;
- `VERIFIED` or `UNVERIFIED`;
- observation/qualification timestamp, limitations and evidence references.

Keep provider API calls and event parsing inside the adapter. Core routing consumes only normalized capability/economic evidence. A configured declaration is not proof, and a provider claim does not bypass a frozen evaluator, independent verification, runtime safety or Work Parcel criteria. If Agent Control can provide a portable emulation, register and qualify it separately rather than pretending it is native.

Model-evaluation adapters must support only the evaluator classes they can genuinely execute. Unsupported browser, computer, workflow or tool fixtures return `CAPABILITY_UNAVAILABLE`; missing credentials return `AUTHENTICATION_UNAVAILABLE`; unreachable providers and failed scoring are separate. Never translate these into a zero score or a successful attempt. Preserve only sanitized output hashes and structured measurements, not prompts, credentials or raw untrusted provider output.

## 3.6 lifecycle registry

In 3.7, configuration remains the operator-facing definition while the [provider/model lifecycle registry](../provider-model-lifecycle.md) records session-neutral discovery, immutable model recipes, qualification evidence and versioned champion/challenger policy. Register the exact provider model and recipe version, then advance it in order through benchmark, shadow and candidate evidence before ACTIVE/PREFERRED routing. Do not mutate a recipe in place or promote a model from endpoint reachability alone. Automatic production Job adoption remains disabled until the larger frozen benchmark qualifies it.

The 3.9 historical evaluator complements that registry with append-only frozen-suite batches and a conservative `CANDIDATE/QUALIFIED/PREFERRED/DEGRADED/QUARANTINED/RETIRED` review state. These records provide evidence to an operator/policy transition; they do not silently rewrite role mappings.
