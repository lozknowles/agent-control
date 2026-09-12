# Agent Control 4.5 source-distribution remediation

Date: 2026-09-12  
Status: **PASS — SOURCE DISTRIBUTION REMEDIATION PHYSICALLY QUALIFIED**
Release status: `v4.5.0` remains paused.

## Qualification-discovered defect

A clean Android 15 / Termux installation followed the published full-clone command. Two normal clones each transferred approximately 263.26 MiB and terminated without a usable `HEAD`, refs or working tree. A bounded `--filter=blob:none --no-checkout` diagnostic completed with a 708 KiB object store, proving transport and repository reachability, but it was explicitly rejected as an installation workaround.

The all-ref repository audit found:

- 4,448 blobs totalling 399,581,425 uncompressed bytes;
- 934 heavyweight evidence objects totalling 322,819,534 bytes;
- 217 historical media/archive blobs totalling 273,401,453 bytes;
- 891 historical `qualification/` blobs totalling 320,030,691 bytes;
- a normal Git pack of approximately 264 MiB.

The pre-remediation candidate tree contained 1,367 files / 217,001,674 bytes. Its evidence paths alone accounted for approximately 205 MiB. This is a product packaging/distribution defect, not an Android Git defect.

## Evidence preservation

Nothing was silently discarded. The public [source-separation evidence release](https://github.com/lozknowles/agent-control-qualification-evidence/releases/tag/source-separation-20260912) preserves:

- a complete 276,056,956-byte pre-rewrite Git bundle, SHA-256 `6bca20655d2296d032dfadacbc28fc1cf9e3989891a176f482d9eab82577b15b`;
- a 184,885,992-byte archive containing 417 heavyweight files from source candidate `146ba9d2699ca9e1570762dea01e9b84da9374a8`, SHA-256 `1704b027da092e6e8511893079b0f62145b2589e7a11dc0da27578fae9b54634`;
- a per-file path/size/Git-blob/SHA-256 manifest, SHA-256 `a49ec8370ac887047652967c1ddbbebd891f5e67d70741145344292e4c3092f2`;
- the five original README screenshots as individually addressable release assets.

All large assets were downloaded back from the public release and passed SHA-256 verification. `git bundle verify` confirmed that the pre-separation bundle records complete history.

## Product remediation

The source tree now retains code, documentation, schemas/configuration, tests, product documentation PDFs, lightweight deterministic fixtures and small evidence summaries/references. Complete qualification working trees and dashboard evidence media are external. Three oversized JSON records are represented by small immutable archive pointers. The exact MiniCPM failure remains enforced through a sanitized lightweight routing-denial fixture; its full physical evidence remains external.

`npm run check:distribution` enforces the boundary. The current staged source tree is 1,018 files / 13,614,736 bytes, and `npm pack --dry-run` reports a 2,898,896-byte package / 13,613,627-byte unpacked package.

## Validation

The first complete run truthfully exposed one test that directly loaded a qualification-tree file. That dependency was replaced by the minimal immutable source fixture described above. Focused MiniCPM, neutrality, distribution and Markdown-link checks then passed.

The full rerun passed **1,325/1,325** tests, together with TypeScript, bootstrap syntax, dashboard syntax, infrastructure neutrality, implementation status, source-distribution policy, Markdown local links and `git diff --check`.

The public source history was then rewritten with complete old/new commit and ref maps. A normal GitHub clone transferred 5.89 MiB, completed in 1.70 seconds and occupied 20,167,828 bytes including `.git`. The rewritten 4.5 candidate has the same tree identity as the pre-rewrite remediation commit: `77308f24ae786f531b845e9325c90d727707b102`. A fresh checkout of that history again passed **1,325/1,325** tests.

The first clean Moto attempt after separation also transferred 5.89 MiB and produced a 20,168,738-byte checkout. The exact candidate and source-distribution check passed, as did bootstrap `--check`. Bootstrap `--install` then stopped during first configuration creation with `EACCES` because the Moto's F2FS/Termux environment permits owner-only file creation but denies hard links. This is a separate portable-bootstrap defect, not a recurrence of the repository packaging defect. A bounded physical primitive probe confirmed that exclusive copy is supported. The generic initializer now falls back from an unsupported hard link to `COPYFILE_EXCL`, retaining create-if-absent and no-overwrite semantics.

A second genuinely clean Moto attempt used the normal documented full clone, with no shallow or partial-clone option. It transferred 5.89 MiB, produced a 20,177,876-byte checkout before dependencies and a 89,311,442-byte checkout after dependency installation, passed bootstrap `--check`, and passed bootstrap `--install`. The generated configuration was schema-valid, owner-only (`0600`) and retained SHA-256 `150339fe5eb80186f31118958346c9e3066e943be066790ce497bb08f1562060`.

The complete device regression then exposed a second portability defect: Node identifies Termux as platform `android`, so owned execution selected the conservative portable cleanup adapter even though Android supplies the required procfs identity and POSIX process-group semantics. Timeouts therefore retained workers and locks as `CLEANUP_UNCERTAIN`. A bounded physical probe proved detached process-group identity and negative-PID termination on the Moto. Agent Control now selects its procfs/process-group adapter for both `linux` and `android`; the direct-child and descendant timeout qualifications both pass physically. The run also exposed a timing-sensitive heartbeat test whose early assertion could leave its fixture operation pending. That test now waits for the semantic event and releases its fixture in `finally`; production heartbeat behaviour is unchanged.

The first complete post-fix Moto suite produced 1,325 passes, two failures and one platform-inapplicable skip. Both failures were test portability assumptions rather than accepted product failures: a WATCH_ONLY policy test unnecessarily requested a Linux PTY, and a policy-root test assumed `/var` exists. The tests now exercise the same semantic contracts using the portable pipe boundary and a real temporary sibling policy root. Both focused tests passed on the controller and Moto.

The final acceptance attempt started again from an absent checkout and followed the documented full-clone procedure without `--depth`, `--filter` or sparse checkout. Git reported 5.93 MiB received; the exact resulting pack was 6,215,934 bytes plus a 194,888-byte index. The pre-install checkout occupied 20,215,937 bytes, was non-shallow, and selected implementation candidate `413f8d3e572e0e777076a79177262493c603d592` / tree `eee988bbccdbc16a453904f4be63762af2760122`. Source-distribution validation passed with 1,019 tracked files / 13,625,136 bytes and no violation.

Bootstrap `--check` passed. Bootstrap `--install` created dependencies without a lockfile and created a schema-valid `0600` configuration. A second install returned `UNCHANGED_EMPTY`; configuration SHA-256 remained `150339fe5eb80186f31118958346c9e3066e943be066790ce497bb08f1562060`. The installed checkout occupied 89,349,503 bytes. The checkout remained clean and `git fsck --full --no-dangling` passed.

The exact candidate passed the complete controller validation with **1,328/1,328** tests and the complete Moto Android/Termux validation with **1,327 passes, zero failures and one platform-inapplicable Linux-PTY skip out of 1,328 tests**. TypeScript, bootstrap and dashboard syntax, infrastructure neutrality, implementation status and source-distribution policy passed in both complete runs where applicable. The final controller log SHA-256 is `58c080a4af6693c1b5786347f79e054e5b1da7fe7fc048b0182e18cdb251f5bc`; the final Moto log SHA-256 is `cadcf1bd3af6d4880dbf6ac923e4eef4d139357b6c8b0c0e9773f81861482af2`.

## Acceptance result

The packaging/distribution acceptance test is complete. An ordinary user no longer downloads historical heavyweight qualification evidence through a normal clone, while the complete original history and evidence remain externally preserved with immutable hashes and public provenance. The normal documented Moto installation path succeeds without a shallow or partial-clone workaround.

The compact machine-readable result is [`agent-control-4.5-virgin-moto-install-20260912.json`](agent-control-4.5-virgin-moto-install-20260912.json). Full logs are preserved as assets on the public source-separation evidence release rather than added to normal Agent Control source clones.

This report does not authorize or claim the `v4.5.0` release.
