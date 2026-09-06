import {createHash, randomBytes} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const evidenceFile = path.resolve(process.env.AGENT_CONTROL_CHARACTER_EVIDENCE ?? 'docs/evidence/agent-control-dashboard-characters-qualification.json');
const videoFile = path.resolve(process.env.AGENT_CONTROL_CHARACTER_VIDEO ?? 'docs/evidence/agent-control-dashboard-characters.mp4');
const manifestFile = path.resolve(process.env.AGENT_CONTROL_CHARACTER_VIDEO_MANIFEST ?? 'docs/evidence/agent-control-dashboard-characters-video.json');
const screenshotDir = path.resolve(process.env.AGENT_CONTROL_CHARACTER_SCREENSHOTS ?? 'docs/evidence/agent-control-dashboard-characters');
const port = Number(process.env.AGENT_CONTROL_CHARACTER_PORT ?? 4396);
const base = `http://127.0.0.1:${port}`;
const chromiumExecutable = process.env.AGENT_CONTROL_CHROMIUM ?? '/snap/bin/chromium';
const playwrightRoot = process.env.AGENT_CONTROL_PLAYWRIGHT_CORE ?? 'playwright-core';
const ffmpeg = process.env.AGENT_CONTROL_FFMPEG ?? 'ffmpeg';
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-dashboard-characters-'));
const rawVideoDir = path.join(stateDir, 'raw-video');
const operatorToken = randomBytes(32).toString('hex');
fs.mkdirSync(rawVideoDir, {recursive: true, mode: 0o700});
fs.mkdirSync(screenshotDir, {recursive: true});

const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/qualify-dashboard-characters.ts', '--host', '127.0.0.1', '--port', String(port), '--state-dir', stateDir, '--evidence-file', evidenceFile, '--hold-ms', '30000'], {
  cwd: root,
  env: {...process.env, AGENT_CONTROL_STATE_DIR: stateDir, AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN: operatorToken},
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stdoutBuffer = '', stderr = '', childExited = false;
const phases = [];
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
child.stdout.on('data', chunk => {
  process.stdout.write(chunk); stdoutBuffer += String(chunk);
  for (;;) { const newline = stdoutBuffer.indexOf('\n'); if (newline < 0) break; const line = stdoutBuffer.slice(0, newline); stdoutBuffer = stdoutBuffer.slice(newline + 1); try { phases.push(JSON.parse(line)); } catch {} }
});
child.stderr.on('data', chunk => { process.stderr.write(chunk); stderr += String(chunk); });
const childExit = new Promise(resolve => child.once('exit', (code, signal) => { childExited = true; resolve({code, signal}); }));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function waitPhase(name, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !childExited) { const found = phases.find(item => item.phase === name); if (found) return found; const failed = phases.find(item => item.phase === 'QUALIFICATION_FAILED'); if (failed) throw new Error(`qualification_failed:${failed.error}`); await delay(100); }
  const found = phases.find(item => item.phase === name); if (found) return found;
  throw new Error(`qualification_phase_timeout:${name}:${stderr.slice(-300)}`);
}

async function screenshot(page, name, options = {}) {
  const file = path.join(screenshotDir, name), bytes = await page.screenshot({path: file, type: 'png', fullPage: options.fullPage ?? false});
  return {file: path.relative(path.dirname(manifestFile), file), sha256: digest(bytes), bytes: bytes.length, viewport: page.viewportSize(), fullPage: options.fullPage ?? false};
}

async function crewSnapshot(page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/status'), value = await response.json();
    return value.characterCrew.members.map(member => ({id: member.id, name: member.name, role: member.role, state: member.state, summary: member.summary, signals: member.signals, freshness: member.freshness}));
  });
}

async function characterAnimationSnapshot(page) {
  return page.evaluate(() => [...document.querySelectorAll('#crew-live-grid .bot-card')].map(card => {
    const id = [...card.classList].find(value => value.startsWith('bot-') && !value.startsWith('bot-state-') && !['bot-card', 'bot-acknowledge'].includes(value));
    const rect = card.getBoundingClientRect(), svg = card.querySelector('.agent-bot'), accent = getComputedStyle(card).getPropertyValue('--bot-accent').trim();
    const animations = svg?.getAnimations({subtree: true}).filter(item => item.playState === 'running').map(item => {
      const target = item.effect?.target;
      if (!(target instanceof Element)) return null;
      const style = getComputedStyle(target), name = style.animationName;
      return {name, target: target.getAttribute('class') || target.tagName, currentTime: Number(item.currentTime ?? 0), transform: style.transform};
    }).filter(item => item?.name && item.name !== 'none') ?? [];
    const motion = animations.find(item => item.name !== 'bot-blink') ?? animations[0] ?? null;
    return {id, visible: rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth, bounds: {top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), left: Math.round(rect.left)}, viewport: {width: innerWidth, height: innerHeight, scrollY}, accent, runningAnimations: [...new Set(animations.map(item => item.name))], motion};
  }));
}

let browser, context, page, video;
const screenshots = [], consoleErrors = [], httpErrors = [], navigation = {};
let liveAt, concurrentCrew, completedCrew, animationEvidence, reducedMotionEvidence, browserVersion;
try {
  await waitPhase('DASHBOARD_READY');
  const {chromium} = require(playwrightRoot);
  browser = await chromium.launch({headless: true, executablePath: chromiumExecutable, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  browserVersion = browser.version();
  context = await browser.newContext({viewport: {width: 1920, height: 1080}, recordVideo: {dir: rawVideoDir, size: {width: 1920, height: 1080}}, colorScheme: 'dark'});
  page = await context.newPage(); video = page.video();
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${message.location().url || 'inline'}: ${message.text()}`.slice(0, 500)); });
  page.on('pageerror', error => consoleErrors.push(error.message.slice(0, 300)));
  page.on('response', response => {
    if (response.status() >= 400) httpErrors.push({method: response.request().method(), status: response.status(), url: new URL(response.url()).pathname});
  });
  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('#stream-state')?.textContent === 'LIVE', undefined, {timeout: 10_000}); liveAt = new Date().toISOString();
  await page.click('#operator-button'); await page.fill('#operator-token', operatorToken); await page.click('#operator-form button[type="submit"]');
  await page.getByRole('button', {name: 'Operator authenticated', exact: true}).waitFor({timeout: 10_000});

  await page.click('[data-view="crew"]');
  await page.waitForSelector('#crew-live-grid .bot-card');
  screenshots.push(await screenshot(page, '01-crew-initial.png'));
  await delay(1_500);

  await page.click('[data-view="jobs"]');
  await page.fill('#natural-task-prompt', 'Run the bounded Crew Lifecycle qualification and retain browser evidence.');
  const submission = page.waitForResponse(response => new URL(response.url()).pathname === '/api/parcels' && response.request().method() === 'POST', {timeout: 10_000});
  await page.click('#natural-task-submit');
  const submissionResponse = await submission;
  if (submissionResponse.status() !== 201) {
    const detail = await submissionResponse.text().catch(() => 'unreadable');
    throw new Error(`dashboard_task_submission_failed:${submissionResponse.status()}:${detail.slice(0, 180)}`);
  }
  const concurrentPhase = await waitPhase('CONCURRENT_STATE_READY', 30_000);

  await page.click('[data-view="crew"]');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelectorAll('#crew-live-grid .bot-card').length === 6 && document.querySelector('#crew-live-grid .bot-model-scout')?.classList.contains('bot-state-working') && document.querySelector('#crew-live-grid .bot-resource-guardian')?.classList.contains('bot-state-resource_pressure'), undefined, {timeout: 10_000});
  await page.waitForFunction(() => document.documentElement.dataset.botMotion === 'full' && [...document.querySelectorAll('#crew-live-grid .agent-bot')].every(node => !node.classList.contains('bot-offscreen')), undefined, {timeout: 10_000});
  concurrentCrew = await crewSnapshot(page);
  const animationBefore = await characterAnimationSnapshot(page); await delay(650); const animationAfter = await characterAnimationSnapshot(page);
  animationEvidence = animationBefore.map(before => {
    const after = animationAfter.find(item => item.id === before.id), elapsedTimelineMs = after?.motion && before.motion ? after.motion.currentTime - before.motion.currentTime : 0;
    return {...before, motion: before.motion ? {animation: before.motion.name, target: before.motion.target, elapsedTimelineMs, transformChanged: Boolean(after?.motion && before.motion.transform !== after.motion.transform)} : null};
  });
  if (animationEvidence.length !== 6 || animationEvidence.some(item => !item.visible || !item.runningAnimations.length || !item.accent || !item.motion || item.motion.elapsedTimelineMs < 400 || !item.motion.transformChanged)) throw new Error(`all_character_animation_evidence_missing:${JSON.stringify(animationEvidence)}`);
  screenshots.push(await screenshot(page, '02-crew-concurrent-live.png'));
  await delay(4_000);

  await page.click('#crew-live-grid .bot-resource-guardian');
  await page.waitForFunction(() => !document.querySelector('#systems-workspace')?.hidden && document.activeElement?.id === 'systems-list');
  navigation.resourceGuardian = {interaction: 'pointer', target: documentTarget(await page.evaluate(() => document.activeElement?.id)), at: new Date().toISOString()};
  screenshots.push(await screenshot(page, '03-resource-navigation.png'));
  await delay(1_500);

  await page.click('[data-view="crew"]');
  await page.locator('#crew-live-grid button.bot-parcel-coordinator').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('#jobs-workspace')?.hidden && document.activeElement?.id === 'parcel-list');
  navigation.parcelCoordinator = {interaction: 'keyboard-enter', target: documentTarget(await page.evaluate(() => document.activeElement?.id)), at: new Date().toISOString()};
  const answer = page.locator('[data-question-input]').first(); await answer.waitFor({timeout: 10_000}); await answer.fill('JSON');
  const answerResponse = page.waitForResponse(response => new URL(response.url()).pathname.includes('/questions/') && response.request().method() === 'POST', {timeout: 10_000});
  await page.locator('[data-answer-question]').first().click();
  if ((await answerResponse).status() !== 200) throw new Error('dashboard_question_answer_failed');

  await page.click('[data-view="crew"]');
  await waitPhase('QUALIFICATION_COMPLETE', 120_000);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('#crew-live-grid .bot-parcel-coordinator')?.classList.contains('bot-state-completed') && document.querySelector('#crew-live-grid .bot-quality-inspector')?.classList.contains('bot-state-completed'), undefined, {timeout: 10_000});
  completedCrew = await crewSnapshot(page);
  screenshots.push(await screenshot(page, '04-crew-completed.png'));
  await delay(2_000);

  await page.click('[data-bot-motion="reduced"]');
  await page.waitForFunction(() => document.documentElement.dataset.botMotion === 'reduced');
  await page.locator('#crew-live-grid').scrollIntoViewIfNeeded();
  reducedMotionEvidence = await page.evaluate(() => ({setting: document.documentElement.dataset.botMotion, animatedNames: [...new Set([...document.querySelectorAll('#crew-live-grid .agent-bot')].flatMap(node => node.getAnimations({subtree: true}).map(item => getComputedStyle(item.effect.target).animationName)).filter(value => value && value !== 'none'))]}));
  if (reducedMotionEvidence.setting !== 'reduced' || reducedMotionEvidence.animatedNames.some(name => name !== 'bot-blink')) throw new Error('reduced_motion_not_applied');
  screenshots.push(await screenshot(page, '05-crew-reduced-motion.png'));

  await page.click('[data-gallery-preset="mixed"]'); await page.click('[data-gallery-theme="light"]');
  await page.locator('#crew-gallery-panel').scrollIntoViewIfNeeded(); await delay(1_000);
  screenshots.push(await screenshot(page, '06-simulated-gallery-light.png', {fullPage: true}));
  await page.click('[data-gallery-state-all="stale"]'); await page.click('[data-gallery-theme="dark"]'); await delay(750);
  screenshots.push(await screenshot(page, '07-simulated-gallery-stale-dark.png', {fullPage: true}));

  await page.setViewportSize({width: 390, height: 844}); await page.click('[data-view="crew"]'); await page.evaluate(() => scrollTo(0, 0)); await delay(500);
  screenshots.push(await screenshot(page, '08-crew-mobile.png', {fullPage: true}));

  if (consoleErrors.length) throw new Error(`dashboard_console_errors:${JSON.stringify({consoleErrors, httpErrors}).slice(0, 1_500)}`);
  await context.close(); context = undefined;
  const rawVideo = await video.path(); await browser.close(); browser = undefined;
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', rawVideo, '-c:v', 'libx264', '-preset', 'fast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoFile]);
  const exit = await childExit; if (exit.code !== 0) throw new Error(`qualification_process_failed:${exit.code}:${stderr.slice(-300)}`);
  const evidenceBytes = fs.readFileSync(evidenceFile), videoBytes = fs.readFileSync(videoFile), probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,duration', '-of', 'json', videoFile], {encoding: 'utf8'}));
  const manifest = {
    schema: 'agent-control.dashboard-character-video/v1', recordedAt: new Date().toISOString(), source: 'Isolated real AgentControlService dashboard over loopback; no deployment',
    repository: {head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(), branch: execFileSync('git', ['branch', '--show-current'], {cwd: root, encoding: 'utf8'}).trim(), dirtyDiffSha256: digest(execFileSync('git', ['diff', '--binary', 'HEAD'], {cwd: root}))},
    qualification: {file: path.relative(path.dirname(manifestFile), evidenceFile), sha256: digest(evidenceBytes), bytes: evidenceBytes.length, verdict: 'PASS'},
    video: {file: path.relative(path.dirname(manifestFile), videoFile), sha256: digest(videoBytes), bytes: videoBytes.length, format: 'MP4/H.264', stream: probe.streams[0]},
    browser: {engine: 'Chromium', version: browserVersion, headless: true, liveAt, streamState: 'LIVE', consoleErrors, httpErrors},
    allCharacters: {visibleTogether: true, animatedTogetherUnderFullMotion: true, concurrentStateAt: concurrentPhase.at, visibleAnimatedDwellMs: 4_000, evidence: animationEvidence},
    actualLifecycle: {concurrentCrew, completedCrew, navigation},
    reducedMotion: reducedMotionEvidence,
    simulatedGallery: {clearlyLabelled: true, presetsRecorded: ['mixed', 'all-stale'], canvasesRecorded: ['light', 'dark'], productionStateMutated: false},
    screenshots,
    security: {operatorCredentialPersisted: false, externalCredentialsUsed: false, productionStateTouched: false},
  };
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, {mode: 0o600});
  fs.rmSync(stateDir, {recursive: true, force: true});
  process.stdout.write(`${JSON.stringify({phase: 'VIDEO_COMPLETE', verdict: 'PASS', videoFile, manifestFile, videoSha256: manifest.video.sha256, screenshots: screenshots.length})}\n`);
} catch (error) {
  child.kill('SIGTERM'); await Promise.race([childExit, delay(5_000)]); if (!childExited) child.kill('SIGKILL');
  await context?.close().catch(() => {}); await browser?.close().catch(() => {});
  process.stderr.write(`${JSON.stringify({phase: 'VIDEO_FAILED', error: error instanceof Error ? error.message : String(error)})}\n`); process.exitCode = 1;
}

function documentTarget(id) { if (!id) throw new Error('character_navigation_target_missing'); return `#${id}`; }
