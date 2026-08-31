import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {createAdbLocal, parseDevices, parseMdnsServices} from './adb-local.mjs';

const mdns = (pairing = [], connect = []) => ['List of discovered mdns services', ...pairing.map((x, i) => `adb-pair-${i} _adb-tls-pairing._tcp ${x}`), ...connect.map((x, i) => `adb-connect-${i} _adb-tls-connect._tcp ${x}`)].join('\n');
const devices = entries => ['List of devices attached', ...entries.map(([serial, state = 'device']) => `${serial}\t${state} product:test model:test`), ''].join('\n');
function fixture({available = true, pairing = [], connect = [], connected = [], pairCode = 0, connectCode = 0, rotateTo, leak} = {}) {
  const calls = [];
  let endpoints = [...connect], current = [...connected], connects = 0, pairs = 0;
  const run = async (_command, args, options = {}) => {
    calls.push({args, input: options.input});
    if (args[0] === 'version') return available ? {code: 0, stdout: 'Android Debug Bridge version 1.0.41\n', stderr: ''} : {code: 127, stdout: '', stderr: 'missing'};
    if (args[0] === 'mdns') return {code: 0, stdout: mdns(pairing, endpoints), stderr: ''};
    if (args[0] === 'devices') return {code: 0, stdout: devices(current), stderr: ''};
    if (args[0] === 'pair') { pairs++; return {code: pairCode, stdout: pairCode ? '' : `Successfully paired ${leak ?? ''}`, stderr: pairCode ? `failed ${leak ?? ''}` : ''}; }
    if (args[0] === 'connect') { connects++; if (rotateTo && connects === 1) endpoints = [rotateTo]; if (connectCode === 0 || connects > 1) current = [[args[1], 'device']]; return {code: connects === 1 ? connectCode : 0, stdout: '', stderr: connectCode && connects === 1 ? 'failed' : ''}; }
    throw new Error(`unexpected:${args.join(' ')}`);
  };
  return {helper: createAdbLocal({run, wait: async () => {}, attempts: 2, localAddresses: ['192.0.2.2']}), calls, counts: () => ({connects, pairs})};
}

test('parses pairing and connect mDNS services and connected devices', () => {
  assert.deepEqual(parseMdnsServices(mdns(['192.0.2.2:37101'], ['192.0.2.2:37102'])).map(x => x.type), ['_adb-tls-pairing._tcp', '_adb-tls-connect._tcp']);
  assert.equal(parseDevices(devices([['192.0.2.2:37102']]))[0].state, 'device');
});
test('adb unavailable is explicit', async () => { const {helper} = fixture({available: false}); assert.equal((await helper.status()).state, 'adb-unavailable'); });
test('no services remains undiscovered', async () => { const {helper} = fixture(); assert.equal((await helper.discover()).state, 'undiscovered'); });
test('pairing service is distinguished from connection service', async () => { const {helper} = fixture({pairing: ['192.0.2.2:37101']}); assert.equal((await helper.status()).state, 'pairing-required'); });
test('connect service is reported without assuming a fixed port', async () => { const {helper} = fixture({connect: ['192.0.2.2:45231']}); const value = await helper.status(); assert.equal(value.state, 'disconnected'); assert.equal(value.discovery.connect[0].endpoint, '192.0.2.2:45231'); });
test('non-local mDNS services are never selected for connection', async () => { const {helper, counts} = fixture({connect: ['198.51.100.7:45231']}); const value = await helper.ensureConnected(); assert.equal(value.reason, 'connect-unavailable'); assert.equal(value.discovery.ignoredNonLocalServices, 1); assert.equal(counts().connects, 0); });
test('already connected is idempotent', async () => { const {helper, counts} = fixture({connect: ['192.0.2.2:45231'], connected: [['192.0.2.2:45231']]}); assert.equal((await helper.ensureConnected()).action, 'already-connected'); assert.deepEqual(counts(), {connects: 0, pairs: 0}); });
test('pair command never repeats pairing for an already connected device', async () => { const {helper, counts} = fixture({pairing: ['192.0.2.2:37101'], connect: ['192.0.2.2:45231'], connected: [['192.0.2.2:45231']]}); assert.equal((await helper.pair('123456')).action, 'already-connected'); assert.deepEqual(counts(), {connects: 0, pairs: 0}); });
test('changed connect port is rediscovered within bounded retries', async () => { const {helper, counts} = fixture({connect: ['192.0.2.2:40001'], connectCode: 1, rotateTo: '192.0.2.2:40002'}); const value = await helper.ensureConnected(); assert.equal(value.ok, true); assert.equal(value.connectionEndpoint, '192.0.2.2:40002'); assert.equal(counts().connects, 2); });
test('missing connect endpoint returns pairing required', async () => { const {helper} = fixture({pairing: ['192.0.2.2:37101']}); assert.equal((await helper.ensureConnected()).reason, 'pairing-required'); });
test('invalid PIN is rejected before adb is invoked', async () => { const {helper, calls} = fixture({pairing: ['192.0.2.2:37101']}); assert.equal((await helper.pair('12345')).reason, 'invalid-pairing-code'); assert.equal(calls.length, 0); });
test('successful pair immediately connects and verifies', async () => { const {helper, counts} = fixture({pairing: ['192.0.2.2:37101'], connect: ['192.0.2.2:37102']}); const value = await helper.pair('123456'); assert.equal(value.ok, true); assert.equal(value.usableLocalDeviceConnected, true); assert.deepEqual(counts(), {connects: 1, pairs: 1}); });
test('pair success without connect evidence fails honestly', async () => { const {helper} = fixture({pairing: ['192.0.2.2:37101']}); const value = await helper.pair('123456'); assert.equal(value.paired, true); assert.equal(value.reason, 'pair-succeeded-connect-failed'); });
test('pairing code never appears in returned evidence or errors', async () => { const {helper} = fixture({pairing: ['192.0.2.2:37101'], pairCode: 1, leak: '123456'}); const value = await helper.pair('123456'); assert.equal(JSON.stringify(value).includes('123456'), false); });
test('Android node exposes only fixed ADB status and reconnect operations', () => {
  const source = fs.readFileSync(new URL('./node-server.mjs', import.meta.url), 'utf8');
  assert.match(source, /android\.adb\.status/);
  assert.match(source, /android\.adb\.ensure-connected/);
  assert.doesNotMatch(source, /android\.adb\.pair/);
  assert.doesNotMatch(source, /adbLocal\.(?:pair)|adb\s+shell/);
});
test('boot performs bounded reconnect without initiating pairing', () => {
  const source = fs.readFileSync(new URL('./termux-boot-agent-control.sh', import.meta.url), 'utf8');
  assert.match(source, /adb-local\.mjs ensure-connected/);
  assert.doesNotMatch(source, /adb-local\.mjs pair|adb pair/);
});
