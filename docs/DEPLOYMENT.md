# Agent Control 4.5 deployment, upgrade and rollback

## Experimental Session Vault configuration

The web entry point uses `${AGENT_CONTROL_STATE_DIR:-.agent-control}/session-vault`
and discovers Codex history beneath `${CODEX_HOME:-$HOME/.codex}/sessions` and
`archived_sessions`. The dashboard API remains operator-authenticated. Do not
expose the state directory through a static web server or shared filesystem.

Cross-node replicas must use an existing governed SSH resource and a node-local
absolute destination root. The fixed audited helper accepts object/record data
through stdin; it does not expose a generic shell API. Use node-local encryption
and retention policy appropriate to the captured sensitivity. Removing an
optional Obsidian Markdown view does not remove the immutable Session Vault.

Before upgrade, copy the state directory without rewriting objects and run the
integrity verifier. Rollback restores the previous application build while
preserving the append-only vault. A schema reader that does not recognize a
newer record must stop rather than migrate or discard it. Full procedures are in
[Session Vault recovery](session-vault-recovery.md) and
[replication](session-vault-replication.md).

This is the canonical deployment guide for the Agent Control 4.5 candidate. Source publication
and production deployment are separate events. A healthy listener alone does not
prove release qualification.

## Install an immutable release

Prerequisites are Node.js 24, npm and Git. Optional browser, SSH, Android, speech
and model integrations require their own qualified dependencies. The repository
does not commit a package lock, so retain the resolved dependency inventory with
release evidence.

```bash
git clone https://github.com/lozknowles/agent-control.git
cd agent-control
git checkout --detach v4.4.0 # released baseline; use a reviewed immutable 4.5 candidate SHA only for isolated evaluation
npm install --ignore-scripts
npm run init
npm run check
```

Learned Specialists are disabled for routing unless explicitly configured and
qualified. Keep adaptation files and `AGENT_CONTROL_STATE_DIR` outside disposable
source checkouts, owner-readable, and backed up with the exact registry snapshot.
Never copy an adaptation to a different base/runtime and retain its qualification.
The deployment must provide the framework adapter locally; Agent Control core
does not install training dependencies or download models at runtime.

Example safe policy:

```json
{
  "learnedSkills": {
    "enabled": true,
    "routingEnabled": false,
    "minimumImprovement": 0.1,
    "maximumQualificationAgeDays": 90,
    "requireHumanDatasetApproval": true
  }
}
```

Enable `routingEnabled` only after the target installation can verify the exact
base and adapter hashes and the recorded frozen qualification. Roll back by
disabling learned routing first; the immutable base route remains available.

Your Memories cross-model routing is separately fail closed. Generate or install
an owner-only provider-neutral qualification file, then opt into enforcement:

```bash
npm run qualify:memory-route-records -- /path/to/private/memory-route-qualifications.json
export AGENT_CONTROL_MEMORY_ROUTE_QUALIFICATIONS=/path/to/private/memory-route-qualifications.json
export AGENT_CONTROL_MEMORY_ENFORCE_ROUTE_QUALIFICATION=1
```

The file contains route identity, runtime/contract versions, bounded proven
payload size, role eligibility, freshness and evidence—not credentials or model
output. A missing, stale, unsupported, oversized or contract-mismatched route is
denied. An alternate route is used only when its exact pair is explicitly
qualified. Rebuild and independently review the records after model, runtime,
contract or relevant evidence changes; do not copy a qualification across nodes
or account profiles.

## Keep mutable state outside the release

Set `AGENT_CONTROL_CONFIG`, `AGENT_CONTROL_STATE_DIR` and
`AGENT_CONTROL_JOB_DIR` to durable operator-owned locations outside disposable
release checkouts. Configuration contains opaque credential references, never
credential values. Provider secure stores and Codex homes remain at their declared
credential-residency node. Run exactly one controller per state directory.

```bash
export AGENT_CONTROL_CONFIG=/path/to/private/config.json
export AGENT_CONTROL_STATE_DIR=/path/to/private/state
export AGENT_CONTROL_JOB_DIR=/path/to/private/jobs
export AGENT_CONTROL_WEB_HOST=127.0.0.1
export AGENT_CONTROL_WEB_PORT=19196
npm run web
```

Keep the dashboard private through the installation's existing reverse proxy or
tailnet. Set `AGENT_CONTROL_WEB_OPERATOR_TOKEN` through the existing secret
delivery mechanism. Do not place credentials in URLs, Git, transcripts or videos.

## Morrow integration testing

The combined experimental source is on `feature/4.5-release-gate-completion`.
Use an isolated checkout at its verified immutable commit, with separate private
state/configuration and an unused loopback port. Follow the local startup above;
never share a writable state directory with the running controller.

Check the host name, all six robots, new and restored conversations, contextual
help, reduced/off motion and narrow-screen layout. With an enrolled physical
voice/social setup, exercise `Morrow: status`, the legacy `POE: status` alias and
speech interruption. Confirm an approved harmless Work Parcel still follows
normal dispatch, route qualification, execution and independent verification.
Record the actual model, source commit and outcome. Existing POE videos and
controlled transcription tests do not establish these physical Morrow checks.

See the [integration record](evidence/morrow-4.5-integration/validation.md).
Source integration and publication do not change the running installation or
make this candidate release-ready.

## Pre-release and rollout gate

1. Freeze the candidate SHA and resolved dependency inventory.
2. Run `npm run check` from a clean isolated checkout.
3. Confirm the 4.3 A–F foundation remains intact and the recorded 4.4 physical
   browser qualification matches the release tree, including immutable session
   identity, parallel lanes, accounting, the Your Memories lifecycle, complete
   transcript and reviewed 1920×1080 recording.
4. Verify state/config compatibility and create an owner-only stopped-controller
   backup.
5. Merge through the repository workflow only after every mandatory 4.5 gate is
   proven, verify the merge contains the qualified tree, tag `v4.5.0`, push, and
   create the GitHub Release with manifest hashes. A draft pull request or an
   experimental candidate is not a stable release.
6. Stop only the scoped existing controller, select the immutable release, retain
   existing state and credential references, and restart through its established
   supervisor.
7. Verify version, source provenance, health, authentication, SSE updates, Jobs,
   Lanes, Models, Crew, Warm Cache Runtime and a harmless governed operation.

The current 4.5 candidate gate and its open limitations are recorded in
[the completion reconciliation](evidence/agent-control-4.5-release-gate-completion-20260912.md).
The earlier [4.5 reconciliation](evidence/agent-control-4.5-release-gate-20260912.md)
remains immutable historical evidence for its recorded implementation.
The 4.4 checksummed replay evidence is recorded in
[the 4.4 qualification](evidence/agent-control-4.4-ux-session-replay-20260911.md),
with the retained foundation in
[the 4.3 qualification](evidence/agent-control-4.3-integrated-qualification-20260909.md).
If main changes the product tree between qualification and tag, reconcile and
rerun affected regression/physical gates. Never label historical evidence as the
new candidate's result.

## Rollback

Retain the previous immutable release SHA/package, supervisor definition and
matching owner-only state backup. If acceptance fails, stop the candidate controller,
restore the matching previous state only if migration changed it, select the
previous immutable release (`v4.4.0`), restart the same scoped service and recheck health,
authentication and a harmless read-only operation. Never run old and new versions
against one state directory or move credential stores with source archives.

## Operational limits

- Remote paths need node-local typed enforcement; controller lexical checks do
  not establish remote filesystem containment.
- Opaque CLI internal actions are not universally visible to ToolPolicy. Admit
  only qualified capability envelopes; missing required sandboxing fails closed.
- Warm Expert preference is optional and subordinate to governance. Unknown cache,
  context, pricing or billing fields remain unavailable.
- Cleanup removes only execution-owned temporary roots or explicitly declared
  disposable generated roots. Ignored state is not disposable by default.

Detailed integration configuration remains in [the historical 4.1 runbook](installation-deployment-4.1.md),
[model documentation](models/README.md), [managed nodes](managed-nodes.md),
[dashboard operation](web-dashboard.md), [Morrow](poe.md), and
[Cache-Aware Expert Delegation](cache-aware-expert-delegation.md).
