# Computer Use qualification — 2026-09-26

Classification: **EXPERIMENTAL**. Candidate branch: `feature/governed-computer-use-20260926`. Base: `origin/main` at `46442b620`.

## Exact checks

| Check | Result |
| --- | --- |
| `npm run check` | 2,351 passed, 0 failed, 0 skipped; includes TypeScript, bootstrap, dashboard, infrastructure neutrality and status checks |
| Focused fake-provider and Job tests | 17 passed, 0 failed |
| Isolated live headless Chromium tests | 2 passed, 0 failed |
| `npm audit --omit=dev --audit-level=high` | 0 total advisories in the audited dependency graph |
| `git diff --cached --check` | passed |

The live browser test used a disposable loopback HTTP page. Chromium created and selected tabs, navigated, found semantic input and button elements, entered `Ada`, clicked Apply and freshly observed `Done Ada`, title and URL. A second test refused an external destination before any action. Both used `/snap/bin/chromium` supplied through `AGENT_CONTROL_CHROMIUM_EXECUTABLE` on the qualification host. No production browser profile, service or asset was touched.

Blender was not available on the test host; `DISPLAY` and `WAYLAND_DISPLAY` were unset. A check of the Windows command path and standard Blender program directory also found no installation. A Blender object/save/export demonstration and any desktop accessibility adapter remain unqualified. The browser test is the available bounded graphical demonstration, not Blender evidence.

## Retained private evidence

The logs are under `/fast/qualification/computer-use-20260926/` on the qualification host. They are not published with the source tree.

| File | SHA-256 |
| --- | --- |
| `full-check.log` | `00f0af5a35588305b66bde9a3333770a7efd480919224b5955edcc5def879ab4` |
| `focused-tests.log` | `10a4f03dd1d181ec5d6217fc16d49f80d42d4dd7bf5f7e78e9c3ec2d056ecd06` |
| `browser-integration.log` | `9c97523762d0974b13b1f1602a08cfe2e8183b774e0575a792d3c24b1e56bfa6` |
| `npm-audit.json` | `85dbe2f51ba197740ab804896ed401b2c5c741f9ac47c2ee6975998fa625bdef` |
| `desktop-availability.txt` | `7a6631a0329687d23984c46c51f7a7c8c8f7a0ae18445d119692f016de1e4fab` |

Security boundaries checked: controller-local worker identity, bounded task size, stale state rejection, explicit result verification, approval and secret-text blocks, password-field refusal, destination allowlisting, WebSocket refusal, no arbitrary JavaScript or downloads, and no clipboard/screenshot/video capture. The dashboard projection reads managed evidence artifacts and requires operator authentication. The dependency audit is only a dependency check; it does not prove application security.

Unqualified: approval resume, screenshots, Video Evidence Mode recording/overlay, real desktop adapters, Blender, public-site interaction, browser profile/credential handling, physical dashboard inspection and production routing. A request for session video returns `BLOCKED` rather than claiming a recording. Provider fallback and recovery are tested with fakes, not physically across providers.
