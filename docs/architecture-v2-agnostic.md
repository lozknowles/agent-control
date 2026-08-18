# Agent Control 2.0 — Capability-Agnostic Architecture

## Freeze statement

Agent Control 2.0 schedules **capabilities**, not machines, models, providers or harnesses. Those are resources which may advertise capabilities and may be composed to satisfy a contract.

The durable work identity is the contract + baton. A currently running agent is a temporary resolution of capability requirements onto healthy resources.

```text
Contract + Baton
      |
      v
Capability Request
      |
      v
Capability Resolver
      |
      +-- host resource
      +-- harness resource
      +-- provider resource
      +-- model resource
      +-- transport resource
      +-- service/tool resource
```

## Non-negotiable abstractions

1. Capability is not host identity.
2. Capability is not model identity.
3. Capability is not provider identity.
4. Capability is not transport identity.
5. IP addresses are transient telemetry, never durable identity.
6. Stable logical/Tailscale names identify physical execution hosts where a host identity is needed.
7. hpubuntu is the initial control-plane core, not a special-case capability API.
8. A contract requests capabilities and policy constraints; it should not normally pin implementation resources.
9. A baton records work state and evidence, not dependence on a particular model conversation.
10. Substitution may replace any resource composition while preserving the contract/baton.

## Initial fleet

- `hpubuntu`: core Linux control-plane host; P5000 16 GB; Codex and local model harnesses.
- `sentinel`: Linux worker/failover; P3000 6 GB; suitable for resident smaller models and Codex.
- `MSI`: Windows execution resource; Codex, Edge and ChatGPT Window bridge capability.
- `pixel`: Android/mobile execution resource with Codex capability.
- `remote-api`: logical external/API execution class.

These descriptions bootstrap discovery only. The resolver consumes advertised capabilities and health rather than branching on these names.

## Capability namespaces

Capabilities use stable semantic identifiers, for example:

```text
skill.typescript
tool.shell
tool.git
tool.repository.write
harness.codex
provider.responses
compute.cuda
compute.gpu.vram-gb
transport.tailscale
location.local
```

A capability can carry typed attributes. For example `compute.gpu.vram-gb` can advertise `{ value: 16 }`; a contract may require `>= 6` without knowing which GPU or host supplies it.

## Resolution

A capability request has:

- required capabilities;
- preferred capabilities;
- policy constraints such as maximum cost, latency or local-only operation.

Only healthy resources are eligible. Missing required capabilities make a resolution non-runnable. Preferences rank otherwise valid compositions.

The first resolver is intentionally simple. Future optimisation can consider benchmark evidence, contention, leases, VRAM, energy, cost, latency, reliability, privacy, data locality and learned champion/challenger scores without changing the contract schema.

## Resource composition

A runnable worker may require several resources simultaneously. Example:

```text
request:
  skill.typescript
  tool.shell
  tool.git
  harness.codex

possible resolution:
  intelligence -> Qwen recipe
  shell/git    -> hpubuntu
  harness      -> Linux Codex
  transport    -> local
```

Another request may resolve to Windows Codex plus ChatGPT Window, or Sentinel plus a resident local model. The work does not change identity when the composition changes.

## Transport

Tailscale is a transport capability, not the fleet model. Agent Control should adopt useful Tailscale capabilities as they become available behind a transport adapter. Preferred secure transport can degrade to another explicitly permitted secure transport; it must never silently fall back to an insecure LAN path.

Raw IP addresses must not appear in contracts or batons. They may appear in discovery/health telemetry.

## Learning and qualification

Benchmarks qualify resource recipes against capabilities. The system should learn statements such as:

> recipe A is the current champion for `skill.typescript + tool.repository.write` under local/low-cost constraints

rather than globally declaring one model best.

New models, prompts, parameters, hosts and providers are challengers. Overnight successive-halving can test them cheaply, advance promising candidates, use holdouts, shadow current champions and promote reversibly.

## Self-substitution

An agent may conclude that its current composition is inadequate. It checkpoints the baton and requests capabilities, not a named replacement model. The resolver selects an eligible composition subject to policy/approval.

```text
current composition
      |
      | capability gap / poor confidence / resource pressure
      v
checkpoint baton
      |
      v
new capability request
      |
      v
resolver
      |
      v
replacement composition
```

This is the basis for model sacrifice/substitution, host migration and cross-platform baton passing.

## Compatibility

Existing host/provider registries remain useful as discovery inventories. In 2.0 they feed the capability/resource layer; they are no longer intended to be the scheduler's primary abstraction.

## Next implementation gates

1. Convert host/provider/model inventories into `Resource` advertisements.
2. Add capability requirements to contracts while retaining migration compatibility.
3. Add Tailscale hostname-based host discovery/health.
4. Display capability gaps and chosen resource composition in the TUI.
5. Route a real lane through the resolver.
6. Persist benchmark evidence by capability/recipe.
7. Exercise baton migration across hpubuntu, Sentinel, MSI, Pixel and API-backed resources.
