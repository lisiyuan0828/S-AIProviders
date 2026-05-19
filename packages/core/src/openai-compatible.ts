/**
 * OpenAI-compatible protocol.
 * Used by: OpenAI, Tencent Cloud Token Plan, DeepSeek, Qwen (Dashscope compat),
 * Kimi (Moonshot), GLM (Zhipu), Doubao (Volcengine ARK), and any clone
 * exposing /chat/completions with Bearer auth.
 *
 * Wire:
 *  - POST {baseURL}/chat/completions
 *  - Authorization: Bearer {apiKey}
 *  - Body: { model, messages, stream:true, ... }
 *  - SSE frames: `data: {...}\n\n`, terminated by `data: [DONE]`
 *  - Delta path: choices[0].delta.content
 *  - Final usage: usage.prompt_tokens / completion_tokens
 */

import type { ChatChunk, ChatRequest, IProvider, ProviderInitConfig } from './types';
import { parseSse } from './sse';

export class OpenAICompatibleProvider implements IProvider {
  readonly protocol = 'openai-compatible' as const;
  private readonly cfg: ProviderInitConfig;

  constructor(cfg: ProviderInitConfig) {
    this.cfg = cfg;
  }

  async *chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk> {
    const url = trimSlash(this.cfg.baseURL) + '/chat/completions';
    const body = {
      model: req.model,
      messages: req.messages,
      stream: true,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
      stream_options: { include_usage: true },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
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
        message: text || `Upstream returned HTTP ${res.status}`,
      };
      return;
    }

    for await (const ev of parseSse(res.body, signal)) {
      const data = ev.data.trim();
      if (data === '[DONE]') {
        yield { type: 'done' };
        return;
      }
      let json: OpenAIStreamChunk;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }

      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        yield { type: 'delta', text: delta };
      }
      if (json.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: json.usage.prompt_tokens ?? 0,
            completionTokens: json.usage.completion_tokens ?? 0,
            totalTokens: json.usage.total_tokens,
          },
        };
      }
    }

    yield { type: 'done' };
  }

  async listModels(): Promise<{ id: string; label?: string }[] | null> {
    const url = trimSlash(this.cfg.baseURL) + '/models';
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => ({ id: m.id, label: m.id }));
    } catch {
      return null;
    }
  }
}

interface OpenAIStreamChunk {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
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
