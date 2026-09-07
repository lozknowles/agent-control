# Agent Control 4.0 integration inventory

Recorded: 2026-09-07  
Integration branch: `integration/4.0-governed-adaptive-crew`  
Baseline: `eb291f9c9f2ff0fb74956b367c16218ef0b057f3`  
Current candidate checkpoint: `c7eaa9918068874e12d124f06e6a391337ffef5a`

This inventory was produced from Git branches, remotes, worktrees, ancestry and working-tree state. All listed source worktrees were clean when inspected. The integration branch is pushed. No merge to `main`, tag, GitHub Release or deployment is part of this candidate.

| Workstream | Authoritative source | Integrated form | Qualification state | Dependencies and overlap |
| --- | --- | --- | --- | --- |
| Released 3.9 baseline | `main` at `4966c97505d05e5be3a2f8cae092113ad44d636e` | Ancestor of the selected 4.0 baseline | Formally released historical baseline | Supplies canonical Work Parcels, provider registry, token governor, credentials and dashboard. |
| Resilient execution/failover | `feature/3.9-resilient-execution` at `9e7696fd223a1eb80f5f83c94935b5b5ba8ef20e` | Direct ancestor | Physically qualified before integration; deterministic coverage retained | Overlaps provider-neutral retry, token baton, handoff, verification and transcript work. |
| OpenWA/WhatsApp | `feature/openwa-whatsapp-20260905` through `282dbc7`, plus later SocialVoice corrections | Direct ancestors | Signed/enrolled messaging path previously qualified; 4.0 social run must re-prove convergence | Canonical channel adapter only; execution remains Work Parcel owned. |
| Social + voice | `feature/3.9-social-voice-20260905` at `e831d9f128e9dc89d52f3615fbb59262c94a395b` | Direct ancestor | Text and confirmed voice-note path qualified; duplex calls remain partial | Uses OpenWA identity and canonical Work Parcels. |
| Realtime duplex voice experiment | `feature/3.9-realtime-voice-20260905` at `a1ff45c8a60b671bb6a92e6beeeae43ebb52c41b` | **Not integrated** | Experimental / not production-ready | Preserved on its pushed branch. Excluded because WhatsApp call-media ingress is not qualified; 4.0 does not fake duplex voice. |
| Crew and WOPR dashboard | `integration/3.9-social-voice-animated-dashboard` at `0e915b7`, then Crew/WOPR ancestors through `f25da09` | Direct ancestors | Event-backed animation and quality-escalation evidence retained; 4.0 physical recording in progress | Presentation consumes canonical Run, Work Parcel, route, baton and verification events. |
| NVIDIA hosted provider | Qualification line through `aa33b3308e5950478a5341b4ac904b2b0902a886` | Direct ancestor as historical evidence and generic provider machinery | **PARTIAL; DO_NOT_ADMIT** for tested production roles | Generic retry/fallback evidence is useful. It does not make NVIDIA qualified or routing-eligible. No catalogue-wide rerun is authorised here. |
| Evidence-driven adaptive orchestration | Product delta `bb9ae60` on the selected ancestry; separately preserved equivalent workstream `feature/adaptive-multi-model-orchestration-20260907` at `f8552ae` | `bb9ae60` plus 4.0 convergence fix `f6f4a1d` | Deterministic suite passed; protected-resource physical decision passed; social physical rerun pending | Model/Workflow Leagues and decision trees are below Work Parcels. The separate `f8552ae` branch was not blindly merged because it is based on a different checkpoint. |
| Protected-resource governance | `feature/protected-resource-mutation-governance-20260907` at `eb291f9c9f2ff0fb74956b367c16218ef0b057f3` | Selected integration baseline | Integrated 4.0 physical rerun passed: 11/11 denied, 5/5 allowed, protected SHA unchanged | Uses common semantic effects, runtime governor, owned execution and independent verification. |
| Live Shell / PTY | `feature/3.9-live-shell-pty-attachment` at `4c93227b1670672b663a57b6d68e51c54065e0d7` | Deliberate cherry-pick `e7045fde8babc3d5ee95bbacc5ef78f120e59a79`, followed by 4.0 policy integration in `96638b7` | Ordinary WATCH/INTERVENE/detach passed in the earlier complete 4.0 run; protected physical sessions now prove WATCH-only | Reuses JobRuntime-owned processes and existing managed-node transport. No second shell authority exists. |
| 4.0 canonical origin/transcript integration | `96638b796fbc823f9064c61141393c5c03749653` | Direct ancestor | Deterministic origin and complete-transcript tests passed | Introduces a common request-origin envelope from channels through Work Parcels and execution transcripts. |
| Social adaptive convergence correction | `f6f4a1d` | Direct ancestor | Focused 19/19 Work Parcel tests pass; physical rerun pending Pixel availability | Fixes the discovered omission where `submitApprovedPlan` persisted a social parcel without invoking the normal adaptive decision hook. |

## Supersession decisions

- The separately based adaptive branch and Live Shell source branch remain preserved and pushed; only their coherent product deltas were integrated onto the newer 3.9/protected-governance ancestry.
- The realtime voice branch remains separate because its duplex transport is not production-qualified.
- Historical NVIDIA evidence remains append-only and negative where it was negative. Its controlled fallback success is resilience evidence, not NVIDIA model admission evidence.
- Qualification-only recorder corrections after `96638b7` do not add alternate product architecture. They make the physical Android, browser, transcript, video and Live Shell evidence fail closed and reproducible.

## Current physical evidence

- Protected-resource run: [`agent-control-4.0-protected-resource-qualification.json`](agent-control-4.0-protected-resource-qualification.json)
- Complete protected-resource transcript: [`agent-control-4.0-protected-resource-transcript.md`](agent-control-4.0-protected-resource-transcript.md)
- The final social/Crew recording is intentionally not listed as complete until it has been rerun against the adaptive-convergence checkpoint; a prior successful recording exposed that integration omission and therefore cannot close the gate.
