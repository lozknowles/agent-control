# Conceptual-integrity gate

Every significant Agent Control capability must have one owner, one authoritative state path and durable proof. Review the proposal before implementation and the result before merge.

## Domains

Use the repository vocabulary: policy/authority, scheduling, execution substrate, provider/model adapter, routing, context/evidence, verification/provenance, operator interface, persistence and observability.

## Required proposal record

- Capability and owning domain
- Authoritative component
- Existing abstraction being extended
- Whether it affects leases, ownership, PTYs, scheduler decisions or takeover
- Confirmation that authority effects cross `AgentControlService`/the control policy boundary
- Confirmation that it creates neither duplicate authoritative state nor a second control path
- Fail-closed behavior
- Durable verification evidence

`assessConceptualIntegrity` in `src/control/architecture.ts` provides an executable baseline. It rejects browser-owned authority, provider-owned policy, duplicate state, second paths, missing failure modes and missing evidence. It does not replace architectural review; it makes the non-negotiable rules testable.

## 3.1 dashboard assessment

| Question | Answer |
|---|---|
| Domain | Operator interface |
| Authority | `AgentControlService` and existing control core |
| Extended abstraction | Lane/control projection and command service |
| Duplicate state | No; browser state is an expendable projection |
| Second control path | No; HTTP and TUI call the same service |
| Lease mutation | No dashboard command mutates a lease directly |
| PTY mutation | Only authoritative takeover/return; no web input primitive |
| Scheduler mutation | Requests validated by service; browser cannot edit scheduler storage |
| Human takeover | Existing unconditional fence |
| Failure mode | Observer-only or unavailable; core continues |
| Evidence | API, auth, SSE, routing, verification, takeover and full regression tests |

## Rejection examples

- Keeping browser-only lane status
- Letting a provider adapter select winners or issue leases
- Inferring completion from terminal output
- Treating three matching agent claims as verified evidence
- Letting an external thread approve an action
- Adding a PTY WebSocket writer that bypasses ownership generations

Redesign these through the existing control, evidence or execution contracts instead.
