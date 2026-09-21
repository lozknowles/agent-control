# Governed native remote Estate discovery

This candidate adds a shared remote metadata adapter used by the existing `discover-estate` Job, Estate API and dashboard. It does not enrol machines, create credentials, modify routes, deploy services, read logs or grant general remote execution authority.

## Binding and authorisation

The operator selects a privacy-safe resource alias in the Estate catalogue. The backend maps it to exactly one existing configured SSH resource. The request cannot supply an endpoint, command, credential path or remote file path. The selected resource must have `managedNode.enabled: true` and this explicit binding:

```json
{
  "estateDiscovery": {
    "enabled": true,
    "scope": "metadata-only",
    "authorisationDigest": "<SHA-256 of the approved discovery scope>",
    "expectedIdentitySha256": "<independently approved physical identity digest>"
  }
}
```

These placeholders are not usable values. An absent identity pin yields `UNAUTHORISED / EXPECTED_HOST_IDENTITY_REQUIRED` before remote execution. A historical resource name or transport address is not an identity pin. No first response is silently trusted or promoted. The digest is SHA-256 of `agent-control-machine/v1:` followed by the lowercase 32-hex machine identity from the host's `systemd-id128 machine-id` metadata utility. Establish it through the operator's existing identity-verification workflow; the adapter never changes the configured pin. The current continuation has no approved remote identity pin, and its existing route remains unavailable.

The normal Estate category grant must include `REMOTE_HOST_DISCOVERY` and the selected resource alias. The permission retains a digest of that complete resource binding. Configuration drift invalidates the permission, and the adapter checks the binding again after transport completion.

## Execution and evidence

The adapter reuses `sshResourceArgs`, `executeSsh` and the Job's `OwnedExecution`. SSH is non-interactive, requires existing trusted host keys, disables key updates and forwarding, and attempts once. Connection timeout is 8 seconds, the remote command timeout is 12 seconds (plus a 2-second kill grace), and the adapter deadline is 24 seconds. Job cancellation and execution-authority revocation propagate through the normal signal and owned-process cleanup. The metadata utility has a separate 2-second timeout. No endpoint fallback or automatic retry occurs.

Remote arguments are adapter constants. Structured request data travels in the fixed program's stdin, never in shell-interpolated arguments. The fixed Python collector returns a strict envelope with a request nonce, hashed resource alias, observation time, method/version, physical identity digest, architecture, CPU count and total memory. It opens no files and collects no hostname, network addresses, process arguments, environment variables, logs or arbitrary file contents. Linux, Python 3, GNU `timeout` and `systemd-id128` are required. Unsupported metadata is reported as unavailable; a partial validated envelope yields `DEGRADED`, not complete discovery.

Only a matching identity pin, nonce, alias, schema and provenance can establish `AVAILABLE`. An identity matching the controller is rejected. Raw SSH diagnostics and collector output are not projected into execution-session streams; only validated allowlisted fields and classified lifecycle events are retained. Transport errors do not create CPU/worker entities or verified cross-host relationships.

## Graph, continuity and UI

Resource aliases and entity IDs do not depend on transport addresses or transient measurements. Rediscovery preserves first-seen times; last successful discovery is separate from failed contact. A failed or cancelled scan retains prior entities and edges as stale. It does not imply deletion. Recovery emits `RECOVERED` before the new available state, preserving identity.

Cross-host relationships have separate provenance: configured membership is `DECLARED`; a successfully validated native remote response can support `VERIFIED` controller-to-host discovery execution. Nothing is inferred from similar names or ports. The existing dashed relation rendering distinguishes inferred/unverified/stale edges from verified edges.

The retained comparison lists hosts, entities and relationships, including unchanged records and their evidence references. The existing change list continues to distinguish failed contact from confirmed removal. Graph-derived host zones, safe aliases, local/remote labels, connection state, Job activity, per-host last success and comparison summaries are shown in Estate View.

## Qualification boundary

Transport and native Job integration tests use explicitly synthetic fixtures, including fault injection below the production adapter. They prove code behaviour, not two physical hosts. The browser qualification driver only supplies the existing approved configuration and operates the normal UI/API; native Jobs own discovery and evidence retention. If the route or identity pin is unavailable, the driver records the blocker rather than injecting a successful response. No physical remote discovery or recovery can be claimed from such a run.

Existing graph history and raw validated envelopes remain under the permission-governed Estate evidence policy. Private runtime directories and credential material must not be copied into delivery bundles. The change remains an experimental candidate until independently qualified and reviewed for release.
