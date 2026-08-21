#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { reconcileOwnedEntries } from './owned-processes.mjs';

const root = process.cwd();
const stateDir = path.resolve(process.env.AGENT_CONTROL_STATE_DIR || '.agent-control');
const runDir = path.join(stateDir, 'run');
const manifestFile = path.join(runDir, 'owned-processes.json');
fs.mkdirSync(runDir, { recursive: true });

const mode = process.argv[2] || 'status';
const pixelUser = process.env.AGENT_CONTROL_PIXEL_USER || 'u0_a438';
const pixelHost = process.env.AGENT_CONTROL_PIXEL_HOST || 'pixel-8-pro';
const pixelPort = process.env.AGENT_CONTROL_PIXEL_SSH_PORT || '8022';
const pixelKey = process.env.AGENT_CONTROL_PIXEL_KEY || path.join(process.env.HOME || '', '.ssh/agent-control-pixel');
const pixelRepo = process.env.AGENT_CONTROL_PIXEL_REPO || '$HOME/agent-control-2';

const services = [
  { id: 'llama-8080', port: 8080, health: 'http://127.0.0.1:8080/health' },
  { id: 'llama-8081', port: 8081, health: 'http://127.0.0.1:8081/health' },
  { id: 'chatgpt-bridge', port: 8766, health: 'http://127.0.0.1:8766/' },
  { id: 'chatgpt-adapter', port: 8767, health: 'http://127.0.0.1:8767/health' },
  { id: 'pixel-forward', port: 18788, health: 'http://127.0.0.1:18788/health' },
];

function owned() {
  try { return JSON.parse(fs.readFileSync(manifestFile, 'utf8')); }
  catch { return []; }
}

function reconcileOwned() {
  const entries = owned();
  const reconciled = reconcileOwnedEntries(entries, { isAlive: pid => { try { process.kill(pid, 0); return true; } catch { return false; } }, terminate: pid => { try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} } } });
  if (reconciled.length !== entries.length) save(reconciled);
  return reconciled;
}

function reapOwnedForward(list, actions) {
  const index = list.findIndex(entry => entry.id === 'pixel-forward');
  if (index < 0) return false;
  const entry = list[index];
  try { process.kill(-entry.pid, 'SIGTERM'); actions.push({ id: 'pixel-forward', action: 'reap-stale', pid: entry.pid, status: 'stopped-owned-unhealthy-forward' }); }
  catch { actions.push({ id: 'pixel-forward', action: 'reap-stale', pid: entry.pid, status: 'owned-forward-already-gone' }); }
  list.splice(index, 1); save(list); return true;
}

function save(items) {
  fs.writeFileSync(manifestFile, JSON.stringify(items, null, 2) + '\n', { mode: 0o600 });
}

async function http(url, ms = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.setTimeout(700, () => { socket.destroy(); resolve(false); });
  });
}

async function inspect(service) {
  const health = await http(service.health);
  return { ...service, healthy: health.ok, httpStatus: health.status, portOpen: await portOpen(service.port) };
}

function sh(command, timeout = 10000) {
  return spawnSync('/bin/bash', ['-lc', command], { encoding: 'utf8', timeout });
}

function pixelSsh(command, timeout = 10000) {
  return spawnSync('ssh', [
    '-i', pixelKey,
    '-o', 'PasswordAuthentication=no',
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=5',
    '-p', pixelPort,
    `${pixelUser}@${pixelHost}`,
    command,
  ], { encoding: 'utf8', timeout });
}

function discoverUnit(port) {
  const names = sh("systemctl --user list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}'")
    .stdout.trim().split(/\n/).filter(Boolean);
  for (const name of names) {
    const text = sh(`systemctl --user cat ${JSON.stringify(name)} 2>/dev/null`).stdout;
    if (new RegExp(`(^|[^0-9])${port}([^0-9]|$)`).test(text)) return name;
  }
  return null;
}

async function waitHealthy(id, tries = 20) {
  const service = services.find(item => item.id === id);
  for (let i = 0; i < tries; i++) {
    if ((await inspect(service)).healthy) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function pixelLifecycle() {
  const forward = await inspect(services.find(item => item.id === 'pixel-forward'));
  if (forward.healthy) return { state: 'FORWARD-READY', detail: 'forwarded Pixel health ready', forward };

  const tailscale = sh(`tailscale ping -c 1 ${pixelHost}`, 4000);
  if (tailscale.status !== 0) return { state: 'OFFLINE', detail: 'Tailscale unreachable', forward };

  const ssh = pixelSsh('echo SSH-READY', 7000);
  if (ssh.status !== 0) {
    return {
      state: 'SSH-OFFLINE',
      detail: 'Tailscale reachable; Termux SSH :8022 unavailable',
      forward,
      sshError: (ssh.stderr || '').trim() || undefined,
    };
  }

  const node = pixelSsh('curl -fsS --max-time 2 http://127.0.0.1:8788/health >/dev/null', 5000);
  if (node.status !== 0) return { state: 'NODE-DEGRADED', detail: 'SSH ready; Pixel node unavailable', forward };
  return { state: 'NODE-READY', detail: 'Pixel node ready; local forward unavailable', forward };
}

async function ensurePixel(actions, list) {
  const lifecycle = await pixelLifecycle();

  if (lifecycle.state === 'FORWARD-READY') {
    actions.push({ id: 'pixel-forward', action: 'reuse', status: 'healthy' });
    return;
  }

  if (lifecycle.forward.portOpen) {
    if (!reapOwnedForward(list, actions)) { actions.push({ id: 'pixel-forward', action: 'leave', status: 'port-occupied-unhealthy-unowned' }); return; }
    await new Promise(resolve => setTimeout(resolve, 500));
    lifecycle = await pixelLifecycle();
  }

  if (lifecycle.state === 'OFFLINE') {
    actions.push({ id: 'pixel-transport', action: 'manual', status: 'tailscale-offline' });
    return;
  }

  if (lifecycle.state === 'SSH-OFFLINE') {
    actions.push({
      id: 'pixel-transport',
      action: 'manual',
      status: 'ssh-offline',
      detail: lifecycle.detail,
      stderr: lifecycle.sshError,
      remedy: 'install/enable Termux:Boot hook via android/install-boot.sh',
    });
    return;
  }

  if (lifecycle.state === 'NODE-DEGRADED') {
    const tokenFile = path.join(process.env.HOME || '', '.config/agent-control/pixel-node-token');
    if (!fs.existsSync(tokenFile)) {
      actions.push({ id: 'pixel-node', action: 'manual', status: 'token-missing' });
      return;
    }

    const token64 = Buffer.from(fs.readFileSync(tokenFile, 'utf8').trim()).toString('base64');
    const start = `cd ${pixelRepo} || exit 20; export AGENT_CONTROL_NODE_TOKEN="$(printf '%s' '${token64}' | base64 -d)"; if curl -fsS --max-time 2 http://127.0.0.1:8788/health >/dev/null 2>&1; then exit 0; fi; setsid ./android/start-node.sh > "$HOME/.agent-control-pixel-node.log" 2>&1 < /dev/null & exit 0`;
    const sent = pixelSsh(start);
    actions.push({
      id: 'pixel-node',
      action: 'recover',
      status: sent.status === 0 ? 'start-sent' : `start-command-failed:${sent.status}`,
      stderr: (sent.stderr || '').trim() || undefined,
    });

    let healthy = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (pixelSsh('curl -fsS --max-time 2 http://127.0.0.1:8788/health >/dev/null', 4000).status === 0) {
        healthy = true;
        break;
      }
    }

    if (!healthy) {
      const diag = pixelSsh(`printf 'process='; ps -A -o pid,args | grep '[n]ode android/node-server.mjs' || true; printf '\\nlog='; tail -8 "$HOME/.agent-control-pixel-node.log" 2>/dev/null || true`, 5000);
      actions.push({
        id: 'pixel-forward',
        action: 'manual',
        status: 'node-not-healthy',
        diagnostic: (diag.stdout || '').trim() || undefined,
      });
      return;
    }
  } else {
    actions.push({ id: 'pixel-node', action: 'reuse', status: 'healthy' });
  }

  const child = spawn('ssh', [
    '-N',
    '-i', pixelKey,
    '-o', 'PasswordAuthentication=no',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-p', pixelPort,
    '-L', '18788:127.0.0.1:8788',
    `${pixelUser}@${pixelHost}`,
  ], { detached: true, stdio: 'ignore' });

  child.unref();
  list.push({ id: 'pixel-forward', pid: child.pid, startedAt: new Date().toISOString(), command: 'qualified Pixel SSH forward' });
  save(list);
  actions.push({ id: 'pixel-forward', action: 'start', status: await waitHealthy('pixel-forward') ? 'healthy-after-start' : 'start-not-yet-healthy' });
}

async function status() {
  const rows = [];
  for (const service of services) rows.push(await inspect(service));
  const pixel = await pixelLifecycle();
  const sentinel = sh('tailscale ping -c 1 sentinel', 4000);
  const ready = rows.every(item => item.healthy) && sentinel.status === 0;

  return {
    schema: 'agent-control.bootstrap/v3',
    at: new Date().toISOString(),
    result: ready ? 'READY' : 'DEGRADED',
    ready: `${rows.filter(item => item.healthy).length}/${rows.length}`,
    services: rows,
    pixel: { state: pixel.state, detail: pixel.detail, sshError: pixel.sshError },
    sentinelReachable: sentinel.status === 0,
    owned: reconcileOwned(),
  };
}

async function up() {
  const list = reconcileOwned();
  const actions = [];

  for (const port of [8080, 8081]) {
    const service = services.find(item => item.port === port);
    const current = await inspect(service);
    if (current.healthy) {
      actions.push({ id: service.id, action: 'reuse', status: 'healthy' });
      continue;
    }
    if (current.portOpen) {
      actions.push({ id: service.id, action: 'leave', status: 'port-occupied-unhealthy' });
      continue;
    }
    const unit = discoverUnit(port);
    if (!unit) {
      actions.push({ id: service.id, action: 'manual', status: 'no-matching-systemd-unit' });
      continue;
    }
    const result = sh(`systemctl --user start ${JSON.stringify(unit)}`);
    actions.push({
      id: service.id,
      action: 'systemd-start',
      unit,
      status: result.status === 0 && await waitHealthy(service.id) ? 'healthy-after-start' : `failed:${(result.stderr || '').trim()}`,
    });
  }

  for (const id of ['chatgpt-bridge', 'chatgpt-adapter']) {
    const service = services.find(item => item.id === id);
    const current = await inspect(service);
    actions.push({
      id,
      action: current.healthy ? 'reuse' : 'manual',
      status: current.healthy ? 'healthy' : current.portOpen ? 'port-occupied-unhealthy' : 'external-service-not-running',
    });
  }

  await ensurePixel(actions, list);
  return { actions, status: await status() };
}

async function down() {
  const list = reconcileOwned();
  const actions = [];
  for (const entry of list) {
    try {
      process.kill(-entry.pid, 'SIGTERM');
      actions.push({ id: entry.id, pid: entry.pid, action: 'stopped' });
    } catch {
      actions.push({ id: entry.id, pid: entry.pid, action: 'already-gone' });
    }
  }
  save([]);
  return { actions, status: await status() };
}

const result = mode === 'up' ? await up() : mode === 'down' ? await down() : mode === 'status' ? await status() : null;
if (!result) {
  console.error('usage: control-plane.mjs up|status|down');
  process.exit(2);
}
console.log(JSON.stringify(result, null, 2));
if (result.status?.result) console.log(`RESULT ${result.status.result} ${result.status.ready}`);
else if (result.result) console.log(`RESULT ${result.result} ${result.ready}`);
