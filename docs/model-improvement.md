# Governed Model Improvement

Agent Control 4.11 treats model improvement as a governed experiment over an immutable production baseline. A model never edits its own weights, prompt, routing, benchmark, evaluator, qualification record, policy, or promotion state. Agent Control records an opportunity, freezes exact identities, creates an isolated candidate, evaluates it independently, and waits for an explicit promotion decision.

## Modes

- `OFF` records and executes nothing.
- `ANALYSE_ONLY` may retain repeated evidence-backed opportunities but cannot create candidates.
- `CREATE_CANDIDATE` permits an approved, isolated candidate.
- `AUTO_TEST_CANDIDATE` may test an approved candidate but cannot promote it.
- `REQUIRE_PROMOTION_APPROVAL` keeps promotion behind an authenticated human decision.

All modes preserve the rule that production promotion is never automatic.

## Improvement ladder

The runtime records every considered level and the selected level:

1. deterministic removal;
2. prompt change;
3. context or retrieval change;
4. cache or expert reuse;
5. helper or decomposition;
6. speculative decoding;
7. routing;
8. teacher-generated data;
9. LoRA or another adapter;
10. deeper modification.

The first adequate, lower-cost intervention wins. Fine-tuning is not presumed necessary.

## Evidence and isolation

An opportunity needs repeated evidence and a referenced baseline. The frozen baseline hashes the model, runtime, parameters, context, prompt, benchmark, evaluator, hardware, and resource snapshot. A candidate has a distinct hash binding its parent baseline, dataset, configuration, result or adapter, runtime, tools, teachers, experiment, and timestamp.

Training examples retain source hashes and validation outcomes. Sensitive examples are rejected by default. Teacher output is evidence only; it cannot approve an experiment, modify evaluation, or promote a candidate.

Every experiment uses a sealed execution-scope envelope. Candidate output is the only writable area. The envelope excludes production baselines, governance, benchmark definitions, evaluators, and promotion state. Work Board stages expose baseline freezing, candidate creation, benchmark, security, regression, and promotion review. Existing pause, kill, quarantine, resource, and lane controls continue to apply.

## Evaluation and economics

Comparison may contain quality, performance, resources, tokens, monetary cost, energy, and safety metrics. Each value includes an authority. Missing measurements remain `UNAVAILABLE`; they are never converted to zero. Break-even workload count is calculated only when one-time cost and per-job saving share a known unit and authority.

Security findings quarantine the candidate. Protected regressions reject it. An inconclusive result stays inconclusive. A positive comparison enters `AWAITING_PROMOTION_APPROVAL`; the authenticated operator must approve the exact candidate hash. The current candidate records the approval and both route references, but it does not yet apply an intervention-specific production route/configuration effect. Its `PROMOTED` and rollback transitions are therefore lifecycle-contract tests rather than proof of a production mutation. Release requires a governed adapter receipt before those states may be treated as operational facts.

## API and dashboard

The authenticated read projection is `GET /api/model-improvement`. Operators can set the operating mode with `POST /api/model-improvement/mode`. An exact candidate awaiting approval can be decided through `POST /api/model-improvement/experiments/{id}/promotion` with its candidate hash, reason, and evidence.

The Models workspace presents opportunities, baseline and candidate identities, selected intervention, Work Board, security/regression state, economics, lifecycle evidence, and promotion controls. It is a renderer over the durable improvement record, not a separate source of truth.

## Current boundary

The 4.11 candidate qualifies the generic lifecycle, isolation, Work Board projection, protected API, restart reconstruction, independent comparison, and approval boundary. The bounded physical run stopped at `AWAITING_PROMOTION_APPROVAL`; no route was changed. Applying and rolling back intervention-specific production configuration remains a release blocker. Physical results must be recorded per experiment. No physical result authorises general automatic training or promotion.

**Agent Control governs model improvement. Models do not govern their own modification.**
