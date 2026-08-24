# Adaptive harness recovery and integration evidence — 2026-08-24

## Scope and status vocabulary

This audit began before code changes and used the released `main` commit `9d751ee076c634e4b4311c451af3e6d3e1891b9c` as the integration base. It did not modify any existing worktree, production service, PTY, lease, release tag or external infrastructure.

- **SOURCE VERIFIED**: established from Git objects or source inspection.
- **EXPERIMENTALLY VERIFIED**: exercised by a named automated command in an isolated test copy.
- **INFERRED**: architectural conclusion supported by source but not exercised end to end.
- **NOT IMPLEMENTED**: no executable implementation was found.

## Pre-change repository and worktree inventory

### Released and active lines

| Ref | Exact SHA | Pre-change status | Relevance |
|---|---|---|---|
| `main`, tag `v3.0.1` | `9d751ee076c634e4b4311c451af3e6d3e1891b9c` | clean main worktree; GitHub head verified | Integration baseline |
| `release/3.0.1-infrastructure-agnostic` | `6680b72d96ad7469bf6054343a22a55cc9b47bf6` | clean | 3.0.1 neutrality implementation; merged into main |
| tag `v3.0.0` | `617200889977fbef7e0358557feab6932583b0df` | immutable release | Hybrid execution/context merge |
| `release/3.1.0-control-plane-dashboard` | `1866f049d79e6cae4f83d3f7fb82fc02c88b13c8` | clean and pushed | Active 3.1 work; inspected but not modified or backported wholesale |
| `release/2.0.0-pixel-alpha` | `d18c3454917f48dfa5283d8b5c04b0a8646728ed` | existing worktree has mass staged deletions | Unrelated user state; deliberately untouched |

The configured GitHub remote also exposed these relevant heads at audit time:

| Ref | SHA | Finding |
|---|---|---|
| `research/orca-hybrid-integration-20260823` | `93c0e79e981710a0fa18a41e701b59164ce7bb52` | Integrated into `v3.0.0`/main |
| `agent/scheduler-handoff-shared-context` | `89c7aae259caf5518d99b020a8979c22db59830f` | Integrated into main |
| `agent/integrate-control-pty-qualification` | `b2f6e57c91f5506f5e241e123a11d101efd073a1` | Relevant contract migration already integrated |
| `agent/pty-self-routing-model-qualification` | `f3938407bf7db9749a27a79f298d4dada31308ff` | Earlier development lineage; equivalent PTY/routing/qualification abstractions were integrated through later commits |
| `codex/bounded-context-browser-provider-20260818` | `f57c7d80bf85391494d003bdf9ab0134d9c1ead1` | Portability-only tip; no missing harness architecture |
| `design/v3-agtx-pre-freeze-20260821` | `c0dac86dfffeed84289988bb4480791990d99728` | Design intent; not implementation |

### Unmerged adaptive-routing work

| Ref | Exact SHA | State | Decision |
|---|---|---|---|
| local `feature/v3-economic-intent-routing` | `2b187705ca9c0bff3bfd8374c0596c040c47ba3c` | clean isolated worktree; one implementation commit above design base; not a GitHub head at audit time | Port the router and escalation ideas selectively; do not cherry-pick the 1,957-line commit |

`2b18770` added execution intents, provider economics/performance, qualification/approval/spend/latency gates, dynamic escalation, routing telemetry, scheduler/executor integration, UI changes and simulation evidence. Its core algorithms were mature and tested. Its surrounding branch predated 3.0.1 neutrality and changed large shared files including bootstrap/UI/state, with resource/model examples and assumptions inappropriate for a direct merge. The integration therefore ports only the provider-neutral routing core and writes new composition tests against current main.

### 3.1 work inspected, not backported as 3.0.1

Commit `9539b7b` adds the shared application service, persisted routing rationale and a typed claim/evidence/verification/acceptance service. Commits `9a6f91f`, `ea02747`, `f2736f4`, `d287ecb` and `1866f04` add Job/Scheduler, evidence, dashboard integration and operator documentation. These are coherent 3.1 boundary work and remain on the 3.1 branch. They are referenced as forward architecture, not represented as released 3.0.1 functionality.

Two unreachable commits found by `git fsck --no-reflogs --unreachable` contained superseded copies of 3.1 documentation/evidence (`26a2931`, `e130e0d`). Their content is reachable in later 3.1 commits; no recovery was required.

## Commands used for the Git audit

Representative read-only commands:

```text
git status --short --branch
git branch -a -vv
git worktree list --porcelain
git log --all --not main --date=iso --oneline
git log main --merges --date=iso --oneline
git reflog --all --date=iso
git fsck --no-reflogs --unreachable --no-progress
git merge-base --is-ancestor <tip> main
git log --left-right --cherry-pick --no-merges main...<tip>
git show --stat <commit>
git diff --name-status <commit>^ <commit>
git ls-remote --heads origin
git ls-remote --tags origin
git grep -n -i <architecture terms> <ref>
```

## What main actually implemented before this integration

**SOURCE VERIFIED** at `9d751ee`:

- durable lanes, hard contracts, revisioned batons, leases, AUTO/MANUAL modes, priorities, handoff, clone and shared-task identity;
- capability-neutral resources and placement constraints (`capabilities.ts`, `work-scheduler.ts`);
- provider registry and `AgentRecipe` fields for provider, model, profile, reasoning, prompt, tools and skills (`providers.ts`);
- `ModelRecipe` fingerprints with runtime, context size, chat template, prompt version, skill/tool snapshots and inference parameters (`types.ts`, `experiments.ts`);
- capability scoring, champion/challenger routing, promotion gates and successive-halving stages (`routing.ts`, `qualification.ts`, `experiments.ts`);
- provider-neutral selective context routing, evidence-weighted consensus and provenance (`context.ts`);
- explicit PTY ownership and unconditional human takeover (`pty.ts`);
- a replaceable execution-provider contract and Orca adapter with recovery identity and authority generations (`execution-provider.ts`, `orca-execution-provider.ts`);
- Work Queue, dependencies, placement, batching, preemption, checkpoints, retries and low-confidence review.

Main did **not** have one abstraction that composed those pieces into a complete execution recipe. It stored skill/tool names but had no general qualified-skill selector or general enforcement gate for per-recipe tools. Its model routing was capability-score based but did not include the mature economic/latency/failure model from `2b18770`. `docs/concepts.md` did not exist. These gaps made the repository appear narrower than its executable foundations.

## Implementation matrix

| Capability | Main at `9d751ee` | Local/other work | Tested before | Integrated here | 3.1 boundary |
|---|---|---|---|---|---|
| Capability/resource resolution | Implemented | Extended by economic branch | Yes | Reused unchanged | Formal worker registry |
| Provider/model recipes | Partial: `AgentRecipe` + `ModelRecipe` | Economic branch adds route estimates | Yes | Composed into `ExecutionRecipe` | Durable recipe catalog |
| Prompt/profile selection | Stored field only | No separate selector found | Provider registry only | Candidate profile selected in builder | Catalog/qualification lifecycle |
| Skill selection | Skill snapshots only | No selector found | Fingerprint only | Qualified-only minimum-cover selector | Proposal/security/sandbox/approval lifecycle |
| Tool moderation | Specific allowlists plus snapshots; no general gate | No general gate found | Specific paths | Explicit grants and authority-aware `authorize` gate | Wire every executor/tool broker through gate |
| Skill generation/evolution | **NOT IMPLEMENTED** | Design requested now; no prior code found | No | Not fabricated | Proposed 3.1 lifecycle |
| Context router | Implemented | Shared-thread branch integrated | Yes | Referenced by recipe context strategy | Run-ledger feedback and richer retrieval |
| Evidence/provenance/consensus | Implemented | 3.1 verification service adds claim lifecycle | Yes | Recipe verification requirement; existing graph unchanged | Universal claim/verify/accept service |
| Successive halving | Implemented for `ModelRecipe` | Economic branch complements it | Yes | Documented as recipe optimisation foundation | Persist/learn qualified recipes |
| Cost/latency routing | Basic resource score/context budget | Mature `2b18770` | Yes on old branch | Provider-neutral core ported and tested | Scheduler integration/telemetry |
| Confidence/dynamic escalation | Basic routing and review | `2b18770` preserves context/checkpoint | Yes on old branch | Ported | Durable run transitions |
| Human takeover | Implemented | Orca restart qualification integrated | Yes | Tool gate also fences human-owned/stale generations | No authority change |
| PTY/Orca execution | Implemented hybrid boundary | Orca research branch integrated | Yes | Reused unchanged | Broader live qualification |
| Job Catalog/Scheduler | Work Queue only in 3.0.x | Implemented on 3.1 branch | Yes on 3.1 | Not backported | Remains 3.1 |
| Web dashboard/run ledger | No web dashboard/run ledger | Dashboard on 3.1; run ledger partial | 3.1 tests | Not backported | Remains 3.1 |

## Integrated implementation

### Adaptive recipe composition

`src/control/adaptive-harness.ts` adds:

- `ExecutionRecipe` as the broader composition unit;
- `AdaptiveHarness.build()` as a pure, non-mutating builder;
- `SkillCatalog.select()` using deterministic minimum coverage from qualified/evidenced entries only;
- `ToolPolicy.grant()` and `ToolPolicy.authorize()`;
- stable SHA-256 recipe fingerprinting;
- explicit context, authority, limits, verification and escalation fields.

The builder does not claim work, mutate a scheduler, acquire a lease, write a PTY or accept completion.

### Economic routing recovery

`src/control/economic-routing.ts` ports the strongest reusable logic from `2b18770` while removing fixed currency and resource identities. It implements four execution intents, historical/configured estimates, fail-closed policy gates, effective-cost comparison and context/checkpoint-preserving dynamic escalation.

The old commit's changes to `src/index.ts`, queue/state/UI/bootstrap, hardcoded examples and telemetry wiring were not imported. Current 3.0.1 configuration neutrality remains authoritative.

## Executable harness demonstration

**EXPERIMENTALLY VERIFIED** with deterministic fixtures:

```text
same TypeScript integration-debug task
  |
  +-- URGENT
  |     worker-frontier + model-frontier
  |     direct-expert profile
  |     no additional skill
  |     repository read/edit/test tools
  |
  +-- ECONOMY
        worker-local + model-small
        guided-debug profile
        qualified typescript-debugging skill
        repository read/edit/test tools only

both recipes:
  same lane/lease/ownership authority
  same context/evidence references
  same verification requirements
  same human-takeover fence
```

The smaller-model fixture without the qualified skill is rejected as incapable. With the skill it becomes routable and remains subject to diff/test verification. This proves composition and policy behaviour; it is not a live-model quality benchmark and makes no claim that a real smaller model improved.

Additional tests prove:

- a proposed skill cannot provide capability or grant a privileged deployment tool;
- denied/ungranted tools remain unavailable;
- stale lease and ownership generations fail closed;
- human ownership fences every recipe tool immediately;
- prompt/context/skill/tool/runtime changes alter the fingerprint;
- economic routing rejects unhealthy, unqualified, incapable, over-budget or unapproved choices;
- escalation preserves context and checkpoint references.

## Authority and substrate conclusion

**SOURCE VERIFIED and EXPERIMENTALLY VERIFIED**: execution substrates remain below the harness. `ExecutionProvider`/Orca can start or reconnect execution only with a validated Agent Control identity and authority tuple. The adaptive builder carries that authority into the recipe, and tool authorization independently rechecks it. No skill, context source, provider or model can mutate a lease, scheduler state or PTY through these supported interfaces.

Human takeover remains unconditional. A human-owned or newer ownership generation fails recipe tool authorization; deliberate return of ownership must produce a new authorized recipe/generation.

## Remaining gaps

- **NOT IMPLEMENTED**: dynamic skill proposal/review/sandbox/approval/promotion.
- **PARTIAL**: tool policy is executable but not yet mandatory inside every execution adapter/tool broker.
- **PARTIAL**: recipe construction is executable but not yet the default Work Scheduler dispatch path or persisted as a Run.
- **PARTIAL**: model/provider qualification and successive halving exist, but winners are not automatically promoted into a governed durable recipe catalog.
- **PLANNED 3.1**: Job Catalog, formal Worker Registry, skill lifecycle, run ledger, web dashboard and universal verification lifecycle.
- **NOT TESTED LIVE**: the deterministic smaller-model comparison does not exercise a live local model or external provider.

## Integration decision

The evidence supports a selective recovery, not a historical merge. Agent Control already contained most harness ingredients; this branch adds the missing executable composition and tool-grant boundary and recovers the mature economic router. Documentation now states exactly which connections are implemented, experimental or planned.

## Final verification

**EXPERIMENTALLY VERIFIED** in a fresh disposable copy on the configured remote development host; no existing remote worktree or service was used as the test target:

```text
npm run check
  npm run typecheck                  PASS
  npm run check:bootstrap            PASS
  npm run check:neutrality           PASS (3/3)
  npm test                           PASS (166/166)

git diff --check                     PASS
tracked credential/.env scan         PASS (none)
task-change private-topology scan    PASS (none)
```

The 166-test serial suite includes the ten new adaptive-harness/economic-routing tests and all existing authority, takeover, context, provider, Orca, scheduler, queue and recovery tests. There were no skipped, cancelled or failed tests.

The 3.0.1 tag remains unchanged. The isolated integration branch is coherent and ready for review/merge; merging it does not imply deployment or completion of the explicitly listed 3.1 work.
