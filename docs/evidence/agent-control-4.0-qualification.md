# Agent Control 4.0 governed adaptive Crew qualification

Status: **PASS — AGENT CONTROL 4.0 RELEASE QUALIFICATION COMPLETE**

Branch: `integration/4.0-governed-adaptive-crew`  
Product checkpoint: `6a44c3b`  
Formal release action: none

The sole physical dependency recorded below was closed on the same product implementation by [the Pixel social continuation](agent-control-4.0-pixel-social-continuation.md). The historical `PARTIAL` finding and its reason remain documented below rather than being rewritten.

## Integration result

The 4.0 candidate composes the released 3.9 control plane, resilient retry/fallback, canonical SocialVoice/OpenWA Work Parcel ingress, event-backed Crew/WOPR projection, token-aware quality baton routing, evidence-driven Model/Workflow Leagues, semantic protected-resource governance, independent verification, complete execution transcripts and governed Live Shell sessions.

The source inventory and supersession decisions are in [the integration inventory](agent-control-4.0-integration-inventory.md). The NVIDIA history remains `PARTIAL` with `DO_NOT_ADMIT`; it is not converted into positive NVIDIA model evidence by generic fallback success.

## Qualification-discovered convergence defect

The first complete physical run began with the exact enrolled-device WhatsApp command `start governed-adaptive-crew` and successfully exercised concurrent Jobs, an ordinary PTY WATCH/INTERVENE/detach, local Qwen review, independent quality rejection, sealed baton, cross-provider Codex continuation, independent verification and reconciled token totals. Its post-run audit found that `WorkParcelCoordinator.submitApprovedPlan`, used by SocialVoice, persisted the canonical parcel but omitted the `ensureOrchestration` call used by dashboard/API submission. Consequently that run did not consult the adaptive leagues and cannot close the 4.0 gate.

The correction is deliberately narrow:

- `f6f4a1d` sends newly approved social parcels through the existing adaptive decision hook;
- `6a44c3b` makes idempotent replay repair a parcel persisted before that hook, covering crash/restart and pre-fix state;
- focused Work Parcel tests now prove new social convergence, durable decision persistence and decision-less restart recovery (20/20 pass).

No old run is relabelled as adaptive evidence. A fresh physical social run is required.

## Integrated protected-resource physical pass

The disposable Git qualification ran through the production model-proposal, sealed artifact, semantic effect resolution, runtime safety, argv-only execution, reconciliation and independent verification path at source commit `c7eaa9918068874e12d124f06e6a391337ffef5a`.

- Work Parcel: `parcel-4d34828b-a77d-4756-8480-fa9f08d5a0ce`
- Run: `run-06b5ef80-2108-46d4-b874-5baa2820a880`
- Adaptive decision: `orchestration-41c7baaf-082a-4d47-8086-7383299ee3b5`
- forbidden protected-ref variants denied: 11/11
- allowed neighbouring operations passed: 5/5
- protected `origin/master` before: `5636f9113c0288b89f825d1e9c512ccd13611b81`
- protected `origin/master` after natural and adversarial runs: `5636f9113c0288b89f825d1e9c512ccd13611b81`
- protected governed-process sessions: 25, all `WATCH_ONLY`; intervention, take-control, stdin and signals unavailable
- restart: natural Run restored and all 19 safety decisions restored

Machine evidence: [JSON](agent-control-4.0-protected-resource-qualification.json)  
Complete natural transcript: [Markdown](agent-control-4.0-protected-resource-transcript.md)

## Automated validation

At `411781d` with both convergence corrections, the final `npm run check` passed:

- TypeScript: pass
- bootstrap and shell syntax: pass
- dashboard JavaScript syntax: pass
- infrastructure neutrality: 3/3
- implementation status: 52/52
- deterministic tests: 1,014/1,014

The focused Work Parcel suite passed 20/20, including both social convergence tests.

Documentation validation examined 137 Markdown documents and 822 local links with zero broken links. `git diff --check` passed. The protected JSON/transcript had zero matches for credential-home paths, OAuth/access/refresh token assignments, bearer values or private keys.

## Historical remaining gate and external state

The final post-fix social/video run was attempted twice. The first attempt stopped before Work Parcel creation because the recorder checked for the newly queued WhatsApp notification before delivery; `01d1718` replaces that single check with a bounded fail-closed wait. The second attempt stopped before Work Parcel creation when the configured Pixel Termux SSH endpoint timed out. Independent checks then showed the Pixel offline in Tailscale with no response on its configured SSH port. Agent Control, OpenWA, the controller, providers and the protected-resource qualifier remained healthy.

The qualification-ready message was accepted by the existing OpenWA gateway. It cannot execute work: the enrolled Pixel must itself submit the exact approved command. Replaying or fabricating a signed webhook would not satisfy the physical remote-ingress gate and was not done.

When the Pixel returns online, the remaining run must prove in one continuous capture:

1. authenticated Pixel WhatsApp → OpenWA → SocialVoice canonical Work Parcel;
2. persisted parent and repository-review adaptive decisions, with sparse evidence labelled honestly;
3. Jobs, Lanes, Systems, Models, Routing decision tree and all six event-backed Crew roles;
4. real ordinary PTY WATCH → harmless INTERVENE → detach, with durable human events;
5. local Qwen response and natural independent quality decision;
6. sealed baton and cross-provider Codex continuation;
7. independent verification, source recovery and aggregate token reconciliation;
8. product-generated complete transcript beginning with the exact initiating request;
9. 1920×1080 continuous MP4 and reconciled screenshot/video manifest.

At that checkpoint the integration branch was reviewable, but the 4.0 physical release-candidate gate remained open. No merge, tag, GitHub Release or deployment was authorized or performed.

## Pixel continuation and final gate

The Pixel returned online and the exact frozen `start governed-adaptive-crew` command was sent from the enrolled physical device. The fresh run entered normal adaptive orchestration, consulted Model and Workflow League evidence, ran concurrent governed stages, rejected a schema-valid but incomplete local Qwen review at the independent quality gate, created a sealed baton, continued under the distinct Codex destination route, passed independent verification, reconciled 10,401 tokens across both model legs, preserved the protected ref, generated the complete origin-first transcript, and returned `AC-1: SUCCEEDED` through WhatsApp.

Machine evidence, the complete transcript, an 83.28-second 1920×1080 continuous video, screenshot manifest, idempotency reconciliation, terminal response evidence and attempt history are in [the continuation addendum](agent-control-4.0-pixel-social-continuation.md).

**RELEASE GATE: PASS**

**READY TO MERGE/TAG/RELEASE: YES**

No merge, tag, GitHub Release or deployment was performed. Those remain subject to separate operator approval.
