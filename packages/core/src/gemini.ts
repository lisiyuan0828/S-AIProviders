/**
 * Google Generative Language API (streamGenerateContent, SSE).
 *
 * Wire:
 *  - POST {baseURL}/models/{model}:streamGenerateContent?alt=sse&key={apiKey}
 *  - Body: { contents:[{role:'user'|'model', parts:[{text}]}], systemInstruction?, generationConfig }
 *  - SSE: `data: {...JSON}\n\n`
 *  - Delta path: candidates[0].content.parts[0].text
 *  - usageMetadata: promptTokenCount / candidatesTokenCount
 */

import type { ChatChunk, ChatRequest, IProvider, ProviderInitConfig } from './types.js';
import { parseSse } from './sse.js';

export class GeminiProvider implements IProvider {
  readonly protocol = 'gemini' as const;
  private readonly cfg: ProviderInitConfig;

  constructor(cfg: ProviderInitConfig) {
    this.cfg = cfg;
  }

  async *chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk> {
    const sysMsg = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const url =
      trimSlash(this.cfg.baseURL) +
      `/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.cfg.apiKey)}`;

    const body = {
      contents,
      ...(sysMsg ? { systemInstruction: { role: 'system', parts: [{ text: sysMsg }] } } : {}),
      generationConfig: {
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.maxTokens !== undefined ? { maxOutputTokens: req.maxTokens } : {}),
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
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
        message: text || `Gemini returned HTTP ${res.status}`,
      };
      return;
    }

    for await (const ev of parseSse(res.body, signal)) {
      let json: GeminiChunk;
      try {
        json = JSON.parse(ev.data);
      } catch {
        continue;
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.length > 0) {
        yield { type: 'delta', text };
      }
      if (json.usageMetadata) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: json.usageMetadata.promptTokenCount ?? 0,
            completionTokens: json.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: json.usageMetadata.totalTokenCount,
          },
        };
      }
    }

    yield { type: 'done' };
  }
}

interface GeminiChunk {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
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
