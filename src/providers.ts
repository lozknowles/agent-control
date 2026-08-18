import type { ContextEnvelope } from './context.js';
import type { LaneState } from './state.js';

export interface ReasonerResponse {
  text: string;
  raw?: unknown;
}

export interface ReasonerProvider {
  readonly name: string;
  readonly supportsRotation: boolean;
  send(lane: LaneState, envelope: ContextEnvelope): Promise<ReasonerResponse>;
  rotate?(lane: LaneState): Promise<boolean>;
}

export interface ResponsesProviderOptions {
  baseUrl: string;
  model: string;
  rotateUrl?: string;
  timeoutMs?: number;
}

function outputText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text) return payload.output_text;
  const parts: string[] = [];
  for (const item of payload?.output ?? []) {
    if (typeof item?.text === 'string') parts.push(item.text);
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text);
      else if (typeof content?.output_text === 'string') parts.push(content.output_text);
    }
  }
  return parts.join('\n').trim();
}

export class ResponsesReasonerProvider implements ReasonerProvider {
  readonly name: string;
  readonly supportsRotation: boolean;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly rotateUrl?: string;
  private readonly timeoutMs: number;

  constructor(options: ResponsesProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.model = options.model;
    this.rotateUrl = options.rotateUrl;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.name = `responses:${this.model}`;
    this.supportsRotation = Boolean(this.rotateUrl);
  }

  async send(lane: LaneState, envelope: ContextEnvelope): Promise<ReasonerResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/v1/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: lane.contract.modelLock ?? this.model,
          input: envelope.text,
          stream: false,
        }),
      });
      const raw = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Reasoner HTTP ${response.status}: ${JSON.stringify(raw).slice(0, 500)}`);
      const text = outputText(raw);
      if (!text) throw new Error('Reasoner returned no output text');
      return { text, raw };
    } finally {
      clearTimeout(timer);
    }
  }

  async rotate(lane: LaneState): Promise<boolean> {
    if (!this.rotateUrl) return false;
    const response = await fetch(this.rotateUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ laneId: lane.id, currentEpoch: lane.context.epoch, nextEpoch: lane.context.epoch + 1 }),
    });
    return response.ok;
  }
}

export function providerFromEnv(): ReasonerProvider | null {
  const baseUrl = process.env.AGENT_CONTROL_REASONER_URL;
  if (!baseUrl) return null;
  return new ResponsesReasonerProvider({
    baseUrl,
    model: process.env.AGENT_CONTROL_REASONER_MODEL || 'chatgpt-window',
    rotateUrl: process.env.AGENT_CONTROL_REASONER_ROTATE_URL,
    timeoutMs: Number(process.env.AGENT_CONTROL_REASONER_TIMEOUT_MS || 120_000),
  });
}
