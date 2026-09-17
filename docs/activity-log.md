# Conventional activity log

Agent Control 4.9 writes a read-only operational projection of its authoritative durable Job events as newline-delimited JSON. On Linux the preferred path is `/var/log/agent-control/activity.jsonl`. If that location cannot be created or written, Agent Control falls back to `<state-dir>/logs/activity.jsonl`; Android always uses the application-private state location. Set `AGENT_CONTROL_ACTIVITY_LOG` to an approved alternative path.

Each line is `agent-control.activity/v1` and contains a timestamp, stable event ID, run and lane identities, event type, provider, model, input/cached-input/output/total token values, status and evidence reference. Fields absent from the authoritative event are the string `unavailable`; missing telemetry is never converted to zero. Credential-like material passes through the existing Agent Control redactor before append.

The log is a projection, not a command interface or source of truth. Agent Control opens the file for each append, so `tail -f`, `jq`, standard ingestion agents and rename/create rotation work without a restart:

```bash
tail -f /var/log/agent-control/activity.jsonl
jq -c 'select(.status == "FAILED")' /var/log/agent-control/activity.jsonl
```

An example logrotate policy is provided at `config/logrotate/agent-control`. Deploy it with the ownership/group appropriate to the installation. The application creates directories with mode `0750` and files with mode `0640`; operators remain responsible for host log-retention and reader-group policy.

See [`docs/examples/activity.jsonl`](examples/activity.jsonl) for synthetic schema examples.
