# OSWorld qualification plan

Classification: **DEFERRED_FOR_FULL_QUALIFICATION**

No OSWorld score was produced.

## Official current boundary

The current recommended release is OSWorld 2.1. A comparable run must keep the OSWorld code, gated task classes, task assets, self-hosted mocked websites, and provider image on the same pinned release. Floating `main` or `latest` references are not comparable. Official sources: [OSWorld-V2](https://github.com/xlang-ai/OSWorld-V2), [benchmark release contract](https://github.com/xlang-ai/OSWorld-V2/tree/main/benchmark_releases), and [OSWorld 2.0 paper](https://arxiv.org/abs/2606.29537).

## Required environment

- OSWorld-V2 code at tag `osworld-v2.1`; Python 3.12+ and `uv sync --frozen`.
- Gated `xlangai/osworld_v2_tasks@osworld-v2.1` task classes and `xlangai/osworld_v2_assets_gated@osworld-v2.1` assets.
- Public runtime assets and self-hosted `Task-Web/OSWorld-web@osworld-v2.1`.
- Pinned Docker Ubuntu image on a Linux/KVM host, or a pinned AWS image with separately authorized spend.
- Private self-hosted GitLab and token for GitLab-backed tasks if included.

## Method

1. Obtain legitimate gated-dataset access and freeze every official component digest.
2. Provision a clean official provider image; record CPU, RAM, GPU, storage, host identity, and image digest.
3. Implement a narrow Agent Control runner adapter without changing tasks, setup, evaluator, rewards, timeouts, or assets.
4. Freeze the underlying Computer Use model/runtime and Agent Control revision separately.
5. Run an official smoke subset selected before results, then a held-out bounded subset. Preserve every failure and do not rerun only failures under changed prompts.
6. Use the official fine-grained evaluator and model-based checks. Report Agent Control orchestration separately from underlying model capability.
7. Retain task IDs, release manifest, environment logs, action traces, observations, evaluator outputs, costs, retries, human intervention, and SHA-256 manifest.

## Contamination controls

Gated task implementations and evaluator logic must never be placed in the agent prompt or searchable working context. Benchmark websites and assets must match the release manifest. Baseline, tuning, and held-out qualification results remain separate. Human intervention invalidates autonomous qualification for that attempt.

## Compute and cost

Exact compute and monetary cost are not yet established because no official image/provider or underlying Computer Use model has been selected. Local hardware time and energy must remain separate from API/cloud charge. AWS provisioning or other paid infrastructure requires explicit spend authority.

## Current blockers

- Gated OSWorld 2.1 tasks/assets have not been obtained.
- No pinned official Docker/KVM or AWS evaluation environment has been provisioned.
- Mocked websites and optional GitLab are not deployed.
- The currently qualified providers cover only limited browser/native text-entry tasks, not the 108 long-horizon OSWorld 2.0 workflows.
- No compliant Agent Control OSWorld runner has been exercised.

These blockers make `READY_FOR_QUALIFICATION` and any OSWorld score unjustified.
