# Governed automatic visual evidence

Automatic visual evidence is a provider-neutral Job-lifecycle capability. The dashboard exposes `VIDEO EVIDENCE · OFF/ON`; its authenticated, same-origin policy endpoint controls whether visual Jobs attempt capture. Core recognises image, Blender, browser, desktop/computer-use and other visual-application task classes without naming a recording product.

The runtime defines a replaceable capture-provider port. A compatible provider must advertise supported task classes, video formats, overlay support, duration and byte limits. Agent Control supplies authoritative Job state for a restrained overlay: Job ID, task, stage, worker/provider, elapsed time, status and observation time. Capture records use immutable IDs, refuse overwrite, bind output to the Job ID, hash bytes, retain source hashes and record success, cancellation, timeout or failure.

`OFF`, capture unavailability and capture failure remain different states. Policy can permit continuation with an explicit limitation or require capture. Cancellation/failure finalisation calls the provider session and stores either captured bytes plus manifest or an explicit manifest-only limitation as a normal Job artifact.

## 4.17 candidate boundary

The core contract, dashboard control, authentication/origin checks, overlay derivation, immutable manifests and deterministic lifecycle tests are **IMPLEMENTED AND TESTED**. No real capture provider is registered in the shipped web startup, so no physical recording exists for this candidate. The asynchronous ledger binder also cannot yet make required-capture admission fail the Job before its operational action; it records/attempts capture after dispatch. Therefore automatic evidence is **NOT PHYSICALLY QUALIFIED** and required-capture enforcement is a release blocker. The dashboard toggle must not be interpreted as a production-ready recorder.

