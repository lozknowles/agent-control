# I Started Building an AI Agent Dashboard. It Turned Into a Distributed Control Plane

> Source article draft for later editing/publication. Preserve technical evidence and update final qualification results before publication.

Agent Control began with a fairly ordinary problem: I had several AI coding agents and several computers, and I wanted somewhere sensible to see what they were doing.

The machines weren't particularly exotic: a Linux workstation with a 16GB NVIDIA GPU, another Linux machine with a smaller GPU, a Windows laptop, a Pixel phone, and access to cloud AI when required.

What became apparent surprisingly quickly was that **machines were the wrong abstraction**.

Neither were models.

And, eventually, neither were agents.

## The original idea: lanes of work

The first design was visual. I wanted several scrollable lanes showing concurrent work. Each lane needed automatic/manual mode, priority, model selection and the ability to pause.

Then came the awkward questions.

What happens when two lanes collaborate? What happens when another model takes over? What happens after a reboot? What does the next agent actually need to know?

That produced the **Baton**: durable structured state describing progress, evidence, changes, hypotheses, next action and unresolved questions. A baton could survive the agent that created it.

That was the first clue that the model wasn't really the unit of work.

## Capabilities aren't machines

Initially it was tempting to encode decisions such as: "Run coding on hpubuntu."

But that becomes brittle immediately. Perhaps hpubuntu is busy. Perhaps Sentinel is idle. Perhaps Codex is available on the Pixel. Perhaps a remote API is temporarily the best choice.

So Agent Control 2.0 moved to capability requests.

Instead of `use Pixel`, a contract can request:

```text
platform.android
device.physical
harness.codex
observe.android.logcat
```

Resources advertise capabilities and the resolver selects an appropriate combination.

We proved this on a physical Pixel 8 Pro. Agent Control made the semantic request above, discovered the Pixel and returned:

```text
resources: ["pixel"]
missing: []
```

It then executed the permitted Android observation operation and received real `logcat` output. The contract never contained the phone's IP address, Android codename or physical location.

That distinction became one of the project's fundamental rules:

> **Capabilities are not machines, and capabilities are not models.**

## Capability isn't authority either

The Pixel test produced an even more important result.

The Pixel node advertised:

```text
platform.android
device.physical
harness.termux
harness.codex
observe.android.logcat
```

We authenticated to it through an Agent Control node transported over SSH and Tailscale.

An authorised request for `android.observe.logs` succeeded. Then we deliberately requested `android.execute.shell`.

The same authenticated connection received:

```text
HTTP 403 Forbidden
capability_not_authorized
```

That became the second major rule:

> **Being able to do something does not mean an agent is authorised to do it.**

Even authentication isn't authority. And neither is intelligence. An LLM can recommend an operation. It doesn't get to decide whether it has permission to perform it.

## Trust became several separate questions

By this point the architecture was naturally separating into four questions:

```text
CAN IT?       Capability
MAY IT?       Authority
DID IT?       Evidence
HOW WELL?     Telemetry
```

Those shouldn't be collapsed into one vague concept called "agent trust".

A highly reliable agent might still have no production-write authority. An authorised operation might fail. A successful operation might have evidence tied to an obsolete source commit. A resource might technically support a capability but currently be unavailable.

Keeping these dimensions separate turned out to be extremely useful.

## The real-world test we didn't plan

Then I went to Newark.

I had my Pixel with me. The computers were at home.

Using Tailscale and SSH from the phone, I connected to the Agent Control core running on the Linux workstation and ran the new distributed qualification harness.

The results were:

```text
hpubuntu code/tests       PASS
hpubuntu Linux Codex      PASS
Sentinel                  PASS
Windows bridge attached   PASS
Windows actual AI work    FAIL
Pixel                     SKIPPED
```

The interesting one was Windows.

The Windows laptop was locked.

Its browser extension and bridge remained connected, so the health endpoint happily reported adapter, bridge, browser and ChatGPT as attached. But an actual ChatGPT request failed.

That exposed another bad abstraction:

> **Connected does not mean available.**

We changed qualification to test both **advertised health** and **functional readiness**.

With the laptop locked, a real off-site qualification produced:

```text
Windows advertised health
PASS — 0.001 seconds

Windows functional readiness
FAIL — 10.003 seconds
```

The ten seconds are deliberate. Functional readiness is now bounded so a dead interactive provider cannot stall scheduling for 90 seconds.

When the laptop is unlocked, we'll run exactly the same qualification again. No configuration change should be necessary. If functional readiness succeeds, the resource simply becomes eligible again.

That's a much more realistic test than mocking `windowsAvailable = false`.

## Fail closed

Another principle emerged from all this. Agent Control shouldn't invent success to keep orchestration moving.

We've already observed:

```text
wrong credential                  -> 401
authenticated but forbidden       -> 403
browser relay failure             -> 502
provider unavailable              -> 503
missing capability                -> unresolved
locked interactive provider       -> readiness failure
```

These aren't inconvenient errors to hide. They're information the scheduler needs.

## 61 tests and counting

By the current 2.0 freeze, the local suite has grown to:

```text
61 tests
61 passed
0 failed
0 skipped
```

Those tests now cover considerably more than the original terminal dashboard: contracts, leases, baton transfer, capability resolution, provider health, PTY ownership, remote nodes, telemetry and resource-aware work scheduling.

The cross-platform qualification harness adds real infrastructure. A baseline run on the core proves the code and Linux Codex. An armed run can additionally exercise Windows, Pixel and Sentinel.

Every run gets a trace ID and JSON evidence rather than relying on somebody remembering that "it worked last Tuesday."

## Latency is part of the architecture

Measuring only model inference time isn't terribly useful in a distributed agent system.

Agent Control now distinguishes or is being instrumented to distinguish:

```text
queue wait
capability resolution
transport
context preparation
time to first output
model execution
tool execution
handoff
time to valid result
time to accepted result
```

Agent Control 2.0 uses distributed trace IDs/spans and percentile summaries so later qualification can compare p50, p95 and maximum latency.

A small local model that answers in three seconds but needs four retries may be slower at completing useful work than a larger model that takes twelve seconds and succeeds first time.

The metric that increasingly matters is:

> **time to accepted result**

## From agents to work

That leads naturally to the next stage.

Not everything Agent Control schedules needs to be an AI conversation.

Imagine photographs arriving throughout the day. Rather than processing each immediately, repetitive work can enter a Work Queue, wait for spare capacity, form compatible batches, execute on an appropriate resource and checkpoint progress.

Interactive work can pre-empt background processing. The background batch checkpoints and resumes later.

The scheduler can consider priority, deadline, privacy, data locality, resource utilisation and whether work is batchable or interruptible.

The same mechanism can eventually schedule:

```text
AI inference
OCR
image processing
test suites
indexing
research
transcoding
backup verification
coding agents
```

Again, the Work Item asks for capabilities. It doesn't care which named computer satisfies them.

## Existing projects are useful without surrendering the abstraction

We've also looked at existing projects with good ideas around persistent terminal sessions, reconnecting to running agents, real PTYs and parallel coding environments.

Rather than adopting another project's terminology throughout Agent Control, we've defined the concept as an **Execution Session Provider**.

That allows a mature terminal engine to potentially sit underneath Agent Control later:

```text
Agent Control
  contracts
  capabilities
  authority
  leases
  batons
  evidence
  telemetry
       |
       v
Execution Session Provider
       |
       v
persistent PTY implementation
       |
       v
Codex / Claude / Qwen / ...
```

Agent Control doesn't need to become another terminal multiplexer.

Its interesting job is deciding **what should execute, where it should execute, whether it may execute, and whether we can trust the result**.

## Where Agent Control 2.0 currently stands

The current release candidate is deliberately frozen while qualification finishes.

We've proven Linux Codex locally, physical Android/Codex observation, authenticated remote Pixel execution, deny-by-default authority, Windows ChatGPT browser integration, Sentinel remote execution, capability-selected work and off-site control through Tailscale.

There is still deliberately boring work before calling it stable: credential lifecycle, supervised connections, complete telemetry qualification, clean-install/restart testing, secret scanning and a final full-platform run.

That's intentional.

The project started as a way to watch several AI agents.

The more interesting thing it may be becoming is:

> **a trust-aware distributed execution fabric where agents, models, machines and APIs are replaceable resources rather than the architecture itself.**

And that feels like a considerably more useful problem to solve.

---

## Publication TODO

Before publishing externally:

- add the unlocked-MSI recovery result;
- add the final Agent Control 2.0 qualification commit/tag and final test count;
- verify all performance numbers against stored qualification evidence;
- decide how much hardware/network detail to disclose publicly;
- add one architecture diagram suitable for Medium;
- add screenshots of the lane UI only if they reflect the released build;
- link the public repository/release once 2.0 is stable;
- final editorial pass for readers unfamiliar with the project.
