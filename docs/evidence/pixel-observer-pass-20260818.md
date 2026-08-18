# Pixel Observer Proof — PASS — 2026-08-18

Release: `2.0.0-pixel-alpha.1`
Resource identity: `pixel`
Physical device: Google Pixel 8 Pro (`husky`)
Android: 17 / API 37

## Discovered capability advertisement

The on-device probe reported:

- `platform.android`
- `device.physical`
- `harness.termux`
- `harness.codex`
- `observe.android.logcat`

It did **not** claim unproven `transport.adb`, `transport.tailscale`, or `privilege.shizuku`.

## Manual logcat proof

`logcat -d -t 20` returned genuine Android log events including UI/window events, buffer activity, and SELinux audit records. A Termux SELinux denial was visible for `{ search }` against `shell_test_data_file` while enforcing (`permissive=0`).

## Codex observer proof

Codex running locally on the physical Pixel was instructed to perform a read-only diagnostic test. It correctly identified:

- Google Pixel 8 Pro (`husky`)
- Android 17
- API 37

It read and summarized recent logcat events, identified the Termux SELinux denial, reported its commands, stated that it made no modifications, and terminated with the required sentinel:

`PIXEL-OBSERVER-PASS`

Commands reported by Pixel Codex:

```text
getprop ro.product.manufacturer
getprop ro.product.model
getprop ro.product.device
getprop ro.build.version.release
getprop ro.build.version.sdk
logcat -d -t 30 -v threadtime
```

## Verdict

PASS: a physical Android resource can run Codex locally and satisfy a read-only Android observation capability through Termux/logcat. This is the first proven non-hpubuntu physical execution/observation resource for Agent Control 2.0.

This proof does not imply generic Android privilege, root, ADB transport, Tailscale CLI availability, or Shizuku capability.
