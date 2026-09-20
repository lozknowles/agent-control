# Lean feature decisions

| Feature | Decision | Evidence boundary |
|---|---|---|
| Dispatcher-owned stage-gated tools | KEEP EXPERIMENTAL | Safety tests and native Qwen execution pass; ten-task benefit still requires A/B outcome |
| Terminal allowance | KEEP EXPERIMENTAL | Native Qwen THIN completes a fourth finish-only turn; independent verifier remains authoritative |
| Strict model tool-input schema validation | ADOPTABLE GENERIC CAPABILITY | Fails before raw handler and is provider/model neutral |
| Duplicate tool-schema removal | KEEP | Exact duplicate only; required instructions survive |
| Lossless exact tool-result delta references | KEEP EXPERIMENTAL | Session-local and hash-backed; no semantic summarisation |
| Stable prefix plus dynamic tool-grant delta | REJECT | Physical rerun increased input, fresh input, output and elapsed time despite more cached tokens; prototype reverted |
| Lazy/on-demand context vault | KEEP EXPERIMENTAL | Authority is rechecked; ten-task usefulness not yet proven |
| Deterministic terminal fast path | DO NOT ENABLE BY DEFAULT | Avoids a call but needs explicit policy and does not replace verification |
| Automatic promotion to production routing | REJECT FOR 4.12 | No evidence threshold or full native A/B result yet |
