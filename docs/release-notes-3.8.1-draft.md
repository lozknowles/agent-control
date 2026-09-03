# Agent Control 3.8.1 release notes — draft

Status: release candidate work only. No `v3.8.1` tag or release exists.

3.8.1 separates workload location, provider execution location, and credential residency. The recommended default keeps credentials on the controller or a designated credential/provider-execution node and moves only governed immutable work/context to them. Remote credential residency remains available.

It adds provider-neutral credential-store references, distinct route/ledger/dashboard locality fields, backward-compatible 3.8 migration, and immutable remote Windows Git snapshot transport through the existing managed-node SSH abstraction. It also fixes the Windows Codex account-status hang by supervising the native process with node-local redirected streams and bounded cleanup.

Release qualification still requires the recorded physical multi-account, remote-account, fallback, GLM whole-repository review, dashboard/video reconciliation, and final regression gates in [3.8.1 evidence](evidence/agent-control-3.8.1-qualification.md).
