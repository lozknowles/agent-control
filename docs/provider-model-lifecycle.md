# Provider and model lifecycle

Agent Control 3.6 development adds a session-neutral durable lifecycle registry. Providers, immutable model recipes, qualification evidence and routing policy survive controller and client sessions; none is discovered merely because one interactive session can reach it.

## Logical providers

A logical provider records:

- stable provider ID and kind;
- HTTPS endpoint, or loopback HTTP for a local service;
- an indirect credential reference such as `env:MODEL_PROVIDER_KEY` or `file-env:MODEL_PROVIDER_KEY_FILE`;
- currently observed capabilities and provider model IDs;
- observation timestamp.

Literal credentials and credentialed URLs are rejected. Discovery updates capabilities/models only; provider identity, endpoint and credential reference are immutable under the same ID. Machine placement is not embedded in provider identity.

The same shape covers OpenAI/Codex routes, local OpenAI-compatible or llama.cpp endpoints, external OpenAI-compatible providers and GLM-5.3-Flash. `Ox` remains accepted only by the existing historical compatibility normalizer and is not a separate model recipe.

## Immutable model recipes

A recipe key is `recipe-id@version`. It seals exact provider, provider model, model version, capabilities, context/output limits, tool support, node requirements and runtime requirements with a SHA-256 fingerprint. Changing any field requires a new recipe version.

## Lifecycle

```text
DISCOVERED
  → BENCHMARKING
  → SHADOW
  → CANDIDATE
  → ACTIVE
  → PREFERRED
  → DEPRECATED
```

Transitions cannot be skipped. SHADOW requires verified benchmark evidence; CANDIDATE requires verified shadow evidence; ACTIVE requires verified candidate evidence; PREFERRED requires verified comparison evidence. Deprecation is evidence-linked. Evidence includes exact recipe identity, sample size, references, verified outcome, and latency/cost only when measured.

## Champion/challenger routing

Routing policy is immutable and versioned. Each role names one ACTIVE/PREFERRED champion, qualified challengers, requirements and one of `manual`, `benchmark`, `shadow` or `candidate` mode. Publishing creates a new version and never rewrites prior policy. Routing returns exact recipe/provider/model identities.

Historical replay scores retained observations without changing active policy. Verified-success rate dominates; known cost and then latency break ties. Missing cost remains `null`, not zero. A rollback selects an immutable earlier policy only with verified rollback evidence.

## Current boundary

The registry, transition gates, replay, policy versioning and rollback are implemented and deterministic. The [physical multi-provider qualification](physical-multi-provider-qualification.md) exercises exact Luna, local Qwen and GLM-5.3-Flash identities once, but does not promote their immutable recipes to ACTIVE/PREFERRED. The larger frozen benchmark still has no physical observations, so automatic production Job routing remains disabled.
