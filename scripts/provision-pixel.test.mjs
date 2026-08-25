import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

function provisionSource() {
  return fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
}

function compact(source) {
  return source.replace(/\s+/g, ' ');
}

test('privileged Pixel install path cannot capture or pass a password', () => {
  const source = provisionSource();
  const oneLine = compact(source);
  assert.doesNotMatch(source, /sudo\s+-S|readline|process\.stdin|stdin/);
  assert.match(oneLine, /command\('sudo', \['-n', PRIVILEGED_HELPER, 'install-adb'\]/);
  const helper = fs.readFileSync(path.resolve('scripts/agent-control-privileged'), 'utf8');
  assert.match(helper, /\[ "\$\{1-\}" != install-adb \]/);
  assert.doesNotMatch(helper, /\$@|\$\*|sudo|sh -c|bash -c/);
  assert.match(helper, /apt-get install -y --no-install-recommends adb/);
});

test('ADB tool installation and live device transport are separate observations', () => {
  const source = provisionSource();
  const oneLine = compact(source);
  assert.match(source, /async detectAdbTool\(\)/);
  assert.match(oneLine, /const installed = await this\.detectAdbTool\(\)/);
  assert.match(source, /\['devices', '-l'\]/);
  assert.match(source, /qualifyAdbDevices\(output, expectedAdbSerial \|\| undefined\)/);
  assert.match(source, /helper failed and adb remains absent/);
});

test('Termux Boot installation has a device-aware timeout and observed postcondition', () => {
  const source = provisionSource();
  const oneLine = compact(source);
  assert.match(source, /AGENT_CONTROL_APK_INSTALL_TIMEOUT_MS \|\| 300000/);
  assert.match(oneLine, /const observed = await this\.verifyTermuxBootPackage\(packageName\)/);
  assert.match(oneLine, /if \(observed\.installed\) return \{ installed: true \}/);
  assert.match(source, /DEVICE INSTALL INCOMPLETE/);
  assert.match(source, /termux_boot_artifact_hash_changed_after_verification/);
  assert.match(oneLine, /ops\.artifact = restoredArtifact/);
});

test('boot hook uses only scoped Termux ownership and verifies the installed hash', () => {
  const source = provisionSource();
  const oneLine = compact(source);
  assert.match(oneLine, /'run-as', 'com\.termux'/);
  assert.match(source, /TERMUX_REPO}\/android\/install-boot\.sh/);
  assert.doesNotMatch(source, /'-lc',`cd /);
  assert.match(oneLine, /sha256sum.*TERMUX_HOOK_SOURCE/);
  assert.doesNotMatch(oneLine, /adb\(\['shell', 'su'/);
});

test('reboot qualification uses durable approval plus fresh keyed transports', () => {
  const source = provisionSource();
  const oneLine = compact(source);
  assert.match(source, /--approve-reboot-test/);
  assert.match(source, /PasswordAuthentication=no/);
  assert.match(source, /BatchMode=yes/);
  assert.match(oneLine, /qualifyRebootWithLiveTransports/);
  assert.match(oneLine, /await adb\(\['reboot'\]/);
  assert.match(source, /WAITING FOR TRANSPORT/);
  assert.match(source, /one-shot reboot approval remains durable/);
});

test('Facebook observer is fixed to read-only navigation and the Facebook package', () => {
  const source = fs.readFileSync(
    path.resolve('scripts/observe-facebook-collingham.mjs'),
    'utf8',
  );
  assert.match(source, /--approve-readonly-navigation/);
  assert.match(source, /FACEBOOK_PACKAGE/);
  assert.doesNotMatch(source, /monkey|input','text|LIKE|COMMENT|POST|MESSAGE/);
});
