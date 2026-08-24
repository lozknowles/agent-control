import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('docs/Agent-Control-3.1.0-Operator-Guide.md', 'utf8');
const releaseMarkdown = fs.readFileSync('assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.md', 'utf8');
const architecture = fs.readFileSync('ARCHITECTURE.md', 'utf8');
const pdf = fs.readFileSync('assets/releases/3.1.0/Agent-Control-3.1.0-Operator-Guide.pdf');
const pdfText = pdf.toString('latin1');
const windowsQualification = fs.readFileSync('scripts/qualify-openai-windows-harness.ts', 'utf8');

test('3.1 operator guide covers the dashboard and scheduler authority boundary', () => {
  assert.match(source, /^# Agent Control 3\.1\.0 Operator Guide/m);
  assert.match(source, /^## Web dashboard$/m);
  assert.match(source, /^## Scheduler operation$/m);
  assert.match(source, /^## Adaptive harness execution$/m);
  assert.match(source, /^## Windows OpenAI return-data example$/m);
  assert.match(source, /ToolInvocationGateway/);
  assert.match(source, /verification-pending/);
  assert.match(source, /SUPPORTED\+UNQUALIFIED/);
  assert.match(source, /Agent Control does not ship a ChatGPT desktop bridge/);
  assert.match(source, /npm run qualify:openai-windows/);
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

test('3.1 release assets include the canonical Markdown operator guide', () => {
  assert.equal(releaseMarkdown, source);
});

test('Windows OpenAI qualification uses a valid economic routing intent', () => {
  assert.match(windowsQualification, /intent: 'NORMAL'/);
  assert.doesNotMatch(windowsQualification, /intent: 'QUALITY'/);
});
