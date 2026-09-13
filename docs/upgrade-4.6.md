# Upgrade an existing installation to the 4.6 candidate

[Install a new instance](installation-first-run.md) · [Release status](public-release-readiness-4.6.md)

This is a **review-candidate upgrade**, not permission to replace a production service. Keep the prior release and a consistent state backup available. Never pull or reset over a dirty or diverged checkout.

## Record and preserve the existing installation

Record its version, commit, `git status --short`, startup method and configured state paths. The default state directory is `.agent-control`; inspect your configuration for external state paths.

Stop your own foreground instance with Ctrl+C, or use the already-authorised service procedure. Copy state only after it is quiescent. Keep tokens and provider configuration private. Record hashes of the configuration and job history before upgrading.

## Use a sibling checkout

From the parent directory, keeping the original checkout intact:

```bash
git clone --branch feature/4.6-model-intelligence-showcase https://github.com/lozknowles/agent-control.git agent-control-4.6-review
cd agent-control-4.6-review
git rev-parse HEAD
./scripts/bootstrap-agent-control.sh --check --target "$PWD"
```

For the default layout, with the stopped original checkout at `../agent-control`, copy its state into the new, still uninitialised checkout:

```bash
cp -a ../agent-control/.agent-control .agent-control
./scripts/bootstrap-agent-control.sh --install --role control --target "$PWD"
```

For external state paths, preserve the explicitly configured paths and use an isolated copy for review; do not point a second live controller at the same state. Do not copy live credentials or job evidence into tracked files.

Bootstrap must preserve existing configuration, including numeric policy values. Compare the original/copy configuration hashes and retained job records before starting.

## Start and verify

Use the [documented hidden-token startup](installation-first-run.md#start). If another isolated instance is running, set `AGENT_CONTROL_WEB_PORT=4311` and use that loopback URL.

Check the dashboard, retained history and settings; run local discovery, inspect Estate and complete the [governed observation job](installation-first-run.md#watch-agent-control-work). Confirm the internal observer remains recognised as a controller-local worker. Do not relax policy to bypass an identity failure.

## Roll back

Stop the candidate. Keep its new evidence separate. Resume the original release against the unchanged original state, using its established startup procedure. Do not copy candidate-written state backwards without a version-specific migration check.

The [qualification report](public-release-readiness-4.6.md) records the actual prior stable version, configuration, retained history and observed result. Disposable upgrade qualification is not a production deployment.
