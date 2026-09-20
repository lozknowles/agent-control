# Agent Control v4.12.0 release verification

Release baseline: public `v4.11.0` / `9dff191034b7c69e102687bef02803bc05afe874`.

Candidate branch: `release/4.12.0-rc-20260920`.

The release is publishable only when every mandatory row below is PASS for one exact source commit. Evidence generated before the final metadata commit is supporting evidence, not final-source release proof.

| Gate | Status | Required evidence |
|---|---|---|
| Source reconciliation | IN PROGRESS | Commit inventory and diff classification from public 4.11.0 |
| Architecture and provider neutrality | IN PROGRESS | Typecheck, neutrality suite and manual coupling review |
| Cost-policy dashboard approval | PASS | Focused configuration/web tests; exact-hash proposal and ledger retention |
| Security and protected resources | UNVERIFIED | Full security-focused and authorization suite on final source |
| Full regression suite | UNVERIFIED | Exact pass/fail/skip count on final source |
| Virgin install | UNVERIFIED | Fresh archive install and startup |
| Upgrade from 4.11.0 | UNVERIFIED | Preserved configuration/state and no migration |
| Desktop browser | UNVERIFIED | Final-source browser inspection |
| Mobile portrait and landscape | UNVERIFIED | Final-source responsive inspection |
| Mallow narrated walkthrough | UNVERIFIED | Continuous final-source recording with readable pauses |
| Documentation and links | IN PROGRESS | Release docs and link validation |
| Distribution archive and checksum | UNVERIFIED | Independent archive inspection and SHA-256 |

No public tag or GitHub Release may be created while any mandatory gate is `FAIL`, `BLOCKED`, `UNKNOWN` or `UNVERIFIED`.

## Current qualification boundaries

- Live paid OpenRouter execution: not performed; optional adapter remains contract-qualified.
- Cost values absent from provider evidence: `unavailable`, never zero.
- Experimental model host: qualification adapter, not a general production service.
- Narration: presentation over deterministic evidence; no authority to create execution facts.
- Deployment of operational Agent Control installations: outside this release task.
