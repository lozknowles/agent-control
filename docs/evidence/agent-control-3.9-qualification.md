# Agent Control 3.9 candidate qualification

Date: 2026-09-05  
Branch: `feature/3.9-resilient-execution`  
Released baseline: `v3.8.2` / `b51623dae1b764a31198424e8fc6ea9076d04089`  
Product checkpoint used as base: `d3d0376db6e00bed76deb8c5336fa49cdfc1554a`  
Implementation commit: `b45daf5871d36da4f12f4d60b7c29c092a87e233`

## Scope and provenance

This candidate implements the useful behavioural findings catalogued in the [evidence-gap matrix](agent-control-3.9-evidence-gap-matrix.md): durable reconnect identity, actionable failure classes, verified process cleanup, truthful live state, Android wireless-ADB lifecycle reliability, procfs/sysfs fallbacks and conservative cache-boundary structure. No reviewed repository source was copied. Generic policy remains in Agent Control core; Linux, Windows, Android, Codex and Responses mechanisms remain behind adapters.

The existing cached-input correction at `d3d0376` was retained. No merge, tag, package publication or live Agent Control deployment occurred. Physical work used an isolated state directory and candidate listener, then removed its MSI browser task/processes, SSH tunnel and candidate server.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| Durable execution/recovery integration | PASS (deterministic) | Exact execution IDs, restart/reconcile, changed identity, auth/config/transport classification and bounded retry tests. |
| Verified process cleanup | PARTIAL | Deterministic Linux/Windows/PID-reuse/uncertainty tests; real Linux process-group cancellation passed; no physical Windows cancellation. |
| Dashboard lifecycle/SSE reconciliation | PASS (physical) | Real concurrent Runs, genuine queue wait, mid-run MSI Chrome reload, Codex review, cancellation and cleanup recording. |
| Resource telemetry fallbacks | PARTIAL | Deterministic source/freshness/reset tests and real Pixel cpuidle-derived sample; result deliberately not admission-qualified. |
| Android local ADB lifecycle | PARTIAL / BLOCKED | Seventeen deterministic tests passed. Physical Pixel had no discoverable pairing/connect service or locally entered PIN, so pair/reconnect/execution/resume were not exercised and capabilities remained unpublished. |
| Prompt/cache boundary | PARTIAL | Portable structure and capability gates pass deterministically; eight real Codex calls are observational and did not establish equivalent verified outcomes or a saving. |
| Full project validation | PASS | Final commands and counts are recorded below. |
| Install/package portability | PASS | Final package commands are recorded below. |

## Real dashboard and cleanup qualification

The candidate ran on an isolated controller endpoint and was observed/controlled through Chrome on the configured MSI node. The recording visibly followed a real owned Run, a second same-Job Run genuinely waiting under `concurrency: queue`, a real parameterised Codex repository review in parallel, live token/cache telemetry, a mid-run browser reload/SSE reconstruction, cancellation, and confirmed process cleanup.

- First owned Run: `run-73913803-66ce-4694-bb0e-a6ddae1a05aa`; `RUNNING` for 180 seconds; terminal `SUCCEEDED`.
- Queued/cancelled Run: `run-d08bf1c4-e874-4d9b-8340-501e039e31bd`; waited behind the first Run, then ran; terminal `CANCELLED` only after cleanup `confirmed`.
- Cleanup request: 2026-09-05T06:00:06.312Z; verification: 2026-09-05T06:00:06.338Z; platform `linux`; signal evidence `SIGTERM:sent`; one captured process identity; start token redacted.
- Repository-review Run: `cb958213-d157-4b16-858f-58784ef0852e`; route `codex-chatgpt / Controller Account A / gpt-5.6-luna / controller`; terminal `SUCCEEDED_WITH_FINDINGS`.
- Frozen fixture commit: `26d54460e1103316e48ea2235798f399a89ea7c8`.
- Work Parcel: `parcel-be451047-e322-42a9-ad01-5ceccdd70505`.
- Provider usage: 7,175 total input = 2,311 fresh + 4,864 cached; 417 output; 7,592 total. Cache writes, authoritative current context and monetary cost were unavailable.
- Validated finding: `src/session-cache.ts:8` omitted account identity from a cache key.

External sanitized evidence root:

`/fast/qualification/agent-control-3.9-resilient-execution/dashboard/`

Recording:

`agent-control-3.9-real-dashboard-qualification.mp4` — H.264, 1024×1080, 197.96 seconds, 5,034,490 bytes, SHA-256 `c16a050c1d7985def11f1ae1df3e6d0e4723947595dfceb1a154e1dc2934cb0f`.

`evidence-manifest.json` records SHA-256 and byte size for `status.json`, `jobs.json`, `runs.json`, `parameterizedRuns.json`, `parcels.json`, `tokenRouting.json` and `invocations.json`. The browser task/processes, tunnel and candidate listener were stopped after capture. No live deployment was modified.

## Physical Pixel observation

Sanitized evidence: `/fast/qualification/agent-control-3.9-resilient-execution/pixel-observation.json`  
SHA-256: `72c53e747da1dd288809e39578693b1afa4f212690650a79466da65c3dd7b7e4`

Two current probe samples at 2026-09-05T06:07:15.992Z and 2026-09-05T06:07:36.998Z produced CPU busy `17.00695515566981%`, source `/sys/devices/system/cpu/*/cpuidle/state*/time`, authority `derived`, freshness `current`, interval 21,006 ms. Limitations are `derived_busy_only_no_user_system_breakdown` and `not_qualified_for_admission`; `qualifiedForAdmission` is false. Memory came from `/proc/meminfo`; uptime/load used Node `os` fallback. Storage and temperature were unavailable and remained absent/null.

Pixel ADB was installed (`1.0.41`), but native mDNS returned no service and the helper found no pairing or connect service/device. `ensure-connected` ended `connect-unavailable`; paired/usable/verified were false. No local PIN ceremony was available, so no pairing was attempted. Pixel Codex was observed as `codex-cli 0.146.0`, but no ADB execution/resume was attempted. This is a truthful blocked physical gate, not evidence that Android cannot advertise the service and not a helper pass. `android.adb.local` and `transport.adb` remained unpublished.

## Controlled cache-boundary comparison

Current OpenAI documentation distinguishes provider-managed prompt caching from optional request controls and reports cached usage separately. Agent Control therefore keeps portable stable-prefix structure in core while placing request keys/breakpoints behind the Responses adapter and exact provider/model capability gates. See the official [prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) and [Responses create reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

The corrected physical report ran eight real schema-constrained Codex calls in alternating release-baseline/candidate order across cold, warm-follow-up, changed-context and retry cases:

`/fast/qualification/agent-control-3.9-cache-20260905/cache-boundary.json`  
SHA-256: `4ff9c1858c0915e7fc6d121aac1829857f7a7bac5781b53f1a768dea22483ae6`

| Arm | Calls | Schema-valid | Accepted outcomes | Input | Fresh | Cached | Output | Total | Elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3.8.2-shaped baseline | 4 | 4 | 2 | 126,557 | 53,597 | 72,960 | 10,734 | 137,291 | 214,011 ms |
| 3.9 structural boundary | 4 | 4 | 0 | 97,049 | 54,041 | 43,008 | 12,136 | 109,185 | 235,923 ms |

Candidate stable-prefix byte counts were nonzero and stable across repeated same-context cases (16,389 or 19,286 bytes); baseline had no structural boundary. The available `codex-cli 0.144.4` route does not expose explicit Responses cache controls, cache-write counts, authoritative current-context occupancy, provider-billed cost or session persistence. All responses satisfied the wire/application schema, but the candidate arm produced `REVIEW_REQUIRED` outcomes while the baseline had two accepted outcomes. It is therefore invalid to claim token, latency, cost or outcome efficiency from the lower aggregate candidate token count. The result qualifies instrumentation and truthful non-promotion, not an economic improvement.

The first measurement report is retained as `cache-boundary-initial-reporter-defect.json` (SHA-256 `560a149565344a0e55a490860b4376dd11d25aab802ed5e89a58c3b95db967f2`). Its reporter incorrectly calculated `stablePrefixBytes` as zero while hashing the full rendered prompt. Production prompt construction was unaffected. The reporter was fixed and the complete eight-call sequence rerun; only the corrected report above is used for measurement conclusions.

## Security and evidence boundary

- No credential value, OAuth material, email address, PIN, raw provider body, Windows profile path or raw PowerShell/SSH stream is retained in the qualification evidence.
- Android PIN input is stdin-only and redacted; it was not exercised physically.
- Cache-scope material is one-way hashed; prompt bodies are excluded from the report.
- Process start identity in exported dashboard evidence is redacted while cleanup outcome/timestamps/signals remain auditable.
- Unavailable context, cache-write and cost values remain unavailable rather than zero.

## Validation and package gate

Final validation ran against the documented candidate before push:

```text
npm run check
  PASS: TypeScript, bootstrap/shell syntax, dashboard JavaScript, 3 neutrality checks,
        39 implementation-status entries, 773/773 tests
npm pack --dry-run
  PASS: agent-control@3.9.0, 633 files, 1.3 MB packed / 5.4 MB unpacked
npm install --prefix <clean-temp> --ignore-scripts agent-control-3.9.0.tgz
  PASS: 12 packages installed; installed `agent-control --version` = 3.9.0
git diff --check
  PASS
```

Package evidence is retained under `/fast/qualification/agent-control-3.9-package-final-SeeRRb/`. The content hash for the final post-commit tarball is recorded in the PR/final report rather than inside this packaged document, which cannot contain its own stable archive hash.

The first full gate found one test fixture pinned to `3.8.2` while the CLI correctly returned `3.9.0`. The test now compares the executable result to `package.json`. A later consistency scan found that the legacy `android/resource-agent.sh` path still advertised `transport.adb` from executable presence alone. It now consults the helper's usable-and-qualified status and publishes both ADB capabilities only after that proof; a regression covers false and qualified states. The complete gate was rerun from the beginning after both fixes and passed 773/773. No production behaviour was weakened to pass either gate.

## Verdict

**PARTIAL — AGENT CONTROL 3.9 CANDIDATE IMPLEMENTED; ANDROID LOCAL-ADB PHYSICAL GATE INCOMPLETE**

The implementation is suitable for review in an isolated PR. It is not a fully physically qualified Android ADB release and does not claim cache savings. No merge, tag, publish or deploy action is authorized by this evidence.
