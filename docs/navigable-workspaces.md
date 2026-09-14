# Navigable Workspaces

Navigable Workspaces are read-only views over Agent Control's authoritative Estate, Node Dashboard and Run Inspector records. They let an operator move down from the Estate to a device, nested environment, runtime, worker, run and invocation, or reconstruct that path upward from retained run evidence.

They are not checkouts, folders, terminals or execution authorities. Opening a workspace never grants file, shell, job, deployment, credential or protected-resource access. Where one of those capabilities is relevant, the projection reports `REQUIRES_AUTHORIZATION` and the existing Agent Control control remains responsible for it.

## Identity and modes

The versioned schema is `agent-control.navigable-workspace/v1`. An opaque `acw1` identifier contains only the object kind and existing authoritative object identifiers. Transport, hostnames, credentials and filesystem paths do not form workspace identity.

Each projection distinguishes:

- `LIVE`: current authoritative context;
- `HISTORICAL`: reconstructed from retained execution evidence;
- `STALE`: the source projection is no longer fresh;
- `UNAVAILABLE`: the referenced context cannot currently be used.

Missing telemetry is `null` or unavailable. It is never converted to zero.

## API

Both endpoints require the existing operator authentication:

- `GET /api/workspaces` opens the Estate workspace.
- `GET /api/workspaces/:workspaceId` opens one workspace.

There are no workspace mutation routes. The response includes breadcrumbs, a parent, progressively disclosed children, status, capabilities, context, evidence references and links back to the authoritative dashboard/history.

## Dashboard and CLI

The dashboard offers **Workspaces**, `Alt/Command+W`, and **Open Workspace** from Node Dashboard and Run Inspector. Breadcrumbs preserve context while the child list reveals only the next useful level. **Open authoritative dashboard view** and **Open human-readable evidence** return to the existing evidence surfaces.

CLI examples:

```text
agent-control workspace list
agent-control workspace open WORKSPACE-ID
agent-control open job RUN-ID
```

Workspace reads use `AGENT_CONTROL_WEB_URL` and require `AGENT_CONTROL_WEB_OPERATOR_TOKEN`. Cleartext HTTP remains limited to loopback; remote URLs must use HTTPS.

## Mallow

**Ask Mallow** passes the workspace reference to the existing grounded evidence resolver. Mallow explains recorded status, mode, children and read-only capabilities. It does not invent topology and cannot gain control merely by referring to a workspace.

## Current boundaries

- Workspaces project current authoritative records on demand; they do not persist another Estate graph.
- Recent navigation is session-local UI convenience, not an authoritative record.
- Files and terminals remain governed by existing execution-session and protected-resource controls.
- Project/repository semantics are future work and require evidence-backed relationships before becoming a workspace kind.
- This prototype has no dependency on Rune or any Rune source code.
