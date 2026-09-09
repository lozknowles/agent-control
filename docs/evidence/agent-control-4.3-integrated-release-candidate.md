# Agent Control 4.3 integrated release candidate

Status: **IMPLEMENTATION FROZEN PENDING FRESH PHYSICAL A–F QUALIFICATION**

This record distinguishes deterministic integration evidence from the fresh
physical release evidence still required for Agent Control 4.3.0. Historical
4.2 and 4.3 qualification artefacts are preserved and are not attributed to
this candidate.

## Reconciled provenance

- Integration base (`origin/main`): `3c906bd3ec55b97815dd79cc79661bed4a255b33`
- Historical integration merge-base: `e7fe5c010bbea75e41f8ec875aab08caaa738104`
- Agent Control 4.2 source checkpoint: `f525aff1228335e649c192de727ea9a09fb5b6db`
- Previously qualified 4.3 implementation: `bfec20317361fd20f886bba5a1b752d570fc2cbe`
- Preserved historical evidence HEAD: `a6d35253bb40c2da049945430ebc1960cde4468b`
- Integration branch: `release/4.3.0-integration-20260909`
- Frozen product candidate SHA: `f59aab4e1150bc054a53c9df2af83435a2087e6a`

The remote was fetched immediately before the candidate freeze and
`origin/main` remained at the integration base above.

## Integrated behavior

The candidate preserves the current 4.1 product surface and adds the intended
4.2 Transport Context integrity boundary, authoritative non-OpenAI cache
evidence, Cache-Aware Expert Delegation, durable replay-safe invalidation and
the live Warm Cache Runtime dashboard. Canonical product and documentation
metadata identify version 4.3.0.

## Significant integration and hardening decisions

- Work Parcel, provider-execution and cache-routing changes were applied as
  additive commits over current `origin/main`; current main was not replaced.
- Cache evidence is retained as an explicit authority-bearing structure. A
  stale test expectation that omitted this intended structure was updated;
  validation was not weakened.
- Consequential action authority is derived from typed effect declarations.
  Action names and request keywords can only make classification more
  restrictive and cannot grant authority. Missing or ambiguous declarations
  fail closed and cannot be approved around.
- Filesystem scopes are compared by canonical native paths. Symlink escapes,
  traversal, prefix confusion, unresolved foreign-platform paths and
  prospective writes outside the nearest canonical parent fail closed.
- Governed Git execution revalidates the canonical working directory, disables
  hooks, filesystem monitors, terminal prompting, external diff drivers and
  text conversion where applicable, and rejects unsupported configuration
  mutation.
- Fast execution records ignored-state manifests and treats changes as
  out-of-scope unless the root is explicitly disposable. Valuable ignored
  state is preserved.
- Provider/model execution remains behind existing typed adapters; no new raw
  shell or generic transport authority was introduced.

The first fresh physical attempt exposed a qualification-discovered integration
defect before a Work Parcel was submitted. The combined registration expression
passed the shared efficiency ledger to the protected-resource registrar but not
to the outer opt-in non-OpenAI cache registrar, so production startup failed
closed with `non_openai_cache_efficiency_ledger_required`. Registration is now
spelled out as ordered typed steps and the ledger is supplied to both consumers.
A focused production-definition test enables the real cache qualification
registration and proves both actions are present. The failed attempt produced no
release evidence; fresh A–F qualification restarts from pristine state against
the revised candidate.

The complete execution-route inventory and containment matrix are maintained
in [Runtime safety and containment](../runtime-safety-and-containment.md).

## Deterministic evidence

- Focused runtime safety, JobRuntime, Git containment and ignored-state tests:
  `69/69` passed.
- OpenAI-compatible cache normalization tests: `34/34` passed.
- Complete repository suite before the qualification-discovered bootstrap fix:
  `1118/1118` passed. Revised-candidate regression is pending below.
- TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality,
  implementation-status consistency and documentation-link checks: required
  as part of the final release validation.
- `git diff --check`: passed before candidate freeze.

## Remaining release gate

The exact frozen commit must pass fresh physical gates A–F through normal
production Work Parcels, with independent verification, reconciled cache and
route evidence, complete natural transcript and a genuine 1920×1080 recording.
The required operator-facing statement is:

> A warm cache improves efficiency but does not confer correctness or authority. Capability, integrity and governance always outrank cache warmth.

No merge, tag, GitHub Release or POE showcase publication is authorised by this
implementation-only record.
