# Reproduction and inspection

## Inspect the evidence

From the repository root:

```bash
cd docs/evidence/glm-5.3-flash-agent-control-3.6-qualification
sha256sum --check SHA256SUMS
jq . inputs/frozen-manifest.json >/dev/null
jq . lane-a/score.json >/dev/null
jq . lane-b/score.json >/dev/null
gzip -cd artifacts/lane-a-full-check.log.gz | tail -n 12
gzip -cd artifacts/lane-b-full-check.log.gz | tail -n 12
tar -tzf artifacts/lane-a-raw-responses.tar.gz
tar -tzf artifacts/lane-b-raw-responses-and-contracts.tar.gz
```

## Repeat the baseline gate

Create an isolated worktree at the exact commit, install dependencies without lifecycle scripts, and run:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
npm run qualify
node --import tsx scripts/run-capability-routing-benchmark.ts
git diff --check
```

The recorded baseline result is 628/628 tests, 29 implementation-status entries, a passing local release gate with unconfigured physical infrastructure skipped, and a 60-task routing benchmark with 12 holdout cases and zero unsafe false-positive routes.

## Repeat a model lane

The exact runner is `harness/typed-runner.mjs`; its SHA-256 and fixed envelope are in the manifest. Mount only:

- the isolated frozen worktree as `/workspace`;
- a private evidence directory as `/evidence`;
- the runner as `/runner.mjs`;
- the frozen debt brief and prompt components at their recorded paths;
- the minimum operating-system runtime and resolver needed for provider transport.

Provide OpenRouter authentication by an indirect mode-`0600` credential reference. Do not place a credential in arguments, logs, evidence, repository files, or Contract state. The runner deletes the credential from its environment before invoking any repository command and exposes no arbitrary shell or network tool to the model.

`artifacts/assessment-prompt.txt.gz` contains the byte-exact assessment prompt used by both scored lanes. Its decompressed SHA-256 is the assessment-prompt hash in the manifest. The separate debt brief and implementation prompt remain available for inspection.

For the governed lane, run `harness/governed-contract.mjs prepare` through Node with `tsx`, execute the identical typed runner with `BENCHMARK_MODE=governed`, and call `finalize` with the runner exit status. Run the complete gate independently before scoring. Do not use Lane A material as Lane B input.

The experiment is intentionally not a one-command production tool. Repeating it incurs provider cost and must preserve the frozen isolation and evaluation order described above.
