# Lean runtime security and governance regression

Focused: 117 passed, 0 failed, 0 skipped. Full suite: 1944 passed, 0 failed, 0 skipped.

Tests exercise hidden/future/previously allowed tools, name spoofing, invalid schema inputs, missing verification, unresolved failures, stale lease/ownership generations, human takeover, terminal escapes and context vault access. Existing native qualification tests cover durable evidence, actual lease expiry, cancellation, takeover during model waits, process cleanup, verifier failure, protected metadata and restart integrity. Test fixtures are labelled synthetic; they are not physical attack claims.

The model cannot set lifecycle facts. Those facts come from registered raw handler results observed by the dispatcher. Tool exposure never substitutes for authorization; raw handlers remain behind ToolPolicy, live authority and cancellation. Finish never proves success. Default behaviour is unchanged when the experiment is disabled.

Capture is restricted to authorised disposable-repository qualification context. No bearer headers are logged. Raw qualification journals remain private evidence. No credential, production deployment, protected service configuration, provider integration or public source state was changed.

Remaining boundary: generic adapter effect/result contracts need qualification before use outside repository mutation. The experiment is not approved for production. Unexecuted physical native A/B is UNKNOWN, not zero regressions.
