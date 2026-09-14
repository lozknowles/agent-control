# Agent Control 4.8 CLI qualification

Status: **feature candidate qualified with stated limitations; formal release not sealed**.

## Source and dependency

Released baseline: v4.7.1, `2fd8336ab5a856836b7116340312ebbc337884d6`.
The CLI builds on report-output-profile PR #20 at `44a7df8417bf548a3b49898606f5cfb4cb0c2274`.
Candidate branch: `feature/4.8-cli`; runtime-tested commit: `88d2c73764aa81481ac3d72b081791092931c297`.
Version: `4.8.0-rc.1`. Non-document source digest: `2b5e6c08f05299740882f5ff909d0c2556003c80804bf7661e6b9c8caaef4ec5`.
The final qualification-document commit does not change this tested runtime.

The [CLI guide](cli.md) maps existing APIs to commands, documents authentication, exit codes, downloads and platform-specific shell details. The CLI uses Node built-ins and the existing report exporter; it adds no package dependency or execution engine.

## Qualification results

| Check | Result and scope |
| --- | --- |
| Full `npm run check` | PASS: 1,580 tests, 0 failed, 0 skipped; distribution, TypeScript, bootstrap syntax, dashboard syntax, neutrality and implementation-status checks also passed |
| Focused Linux CLI checks | PASS: 18 new CLI/transport tests, plus 3 existing entry-point tests |
| Focused Windows CLI checks | PASS: 18 tests on Windows x64, Node 24.19.0 |
| Linux execution | PASS on Linux x64, Node 24.21.0; authenticated existing loopback controller API |
| Windows remote execution | PASS through existing SSH connection settings and operator authentication; submitted and inspected a real governed observation job |
| Packaged command names | PASS: isolated npm prefix installation exposes `agent-control` and `ac` on Linux, `agent-control.cmd` and `ac.cmd` on Windows |
| Fresh installation | PASS: actual supported bootstrap, isolated state, authenticated candidate runtime and real governed observation |
| Upgrade | PASS: checksum-verified public v4.7.1 source installation to candidate, configuration/state retained, prior run unchanged, new governed observation completed |
| Browser parity | PASS: 16 checks across desktop and touch viewport, light and dark; real completed review visible through Jobs and Run Inspector |
| Report file parity | PASS: Simple Markdown, Detailed Markdown and Evidence JSON downloads match API SHA-256 values and refer to the same frozen source |
| Model execution count | One actual review execution; output/profile selection did not rerun analysis; history unchanged |
| Active list and watch | Actual governed run visible in `jobs running`; watch showed WAITING, RUNNING and DEGRADED, correctly returning exit 6 |
| Formal release gate | NOT PASSED: default gate still selects historical release records; a fresh 4.8 seal and trusted operator approval are required |

Checks used isolated candidate installations. They do not assert that an operational installation has been upgraded.

## Real governed acceptance

Primary review: `32f437dc-2e50-4e3d-8c61-c350e8a5ddab`, Saved Job `cli-48-source-review`, catalogue definition `repository-code-review`.
The CLI submitted it through the existing Saved Job API, watched RUNNING to SUCCEEDED_WITH_FINDINGS, and read its process, tokens, history and three output profiles. Browser navigation opened the same run. Both clients retained the same run ID, source hash and frozen findings.

The bounded review used one existing subscription-backed model invocation against six frozen CLI-source files, not a whole-repository review. Recorded usage was 26,627 input, 0 cached input and 2,103 output tokens (28,730 total). Monetary cost is unavailable on that route; no paid-provider call was needed.

Two valid findings were found and corrected:

- AC-CLI-001: legacy `jobs runs --saved-job ID` treated the option value as a positional run ID. The parser and regression test now preserve the filter.
- AC-CLI-002: SSE framing could stall when CRLF was split across transport chunks. The parser now combines chunks before normalising newlines; the regression test splits that boundary.

The original findings and frozen input remain immutable. The corrections were checked by focused tests and the complete regression suite, without another model review.

Additional actual runs:

- Linux observation: `run-26300f06-fb9f-4519-b0f6-1e1e2f5dbb65`, SUCCEEDED with independent verification and two artifacts.
- Windows-submitted observation: `run-c500b0bc-3770-49b6-9ee2-73a1ac5637e3`, SUCCEEDED with artifacts `artifact-fa630160-3046-45ad-b95c-cef4aa989477` and `artifact-bb8bfe87-6c4e-44a2-93dd-ee138dfa1ea6`.
- Actual source-reference inspection: `run-851f178d-1843-44b5-adc6-82b8481e10ad`. `jobs running` contained this ID and watch showed its real transitions. Existing runtime reconciliation rejected a Git external-read effect with `external_operation_effect_unknown:effect-2-local`; the job ended DEGRADED and the CLI returned 6. This proves truthful failure surfacing, not successful Git qualification.

The primary review's first running-list query occurred before admission and was empty; its watch subsequently observed RUNNING. The separate source-reference run closes active-filter coverage. This is combined evidence rather than a claim that every acceptance screenshot came from one uninterrupted run.

## Preserved failed attempts and limitations

- The host prohibits SSH TCP forwarding. The client now follows the established status-client SSH command route using encrypted stdin/stdout to the same controller API. No SSH/server configuration changed. An additional Windows test exposed and fixed a stdout-drain race before the final passing checks.
- Supplemental timer run `run-8bd6f554-f1c1-4379-bb2e-67767ac024e4` had no worker providing `qualification.local`. It stayed WAITING and held the later queued observation. It was cancelled through the existing API; the existing observation then completed. No capability was fabricated. Earlier failed qualification logs remain retained separately.
- The existing Git external-read verification limitation above remains outside this CLI change. The CLI does not bypass that admission or verification decision.
- Physical Android/Termux and macOS are not qualified by this run. The client has no systemd, GNU-only, desktop, x86 or GPU dependency; narrow-terminal formatting is tested. Touch viewport browser evidence is not physical Pixel evidence.
- Direct HTTPS configuration and authentication/error contracts are tested with controlled servers; physical remote qualification used SSH. No new public HTTPS endpoint was created.
- Subscription-backed monetary billing remains unavailable. Recorded or derived token fields preserve their authority and coverage.
- Shell completion and a large terminal dashboard are optional follow-ons, not requirements for this candidate.

## Evidence and release decision

The private evidence bundle `agent-control-4.8-cli-evidence-20260914` contains original command output, governed apply receipts, full/focused logs, fresh-install/upgrade results, browser captures and report hashes. A convenient operator copy is named `Agent-Control-4.8-CLI-20260914` in Downloads. Bulky binaries and runtime state are not included in normal source pulls.

**Recommended status: ready for feature review with stated limitations; NOT YET READY for formal publication.**

Before formal publication, integrate the report-profile dependency and CLI candidate, bind fresh release receipts/package/limitations to the exact final source, obtain the existing gate's trusted operator approval, and pass `npm run check:release-rc`. The default historical gate reports VERSION_MISMATCH, SOURCE_CHANGED_SINCE_VALIDATION, missing candidate core-check receipts and RECEIPT_SCHEMA_UNSUPPORTED. These do not negate the fresh test logs, but those logs alone do not constitute a release seal. Historical approvals, tags and evidence must not be relabelled as 4.8.
