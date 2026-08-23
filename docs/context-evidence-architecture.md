# Shared thread context and evidence architecture

## Invariant

Shared context augments Agent Control state; it never owns a task and never grants terminal authority.

```text
Hard contract + lease + owner
          |
          v
        Baton (Tier 1)
          |
          +--> repository evidence (Tier 2)
          |
          +--> selected context sources (Tier 3)
          |
          +--> independent conclusions + judge (Tier 4)
```

Git state and independently executable tests remain authoritative. Shared threads provide visible rationale, alternatives, failures and tool evidence. They are not assumed to contain private chain-of-thought and are never promoted above verified evidence merely because another agent wrote them.

## Components

- `ContextStore` persists source metadata, evidence, conclusions, access-tier decisions, consensus decisions and provenance edges in `.agent-control/context.json` using atomic mode-0600 writes.
- `LaneContextService` attaches a source to a lane and references it from the baton. Existing handoff and clone operations copy the optional baton references without changing lease or ownership behavior.
- `ContextRouter` selects the minimum sufficient tier using complexity, confidence, dispute state, urgency, context capacity, token budget, monetary budget and latency budget.
- `ContextSourceReader` is the provider-neutral read-only access boundary.
- `ContextReaderRegistry` discovers provider capabilities and refuses unsupported, unapproved, reference-only or unapproved authenticated reads.
- Provider adapters accept an injected visible-document transport. They cannot create or broaden shares, and no credential is stored in context metadata.
- `selectRelevantSections()` deterministically ranks visible evidence, decisions, failures and query-relevant sections within the selected token budget.
- Sensitive visible text is redacted before prompt material is returned. Reference-only and expired retention policies preserve metadata while preventing retrieval.
- `ConsensusJudge` accepts independent, unique-lane conclusions only, weights the strongest evidence quality per conclusion and records agreements, disagreements, dissent and final confidence.
- `traceDecision()` exposes the operator graph from decision to conclusion, source, evidence, commit and test. `buildOperatorProvenanceView()` adds clickable read-only source URLs and a Mermaid rendering for an operator UI.

## Source metadata and security

Sources can represent shared OpenAI/ChatGPT/Codex threads, GitHub PRs/issues, commits, artifacts, test reports, web URLs, local files and future providers. Metadata includes task/lane/agent/provider/model, repository state, trust classification, accessibility, token estimate and reference-only/ephemeral-extract retention policy.

Agent Control stores references, not credentials. URLs with embedded credentials, sensitive query parameters or unsupported schemes are rejected. This subsystem has no API for creating or broadening a public share. Any future share-creation operation requires a separate approval-gated policy.

## Recovery

Missing, expired, deleted, authenticated or unsupported threads are omitted with an explicit reason. Stale commit associations produce warnings. Baton, Git, tests and persisted Agent Control state remain sufficient for task recovery.

## Provider integration boundary

A provider implements an injected `VisibleDocumentTransport`; the registry exposes it through `ContextSourceReader.read(source, maxTokens, request)`. Provider implementations must authenticate through approved credential storage, must not persist tokens in `ContextSource`, and must report inaccessible content without blocking recovery.

Deterministic fixture transports qualify the generic contract. The official ChatKit GET adapter has additionally authenticated against a real project, but remains `SUPPORTED+UNQUALIFIED` until that project can create a workflow and produce an accessible `cthr_...` thread. ChatGPT Work and Codex task context remain host-only/reference-only outside approved host transports.
