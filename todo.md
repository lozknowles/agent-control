# MiniCPM5 closure and Agent Control 4.5 integration TODO

- [x] Preserve the original FAILED qualification at `47a8be1fc006f90080d4d2ae19de0390e7018ef4` and the separately identified follow-up at `20764851091ba4c8cd58a76bde8e3fd74ecc0545`.
- [x] Reverify the follow-up report, recording and slim-pack hashes against `MiniCPM5-followup-SHA256SUMS.txt` without modifying either run.
- [x] Record the exact MiniCPM5-2B Q4_K_M configuration and final FAILED result in the existing version-1 model qualification store format.
- [x] Add an isolated routing proof that the exact failed configuration cannot enter governed code repair and that the result does not apply to a MiniCPM-family sibling.
- [x] Base integration on clean Agent Control 4.5 release-gate completion commit `5bd72802b6525a1ccce05df2a42be2e04c456d67`, preserving later skill-learning, Morrow/crew and unrelated work.
- [x] Port the platform-neutral live authority, cancellation and failed-attempt retention fixes from the original remediation.
- [x] Integrate process RAM/GPU allocation measurement behind a Linux/NVIDIA adapter and persist attributed results through the existing invocation and model-intelligence schemas.
- [x] Preserve scripted harness controls separately from model scores and strengthen the between-tool cancellation regression at the actual dispatch boundary.
- [x] Run focused tests, full tests, typecheck and required Agent Control 4.5 release-gate verifiers on the integrated branch (240/240 focused; 1,251/1,251 full; both 4.5 evidence verifiers passed).
- [x] Commit and push the isolated integration branch for review.

Qualification queue: no current ledger or queued batch was found on the live controller. The only discovered ledger is a completed historical NVIDIA tournament; no new model candidate is authorised by current queue state.

Out of scope: repeat MiniCPM testing without a changed-variable hypothesis; production routing changes; merging; tagging; releasing; deployment.
