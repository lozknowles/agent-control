# Model registry

Agent Control separates five concerns:

1. a **provider** supplies an endpoint, protocol and credential reference;
2. a **model** supplies a stable Agent Control ID and provider-native model ID;
3. a **qualification** proves capabilities on a named execution node;
4. a **role** supplies an ordered primary/fallback policy;
5. worker placement selects the node independently of model routing.

A configured model starts `UNTESTED` unless durable evidence says otherwise. Only `QUALIFIED` models can route. `QUALIFYING`, `FAILED`, `DISABLED`, wrong-node and capability-unproven candidates remain visible and fail closed.

## Configuration

```json
{
  "providers": [{
    "id": "openrouter",
    "name": "OpenRouter",
    "kind": "openai-compatible",
    "baseUrl": "https://openrouter.ai/api/v1",
    "wireApi": "responses",
    "auth": {"type": "bearer-env", "env": "OPENROUTER_API_KEY"}
  }],
  "models": [{
    "id": "glm-fast",
    "displayName": "GLM fast",
    "provider": "openrouter",
    "providerModel": "z-ai/glm-5.3-flash",
    "capabilities": ["coding", "reasoning"],
    "qualification": {"state": "UNTESTED"}
  }],
  "modelRouting": {
    "defaultRole": "coding.default",
    "roles": {"coding.default": {"primary": "glm-fast", "fallback": []}}
  }
}
```

The example is a registration, not proof that the provider currently exposes that model. Confirm the provider-native model ID and qualify it before routing. Do not add pricing unless its source and effective date are known.

## Qualification states

- `UNTESTED`: configured, no successful proof;
- `QUALIFYING`: a bounded qualification is in progress;
- `QUALIFIED`: exact provider/model/node identity passed all checks;
- `FAILED`: the latest bounded proof failed;
- `DISABLED`: explicitly unavailable for routing.

The current qualification performs basic response, bounded coding and bounded reasoning checks. Evidence stores hashes, normalized usage, latency and identity—not response text, API keys or prompts containing secrets.

## Routing order

An explicit model wins over a requested role; a requested role wins over `defaultRole`. Within a role, Agent Control evaluates primary then fallbacks. A fallback decision records every rejected candidate and reason. Set `allowFallback: false` when substitution is forbidden.

Work Parcel stages may specify `requestedRoute.model` or `requestedRoute.modelRole`. Agent Control resolves that request against the scheduler-selected node before creating the Job Run and stores the exact decision in `run.trigger.modelRoute`.

## API

Read-only projections:

- `GET /api/models/providers`
- `GET /api/models`
- `GET /api/models/:id`
- `GET /api/models/routes`

Operator-authenticated operations:

- `POST /api/models/:id/qualify` with `{"nodeId":"controller"}`
- `POST /api/models/:id/route` with node, capabilities and fallback policy
- `POST /api/configuration/systems` for provider/model upserts
- `POST /api/configuration/model-routing` for complete role-map replacement

See the **Models** dashboard tab for the same projection.
