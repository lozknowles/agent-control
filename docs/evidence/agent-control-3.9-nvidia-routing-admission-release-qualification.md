# Agent Control 3.9 NVIDIA routing-admission release qualification

## Verdict

`PARTIAL`

The generic retry-exhaustion continuation, complete product transcript, real dashboard projection and controlled resilience lifecycle are qualified. The principal natural `LIVE` Run is not a release pass: its schema-valid NVIDIA GPT-OSS review missed one criterion frozen before submission—the capacity hold check/commit race. Production admission recommendation for the exercised NVIDIA GPT-OSS 20B route is `DO_NOT_ADMIT`; its configured `routingEligible` value remains `false`.

This report indexes Agent Control's durable evidence. It does not replace or reconstruct either product-generated transcript. The earlier animated/tournament capture is obsolete demo evidence and is not used by this gate.

## Scope and provenance

- Repository integration checkpoint: `1f13427ad07b25676285860c435afe833ecffe61`
- Failover/transcript implementation: `e9eddb3180ee7d7fb9b993667f073d975c6935e1`
- Physically exercised source: `9fded3cfc1c8f25a78679eca43c569b6e76b84be`
- Branch: `qualification/3.9-nvidia-routing-admission-release`
- Qualification root: `/fast/qualification/agent-control-3.9-routing-admission-release-20260907`
- Execution dates: 2026-09-07 UTC
- Product version reported by both recordings: Agent Control 3.9.0
- Release action: none; no merge, tag, release, deployment or production route enablement

The qualification root is owner-only (`0700`). Large videos, screenshots, runtime stores and complete transcripts remain outside Git. The final qualification manifest content-addresses them.

## Generic failover and transcript delta

The production parameterised repository-review lifecycle now implements:

`selected route → provider invocation → safe transient classification → one bounded same-route retry → retry exhaustion → provider-neutral governor assessment → sealed failure baton → exact qualified destination → destination execution → independent verification/recovery → terminal Run`

Every invocation remains a separate immutable Work Parcel leg. A transport failure is not model-quality evidence. Unknown failed-leg tokens/cost remain unknown in aggregate accounting. The source thread remains recoverable, route changes are explicit, and provider/account/model/node identity is checked against the sealed destination.

`ExecutionTranscriptRuntime` concurrently materialises the complete Run-associated event projection as Markdown. It records content and source-projection SHA-256 values and reconstructs from durable stores at startup. “Complete” means every retained observable Run/Parcel/provider/tool/governor/baton/verification event; it deliberately excludes credentials, raw provider transport, discarded bodies and private reasoning.

OpenAI-compatible requests use a dedicated Undici dispatcher so its ordinary headers/body waiting does not pre-empt Agent Control's bounded invocation signal. Native Undici timeout codes and opaque fetch transport failures are normalized at the adapter boundary. This does not claim control over provider-side or intermediary timeouts.

During final regression, the infrastructure-neutrality gate found two absolute capture paths in an older Crew video manifest. The qualification generator and historical manifest were changed to retain repository-relative paths. This was a distributability defect, not a qualification-result change.

## Frozen natural input

- Fixture directory: `natural-fixture`
- Fixture commit: `093f2121402283376b6ad12f755bbfbc3594a97d`
- Fixture state: clean
- Fixture tests: 3/3 pass
- Success-criteria SHA-256: `57f505a3018175b1d295f1d3faf23d7c38b1c4f72372c1c1cbae102f0cc7ab87`
- Natural configuration SHA-256: `c7b2b5cceaed80a2784311dd417ef5d746adf0d78ac1c90e0e0413cfa88b1140`
- Natural Saved Job SHA-256: `33a27e7ecf4a870af4b88641dd88e8ec1120e42cce7df744743500a79524ddfb`
- Context manifest SHA-256: `b33342237f9f7b1f15f6efae14403fc880a9c7bc8ecfea0d08df47f4b26cfbd2`

The frozen acceptance criteria required a `LIVE` schema-valid review of the exact fixture SHA, valid locations, at least two supported defects, the capacity check/commit concurrency boundary, at least one payment/idempotency defect, durable route/telemetry/validation evidence, restart-identical transcript and no secret/private-reasoning leakage. These criteria were not placed in the provider prompt.

The exact governed instruction persisted by Agent Control was:

> You are performing a governed, read-only repository review. Use only the supplied frozen-revision evidence and context. Find correctness, reliability, security, and maintainability defects. Distinguish proven defects from concerns. Cite real file paths and line ranges. Do not invent paths, symbols, test results, or execution evidence. Do not request or perform source modification. Treat repository tests and documented invariants as acceptance evidence. Return only the JSON object governed by the supplied output schema, with no markdown or commentary. Set schema to agent-control.repository-review/v1. Verdict must be PASS, PASS_WITH_FINDINGS, REVIEW_REQUIRED, or FAILED. A completed review with supported defects is PASS_WITH_FINDINGS, regardless of severity; FAILED means the review itself could not be completed or could not produce a usable result. Use null for file/startLine/endLine only for genuinely repository-level findings. Express confidence as a decimal from 0 through 1, never as a percentage. Every finding begins with validation state UNVERIFIED; independent Agent Control validation owns acceptance. Use PASS only when this supplied chunk has no supported finding.

## Natural LIVE Run

- Saved Job: `agent-control-3-9-natural-release-review`
- Run: `67e59bf6-09be-4e1f-8af9-355980bb4b4e`
- Mode: `LIVE`
- Started: `2026-09-07T06:51:08.552Z`
- Completed: `2026-09-07T07:01:03.849Z`
- Initial route: `nvidia-hosted / default / nvidia-hosted-openai-gpt-oss-20b-a741d960 (openai/gpt-oss-20b) @ controller`
- Route purpose: `QUALIFICATION`; this did not grant production admission
- Work Parcels: failed first attempt `parcel-f7dfcad4-0a89-423a-a591-15ff9ed08cac`; successful retry `parcel-a3ea86e9-e3c8-44df-9cca-18f57dcd0e08`
- Provider lifecycle: first attempt timed out after 300,682 ms; transient transport classified; one bounded same-route retry; second attempt completed after 293,367 ms
- Product terminal state: `SUCCEEDED_WITH_FINDINGS`
- Provider result: schema-valid `PASS_WITH_FINDINGS`, three independently location-validated findings
- Natural route changes: none

The result identified unsafe payment/idempotency clearing, raw-body HMAC normalization and pending-idempotency null return. It did not identify the frozen capacity hold check/commit race in `src/capacity-store.mjs`. The external mechanical objective verifier therefore returned `FAIL`, with exactly `capacity-check-commit-boundary-identified` failing. This result is retained rather than rerunning until a preferred story appears.

Natural objective evidence: `evidence/natural/objective-verification.json`, SHA-256 `1bb3bcf0e5a4a2fadb086084d0cf91535726b82609328df4eb5fbd6b520396f6`.

## Natural dashboard and transcript

The video followed the ordinary authenticated Saved Job through Jobs, Lanes, Models, Crew and Complete execution transcript. Agent Control—not Codex after the run—generated the transcript while the Run changed.

- Transcript: `evidence/natural/complete-transcript.md`
- Content SHA-256: `20674ae3683a6c65968787eb7685745e3c3e0045000bcf480bf599755ca22c31`
- Source-projection SHA-256: `a5b43ae8b3fa6679d80a147ef0a7a51672ef53bc699fa8b8b543cba7a3cd638c`
- Entries: 63
- Restart check: byte-identical content and source hashes before/after runtime reconstruction
- Video: `evidence/natural/dashboard-run-1080p.mp4`
- Video SHA-256: `8baa1826a1054726df6acc874cd16ca1c882bdfdd367ccf59fea6a565eb308b2`
- Video: 1920×1080 H.264, 25 fps, 632.76 seconds, 935,707 bit/s, 74,201,048 bytes, 105% presentation zoom
- Browser: Chromium 152.0.7977.64; zero recorded console errors; zero recorded HTTP errors

Post-restart reconciliation passed 18/18 checks against the parameterised Run ledger, Work Parcel store and token-routing store. It verifies the exact Job, Run/Parcel IDs, lane card source, executed routes, Crew journey events, transcript hashes, terminal state, video characteristics and non-simulated mode. Evidence: `evidence/natural/dashboard-ledger-reconciliation.json`, SHA-256 `6f4152de70032ea1b820fa29d535b4c54341170a7ac73cf6a73818c013d52ca4`.

## Natural accounting

| Leg | Route | Result | Input | Output | Total | Context | Cost |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | NVIDIA GPT-OSS 20B | transient transport failure | unavailable | unavailable | unavailable | unavailable | unavailable |
| 2 | NVIDIA GPT-OSS 20B | provider and schema completion | 2,180 authoritative | 6,948 authoritative | 9,128 authoritative | unavailable; provider did not report current occupancy | unavailable; provider did not report price/cost |

The Run ledger records two accounted invocations and one invocation with unknown usage, so the exact aggregate is unavailable rather than falsely reported as 9,128. Fresh/cache-read/cache-write splits were unavailable. Current context is separate from cumulative usage and did not drive a handoff. The governed action was read-only immutable snapshot/context compilation plus provider review; no source mutation or model-directed tool execution occurred.

## Controlled resilience Run

This run is separate and unmistakably labelled `CONTROLLED_FAULT_INJECTION`. A loopback generic OpenAI-compatible endpoint returned exactly two fixed HTTP 503 responses. It does not assert a natural NVIDIA outage and does not update NVIDIA provider health or quality.

- Controlled configuration SHA-256: `e7ee2a47ab28648b9e9d953e2bb80c6301f24a29bc847611c3c22b1173e1e14d`
- Controlled Saved Job SHA-256: `73806f81b46c3a0e6e124c8d56a9aba04da6de72983d60921134e16f68c8281b`
- Fault server SHA-256: `0a45c2ae94ace342e93d2caf7ea5dadbbb72731f014ad8570a9e73285f7320ef`
- Saved Job: `agent-control-3-9-controlled-resilience-review`
- Run: `04761a03-61f0-4fb1-b8d4-43b9bc7a2eed`
- Started: `2026-09-07T07:16:47.637Z`
- Completed: `2026-09-07T07:17:43.026Z`
- Work Parcels: failed first attempt `parcel-bad3a866-138f-4f39-87af-309918253f64`; retry/fallback continuation `parcel-c4489b4d-0309-4275-8539-fd8bad64825d`
- Initial qualification route: `nvidia-hosted-controlled-fault / default / controlled-fault-openai-gpt-oss-20b @ controller`
- Qualified destination: `codex-chatgpt / Controller Account A / controller-review (gpt-5.6-luna) @ controller`
- Retry history: one same-route retry after the first 503; the second 503 exhausted the configured budget
- Failure trigger: `PROVIDER_FAILURE / transient-transport / transient_transport_failure`
- Governor action: `BATON_AND_HANDOFF`; reason `verified_baton_ready_for_explicit_handoff`
- Token baton: `token-baton:9878cb96-b9f7-43c0-862b-4ea4098ef82f`
- Token-baton SHA-256: `d774916daaa9c8a5fa4441c23efd9e5ffcca46ddd8d119fb5df596370f487b4a`, mechanically recomputed successfully
- Handoff: `handoff:3a1e8585-cf1c-412b-b9a5-d94bfa704cdb`
- Destination contract: `contract:bec854d7-d636-4e7a-9585-29e8e47f7bca`; `VERIFIED`; independent verification `PASSED`
- Final governor record: `BATON_AND_HANDOFF / SUCCEEDED`; reason `handoff_completed_original_thread_recoverable`
- Product terminal state: `SUCCEEDED_WITH_FINDINGS`; result `PASS_WITH_FINDINGS`
- Mechanical objective verifier: `PASS`, including the capacity and payment/idempotency requirements

The destination continued the same frozen chunk and returned six valid findings; the source thread remained marked recoverable. Controlled objective evidence: `evidence/controlled/objective-verification.json`, SHA-256 `72d4dc29d27e5b76dd81d3016312a0e028606c9011707766ecee7a19bde1568a`.

## Controlled dashboard and transcript

- Transcript: `evidence/controlled/complete-transcript.md`
- Content SHA-256: `5508d1ead0f24e746e1525df1aa550bcd2b517cfb7c73cb093f128d574a6b7f5`
- Source-projection SHA-256: `81014846b328ccc9f2b30697a46c42c85f3d25dd742784b5300f9190543bd1f9`
- Entries: 88
- Restart check: byte-identical content and source hashes before/after runtime reconstruction
- Video: `evidence/controlled/dashboard-run-1080p.mp4`
- Video SHA-256: `63485b141a42fac017ed88abe28509bfe3b06039abcc748af104e21c399b299c`
- Video: 1920×1080 H.264, 25 fps, 86.92 seconds, 1,127,967 bit/s, 12,282,274 bytes, 105% presentation zoom
- Browser: Chromium 152.0.7977.64; zero recorded console errors; zero recorded HTTP errors

Post-restart dashboard reconciliation passed 18/18 checks: `evidence/controlled/dashboard-ledger-reconciliation.json`, SHA-256 `38413fe09854f4a9e71f22b9223f695a98f166c3181931859c460e36e305c139`.

## Controlled accounting

| Leg | Route | Result | Input | Output | Total | Context | Cost |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | controlled source | injected HTTP 503 | unavailable | unavailable | unavailable | unavailable | unavailable |
| 2 | controlled source | injected HTTP 503; retry exhausted | unavailable | unavailable | unavailable | unavailable | unavailable |
| 3 | Codex / Controller Account A / Luna | destination completed and verified | 9,473 authoritative | 2,795 authoritative | 12,268 authoritative | current occupancy unavailable; configured limit 272,000 | unavailable |

The exact Run aggregate remains unavailable because two of three invocations have unknown usage. The destination's 12,268 known tokens are not misrepresented as the three-leg total. Codex `exec` turn usage is cumulative turn usage, not current context occupancy. Cost remains unknown because no authoritative or complete pricing basis was available.

## Jobs, Lanes, Models and Crew reconciliation

Both recordings show the real dashboard against the same API/SSE projection later reloaded from durable state. The Jobs view names the Saved Job, objective, execution mode, elapsed time, Work Parcel IDs, status and terminal result. Lanes contains the parameterised Run card sourced from that Run rather than a fabricated workspace task. Models includes every executed provider/model route, qualification and routing status. The Crew projection contains the same Parcel and journey event IDs, with animation authority explicitly `presentation-only`.

| Character | Agent Control responsibility | Authoritative sources | Operational/activity states | Animation mapping |
| --- | --- | --- | --- | --- |
| Cadence | Controller & Lane Dispatcher | lane, scheduler, Run and queue state | idle, planning, running, waiting and terminal lane facts | idle look/sleep; conducting only for recorded dispatch/concurrency |
| Quill | Work Parcel Reviewer | Parcel planning/readiness and durable questions | partial coverage; planning/review/question or truthful idle | page reading/thinking only when those records exist; otherwise ambient idle |
| Relay | Tool & Execution Worker | Work Parcels, stages, action/tool, baton and routing records | executing, waiting, passing baton, failed or terminal | carrying/typing/tool poses from current canonical action; concerned on recorded failure |
| Lumen | Model Router & Scout | model registry, catalogue, evaluation and routing decisions | discovery, evaluation, routing or idle | scouting/routing only from model events; otherwise ambient idle |
| Rook | Resource & Node Guardian | Systems readiness, capacity and managed-node measurements | available, busy, disconnected, stale, unknown or idle | gauge/guard activity from node evidence; otherwise ambient idle |
| Verity | Verification & Evidence Inspector | Run, step and independent verification state | verifying, passed, failed or idle | inspecting during verification; bounded success acknowledgement only on a fresh result |

Quill's partial instrumentation is stated in the UI; no separate prompt-review worker is invented. During the controlled active interval Cadence and Relay showed route/execution/baton activity, Verity showed planning/verification, and roles without canonical work remained idle. A frame-MD5 check over three seconds at 25 fps observed motion in all six isolated sprites: 75 unique frame hashes and 74/74 consecutive changes per character. This proves rendered motion only, not work. Evidence: `evidence/controlled/crew-animation-motion-verification.json`, SHA-256 `412c533ee33d9239e1f5b9ca4fb9dfd89d957b0c1d5695571fcd7a18bc694ea8`.

## NVIDIA role admission

| Candidate role | Evidence | Decision |
| --- | --- | --- |
| Structured output transport | The natural response completed as valid JSON and passed transport/application schema validation | demonstrated for this one contract only |
| Repository review / reasoning | Three supported findings, but one mandatory pre-frozen defect was missed | not qualified |
| Coding / code modification | Earlier smoke/tournament observations are not a required real production coding Work Parcel in this gate | not qualified |
| Tool-heavy worker | No required real production tool-heavy Work Parcel in this gate | not qualified |
| Very-long-context worker | Provider supplied no authoritative context limit/occupancy and this fixture was small | not qualified |
| Fast worker | One approximately 300-second timeout and one approximately 293-second completion do not establish a fast role | not qualified |
| General worker / escalation destination | Quality and breadth remain insufficiently proven | not qualified |

The actual ModelRegistry simulation tested simple coding, complex coding, tool-heavy, very-long-context review, structured extraction and high-quality review. Production rejected the candidate in every scenario because routing is disabled and capability evidence is unproven. The configured production review selected the qualified Codex fallback. A qualification-purpose route can select the candidate but explicitly grants no admission. Evidence: `routing-policy-simulation.json`, SHA-256 `6cb6c333619365ff515e745f5aeb57022094752c88b6a6061b43115b1e19a91e`; result `PASS`; recommendation `DO_NOT_ADMIT`.

## Invalid/obsolete attempts retained

These attempts are append-only diagnostic evidence, not release evidence:

- Natural attempt 1 completed but exposed a pre-final dashboard projection defect.
- Natural attempt 2 lost the recorder attachment; only its durable state remains.
- Natural attempt 3 exposed an unclassified native Undici header timeout, leading to the bounded transport normalization fix.
- Controlled attempt 1 pointed the NVIDIA-specific adapter at loopback, correctly violating its endpoint policy; the corrected fault harness uses the generic OpenAI-compatible adapter.

The definitive natural Run was not repeated after its objective failure.

## Validation

- Focused integration command: `node --import tsx --test --test-concurrency=1 src/control/openai-compatible-provider.test.ts src/control/direct-repository-review-executor.test.ts src/control/execution-transcript.test.ts src/control/execution-history.test.ts src/control/token-aware-baton-routing.test.ts src/control/dashboard-characters.test.ts src/control/web-server.test.ts scripts/browser-dashboard.test.mjs`
- Focused result: 134/134 passed, 0 failed.
- Complete command: `npm run check`
- Complete result: typecheck passed; bootstrap and dashboard syntax passed; infrastructure-neutrality 3/3 passed; implementation status 49/49 passed; full test suite 973/973 passed, 0 failed.
- Frozen fixture command: `npm test` in `natural-fixture`; 3/3 passed.
- `git diff --check`: passed.
- Internal Markdown link validation: passed.

## Security and evidence boundary

The scanner inspected tracked distributable text and the qualification text/JSON/Markdown projections. It found no unexpected credential, private-key, email-address or Windows-profile-path match. Synthetic test credentials remain classified as tracked test/example values. Credential-store values were not opened, copied, diffed or placed in the qualification root. Recorder manifests state that operator tokens were not persisted, credential values were not read, and raw provider payloads were not persisted.

Binary video/image contents were visually reviewed and tied to their recorder manifests; the text scanner does not claim to decode binary media. The final `security-scan.json` and qualification manifest record exact counts, modes and hashes.

## Release gate disposition

Passed: real non-simulated Run; truthful Jobs/Lanes/Models/Crew; complete product-generated transcript; restart reconstruction; readable 1080p video; provider/tool/token authority reconciliation; generic retry-exhaustion continuation; sealed-baton destination continuation; clearly separated controlled resilience; credential scan; complete regression; dashboard runtime health.

Failed: objective verification of the principal natural Run. Specifically, the NVIDIA review missed the frozen capacity check/commit concurrency defect. Because every release acceptance gate is mandatory, the release candidate cannot be `PASS`.

Remaining limitations are also explicit: one natural failed invocation has unknown usage; controlled source failures have unknown usage; current-context occupancy and monetary cost were unavailable; no coding, tool-heavy, long-context, fast-worker, general-worker or escalation-destination role was physically qualified for this candidate.

Final verdict: `PARTIAL`.

NVIDIA GPT-OSS 20B recommendation: `DO_NOT_ADMIT`.
