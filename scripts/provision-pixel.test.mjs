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
