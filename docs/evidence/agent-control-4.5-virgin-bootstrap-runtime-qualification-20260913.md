# Agent Control 4.5 virgin bootstrap and live-estate qualification

Date: 2026-09-13  
Implementation candidate: `31ccdf07f9aeb96cec0ea87a8cfb2bf1607ae86b`  
Branch: `feature/4.5-release-closure`  
Product release: **PAUSED — no merge, tag, release or deployment**

## Scope and provenance

This evidence continues the already accepted source-distribution and normal
Moto installation qualification. It does not repeat that installation or
present a shallow/partial clone as a product path. The accepted clean Moto
checkout used an ordinary, non-shallow full clone, transferred 5.93 MiB,
passed bootstrap install and idempotent reinstall, and passed the complete
Android/Termux suite with 1,327 passes and one platform-inapplicable Linux PTY
skip. The exact installation evidence remains described in
[`agent-control-4.5-source-distribution-remediation-20260912.md`](agent-control-4.5-source-distribution-remediation-20260912.md).

The dashboard-first capture was made at ancestor
`413f8d3e572e0e777076a79177262493c603d592`; the governed-job capture was made
at ancestor `17b7f2c502f5876eca8cd1cbece6d1fb93744264`; and the final health-transition
capture was made at candidate
`31ccdf07f9aeb96cec0ea87a8cfb2bf1607ae86b`. Git ancestry was verified. The
intervening commits only document the accepted install and fix the three
qualification-discovered projection defects recorded below. No earlier media
is relabelled as though it came from the final SHA.

Qualification access and product discovery remain separate:

- Codex qualification access used the already authorised Tailscale path to
  Termux SSH on the Moto G34.
- The fresh Agent Control `FIRST_RUN` scan did not independently discover that
  Tailscale/SSH relationship because the clean installation had no configured
  remote node and remote discovery was not enabled.
- No known transport or device identity was injected into discovery merely
  because the qualification harness knew how to reach the device.

## Genuine installation screenshots

The Sentinel virgin-install sequence was recorded as screenshots at each
meaningful stage. It includes the first failed source transfer and the later
documented bootstrap path. These images remain truthful historical evidence;
they are not represented as the final Moto install.

| Stage | External evidence filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Original public clone / packaging failure sequence | `sentinel-install-02-public-repository-clone.png` | 35,471 | `765022172bcef7a44187fad020316811b554a9275f3c70d0933b070433a7bab3` |
| Documented bootstrap running | `sentinel-install-06-bootstrap-progress.png` | 21,737 | `d3f4f282e247236b4d74dd891b662fcf15081540501aa75663afd6a5e5f5600f` |
| Bootstrap completed | `sentinel-install-07-bootstrap-complete.png` | 73,972 | `31ddba0303d94d321424526625d45529be05fc86e011dd4b76af4f8fed99b091` |
| Installed full validation complete | `sentinel-install-09-full-check-complete.png` | 160,598 | `1a218ca46df4796785820c04550f1a9bfe4353221f6809b3a1fb1a927826af51` |
| First controller start | `sentinel-install-10-controller-start.png` | 28,557 | `44ea5148cd308e4bdc7808be24ba39724f14a370a6c5c5b208a431bb336c3d75` |
| First dashboard connection | `sentinel-install-11-first-dashboard.png` | 437,919 | `c63de810ab2860fec53c63d92cc0ed929697a46a9207382146de67d23a40f57b` |

The accepted source-distribution remediation was not repeated merely to create
an install video. Accordingly, no reconstructed or staged install video is
claimed. Genuine HD recording begins at the first dashboard and continues
through setup, discovery, governed work, Process/Estate navigation and live
health changes.

## Dashboard-first and first-run discovery

The clean Moto controller started its dashboard before discovery. From that
dashboard the operator opened first-run setup and ran `FIRST_RUN` with
`QUICK_TEST`. The scan completed with 37 observed resources: one local machine,
one qualified Agent Control worker, 14 registered Jobs and 21 registered tools.
It found no GPU, local model, API provider or memory source on that clean
Termux node. Those absences remain visible rather than being filled with
qualification-harness knowledge.

The Estate projection contained 40 nodes and 39 edges and reported LIVE
freshness. Screenshots cover dashboard availability, first-run readiness,
discovery result, resource drill-down and the populated Estate Map. The video
is 1920×1080 at 25 fps for 17.64 seconds:

`agent-control-4.5-moto-first-run-discovery.mp4`  
Bytes: 3,164,951  
SHA-256: `3e33d2c7d43300933971da098d7590bfb561491677ac7e379207a7268bc7a426`

## Genuine governed job and Process/Estate navigation

The operator-facing Morrow input was typed exactly as a user request:

`Start operator-system-observation@1.1.0`

Agent Control displayed a sealed proposal, received explicit approval, created
Work Parcel
`parcel-social-aadb77c905641b82705dd9f1d076313590d588ea59457167f7230d76b559b744`,
executed Run `run-e387fbae-3e75-4bf5-9fec-c860c555e8c8`, independently verified
the result and preserved baton SHA-256
`6e07cd27ae62ea1f5bb1fc27d5bb86b3ee4bf1b6bf7784e6e76389b45c90bc79`.

The recording shows the real request, approval, completed Work Parcel, Process
Map, worker drill-down, **Show in Estate**, exact Estate worker identity and the
return to the same Process Map. The deterministic observation job invoked no
provider, so token and cost values are correctly unavailable rather than
invented. The complete natural Morrow transcript is preserved beside the
recording.

`agent-control-4.5-moto-governed-job-process-estate.mp4`  
Bytes: 8,219,362  
SHA-256: `806bfecb843b4952bfc7ba43c3345d503581d97f6d34e1d7b263c03294e4e0d3`

## Authentic Estate health transition

A disposable Node HTTP endpoint was bound only to Moto loopback
`127.0.0.1:11434`. It was never publicly exposed and did not replace or alter a
protected service. The exact process was stopped and restarted while the same
production `FULL_DISCOVERY` plus `QUICK_TEST` path observed it.

The final candidate recorded:

1. `HEALTHY / CHANGED / SUCCEEDED`, authority `AUTHORITATIVE`, source
   `bounded-loopback-probe`;
2. `OFFLINE / REMOVED / WAITING`, authority `DERIVED`, source
   `missing-from-current-scan`;
3. `HEALTHY / CHANGED / SUCCEEDED`, authority `AUTHORITATIVE`, source
   `bounded-loopback-probe`.

The final recording is 1920×1080 at 25 fps for 87.12 seconds. Browser and HTTP
error lists are both empty.

`agent-control-4.5-moto-estate-health-transition.mp4`  
Bytes: 12,508,519  
SHA-256: `a78d43bac8100b8a0a045006336809d31147822c3518f10d9718b93ee6416435`

After capture the disposable endpoint was terminated and a final production
scan recorded it `OFFLINE / REMOVED`. The temporary qualification controller
and SSH dashboard relay were also stopped.

## Qualification-discovered fixes

1. `357fc6e7038b2d52907e4cd8d836683583fe1cdc` requires observed work before an
   available configured Job/tool is projected as RUNNING.
2. `17b7f2c502f5876eca8cd1cbece6d1fb93744264` preserves an exact
   Process→Estate→Process worker link when the Process event asserts the stable
   worker ID but has no node assertion; an actual node mismatch still fails
   closed.
3. `31ccdf07f9aeb96cec0ea87a8cfb2bf1607ae86b` records an offline resource that
   becomes healthy as `CHANGED`, never `UNCHANGED` merely because its static
   fingerprint is unchanged.

Each fix has focused deterministic regression coverage. The complete final
candidate check passed **1,331/1,331** tests, together with source-distribution,
TypeScript, bootstrap syntax, dashboard syntax, infrastructure-neutrality and
implementation-status checks.

## Security and evidence integrity

- Browser pages stored only the operator-authenticated state; no credential was
  rendered in dashboard screenshots or video.
- A qualification TTY invocation briefly echoed an ephemeral operator token to
  the private tool stream. The controller was stopped, the token was
  immediately rotated, and no evidence was persisted with that value. Final
  recordings use the replacement token through non-TTY stdin delivery.
- A boundary scan covered 89 evidence files / 84,983,196 bytes. It found no
  current operator token or provider credential pattern.
- Estate payloads contain the fixed marker `[REDACTED]`, not a secret or a mask
  derived from secret length.
- Raw diagnostic recordings are preserved and labelled as failed recorder or
  qualification attempts; none is promoted to passing evidence.

Heavy screenshots, video, transcripts and raw diagnostic evidence remain
outside the product repository. They are published through the public
[Agent Control qualification evidence archive](https://github.com/lozknowles/agent-control-qualification-evidence/releases/tag/source-separation-20260912)
with immutable hashes. This source repository contains only this lightweight
report and references.

The complete continuation archive is
`agent-control-4.5-virgin-bootstrap-runtime-evidence-20260913.tar.zst`,
82,630,721 bytes, SHA-256
`b74201b36da719726331438ed6bbca198a7b0417e88224a9377665b4ff99ca34`.
The final candidate validation log is
`agent-control-4.5-candidate-31ccdf0-full-check.log`, 134,253 bytes, SHA-256
`512ea7e62388f1e1f8ade70ad24907c68eb1e2b8333fdb135e5bb49c1ecfd99e`.

## Acceptance accounting

| Criterion | Result |
| --- | --- |
| Normal clone, install and idempotent reinstall | `PASS` (accepted prerequisite) |
| Dashboard available before discovery | `PASS` |
| First-run setup and local discovery | `PASS` |
| Estate Map populated from actual observations | `PASS` |
| Genuine governed job and independent verification | `PASS` |
| Process Map → Show in Estate → back to Process | `PASS` |
| Genuine HEALTHY → UNAVAILABLE → HEALTHY observation | `PASS` |
| Screenshot/video credential safety | `PASS` |
| Agent Control independently discovers Moto Tailscale/SSH qualification transport | `NOT DISCOVERED` — no remote node was configured; not injected |
| Runtime/model present on clean Moto | `NOT PRESENT / NOT CLAIMED` |

This evidence closes the dashboard-first, governed-job, Process/Estate linking
and truthful health-transition exercises. It does not claim that the clean Moto
contained or discovered a model, nor that unconfigured peer discovery occurred.
The `v4.5.0` product release remains paused pending release-gate reconciliation
and explicit release authorisation.
