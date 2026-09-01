# Agent Client Protocol compatibility

Agent Control 3.5 provides a transport-neutral ACP v1 JSON-RPC adapter. It supports:

- `initialize`;
- `session/new`, `session/load`, `session/resume`, `session/list`;
- `session/prompt`, `session/cancel`, `session/close`;
- `session/update` notifications;
- `$/cancel_request`.

## Mapping

| ACP | Agent Control |
| --- | --- |
| external principal | Actor |
| ACP session | governed Session |
| prompt blocks | ContextTransferRecord |
| prompt request | Work Parcel with WorkAttribution |
| tool-call update | Work Parcel/Run/evidence projection |
| cancel request/session | existing cancellation port |

The external Actor must already be registered by a trusted host. `session/new` creates an `operator-controlled` session and adds the internal Agent Control orchestrator as a participant with only the intersection required for governed execution. Resume verifies creator/principal identity. Prompt text is accepted as internal context, hashed, attributed and submitted through `AcpExecutionPort`; it is never treated as shell input.

## Authority boundary

ACP does not receive direct access to:

- scheduler or queue mutation;
- leases, ownership or PTY input;
- provider/model substitution;
- raw shell or unrestricted tools;
- verification or acceptance transitions.

Agent Control remains authoritative. A stdio or WebSocket host may frame JSON-RPC around this core without changing that boundary. No OpenClaw dependency is required or introduced.

## Cancellation

`session/cancel` and `session/close` cancel recorded Work Parcels in reverse creation order. `$/cancel_request` targets the parcel associated with that JSON-RPC request ID. The execution port is responsible for cascading into child Runs; `IdentityControlPlane.cancelTree` provides child-first provenance cancellation where execution records exist.

## Compatibility verdict

The adapter is **ACP v1 compatible at the session/control mapping layer**. ACP v2 is experimental and is not claimed. Transport packaging, terminal streams, richer content blocks and client-specific conformance suites remain separate work.
