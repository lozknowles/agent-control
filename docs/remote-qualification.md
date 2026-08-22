# Remote Qualification

Agent Control qualification is a core-host operation. The operator may initiate it from any authorised SSH client; operator location is not part of the execution contract.

## Entry point

From an authorised client:

```bash
ssh hpubuntu '/fast/repos/agent-control/scripts/qualify-remote.sh'
```

The script changes to the canonical Agent Control checkout and runs `npm run qualify:all`.

## Protected configuration

Do not send node/API credentials on the SSH command line. Optional live qualification configuration is loaded on hpubuntu from:

```text
~/.config/agent-control/qualify.env
```

or the path named by `AGENT_CONTROL_QUALIFY_ENV_FILE`.

The entry point refuses the environment file unless its Unix mode is `0600` or `0400`.

Example non-secret portions:

```bash
CHATGPT_WINDOW_URL=http://127.0.0.1:8767
PIXEL_NODE_URL=http://127.0.0.1:18788
AGENT_CONTROL_REMOTE_CHECKS='sentinel|sentinel|echo AGENT-CONTROL-REMOTE-PASS'
```

Credentials such as `AGENT_CONTROL_NODE_TOKEN` may be stored in this protected file until a stronger credential provider replaces it. Never commit this file.

## Authority model

Remote SSH access is transport/authentication, not blanket Agent Control authority. `qualify-remote.sh` exposes one bounded operation: execute the existing qualification matrix and write evidence. It does not add a generic remote shell API to Agent Control.

The qualification itself continues to enforce provider/node capability and authority boundaries. A reachable or authenticated resource may still be degraded, unavailable or forbidden for a requested operation.

## Expected remote behaviour

A remote run should always execute and report the state it observes. Offline/unconfigured optional resources are `SKIPPED`; configured required probes fail closed when unusable. A locked Windows interactive provider, for example, can advertise attachment health while failing bounded functional readiness.

## Future

A later control-plane API may expose `qualification.run` as an explicit authorised capability. Until that endpoint itself has authentication, authority, replay and audit qualification, SSH to the core plus this bounded entry point is the preferred remote initiation path.
