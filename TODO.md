# Agent Control TODO

This file uses **Agent Control terminology only**. External projects may use different words for similar concepts; those names must not leak into contracts, APIs, batons or UI semantics.

## Release rule

Agent Control 2.0 is feature-frozen while qualification/hardening completes. Items below marked **POST-2.0** are design commitments / investigations, not permission to change the frozen release candidate.

## Terminology

- **Resource** — anything that can satisfy capabilities: host, harness, provider, model, transport or service.
- **Lane** — a visible unit of concurrent work governed by a contract, lease and baton.
- **Execution Session** — a persistent interactive process backing a lane (normally a PTY-backed shell or harness process).
- **Harness** — Codex, Claude Code, Qwen Code, OpenCode or another agent runtime driven through an execution session/API.
- **Execution Session Provider** — implementation that creates, owns, reconnects to and destroys execution sessions.
- **Contract** — desired outcome, capability requirements, constraints and authority inputs.
- **Lease** — exclusive control ownership for a lane/execution session.
- **Observer** — read-only attachment to an execution session.
- **Baton** — structured transferable work state/evidence between lanes/resources.
- **Resource Lock** — explicit pin to a host/harness/provider/model when automatic capability resolution must not substitute it.
- **Workspace** — persisted Agent Control state containing lanes, contracts, batons, leases and restore points. It is not a terminal multiplexer concept.

## POST-2.0 — Persistent Execution Session Provider

Evaluate an existing persistent-terminal engine as an optional `execution.session` provider rather than rebuilding mature terminal persistence inside Agent Control.

Required behaviour:

- create a real PTY-backed execution session;
- execution continues when Agent Control UI disconnects;
- reconnect to the same execution session without restarting the harness;
- retain bounded scrollback across detach/reconnect;
- expose execution-session lifecycle: starting, ready, busy, waiting, completed, failed, disconnected;
- read output without taking the control lease;
- send input only when authority + lease permit it;
- cleanly terminate an execution session;
- discover/recover surviving execution sessions after Agent Control restart;
- support local and SSH-reachable execution hosts;
- never make presentation/layout identity part of the Agent Control contract.

Capability examples (names subject to qualification):

```text
execution.session.pty
execution.session.persistent
execution.session.reconnect
execution.session.scrollback
execution.session.remote
execution.session.observe
execution.session.control
```

## POST-2.0 — Harness Recognition

Execution-session providers may observe which harness is running, but recognition is evidence, not authority.

- recognize supported harness process where possible;
- map observed process to `harness.*` capability;
- expose harness lifecycle independently from PTY lifecycle;
- tolerate unknown/custom harnesses;
- do not infer write/deploy authority from harness identity;
- preserve model/provider independence: a harness is not a model and a model is not a host.

## POST-2.0 — Durable Detach / Reattach

A lane should survive UI/client loss and, where possible, Agent Control restart.

- persist execution-session provider + opaque provider session ID in lane state;
- reconnect after UI restart;
- reconcile stale lease after controller failure;
- retain bounded output/scrollback evidence;
- detect process death separately from transport disconnection;
- allow human takeover without destroying the underlying session;
- checkpoint before destructive session actions.

## POST-2.0 — Multi-Lane Fan-Out

Support one contract spawning parallel lanes without conflating lanes with terminals.

- allocate one execution session per lane when required;
- optionally allocate isolated Git worktree per coding lane;
- acquire explicit worktree/repository leases;
- prevent two lanes mutating the same worktree accidentally;
- wait for lane/harness lifecycle transitions deterministically;
- compare/fuse results through Agent Control evidence rather than terminal text alone;
- release worktrees/sessions only after evidence and baton are durable.

## POST-2.0 — Worktree Isolation

For coding tasks:

- create isolated worktree from immutable base commit;
- record base SHA, head SHA and diff hash in baton/evidence;
- bind execution session to worktree path;
- prevent concurrent destructive reuse;
- retain failed worktree until evidence is captured;
- deterministic merge/promote gate outside the harness;
- cleanup only after accepted result or explicit abandonment.

## POST-2.0 — Agent-to-Agent Delegation

Do not implement delegation as blind terminal text forwarding.

- source lane emits structured delegation request;
- capability resolver selects destination resource/harness;
- authority resolver validates requested operation;
- destination receives contract subset + baton + evidence references;
- execution-session provider transports interaction if required;
- destination returns structured evidence/result;
- source can wait on lifecycle state without polling terminal prose;
- all handoffs retain trace ID and evidence identity.

## POST-2.0 — Execution Session Observability

Integrate with 2.0 distributed telemetry:

```text
session_create_ms
session_attach_ms
session_reconnect_ms
queue_wait_ms
harness_start_ms
first_output_ms
idle_wait_ms
time_to_first_action_ms
time_to_first_valid_result_ms
time_to_accepted_result_ms
scrollback_bytes
input_bytes
output_bytes
reconnect_count
```

Every execution-session event must carry Agent Control `traceId`, resource ID and lane ID where available. Provider-specific IDs are attributes, never primary Agent Control identity.

## POST-2.0 — UI

Agent Control remains the semantic UI even when another engine owns PTYs.

Each lane should display:

- lane ID/name;
- contract goal;
- selected resource(s);
- harness/model/provider separately;
- execution-session health;
- lease holder + observers;
- baton freshness;
- shared-task relationships;
- telemetry: queue, context, model/harness, tool, transport, handoff and accepted-result latency;
- clear detach/reconnect/restart state.

Presentation layout must remain replaceable. Do not encode terminal tabs/panes/windows into contracts.

## POST-2.0 — Provider Adapter

Build a provider adapter only after 2.0 stable qualification. The adapter must translate an external persistent-terminal API into Agent Control's `Execution Session Provider` interface.

Acceptance tests:

1. create session and run shell command;
2. start Codex and identify `harness.codex`;
3. detach UI while process continues;
4. reconnect and recover scrollback;
5. observer can read but cannot write;
6. lease holder can write;
7. human takeover transfers control without killing process;
8. Agent Control restart reconnects to surviving session;
9. SSH-hosted session behaves identically to local session;
10. two isolated coding lanes use separate worktrees/sessions;
11. baton handoff contains immutable diff/evidence identity;
12. provider failure is reported as degraded/offline resource, not silently replaced when resource lock forbids substitution;
13. telemetry captures create/attach/reconnect/accepted-result latency;
14. no provider-specific terminology appears in persisted contracts.

## 2.0 RC — Must complete before stable

- finish distributed telemetry instrumentation and tests;
- run full `npm run qualify:all` across current live topology;
- qualify Linux Codex on hpubuntu;
- qualify Windows ChatGPT bridge on MSI;
- qualify Pixel node/capability resolution;
- qualify Sentinel reachability/resource advertisement where configured;
- rotate exposed Pixel qualification credential;
- replace manual secret printing/handling with protected credential setup;
- supervise/persist Pixel node and hpubuntu transport without broadening network exposure;
- secret scan and diff review;
- clean clone/install/restart qualification;
- bind qualification evidence to exact release commit;
- update README/release notes;
- merge/tag only after zero unaccepted failures/skips in required release matrix.
