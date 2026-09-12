# MiniCPM5-2B Q4_K_M qualification closure

Status: **FAILED and completed** on 2026-09-12. This record preserves, rather than replaces, the original run at commit `47a8be1fc006f90080d4d2ae19de0390e7018ef4` and the follow-up at `20764851091ba4c8cd58a76bde8e3fd74ecc0545`.

The exact configuration is `openbmb/MiniCPM5-2B-GGUF` revision `d00c954e5f9a0f2605468f24703ffa7e5cb0c492`, file `MiniCPM5-2B-Q4_K_M.gguf`, SHA-256 `ec2d5801640099e97d8d7e8003ad4d81f336e757811f03a26173dddf386602fd`, run with llama.cpp `0.4.0-dev` revision `311d4211bf1611ff7ca6b67035a4a07c79766efc`. The complete machine, runtime, performance, memory and evidence inventory is in the adjacent [closure manifest](../../qualification/minicpm5-2b-q4-k-m-20260912/manifest.json); the existing qualification store consumes the adjacent [model qualification record](../../qualification/minicpm5-2b-q4-k-m-20260912/model-qualification.json).

Governed code repair remained 0/3 on hpubuntu GPU and 0/1 for the comparable sentinel seed. The original CPU result remained 0/3. Known-good patch and scripted real-path controls passed, disproving the suspected shared harness defect. The final model status is therefore `FAILED`; `governed-code-repair` is explicitly failed and every other role remains unqualified unless independently tested later. The record identifies one exact model revision, artifact hash, quantisation and runtime. It does not blacklist the MiniCPM family.

Reusable integration consists of live authority fencing, cancellation propagation, retention of failed-attempt evidence, a generic scripted real-path control, stronger between-tool assertions, and an adapter-backed Linux/NVIDIA process resource sampler whose results flow into the existing model-intelligence resource fields. The model-specific follow-up controller and circular-result snapshot remain qualification evidence and are not production framework code.

The live controller contained no current model-intelligence ledger or queued qualification batch. A filesystem inventory found only the completed historical NVIDIA tournament ledger at `/fast/qualification/agent-control-3.9-nvidia-tournament-20260906/state-attempt-2/models/intelligence.json` (`PARTIAL`, completed 2026-09-06). No new candidate was started because no current candidate was queued or separately authorised.

Production routing was not changed. This integration branch is for review only; merge, release, deployment and routing activation remain outside this work.
