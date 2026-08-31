#!/usr/bin/env node
import {spawn} from 'node:child_process';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

const PAIRING_SERVICE = '_adb-tls-pairing._tcp';
const CONNECT_SERVICE = '_adb-tls-connect._tcp';
const DEFAULT_TIMEOUT_MS = 8_000;

export function parseMdnsServices(text) {
  const services = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const type = line.includes(PAIRING_SERVICE) ? PAIRING_SERVICE : line.includes(CONNECT_SERVICE) ? CONNECT_SERVICE : undefined;
    if (!type) continue;
    const endpoint = line.match(/(?:\[[0-9a-f:]+\]|[^\s:]+):\d{1,5}\s*$/i)?.[0]?.trim();
    if (!endpoint || !validEndpoint(endpoint)) continue;
    services.push({type, endpoint, name: line.split(/\s+/)[0]});
  }
  return services.filter((service, index) => services.findIndex(candidate => candidate.type === service.type && candidate.endpoint === service.endpoint) === index);
}

export function parseDevices(text) {
  const devices = [];
  for (const raw of String(text ?? '').split(/\r?\n/).slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith('*')) continue;
    const [serial, state = 'unknown', ...detail] = line.split(/\s+/);
    if (serial) devices.push({serial, state, detail: detail.join(' ')});
  }
  return devices;
}

export function createAdbLocal({run = runCommand, wait = delay, attempts = 6, intervalMs = 500, localAddresses = hostAddresses()} = {}) {
  async function observe() {
    const version = await run('adb', ['version']);
    if (version.code !== 0) return unavailable(version);
    const [mdns, listed] = await Promise.all([run('adb', ['mdns', 'services']), run('adb', ['devices', '-l'])]);
    const observedServices = mdns.code === 0 ? parseMdnsServices(mdns.stdout) : [];
    const services = observedServices.filter(service => localAddresses.includes(endpointHost(service.endpoint)));
    const devices = listed.code === 0 ? parseDevices(listed.stdout) : [];
    const pairing = services.filter(service => service.type === PAIRING_SERVICE);
    const connect = services.filter(service => service.type === CONNECT_SERVICE);
    const usable = selectUsableDevice(devices, connect);
    return {
      schema: 'agent-control.android-adb-local/v1',
      adb: {available: true, version: firstMeaningfulLine(version.stdout), mdnsAvailable: mdns.code === 0},
      discovery: {pairing, connect, ignoredNonLocalServices: observedServices.length - services.length},
      devices,
      usableLocalDeviceConnected: Boolean(usable),
      connectionEndpoint: usable?.serial ?? null,
      state: usable ? 'connected' : pairing.length ? 'pairing-required' : connect.length ? 'disconnected' : 'undiscovered'
    };
  }

  async function discover() {
    const status = await observe();
    return {...status, operation: 'discover'};
  }

  async function ensureConnected() {
    let status = await observe();
    if (!status.adb.available) return {...status, operation: 'ensure-connected', ok: false, reason: 'adb-unavailable'};
    if (status.usableLocalDeviceConnected) return {...status, operation: 'ensure-connected', ok: true, action: 'already-connected'};
    const failures = [];
    for (let round = 0; round < attempts; round++) {
      for (const service of status.discovery.connect) {
        const connected = await run('adb', ['connect', service.endpoint]);
        if (connected.code !== 0) failures.push(safeMessage(connected));
        const verified = await observe();
        if (verified.usableLocalDeviceConnected) return {...verified, operation: 'ensure-connected', ok: true, action: 'connected'};
      }
      if (round + 1 < attempts) {
        await wait(intervalMs);
        status = await observe();
        if (status.usableLocalDeviceConnected) return {...status, operation: 'ensure-connected', ok: true, action: 'already-connected'};
      }
    }
    return {...status, operation: 'ensure-connected', ok: false, reason: status.discovery.pairing.length ? 'pairing-required' : 'connect-unavailable', failures: failures.slice(0, 4)};
  }

  async function pair(pin) {
    if (!/^\d{6}$/.test(String(pin ?? ''))) return {schema: 'agent-control.android-adb-local/v1', operation: 'pair', ok: false, reason: 'invalid-pairing-code'};
    const initial = await observe();
    if (!initial.adb.available) return {...initial, operation: 'pair', ok: false, reason: 'adb-unavailable'};
    if (initial.usableLocalDeviceConnected) return {...initial, operation: 'pair', ok: true, action: 'already-connected'};
    const endpoint = initial.discovery.pairing[0]?.endpoint;
    if (!endpoint) return {...initial, operation: 'pair', ok: false, reason: 'pairing-service-unavailable'};
    const paired = await run('adb', ['pair', endpoint], {input: `${pin}\n`, redact: pin});
    if (paired.code !== 0) return {...initial, operation: 'pair', ok: false, reason: 'pairing-failed', message: safeMessage(paired, pin)};
    await wait(intervalMs);
    const connected = await ensureConnected();
    if (!connected.ok) return {...connected, operation: 'pair', paired: true, ok: false, reason: 'pair-succeeded-connect-failed'};
    return {...connected, operation: 'pair', paired: true, ok: true, action: 'paired-and-connected'};
  }

  return {status: observe, discover, ensureConnected, pair};
}

function unavailable(result) {
  return {schema: 'agent-control.android-adb-local/v1', adb: {available: false, version: null, mdnsAvailable: false}, discovery: {pairing: [], connect: []}, devices: [], usableLocalDeviceConnected: false, connectionEndpoint: null, state: 'adb-unavailable', reason: result.code === 127 ? 'adb-not-installed' : 'adb-unavailable'};
}

function selectUsableDevice(devices, connectServices) {
  const usable = devices.filter(device => device.state === 'device');
  const endpoints = new Set(connectServices.map(service => service.endpoint));
  return usable.find(device => endpoints.has(device.serial)) ?? (usable.length === 1 && validEndpoint(usable[0].serial) ? usable[0] : undefined);
}

function validEndpoint(value) {
  const match = String(value).match(/^(?:\[[0-9a-f:]+\]|[^\s:]+):(\d{1,5})$/i);
  const port = Number(match?.[1]);
  return Boolean(match && port > 0 && port <= 65535);
}

function endpointHost(value) { return String(value).replace(/:\d{1,5}$/, '').replace(/^\[|\]$/g, '').split('%')[0]; }
function hostAddresses() {
  const addresses = ['127.0.0.1', '::1'];
  for (const entries of Object.values(os.networkInterfaces())) for (const entry of entries ?? []) if (entry.address) addresses.push(entry.address.split('%')[0]);
  return [...new Set(addresses)];
}

function firstMeaningfulLine(value) { return String(value ?? '').split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? null; }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function safeMessage(result, secret = '') {
  const value = firstMeaningfulLine(result.stderr) ?? firstMeaningfulLine(result.stdout) ?? `adb-exit-${result.code}`;
  return String(value).replaceAll(String(secret || '\0'), '[REDACTED]').replace(/\b\d{6}\b/g, '[REDACTED]').slice(0, 240);
}

export function runCommand(command, args, {input, redact = ''} = {}) {
  return new Promise(resolve => {
    let stdout = '', stderr = '', settled = false;
    const child = spawn(command, args, {stdio: ['pipe', 'pipe', 'pipe']});
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(124); }, DEFAULT_TIMEOUT_MS);
    const clean = value => String(value).replaceAll(String(redact || '\0'), '[REDACTED]').replace(/\b\d{6}\b/g, '[REDACTED]');
    const finish = code => { if (settled) return; settled = true; clearTimeout(timer); resolve({code, stdout: clean(stdout), stderr: clean(stderr)}); };
    child.stdout.on('data', chunk => { if (stdout.length < 1024 * 1024) stdout += chunk; });
    child.stderr.on('data', chunk => { if (stderr.length < 1024 * 1024) stderr += chunk; });
    child.on('error', error => { stderr = error.code === 'ENOENT' ? 'adb-not-installed' : error.message; finish(error.code === 'ENOENT' ? 127 : 1); });
    child.on('close', code => finish(code ?? 1));
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
  });
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] ?? 'status';
  const extra = argv.slice(1).filter(value => value !== '--json');
  const helper = createAdbLocal();
  let result;
  if (command === 'status' && extra.length === 0) result = await helper.status();
  else if (command === 'discover' && extra.length === 0) result = await helper.discover();
  else if (command === 'ensure-connected' && extra.length === 0) result = await helper.ensureConnected();
  else if (command === 'pair' && extra.length === 0) {
    let pin = '';
    for await (const chunk of process.stdin) pin += chunk;
    result = await helper.pair(pin.trim());
    pin = '';
  } else result = {schema: 'agent-control.android-adb-local/v1', ok: false, reason: 'usage', commands: ['status', 'discover', 'pair (PIN via stdin)', 'ensure-connected']};
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.ok === false) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
