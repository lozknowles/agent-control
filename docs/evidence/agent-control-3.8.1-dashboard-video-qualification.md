# Agent Control 3.8.1 dashboard video qualification

Date: 2026-09-04

Release: `v3.8.1`

Release commit: `4da1d360211bb27d8fde981d688a54850685501e`

Qualification type: post-release operational evidence; no product change, retag, or republication

## Result

One uncut 5 minute 45 second recording was captured from the genuine Agent Control 3.8.1 dashboard rendered by Chrome on MSI. Three distinct immutable-revision repository-review Jobs were submitted together, appeared independently in the queue/run ledger, executed sequentially through the released production scheduler and Codex provider adapter, and were navigated individually. Live SSE/dashboard refreshes showed the active thread change and each completed thread retain its own provider, account label, model, context estimate, cumulative token totals, cost, elapsed time, governor state, and Work Parcel total.

The three provider responses failed the strict repository-review result-schema gate. Agent Control recorded each run as `FAILED` with `repository_review_provider_schema_invalid`; this was a governed fail-closed outcome, not a dashboard/telemetry mismatch. The video and evidence preserve those results rather than presenting them as successful reviews.

## Released identity and physical topology

- Released source and runtime: hpubuntu, exact clean `v3.8.1` commit `4da1d360211bb27d8fde981d688a54850685501e`.
- Dashboard: Agent Control web interface on hpubuntu, exposed only over the existing Tailscale network.
- Physical browser: Chrome 152 on MSI, controlled through its loopback Chrome DevTools endpoint over the already-qualified SSH/Tailscale path.
- Recording: continuous Chrome DevTools screencast of the real MSI browser renderer. The existing disconnected RDP session caused Windows `gdigrab` to fail with error 5, so no desktop frame source was available. The browser screencast was continuous and unedited; it was not reconstructed from screenshots or synthetic HTML.
- The opening frame visibly shows `Agent Control v3.8.1`, `LIVE`, and `HEALTHY`.

The published GitHub Release remained unchanged: [Agent Control 3.8.1](https://github.com/lozknowles/agent-control/releases/tag/v3.8.1). The remote annotated tag dereferences to the tested commit.

## Qualification-only governor policy

The immutable product logic was unchanged. To avoid unnecessary provider spend, the released production governor was configured for this qualification with thresholds `10 / 20 / 30 / 40%` (`CONTINUE / PREPARE_BATON / COMPACT / HANDOFF`) and a 32,768-token configured context limit. This is test configuration only, not the normal production policy.

Codex 0.144.4 did not expose authoritative current-context occupancy during these ephemeral single-turn calls. The dashboard therefore showed current context as `unavailable` while each call was active, then clearly marked the terminal occupancy as `estimated` from the single-turn usage. Cumulative input/output totals came from provider completion usage. Costs were calculated from the explicitly configured qualification pricing and marked estimated.

## Jobs and reconciliation

| Job | Run ID | Work Parcel | Route | Start telemetry | End context | End usage | Cost | Governor decisions | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Release Identity Review | `89ae35db-dafb-4c4f-bf69-9f85f0936be1` | `parcel-e12d4045-0acc-4383-85e5-a5924acb06af` | `codex-chatgpt / Controller Account A / account-a-review` | context and cumulative usage unavailable | 24,587 / 32,768, 75.03%, estimated | 22,979 in + 1,608 out = 24,587 | 0.052390 USD, estimated | `CONTINUE` → `HANDOFF`; action `COMPACT_AND_CONTINUE` | `FAILED`, strict provider schema gate |
| Token Governor Review | `dcea4ea9-3248-4c10-8f84-c126c87b273f` | `parcel-4253148c-8956-42c6-a142-358c74355d39` | `codex-chatgpt / Controller Account A / account-a-review` | context and cumulative usage unavailable | 54,799 / 32,768, displayed 100%, estimated | 51,917 in + 2,882 out = 54,799 | 0.115362 USD, estimated | `CONTINUE` → `HANDOFF`; action `COMPACT_AND_CONTINUE` | `FAILED`, strict provider schema gate |
| Credential Residency Review | `f958a778-d7af-46ed-9ccc-dba583bc6c45` | `parcel-2c337b6b-e2b1-4004-9cd1-d85da8f4f287` | `codex-chatgpt / Controller Account A / account-a-review` | context and cumulative usage unavailable | 43,201 / 32,768, displayed 100%, estimated | 40,842 in + 2,359 out = 43,201 | 0.091120 USD, estimated | `CONTINUE` → `HANDOFF`; action `COMPACT_AND_CONTINUE` | `FAILED`, strict provider schema gate |

Aggregate reconciliation is exact:

- Job ledger: 115,738 input + 6,849 output = 122,587 total tokens; 0.258872 USD.
- Work Parcel roll-up: 115,738 input + 6,849 output = 122,587 total tokens; 0.258872 USD.
- Difference: zero tokens and 0 USD.
- Six routing decisions were durably recorded: one initial `CONTINUE` and one terminal `HANDOFF` state for each Job.
- No sealed baton or cross-route execution was attempted in this video. The recorded action at the terminal threshold was `COMPACT_AND_CONTINUE`; no baton/handoff ID is claimed.

The dashboard values visible in the recording agree with `job-runs-final.json`, `token-routing-final.json`, and `parcels-final.json`. Current-context occupancy remains explicitly separate from lifetime counters and carries its `estimated` authority label.

## Video integrity

- File: `agent-control-v3.8.1-true-sign-off-msi-chrome.mp4`
- Container/codec: MP4 / H.264
- Duration: 345.133333 seconds
- Resolution: 1920 × 946
- Frame rate: 15 fps
- Size: 4,125,098 bytes
- SHA-256: `5f85dcaa84fa622a8e1f1de0ba5350625ed895c6fe4e389f81f93cd1437d9014`
- Cuts: none
- Source frames: 307 timestamped Chrome screencast updates, encoded with their observed durations

Frame-level review sampled the opening, live execution, final run-detail, and final token-card portions. It confirmed readable release identity, distinct Job/run identities, provider/model/account fields, changing lifecycle and telemetry, and final totals. No API key, bearer token, device code, account email, cookie, resolved credential path, OAuth material, or credential content appears in the video or committed machine-readable evidence. Opaque credential-residency fields are API-redacted.

## Evidence files

- [Continuous video](agent-control-3.8.1-dashboard-video-sign-off/agent-control-v3.8.1-true-sign-off-msi-chrome.mp4)
- [Runtime status](agent-control-3.8.1-dashboard-video-sign-off/status-final.json)
- [Job run ledger](agent-control-3.8.1-dashboard-video-sign-off/job-runs-final.json)
- [Token routing evidence](agent-control-3.8.1-dashboard-video-sign-off/token-routing-final.json)
- [Work Parcel evidence](agent-control-3.8.1-dashboard-video-sign-off/parcels-final.json)
- [Invocation endpoint result](agent-control-3.8.1-dashboard-video-sign-off/invocations-final.json)
- [Machine reconciliation](agent-control-3.8.1-dashboard-video-sign-off/reconciliation.json)
- [Artifact checksums](agent-control-3.8.1-dashboard-video-sign-off/SHA256SUMS)

## Verdict

All post-release video sign-off gates are met: released identity, three real Jobs, dashboard navigation, independent per-Job state, visible changing lifecycle/telemetry, separate current-context and lifetime accounting, exact machine reconciliation, secret-safe evidence, and a physically reviewed continuous video with recorded integrity.

`AGENT_CONTROL_3.8.1_TRUE_SIGN_OFF`
