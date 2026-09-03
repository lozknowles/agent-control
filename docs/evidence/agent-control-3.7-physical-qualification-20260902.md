# Agent Control 3.7 physical qualification — partial

Timestamp: `2026-09-02T19:30:26.932Z`
Verdict: **PARTIAL — CORE 3.7 IMPLEMENTATION SOUND; CROSS-NODE ACCOUNT EXECUTION NOT YET PHYSICALLY QUALIFIED**

## Frozen candidate and normal gate

- Product base: `5acdde13e41d58b511a33ac0e15f3dc6d3930613` — Agent Control 3.6 product checkpoint.
- Physical candidate: `7fb00263a126018d9593f6e44186eead1b116ebb` on `feature/3.7-token-aware-baton-routing`, pushed to `origin` before this evidence update.
- Qualification-found evidence defects corrected on this branch before the final run:
  - `4640d00bc47f3c2e6081dfc2e932187f5d270840` preserves direct-provider parcel telemetry and exposes safe context counts through the API.
  - `15579af5f8deb72a88be8cad04c970561660a15b` preserves direct-provider parcel totals in the coordinator read projection.
  - `7fb00263a126018d9593f6e44186eead1b116ebb` records the independent repository-validation verdict on the originating parcel.
- `npm run check` passed on the final candidate: TypeScript, bootstrap and dashboard syntax, neutrality, implementation-status consistency, and the complete test suite.
- No merge, tag, release, or live Agent Control deployment change was made.

## Physical Codex telemetry observation

Installed Codex was `codex-cli 0.144.4`, authenticated with ChatGPT. A genuine read-only ephemeral JSONL thread emitted `12,475` input tokens, `8,960` cached input tokens, `15` output tokens, and no reasoning-output tokens. It did not expose current context occupancy or a context-window limit. The 3.7 Codex adapter correctly records those fields as `unavailable`; it does not manufacture them from lifetime usage.

## Final governed physical Work Parcel

The final run used a disposable local configuration and state directory, not live deployment state. Its only configured provider was the running local OpenAI-compatible llama-server model:

- Provider/model: `qwen-local` / `qwen2.5-3b-instruct-q4_k_m.gguf`.
- Agent Control model identity: `qwen2.5-3b-local-qualification`.
- Qualification version: `local-llama-server-observation-20260902`.
- Frozen repository SHA: `7617cf65b51c837090775218b848b4be9fd18233`; dirty state: `false`.
- Run: `0505723f-14c8-4baa-9252-188c6fe16f81`.
- Work Parcel: `parcel-d8315858-297e-4b32-8e37-24761c25ba07`.
- Token thread: `review:0505723f-14c8-4baa-9252-188c6fe16f81:context-1-ee257147ba10`.
- Started `2026-09-02T19:30:22.682Z`; completed `2026-09-02T19:30:26.932Z`.
- Result: immutable `SUCCEEDED_WITH_FINDINGS`; the independent repository validator marked the returned finding `VALID`.
- Provider response/baton-boundary evidence SHA-256: `063430b1fdf61543420464c1d8abe9cc1dba1313a429e06a52144b6cd6c1d98f`.

The direct-provider parcel retained one invocation with independent verifier result `PASS_WITH_FINDINGS`. Its durable timeline contains `verification.completed` at `2026-09-02T19:30:26.932Z` with the detail that Parameterized Job validation accepted the consolidated review result.

## Live telemetry and reconciliation

SSE emitted `token.telemetry`, `token.governor_transition`, a final `token.telemetry`, and `job.run_changed` without a page refresh. The final dashboard, durable token-routing evidence, and Work Parcel audit reconciled exactly:

| Measurement | Value |
| --- | ---: |
| Cumulative input tokens | 418 |
| Cumulative output tokens | 202 |
| Cumulative total tokens | 620 |
| Parcel fresh/cached input | 1 / 417 |
| Context limit | 32,768 |
| Current context / percent | unavailable / unavailable |
| Cost | unavailable |
| Governor | `CONTINUE`; next threshold 75%; reason `current_context_unavailable` |
| Thread recoverable | `true` |

The provider did not report current context occupancy or provider cost. Agent Control therefore records `provider_did_not_report_current_context` and `provider_not_reported`, rather than estimates. The token thread, Work Parcel telemetry/audit, and parcel aggregate each report exactly `620` total tokens.

Captured evidence checksums:

- Run API: `283b5e5029e90f147c63c2543b992bf5d5819f3d5dd3c18f5e18518371aa06e2`.
- Token-routing API: `894311f40a3b7575b3d54199884e470e62e6eb185f1a327675301557bd79f3e7`.
- Work Parcel API: `82eeec570d1aaab4e1e19b65b52e9bc68026cf9863c93a3652d865f3e16a6b83`.
- SSE capture: `76f4e5efd65d6ef8636d20ef83065de80ac6e8d52eefbd0e42e94cd6151acaf6`.
- Durable run, parcel, and token-routing ledgers: `ca227f4170ff131a6747d179db512ea74c912e4d68a82a73b2cf75e40db828a8`, `13829dc576d2e325b9a71646fbe645de5560bb9c13cf8594476187c5550d078c`, and `2ed6cf937859c8fec2fed9f8c277a0670f9f28854f169a60a6da918bcebb4ccc` respectively.

## Gates proven and unproven

Proven physically on the final candidate:

- governed provider-backed Work Parcel creation, frozen repository provenance, no fallback, completion, and immutable result;
- live SSE telemetry/governor publication;
- durable thread telemetry, recoverable source-thread state, and exact parcel/dashboard aggregate reconciliation;
- independent verification propagated to the Work Parcel invocation and timeline;
- truthful unavailable context and cost semantics.

Not proven physically, and not simulated:

- authoritative current-context occupancy/percentage from a provider;
- `PREPARE_BATON`, `COMPACT`, and `HANDOFF` threshold transitions;
- sealed baton creation and baton SHA-256;
- real source-to-destination model handoff, destination continuation, or failed-destination recovery to the original thread;
- multi-provider `Sol → Luna → GLM-5.3-Flash` accounting and cheaper-route decision;
- cross-handoff cost-per-verified-outcome reconciliation.

Only one qualified provider route was available in the temporary physical configuration, and no configured second provider supplied a genuine cheaper, independently credentialed destination. A synthetic route, copied credential, or manufactured baton was not used. The deterministic suite covers those scenarios, but that is not physical-provider qualification.

## Required next qualification environment

Provide at least two configured and qualified provider routes: a stronger source and a genuinely cheaper destination, with credential references and pricing where cost qualification is required. Then execute a bounded real parcel with qualification-only context pressure that triggers baton preparation and handoff, deliberately make the destination continuation fail once, resume the original thread, independently verify the completed parcel, and reconcile SSE, per-thread telemetry, baton SHA-256, Work Parcel totals, model-chain totals, and cost evidence.

## Continuation audit

On the continuation attempt from `05938be9370bba6cbf3b0c53dd733a776b59f5cd`, the available physical environment still could not meet the unproven gates:

- The execution session is a remote TTY with no graphical display. Chromium and ffmpeg are installed, but explicit attempts to initialize the Computer Use, Chrome, and built-in browser surfaces returned `TypeError: tools[name] is not a function`; deferred tool search is also unbound. There is therefore no safe browser window to record. A dashboard video was not fabricated or substituted with a synthetic capture.
- The local Qwen and Qwen Coder endpoints are reachable, but neither reports current context occupancy or cost. A configured remote host resolves but its model endpoint is unreachable; the local LiteLLM health endpoint returns HTTP 500. No configured, qualified, reachable cheaper destination route exists.
- The production direct repository-review path only calls `TokenAwareBatonRuntime.observe`. It does not call `assess`, `createBaton`, or `governedHandoff`; those APIs are presently unreferenced by production source outside their runtime definition. A manual call would not qualify the dashboard's normal governed lifecycle and was not used.

These are qualification blockers, not evidence of a completed multi-provider handoff. No product redesign, synthetic telemetry, manual destination invocation, merge, tag, release, or deployment change was made.

## Post-audit production-path correction

The third continuation-audit bullet above records the defect as observed at `4a13df341c79ff3cc8cbadfed8173618722b92ea`; it is retained rather than rewritten as if the earlier physical candidate contained the fix.

The subsequent development change wires the existing token-aware machinery into `DirectRepositoryReviewExecutor`, the normal parameterized repository-review Work Parcel executor. A completed immutable chunk now supplies `observe → assess`; an eligible bounded continuation supplies sealed baton creation → governed child-contract delegation → destination provider execution; the existing parameterized-job validator remains the independent verification owner. A failed destination marks its child contract failed and resumes the same next chunk on the preserved source provider/thread. Focused deterministic tests prove the production call path and additive parcel accounting.

No physical qualification was performed after this correction. Authoritative live context, a reachable qualified cheaper provider, the real handoff/recovery sequence, dashboard recording and final physical token/cost reconciliation therefore remain unproven exactly as listed above.

## Account-aware extension remains unqualified

The subsequent account-aware routing extension adds optional `provider/account-profile/model` identity and deterministic credential-isolation, destination-binding, dashboard and ledger tests. It has not interactively authenticated or physically exercised either example profile and does not alter this report's PARTIAL verdict. A future physical continuation must qualify each selected account independently and record any rate-limit/exhaustion result truthfully; it must not rotate accounts to aggregate usage.

## Cross-node execution integration gap and correction

The next qualification setup established that the two intended Codex account homes belong to a remote Windows credential-bearing execution Resource, not the controller. SSH reachability and remote discovery of the installed Codex Desktop CLI were independently verified outside this coding step. No credential content was inspected or copied.

Review of the candidate found a second genuine production integration gap: account qualification resolved `CODEX_HOME` on the controller, `CodexRepositoryReviewClient` spawned locally, and the token handoff resolver forced the destination model onto the source node. Consequently the account-aware production path could not truthfully qualify or execute either remote profile.

The development correction adds the execution node to the sealed route identity and introduces a two-operation Codex node port. Account qualification and normal parameterized repository-review execution now dispatch through the account profile's node. The Windows SSH adapter reuses the configured Resource transport and executes only a fixed PowerShell program supplied over stdin; request values are encoded data, not generated source. The Windows node resolves its own profile reference, discovers and validates versioned Codex Desktop executables, and returns only sanitized structured results plus CLI version, executable SHA-256 and discovery time. The controller rejects provider, account, model or node identity drift and cannot substitute source-node credentials at the destination. Existing controller-local profiles retain their prior path.

Focused deterministic tests cover controller-environment non-resolution, source/destination credential isolation, node identity surviving baton sealing, mismatch rejection, bundle discovery without a fixed hash, path/raw-output omission, secret exclusion and local compatibility. This section records a development correction only: neither account was authenticated, no real remote account qualification or multi-account Work Parcel ran, and no live deployment changed. The physical qualification therefore remains **PARTIAL — CORE 3.7 IMPLEMENTATION SOUND; CROSS-NODE ACCOUNT EXECUTION NOT YET PHYSICALLY QUALIFIED**.

## First physical cross-node account-qualification attempt

On 2026-09-03, after the operator confirmed both MSI account profiles had been interactively authenticated, the first bounded physical stage was attempted from candidate `0119e336a31b6fd7a87e71de782de9fe461a3b13`. The repository checkout contained no deployed Agent Control configuration file, so the production classes were invoked with a validated qualification-only configuration containing the already verified MSI SSH endpoint, opaque account metadata, and node-local environment-reference names. No resolved Windows profile path or credential value was supplied to the controller.

The call path was the production `qualifyAccountProfile` → `ResourceCodexNodeExecutionPort.accountStatus` → configured Windows SSH Resource → fixed `scripts/codex-node-windows.ps1` program. The audited request for `cottage-plus` contained only `operation`, `providerId`, `accountProfileId`, `nodeId`, `credentialEnvironment`, and `timeoutMs`. It identified `codex-chatgpt/cottage-plus/msi` and the opaque reference `CODEX_HOME_COTTAGE_PLUS`; it contained neither a Windows absolute path nor a controller filesystem path. The remote command was the fixed `powershell.exe -NoProfile -NonInteractive -Command -` form.

The qualification failed closed at `2026-09-03T05:38:16.622Z` with the sanitized blocker `codex_node_transport_failed`. No authenticated result, CLI version, executable SHA-256, or discovery timestamp was accepted or persisted. Raw SSH/PowerShell stdout and stderr were not placed in evidence. Per the qualification stop condition, `lawrence-pro` was not attempted, no manual `codex login status` substitute was run, no workaround or product change was made, and no Work Parcel or baton lifecycle was started.

Ephemeral follow-up diagnosis established that basic TCP connectivity, MSI OpenSSH and interactive remote command execution were not the blocker. A fixed harmless command failed before remote command execution both without the Agent Control hardening flags and with the exact governed flags. The server offered public-key, password and keyboard-interactive authentication, but the controller had no SSH agent, no available controller key was accepted by MSI, and the qualification Resource had no `identityFile`. The previously successful interactive session therefore exercised an interactive authentication mechanism that the governed unattended path intentionally disables with `BatchMode=yes` and `PasswordAuthentication=no`. Host-key policy did not fail, and `cmd.exe` parsing, PowerShell invocation, stdin delivery, timeout handling and exit-status interpretation were never reached.

This is a missing governed noninteractive SSH identity/Resource configuration prerequisite, not a Tailscale, port 22, MSI OpenSSH, general SSH connectivity, Codex authentication, or demonstrated Agent Control implementation defect. No network or product configuration was changed during diagnosis.

Stage verdict: **FAILED — CROSS-NODE CODEX ACCOUNT QUALIFICATION BLOCKED BY MISSING MSI-AUTHORIZED NONINTERACTIVE SSH IDENTITY**.

Overall 3.7 verdict remains **PARTIAL — CORE 3.7 IMPLEMENTATION SOUND; CROSS-NODE ACCOUNT EXECUTION NOT YET PHYSICALLY QUALIFIED**.
