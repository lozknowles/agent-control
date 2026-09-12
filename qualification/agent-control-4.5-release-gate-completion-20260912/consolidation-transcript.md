# Agent Control 4.5 memory conditions and consolidation

This record contains real provider invocations through Agent Control adapters. It does not claim access to proprietary ChatGPT personal memory.

## A–D conditions

- A. Bounded current context only: 45.45% reconstruction; 446 tokens; 3745 ms; limitation: Codex CLI does not expose ChatGPT product personal memory as a controllable input; authoritative task context is used and no proprietary-memory claim is made.
- B. Agent Control Your Memories with Obsidian backend only: 72.73% reconstruction; 903 tokens; 6356 ms
- C. Current context plus Agent Control Your Memories/Obsidian: 90.91% reconstruction; 1138 tokens; 6523 ms
- D. Deliberately cold plus Agent Control Your Memories/Obsidian: 72.73% reconstruction; 907 tokens; 7028 ms

Conflict surfaced: **YES**.

## Strong-model consolidation

- Consolidator: GPT-5.6 Sol
- Source memories: memory-glm-to-qwen.md, memory-qwen-to-glm.md
- Source bytes: 3020
- Consolidated bytes: 1435
- Consolidated SHA-256: 723614450ddf94d9089fa188654ca48707048dc381b7827fb05769f1333000dc
- Original average score: 86.37%
- Consolidated average score: 90.91%
- Delta: 4.54 points
- Consolidation tokens: 8967
- Monetary cost: unavailable (unavailable)

- qwen / original-cheap: 81.82% · 1352 tokens · 8258 ms
- qwen / sol-consolidated: 90.91% · 889 tokens · 8562 ms
- sol / original-cheap: 90.91% · 8989 tokens · 0 ms
- sol / sol-consolidated: 90.91% · 8515 tokens · 0 ms
