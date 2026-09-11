# Agent Control 4.5 energy-aware intelligence

Status: **experimental**. Agent Control optimises for correct, independently verified outcomes. Energy is an additional governed measurement and routing dimension; it never overrides capability, policy, quality, confidence, privacy, or verification.

The intended hierarchy is:

`Remember → Retrieve → Reuse → Specialist → Small Generalist → Strong Generalist → Premium Reasoner`

## Measurement contract

`EnergyTelemetryRuntime` stores node baselines, timestamped execution samples, scope, method, authority, limitations, and sealed execution records. Supported scopes distinguish whole-node, GPU-board-only, CPU-package, device-battery, and provider-unknown observations. Trapezoidal integration produces gross Wh; incremental Wh subtracts only a matching node/scope idle baseline. Joules, Wh/token, and Wh/success are emitted only when their inputs exist.

`MEASURED`, `DERIVED`, `ESTIMATED`, and `UNAVAILABLE` are distinct. GPU board power is never relabelled as whole-system power. Cloud/provider energy remains unknown unless the provider supplies a qualified measurement.

## Governed routing

Energy-aware candidate assessment considers capability, qualification, quality, confidence, latency, monetary cost, expected energy, locality, privacy, and memory affinity. Expected total energy includes the observed probability and energy of a failed cheap attempt followed by fallback. A tiny but unreliable model therefore cannot win merely because one inference is inexpensive.

Unknown energy is neutral and visibly marked; it is not assigned a manufactured advantage. Specialist training break-even is calculated only when training, baseline-success, and specialist-success energy are all available and the specialist has a positive measured saving.

## Physical result, 2026-09-11

The controller exposed authoritative Quadro P5000 board-power telemetry through `nvidia-smi`, but no readable CPU package or whole-system energy counter. A bounded real Qwen route-intent invocation returned HTTP 200, used 53 tokens, and passed its deterministic lane verifier.

| Measurement | Result |
| --- | ---: |
| GPU idle baseline | 4.845 W |
| Invocation average GPU power | 52.224 W |
| Invocation peak GPU power | 75.9 W |
| Incremental GPU energy | 0.005922 Wh / 21.320 J |
| Energy per token | 0.000111742 Wh |
| Whole-node energy | UNKNOWN |

The already-qualified 135M route-intent specialist executes on CPU. Because CPU and whole-node energy were unavailable, the experiment cannot truthfully prove that specialist + memory has lower total energy than the general-model baseline, or calculate its training break-even. The 4.5 power-aware success criterion is therefore **PARTIAL**, pending a qualified whole-system meter or CPU package energy source and a same-task Work Parcel comparison.

Reproduce the bounded sensor/provider probe with:

```bash
npm run qualify:energy-efficiency
```

It does not stop, unload, suspend, or reconfigure any model or machine.
