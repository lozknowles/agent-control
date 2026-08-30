# Agent Control 3.3 neutrality gate

The maintained 3.3 tree failed the distributable-text rule for one private host identifier in browser documentation, the same host identifier in a production qualification script, and one private Android node identifier in that script. All files were tracked. The exact values, original line numbers, classifications and canonical failure output are retained under `raw/`.

The release-candidate review also found:

- a tracked telemetry baseline note containing its build-worktree path;
- a tracked operator Job manifest containing a machine-specific context-file default that the scanner did not inspect because YAML was omitted.

Resolution:

- describe the configured browser worker and Android resource by infrastructure-neutral roles;
- require the operator to supply the context-file parameter instead of shipping a machine-specific default;
- include YAML in the existing distributable-text scan;
- retain exact historical failure output only in raw text evidence, which is non-runtime evidence.

No forbidden identifier was removed from the scanner and no production exception was added.
