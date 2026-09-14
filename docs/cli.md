# Agent Control 4.8 CLI candidate

The existing `agent-control` command now has the short alias `ac`. Both use the same authenticated controller API as the browser. This is a 4.8 release candidate based on v4.7.1 plus the report-output-profile proposal; installing a client does not create another scheduler or runtime.

## Quick start

Use Node.js 22 or newer. From a source installation:

```sh
node scripts/agent-control.mjs --version
node scripts/agent-control.mjs status
```

An npm-linked/installed package exposes `agent-control` and `ac` (`ac.cmd` in Windows shells where `ac` is already an alias). PowerShell commonly reserves `ac` for Add-Content; use `agent-control` or `ac.cmd` there. No large terminal UI or additional CLI dependency is required.

```sh
ac status
ac estate
ac nodes
ac node NODE_ID
ac jobs
ac jobs running
ac jobs queued
ac jobs completed
ac watch RUN_ID
```

Copy exact IDs from the output. A catalogue ID names a job definition; a Saved Job ID names saved parameters; a run ID names one execution. `ac job` and `watch` require a run ID, never an inferred latest run. Node labels/configured IDs are accepted only when unambiguous. Narrow terminals use wrapped records, and identifiers are not truncated.

## Existing architecture and smallest delta

| State | Existing source | CLI surface |
| --- | --- | --- |
| Existing | `/api/status`, authoritative service status | `status` |
| Existing | `/api/estate-map`, `/api/observability/nodes/:id[/resources]` | `estate`, `nodes`, `node` |
| Partial CLI | `/api/jobs`, `/api/job-definitions`, `/api/saved-jobs`, `/api/runs`, `/api/job-runs` | `jobs`, `jobs catalog`, `job`, `run` |
| Existing | `/api/runtime-map`, `/api/observability/runs/:id` | `job process`, `job tokens` |
| Existing | retained run transcript / Inspector history | `job history`, `logs` |
| Existing | `/api/workers`, `/api/models`, `/api/providers`, `/api/models/routes` | `workers`, `models`, `providers`, `routes` |
| Existing | `/api/runtime-safety` decisions | `policies` (recorded decisions, not policy editing) |
| Existing | `/api/events` authenticated server-sent events | `watch`, `history --follow`, `logs --follow` |
| Proposed in report-profile PR | `/api/observability/runs/:id/outputs[/profile]` | `job output`, `job evidence` |
| Partial | status-client connection settings and operator token | shared authenticated client; HTTPS/SSH command transport |
| Missing before 4.8 | consistent human/JSON formatting, help, exit codes and cross-platform client checks | new thin client and formatter modules |

Core schemas, routes, policies, jobs, frozen results, batons and telemetry remain owned by the controller. Existing saved-job/ACP/credential commands remain available. Legacy job reads now send the existing operator token too, matching v4.7.1's protected API.

## Run a catalogue job

```sh
ac jobs catalog
ac run JOB_ID --help
ac run JOB_ID --declared-parameter value
```

Parameters and types come from the core Job manifest or versioned parameterized definition. Kebab-case aliases are accepted for camelCase parameter names. The client validates required fields, enums and numeric bounds; the controller still owns admission and approval. Unknown options are rejected. No job-specific executor is built into the CLI.

Core Jobs use the existing run endpoint. Parameterized definitions create a version-pinned Saved Job and submit it using the existing Saved Job API. Optional `--saved-id`, `--name`, `--model` and `--context THIN|STANDARD|DEEP` select existing configuration fields. Existing budget overrides are available as `--max-input-tokens`, `--max-output-tokens`, `--timeout` (minutes) and `--retries`; the controller still validates them. If creation succeeds but submission fails, the error identifies the saved ID; inspect it before retrying. Mutations are never automatically retried. This command does not upload local files: repository/file parameters refer to the controller or declared execution node.

## Inspect results and files

```sh
ac job RUN_ID
ac job RUN_ID process
ac job RUN_ID tokens
ac job RUN_ID history
ac logs RUN_ID --tail 30
ac job RUN_ID history --follow
ac job RUN_ID history --download --directory ./reports
ac job RUN_ID output --profile simple
ac job RUN_ID output --profile detailed --download --directory ./reports
ac job RUN_ID evidence --download --directory ./reports
```

Outputs use the catalogue's default unless a profile is selected. Markdown, text and JSON downloads are the same saved projections the dashboard uses, including source/run IDs and SHA-256 hashes. Files use exclusive creation and owner-only permissions where supported; overwrite is refused. `--format text` selects the existing plain-text alternative of a Markdown profile. History stays separate; a tailed download has its own derived hash. Profiles never regenerate analysis.

Tokens distinguish input, cached input, fresh input and output. Cache reuse is explicitly derived, and incomplete counters stay unavailable. Costs retain currency, recorded authority and coverage; currencies are never added together. A subscription-backed route without billing evidence reports unavailable. Native node measurements keep their scope, timestamp and authority. A stale estate observation is not converted into an online/qualified claim by a fresh resource sample; CPU-only nodes have no fabricated GPU section.

## Watch

Watch reads the existing event stream and refreshes canonical state after invalidation. It coalesces bursts and suppresses duplicate output. Interactive terminals refresh in place; redirected/dumb terminals print changed snapshots. JSON watch is newline-delimited structured snapshots. The final state is displayed, including failed/degraded outcomes.

Ctrl-C exits with 130 and **does not cancel the job**. Stream disconnection returns an unavailable error and leaves the job running. Reissue watch to reconnect and inspect current retained state. There is no new telemetry stream, automatic job retry or cancel flag hidden in watch.

## JSON and scripting

```sh
ac jobs --json
ac node NODE_ID --json
ac job RUN_ID --json
ac job RUN_ID tokens --json
ac watch RUN_ID --json
ac run JOB_ID --quiet
```

Read responses use `agent-control.cli/v1`: `command`, `endpoint`, `authority: AgentControlService`, and `data` containing the existing API projection. Watch uses `agent-control.cli-watch/v1`, one JSON object per line; errors use `agent-control.cli-error/v1` with `exitCode` and a safe message. Token summaries include `agent-control.cli-token-view/v1` with original totals/coverage/calls. Native API schema/version fields are retained where provided. Treat absent/unknown fields as unavailable, not zero. Parse JSON rather than human tables. `--quiet` emits returned identifiers or file paths where applicable; `--no-color` is accepted and colour is never required.

| Exit | Meaning |
| --- | --- |
| 0 | Successful command / successful or active governed result |
| 2 | Usage, configuration or destination error |
| 3 | Authentication failure |
| 4 | Missing/ambiguous ID or profile |
| 5 | Controller denied permission |
| 6 | Failed/cancelled/degraded governed result, or degraded system status |
| 7 | Transport/server unavailable or response integrity failure |
| 130 | Watch interrupted locally; job continues |

A successful report/history read returns 0 even if the recorded report describes a failed job. `job` summary and `watch` return 6 for failed/degraded runs. Historical saved-job administration commands retain their legacy error contract; the new read/run/watch hierarchy uses this table.

## Remote and saved connection settings

Explicit `--endpoint` takes priority, then `AGENT_CONTROL_WEB_URL` (and report-client compatibility `AGENT_CONTROL_WEB_BASE_URL`), then existing status-client environment/file settings. The existing `AGENT_CONTROL_WEB_OPERATOR_TOKEN` is sent in the Authorization header for reads and mutations. Do not put tokens in command arguments or JSON connection files. There is no CLI login database or new credential store.

```sh
ac --endpoint https://your-authorised-controller.example status
ac --endpoint http://127.0.0.1:4310 status
```

Non-loopback cleartext HTTP, credential-bearing URLs, redirects and endpoint query/path-prefix overrides are rejected. Use approved HTTPS or the existing SSH command transport. The existing `agent-control.status-client/v1` configuration supports HTTP or SSH. HTTP URLs may end in `/api/status`; other commands use the same controller origin. SSH reuses its existing host/user/port/identityFile/statusHost/statusPort settings and follows the existing status-client remote-command pattern: a fixed Node helper relays the request to the controller-local API over encrypted SSH stdin/stdout. Credentials and request values never enter the SSH command arguments. No TCP forwarding permission or listening tunnel port is required; the request subprocess is cleaned up at exit. The client still uses the existing operator token; SSH access alone does not grant API mutation authority. No server configuration or SSH key is changed.

Existing default configuration locations:

- Windows: `%APPDATA%\Agent Control\status-client.json`
- Linux/macOS/Termux: `$XDG_CONFIG_HOME/agent-control/status-client.json`, or `~/.config/agent-control/status-client.json`
- Override: `AGENT_CONTROL_STATUS_CONFIG`

No additional named-profile database is introduced. Use the existing configuration selector for multiple authorised connection files. Node on the controller and an SSH client on the client machine are needed for SSH transport; direct HTTPS does not need SSH. No systemd, GNU utilities, desktop browser, x86 or GPU requirement is introduced by the client.

## Candidate qualification

See the accompanying CLI qualification record for the exact tested commits, platform evidence, installation/upgrade result and remaining release gates. Shell completion and a large TUI are optional follow-ons; physical Android and macOS claims require their own evidence. This document does not authorise publication of a formal 4.8 release.
