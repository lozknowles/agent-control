# Baseline

- Starting commit: `1c697acdcf172e4b20d89f9b25af02e738e3e7b4`
- Branch: `fix/3.3-dashboard-invocation-telemetry`
- Worktree: `/fast/work/agent-control-3.3-dashboard-invocation-telemetry`
- Authoritative checkout remained clean and unchanged.

The first test attempt could not load `tsx` because a fresh worktree has no dependencies. After installing the package set declared by the base commit in the isolated worktree, the valid baseline was:

- `npm test`: 442 passed, 1 known infrastructure-neutrality failure.
- `npm run check`: typecheck, bootstrap and dashboard checks passed, then the same known infrastructure-neutrality failure stopped the command.

Raw logs and exit statuses are under `raw/`.
