# NVIDIA hosted model provider

This unreleased integration uses Agent Control's generic OpenAI-compatible provider, credential-residency, dynamic catalogue, model-intelligence and routing abstractions. NVIDIA-specific code is limited to validating the hosted endpoint and the basic `nvapi-` credential shape. No NVIDIA branch exists in core routing policy.

NVIDIA's current first-party [LLM API reference](https://docs.api.nvidia.com/nim/reference/llm-apis) documents hosted inference at `https://integrate.api.nvidia.com` using OpenAI-compatible `POST /v1/chat/completions`. The [API catalogue](https://build.nvidia.com/explore/discover) changes independently of Agent Control. Model IDs, count, availability, context, modalities, licence, pricing/free status, quota and rate limits must therefore come from live discovery/observations or remain `UNKNOWN`.

## Configuration

The canonical example registers the provider without a model allow-list or secret:

```json
{
  "id": "nvidia-hosted",
  "name": "NVIDIA hosted models",
  "kind": "openai-compatible",
  "adapter": "nvidia-hosted-v1",
  "baseUrl": "https://integrate.api.nvidia.com/v1",
  "wireApi": "chat-completions",
  "enabled": true,
  "auth": {
    "type": "provider-secure-store",
    "reference": "provider:nvidia-hosted"
  },
  "discovery": {"enabled": true, "path": "models"},
  "requiresAuth": true,
  "capabilities": ["chat-completions", "streaming"]
}
```

The capability list is configured/advertised seed metadata, not model qualification. The adapter accepts only HTTPS on `integrate.api.nvidia.com`; endpoint changes require an explicit adapter/configuration update after reviewing NVIDIA documentation.

## Credential ceremony

Use the same generic secure-store command as any other provider:

```bash
agent-control providers credential set nvidia-hosted
agent-control providers credential status nvidia-hosted
```

Do not place the key after the command. `set` reads hidden terminal input or supervised stdin and prints only a redacted fingerprint. Configuration retains the opaque reference; public provider/catalogue projections reduce it to `secure-store` plus status. The value is read only when authenticated discovery or inference starts and exists only in the request authorization header for that call.

Rotation repeats `set` against the same opaque reference. Revocation is:

```bash
agent-control providers credential revoke nvidia-hosted
```

See [credential residency](../credential-residency.md) for permissions, storage override, multi-account isolation and failure behavior.

## Discovery and review

With operator authentication enabled, open **Models → Provider catalogue** and select **Discover Models**, or call:

```text
POST /api/provider-catalog/providers/nvidia-hosted/discover
```

The provider's configured `GET /v1/models` operation is treated as a bounded live capability probe, not a permanent assumption. A missing, unauthorized, rate-limited, oversized, malformed or unsupported result fails closed and records only a sanitized status. A successful OpenAI-style list creates stable Agent Control IDs from canonical provider model IDs. Fields omitted from the latest successful response revert to `UNKNOWN`; they do not inherit stale values. Every model remains `UNQUALIFIED` and routing-disabled.

After reviewing the returned catalogue, choose a conservative representative sample. Current family names must come from live IDs; do not synthesize IDs for GLM, MiniMax, Nemotron, Muse Glimmer or Kimi. Run **Smoke Test** on selected entries. The five bounded probes cover:

- basic completion;
- strict structured JSON, including malformed-output rejection;
- bounded coding;
- a forced tool call where supported;
- a larger but bounded context request.

Evidence retains probe state, elapsed time, normalized input/output/cache/total usage, retry count, finish reason, safe failure class, response SHA-256 and the adapter invocation-profile ID. The exact probe contract is versioned and content-hashed. The NVIDIA adapter's bounded smoke profile uses the provider-supported `chat_template_kwargs.enable_thinking=false` control so reasoning-first models can be tested against tiny deterministic marker budgets; that extension is not applied to normal execution or the frozen benchmark. Reserved model, prompt, token, schema, tool and stream fields cannot be overridden by an adapter extension. Output-budget exhaustion is `provider_output_truncated`, with safe partial usage and hash evidence retained. TTFT is `UNAVAILABLE` in the non-streaming path. Cost, cached tokens, context occupancy, limits and quota remain unknown unless provider output or headers expose them. Raw prompts, responses, reasoning and credentials are not evidence.

Queue a smoke-tested model into the normal frozen model review. Historical attempts preserve benchmark version, quality, coding/tool reliability, schema/context behavior, latency, retries, token/cache fields, cost authority and timestamps. Hosted/local comparisons use the same frozen inputs and validators, while exact model revision and local quantization remain part of identity; apparent family similarity is not equivalence.

An authenticated operator may enable routing only after the existing model-intelligence route is `QUALIFIED` or `PREFERRED`. Enabling a model does not silently rewrite logical role order. Later degraded/quarantined/retired evidence, or absence from the latest successful catalogue, automatically withdraws dynamic eligibility. A reappearing model returns to `UNQUALIFIED` and requires fresh review plus explicit admission. A zero or unknown monetary price never outranks repeated verification failure.

## Security boundary

The exact runtime credential and known provider-key patterns are scrubbed from model output, tool arguments, model/finish metadata, transport failures, persisted catalogue state, Work Parcels, Run records, artifacts, telemetry, API/SSE, dashboard and exported diagnostics. Non-success response bodies are not persisted. Credential-like Work Parcel or Job inputs are rejected.

If authentication, discovery and representative smoke calls pass, record only provider/model identities, timestamps, normalized measurements, safe statuses and hashes. Do not retain the key, authorization header, raw body or a screenshot containing credential entry.

## Qualification state

The 2026-09-06 bounded physical run proved the secure-store credential, live authenticated discovery, dynamic registration, representative smoke calls, the frozen evaluation queue and an isolated dashboard/API/SSE projection. `GET /v1/models` returned 81 canonical IDs. The requested families present in that response included Muse Glimmer, MiniMax, Nemotron and Kimi/Moonshot; no GLM ID was advertised at that observation. Discovery did not report authoritative context limits, modalities, licences, pricing, quota or rate-limit headers, so those values remain `UNKNOWN`.

Final smoke-suite-v2 observations were:

| Canonical model | Result | Observed boundary |
| --- | --- | --- |
| `meta/muse-glimmer-30b` | `FAILED` (3/5 probes passed) | Basic, tool and bounded-context probes passed; structured and coding probes ended with provider-reported `length` and were classified as truncation. |
| `minimaxai/minimax-m3` | `FAILED` (0/5) | Every request reached the fixed 45-second timeout; no response usage was invented. |
| `nvidia/nemotron-3-super-120b-a12b` | `LIMITED` (4/5) | Basic, coding, tool and bounded-context probes passed; strict structured JSON failed independent marker validation. |
| `moonshotai/kimi-k2.6` | `FAILED` (0/5) | The advertised ID returned HTTP 404 at the configured chat-completions endpoint during this observation. |

Nemotron then entered frozen suite `agent-control-real-work-v1` (`8cb55e…`), batch `evaluation-batch-1a5ab593-ddea-452b-9015-79443d49517b`. All nine provider-executed coding, code-modification and retrieval attempts passed their independent deterministic validators, consuming 621 input plus 3,349 output = 3,970 provider-reported tokens in 57,153 ms. The other 42 of 51 attempt records were explicitly `CAPABILITY_UNAVAILABLE`, making the batch `PARTIAL` and the route only `CANDIDATE`. Cost, cached/fresh split, TTFT and current-context occupancy were unavailable. No NVIDIA model is qualified or routing eligible.

The full evidence, including before/after defect classification and dashboard reconciliation, is [Agent Control 3.9 NVIDIA hosted qualification](../evidence/agent-control-3.9-nvidia-hosted-qualification-20260906.md). Do not mass-benchmark the 81-model catalogue until the operator separately authorizes the request/time volume.
