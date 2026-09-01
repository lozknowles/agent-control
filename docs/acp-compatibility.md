# Agent Client Protocol compatibility

Agent Control 3.6 development now provides a transport-neutral ACP core and a stable ACP v1 stdio adapter. The current formally released version remains 3.5.0; this document describes the isolated unreleased 3.6 branch.

## Pinned protocol inputs

| Input | Exact version | Licence / identity |
| --- | --- | --- |
| official TypeScript SDK | `@agentclientprotocol/sdk@1.4.0` | Apache-2.0; upstream git commit `e6463f444093ed7c5f1cc937c3f32afb5853e906` |
| stable schema bundled by the SDK | ACP schema release `schema-v1.21.0`; protocol version `1` | `schema/schema.json` SHA-256 `7f77702b34e0a0558e77220e9007bf8ee161a976bb8ac5021aba1b7e7b2c5708` |
| SDK schema peer | `zod@4.5.4` | MIT |

Dependencies are exact pins in `package.json`. The SDK's `experimental/v2` export and bundled unstable v2 schema are not imported by the stable runtime.

## Stable v1 surface

The official SDK validates and dispatches:

- `initialize`;
- `session/new`, `session/load`, `session/resume`, `session/list`;
- `session/prompt`, `session/cancel`, `session/close`;
- `session/update` notifications;
- JSON-RPC request cancellation through the SDK's request `AbortSignal`.

Baseline prompting reports an ordered plan, initial tool call, tool-call update and final plan state. Usage and cost updates are sent only when the governed execution reports them; unknown values are never represented as zero. MCP servers and additional directories are rejected because those capabilities are not advertised. Image and audio prompts are not advertised.

## Stdio

Run:

```bash
AGENT_CONTROL_STATE_DIR=/srv/agent-control/state \
AGENT_CONTROL_ACP_ACTOR_ID=web-operator \
agent-control acp
```

stdin and stdout carry newline-delimited JSON-RPC only. Diagnostics use stderr. EOF, SIGINT and SIGTERM close the SDK connection and stop the local scheduler cleanly. The selected Actor must already exist in the identity store; the command does not create or elevate an external principal.

## Mapping

| ACP | Agent Control |
| --- | --- |
| external principal | Actor |
| ACP session | governed Session |
| prompt blocks | ContextTransferRecord |
| prompt request | Work Parcel with WorkAttribution |
| tool-call update | Work Parcel/Run/evidence projection |
| cancel request/session | existing cancellation port |

The external Actor must already be registered by a trusted host. `session/new` creates an `operator-controlled` session and adds the internal Agent Control orchestrator as a participant with only the intersection required for governed execution. Resume verifies creator/principal identity and working directory. Prompt text is accepted as internal context, hashed, attributed and submitted through `AcpExecutionPort`; it is never treated as shell input. ACP session bindings are persisted mode `0600` and can be reconstructed with the durable identity store after a controller restart.

## Authority boundary

ACP does not receive direct access to:

- scheduler or queue mutation;
- leases, ownership or PTY input;
- provider/model substitution;
- raw shell or unrestricted tools;
- verification or acceptance transitions.

Agent Control remains authoritative. The official SDK frames stdio around this core without changing that boundary. Authenticated HTTP/WebSocket packaging is the next transport checkpoint; no unauthenticated network listener exists. No OpenClaw dependency is required or introduced.

## Cancellation

`session/cancel` and `session/close` cancel recorded Work Parcels in reverse creation order. SDK request cancellation aborts the active session operation. The execution port is responsible for cascading into child Runs; `IdentityControlPlane.cancelTree` provides child-first provenance cancellation where execution records exist.

## Conformance evidence

`src/control/acp-runtime.test.ts` connects the Agent Control app to the official SDK client over two real NDJSON byte streams. It verifies negotiation, schema-valid session creation, ordered updates, prompt mapping, list, process-level reconstruction/resume, close/cancel and rejection of unsupported envelopes. Adapter authority tests remain in `src/control/acp-adapter.test.ts`.

This is strong official-client interoperability evidence, but not yet the independent non-SDK reference-harness and adversarial matrix required for the final 3.6 claim.

## Compatibility verdict

The current checkpoint is **stable ACP v1 interoperable over local stdio with the official SDK client, with limitations**. Authenticated remote transports and an independent external reference harness remain unqualified. ACP v2 is draft, disabled and not claimed. ACP client-owned terminal/filesystem behavior is not reinterpreted as Agent Control PTY or filesystem authority.
