import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

test('package-bin symlink executes the Agent Control command entrypoint', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-bin-'));
  const source = fileURLToPath(new URL('./agent-control.mjs', import.meta.url));
  const command = path.join(root, 'agent-control');
  fs.symlinkSync(source, command);
  const result = spawnSync(command, ['--help'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /agent-control status \[--json\]/);
});
