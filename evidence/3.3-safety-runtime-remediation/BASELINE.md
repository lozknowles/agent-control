# Safety and Runtime Remediation Baseline

- Recorded: 2026-08-30
- Authoritative repository: existing Agent Control checkout on the development host
- Starting maintained 3.3 commit: `bc48e96a259717567da699a72453edb566ee2f39`
- Starting branch: `feature/browser-pixel-capabilities-20260830`
- Isolated worktree: dedicated safety-runtime remediation worktree
- Remediation branch: `fix/3.3-safety-runtime-remediation`
- Authoritative checkout was clean and was not modified.

## Before-change verification

| Command | Result |
|---|---|
| Focused runtime/safety tests | 33/33 passed in 1796.538863 ms |
| `npm test` | 424/425 passed in 33095.217903 ms |
| `npm run check` | Failed only at the existing infrastructure-neutrality gate |

The one baseline failure reported the existing three browser-capability topology strings in one document and one qualification script. This parcel neither suppresses nor repairs that out-of-scope finding. Raw logs and exit statuses are in `raw/`.
