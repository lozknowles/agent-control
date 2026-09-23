# CLEAN_MACHINE_INSTALL release qualification

This is a repeatable physical qualification procedure, not a mock bootstrap test.

1. Restore the retained pristine Ubuntu snapshot into a disposable guest disk. Preserve earlier raw evidence. Inventory OS/kernel, allocations, packages and executable absence. Verify no Agent Control checkout/state, Node/npm, model, provider credentials, GPU passthrough or external harness.
2. Install only documented prerequisites and record package changes. Verify the Node distribution checksum. Transfer a Git bundle of the exact candidate with its hash and verify the resulting checkout commit.
3. Run the documented bootstrap check/install unchanged. Run doctor, start core through the normal entry point, verify HTTP/dashboard and empty model/provider inventory.
4. Invoke normal FIRST_RUN discovery without a bypass, fake nvidia-smi or manual restart. Verify completion and continuing core health.
5. Create and approve the normal operator-system-observation Work Parcel/Job using product APIs. Record admission, selected worker, execution, independent verification, artifacts and terminal status.
6. Stop the disposable guest and restore the same pristine snapshot. Repeat steps 1–5 independently. Compare pristine package inventories and retain both successes and failures.
7. Stop the test service/VM, verify listener/process cleanup, retain the snapshot and owner-only raw evidence, and export a sanitized bundle with source, command, result and artifact hashes.

Both clean runs must pass before claiming the clean-machine installation gate. A passing archived Job fixture, skipped discovery, restarted crashed core, or preconfigured developer machine does not satisfy this suite.
