# Agent Control 3.5.0 release qualification

Date: 2026-09-01

Feature candidate: `2aa19ce2a56ce7ded11d36b6cf96b02543e2ab17`

Merge commit: `26d5c051e5341af2f00cb41211bfa1e1fca6c744`

The final release commit is the descendant identified authoritatively by annotated tag `v3.5.0`. No live Agent Control service was deployed or reconfigured during release closure.

## Automated release gates

- `npm install --no-package-lock --ignore-scripts`: PASS; the repository intentionally has no lockfile, 15 packages installed and npm reported zero vulnerabilities.
- `npm run check`: PASS; TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, implementation status and 587 serial tests passed with zero failures.
- Repository-local Markdown links: PASS across 86 Markdown files after adding these release documents.
- `git diff --check`: PASS.
- `npm pack --dry-run --json`: PASS for `agent-control@3.5.0`; 528 files were included after adding the release documents.
- Staged secret scan and committed fast-execution artifact scan: PASS; no private keys, bearer credentials, API keys or machine-local paths were found.
- Canonical version sources agree on `3.5.0`: `package.json`, `src/version.ts`, README, changelog, architecture and implementation status.

The final full gate and package installation are repeated on the exact release commit before `main` and the tag are pushed. The GitHub Release records the final commit and package SHA-256.

## Feature qualification retained

The frozen Spark evidence is retained in [`agent-control-3.5-qualification.md`](agent-control-3.5-qualification.md) and `artifacts/fast-execution/`. The final run classified 10/10 cases correctly, routed no unsafe false positive, verified Spark 7/7 and verified the comparison route 6/7. Missing monetary cost remains `unknown`, not zero.

## Release verdict

`PASS_WITH_LIMITATIONS`

ACP stdio/WebSocket packaging and external-client conformance, the physical Luna → local LLM → GLM-5.3-Flash → Luna chain, broader Spark cost/corpus evidence and automatic production Job adoption remain deferred. They are not represented as completed 3.5 capabilities. Spark remains disabled by default, and ACP remains explicitly scoped to governed session/control mapping.
