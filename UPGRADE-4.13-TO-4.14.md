# v4.13 to v4.14 candidate upgrade and rollback

**RC1 is EXPERIMENTAL. These are review instructions, not authorization to upgrade an existing installation.** Physical validation used a disposable Ubuntu CPU-only systemd service at the exact runtime revision in the qualification report.

Before an approved upgrade, retain the exact v4.13 source/dependencies and an owner-protected backup of configuration, state, ledger, permissions and required credentials. Verify backup readability and archive hashes. Stop only the explicitly authorized installation through its own service manager. Check out the exact approved candidate, use the documented bootstrap prerequisite/install path, preserve configuration, then start its normal entry point under the same account and working/state directories.

Verify authenticated and unauthenticated API behavior, dashboard health, prior Job statuses, configuration identity and append-only ledger history. Run a new approved governed observation Job. Doctor prerequisite readiness alone is insufficient. Confirm optional experimental features and paid/private-data behavior remain inactive by default.

For rollback, stop the authorized candidate service, return to the exact retained v4.13 source and locked dependencies, and start under the prior account/configuration. Validate old state and run a new approved observation Job. Restore the protected pre-upgrade backup if candidate-only data is not backward compatible; preserve candidate evidence separately before restoration. Do not rewrite history to appear compatible.

The physical test passed v4.13 -> `79a003160090459659901709ca744414a4bc82ab` -> v4.13 with three newly approved Jobs, byte-identical configuration, prior Job states and ledger prefixes preserved, and operator authentication retained. The service remained alive within each stage. v4.13's known optional-discovery crash was not invoked in this upgrade-only test; the candidate's normal discovery was tested independently in two pristine installs.

New experimental semantic/no-progress event formats were not produced by these observation Jobs. Their downgrade behavior and forward-only evidence are **not qualified**. Do not infer complete rollback from the successful legacy-state test.
