# Agent Control 3.1.0 release notes (draft)

Agent Control 3.1 introduces one coherent control plane across the existing TUI and a new responsive web dashboard. The browser observes the same lane, scheduler, provider, PTY, baton, Git, routing and verification projection; authenticated commands enter through the same policy boundary.

Completion is no longer a synonym for an agent saying “done.” Each lane can move through claim, evidence collection, verification and explicit acceptance under a task-specific minimum-evidence policy. Routing decisions can account for capability, health, reliability, monetary cost, latency, duration, privacy, context/tool needs and available compute, and record an inspectable rationale.

The release adds an executable conceptual-integrity gate so cheap feature creation cannot silently create duplicate state, second control paths, provider-owned policy or interface-owned authority.

Security defaults remain conservative: localhost binding, observer-only operation without a configured token, bearer-authenticated JSON mutations, origin validation, secret redaction, no authority cookies and no direct web route for leases, scheduler internals or PTY input. Human takeover remains unconditional.

This is a source release. It does not deploy Agent Control, expose a dashboard remotely, create credentials, alter production services, or weaken the 3.0.1 infrastructure-neutral boundary.
