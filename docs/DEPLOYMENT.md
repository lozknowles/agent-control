# Agent Control 4.3 deployment, upgrade and rollback

This is the canonical deployment guide for Agent Control 4.3. Source publication
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
git checkout --detach v4.3.0
npm install --ignore-scripts
npm run init
npm run check
```

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

## Pre-release and rollout gate

1. Freeze the candidate SHA and resolved dependency inventory.
2. Run `npm run check` from a clean isolated checkout.
3. Confirm the recorded fresh 4.3 physical A–F qualification matches the exact
   release tree, including
   route/cache/invalidation/accounting evidence, complete transcript and reviewed
   1920×1080 recording.
4. Verify state/config compatibility and create an owner-only stopped-controller
   backup.
5. Merge through the repository workflow, verify the merge contains the qualified
   tree, tag `v4.3.0`, push, and create the GitHub Release with manifest hashes.
6. Stop only the scoped existing controller, select the immutable release, retain
   existing state and credential references, and restart through its established
   supervisor.
7. Verify version, source provenance, health, authentication, SSE updates, Jobs,
   Lanes, Models, Crew, Warm Cache Runtime and a harmless governed operation.

The accepted integrated candidate and checksummed A–F evidence are recorded in
[the 4.3 qualification](evidence/agent-control-4.3-integrated-qualification-20260909.md).
If main changes the product tree between qualification and tag, reconcile and
rerun affected regression/physical gates. Never label historical evidence as the
new candidate's result.

## Rollback

Retain the previous immutable release SHA/package, supervisor definition and
matching owner-only state backup. If acceptance fails, stop the 4.3 controller,
restore the matching previous state only if migration changed it, select the
previous immutable release, restart the same scoped service and recheck health,
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
[dashboard operation](web-dashboard.md), [POE](poe.md), and
[Cache-Aware Expert Delegation](cache-aware-expert-delegation.md).
