# Pixel physical self-recovery qualification — 2026-08-19

## Verdict

**PASS — Agent Control detected and recovered a deliberately stopped Pixel Android node on physical hardware while preserving the surviving SSH forward.**

No credential was regenerated and no generic remote-shell capability was added.

## Environment

- Resource: Google Pixel 8 Pro (`husky`), Android 17 / SDK 37
- Harness: Termux + Agent Control Pixel node `2.0.0-pixel-alpha.2`
- Control host: hpubuntu
- Pixel node: `127.0.0.1:8788`
- Existing hpubuntu SSH forward: `127.0.0.1:18788 -> Pixel 127.0.0.1:8788`
- Recovery mode tested: TUI manual allow-listed recovery (`Z`)

## Evidence sequence

1. Healthy Pixel node was PID **8270**.
2. Recovery was invoked while healthy. Agent Control returned `forward-ready`; PID remained **8270**. This proves recovery is a health-aware no-op rather than a blind restart.
3. PID 8270 was deliberately stopped while Tailscale, Termux SSH and the existing hpubuntu SSH forward were left intact.
4. TUI probe (`X`) classified the resource as `NODE-DEGRADED` with detail `SSH ready; Pixel node unavailable` rather than incorrectly declaring the device offline.
5. TUI recovery (`Z`) executed the allow-listed Pixel node start path.
6. TUI transitioned to `CAPABILITY-READY  RECOVERED` with detail `Pixel node recovered through existing forward`.
7. Recovered Pixel node had new PID **9315**.
8. Forwarded `/health` returned HTTP 200 with Pixel node version `2.0.0-pixel-alpha.2`.
9. An initial `/v2/resource` check returned 401 because the separate verification shell had `AGENT_CONTROL_NODE_TOKEN` length 0. Reloading the existing saved token (length 64) corrected the verifier environment; no token was regenerated.
10. Authenticated `/v2/resource` then returned `health: healthy` and advertised:
    - `platform.android`
    - `device.physical`
    - `harness.termux`
    - `harness.codex`
    - `observe.android.logcat`

## Failure modes discovered and corrected during qualification

The live fault-injection exercise exposed useful lifecycle edge cases before the final PASS:

- A detached node could start successfully even when the controller initially interpreted SSH/background-process behavior as failure.
- The existing SSH forward can survive a Pixel node stop and temporarily reset connections while the remote listener is absent.
- Recovery truth must therefore come from health verification, not solely the SSH command exit status.
- Recovery is now idempotent: it checks Pixel-local health before attempting a start, preventing duplicate listeners / `EADDRINUSE` from a blind second start.
- Pixel-local health and forwarded health are treated separately, allowing `node-ready` / forward-reconnecting to be distinguished from node failure.
- Operational lifecycle strings were made terminal-safe after Unicode rendering corruption was observed in the Blessed TUI.

## Qualified behavior

`healthy -> recovery request -> no-op (same PID)`

`healthy -> node stopped -> NODE-DEGRADED -> allow-listed recovery -> new node PID -> existing forward healthy -> authenticated capability advertisement healthy`

This evidence qualifies the physical Pixel node self-recovery path tested above. It does **not** claim arbitrary Android process recovery, generic remote command execution, automatic recreation of a missing SSH forward, or recovery when Tailscale/SSH themselves are unavailable.

No credentials are included in this evidence document.
