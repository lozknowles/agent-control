# Agent Control 2.0 Qualification

Run the release qualification from the core host (`hpubuntu`). The harness is fail-closed for tests it attempts and writes timestamped JSON evidence under `qualification-results/`.

## Baseline

```bash
npm run qualify:all
```

Always tests:

- TypeScript + complete local unit suite
- Linux Codex presence/version on hpubuntu

## Pixel live qualification

First establish the qualified loopback forward from hpubuntu to the Pixel node, then set the current node credential without printing it:

```bash
export AGENT_CONTROL_NODE_TOKEN='...'
export PIXEL_NODE_URL=http://127.0.0.1:18788
```

The harness then tests Pixel node health and performs the live capability-resolution proof (`platform.android`, `device.physical`, `harness.codex`, `observe.android.logcat`) followed by the authorised observation job.

## Windows ChatGPT bridge

When the hpubuntu `chatgpt-window` Responses adapter is running and four-green, set:

```bash
export CHATGPT_WINDOW_URL=http://127.0.0.1:8767
```

The harness sends the deterministic sentinel prompt and requires `AGENT-CONTROL-CHATGPT-OK` in the returned Responses payload.

## Other remote platforms

Optional SSH checks can cover Sentinel, MSI SSH endpoints, or later nodes without hard-coding machines into the harness:

```bash
export AGENT_CONTROL_REMOTE_CHECKS='sentinel|sentinel|echo AGENT-CONTROL-REMOTE-PASS,other|user@host|echo AGENT-CONTROL-REMOTE-PASS'
```

Each entry is `label|ssh-target|command`. The command must return `AGENT-CONTROL-REMOTE-PASS`.

## Full current topology example

```bash
export AGENT_CONTROL_NODE_TOKEN='...'
export PIXEL_NODE_URL=http://127.0.0.1:18788
export CHATGPT_WINDOW_URL=http://127.0.0.1:8767
export AGENT_CONTROL_REMOTE_CHECKS='sentinel|sentinel|echo AGENT-CONTROL-REMOTE-PASS'
npm run qualify:all
```

## Release rule

A stable release must not be declared from a partial run. Any skipped platform is explicitly recorded as skipped in JSON evidence and must have either a fresh live PASS or an accepted immutable qualification attestation bound to the exact release commit. Do not turn missing infrastructure into a synthetic PASS.
