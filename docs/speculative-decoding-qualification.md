# Speculative decoding qualification

Agent Control treats speculative decoding as a qualified relationship between a main model, draft model, runtime build, hardware node, and configuration. Support alone never enables routing.

The reusable `speculative-decoding-qualification@1.0.0` Job performs immutable model/runtime identity checks, tokenizer compatibility checks, current resource admission, warmed ordinary and speculative trials, output-equivalence checks, cleanup verification, and evidence retention. Outcomes are `BENEFICIAL`, `NEUTRAL`, `REGRESSION`, `INCOMPATIBLE`, `RESOURCE_BLOCKED`, or `UNSUPPORTED`.

Routing order remains:

1. avoid generation when deterministic execution is sufficient;
2. choose the cheapest adequate route when generation is required;
3. consider a locally qualified speculative relationship;
4. use it only while current resource admission passes and measured benefit remains above the explicitly configured experimental threshold;
5. otherwise retain ordinary decoding.

The llama.cpp adapter supplies runtime-specific flags and reads its reported draft/acceptance timings. The Agent Control evidence model and recommendation remain runtime, provider, model, and device neutral. Energy per token remains unavailable unless a defensible sensor is bound to the invocation.
