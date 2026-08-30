# Agent Control 3.3.0 candidate

Agent Control 3.3 adds natural-language Work Parcels and an inspectable execution audit without changing the existing Job, scheduler, worker, verification, or THIN/STANDARD/DEEP control boundaries.

Highlights:

- natural-language task entry that materializes governed multi-stage Work Parcels;
- durable decision-time routing rationale, considered alternatives, requested and actual routes;
- invocation-to-job-to-stage-to-parcel token, cost, model-time, and wall-time accounting;
- visible provider, model, profile, node, lease, progress, liveness, and last-activity state while work is running;
- a dashboard Audit view with execution timeline, verification outcome, and honest unavailable values;
- a safe deterministic dashboard qualification job and focused regression coverage.

This file describes the isolated 3.3.0 candidate. It is not evidence of a merge, tag, publication, deployment, or GitHub release.
