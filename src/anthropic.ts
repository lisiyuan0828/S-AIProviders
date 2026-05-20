/**
 * Anthropic Claude messages API.
 *
 * Wire:
 *  - POST {baseURL}/messages
 *  - x-api-key: {apiKey}, anthropic-version: 2023-06-01
 *  - Body: { model, system?, messages, stream:true, max_tokens }
 *  - SSE event types: message_start / content_block_delta / message_delta / message_stop
 *  - delta.text_delta.text → text increment
 *  - message_delta.usage.output_tokens → completion-token increment
 */

import type { ChatChunk, ChatRequest, IProvider, ProviderInitConfig } from './types.js';
import { parseSse } from './sse.js';

export class AnthropicProvider implements IProvider {
  readonly protocol = 'anthropic' as const;
  private readonly cfg: ProviderInitConfig;

  constructor(cfg: ProviderInitConfig) {
    this.cfg = cfg;
  }

  async *chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk> {
    const url = trimSlash(this.cfg.baseURL) + '/messages';

    // Anthropic does not accept role:'system' inside messages — extract it.
    const sysMsgs = req.messages.filter((m) => m.role === 'system').map((m) => m.content);
    const userAssistant = req.messages.filter((m) => m.role !== 'system');

    const body = {
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      ...(sysMsgs.length > 0 ? { system: sysMsgs.join('\n\n') } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      stream: true,
      messages: userAssistant,
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.cfg.apiKey,
          'anthropic-version': '2023-06-01',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      yield { type: 'error', code: 'NETWORK', message: String(err) };
      return;
    }

    if (!res.ok || !res.body) {
      const text = await safeReadText(res);
      yield {
        type: 'error',
        code: `HTTP_${res.status}`,
        message: text || `Anthropic returned HTTP ${res.status}`,
      };
      return;
    }

    let promptTokens = 0;
    let completionTokens = 0;

    for await (const ev of parseSse(res.body, signal)) {
      let json: AnthropicEvent;
      try {
        json = JSON.parse(ev.data);
      } catch {
        continue;
      }

      switch (json.type) {
        case 'message_start':
          if (json.message?.usage?.input_tokens) {
            promptTokens = json.message.usage.input_tokens;
          }
          break;
        case 'content_block_delta':
          if (json.delta?.type === 'text_delta' && typeof json.delta.text === 'string') {
            yield { type: 'delta', text: json.delta.text };
          }
          break;
        case 'message_delta':
          if (json.usage?.output_tokens !== undefined) {
            completionTokens = json.usage.output_tokens;
          }
          break;
        case 'message_stop':
          yield {
            type: 'usage',
            usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
          };
          yield { type: 'done' };
          return;
      }
    }

    yield { type: 'done' };
  }
}

interface AnthropicEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'ping'
    | string;
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string };
  usage?: { output_tokens?: number };
}

function trimSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}
async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
