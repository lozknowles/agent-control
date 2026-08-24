import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('docs/Agent-Control-3.1.0-Operator-Guide.md', 'utf8');
const architecture = fs.readFileSync('ARCHITECTURE.md', 'utf8');
const pdf = fs.readFileSync('assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.pdf');
const pdfText = pdf.toString('latin1');

test('3.1 operator guide covers the dashboard and scheduler authority boundary', () => {
  assert.match(source, /^# Agent Control 3\.1\.0 Operator Guide/m);
  assert.match(source, /^## Web dashboard$/m);
  assert.match(source, /^## Scheduler operation$/m);
  assert.match(source, /The dashboard requests; Agent Control authorises/);
  assert.match(source, /OS cron and the browser are not authoritative schedulers/);
  assert.match(architecture, /default Jobs workspace is an operational projection, not an additional scheduler/);
});

test('3.1 release PDF is a non-empty versioned operator guide artifact', () => {
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 10_000);
  assert.match(pdfText, /\/Title \(Agent Control 3\.1\.0 Operator Guide\)/);
  assert.match(pdfText, /%%EOF\s*$/);
});
