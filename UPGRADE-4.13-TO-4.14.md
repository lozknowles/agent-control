# v4.13.0 to v4.14.0 upgrade draft

**No production upgrade is authorised or qualified by this document.** Candidate `4.14.0-rc.0` is an isolated research integration worktree.

The current implementation preserves the legacy bounded JSON tool path when no semantic-tool option is supplied. Semantic tools, no-progress detection, forensic capture and live video require explicit caller configuration; no paid-model escalation is enabled by this code. Identity styling derives from immutable Run IDs and does not change Job identity, authority or status.

Before a release, a disposable test must install the published v4.13.0 package, retain representative configuration, Jobs, workers, permissions, ledger and diagnostics, upgrade to the exact candidate artifact, and verify those records and default-off behaviour. A separate rollback must restore v4.13.0 and show that its reader handles or safely ignores new events, configuration and evidence without state corruption. Those tests have not yet passed; operators should not use this draft as upgrade instructions.

The candidate has no demonstrated atomic multi-file migration or mutation. Preserve backups and release-specific evidence in any future qualification. New semantic event and no-progress evidence formats may be forward-only until backward reading is verified.
