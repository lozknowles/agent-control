# OpenAI context-provider qualification — 2026-08-23

## Verdict

OpenAI ChatKit: **SUPPORTED+UNQUALIFIED**.

The official ChatKit API is implemented through a GET-only adapter and authenticated successfully, but the selected OpenAI project has no accessible `cthr_...` thread. The official Agent Builder UI shows no existing workflow and blocks creation of the first workflow at `Payment method needed`. No workflow ID or ChatKit thread could therefore be created without changing billing.

The single minimum missing item is: **enable billing by adding a payment method to the same OpenAI project**. After that, the already-defined qualification procedure can create and publish a minimal non-production workflow, create a ChatKit session, generate one thread, and run the live harness against it.

## Provider matrix

| Provider/source | Official capability and transport | Authentication | Read-only suitability | Qualification | Retained decision |
| --- | --- | --- | --- | --- | --- |
| OpenAI ChatKit thread | `GET /v1/chatkit/threads`, `GET /v1/chatkit/threads/{id}`, `GET /v1/chatkit/threads/{id}/items`; official HTTPS API with `OpenAI-Beta: chatkit_beta=v1` | OpenAI project API key supplied only at runtime | Suitable for bounded reads of an existing accessible thread; adapter permits GET only | **SUPPORTED+UNQUALIFIED**: HTTP 200 authentication/listing, zero threads, no deployable workflow because billing is not enabled | Retain official GET-only adapter and live harness; do not inject until a real `cthr_...` passes identity and content validation |
| ChatGPT Work/shared context | Codex host `read_thread` capability; no documented standalone conversation-history API identified | Existing host session; credentials remain outside Agent Control | Suitable only through an approved host-injected reader | **SUPPORTED+QUALIFIED (host only)** | Work/shared URLs remain **host-only/reference-only** outside the approved host transport |
| Codex task context | Codex host `list_threads` and `read_thread` capabilities; no documented standalone task-history HTTP API identified | Existing Codex host session | Suitable only through an approved host-injected reader | **SUPPORTED+QUALIFIED (host only)** | Codex task links remain **host-only/reference-only** outside the approved host transport |

Public `chatgpt.com/share/...` URLs remain reference-only. No share-link scraping, browser extraction, cookies, session harvesting or undocumented endpoint is used.

## Official sources

- ChatKit guide: <https://platform.openai.com/docs/guides/chatkit>
- Agent Builder guide: <https://platform.openai.com/docs/guides/agent-builder>

Retrieved 2026-08-23T19:51:47Z with HTTP 200. The retrieved HTML SHA-256 values are recorded in `provider-live-qualification-20260823.json`.

The official ChatKit guide requires a published Agent Builder workflow ID for `POST /v1/chatkit/sessions`. The official documentation exposes no supported workflow-list, workflow-create or workflow-publish API; workflow creation was therefore checked in the official Platform UI.

## Live evidence

- 2026-08-23T19:51:37.3094770Z: authenticated `GET /v1/chatkit/threads?limit=1&order=desc` returned HTTP 200, zero accessible threads and `has_more=false`.
- Response SHA-256: `eb1116719781d1499b8f07a4c2e6a9880ed22eb87479a425f36644e69e9f2941`.
- OpenAI request ID: `0870c4b6-d2b2-4e1a-9e20-611dd1ecf220`.
- Final merged-source live harness verdict: `SUPPORTED+UNQUALIFIED`, blocker `no_accessible_chatkit_thread`.
- Safe live harness record: `docs/evidence/openai-chatkit-live-run-20260823.json`, rerun and replaced from the 3.0 merge worktree at 2026-08-23T20:18:09.971Z.
- Official Platform UI: authenticated `Default project`; Agent Builder showed `Create a workflow` with no existing workflow cards. Creating one reached `New agent` and then the blocking message `Payment method needed` before configuration or publication.
- Workflow ID: none generated.
- ChatKit thread ID: none generated.

The authenticated UI also displayed an Agent Builder retirement notice for 2026-11-30. This increases the long-term dependency risk but does not change the present API verdict.

No API key, client secret, environment-file content or authenticated thread body is present in this evidence.

## Fail-closed and authority proof

Focused tests exercise missing thread, authentication failure, access denial, expiry, missing/deleted source, provider error, source/thread identity mismatch, document identity validation, section selection, token limits, redaction, retention, provenance and repository-evidence fallback.

The authority-invariance test snapshots a live-shaped workspace and human-owned PTY, forces an OpenAI provider failure, and proves:

- lease and ownership are unchanged;
- lane status, priority and scheduling state are unchanged;
- no PTY input path exists and human ownership remains active;
- baton and persisted task state are unchanged;
- Git evidence remains available;
- the registry exposes neither scheduling nor input-writing authority.

Provider failure returns missing context only. Baton, persisted Agent Control state, Git and independently executable tests remain sufficient.

## Non-actions

- No billing or payment change.
- No production workflow or deployment.
- No Agent Control deployment.
- No share creation or broadened sharing.
- No browser scraping, DOM extraction, cookie access or undocumented API use.
- No lease, ownership, scheduling, baton, PTY or takeover mutation.
