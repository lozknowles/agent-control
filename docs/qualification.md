# Qualification

Run the local release gate first:

```bash
npm run check
npm run qualify
```

The harness always runs the local gate. It then reads the same configuration used by the control plane and performs only non-mutating health checks for configured services, resources and providers. Missing configuration is recorded as `SKIP configured-infrastructure`, not replaced by private defaults.

Optional SSH checks are explicit:

```bash
AGENT_CONTROL_REMOTE_CHECKS='worker-a|operator@worker-a.example|echo AGENT-CONTROL-REMOTE-PASS' npm run qualify
```

Results are timestamped JSON in ignored `qualification-results/`. A configured endpoint is not considered functionally qualified unless the relevant live proof has run and its exact identity/evidence is retained. Source support, configured availability and live qualification are separate claims.

Android qualification uses dynamic secure-overlay discovery from `androidDiscovery`; it does not require a statically named Android resource. Set the configured credential environment variable and first run the harmless discovery/diagnostic proof:

```bash
AGENT_CONTROL_CONFIG=/path/to/config.json \
AGENT_CONTROL_ANDROID_NODE_TOKEN='supplied out of band' \
npm run qualify:android-node
```

The evidence separates `OFFLINE`, Tailscale direct/DERP reachability, endpoint reachability and authenticated Agent Control capability. A successful overlay ping alone does not dispatch a Job. The JSON report hashes peer/resource identifiers and is written mode 0600.

Do not add `--arm-nfc` until the authenticated Android advertisement genuinely contains `device.nfc.reader` and `nfc.inspect.read_only` and the operator has approved a read-only physical presentation. When armed, the Job must visibly reach `WAITING_FOR_CARD`; cancellation or timeout disables reader mode. No card result may be claimed unless a human actually presents an authorised card and the result schema validates.

Build qualification for the native adapter is separate from live qualification:

```bash
cd android/native-adapter
./gradlew testDebugUnitTest assembleDebug
```

A successful build proves neither installation nor remote controllability. See [`android-node-adapter.md`](android-node-adapter.md) and [`android-node-security.md`](android-node-security.md).
