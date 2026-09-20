# Lean fresh-input analysis

## Native ten-task result

Baseline recorded 41,257 input tokens: 19,847 cached and 21,410 fresh. Lean recorded 26,772 input tokens: 4,715 cached and 22,057 fresh.

Lean reduced total input by 35.1%, yet **fresh input increased by 647 tokens (3.0%)** because provider cache reuse fell much more sharply. Calls fell from 15 to 13 and output from 479 to 455. Model elapsed fell only 1.6%; wall elapsed increased 0.02%. Both lanes were 0/10.

Per-task behaviour was not uniform. Lean MUT-001 was nearly fully cached, while Lean MUT-005, MUT-010 and MUT-012 processed materially more fresh input than baseline. This is why total input, cached input and fresh input must remain separate metrics.

## Cache-aware prototype

A stable-prefix/dynamic-tool-grant prototype was physically rerun on native Qwen. It increased cached input, but also increased total input, fresh input, output and elapsed time. It was rejected and reverted. See `CACHE-AWARE-LEAN-RUNTIME.md`.

No efficiency claim is made from failed tasks. Successful-task metrics are unavailable because neither lane produced a verified success.
