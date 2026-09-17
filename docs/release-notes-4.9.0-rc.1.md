# Agent Control 4.9.0-rc.1 candidate

This isolated candidate adds governed, coverage-led security audits as a normal
Agent Control Job. It is not a public release.

The candidate also provides a conventional, append-only JSONL activity log at
`/var/log/agent-control/activity.jsonl` on writable Linux installations, with
an application-private fallback. It projects redacted authoritative Job events
with explicit `unavailable` telemetry and supports tailing, `jq`, logrotate and
standard log shippers without becoming a second source of truth.

The candidate provides six explicit phases, separate finder and verifier
invocations, strict verdict schemas, fail-closed sandbox admission, additive
change-aware audits, authenticated CLI/API/dashboard access, deterministic
Markdown/JSON reporting, append-only event hashes and SHA-256 artifact checks.

The methodology is adapted from Cloudflare's MIT-licensed
`security-audit-skill` at pinned revision
`c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`; there is no upstream runtime
dependency and no copied prompt.

Target execution is not enabled by this candidate unless all sandbox guarantees
are evidenced. Static auditing continues when execution is blocked. Historic
review packets retain their original provenance.

Publication, merge, tagging and operational deployment remain unapproved.
