# Agent Control 4.5.1 controller-local upgrade qualification

- Date: 2026-09-13
- Release target: `4.5.1`
- Published baseline: `v4.5.0` at
  `0c88d05ef10206f8b0007dcd7e4ac391645db6e0`
- Revised implementation candidate:
  `b721513b99e6f2c1985e48c313247fb270b81e54`
- Candidate tree: `6da0ddff39181d5bdb70afd6ca4d4f872ccaee63`
- Branch: `fix/4.5.1-controller-local-worker-upgrade`
- Verdict: **PASS — 4.5.1 PRODUCTION UPGRADE AND GOVERNED SMOKE QUALIFIED**

This is the lightweight qualification record for the narrow 4.5.1 remediation.
Heavy video, screenshots, complete transcripts and mutable runtime state remain
outside the product-source repository under the evidence-separation policy.
Nothing in this report rewrites the immutable `v4.5.0` tag, its release, its
failed production deployment, or the successful rollback to v4.1.0.

## Defects and corrections

### Controller-local worker identity

The genuine v4.5.0 production smoke established this failure path:

`preserved v4.1 configuration → built-in observation worker → worker ID differs
from controller ID → locality inferred as remote → REMOTE_NODE category →
runtime-safety denial`

Runtime safety correctly failed closed. The defect was the identity supplied to
it. The 4.5.1 correction carries one provider-neutral execution identity through
placement, runtime safety, discovery and Estate projection. Locality is
established by trusted Agent Control registration or validated configured
transport provenance, not a worker name or self-declared label. Genuine remote
workers remain subject to remote policy; unknown, inconsistent and spoofed
identities remain denied.

### Supported-configuration bootstrap

The first physical v4.1 upgrade attempt against implementation commit
`1de47c9d438341a337f4382e0d9f315300a857f6` stopped naturally in the documented
bootstrap. The JavaScript initializer rejected the legitimate numeric field
`models[0].limits.outputTokens` as though it were credential material. The
configuration remained byte-identical and owner-only; dashboard execution did
not begin.

The revised candidate aligns the bootstrap validator with the authoritative
TypeScript configuration loader for safe token-accounting keys. It still scans
their values recursively and still rejects credential-shaped keys and secret
values. A deterministic regression preserves the authentic numeric field while
proving that a synthetic `accessToken` remains rejected.

## Deterministic validation

| Gate | Result |
| --- | --- |
| Focused identity, safety, Estate, bootstrap and migration tests | `45/45 PASS` |
| Complete `npm run check` suite | `1337/1337 PASS`, zero failures or skips |
| TypeScript | `PASS` |
| Bootstrap and dashboard syntax | `PASS` |
| Infrastructure neutrality | `3/3 PASS` |
| Implementation-status registry | `59 entries PASS` |
| Source-distribution policy | `PASS` |
| `git diff --check` | `PASS` |

The expected suite count increased from the published v4.5.0 result. No test was
removed or weakened.

## Normal source distribution

The revised candidate was cloned from the public repository with an ordinary
full clone. No shallow or partial-clone workaround was used.

| Measurement | Result |
| --- | ---: |
| Git pack | 5,695,022 bytes |
| Tracked source files | 1,026 |
| Tracked source bytes | 13,722,703 |
| Oversized/heavy-source violations | 0 |
| Candidate checkout status | clean, detached exact SHA |

Both documented install invocations completed with zero npm vulnerabilities.
The second invocation was idempotent and retained the generated configuration
at mode `0600`, 96 bytes, SHA-256
`150339fe5eb80186f31118958346c9e3066e943be066790ce497bb08f1562060`.

## Virgin-install physical gate

The exact revised candidate started a real operator-authenticated loopback
dashboard and was exercised through Chromium at 1920×1080. The operator followed
the normal UI rather than calling the Job runtime directly.

| Observation | Result |
| --- | --- |
| Dashboard / SSE | authenticated, `LIVE` |
| Environment Discovery | `FIRST_RUN`, `SKIP_TESTING`, `COMPLETED` |
| Discovery inventory | 41 items, 0 failures, no remote/memory opt-in |
| Configuration application | none |
| Estate Map | 44 nodes / 43 edges |
| Observer | `CONTROLLER_LOCAL / AGENT_CONTROL_INTERNAL / CONTROLLER_INTERNAL` |
| Human request | `Start operator-system-observation@1.1.0` |
| Sealed proposal SHA-256 | `210a8244a7ca14bd2f3897d75a772a1e4914ff9aad406e5a3427e615a14400ea` |
| Work Parcel | `parcel-social-f62abbcbd0d16cc112a2c1fc2764627902c4fa158900e8f0c619c064ca9fe1a1` |
| Run | `run-15d4dae3-382c-4460-b625-6823b68c3616` |
| Result | `SUCCEEDED` |
| Runtime safety | `observe=ALLOW`, `verify=ALLOW`, both `READ_ONLY`; no `REMOTE_NODE` |
| Browser errors | none |

## Authentic v4.1 existing-configuration gate

The input was an owner-only extraction of the preserved pre-v4.5.0 production
rollback backup, not a reconstructed empty fixture. Its 34 files and 2,525,363
bytes were copied into an isolated writable qualification root. The source
configuration was mode `0600`, 3,267 bytes, SHA-256
`2e8919148e2e29812e428420ff1d0879c74fd6f94f74a850d78975e85401ab9a`.

The documented bootstrap check and two install invocations passed. Both reported
`PRESERVED_EXISTING`; the configuration mode, size and SHA-256 remained exactly
unchanged. The candidate then ran over that preserved state:

| Observation | Result |
| --- | --- |
| Dashboard / SSE | authenticated, `LIVE` |
| Environment Discovery | `QUICK_RESCAN`, `SKIP_TESTING`, `COMPLETED` |
| Discovery inventory | 48 items, 0 failures, no remote/memory opt-in |
| Configuration application | none |
| Estate Map | 53 nodes / 55 edges |
| Observer | `CONTROLLER_LOCAL / AGENT_CONTROL_INTERNAL / CONTROLLER_INTERNAL` |
| Human request | `Start operator-system-observation@1.1.0` |
| Sealed proposal SHA-256 | `fe1700e216b48c73338de773becaa0bf134acebe87ce749531516cf10535c20c` |
| Work Parcel | `parcel-social-ab8fe356b26e5981d0401c23bd006a99ca705145a050ed740f73563eccd5e3d0` |
| Run | `run-1a3b9c50-a780-45e5-a573-af3e2d1a27ff` |
| Result | `SUCCEEDED` |
| Runtime safety | `observe=ALLOW`, `verify=ALLOW`, both `READ_ONLY`; no `REMOTE_NODE` |
| Browser errors | none |

This closes the installation path that v4.5.0 had not qualified. Historical
records already present in the v4.1 state remained available; the qualification
added new append-only runtime evidence rather than resetting state.

## Governed production upgrade and smoke

Only after both isolated paths and the complete suite passed, the scoped
`agent-control-poe.service` was stopped. Its production configuration was mode
`0600`, 3,267 bytes and had the same v4.1 SHA-256 recorded above. A fresh
owner-only stopped-state rollback archive was created before any deployment:

- File: `poe-v4.1.0-pre-v4.5.1-20260913T062816Z.tar.zst`
- Size: 181,325,455 bytes
- SHA-256: `764a5505cd99585e87478db257d5060da3833603ff837af449b34ee3d9c411c6`

The older pre-v4.5.0 rollback archive and immutable v4.1 source checkout also
remain unchanged. Bootstrap against the exact evidence checkpoint
`2f7061a2087c9847dc9fb737db9f6bd2ac1e4672` reported
`PRESERVED_EXISTING`; configuration mode, size and digest remained identical.
The same existing supervisor then started Agent Control 4.5.1 on its original
loopback endpoint.

| Production observation | Result |
| --- | --- |
| Service/version/source | active; `4.5.1`; clean `2f7061a2087c9847dc9fb737db9f6bd2ac1e4672` checkout |
| HTTP / SSE / operator boundary | `200`; `200` live stream; authenticated |
| Environment Discovery | `QUICK_RESCAN`, `COMPLETED`, 41 items, 0 failures |
| Configuration application | none |
| Estate Map | 46 nodes / 48 edges; observer beneath controller |
| Human request | `Start operator-system-observation@1.1.0` |
| Sealed proposal SHA-256 | `d68805fb3eedc7f9c693324f5af1d9a960b4de6e9b7869791813bdbee600dffb` |
| Work Parcel | `parcel-social-09c36c5abf3b8c9689f73710628538b99a616a23b605adf05cbc0e59bfcb447e` |
| Run | `run-1bc43069-ca36-4c73-ad9f-2dc3c2f075c9` |
| Result | `SUCCEEDED` |
| Runtime safety | `observe=ALLOW`, `verify=ALLOW`, controller-local `READ_ONLY`; no `REMOTE_NODE` |
| Dashboard sweep | Jobs, Lanes, Models, Warm Cache Runtime, Crew and Configuration all rendered LIVE |
| Browser errors | none in governed run or dashboard sweep |
| Speech companion service | remained active |

The production recording is H.264 1920×1080 at 25 fps, 14.04 seconds,
3,279,937 bytes, SHA-256
`10788cdfcd31cd5d8cb7be66de53fae8c5b2cbd44fe87aeef85deda3b2ed0022`.
It records the actual existing service, Morrow proposal/approval, Process and
Estate Maps, succeeded Work Parcel and complete natural transcript; it does not
start a substitute qualification server.

## External evidence

The operator-owned evidence root is
`agent-control-4.5.1-controller-local-worker-20260913/physical-b721513/`.
Its runtime manifests carry individual hashes for every screenshot, transcript,
report and recording. The principal artefacts are:

| Path within evidence root | Bytes | SHA-256 |
| --- | ---: | --- |
| `final-full-check.log` | 134,967 | `34459108ae79150bd4658ff9462e25f17dd0bfa71691c01a561c7eeb2b61ce07` |
| `virgin-install-runtime/qualification.json` | 4,102 | `9b2b3ed09a1ac287467ccb00e5be983da2995a1384bb50fa8d71fb3cfc57f7a5` |
| `virgin-install-runtime/complete-human-readable-transcript.md` | 8,532 | `16993fb64650980152ca1258f9ee5ed0a2ccbdc642fe1eaaff2d3bda80acb534` |
| `virgin-install-runtime/agent-control-4.5.1-installed-candidate.mp4` | 3,356,846 | `b1473570ae58a2dc87922a017a9f8b79fb170fe95addd8beff1ca22377662aff` |
| `upgrade-v4.1/runtime/qualification.json` | 4,113 | `dda6da4f2332afac4780e92ab4888935c5077e0a2941218fee8459759004d782` |
| `upgrade-v4.1/runtime/complete-human-readable-transcript.md` | 8,933 | `70143e4a0f48fdca221f75f572ca38b4893aa2b2de96a2b7bed09cbb2db41b29` |
| `upgrade-v4.1/runtime/agent-control-4.5.1-installed-candidate.mp4` | 3,668,015 | `c4471ade2f96e74f197fe6bc7d5f7b2edd4f51316096e571ff8191b7daeb0fc7` |

Both recordings are H.264, 1920×1080, 25 fps. They show the real dashboard,
discovery, Estate Map and observer inspector, sealed Morrow proposal, Process
Map execution, succeeded state and final natural transcript. Eight screenshots
per path are listed and hashed individually in the adjacent evidence manifests.

The public-safe selected evidence is sealed as
`agent-control-4.5.1-dual-install-qualification-b721513.tar.zst`, 14,024,203
bytes, SHA-256
`34c377c608872ad40d89f668bd86eeffcb1adcea4da431a8b730fd1ac8757277`.
It contains 32 entries and excludes the authentic configuration, prior runtime
state, dependency tree and Git checkout.

The production evidence is separately sealed as
`agent-control-4.5.1-production-smoke-2f7061a.tar.zst`, 10,275,340 bytes,
SHA-256
`0110446f46a968e811a3ad5a5494c407d1fbd564157212562fcaaa8d01b6a74f`.
Its 26 entries contain the sanitized production summary, governed-run report,
complete transcript, HD recording, screenshots, dashboard sweep and audited
read-only harnesses. It excludes credentials, production configuration, prior
state, rollback archives, service definitions and raw server output.

## Security and release accounting

- The browser token was ephemeral and is absent from durable evidence.
- Raw server output and credential material were not persisted.
- A credential-pattern boundary scan over all selected archive inputs matched
  zero files.
- The authentic configuration content is not included in public evidence;
  only its non-secret size, mode and digest are recorded.
- The qualification used isolated state and ports and did not touch the running
  production controller.
- Genuine remote, unknown, spoofed and inconsistent worker cases remain denied
  by deterministic tests.

| 4.5.1 closure gate | Status |
| --- | --- |
| Focused regression | `PASS` |
| Full suite | `PASS` |
| Virgin install | `PASS` |
| v4.1 existing-configuration upgrade | `PASS` |
| Runtime-safety regression | `PASS` |
| Estate classification | `PASS` |
| Isolated genuine governed smoke Jobs | `PASS` |
| Known-good v4.1 rollback capability | `VERIFIED / RETAINED` |
| Production deployment | `PASS` |
| Production genuine governed smoke Job | `PASS` |

Every mandatory 4.5.1 runtime gate is now satisfied. The separately authorised
repository merge, immutable tag and GitHub Release may proceed. The retained
v4.1 source/state pair remains the rollback boundary until normal operational
retention policy supersedes it.

All previously accepted 4.5 limitations remain unchanged, including the 11/12
historical memory matrix, OpenRouter GLM→Qwen `BLOCKED_EXTERNAL`, NVIDIA
GLM→Qwen physical PASS, the exact MiniCPM configuration `FAILED` and unroutable,
the specialist-energy and warm-residency hypotheses `DISPROVEN`, and unavailable
whole-node energy measurement.
