# Agent Control 3.7 physical qualification — partial

Timestamp: `2026-09-02T19:02:41Z`  
Verdict: **PARTIAL — IMPLEMENTATION SOUND, QUALIFICATION INCOMPLETE**

## Frozen candidate

- Product base: `5acdde13e41d58b511a33ac0e15f3dc6d3930613` — `feat: complete 3.6 runtime observability checkpoint`.
- Qualified candidate: `2a6f6c49b96384774da5135945d009f032c2e7fb` on `feature/3.7-token-aware-baton-routing`.
- Remote `origin/feature/3.7-token-aware-baton-routing` matched the candidate SHA before qualification.
- The worktree was clean before qualification. The candidate is a descendant of the stated product base, with only `82afa61 feat: add token-aware baton routing` and `2a6f6c4 fix: keep live token telemetry current` above it. No benchmark/evidence-only commit is in its product base.

## Environment and normal release-quality gate

- Host: current Linux controller workspace.
- Agent Control: `3.7.0` candidate.
- Installed Codex: `codex-cli 0.144.4`, authenticated using ChatGPT.
- Command: `npm run check`.
- Result: **308/308 PASS, 0 failures**. This includes TypeScript, bootstrap syntax, dashboard syntax, neutrality, generated implementation-status consistency, and the complete repository test suite.

## Physical Codex observation

Command (read-only, ephemeral, no repository access):

```bash
codex exec --json --ephemeral --sandbox read-only --skip-git-repo-check \
  'Reply with exactly: AGENT_CONTROL_37_CODEX_QUALIFICATION_OK. Do not run commands or inspect files.'
```

The genuine thread emitted `thread.started`, then `turn.completed` with `12,475` input tokens, `8,960` cached input tokens, `15` output tokens, and `0` reasoning-output tokens. It did **not** emit a current-context token count or context-window limit. The 3.7 Codex adapter therefore represents current context and context percentage as `unavailable`; it does not derive occupancy from the cumulative usage (`12,490` total by input plus output). This is the required truthful unavailable semantics, not an estimate.

## Dashboard observation

The candidate dashboard was started from an isolated temporary state directory on loopback. `GET /api/status` reported `version: 3.7.0`, `health: healthy`, and the configured 75/85/90 governor policy. The normal SSE/dashboard implementation was already covered by the complete suite, including the live `token.telemetry` event and `GET /api/token-routing` projection tests.

The isolated runtime reported `providers: 0`, `resources: 0`, and `tokenThreads: 0`. It was correctly observer-only and could not accept a provider-backed Work Parcel.

## Provider and governed-handoff boundary

No Agent Control runtime configuration was present at `.agent-control/config.json`, `AGENT_CONTROL_CONFIG`, or `AGENT_CONTROL_STATE_DIR`; there was no running Agent Control service. The current process environment exposed no OpenAI/OpenRouter/GLM credential reference. Consequently, there were no already configured providers or models to inspect for authoritative live-context telemetry.

This means the following mandatory physical gates were **not run**, rather than simulated:

- live dashboard Thread Context values for a governed provider-backed parcel;
- physical `CONTINUE → PREPARE_BATON → COMPACT → HANDOFF` transitions;
- a real Sol → Luna or Sol → GLM-5.3-Flash baton and destination execution;
- durable destination-failure recovery on a physical model route;
- physical Work Parcel cost-per-verified-outcome reconciliation across a handoff.

No fake provider, copied historical credential, manufactured baton, or synthetic model route was used to fill these gaps. The deterministic suite does cover these behaviours, including durable transition/recovery and `Sol 184k → Luna 31k → GLM-5.3-Flash 18k = 233k` arithmetic, but that is not physical-provider qualification.

## Required next qualification environment

Provide the current Agent Control configuration/state directory with at least two qualified, credential-referenced provider routes: a stronger source model and a genuinely cheaper destination model. Then rerun this candidate's bounded physical Work Parcel with reduced qualification-only thresholds/window, preserve the sealed baton SHA-256 and all transition records, deliberately fail the narrow destination operation once, independently verify the completed parcel, and reconcile dashboard, token-routing evidence, Work Parcel ledger, and cost accounting.
