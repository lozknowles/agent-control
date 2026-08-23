import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('privileged Pixel install path cannot capture or pass a password', () => {
  const source = fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
  assert.doesNotMatch(source, /sudo\s+-S|readline|process\.stdin|stdin/);
  assert.match(source, /sudo.*-n.*PRIVILEGED_HELPER.*install-adb/);
  const helper = fs.readFileSync(path.resolve('scripts/agent-control-privileged'), 'utf8');
  assert.match(helper, /\[ "\$\{1-\}" != install-adb \]/);
  assert.doesNotMatch(helper, /\$@|\$\*|sudo|sh -c|bash -c/);
  assert.match(helper, /apt-get install -y --no-install-recommends adb/);
});

test('ADB installation trusts a fresh observed postcondition after helper exit', () => {
  const source = fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
  assert.match(source, /AGENT_CONTROL_PACKAGE_TIMEOUT_MS \|\| 300000/);
  assert.match(source, /const installed=await this\.detectAdb\(\); if\(installed\)return\{installed:true\}/);
  assert.match(source, /helper failed and adb remains absent/);
});

test('Termux Boot installation has a device-aware timeout and observed postcondition', () => {
  const source = fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
  assert.match(source, /AGENT_CONTROL_APK_INSTALL_TIMEOUT_MS \|\| 300000/);
  assert.match(source, /const observed=await this\.verifyTermuxBootPackage\(packageName\); if\(observed\.installed\)return\{installed:true\}/);
  assert.match(source, /DEVICE INSTALL INCOMPLETE/);
  assert.match(source, /termux_boot_artifact_hash_changed_after_verification/);
  assert.match(source, /ops\.artifact=restoredArtifact/);
});

test('boot hook uses only scoped Termux ownership and verifies the installed hash', () => {
  const source = fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
  assert.match(source, /'run-as','com\.termux'/);
  assert.match(source, /TERMUX_REPO}\/android\/install-boot\.sh/);
  assert.doesNotMatch(source, /'-lc',`cd /);
  assert.match(source, /sha256sum.*TERMUX_HOOK_SOURCE/);
  assert.doesNotMatch(source, /adb\(\['shell',\s*'su'/);
});

test('reboot qualification requires an explicit flag and uses only keyed Termux SSH', () => {
  const source = fs.readFileSync(path.resolve('scripts/provision-pixel.mjs'), 'utf8');
  assert.match(source, /--approve-reboot-test/);
  assert.match(source, /PasswordAuthentication=no/);
  assert.match(source, /BatchMode=yes/);
  assert.match(source, /await adb\(\['reboot'\]/);
});

test('Facebook observer is fixed to read-only navigation and the Facebook package', () => {
  const source = fs.readFileSync(path.resolve('scripts/observe-facebook-collingham.mjs'), 'utf8');
  assert.match(source, /--approve-readonly-navigation/);
  assert.match(source, /FACEBOOK_PACKAGE/);
  assert.doesNotMatch(source, /monkey|input','text|LIKE|COMMENT|POST|MESSAGE/);
});
