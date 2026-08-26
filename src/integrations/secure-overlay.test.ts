import assert from 'node:assert/strict';
import test from 'node:test';
import {parseTailscaleStatus, TailscaleSecureOverlay, type SecureOverlayCliResult} from './secure-overlay.js';

const status = (peer: Record<string, unknown>) => JSON.stringify({Peer: {'node-key:fixture': {ID: 'peer-fixture', OS: 'android', Online: true, TailscaleIPs: ['192.0.2.44'], ...peer}}});
const result = (stdout: string, code = 0): SecureOverlayCliResult => ({status: code, stdout, stderr: ''});

test('structured status discovers Android without relying on hostname or model', () => {
  const peers = parseTailscaleStatus(status({DNSName: 'arbitrary.tail.example.', HostName: 'arbitrary-device', Relay: 'region-fixture'}));
  assert.equal(peers.length, 1);
  assert.equal(peers[0].id, 'peer-fixture');
  assert.equal(peers[0].os, 'android');
});

test('DERP-relayed peer is reachable rather than offline', async () => {
  const outputs = [result(status({Relay: 'region-fixture'})), result('pong from peer via DERP(region-fixture) in 108ms'), result(status({Relay: 'region-fixture'}))];
  const overlay = new TailscaleSecureOverlay('tailscale', async (_command, args) => {
    assert.deepEqual(args[0] === 'ping' ? args.slice(0, 2) : args, args[0] === 'ping' ? ['ping', '--until-direct=false'] : ['status', '--json']);
    return outputs.shift()!;
  }, () => new Date('2026-08-26T12:00:00Z'));
  const peer = (await overlay.discover('android'))[0], probe = await overlay.probe(peer);
  assert.equal(probe.state, 'TAILSCALE_RELAY_REACHABLE');
  assert.equal(probe.route, 'relay');
  assert.equal(probe.latencyMs, 108);
});

test('direct peer is reachable and preserves direct route diagnostics', async () => {
  const outputs = [result(status({CurAddr: '192.0.2.4:41641'})), result('pong from peer via 192.0.2.4:41641 in 12.5ms'), result(status({CurAddr: '192.0.2.4:41641'}))];
  const overlay = new TailscaleSecureOverlay('tailscale', async () => outputs.shift()!);
  const probe = await overlay.probe((await overlay.discover('android'))[0]);
  assert.equal(probe.state, 'TAILSCALE_DIRECT_REACHABLE');
  assert.equal(probe.route, 'direct');
  assert.equal(probe.latencyMs, 12.5);
});

test('genuinely unreachable peer is offline', async () => {
  const outputs = [result(status({Relay: 'region-fixture'})), result('', 1)];
  const overlay = new TailscaleSecureOverlay('tailscale', async () => outputs.shift()!);
  const probe = await overlay.probe((await overlay.discover('android'))[0]);
  assert.equal(probe.state, 'OFFLINE');
  assert.equal(probe.reachable, false);
});
