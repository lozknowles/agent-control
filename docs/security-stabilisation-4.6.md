# Agent Control 4.6 security stabilisation

**Release verdict: BLOCKED.** This remediation branch is based on reviewed snapshot `ca15a4b7ebd8a87bce667a132049121f96db5898`. It is not merged, tagged, published, deployed or installed.

The completed source fixes bind release evidence to exact source and protected approval, confine repository snapshots, authenticate control-plane reads, enforce browser destination policy, preserve late-output redaction, bound session leases, require current model qualification, surface capability-action failures, isolate governed Git subprocesses, remove stored session-share credentials, stabilise evidence-led energy routing, recover orphaned intelligence locks, retain prior qualification output, classify future benchmark failures, and bound disruptive maintenance.

The original review packets and failing benchmark artifact remain unchanged. The complete disposition register is [agent-control-4.6-security-stabilisation-disposition.json](evidence/agent-control-4.6-security-stabilisation-disposition.json).

## Verification

- `npm run check`: PASS; 1,490 tests, 0 failures, with distribution, type, bootstrap syntax, dashboard syntax, neutrality and implementation-status checks.
- Hardened release gate: expected FAIL; the existing receipt uses an unsupported legacy schema and is not bound to this remediation source.
- Focused security tests cover trusted release evidence, repository confinement, browser redirects/subresources/WebSockets, authenticated reads, late output, leases, Git child environment, session-player injection, energy outliers, lock recovery, evidence retention, dispatch fencing and maintenance timeout.
- Operational containment and verification outputs: zero credential-pattern matches. Source-copy attack fixtures were excluded because they intentionally include synthetic redaction inputs.

## Remaining blockers

1. Create a new schema-v2 release receipt for the exact final remediation commit, backed by the full required check set and content-addressed evidence.
2. Obtain external protected operator approval that binds the candidate commit, source digest, receipt digest and required checks. Approval cannot be stored inside the candidate tree.
3. Re-run supported installation/upgrade and physical browser/device qualification on the exact candidate package.
4. Decide and qualify any distinct-principal ACP transport before claiming multi-principal isolation. Current shared-token transports remain one-principal scopes.
5. Physically exercise the Windows discovery descendant-timeout boundary or replace that probe with the shared process-tree adapter.
6. Keep model benchmark promotion blocked until approved target execution and independent acceptance evidence exist. No winner is recorded.
7. Whole-node energy and paid-provider billing remain externally blocked where no authorised meter binding or metered provider is configured. Component telemetry stays component-scoped.

## Later deployment sequence

After the blockers close: verify a clean exact candidate commit; build the package; perform virgin-install and supported-upgrade qualification; generate the trusted receipt; obtain external operator approval; rerun the hardened gate; review the diff and evidence; then merge, tag, publish and deploy as separately authorised actions. Stop at the first failed or stale gate.
