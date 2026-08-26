# Generic Android node and read-only NFC adapter qualification

Date: 2026-08-26 (Europe/London)

Branch: `integration/3.1-generic-android-nfc`

Implementation base: `7ea04fb34809c4520253b2892bfc40df461056f4`

Scope: read-only implementation/build/network qualification. No adapter was installed remotely, no NFC job was armed, no card was presented and no OMNIKEY comparison was attempted.

## Observed facts

- Agent Control discovered one peer whose structured overlay platform was Android. No hostname, device model, serial or address was configured or manually inserted.
- The supported non-direct-only overlay probe succeeded through DERP. Agent Control reported `TAILSCALE_RELAY_REACHABLE`, route `relay`, endpoint health unavailable and `agentControlCapable: false`.
- Because the authenticated typed endpoint was absent, the Worker Registry received no schedulable Android worker and the harmless `android.system.inspect` Run was `NOT_DISPATCHED`.
- NFC was not armed because no authenticated worker advertised both `device.nfc.reader` and `nfc.inspect.read_only`.
- The native Android source compiled with Android SDK 35 and Java 17. A forced, non-cached `testDebugUnitTest` passed 1/1 and `assembleDebug` produced an APK with SHA-256 `03dd4117c88314e1f2c07482c002f7eb5888d0a1bb339de7193cf61b6241ffac`.
- APK inspection showed only `android.permission.INTERNET` and `android.permission.NFC`, optional `android.hardware.nfc`, and no host-card-emulation service.
- Static NFC policy tests found no connect, transceive, authentication, write/format, arbitrary APDU or emulation primitive.
- The first complete Node test run executed 295 tests: 294 passed and one infrastructure-neutrality vocabulary check failed. Replacing the reserved word with the generic phrase `disable file` made the focused neutrality gate pass 3/3. After the safety-review regressions were added, the complete `npm run check` gate passed: TypeScript, bootstrap/shell syntax, dashboard syntax, neutrality, implementation-status consistency and 300/300 tests.

## Live evidence

The redacted qualification ran from 11:52:06Z to 11:52:07Z with an ephemeral controller token and without `--arm-nfc`.

```text
DISCOVER secure-overlay Android peers -> 1
NETWORK -> TAILSCALE_RELAY_REACHABLE
ENDPOINT -> unavailable
CAPABILITY_ADVERTISE -> not received
SCHEDULE diagnostic -> rejected because no capable worker
NFC -> NOT_ARMED
CARD -> not presented
```

The external mode-0600 JSON report hashes the peer/resource identities, contains no credential or raw overlay address, and records these provisional verdicts:

- `ANDROID_DISCOVERY_PASS`
- `ANDROID_AGENT_CONTROL_FAIL`
- `ANDROID_NODE_ADAPTER_PARTIAL`
- `DERP_REACHABILITY_FIXED`
- `INSUFFICIENT_EVIDENCE`

## Routing decision

The discovery lane ran on the controller because it owns the configured secure-overlay adapter. Agent Control did not route the diagnostic or NFC Actions to another available node: neither Action may run without a currently healthy Android typed-job worker, and the NFC Action additionally requires current NFC reader/read-only capabilities. This is the intended fail-closed capability placement result.

## Failures and retries

- Dependency installation with `npm ci` failed because this repository intentionally has no lockfile. An ignored link to an already installed dependency tree in another clean worktree was used for validation; it is not committed.
- The first native build used an incorrect SDK location and failed before compilation. The authorised build node's actual SDK location was discovered read-only and used only as a build environment value.
- The next native compile exposed Android's checked JSON exception and iterator API differences. The implementation was corrected and the real Gradle test/APK build then passed.
- The initial full Node test run exposed one reserved-vocabulary neutrality failure. The terminology was corrected without changing behavior, and the focused guard passed.
- A later Windows-to-Linux evidence sync removed the executable bit from three pre-existing tracked scripts, causing the package-entrypoint regression to fail before execution. Their original tracked modes were restored; the focused test and the complete 300-test gate then passed. No source behavior changed for this retry.

## Human approvals and boundary

No human approval was consumed. Installing/enabling the native adapter and supplying the matching session token require a deliberate human action on the Android device. `android.nfc.read-only` approval and physical card presentation remain future gates. No card identifier, NFC payload, credential, private topology or protected workload was collected or changed.

## Inferred conclusions

- DERP relay is now correctly usable for Android discovery because both regression fixtures and the live Agent Control discovery report it as reachable.
- The typed Android/NFC implementation is source- and build-qualified, but the remote device is not yet Agent Control capable. A live diagnostic, live NFC advertisement and `WAITING_FOR_CARD` proof require installation/enabling on that device.
- The OMNIKEY comparison is not ready to execute until the same authorised card can be independently presented to a live Android NFC worker and a suitable PC/SC worker.
