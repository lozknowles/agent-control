# Real adaptive-harness execution qualification — 2026-08-24

## Verdict

**REAL_HARNESS_EXECUTION_QUALIFIED** for the tested OpenAI-compatible structured-chat provider family.

This qualification is deliberately narrow. It proves one model-backed Job Action and a second model substitution through the same authoritative path. It does not expand the Job Catalog, scheduler or dashboard, and it does not make opaque CLI-internal tools policy-visible.

## Classification

### EXPERIMENTALLY VERIFIED

- Controller: Windows control host; Agent Control branch `integration/3.1-adaptive-harness-dispatch`.
- Provider host: existing private remote Linux model host; no model service restart or configuration change.
- Primary model: `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf`, OpenAI-compatible `/v1/chat/completions` transport.
- Second model: `qwen2.5-3b-instruct-q4_k_m.gguf`, same Job and provider factory through a different qualified recipe.
- Both model discovery requests returned HTTP 200 and matched the configured model identity before candidate construction.
- Both Jobs reached `SUCCEEDED`, produced one typed `qualification-result/v1` artifact, passed `real-model-tool-evidence`, and recorded `step.verifying` with status `VERIFYING` before policy acceptance.
- The primary model response ID was `chatcmpl-rKzU4EWdFfRRkA1PAQNQTx2Rw5oqS31i`; response SHA-256 was `2ccc7b43eaeb5f5acbcc5d24dc9105066b6f504d4f4cb48e2ab464c2e8c42d92`.
- The second model response ID was `chatcmpl-3T48eQpV6tSZxujr0oOkEXxeum6MrQs3`; response SHA-256 was `3e0c1da5fa3981e8966c41964854cac471e1d985229704a7f1aed0393e3af4a8`.
- Tool-policy audit allowed exactly one `qualification.inspect` request in each successful Job.
- `qualification.denied` was rejected as `tool_not_granted` and its raw handler was never called.
- Changed lease generation was rejected as `stale_lease_generation`.
- Changed ownership generation was rejected as `stale_ownership_generation`.
- During a retained live recipe, the first tool call succeeded; after ownership changed to human, the next call was immediately rejected as `human_owns_execution`.

### SOURCE VERIFIED

- `ActionRegistry` distinguishes deterministic `control` handlers from model-backed `agent` handlers.
- `registerAgent` accepts only an `adaptive-harness` action handler.
- `HarnessJobAgentAction` delegates only to `HarnessDispatcher` and returns `verification-pending`, never acceptance.
- `StructuredChatProviderFactory` exposes only recipe tool identifiers to the model. Raw handlers remain exclusively in `ToolHandlerRegistry` behind `ToolInvocationGateway`.
- Model output is a request, not execution. It must be one strict JSON object (or one isolated JSON code fence), with no unknown top-level fields, before it can reach the gateway.
- Live authority is re-read for every tool invocation; retained recipe objects cannot preserve stale permission.
- The Job runtime rejects an Agent Action that omits the verification boundary.

### NOT TESTED

- A production API provider: the available project credential failed official authentication and was not reused.
- Native function-call objects from a hosted provider; the qualified local models emitted bounded structured JSON tool requests.
- Internal tool calls made by opaque CLI agents. Such a CLI is not integrated by this change because its individual tool calls cannot currently be passed through `ToolPolicy`.
- Production deployment, production Jobs, release merge or release tag.

## Exact path

```text
Job real-harness-qualification@1.0.0
  -> ActionRegistry (kind=agent)
  -> HarnessJobAgentAction
  -> HarnessDispatcher
  -> AdaptiveHarness.build()
  -> ExecutionRecipe
  -> StructuredChatProviderFactory executor
  -> real model emits qualification.inspect request
  -> ToolInvocationGateway
  -> ToolPolicy.authorize()
  -> control-plane qualification.inspect handler
  -> provider/tool evidence and typed artifact
  -> Job VERIFYING / verification-pending boundary
  -> independent Job verification
  -> SUCCEEDED
```

Worker placement, model routing and scaffolding remain separate inspectable decisions in the recipe record. The recipe contains the worker, provider/model, prompt profile, context tier, skills, granted tools, runtime settings, authority generations and verification policy; it contains no credential.

## Runs and durable hashes

Ignored raw qualification records were retained locally and were not committed because they include machine-local run identity. Their SHA-256 hashes provide durable correlation:

| Run | Outcome | Raw record SHA-256 |
| --- | --- | --- |
| Initial coder attempt | Failed closed: `provider_tool_request_invalid_json`; no tool audit or artifact | `89402c0b829cb3e34d3b2afbcf28fb92c8805efa513da39f93be74e9ac1c8764` |
| Coder retry after bounded single-fence normalization | Qualified | `2786ad4964f2d9085318677db40aa28013b3935c787cb9cbfc8a7435cf7801e3` |
| General instruction model substitution | Qualified | `c909e9a44ab069d5130728b5d4aad29b8b04631aa42aa45af29defcbc7fc175e` |

The first failure is evidence, not a pass: the provider returned HTTP 200 but wrapped the JSON document in a single Markdown JSON fence. The adapter was changed to normalize only one isolated JSON fence. Surrounding prose, malformed JSON and unknown top-level fields still fail before the gateway.

## Verification commands

```text
npm run typecheck
node --import tsx --test --test-concurrency=1 \
  src/control/structured-chat-provider.test.ts \
  src/control/harness-job-action.test.ts \
  src/control/harness-dispatch.test.ts \
  scripts/harness-boundary.test.mjs
npm test
npm run check:dashboard
npm run check:neutrality
node --check scripts/control-plane.mjs scripts/config.mjs scripts/qualify-all.mjs
npm run qualify:harness-real
git diff --check
```

Windows results at the evidence point: typecheck PASS; focused 13/13 PASS; serial suite 231/231 PASS; dashboard syntax PASS; neutrality 3/3 PASS; tracked-env scan clean; credential scan clean.

The complete Linux `npm run check` result is recorded in the final branch commit once the isolated Linux test transport is available. It is not inferred from Windows results.

## Authority and opaque executors

`ControlAction` remains a named deterministic control-plane operation. Only `AgentAction` enters the adaptive harness. The provider executor receives the `ToolInvocationGateway`, not raw handlers. Provider output cannot mutate scheduling, leases, ownership, PTYs or verification state.

The installed CLI provider was deliberately not adapted. A read-only process sandbox is not proof that every internal CLI tool invocation passed through `ToolPolicy`. Until a CLI exposes a mediable tool protocol, Agent Control must apply a separately qualified process capability envelope and must not represent its internal tool calls as universally policy-gated.

No production deployment, service change, lease mutation, PTY write, scheduler expansion, dashboard expansion, merge or release tag occurred during this qualification.
