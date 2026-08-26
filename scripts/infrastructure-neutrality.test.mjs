import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const exceptions = new Set(['CHANGELOG.md', 'docs/evidence/infrastructure-agnostic-audit-3.0.1.md']);
const textExtensions = /\.(?:ts|mjs|js|json|md|sh|py)$/i;
function sourceFiles(directory = '.') {
  const ignored = new Set(['.git', 'node_modules', '.agent-control', '.pdf-venv', 'qualification-results']);
  const result = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...sourceFiles(file));
    else result.push(file.replace(/^\.([\\/])/, '').replaceAll('\\', '/'));
  }
  return result;
}
let tracked;
try { tracked = [...new Set([...execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).split('\0').filter(Boolean), ...sourceFiles()])].sort(); }
catch { tracked = sourceFiles(); }
const forbidden = [
  ['hpub', 'untu'].join(''),
  ['senti', 'nel'].join(''),
  ['pixel', '-8-pro'].join(''),
  ['u0_', 'a438'].join(''),
  ['/fast/', 'repos'].join(''),
  ['/fast/', 'work'].join(''),
  ['agent-control-', 'pixel'].join(''),
  ['agent-control-', '2'].join(''),
  ['C:', '\\Users\\', 'Loz'].join(''),
];

test('tracked filenames contain no private topology identifiers', () => {
  const violations = tracked.filter(file => !exceptions.has(file) && forbidden.some(value => file.toLowerCase().includes(value.toLowerCase())));
  assert.deepEqual(violations, []);
});

test('distributable text contains no private topology identifiers', () => {
  const violations = [];
  for (const file of tracked) {
    if (exceptions.has(file) || !textExtensions.test(file) || !fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const value of forbidden) if (source.includes(value.toLowerCase())) violations.push(`${file}: ${value}`);
  }
  assert.deepEqual(violations, []);
});

test('named secure-overlay support remains confined to its optional integration adapter', () => {
  const runtime = tracked.filter(file => /^(src|scripts|android)\//.test(file) && !/\.test\.(?:ts|mjs|js)$/.test(file) && textExtensions.test(file) && fs.existsSync(file));
  const vendorName = ['tail', 'scale'].join('');
  const references = runtime.filter(file => fs.readFileSync(file, 'utf8').toLowerCase().includes(vendorName));
  assert.deepEqual(references, ['src/integrations/secure-overlay.ts']);
  const adapter = fs.readFileSync('src/integrations/secure-overlay.ts', 'utf8');
  assert.match(adapter, /--until-direct=false/);
  assert.doesNotMatch(adapter, /100\.\d+\.\d+\.\d+|pixel|newark|home network/i);
});
