# Agent Control — one-hour live test slot

Goal: maximise real lifecycle and cross-platform evidence without changing credentials or destabilising known-good services.

## 0–5 min — sync and local gate

```bash
cd /fast/repos/agent-control
git pull --ff-only
npm run check
```

Record test count and `git rev-parse HEAD`.

## 5–15 min — TUI visual/control smoke

```bash
npm start
```

Check lane scrolling/focus, provider panel, PTY popup, pause/resume, and existing keyboard controls. Check any Work Queue / resource lifecycle additions present in this build. Quit cleanly with `q`.

## 15–30 min — Pixel degraded-node recovery

Precondition: do **not** change the Pixel token or SSH forward.

1. Prove Pixel `/health` and `/v2/resource` currently work through `127.0.0.1:18788`.
2. Stop only `node android/node-server.mjs` on Pixel via the authenticated SSH path.
3. Verify Tailscale and SSH remain reachable and the existing hpubuntu `18788` listener remains present.
4. Verify forwarded `/health` fails: this is `node-degraded`, not `offline`.
5. Exercise the allow-listed Pixel recovery path in manual/auto mode as implemented by the build.
6. Require node restart to reuse the existing forward; do not create a second tunnel.
7. Require `/health` and authenticated `/v2/resource` to recover.
8. Inspect telemetry for `resource.pixel.recovery` transitions.

Abort recovery testing if SSH identity or saved token is missing; do not generate replacements.

## 30–40 min — Windows lifecycle

Lock/unlock MSI or use the already-recovered session. Do not reload Edge first.

```bash
curl -sS http://127.0.0.1:8767/health | python3 -m json.tool
time curl -sS --max-time 60 http://127.0.0.1:8767/v1/responses -H 'content-type: application/json' -d '{"model":"chatgpt-window","input":"Reply exactly: TEST-TONIGHT-WINDOWS-PASS","stream":false}'
```

Correctness is pass/fail; latency is an observation. A correct response over 10 seconds is SLOW, not unavailable.

## 40–50 min — Work Queue integration

Exercise queue fixtures/simulation if present: priority ordering, dependency blocking, persistence/restart, preemption, homogeneous batching, item-by-item commit, quiet-period/resource budgets, human-review routing, telemetry snapshot/decision events. Confirm queue state survives process restart without replaying completed items.

## 50–60 min — full live qualification and evidence

Ensure existing environment variables are loaded, then:

```bash
npm run qualify
npx tsx scripts/telemetry-report.ts
git status --short
git rev-parse HEAD
```

Expected live gates: local suite; hpubuntu Codex; Pixel health and capability resolution; Windows advertised health and functional roundtrip; Sentinel. Windows latency may report `SLOW` while qualification remains PASS.

Do not commit `.agent-control/`, `qualification-results/`, `node_modules/`, tokens, `.env` files, private keys, or raw credentials. Do not tag/merge stable unless all live functional gates pass.
