# Agent Control 4.5 specialist-energy qualification — 2026-09-11

## Verdict

`DISPROVEN_FOR_CURRENT_ROUTE — POWER-AWARE RELEASE GATE NOT MET`

Agent Control can measure and govern energy, but this experiment did **not**
show that the qualified 135M route-intent specialist uses less electricity than
the warm Qwen 2.5 3B service. The negative result is retained. No merge, tag,
release, deployment, or specialist admission follows from it.

## Frozen task boundary

The experiment selected three disjoint held-out intents from the frozen 4.5
route-intent evaluation set. They are genuine controller operations rather than
new toy prompts:

| Intent | Exact held-out request | Expected result | Why repetitive |
|---|---|---|---|
| release review | `Please review the repository release notes using read-only evidence.` | `LANE_REVIEW` | repeated read-only release/evidence triage |
| provider verification | `Please verify the provider route against frozen criteria.` | `LANE_VERIFY` | repeated qualification and acceptance-gate classification |
| telemetry research | `Please research the dashboard telemetry without changing systems.` | `LANE_RESEARCH` | repeated non-mutating investigation routing |

They test one narrow learned capability with three intents; they are not three
independently trained specialists. Train, validation, and held-out qualification
partitions remained separate.

## Physical boundary

- Node: `hpubuntu`; Intel package + DRAM RAPL and NVIDIA GPU board power.
- Authority: `MEASURED`.
- Excluded: motherboard, storage, PSU losses, displays, networking, and
  peripherals. Shared GPU processes were present.
- Common 75-run idle baseline: 14.174 W.
- Repetitions: five per intent and route, 75 executions total.
- Correctness: exact deterministic lane verifier; only correct results count in
  joules per verified success.

Bounded remote checks did not establish usable measurement/model paths on
Sentinel, MSI, or Pixel, so no cross-hardware ranking is claimed. MiniCPM5-2B
was not present locally and was not downloaded or silently substituted.

## Leaderboard

| Route | Model | Hardware | Memory | Verified | Median J | J/success | Mean time | Tokens |
|---|---|---|---|---:|---:|---:|---:|---:|
| deterministic | route-policy-v1 | hpubuntu | no | 15/15 | 0.177 | 0.121 | 64.7 ms | 0 |
| general | Qwen 2.5 3B Q4_K_M, warm llama.cpp | hpubuntu/P5000 | no | 15/15 | 20.497 | 20.426 | 341.7 ms | 1,025 |
| specialist, retained process | SmolLM2-135M + LoRA | hpubuntu/CPU | no | 15/15 | unavailable | 22.674 | 759.1 ms inference | 1,065 |
| specialist, cold load | SmolLM2-135M + LoRA | hpubuntu/CPU | no | 15/15 | 89.683 | 85.673 | 5,742.2 ms | 1,065 |
| specialist + Your Memories | SmolLM2-135M + LoRA | hpubuntu/CPU | yes | 15/15 | 88.843 | 85.865 | 6,017.1 ms | 1,685 |
| untrained small model | SmolLM2-135M | hpubuntu/CPU | no | 0/15 | unavailable | unavailable | 5,453.3 ms | 1,115 |

The retained-process specialist consumed 340.108 incremental measured-component
joules for 15 correct results. It narrows the cold-load penalty but remains
about 11% above warm Qwen.

## Real Your Memories comparison

A follow-up used the production `MarkdownProjectMemoryPort`, not a prompt-only
hint. Each run performed bounded validated retrieval inside the measured process
boundary, accepted the exact memory for its held-out intent, invoked the
specialist, and applied the independent verifier. All 15 runs passed.

- Without memory: 85.673 J per verified result.
- With ProjectMemoryPort: 85.865 J per verified result.
- Measured benefit: none. Baselines were close but not identical (14.174 W and
  15.121 W), so the small +0.192 J/result difference is not claimed as a precise
  memory penalty.

The defensible conclusion is only that this run found no energy saving from
memory. Retrieval remained advisory and did not bypass verification.

## Training and break-even

The same frozen four-epoch CPU LoRA command was rerun solely for energy
measurement. It used the same model revision, configuration, and governed
dataset; its nondeterministic artifact bytes are not represented as the
originally qualified adapter.

- Duration: 177.809 s (`Trainer` elapsed 172.805 s).
- CPU package: 6,177.62 J; DRAM: 629.96 J; GPU board: 945.574 J.
- Gross measured components: 7,753.154 J.
- Incremental after idle baseline: 5,232.820 J = 1.453561 Wh.

There is no positive break-even because both cold and retained specialist
inference consumed more measured energy per correct result than Qwen.

## Expected energy and POE route

- failed specialist then Qwen: 106.099 J to verified completion;
- Qwen immediately: 20.426 J;
- avoidable escalation cost: 85.673 J.

The governed route evidence therefore selects deterministic execution for
supported requests and Qwen immediately when deterministic capability is
absent. It must not force an inferior specialist for a favourable demo.

POE then initiated a real approved Work Parcel from the exact human-readable
request, and the ordinary route → execute → independent-verifier stages all
succeeded. Governed evidence selected `deterministic / route-policy-v1`, measured
0.101 J in the same component scope, and reported a 99.5% reduction against the
20.426 J general-model baseline. The three stage batons and run identities are
retained in the linked JSON. This is the honest successful production path; it
does not pretend that the specialist won.

The POE digest reports PASS/FAIL, route, measured J/Wh and scope, baseline,
memory, and escalation. It reports a reduction only when execution and baseline
are comparable measurements.

## Evidence

- 75-run JSON SHA-256: `7bd91efae1424afc491d6084c66ece9a9ab474c5ff7efc633674f0c836afaf4b`
- route-decision JSON SHA-256: `80967b6802ba878e36f1a9bc002eb5f70059da0a0e22fa2c25e21889be27f354`
- ProjectMemoryPort 15-run JSON SHA-256: `5fecbd6ef0e89bb5186fd1f4bfd77f982c3f0be9ec4eafaa18c9b8c03a588f48`
- POE Work Parcel JSON SHA-256: `2b629f1dadc54b9f0280f54c29e8329ee4787b647658983a3ea5bc55e1ace009`
- [Complete POE transcript](agent-control-4.5-power-aware-poe-transcript-20260911.md)
  SHA-256: `690277c757ec1ec30b6cc49ef2c4f6a7cc8b689606504210aaa48f2b2bb22dfd`
- Reproduce with `npm run qualify:specialist-energy` on a node with qualified
  RAPL and NVIDIA telemetry.
- Raw measurements are preserved outside Git under
  `/fast/qualification/agent-control-4.5-specialist-energy-20260911-raw/` and
  `/fast/qualification/agent-control-4.5-specialist-memory-energy-20260911-r3/`.

The cross-model Your Memories matrix remains **5/12**. Pixel contract and MSI
authentication findings remain open and are not altered by this experiment.

## Release decision

The required positive production-representative specialist workflow was not
demonstrated. Energy-aware intelligence remains experimental and Agent Control
4.5 is not release-ready on this gate.
