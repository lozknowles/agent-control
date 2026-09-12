# Agent Control 4.5 source-distribution remediation

Date: 2026-09-12  
Status: **SOURCE REWRITE COMPLETE; CLEAN-MOTO BOOTSTRAP DEFECT UNDER REMEDIATION**
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

The first clean Moto attempt after separation also transferred 5.89 MiB and produced a 20,168,738-byte checkout. The exact candidate and source-distribution check passed, as did bootstrap `--check`. Bootstrap `--install` then stopped during first configuration creation with `EACCES` because the Moto's F2FS/Termux environment permits owner-only file creation but denies hard links. This is a separate portable-bootstrap defect, not a recurrence of the repository packaging defect. A bounded physical primitive probe confirmed that exclusive copy is supported. The generic initializer now falls back from an unsupported hard link to `COPYFILE_EXCL`, retaining create-if-absent and no-overwrite semantics; focused and full validation plus a clean Moto restart remain required.

## Remaining acceptance work

1. Validate the portable create-if-absent fallback without weakening overwrite protection.
2. Publish the revised candidate and restart from a clean Moto checkout.
3. Repeat the documented full clone and bootstrap with no shallow/partial workaround.
4. Record the final installation result before resuming the broader Moto discovery qualification.

This report does not authorize or claim the `v4.5.0` release.
