# Agent Control v4.14 candidate security review

Status: **NOT RELEASE-QUALIFIED**. No confirmed vulnerability was produced by the native audit, but unresolved findings and incomplete coverage prevent a security PASS claim.

## Source and distribution checks

The first exact candidate check rejected a local worktree path in the integration manifest. The path was removed in commit `d4471d7b457de45134b91f28de6b71a1bfeb0ba3`; the three neutrality tests then passed. A staged-source pattern scan found no actual credentials or private topology in the changed files. Its two matches were the deliberate credential-redaction pattern and synthetic fixture in the research forensic test. This pattern scan is a triage check, not proof that no secret exists.

The candidate keeps the legacy tool contract when new options are absent. The semantic path validates granted tool IDs and JSON schemas before dispatch. Repair records are hash chained before dispatch, and a failed evidence sink stops the request. The no-progress observer records keyed fingerprints rather than raw request/result bodies. Raw forensic response capture is restricted to an explicitly granted synthetic-fixture vault and is not enabled for ordinary Jobs. These controls have focused tests but not a complete release security qualification.

## Native audit

The native security-audit Job examined the exact source revision `d4471d7b457de45134b91f28de6b71a1bfeb0ba3` across `src`, `scripts`, `assets` and `android`. Its first pass completed as static-only because sandbox guarantees were unproven. A clean-source continuation then passed 13 recorded bubblewrap controls covering external and loopback network denial, allowlisted environment, credential isolation, scratch-only writes, read-only source, descendant tracking, timeout, memory, CPU, process count, symlink traversal and cleanup. The continuation used a separate verifier worker and invocation identity.

Final audit counts: 12 coverage units, all **PARTIAL**; 0 confirmed, 98 `needs_validation`, and 79 rejected findings. The successful Job and sandbox qualification therefore do **not** mean a vulnerability-free or complete audit. Nineteen unresolved records refer to candidate-changed files; two point to changed lines. Both are output-encoding heuristics. A targeted real-browser adversarial check injected markup into Run ID, event type, lane ID and Job display name through the actual dashboard render functions. It created zero image elements, executed no injected handler, and displayed the hostile text as text in both Activity and Jobs. This one payload check narrows those two concerns; it does not close all 98 findings or prove exhaustive XSS resistance.

## Remaining security work

- Triage and reproduce or reject unresolved findings affecting candidate surfaces; separate inherited source findings from new behaviour.
- Complete focused checks for repair-layer abuse, malicious/oversized tool results, no-progress fingerprint poisoning and forensic permission revocation/retention.
- Verify the final source package and evidence bundle for private endpoints, credentials, paths and unredacted forensic material.
- Re-run the audit against the final frozen candidate commit and retain exact receipts.

The security release gate remains **OPEN**.
