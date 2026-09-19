# Agent Control 4.9 phone-hosted local model computer-use candidate

Date: 2026-09-19

## Starting-state verification

| Item | Verified state |
|---|---|
| Public `main` | `fe9a879e4360d3249c44ee21f0279761a182bd0d` |
| Public `v4.9.0` target | `fe9a879e4360d3249c44ee21f0279761a182bd0d` |
| PR #25 | Open, mergeable, head `b9bd904115ad1c6addcf17c009a045ab618e3213` |
| PR #25 RAW_INFERENCE implementation source | `7608ac62889dc3ffc46ce658d3d574155ac6fa37`; reviewed and selectively reused, not treated as released |
| OpenCodex worktree | Clean at public main; no commits beyond main and no implementation to reuse |
| Candidate branch | `feature/4.9-phone-local-model-computer-use-20260919` |
| Candidate base | public `main` above |

The public source already had authenticated ACP, durable governed jobs and cancellation, Android/Termux discovery and recovery, an evidence ledger, protected dashboard projections, and a bounded Playwright browser worker. ACP is not MCP. The Android node did not provide a local-model outbound lease/poll loop. The dashboard did not yet have a complete four-party projection for ChatGPT ingress, controller, phone model worker, and PC computer-use worker.

## Gap matrix

| Capability | Result | Evidence |
|---|---|---|
| Durable governed job/cancellation | Already supported | Existing Job runtime; cancellation persistence ordering imported from qualified PR #25 change |
| Bounded computer-use action | Already supported | `browser.session@1.0.0`, destination policy, screenshot hashes and cancellation |
| Generic tool-free inference | Implemented from reviewed qualified candidate | `DirectInferenceRuntime`; PR #25 remains unreleased |
| Narrow official MCP tools | Implemented and tested | Seven-tool `McpServer` surface; official SDK in-memory client test |
| Per-user HTTP/TLS/tunnel authentication | Partially implemented | Tool adapter binds a fixed authenticated actor; transport/tunnel deployment is intentionally absent |
| Outbound phone worker | Implemented and tested at adapter level | Authenticated lease, loopback endpoint restriction, typed proposal only |
| Physical Android local model | Blocked | Ed's phone/model/runtime were not identified or authorised in this parcel |
| Governed PC execution | Implemented at port/contract level | Existing browser worker is the intended port; no physical authorised PC selected |
| Approval/rejection | Implemented and tested | Exact approval ID; rejected action remains terminal and durable |
| Cancellation/cleanup | Implemented and tested | Fence persisted before abort; descendant cleanup must be confirmed |
| Restart/recovery | Partially implemented | Durable reconstruction is tested; physical disconnect/reconnect is unqualified |
| Dashboard projection | Partially implemented | Durable record has all parties, states, usage, screenshots and events; production dashboard rendering is not wired |
| ChatGPT mobile end to end | Blocked | No private MCP transport configured and no official app physical execution |

## Architecture implemented

`ChatGptComputerMcpAdapter` is the ingress adapter. It has no model or browser access. `PhoneComputerTaskRuntime` is the durable controller state machine. The phone worker obtains an outbound lease, calls only its loopback model, and returns a typed proposal. Agent Control validates the proposal, waits for an exact approval when required, and dispatches through `ComputerUsePort`. The existing browser action is the intended production implementation of that port.

The proposal schema permits navigation, wait, text extraction/query, click, non-sensitive text entry, submit and screenshot. It rejects private/unlisted destinations, credential-like fields, JavaScript and all unknown actions. Page content is model input only; it cannot grant an action capability.

## Evidence integrity

The task store is an operational durable record and is written atomically. Prompts and screenshots are protected in status projections; authorised evidence retains them. Events distinguish the model proposal, Agent Control decision, approval, computer dispatch, observed result and cleanup. Missing token/cache/reasoning figures stay `null`, never zero. Local/free classification is only available through the reviewed direct-inference route when the provider registry proves a local provider.

## Qualification completed

- Complete `npm run check`: PASS.
- Full regression suite: 1,840 passed, 0 failed, 0 skipped (298.163 seconds).
- Distribution, typecheck, bootstrap syntax, dashboard syntax, neutrality and implementation-status gates: PASS.
- Clean packed install: PASS (`agent-control 4.9.0`; candidate modules import from the installed artifact).
- Authentic public-v4.9.0 package upgrade: PASS; initialized configuration SHA-256 remained `150339fe5eb80186f31118958346c9e3066e943be066790ce497bb08f1562060`.
- Focused direct inference and phone computer-use tests: pass.
- Official MCP SDK client can list exactly seven tools and start a governed task: pass.
- Worker token reference cannot authenticate; only a token matching the stored one-way digest can claim: pass.
- Public or credential-bearing phone model endpoints: rejected.
- Consequential proposal: stops for exact approval.
- Rejection: durable, no dispatch.
- Cancellation: durable fence precedes abort and confirmed descendant cleanup is required.
- Controller restart: does not invent completion.
- Unsupported direct-control actions and sensitive input fields: rejected.

## Physical qualification

Not performed. The candidate does not claim that a local model runs inside ChatGPT. It does not claim Ed's phone is qualified. It does not claim a real ChatGPT-to-phone-model-to-PC execution. No model was downloaded, no phone service was changed, no PC worker was controlled, no public endpoint was created, and no production routing changed.

## Remaining mandatory work

1. Identify and explicitly authorise Ed's Android phone and the PC computer-use worker.
2. Confirm an already-present structured-output-capable phone model and its checksum; do not use MiniCPM5-2B based on the existing failed structured-repair evidence.
3. Configure an authenticated private MCP transport accepted by the official ChatGPT app.
4. Wire the durable runtime to the production Job/browser action and dashboard projection.
5. Run the fifteen physical scenarios from the brief, including approval, cancellation, disconnect, process failure, restart and network-exposure checks.
6. Run clean install, public-v4.9.0 upgrade, full regression, and visual qualification after the production wiring exists.

## Verdict

**PASS_WITH_LIMITATIONS** for the isolated architecture and adapter candidate.

The required product-level and physical end-to-end verdict remains **BLOCKED** until the mandatory work above is evidenced. No PR should be opened yet because the user permitted a PR only after successful qualification.
