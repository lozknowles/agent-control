import {createHash} from 'node:crypto';
import type {Browser, BrowserContext, Download, Page} from 'playwright-core';

export type BrowserStep =
  | {action: 'navigate'; url: string; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'}
  | {action: 'wait'; selector?: string; state?: 'load' | 'domcontentloaded' | 'networkidle'; timeoutMs?: number}
  | {action: 'extractText'; selector?: string; name: string}
  | {action: 'query'; selector: string; name: string}
  | {action: 'click'; selector: string}
  | {action: 'enterText'; selector: string; text: string}
  | {action: 'submit'; selector: string}
  | {action: 'javascript'; expression: string; name: string}
  | {action: 'screenshot'; name: string; fullPage?: boolean}
  | {action: 'download'; selector: string; name: string};

export interface BrowserSessionRequest {steps: BrowserStep[]; timeoutMs?: number; allowJavascript?: boolean; allowDownloads?: boolean; authenticated?: boolean;}
export interface BrowserSessionResult {
  engine: string; finalUrl: string; title: string; interactions: number; startedAt: string; completedAt: string;
  values: Record<string, unknown>; screenshots: Array<{name: string; mediaType: 'image/png'; base64: string; sha256: string}>;
  downloads: Array<{name: string; suggestedFilename: string; bytes: number; sha256: string}>;
  usage: {inputTokens: null; outputTokens: null; monetaryCost: null};
}
export interface BrowserEngine {run(request: BrowserSessionRequest, signal?: AbortSignal): Promise<BrowserSessionResult>;}

export class PlaywrightBrowserEngine implements BrowserEngine {
  constructor(private readonly options: {executablePath?: string; headless?: boolean; maximumSteps?: number; maximumDownloadBytes?: number} = {}) {}
  async run(request: BrowserSessionRequest, signal?: AbortSignal): Promise<BrowserSessionResult> {
    if (!Array.isArray(request.steps) || !request.steps.length || request.steps.length > (this.options.maximumSteps ?? 32)) throw new Error('browser_steps_invalid');
    if (request.authenticated) throw new Error('browser_authenticated_session_unavailable');
    const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 30_000, 1_000), 120_000), startedAt = new Date().toISOString();
    const {chromium} = await import('playwright-core');
    let browser: Browser | undefined, context: BrowserContext | undefined, page: Page | undefined;
    const values: Record<string, unknown> = {}, screenshots: BrowserSessionResult['screenshots'] = [], downloads: BrowserSessionResult['downloads'] = [];
    const abort = () => void browser?.close();
    if (signal?.aborted) throw new Error('browser_cancelled'); signal?.addEventListener('abort', abort, {once: true});
    try {
      browser = await chromium.launch({headless: this.options.headless ?? true, executablePath: this.options.executablePath});
      context = await browser.newContext({acceptDownloads: Boolean(request.allowDownloads)}); page = await context.newPage(); page.setDefaultTimeout(timeoutMs);
      for (const step of request.steps) {
        if (signal?.aborted) throw new Error('browser_cancelled');
        if (step.action === 'navigate') { assertWebUrl(step.url); await page.goto(step.url, {waitUntil: step.waitUntil ?? 'domcontentloaded', timeout: timeoutMs}); assertWebUrl(page.url()); }
        else if (step.action === 'wait') { if (step.selector) await page.locator(step.selector).waitFor({timeout: Math.min(step.timeoutMs ?? timeoutMs, timeoutMs)}); else await page.waitForLoadState(step.state ?? 'domcontentloaded', {timeout: Math.min(step.timeoutMs ?? timeoutMs, timeoutMs)}); }
        else if (step.action === 'extractText') values[step.name] = (await page.locator(step.selector ?? 'body').innerText()).slice(0, 200_000);
        else if (step.action === 'query') values[step.name] = await page.locator(step.selector).allInnerTexts();
        else if (step.action === 'click') await page.locator(step.selector).click();
        else if (step.action === 'enterText') await page.locator(step.selector).fill(step.text);
        else if (step.action === 'submit') await page.locator(step.selector).press('Enter');
        else if (step.action === 'javascript') { if (!request.allowJavascript) throw new Error('browser_javascript_not_authorised'); values[step.name] = await page.evaluate(source => (0, eval)(source), step.expression); }
        else if (step.action === 'screenshot') { const bytes = await page.screenshot({type: 'png', fullPage: step.fullPage ?? false}); screenshots.push({name: step.name, mediaType: 'image/png', base64: bytes.toString('base64'), sha256: sha(bytes)}); }
        else if (step.action === 'download') { if (!request.allowDownloads) throw new Error('browser_download_not_authorised'); const downloadPromise = page.waitForEvent('download'); await page.locator(step.selector).click(); downloads.push(await downloadRecord(step.name, await downloadPromise, this.options.maximumDownloadBytes ?? 10_000_000)); }
      }
      return {engine: 'Chromium/Playwright', finalUrl: page.url(), title: await page.title(), interactions: request.steps.length, startedAt, completedAt: new Date().toISOString(), values, screenshots, downloads, usage: {inputTokens: null, outputTokens: null, monetaryCost: null}};
    } catch (error) { if (signal?.aborted) throw new Error('browser_cancelled'); throw error; }
    finally { signal?.removeEventListener('abort', abort); await context?.close().catch(() => {}); await browser?.close().catch(() => {}); }
  }
}

function assertWebUrl(value: string) { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('browser_url_not_allowed'); }
function sha(value: Buffer) { return createHash('sha256').update(value).digest('hex'); }
async function downloadRecord(name: string, download: Download, limit: number) { const stream = await download.createReadStream(); const chunks: Buffer[] = []; let bytes = 0; for await (const chunk of stream) { const item = Buffer.from(chunk); bytes += item.length; if (bytes > limit) throw new Error('browser_download_too_large'); chunks.push(item); } const content = Buffer.concat(chunks); return {name, suggestedFilename: download.suggestedFilename(), bytes, sha256: sha(content)}; }
