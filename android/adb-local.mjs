#!/usr/bin/env node
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const PAIRING_SERVICE = '_adb-tls-pairing._tcp';
const CONNECT_SERVICE = '_adb-tls-connect._tcp';
const RESULT_SCHEMA = 'agent-control.android-adb-local/v1';
const STATE_SCHEMA = 'agent-control.android-adb-attempt/v1';
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_STALE_MS = 120_000;

export function parseMdnsServices(text) {
  const services = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const type = line.includes(PAIRING_SERVICE) ? PAIRING_SERVICE : line.includes(CONNECT_SERVICE) ? CONNECT_SERVICE : undefined;
    if (!type) continue;
    const endpoint = line.match(/(?:\[[0-9a-f:]+\]|[^\s:]+):\d{1,5}\s*$/i)?.[0]?.trim();
    const name = line.split(/\s+/)[0];
    if (!endpoint || !validEndpoint(endpoint) || !name) continue;
    services.push({type, endpoint, name, deviceIdentity: serviceIdentity(name)});
  }
  return services.filter((service, index) => services.findIndex(candidate => candidate.type === service.type && candidate.endpoint === service.endpoint && candidate.deviceIdentity === service.deviceIdentity) === index);
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

export function createMemoryAttemptStore({clock = () => new Date(), staleMs = DEFAULT_STALE_MS} = {}) {
  let state = null;
  return attemptStore({
    clock,
    staleMs,
    read: () => state ? structuredClone(state) : null,
    write: value => { state = structuredClone(value); },
  });
}

export function createFileAttemptStore({statePath = defaultStatePath(), clock = () => new Date(), staleMs = DEFAULT_STALE_MS} = {}) {
  const lockPath = `${statePath}.lock`;
  function read() {
    if (!fs.existsSync(statePath)) return null;
    const stat = fs.lstatSync(statePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('adb_attempt_state_unsafe');
    const value = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (!value || value.schema !== STATE_SCHEMA) throw new Error('adb_attempt_state_invalid');
    return value;
  }
  function write(value) {
    fs.mkdirSync(path.dirname(statePath), {recursive: true, mode: 0o700});
    const temporary = `${statePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value)}\n`, {encoding: 'utf8', mode: 0o600, flag: 'wx'});
    fs.renameSync(temporary, statePath);
    fs.chmodSync(statePath, 0o600);
  }
  function withLock(action) {
    fs.mkdirSync(path.dirname(statePath), {recursive: true, mode: 0o700});
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const descriptor = fs.openSync(lockPath, 'wx', 0o600);
        try { fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid, processStartToken: processStartToken(process.pid), at: clock().toISOString()})); }
        finally { fs.closeSync(descriptor); }
        try { return action(); }
        finally { fs.unlinkSync(lockPath); }
      } catch (error) {
        if (error?.code !== 'EEXIST' || attempt > 0 || !staleLock(lockPath, clock(), staleMs)) throw error;
        fs.unlinkSync(lockPath);
      }
    }
    throw new Error('adb_attempt_lock_unavailable');
  }
  return attemptStore({clock, staleMs, read, write, withLock});
}

function attemptStore({clock, staleMs, read, write, withLock = action => action()}) {
  const current = () => read();
  return {
    current,
    acquire(kind) {
      return withLock(() => {
        const previous = read(), now = clock().toISOString(), recoveredStaleAttempt = Boolean(previous?.active && staleAttempt(previous, clock(), staleMs));
        if (previous?.active && !recoveredStaleAttempt) return {ok: false, state: previous};
        const lease = {ownerId: crypto.randomUUID(), ownerPid: process.pid, ownerStartToken: processStartToken(process.pid)};
        const next = {schema: STATE_SCHEMA, active: true, kind, phase: 'starting', startedAt: now, updatedAt: now, ...lease, deviceIdentity: previous?.deviceIdentity ?? null, lastEndpoint: previous?.lastEndpoint ?? null, pairingSucceeded: Boolean(previous?.pairingSucceeded), recoveredStaleAttempt};
        write(next);
        return {ok: true, lease, state: next, recoveredStaleAttempt};
      });
    },
    update(lease, fields) {
      return withLock(() => {
        const value = read();
        if (!value?.active || value.ownerId !== lease.ownerId || value.ownerPid !== lease.ownerPid || value.ownerStartToken !== lease.ownerStartToken) throw new Error('adb_attempt_lease_lost');
        const next = {...value, ...fields, schema: STATE_SCHEMA, active: true, ownerId: lease.ownerId, ownerPid: lease.ownerPid, ownerStartToken: lease.ownerStartToken, updatedAt: clock().toISOString()};
        write(next); return next;
      });
    },
    release(lease, fields) {
      return withLock(() => {
        const value = read();
        if (!value?.active || value.ownerId !== lease.ownerId || value.ownerPid !== lease.ownerPid || value.ownerStartToken !== lease.ownerStartToken) throw new Error('adb_attempt_lease_lost');
        const next = {...value, ...fields, schema: STATE_SCHEMA, active: false, ownerId: null, ownerPid: null, ownerStartToken: null, updatedAt: clock().toISOString()};
        write(next); return next;
      });
    },
  };
}

export function createAdbLocal({run = runCommand, wait = delay, attempts = 6, intervalMs = 500, localAddresses = hostAddresses(), attemptState = createFileAttemptStore(), controller = new AbortController()} = {}) {
  const signal = controller.signal;

  async function rawObserve(identityHint = attemptState.current()?.deviceIdentity ?? null) {
    const version = await run('adb', ['version'], {signal});
    if (version.code !== 0) return unavailable(version);
    const [mdns, listed] = await Promise.all([run('adb', ['mdns', 'services'], {signal}), run('adb', ['devices', '-l'], {signal})]);
    const observedServices = mdns.code === 0 ? parseMdnsServices(mdns.stdout) : [];
    const services = observedServices.filter(service => localAddresses.includes(endpointHost(service.endpoint)));
    const devices = listed.code === 0 ? parseDevices(listed.stdout) : [];
    const pairing = services.filter(service => service.type === PAIRING_SERVICE);
    const connect = services.filter(service => service.type === CONNECT_SERVICE);
    const persisted = attemptState.current();
    const serviceCandidates = connect.filter(service => !identityHint || service.deviceIdentity === identityHint);
    const endpoints = [...new Set([...serviceCandidates.map(service => service.endpoint), ...(identityHint && persisted?.deviceIdentity === identityHint && persisted.lastEndpoint ? [persisted.lastEndpoint] : [])])];
    let verified = null;
    for (const endpoint of endpoints) {
      if (!devices.some(device => device.serial === endpoint && device.state === 'device')) continue;
      const state = await run('adb', ['-s', endpoint, 'get-state'], {signal});
      if (state.code === 0 && firstMeaningfulLine(state.stdout) === 'device') { verified = {endpoint, deviceIdentity: serviceCandidates.find(service => service.endpoint === endpoint)?.deviceIdentity ?? identityHint}; break; }
    }
    const paired = Boolean(persisted?.pairingSucceeded);
    return {
      schema: RESULT_SCHEMA,
      adb: {available: true, version: firstMeaningfulLine(version.stdout), mdnsAvailable: mdns.code === 0},
      discovery: {pairing, connect, ignoredNonLocalServices: observedServices.length - services.length},
      devices,
      paired,
      usableLocalDeviceConnected: Boolean(verified),
      connectionEndpoint: verified?.endpoint ?? null,
      deviceIdentity: verified?.deviceIdentity ?? identityHint,
      verification: verified ? {qualified: true, method: 'adb-devices-and-target-get-state'} : {qualified: false, method: 'adb-devices-and-target-get-state'},
      state: verified ? 'connected' : paired ? 'paired-disconnected' : pairing.length ? 'pairing-required' : connect.length ? 'disconnected' : 'undiscovered',
    };
  }

  function activeResult(operation, current) {
    return {schema: RESULT_SCHEMA, operation, ok: false, state: 'attempt-active', reason: `${current?.kind ?? 'adb'}-attempt-in-progress`, attempt: publicAttempt(current), usableLocalDeviceConnected: false, connectionEndpoint: null};
  }

  async function observe(operation = 'status') {
    const current = attemptState.current();
    if (current?.active) return activeResult(operation, current);
    return {...await rawObserve(), operation};
  }

  async function connectLoop(lease, identity) {
    const failures = [];
    for (let round = 0; round < attempts; round++) {
      attemptState.update(lease, {phase: 'discovering-connect', deviceIdentity: identity});
      const status = await rawObserve(identity);
      if (status.usableLocalDeviceConnected) return {...status, ok: true, action: 'already-connected'};
      const candidates = selectServices(status.discovery.connect, identity);
      if (candidates.reason) return {...status, ok: false, reason: candidates.reason, failures};
      for (const service of candidates.services) {
        attemptState.update(lease, {phase: 'connecting', deviceIdentity: service.deviceIdentity, lastEndpoint: service.endpoint});
        const connected = await run('adb', ['connect', service.endpoint], {signal});
        if (connected.code !== 0) failures.push(safeMessage(connected));
        const verified = await rawObserve(service.deviceIdentity);
        if (verified.usableLocalDeviceConnected && verified.connectionEndpoint === service.endpoint) return {...verified, ok: true, action: 'connected'};
      }
      if (round + 1 < attempts) await wait(intervalMs, signal);
    }
    const final = await rawObserve(identity);
    return {...final, ok: false, reason: final.paired ? 'paired-but-connect-unavailable' : final.discovery.pairing.length ? 'pairing-required' : 'connect-unavailable', failures: failures.slice(0, 4)};
  }

  async function ensureConnected() {
    const acquired = attemptState.acquire('reconnect');
    if (!acquired.ok) return activeResult('ensure-connected', acquired.state);
    const {lease} = acquired;
    try {
      const initial = await rawObserve(acquired.state.deviceIdentity);
      if (!initial.adb.available) return releaseResult(lease, initial, {operation: 'ensure-connected', ok: false, reason: 'adb-unavailable'});
      if (initial.usableLocalDeviceConnected) return releaseResult(lease, initial, {operation: 'ensure-connected', ok: true, action: 'already-connected'});
      const selected = selectServices(initial.discovery.connect, acquired.state.deviceIdentity);
      if (selected.reason) return releaseResult(lease, initial, {operation: 'ensure-connected', ok: false, reason: selected.reason});
      const identity = acquired.state.deviceIdentity ?? selected.services[0]?.deviceIdentity ?? null;
      const result = await connectLoop(lease, identity);
      return releaseResult(lease, result, {operation: 'ensure-connected'});
    } catch (error) {
      return releaseFailure(lease, 'ensure-connected', error);
    }
  }

  async function preparePairing() {
    const acquired = attemptState.acquire('pairing');
    if (!acquired.ok) return {ready: false, result: activeResult('pair', acquired.state)};
    const {lease} = acquired;
    try {
      attemptState.update(lease, {phase: 'discovering-pairing'});
      const initial = await rawObserve(acquired.state.deviceIdentity);
      if (!initial.adb.available) return {ready: false, result: releaseResult(lease, initial, {operation: 'pair', ok: false, reason: 'adb-unavailable'})};
      if (initial.usableLocalDeviceConnected) return {ready: false, result: releaseResult(lease, initial, {operation: 'pair', ok: true, action: 'already-connected'})};
      const selected = selectServices(initial.discovery.pairing, acquired.state.deviceIdentity);
      if (selected.reason || !selected.services.length) return {ready: false, result: releaseResult(lease, initial, {operation: 'pair', ok: false, reason: selected.reason ?? 'pairing-service-unavailable'})};
      const service = selected.services[0];
      attemptState.update(lease, {phase: 'awaiting-pin', deviceIdentity: service.deviceIdentity, pairingEndpoint: service.endpoint});
      return {
        ready: true,
        attempt: publicAttempt(attemptState.current()),
        async complete(pin) {
          if (!/^\d{6}$/.test(String(pin ?? ''))) return releaseResult(lease, initial, {operation: 'pair', ok: false, reason: 'invalid-pairing-code'});
          try {
            attemptState.update(lease, {phase: 'pairing'});
            const paired = await run('adb', ['pair', service.endpoint], {input: `${pin}\n`, redact: pin, signal});
            if (paired.code !== 0) return releaseResult(lease, initial, {operation: 'pair', ok: false, reason: 'pairing-failed', message: safeMessage(paired, pin)});
            attemptState.update(lease, {phase: 'paired-awaiting-connect', pairingSucceeded: true, deviceIdentity: service.deviceIdentity});
            await wait(intervalMs, signal);
            const connected = await connectLoop(lease, service.deviceIdentity);
            if (!connected.ok) return releaseResult(lease, connected, {operation: 'pair', paired: true, ok: false, reason: 'pair-succeeded-connect-failed'});
            return releaseResult(lease, connected, {operation: 'pair', paired: true, ok: true, action: 'paired-and-connected'});
          } catch (error) { return releaseFailure(lease, 'pair', error); }
        },
        cancel() { return releaseResult(lease, initial, {operation: 'pair', ok: false, reason: 'pairing-input-cancelled'}); },
      };
    } catch (error) { return {ready: false, result: releaseFailure(lease, 'pair', error)}; }
  }

  async function pair(pin) {
    if (!/^\d{6}$/.test(String(pin ?? ''))) return {schema: RESULT_SCHEMA, operation: 'pair', ok: false, reason: 'invalid-pairing-code'};
    const prepared = await preparePairing();
    return prepared.ready ? prepared.complete(pin) : prepared.result;
  }

  function releaseResult(lease, base, extra) {
    const success = extra.ok === true && base.usableLocalDeviceConnected === true;
    const persisted = attemptState.release(lease, {phase: success ? 'connected' : extra.paired || base.paired ? 'paired-disconnected' : 'idle', deviceIdentity: base.deviceIdentity ?? attemptState.current()?.deviceIdentity ?? null, lastEndpoint: base.connectionEndpoint ?? attemptState.current()?.lastEndpoint ?? null, pairingEndpoint: null, pairingSucceeded: Boolean(extra.paired || base.paired || success), lastResult: extra.reason ?? extra.action ?? (success ? 'connected' : 'not-connected')});
    return {...base, ...extra, attempt: publicAttempt(persisted)};
  }

  function releaseFailure(lease, operation, error) {
    const reason = signal.aborted ? 'adb-operation-cancelled' : safeError(error);
    const base = {schema: RESULT_SCHEMA, operation, ok: false, state: 'operation-failed', reason, usableLocalDeviceConnected: false, connectionEndpoint: null};
    try { return releaseResult(lease, base, {}); } catch { return base; }
  }

  return {status: () => observe('status'), discover: () => observe('discover'), ensureConnected, preparePairing, pair, stop: reason => controller.abort(new Error(reason || 'adb-helper-stopped'))};
}

function unavailable(result) {
  return {schema: RESULT_SCHEMA, adb: {available: false, version: null, mdnsAvailable: false}, discovery: {pairing: [], connect: [], ignoredNonLocalServices: 0}, devices: [], paired: false, usableLocalDeviceConnected: false, connectionEndpoint: null, deviceIdentity: null, verification: {qualified: false, method: 'adb-devices-and-target-get-state'}, state: 'adb-unavailable', reason: result.code === 127 ? 'adb-not-installed' : 'adb-unavailable'};
}

function selectServices(services, identity) {
  const matching = identity ? services.filter(service => service.deviceIdentity === identity) : services;
  const identities = new Set(matching.map(service => service.deviceIdentity));
  if (identity && !matching.length) return {services: [], reason: 'matching-device-service-unavailable'};
  if (identities.size > 1) return {services: [], reason: 'ambiguous-device-services'};
  return {services: matching, reason: null};
}

function serviceIdentity(name) { return String(name).trim().replace(/\.$/, '').toLowerCase(); }
function validEndpoint(value) { const match = String(value).match(/^(?:\[[0-9a-f:]+\]|[^\s:]+):(\d{1,5})$/i), port = Number(match?.[1]); return Boolean(match && port > 0 && port <= 65535); }
function endpointHost(value) { return String(value).replace(/:\d{1,5}$/, '').replace(/^\[|\]$/g, '').split('%')[0]; }
function hostAddresses() { const addresses = ['127.0.0.1', '::1']; for (const entries of Object.values(os.networkInterfaces())) for (const entry of entries ?? []) if (entry.address) addresses.push(entry.address.split('%')[0]); return [...new Set(addresses)]; }
function defaultStatePath() { return process.env.AGENT_CONTROL_ADB_STATE_FILE || path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'agent-control', 'android-adb-attempt.json'); }
function processStartToken(pid) { try { const line = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'), end = line.lastIndexOf(')'); return line.slice(end + 2).split(/\s+/)[19] || null; } catch { return null; } }
function processMatches(state) { if (!Number.isSafeInteger(state.ownerPid) || state.ownerPid <= 0) return false; try { process.kill(state.ownerPid, 0); } catch { return false; } const token = processStartToken(state.ownerPid); return !state.ownerStartToken || !token || token === state.ownerStartToken; }
function staleAttempt(state, _now, _staleMs) { return !processMatches(state); }
function staleLock(lockPath, now, staleMs) { try { const value = JSON.parse(fs.readFileSync(lockPath, 'utf8')), age = now.getTime() - Date.parse(value.at || 0); return !processMatches({ownerPid: value.pid, ownerStartToken: value.processStartToken}) || !Number.isFinite(age) || age > Math.min(staleMs, 10_000); } catch { return true; } }
function publicAttempt(state) { return state ? {active: Boolean(state.active), kind: state.kind ?? null, phase: state.phase ?? null, startedAt: state.startedAt ?? null, updatedAt: state.updatedAt ?? null, deviceIdentity: state.deviceIdentity ?? null, pairingSucceeded: Boolean(state.pairingSucceeded), recoveredStaleAttempt: Boolean(state.recoveredStaleAttempt)} : null; }
function firstMeaningfulLine(value) { return String(value ?? '').split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? null; }
function delay(ms, signal) { return new Promise((resolve, reject) => { if (signal?.aborted) return reject(signal.reason); const timer = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, {once: true}); }); }
function safeError(error) { const value = error instanceof Error ? error.message : String(error); return /^[a-z0-9:_-]{1,120}$/i.test(value) ? value : 'android_adb_operation_failed'; }
function safeMessage(result, secret = '') { const value = firstMeaningfulLine(result.stderr) ?? firstMeaningfulLine(result.stdout) ?? `adb-exit-${result.code}`; return String(value).replaceAll(String(secret || '\0'), '[REDACTED]').replace(/\b\d{6}\b/g, '[REDACTED]').slice(0, 240); }

export function runCommand(command, args, {input, redact = '', signal} = {}) {
  return new Promise(resolve => {
    let stdout = '', stderr = '', settled = false, timedOut = false;
    const child = spawn(command, args, {stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false});
    const clean = value => String(value).replaceAll(String(redact || '\0'), '[REDACTED]').replace(/\b\d{6}\b/g, '[REDACTED]');
    const stop = () => { if (!child.killed) child.kill('SIGTERM'); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, DEFAULT_TIMEOUT_MS);
    const abort = () => stop();
    signal?.addEventListener('abort', abort, {once: true});
    const finish = code => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve({code: timedOut ? 124 : signal?.aborted ? 130 : code, stdout: clean(stdout), stderr: clean(stderr)}); };
    child.stdout.on('data', chunk => { if (stdout.length < 1024 * 1024) stdout += chunk; });
    child.stderr.on('data', chunk => { if (stderr.length < 1024 * 1024) stderr += chunk; });
    child.on('error', error => { stderr = error.code === 'ENOENT' ? 'adb-not-installed' : error.message; finish(error.code === 'ENOENT' ? 127 : 1); });
    child.on('close', code => finish(code ?? 1));
    child.stdin.on('error', () => {});
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
  });
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] ?? 'status', extra = argv.slice(1).filter(value => value !== '--json'), helper = createAdbLocal();
  const stop = () => helper.stop('adb-helper-signal');
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  let result;
  try {
    if (command === 'status' && extra.length === 0) result = await helper.status();
    else if (command === 'discover' && extra.length === 0) result = await helper.discover();
    else if (command === 'ensure-connected' && extra.length === 0) result = await helper.ensureConnected();
    else if (command === 'pair' && extra.length === 0) {
      const prepared = await helper.preparePairing();
      if (!prepared.ready) result = prepared.result;
      else {
        let pin = '';
        for await (const chunk of process.stdin) pin += chunk;
        result = await prepared.complete(pin.trim());
        pin = '';
      }
    } else result = {schema: RESULT_SCHEMA, ok: false, reason: 'usage', commands: ['status', 'discover', 'pair (PIN via stdin)', 'ensure-connected']};
  } catch (error) { result = {schema: RESULT_SCHEMA, ok: false, reason: safeError(error)}; }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.ok === false) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
