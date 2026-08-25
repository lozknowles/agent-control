# Agent Control 3.1.0 release notes (draft)

Agent Control 3.1 introduces one coherent control plane across the existing TUI and a new responsive web dashboard. The browser observes the same lane, scheduler, provider, PTY, baton, Git, routing and verification projection; authenticated commands enter through the same policy boundary.

Reusable work is now represented as versioned Actions, declarative YAML Jobs, separate timezone-aware Schedules and durable Runs. Steps request capabilities rather than machines, exchange typed checksum-verified artifacts, wait visibly for dependencies/workers/resources/approvals, and record placement rationale and every retry. Manual and scheduled invocation share one application-service path.

Completion is no longer a synonym for an agent saying “done.” Each lane can move through claim, evidence collection, verification and explicit acceptance under a task-specific minimum-evidence policy. Routing decisions can account for capability, health, reliability, monetary cost, latency, duration, privacy, context/tool needs and available compute, and record an inspectable rationale.

The release adds an executable conceptual-integrity gate so cheap feature creation cannot silently create duplicate state, second control paths, provider-owned policy or interface-owned authority.

Normal Work Queue agent execution now requires an adaptive execution recipe. Worker placement remains a scheduler decision; provider/model routing and scaffolding are separately inspectable. The execution receives only a central tool-policy gateway, and each invocation is revalidated against the recipe grant, current capability/privilege policy, lease generation, ownership generation and human takeover. Process completion stops at verification pending rather than accepted.

This does not make opaque CLI-internal tools individually visible to Agent Control. The qualified `HarnessJobAgentAction` is the sole model-backed Job bridge: it enters `HarnessDispatcher`, constructs a policy-bound recipe, mediates returned Agent Control tool requests and stops at verification pending. Other model-backed Actions and external adapters must independently qualify that same harness/gateway integration before universal adapter coverage can be claimed.

Bootstrap and status reporting are deliberately fail closed. `npm run init` creates only an empty schema-valid configuration when none exists and never overwrites existing operator state. A machine-readable implementation-status registry, generated Markdown projection and `npm run check:status` gate distinguish implemented, qualified, partial and planned capabilities so documentation claims cannot silently drift ahead of executable evidence.

Security defaults remain conservative: localhost binding, observer-only operation without a configured token, bearer-authenticated JSON mutations, origin validation, secret redaction, no authority cookies and no direct web route for leases, scheduler internals or PTY input. Human takeover remains unconditional.

This is a source release. It does not deploy Agent Control, expose a dashboard remotely, create credentials, alter production services, or weaken the 3.0.1 infrastructure-neutral boundary.

Installation, dashboard operation, scheduler policy, monitoring, recovery and rollback are documented in the versioned 3.1.0 Operator Guide distributed as both Markdown and a release PDF.

The events reference workflow is qualified against a harmless non-production fixture. Its `07:00/19:00 Europe/London` Schedule is shipped disabled. This release does not enable unattended publication, access Facebook, or bypass the existing LocalWalks reconciliation/release safeguards.
