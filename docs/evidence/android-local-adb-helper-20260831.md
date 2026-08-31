# Android local ADB helper evidence — 2026-08-31

## Result

The original Termux-local ADB helper and governed Android-node integration are **IMPLEMENTED and deterministically verified**. Real-device ADB TLS qualification is **PENDING**.

## Deterministic evidence

- `android/adb-local.mjs` uses fixed `adb version`, `adb mdns services`, `adb devices -l`, `adb connect`, and `adb pair` invocations.
- Pairing accepts exactly six digits through stdin. The value is not an argument, configuration field, Work Queue result, or returned evidence field; command output and errors redact six-digit values.
- Discovery distinguishes pairing and connection service types, ignores non-local endpoints, rediscovers changed ports, retries within a fixed bound, and verifies success through `adb devices`.
- The Android node exposes only `android.adb.status` and `android.adb.ensure-connected`; it exposes neither pairing nor arbitrary ADB shell.
- `android.adb.local` and `transport.adb` are advertised only after a usable local device is observed.
- The boot hook may reconnect an existing pairing once within the helper's bound. It never initiates pairing, and failure cannot block SSH or node startup.
- Focused helper tests: 16 passed.
- Complete repository gate: 521 passed, 0 failed; TypeScript, bootstrap, dashboard, infrastructure-neutrality, and implementation-status checks passed.

## Physical-device observation

The configured Android resource was reachable through its existing non-interactive SSH transport and reported Node.js `v26.4.0`. The read-only check found that `adb` was not installed in Termux. A native Codex/Rust compilation was active, so no package installation, source deployment, node restart, disconnect, pairing ceremony, or other device mutation was attempted.

Real qualification therefore still requires a quiet device window, installation of the Termux `android-tools` package, explicit human pairing approval and transient PIN entry, followed by observed `adb devices` success, changed-port reconnect, duplicate reconnect, governed status evidence, and capability advertisement.

Android ADB TLS pairing/reconnection is distinct from Codex/Rust HTTPS/TLS runtime qualification. Neither result is evidence for the other.
