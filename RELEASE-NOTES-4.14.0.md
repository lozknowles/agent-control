# Agent Control v4.14.0 RC1 — draft release notes

**EXPERIMENTAL. Not published or approved for release.** Production remains v4.13.0. See [qualification](V4.14-QUALIFICATION-REPORT.md) for exact revisions and feature decisions.

RC1 fixes an optional executable's asynchronous spawn failure that could terminate CPU-only first-run discovery. Missing, failed, malformed and timed-out GPU inventory now have structured optional-capability states. A GPU-required Job still needs a qualifying GPU worker. The read-only `agent-control doctor` command distinguishes installation prerequisites from optional executable availability and unconfigured services.

Two pristine Ubuntu CPU-only installs completed ordinary FIRST_RUN and approved observation Jobs without a restart. A separate disposable systemd installation passed v4.13 -> candidate -> v4.13 upgrade/rollback for its recorded configuration and legacy Jobs. This is not universal Linux support or new experimental-format rollback qualification.

The tool parser now rejects duplicate JSON keys inside native argument strings before repair or semantic batch dispatch. A frozen 150-case corpus improved from 140/150 with ten false repairs to 150/150 with zero false repairs. Two dashboard renderers now encode activity/cache class metadata; hostile browser reproductions inserted HTML before the fixes and did not afterward. Remote exploitability was not established.

The integrated opt-in semantic path achieved 4/5 independently verified internal tasks, with zero parser/translation failures. Controlled physical Jobs demonstrated bounded repair/rejection, no-progress signals/termination, cancellation and worker kill. These do not make the semantic path, recovery, diagnostics or synthetic forensic vault release-ready. Numbered-output protection has two retained false positives on legitimate pipe-numbered prose. See individual decisions; no blanket reliability/safety claim is made.

Stable twelve-slot Job identity styling keeps explicit Run IDs and status labels; colour collisions remain possible. New genuine live videos distinguish actual Qwen inference from controlled HTTP fault responses. They are unsigned visual evidence, not proof of every release gate.

No semantic mode, no-progress mode, raw capture, paid escalation or recording is activated by default in normal Job configuration. AutomationBench and Strands adapters remain EXCLUDED; multi-file atomicity remains DEFERRED.

The v4.13 diagnostic coverage remains PARTIAL. Its small, correlated AI-reviewed 47-case evaluation is not a general accuracy guarantee and is separate from all newer reconciliations. Pixel physical identity remains unverified. No AutomationBench qualification, AWS cost reproduction, universal model parity, universal platform support or signed video is claimed.

Do not publish this draft or upgrade an existing installation without explicit approval.
