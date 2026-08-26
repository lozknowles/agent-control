# OpenVoice V2 local-worker qualification evidence

Date: 2026-08-26  
Capability: `audio.openvoice-v2-governed`  
Status: `PARTIAL`  
Agent Control Run: `run-123a09db-7a35-4c30-8a8a-c8dc2a2b4e61`

## Result

The manual-only `openvoice-v2-install-qualify@1.0.0` Job completed all six
steps: protected-workload preflight, approved isolated installation, CPU-first
qualification, bounded GPU qualification, comparison, and repository hygiene.
The Run ledger status is `SUCCEEDED` and its external evidence root is:

`/fast/qualification/openvoice-v2-20260826T185118Z`

The capability remains `PARTIAL`, not `QUALIFIED`, because the reference was an
authorised synthetic British-English fixture and no independent human listening
or real-person speaker-similarity assessment was performed.

## Provenance

- OpenVoice commit: `74a1d147b17a8c3092dd5430504bd83ef6c7eb23`
- MeloTTS commit: `209145371cff8fc3bd60d7be902ea69cbdb7965a`
- Agent Control commit observed by the Run:
  `3eb263e19ec8b7d059fb1bef07ba69daa9af347e`
- Python: 3.9.23 in `/fast/venvs/openvoice-v2-py39`
- PyTorch / torchaudio: 2.5.1+cu121 / 2.5.1+cu121
- GPU: Quadro P5000, compute capability 6.1, driver 580.173.02
- System CUDA 12.0 and the NVIDIA driver were not changed.

## Objective measurements

| Measure | CPU | GPU |
| --- | ---: | ---: |
| Mean generation time | 14.778 s | 2.068 s |
| Mean real-time factor | 2.988 | 0.444 |
| Per-sentence ASR WER | 0, 0, 0.0714 | 0, 0, 0.0714 |
| Watermark decoded | 3/3 | 3/3 |
| Clipped fraction | 0 for all | 0 for all |
| Internal embedding cosine range | 0.8461-0.8693 | 0.8564-0.8796 |

The GPU Run proved a live CUDA tensor on device capability 6.1. The resource
guard sampled 1,550 MiB peak new VRAM and 8,489 MiB peak total. The finer process
monitor recorded a 1,646 MiB process peak, 8,585 MiB peak total and at least
7,682 MiB free. The internal embedding cosine is not an independent or
subjective similarity verdict.

## Protected-workload evidence

The final preflight and guarded steps observed these running user services:

- `cartoon-collingham-kokoro-gpu.service`
- `lincoln-course-match-ocr.service`
- `llama-coder.service`
- `llama-server.service`
- `localwalks-imageid-staging-api.service`
- `localwalks-imageid-staging-worker.service`
- `localwalks-imageid.service`

All remained present; both llama health responses were unchanged and healthy.
No matching OASIS process or unit was observed. No protected workload was
stopped, restarted, reconfigured, or displaced.

## Exposure and retention

The Gradio UI was smoke-tested transiently on `127.0.0.1:17861`, proved to be a
loopback-only socket, then stopped and verified closed. No resident service,
public listener, reverse proxy, schedule, or Gradio share link was enabled.

Agent Control artifacts contain JSON only. Synthetic reference/output audio and
all model/checkpoint files remain outside Git. Repository hygiene passed with no
tracked or untracked audio, embeddings, models, keys, credential patterns,
public default binds, or Gradio sharing.
