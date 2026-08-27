# Harness efficiency and context budgeting

Agent Control treats an execution strategy as:

```text
model + provider + harness profile + context strategy + tools + turns + cache behaviour + verifier
```

The optimisation metric is cost per verified outcome. A run contributes a success only after the existing Job verifier passes and the Run reaches `SUCCEEDED`.

## Profiles

| Profile | Intended work | Default context ceiling | Behaviour |
| --- | --- | ---: | --- |
| THIN | Exact, low-risk, one/two-file work with deterministic checks | 4,096 estimated tokens | Targeted sources, required tools, few turns |
| STANDARD | Ordinary implementation and debugging | 16,384 estimated tokens | Compatibility default and uncertainty fallback |
| DEEP | Architecture, high ambiguity, cross-cutting work | 65,536 estimated tokens | Wider graph/context neighbourhood and more turns |

These ceilings are configurable. All profiles retain approvals, lease/ownership policy, human takeover, protected-workload rules, cancellation, recovery and verification.

Routing mode defaults to `observe`. The router records what it would choose but applies STANDARD. `enforce` still requires the selected profile to carry minimum verified runs, success rate, same-model controlled runs and explicit production qualification. Operator configuration alone does not fabricate this evidence.

## Context packets

`ContextPacketBuilder` accepts sources labelled by kind, relevance, requirement, persistence and provenance. It returns:

- included source IDs and content hashes;
- token estimates by component;
- a packet identifier used by the recipe fingerprint;
- provenance IDs;
- named omissions with `profile_filtered`, `source_limit` or `token_budget` reasons.

Required evidence is never silently omitted. If it cannot fit, packet construction fails and the caller can request escalation.

`ContextGraph` is an interface, not a database requirement. Adapters may find nodes, follow relations, retrieve neighbourhoods, rank/compact evidence, record provenance and write back verified knowledge. Write-back requires an explicit verification reference.

## Invocation accounting

Every provider invocation can record:

- Job, Run, task and lane identity;
- provider, model, profile, strategy and turn;
- system, Agent Control, tool, skill, bootstrap, shared-memory, repository-rule, task, history and other context components;
- input, fresh input, cached input, cache-write, output, reasoning and total tokens;
- tool calls, supplied context sources, elapsed time and costs;
- recipe/context provenance;
- verifier and final Run result.

Provider usage is authoritative when present. Locally counted components use the deterministic UTF-8-byte estimate and are labelled estimates. Missing provider data remains `null`. Fresh tokens remain unknown when a provider supplies input tokens but does not identify cached input.

Calculated cost requires an explicit pricing schedule covering every observed billing class. A cached or reasoning token class without a configured rate makes calculated cost unknown. No monetary saving is inferred from avoided estimated context.

## Escalation

Supported reasons include missing context, test failure, ambiguous repository state, unexpected dependency, model uncertainty, verifier rejection, tool limitation and execution failure. Escalation is monotonic:

```text
THIN -> STANDARD -> DEEP -> REVIEW
```

Context packet and checkpoint references are preserved. The controller does not repeat the same profile or grant new authority.

## API and dashboard

- `GET /api/efficiency` returns aggregate model, provider, profile and lane metrics.
- `GET /api/efficiency/invocations` returns bounded observation metadata (200 records by default, maximum 1,000, with optional `runId`/`jobId` filters); prompt contents are not retained in the efficiency ledger.
- `/api/status` includes the aggregate projection.
- The Jobs dashboard shows per-Run profile/turn/token/verifier data and a compact Harness Efficiency diagnostic.

## Benchmark

Run:

```bash
npm run benchmark:harness-efficiency
```

The suite freezes twenty tasks, one model identity and parameters, and one deterministic verifier. It compares all three profiles and writes:

- `docs/harness-efficiency-report.md`
- `artifacts/harness-efficiency-report.json`

The current suite is a deterministic harness simulation. It proves packet construction, profile differences, verifier gating and report reproducibility. It does not invoke a live model and therefore cannot establish real success rate, cache percentage, latency, provider cost or cost per verified outcome. Those values remain null and automatic routing remains observational.
