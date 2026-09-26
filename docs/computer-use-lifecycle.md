# Governed desktop lifecycle (experimental configuration)

The desktop provider is opt-in. It is not registered by the default Computer Use action factory and no production route is enabled. `computerWorkflowJob` produces a disabled Job; an authorized qualification bootstrap must explicitly enable its isolated copy.

## Contract and runtime integration

`ComputerWindow` carries a portable window key, provider/application identity, process key, executable and start time, detection time, owner key, role, title, visibility, foreground state and bounds. Native Windows handles remain inside the Windows provider and private qualification configuration.

Actions can declare CURRENT_WINDOW, CHILD_DIALOG, REPLACEMENT_WINDOW, WINDOW_DISMISSED, APPLICATION_REFOCUS, APPLICATION_WINDOW_CREATED or APPLICATION_WINDOW_DESTROYED. Resolution uses process and owner provenance before optional exact-title/destination constraints. It never picks the first or most recently created ambiguous candidate. A unique eligible foreground successor is required. Missing, hidden, security, foreign-process and ambiguous windows block. Transition evidence retains both topologies, previous identity, candidates and decision. A disappearing dialog can be a verified success when its authorized originating window reappears in the foreground.

`registerComputerWorkflowAction` registers `computer.lifecycle@1.0.0` on the normal ActionRegistry. Supply controller-owned Job ID, worker ID, initial window, immutable ordered plan, provider registry, exact output grant and application verifier. `computerWorkflowJob` builds normal dependent Job steps, declared artifacts and verification requirements. JobRuntime owns dispatch, resource locks, approvals, durable artifacts and terminal run status. No qualification wrapper can set COMPLETE. Intermediate observations are continuity artifacts; the final action returns COMPLETE only after the output verifier passes and the originating application window was reacquired.

Approval uses the existing Job step `approval` policy and `JobRuntime.approve`. Managed checkpoint artifacts bind the same run and window identity. A restored runtime reopens the provider and acquires new state. Approval does not authorize stale coordinates. Replay of a consumed approval is rejected by JobRuntime. Approval-required/approved events are retained in the normal run ledger; Computer Use evidence records RESUME and observation/transition/verification events.

## Windows provider

`SkyLifecycleComputerProvider` accepts an injected Sky API port plus a read-only OS metadata reader. `scripts/computer-use-window-metadata.ps1` reads PID, executable, process start, owner handles, bounds, DPI and foreground state. It does not automate UI, focus, input, security settings or application launching. All graphical actions go through the injected Sky port.

The provider checks identity, focus and bounds immediately before input, validates fresh screenshot dimensions, and rejects stale semantic indexes. Coordinate fallback requires an operator-reviewed screenshot, exact point, matching image/bounds and a single-use review under two minutes old. Reviews are never persisted across reconnects. Keyboard keys and text literals are explicitly allowlisted. A plugin tool context may require a local authenticated request queue so the normal Node JobRuntime can request Sky operations from an active tool invocation. That transport is experimental and is not an unattended desktop service.

## Artifact verification

The controller supplies an exact relative file path under one authorized root, current run ID, lower modification-time bound and size limit. The verifier rejects traversal, absolute/alternate-stream paths, symbolic links, hard links, directories, empty/stale/oversized files and output changes during verification. It records size, mtime and SHA-256. There is no directory-listing or arbitrary file-read task parameter.

Application verification is injected. The Blender qualification verifier launches a separate bounded background process with automatic embedded-script execution disabled, reads scene facts and checks the exact requested transform/object names. Only the governed final action owns its outcome. The verifier is qualification tooling; Blender-specific logic is absent from the portable lifecycle/core.

## Qualification boundaries and security assumptions

- The authorized controller, plan, provider and output directory are trusted. UI text cannot grant authority.
- Process identity and OS owner relationships resist unrelated-window/title spoofing. They do not attest an application's internal integrity or defend against arbitrary code already executing inside that process.
- Detection time is not an OS window-creation attestation. A handle destroyed and reused within the same process entirely during a provider outage cannot be conclusively distinguished. Continuous OS lifecycle monitoring is future work.
- Password/security title detection is a deny signal, not a universal sensitive-content classifier. Security UI in another process blocks through foreground/process checks. Unknown applications and security dialogs remain unqualified.
- File checks reduce substitution risks; they are not a sandbox against a hostile local process racing every filesystem operation. Qualification roots must remain controller-owned.
- Blender canvas and file-picker controls expose weak accessibility. Reviewed coordinates and literal text allowlists are required; general unattended file-picker navigation is unqualified.
- Video is unavailable. Optional video is omitted in this workflow and screenshots remain evidence. A task explicitly requiring video retains the existing fail-closed behavior.
- A successful save is not a graphical GLB-export qualification. No export is claimed here.

Automated tests are distinct from physical evidence. Tests cover lifecycle resolution, provenance, ambiguity, changed focus/bounds/screenshots, reconnect, persisted approvals, scoped hashing, application verification and COMPLETE gating. Headless Chromium integration is run separately. Physical qualification reports and screenshots stay outside Git.
