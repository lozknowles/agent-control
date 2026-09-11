# Agent Control 4.5 project-memory portability qualification

Status: **EXPERIMENTAL — STORAGE PORTABILITY PROVEN; MODEL MATRIX INCOMPLETE**

This record belongs to the isolated 4.5 feature branch. It authorizes no merge,
tag, release, deployment, or replacement of existing memory mechanisms.

## Discovered topology

- hpubuntu vault: `/home/loz/knowledge-vault`; local Git repository at
  `2fb8c8b25cdbe2afa82612990d403c9aa5405029`, with no configured remote and only
  bootstrap content at discovery.
- MSI experiment vault: `D:\obsidian\knowledge_vault`; registered in Obsidian,
  six files at discovery and no Git repository.
- MSI separately registered `C:\Users\Loz\OneDrive\Documents\loz`; it is a
  Git-backed OneDrive vault at `51e99a2fd694fcb9ece32113542701646bf0888f` with
  remote `lozknowles/lawrence-shared-memory`. It was not used or modified.

The authoritative experiment namespace is isolated as
`Agent Control/4.5-memory-portability` on each participating vault.

## Deterministic implementation evidence

`MarkdownProjectMemoryPort` is substrate-neutral: it writes structured Markdown
with an integrity-bound metadata envelope, exclusive writer lock, owner-only
temporary file and atomic rename. Retrieval applies project/repository/session
scope, provenance, verification, expiry, supersession and contradiction gates
before bounded lexical ranking. Tests prove current retrieval, stale/candidate/
foreign-scope rejection, contradiction fail-closed behaviour and explicit
supersession.

## Physical storage transfer

The hpubuntu adapter wrote and retrieved two real project records. It considered
two candidates, accepted two, injected 246 bytes (62 estimated tokens), reported
no conflicts or rejections, and retained evidence bindings. The records were
copied unchanged to MSI's isolated vault namespace and rehashed there:

| Record | Source and MSI SHA-256 | Bytes |
| --- | --- | ---: |
| `ac45-memory-topology.md` | `f897f4e05a527f3049e107e2dcce664230891382a6ad310640b60b5390931dc2` | 1,035 |
| `ac45-objective.md` | `5a65da87bb85989a52947d3f857bc82999c1b3c3366bd0ad3b277a2b8697deac` | 956 |

This proves byte-identical Markdown-memory portability from hpubuntu to MSI. It
does **not** yet prove governed model continuation, writer quality, reader
quality, or the reverse transfer. The copy used a bounded authenticated SSH/SCP
qualification operation; a production cross-node memory synchronization Action
has not been implemented and is not claimed.

## Phase 9 availability gate

The currently running POE configuration exposes one controller-local Codex
Luna route. Historical evidence names additional models, but historical
availability is not treated as current qualification. No current configuration
in this experiment has yet established all required GLM-5.3-Flash, local Qwen,
Codex/MSI, Sol, Pixel 8 Pro and Google/Gemini E4B routes. Consequently no
writer/reader matrix cell, assistant-only comparison, cross-node continuation,
cold-agent reconstruction, or strong-model consolidation result is claimed.

## Verdict

**EXPERIMENTAL**

The common schema and byte-identical cross-node storage pass justify continuing
the experiment. Adoption requires a governed synchronization Action and fresh
physical writer/reader Work Parcels for each reported matrix cell, including
POE/video evidence and independent scoring.
