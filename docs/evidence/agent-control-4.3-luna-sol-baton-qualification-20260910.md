# Agent Control 4.3 POE Luna-to-Sol baton qualification

Date: 2026-09-10
Verdict: **PASS — genuine POE-originated Luna-to-Sol baton handoff recorded and independently verified**

This is post-release qualification evidence for the released Agent Control 4.3.0 baseline. It does not merge, tag, release, or deploy another product version.

## Qualified production path

The operator request was visibly typed into POE as:

`Start crew-wopr-review@1.0.0`

POE generated a sealed proposal, displayed its effects and preflight information, and required explicit approval. Approval created parent Work Parcel `parcel-social-c13727c889514ea55f1377210e9450b16a726023c56a783db4ed071c95c7d6a2` and parameterized run `6be67272-d252-4a0b-9434-e50cd24d81ef`.

The exercised path was:

`POE request -> sealed proposal -> explicit approval -> Work Parcel -> Luna execution -> independent quality gate -> sealed baton -> governed Luna-to-Sol route -> Sol continuation -> same independent quality gate -> independent job verification -> reconciled ledger`

The nested token-aware Work Parcel was `parcel-8060075a-a374-498e-8350-68635802be5e`.

## Why Agent Control changed models

Luna (`codex-chatgpt / cottage-plus / gpt-5.6-luna`) returned a complete, transport-valid and repository-review-schema-valid five-finding review. Agent Control did not reject Luna because of a provider error, malformed output, token pressure, or an artificial threshold.

The independent `reservation-cache-root-cause-v1` quality gate rejected Luna because three acceptance criteria remained unresolved:

1. The review did not identify the reservation defect precisely as a non-atomic check-then-update, or explicitly prove that both callers can complete the ownership check before either caller updates ownership.
2. It did not explain that both concurrent callers can observe the reservation as unowned before either update occurs.
3. Its proposed lease remediation did not name `issuedAtSeconds`, `maxAgeSeconds`, and `nowMs` and state a dimensionally valid normalization of the seconds values against the millisecond clock.

Because unresolved reasoning remained and the stronger configured destination was qualified, the governed quality route selected:

`codex-chatgpt / cottage-plus / gpt-5.6-luna -> codex-chatgpt / cottage-plus / gpt-5.6-sol`

This was a quality-triggered model escalation at low context pressure. It was not a silent substitution and was not represented as a context-exhaustion handoff.

## What the baton passed

Agent Control created and sealed baton `token-baton:f7775b79-44aa-4ed6-a746-6ceb387a190d` with SHA-256:

`0647c126a2fafeba2469dcc0a9296064f8cad6d93436da09b590ff3a0abf53e0`

The durable baton carried:

- the original repository-review objective and exact next action;
- Luna's completed work and full structured findings;
- the independent gate's three unresolved acceptance criteria and decision rationale;
- repository identity, immutable snapshot and dirty/diff state;
- files and evidence already inspected;
- tests and qualification evidence available at handoff;
- source provider, account profile, model and thread identity;
- the sealed destination provider, account profile and model identity;
- token state at the handoff and cumulative Work Parcel usage;
- source-thread recovery information.

Sol continued on destination thread `repository-review:6be67272-d252-4a0b-9434-e50cd24d81ef:1:context-1-240aabbf5df2:quality:codex-sol-controller-a`, using the baton rather than restarting task discovery. Sol's schema-valid review addressed all three missing criteria. The same independent gate accepted it, and the final independent job verification passed. The original Luna thread remained recoverable.

## Token and cost reconciliation

| Leg | Model | Input | Fresh input | Cached input | Output | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Source | Luna | 7,885 | 7,885 | 0 | 1,398 | 9,283 |
| Destination | Sol | 9,655 | 3,383 | 6,272 | 1,745 | 11,400 |
| Work Parcel | Luna -> Sol | 17,540 | 11,268 | 6,272 | 3,143 | 20,683 |

The ledger reconciles exactly: `9,283 + 11,400 = 20,683` total tokens.

Current-context occupancy was unavailable from these live provider responses. The dashboard and evidence therefore report it as unavailable and keep it separate from cumulative token consumption; lifetime totals were not misrepresented as context occupancy. The configured context limit was 272,000 tokens.

Authoritative per-run monetary billing was unavailable for this ChatGPT-plan route. Cost is recorded as unavailable, not as zero, and no monetary-saving claim is made.

## Video and dashboard evidence

The continuous, unspliced recording is `agent-control-4.3-luna-sol-baton-20260910.mp4`:

- resolution: 1920 x 1080;
- duration: 88.88 seconds;
- codec: H.264;
- size: 11,685,661 bytes;
- SHA-256: `329599f62837d4904173f0f1b7e27a91f1679494db77d21ef16e5495b1b59dc1`.

It visibly records the POE-typed command, sealed proposal and approval, Luna execution, Crew activity, Jobs/Lanes/Models/Systems views, independent gate rejection, baton creation, selected Sol route, Sol continuation, independent acceptance, reconciled model chain, and the complete human-readable transcript. The dashboard consumed the live SSE lifecycle and telemetry events; 36 events produced 54 renders, including `job.run_changed`, `token.telemetry`, `token.governor_transition`, `token.baton_created`, and `token.handoff_result`.

The transcript is a naturally generated execution record, not a release-signoff summary. It starts with the exact POE interaction and retains the chronological product events, complete Luna and Sol results, gate decisions, baton event, routing event, verification result, and token ledger.

## Validation

- Full suite: 1,119 passed, 0 failed, 0 skipped.
- TypeScript: passed.
- Bootstrap checks: passed.
- Dashboard checks: passed.
- Provider-neutrality checks: 3/3 passed.
- Implementation-status checks: 54 entries passed.
- Credential scan: no credential material is intentionally included in the evidence.
- Protected released baseline was not changed or deployed.

## Evidence index

- `agent-control-4.3-luna-sol-baton-qualification-20260910.json` — complete machine-readable run evidence.
- `agent-control-4.3-luna-sol-baton-transcript-20260910.md` — complete human-readable product transcript.
- `agent-control-4.3-luna-sol-baton-video-20260910.json` — recording/browser/SSE/animation manifest.
- `agent-control-4.3-luna-sol-baton-20260910.mp4` — continuous HD recording.
- `agent-control-4.3-luna-sol-baton-20260910/` — selected still frames for rapid review.

Artifact SHA-256 values:

- machine evidence: `087449e7476c3e244e22657baa8e837ea9ca16fafa97c294be2825044d8ebbcb`;
- transcript: `db8167b65203c8572a9ef8c2edfcdbff354b701c5eab7f8c9cde96d0b35b2c98`;
- video manifest: `14c659826da208adbfb5d9850c3bb03864dc7fd313063c6937b8a66177bc32ec`;
- video: `329599f62837d4904173f0f1b7e27a91f1679494db77d21ef16e5495b1b59dc1`.
