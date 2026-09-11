# Agent Control 4.5 energy-aware intelligence

Status: **experimental**. Agent Control optimises for correct, independently verified outcomes. Energy is an additional governed measurement and routing dimension; it never overrides capability, policy, quality, confidence, privacy, or verification.

The first comparable physical specialist study disproved an energy saving for
the qualified route-intent adapter on the measured controller. Warm Qwen used 20.426 J per
verified result, the retained specialist used 22.674 J, the cold specialist used
85.673 J, and the real ProjectMemoryPort variant used 85.865 J. Deterministic
zero-LLM routing used 0.121 J. See the [physical specialist-energy evidence](evidence/agent-control-4.5-specialist-energy-qualification-20260911.md).

The intended hierarchy is:

`Remember → Retrieve → Reuse → Specialist → Small Generalist → Strong Generalist → Premium Reasoner`

## Measurement contract

`EnergyTelemetryRuntime` stores node baselines, timestamped execution samples, scope, method, authority, limitations, and sealed execution records. Supported scopes distinguish whole-node, GPU-board-only, CPU-package, device-battery, and provider-unknown observations. Trapezoidal integration produces gross Wh; incremental Wh subtracts only a matching node/scope idle baseline. Joules, Wh/token, and Wh/success are emitted only when their inputs exist.

`MEASURED`, `DERIVED`, `ESTIMATED`, and `UNAVAILABLE` are distinct. GPU board power is never relabelled as whole-system power. Cloud/provider energy remains unknown unless the provider supplies a qualified measurement.

## Governed routing

Energy-aware candidate assessment considers capability, qualification, quality, confidence, latency, monetary cost, expected energy, locality, privacy, and memory affinity. Expected total energy includes the observed probability and energy of a failed cheap attempt followed by fallback. A tiny but unreliable model therefore cannot win merely because one inference is inexpensive.

Unknown energy is neutral and visibly marked; it is not assigned a manufactured advantage. Specialist training break-even is calculated only when training, baseline-success, and specialist-success energy are all available and the specialist has a positive measured saving.

## Physical result, 2026-09-11

The initial probe below established authoritative Quadro P5000 board-power
telemetry. A subsequent privileged qualification established a common
measured-component boundary using Intel package + DRAM RAPL and NVIDIA board
power. That boundary is not whole-node power and excludes motherboard, storage,
PSU losses, displays, networking, and peripherals.

| Measurement | Result |
| --- | ---: |
| GPU idle baseline | 4.845 W |
| Invocation average GPU power | 52.224 W |
| Invocation peak GPU power | 75.9 W |
| Incremental GPU energy | 0.005922 Wh / 21.320 J |
| Energy per token | 0.000111742 Wh |
| Whole-node energy | UNKNOWN |

The later 75-run comparison showed that the qualified 135M route-intent
specialist was correct but consumed more energy than warm Qwen in both cold-load
and retained-process modes. Real bounded ProjectMemoryPort retrieval did not
produce a saving. Training consumed 5,232.820 incremental measured-component
joules and there is no positive break-even because the per-result saving is
negative. The 4.5 power-aware release gate is therefore **not met**.

Reproduce the bounded sensor/provider probe with:

```bash
npm run qualify:energy-efficiency
npm run qualify:specialist-energy
```

`poeEnergyDigest` provides the human-readable operator result. It reports
measured J/Wh and scope, or `UNAVAILABLE`; it never labels estimated or
incomparable savings as measured. A physical POE-initiated Work Parcel selected
the deterministic route, executed it, and passed a separate exact verifier; see
the [complete transcript](evidence/agent-control-4.5-power-aware-poe-transcript-20260911.md).

It does not stop, unload, suspend, or reconfigure any model or machine.
