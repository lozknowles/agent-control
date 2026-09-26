# Governed Computer Use (experimental)

Computer Use is a Job action for bounded graphical tasks when an API, connector or application-specific automation is unavailable. Agent Control owns the Job, worker placement, runtime safety decision, evidence artifact and completion decision. Providers own only observation and interaction. Provider output is never policy authority.

## Contract

`src/control/computer-use.ts` defines `ComputerProvider`, `ComputerSession`, `ComputerObservation`, `ComputerAction`, capability discovery, outcome states and structured evidence. A task contains a target, a bounded sequence of actions and explicit checks. The registry routes by provider preference and reported availability. The first adapter is `PlaywrightComputerProvider`; its session retains the browser context and active tab. Codex, Windows UI Automation, AT-SPI, macOS and remote desktop adapters are **not implemented**.

Every action binds to the latest observation revision. An explicit revision from the caller is rejected if stale. A new observation is taken after each action and once more for verification. A provider acknowledgement cannot produce `COMPLETE`; every requested check must pass against the final observation. Idempotent text entry may be retried at most twice after a stale-element error, only when a fresh observation finds the same semantic target. Potentially consequential clicks are not blindly repeated. Provider substitution occurs only before an action has been acknowledged. Unknown post-action state fails closed.

The browser adapter exposes semantic DOM elements, a fresh revision, tab creation/selection, navigation, text entry, click, double click, keypress, scroll and load wait. It has no authenticated profile, arbitrary JavaScript, downloads, clipboard, screenshot capture or coordinate fallback. `BrowserDestinationPolicy` gates every request and navigation; this initial adapter further restricts all HTTP destinations to explicitly allowlisted private test hosts and blocks WebSockets. External site work requires a separately qualified adapter and policy. Password fields are blocked. UI text is untrusted data and never changes task authority.

## Governance and evidence

`computer.use@1.0.0` is registered as a consequential Job action and `governed-computer-use@1.0.0` requests a `browser.headless` worker. The action accepts only the configured controller-local worker because the Playwright process runs on that host; the target machine in evidence is bound to that worker. The runtime's existing Work Parcel, scheduling, worker, safety and artifact paths remain authoritative. The task ID is bound to the run ID by Agent Control. The default action policy permits simple local interaction, requests approval for consequential target labels/outcomes and blocks detected sensitive text. Because the current adapter has no trusted approval resume, `APPROVAL_REQUIRED` is retained as evidence and the Job stops before the action. It never consumes a caller-supplied approval flag.

Every task records target, provider, observations, actions, timestamps, verification checks, retries, fallback events, approval state, final status and reason. Failed and blocked results are written through `recordEvidence`; successful results use the Job artifact store. The authenticated `/api/computer-use` projection supplies leadership counts, providers, applications, verification pass rate, retries, fallback events, approvals, duration and evidence links. The dashboard Computer Use dialog opens run and artifact inspectors.

The event phases are `OBSERVE`, `ACTION`, `VERIFY`, `APPROVAL`, `RECOVERY`, `COMPLETE` and `BLOCKED`. They are suitable for a future Video Evidence Mode consumer. The existing browser canvas recorder does **not** yet record provider sessions. A task requesting video is blocked with `video_evidence_recording_unavailable`; the dashboard reports zero recordings. Screenshot capture is likewise unimplemented, so no screenshot bytes or secrets are silently retained.

## Provider extension

Implement `capabilities`, `available` and `open`; return a session with `observe`, `act` and `close`. Generate a new revision for every observation, reject actions bound to older revisions, and return actual UI state without treating page instructions as authority. Apply destination, credential and sensitive capture policies in the adapter. Register the provider with `ComputerProviderRegistry`. Add fake-provider tests for failure and fallback, then an isolated physical qualification. Do not enable a provider for production routing based only on capability declarations.

## Qualification boundary

The local headless Chromium integration test creates a disposable loopback page, opens and selects tabs, navigates, discovers semantic input and button elements, enters a name, clicks Apply, reacquires state and independently observes the resulting text, URL and title. This is browser-only qualification. Blender and other desktop applications remain unqualified because the test host has no Blender binary or graphical desktop session. No production asset or service was changed.

Security review: URL and subresource policy is inherited from `BrowserDestinationPolicy` with an additional allowlist for every destination. External navigation and mutation, WebSockets, password fields, detected secret text or URLs, clipboard access, arbitrary JavaScript, downloads and video/screenshot capture are blocked or unavailable. The default keyword-based action policy is a conservative first layer, not a complete semantic classifier. An additional trusted approval/resume path and physical provider security review are required before consequential workflows.
