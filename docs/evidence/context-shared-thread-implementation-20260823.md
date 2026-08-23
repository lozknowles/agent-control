# Shared thread context prototype evidence — 2026-08-23

## Classification

IMPLEMENTED in the isolated Agent Control 3.0 integration worktree. Not committed, pushed, merged or deployed.

Baseline Agent Control SHA: `d18c3454917f48dfa5283d8b5c04b0a8646728ed`.

## Demonstration

Command:

```bash
npm run demo:context
```

Observed:

- three independent lanes attached three provider-neutral context sources;
- judge routing selected Tier 3;
- public and explicitly approved authenticated reader capabilities were discovered;
- two available fixture-backed read-only thread extracts loaded;
- relevant evidence, decision and failure sections were selected within budget;
- a fixture secret was redacted before prompt material and was absent from the evidence output;
- one expired source was omitted;
- Git/test evidence remained available;
- consensus selected `Adopt the context subsystem with Git as authority`;
- one dissent was retained;
- twelve provenance nodes connected decision, agents, sources, evidence, commit and test, with a clickable operator Mermaid projection;
- source, conclusion, decision and baton references survived reload.

Structured evidence: `docs/evidence/context-consensus-demo-20260823.json`.

## Tests

Focused command:

```bash
node --import tsx --test src/control/context.test.ts src/control/context-readers.test.ts
```

Full command:

```bash
npm run check
```

Observed focused result after provider qualification: 34/34 passed.

Observed complete serial result: 151/151 passed, with TypeScript and bootstrap syntax checks passing.

## Official provider qualification boundary

The official OpenAI documentation supports the ChatKit thread-items API:

```text
GET /v1/chatkit/threads/{thread_id}/items
```

The isolated implementation binds that contract through `openAiChatKitHttpTransport` and `openAiChatKitThreadAdapter`. The transport is GET-only, uses an injected runtime credential, validates thread identity, follows bounded pagination, selects/redacts bounded sections, and persists no credential or retrieved body. It has no Agent Control authority path.

Live harness:

```bash
AGENT_CONTROL_ALLOW_AUTHENTICATED_CONTEXT_READ=true \
OPENAI_CHATKIT_THREAD_ID=cthr_... \
npm run qualify:openai-chatkit
```

The harness reads `OPENAI_API_KEY` from the ignored `.env.local` only through Node's env-file loader and emits a redacted JSON verdict. It does not print or persist the key. A missing thread ID, missing approval flag, authentication failure, expiry, or provider error returns `SUPPORTED+UNQUALIFIED` and does not affect baton, state, Git or test sufficiency.

Provider verdicts for this slice:

| Provider/source | Verdict | Official contract or blocker |
| --- | --- | --- |
| OpenAI ChatKit thread | SUPPORTED+UNQUALIFIED | Authenticated official listing returned HTTP 200 but zero accessible threads. The official UI showed no workflow and blocked first-workflow creation at `Payment method needed`; no `cthr_...` could be produced without a billing change. |
| OpenAI public shared thread (`chatgpt.com/share/...`) | REFERENCE-ONLY | No official read API identified; browser scraping deliberately absent. |
| ChatGPT Work/shared context | SUPPORTED+QUALIFIED (Codex host only) | The Codex host `read_thread` capability successfully read a real ChatGPT conversation. No standalone ChatGPT Work history API was identified. |
| Codex task context | SUPPORTED+QUALIFIED (Codex host only) | The Codex host `list_threads` and `read_thread` capabilities successfully read a real Codex task. No standalone task-history HTTP API was identified. |

Machine-readable live evidence: `docs/evidence/provider-live-qualification-20260823.json`.

Raw safe harness result: `docs/evidence/openai-chatkit-live-run-20260823.json`.

The provider transports used by the fixture demonstration remain deterministic fixtures. The separate host-capability and HTTP evidence above is live. No public share was created, and the canonical repository remains untouched.
