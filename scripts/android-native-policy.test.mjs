import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const metadata = fs.readFileSync('android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/NfcMetadata.java', 'utf8');
const server = fs.readFileSync('android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/AdapterServer.java', 'utf8');
const manifest = fs.readFileSync('android/native-adapter/app/src/main/AndroidManifest.xml', 'utf8');
const termux = fs.readFileSync('android/node-server.mjs', 'utf8');

test('native NFC adapter has no command, authentication, write or emulation primitive', () => {
  for (const forbidden of ['.transceive(', '.connect(', '.authenticate', '.write', 'HostApduService', 'NdefFormatable', 'enableForegroundDispatch']) assert.equal(metadata.includes(forbidden), false, forbidden);
  assert.equal(server.includes('android.execute.shell'), false);
  assert.equal(server.includes('nfc.inspect_tag'), true);
  assert.equal(server.includes('execution.android.typed_jobs'), true);
  assert.equal(manifest.includes('HOST_APDU_SERVICE'), false);
  assert.equal(manifest.includes('android.permission.NFC'), true);
});

test('native adapter requires authenticated secure-overlay source and replay evidence', () => {
  assert.match(server, /allowedSource/);
  assert.match(server, /x-agent-control-request-id/);
  assert.match(server, /x-agent-control-timestamp/);
  assert.match(server, /MessageDigest\.isEqual/);
  assert.match(server, /on-device-stop-control/);
  assert.match(server, /MAX_BODY = 16 \* 1024/);
  assert.match(server, /MAX_JOBS = 128/);
  assert.match(server, /MAX_NONCES = 4096/);
  assert.doesNotMatch(server, /0x7A|0x11|0x5C|0xA1|0xE0/);
  assert.match(termux, /allowedSource/);
  assert.match(termux, /private_transport_source_required/);
  assert.match(termux, /android_node_token_too_short/);
});
