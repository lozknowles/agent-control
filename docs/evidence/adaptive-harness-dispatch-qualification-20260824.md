# Adaptive harness dispatch qualification — 2026-08-24

Status vocabulary: **EXPERIMENTALLY VERIFIED**, **SOURCE VERIFIED**, **INFERRED**, and **NOT TESTED** have their literal meanings. No source inspection or deterministic fixture is promoted to live-substrate qualification.

## Git boundary

| Item | Evidence |
|---|---|
| Recovered harness commit | `a12f3afbdce9dfebf697e7a42801c1d7f8dd7fcd` |
| 3.0.x baseline merge | `30c38427528b33ee5e63a86c68f6930b72419063` |
| 3.1 source baseline | `1866f049d79e6cae4f83d3f7fb82fc02c88b13c8` |
| 3.1 harness merge | `232491fef68dc24c3ffa05cfb509b95912384334` |
| Default dispatch implementation | `5dfa49e9bad3153a93474e89460d454ada3ca8a0` |
| Live fencing/verification follow-up | `b1972f28b3bd84fea42c43f00477ec541dff3765` |
| Branch | `integration/3.1-adaptive-harness-dispatch` |
| Qualification time | `2026-08-24T13:42:42+01:00` |

The immutable 3.0.1 tag was not changed. No release tag, deployment, service, production state, lease, ownership or PTY was changed.

## Architecture trace

```text
Work Queue item
  -> WorkCoordinator (eligibility, priority, worker placement, queue claim)
  -> WorkExecutor (normal work requires adaptive-harness dispatch)
  -> AdaptiveWorkDispatch
  -> HarnessDispatcher
  -> AdaptiveHarness.build()
  -> fingerprinted ExecutionRecipe + RecipeDispatchRecord
  -> RecipeExecutor
  -> ToolInvocationGateway
  -> ToolPolicy.authorize(live authority and capability state)
  -> registered raw tool handler / execution substrate
  -> execution evidence
  -> verification-pending
  -> separate verification and acceptance
```

Worker placement happens before recipe construction. Provider/model routing occurs inside the placed worker's candidate set. Scaffolding is visible in the recipe. These are separate decisions and records.

## Experimentally verified

- `WorkExecutor` rejects any dispatch object whose path is not `adaptive-harness`.
- A normal queued task builds a real `ExecutionRecipe`, invokes an allowed tool and ends at `verification-pending` rather than `completed`/accepted.
- A tool omitted from the recipe cannot reach its raw handler.
- A retained gateway re-reads live authority; human takeover immediately rejects a second tool call and the raw handler is called only once.
- Stale lease identity is rejected after a recipe-dispatch store restart.
- Revoked/unavailable tools, worker mismatch, policy denial and missing privilege approval fail closed.
- Secret-like runtime keys fail recipe construction before fingerprint/persistence.
- Different execution intents produce different prompt/skill/tool/runtime recipes under the same authority and verification policy.
- A small-model fixture is unroutable without its qualified scaffolding and routable with it. This proves composition logic, not real-model quality.
- Android provisioning remains functional as a named, scope-checked control operation and cannot act as an implicit agent fallback.
- Existing Orca authority tests still prove stale identity/lease rejection and the human takeover fence across adapter restart.

Focused command:

```text
node --import tsx --test --test-concurrency=1 \
  src/control/adaptive-harness.test.ts \
  src/control/harness-dispatch.test.ts \
  src/control/work-executor.test.ts \
  src/control/android-provisioning.test.ts \
  src/control/orca-execution-provider.test.ts \
  src/control/pty-registry.test.ts
```

Result: `33/33 PASS`.

Full serial result on Node.js `v22.18.0`: `226/226 PASS`; TypeScript PASS; dashboard syntax PASS; neutrality `3/3 PASS`; bootstrap JavaScript syntax PASS; bypass-boundary scan `2/2 PASS`; `git diff --check` PASS. The Bash syntax portion of `check:bootstrap` was **NOT TESTED** on this Windows worktree because no Bash/WSL distribution was installed. The 3.0.x merge commit independently passed the complete Linux gate at `166/166` before integration.

The updated seven-page operator guide PDF was rendered and visually inspected, with required harness text extracted successfully. SHA-256: `8994e027314dfed2ccd8cbd3b2b67a3e10f3892273d53effbf42f1d88df41e12`.

## Source verified

- `src/control/adaptive-harness.ts`: recipe composition, qualified-only skill selection, minimum grants, live policy reasons and credential-safe runtime rejection.
- `src/control/harness-dispatch.ts`: placed-candidate filtering, policy-only gateway, audit events, durable/inspectable recipe record and execution-not-acceptance result.
- `src/control/work-executor.ts`: default adaptive dispatch, named control-operation exception and `verification-pending` transition.
- `src/adapter.ts`: generic agent adapters receive a recipe and `ToolInvocationGateway`, not scheduler/lease/ownership services.
- `src/control/orca-execution-provider.ts`: Orca remains behind the execution contract with independent execution-identity and ownership fences.
- `src/control/job-runtime.ts`: current Job Actions are registered control-owned handlers with separate worker placement, artifact verification and Run authority.

## Tool-policy coverage

| Adapter/executor | Policy enforced? | Evidence | Remaining gap |
|---|---:|---|---|
| Work Queue normal agent dispatch | Yes | `harness-dispatch.test.ts`, `work-executor.test.ts` | Product configuration still needs real candidate/executor factories |
| Generic `AgentAdapter` contract | Yes by supported contract | TypeScript interface requires recipe + gateway | No non-null live adapter is configured in this branch |
| Registered gateway tool handlers | Yes | Omitted-tool and live-takeover tests | Each future handler needs its own risk/capability qualification |
| Named control operations | Not an agent path | Explicit metadata, registry and scope test | Keep list narrow; never use as agent fallback |
| Orca execution/input | Execution authority fence yes; per-tool no | Orca restart/takeover tests | Tools used internally by the CLI are opaque |
| SSH transport | Execution identity boundary only | Execution-provider source | No independent model tool protocol is exposed |
| HTTP/Android node | Remote node enforces its allowlist | `node-client.test.ts` | Direct client is control-owned; agent use must be a gateway handler |
| Browser/mobile automation | Not qualified as agent tools | No normal adapter call site | Must register policy-gated tools or use an approved sandbox capability |
| Local/API model adapters | Contract prepared | `AgentStartContext` source and typecheck | Live adapters and completion protocol not implemented |
| Job `ActionRegistry` | Agent path not yet enforced | Job source and deterministic qualification | Any model-backed Action must delegate to `HarnessDispatcher` |

## Fail-closed result

Harness policy denial carries `retryable=false`. `WorkExecutor` does not substitute a legacy handler. A recipe cannot be reused after human ownership, lease generation, ownership generation, tool revocation, capability loss, worker mismatch or policy/privilege withdrawal. `RecipeDispatchRecord.phase=EXECUTED` means substrate execution returned; it never means verification or acceptance.

## Inferred

- The recipe-dispatch store is a compatible precursor to Run Ledger integration because it records the same task/placement/route/authority/evidence decision dimensions without owning Run state.
- An execution substrate that exposes every model-originated operation as gateway calls can satisfy universal tool moderation without becoming part of Agent Control policy.

## Not tested / remaining

- Real CLI-internal tool interception for Orca, SSH, browser, mobile, local or API agents.
- A production-configured Work Queue candidate/executor factory; the TUI currently displays the queue but does not autonomously run a live model adapter.
- Model-backed Job Action to harness dispatch; current Job qualifications use deterministic control-owned handlers.
- Dynamic skill proposal, static/security analysis, sandbox qualification, approval and promotion.
- Real-model quality comparison; the smaller-model result is deterministic composition evidence only.
- Bash syntax in the final Windows worktree and any production deployment.

## Verdict at this checkpoint

The 3.0.x harness recovery is durably merged. The 3.1 default Work Queue execution contract and central gateway are implemented and regression-clean, but universal external-adapter and model-backed Job Action enforcement are not yet qualified. The correct release posture is therefore to retain these as explicit 3.1 acceptance items rather than claim universal tool mediation prematurely.
