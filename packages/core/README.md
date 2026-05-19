# s-aiproviders-core

> Unified AI provider abstraction. One API for OpenAI, Anthropic, Gemini, DeepSeek, Kimi, Qwen, Doubao, Zhipu, Tencent Token Plan, plus image generation via DALL·E / CogView / Hunyuan. Zero runtime dependencies.

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/%40s-aiproviders%2Fcore.svg)](https://www.npmjs.com/package/s-aiproviders-core)
[![install size](https://img.shields.io/badge/install%20size-%3C30KB-brightgreen.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#requirements)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)

---

## Highlights

- **Streaming chat** — `openai-compatible`, `anthropic`, and `gemini` dialects normalised behind a single `IProvider.chat()` returning `AsyncIterable<ChatChunk>`.
- **Image generation** — OpenAI Images compatible (DALL·E 3 / gpt-image-1 / CogView / lkeap-gated Hunyuan) and **Tencent Cloud TC3** (`SubmitTextToImageJob` async, fully signed and polled). Lives behind a Node-only subpath so it never bleeds into browser bundles.
- **13 built-in presets** — Token Plan ★ · OpenAI · Anthropic · Gemini · DeepSeek · Kimi · Qwen · Doubao · Zhipu · OpenAI Image · Hunyuan ×2 · CogView. Each carries `displayName`, `defaultBaseURL`, and `builtinModels` with `capabilities`.
- **Cross-provider model picker** — `pickModel({ prefer: ['image-gen', 'vision', 'text'] })` returns the first matching model across your enabled providers, with a `providerId` tiebreaker.
- **Zero runtime dependencies.** Pure ESM on top of platform-native `fetch` + `ReadableStream` + `AbortSignal`.
- **Browser-safe by construction.** Main entry never imports `node:*`. The Node-only image-gen module is at `s-aiproviders-core/image-gen`.
- **Honest streaming.** `chat()` never throws on network/parse failures — yields `{ type: 'error' }` instead. `AbortSignal` honoured end-to-end.
- **No globals, no env reads.** Configuration is fully caller-supplied. Suitable for SaaS, multi-tenant Electron, edge runtimes.

## Install

```bash
pnpm add s-aiproviders-core
# or
npm install s-aiproviders-core
# or
yarn add s-aiproviders-core
```

## Requirements

- Node.js **≥ 18.17** (ships native `fetch` + `ReadableStream`)
- Or any browser / runtime exposing WHATWG `fetch`, `ReadableStream`, `AbortSignal` and `TextDecoder` (Cloudflare Workers, Vercel Edge, Deno, Bun…)
- Image-gen subpath additionally requires Node-compatible `node:crypto` and `node:fs/promises`

## Streaming chat

```ts
import { createProvider } from 's-aiproviders-core';

const provider = createProvider('openai-compatible', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
});

const ac = new AbortController();
for await (const ev of provider.chat(
  {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are concise.' },
      { role: 'user',   content: 'Explain SSE in one sentence.' },
    ],
    temperature: 0.2,
  },
  ac.signal,
)) {
  switch (ev.type) {
    case 'delta': process.stdout.write(ev.text); break;
    case 'usage': console.error('usage:', ev.usage); break;
    case 'error': throw new Error(`${ev.code}: ${ev.message}`);
    case 'done':  break;
  }
}
```

The `chat()` shape is identical for Anthropic and Gemini — only the `protocol` argument changes:

```ts
const claude = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: 'https://api.anthropic.com/v1',
});

const gemini = createProvider('gemini', {
  apiKey: process.env.GEMINI_API_KEY!,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
});
```

The library extracts `system` messages for Anthropic, maps `assistant` → `model` for Gemini, and applies `max_tokens` / `maxOutputTokens` / `max_tokens` on the right side automatically.

## Image generation (Node only)

Reach for the subpath — the main entry intentionally does not re-export it.

```ts
import { generateImage } from 's-aiproviders-core/image-gen';

const result = await generateImage({
  // Auto-detected from baseURL; or set explicitly:
  // protocol: 'openai-compatible' | 'tencent-cloud',
  baseURL: 'https://api.openai.com/v1',
  apiKey:  process.env.OPENAI_API_KEY!,
  model:   'dall-e-3',
  prompt:  'a minimalist cat icon, flat, SaaS-style',
  size:    '1024x1024',
  outputDir: './generated',
});

console.log(result.filePath, `(${result.latencyMs}ms)`);
```

For **Tencent Cloud TC3** (混元生图 3.0), point at the native endpoint and pass `"SecretId:SecretKey"` as the apiKey. Protocol auto-detected; the kit handles TC3-HMAC-SHA256 signing and async job polling (default timeout 180s):

```ts
const r = await generateImage({
  baseURL: 'https://aiart.tencentcloudapi.com',
  apiKey:  `${process.env.TENCENTCLOUD_SECRET_ID}:${process.env.TENCENTCLOUD_SECRET_KEY}`,
  model:   'SubmitTextToImageJob',
  prompt:  '极简风格的猫图标',
  size:    '1024x1024',
  outputDir: './generated',
});
```

## Cross-provider model picker

```ts
import { pickModel, type ProviderLike } from 's-aiproviders-core';

const inventory: ProviderLike[] = [
  { id: 'openai',    models: [{ id: 'gpt-4o-mini',  label: 'GPT-4o mini', capabilities: ['text', 'vision'] }] },
  { id: 'tokenplan', models: [{ id: 'tc-code-latest', label: 'Auto',      capabilities: ['text'] }] },
];

const picked = pickModel(inventory, { prefer: ['vision', 'text'] });
// → { providerId: 'openai', modelId: 'gpt-4o-mini', matched: 'vision' }
```

`pickModel` walks `prefer` in order and returns the first match across your enabled providers (skipping `enabled === false`). Pass `providerId` to break ties in favour of one provider.

## Built-in presets

```ts
import {
  BUILTIN_PRESETS,    // all 13
  CHAT_PRESETS,       // 9 chat-only
  IMAGE_PRESETS,      // 4 image-only
  findPreset,         // by id
  TOKENPLAN_PRESET,
  OPENAI_PRESET,
  ANTHROPIC_PRESET,
  GEMINI_PRESET,
  DEEPSEEK_PRESET,
  KIMI_PRESET,
  QWEN_PRESET,
  DOUBAO_PRESET,
  ZHIPU_PRESET,
  OPENAI_IMAGE_PRESET,
  HUNYUAN_IMAGE_PRESET,
  HUNYUAN_IMAGE_TC3_PRESET,
  ZHIPU_IMAGE_PRESET,
} from 's-aiproviders-core';

// e.g. drive a "quick add provider" UI
CHAT_PRESETS.forEach((p) => {
  console.log(`${p.id} — ${p.displayName} (${p.protocol}) → ${p.defaultBaseURL}`);
});
```

Each preset shape:

```ts
interface ProviderPreset {
  id: string;
  displayName: string;
  protocol: 'openai-compatible' | 'anthropic' | 'gemini';
  defaultBaseURL: string;
  builtinModels: ModelInfo[];
  recommended?: boolean;
  description?: string;
  docsUrl?: string;
  extraFields?: Array<{ name: string; label: string; required: boolean }>;
  kind?: 'chat' | 'image';
}
```

## Public API

| Symbol | Origin | Browser-safe |
|---|---|---|
| `createProvider`, `OpenAICompatibleProvider`, `AnthropicProvider`, `GeminiProvider` | main | ✅ |
| `IProvider`, `ProviderInitConfig`, `ProviderProtocol`, `ChatRequest`, `ChatChunk`, `ChatMessageInput`, `ChatRole`, `ChatUsage` | main | ✅ |
| `ModelInfo`, `ModelCapability`, `ProviderKind`, `ProviderPreset` | main | ✅ |
| `BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset`, plus every individual `*_PRESET` | main | ✅ |
| `modelHasCapability`, `isMultimodal`, `pickModel`, `ProviderLike`, `PickModelOptions`, `PickedModel` | main | ✅ |
| `parseSse`, `SseEvent` | main | ✅ |
| `KIT_VERSION` | main | ✅ |
| `generateImage`, `generateImageStandalone`, `ImageGenInput`, `ImageGenResult` | `/image-gen` | ❌ Node only |

## Streaming semantics

`IProvider.chat(req, signal)` returns `AsyncIterable<ChatChunk>`:

```ts
type ChatChunk =
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: { promptTokens: number; completionTokens: number; totalTokens?: number } }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };
```

Properties:

- The iterator is **non-throwing** for protocol-level failures. Network errors, non-2xx responses, JSON parse failures → emitted as `{ type: 'error' }` and the stream terminates. You don't need a `try/catch` around `for await`.
- `AbortSignal` is wired to both `fetch()` and the SSE reader. Aborting drops the HTTP socket and exits the loop cleanly.
- `usage` events are normalised across all three dialects (OpenAI `usage`, Anthropic `message_delta.usage`, Gemini `usageMetadata`).
- The iterator always terminates — every implementation yields `{ type: 'done' }` (or `error`) before exit.

## Adapting custom OpenAI-compatible vendors

If your vendor speaks OpenAI's `/chat/completions` wire format with Bearer auth, no code change is needed:

```ts
const provider = createProvider('openai-compatible', {
  apiKey: 'your-key',
  baseURL: 'https://your-gateway.example.com/v1',
});
```

For a fundamentally different protocol, implement `IProvider`:

```ts
import type { IProvider, ChatChunk, ChatRequest } from 's-aiproviders-core';

class MyProvider implements IProvider {
  readonly protocol = 'openai-compatible' as const; // pick the closest dialect
  async *chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk> {
    // your implementation; honour signal; never throw — yield {type:'error'} instead
  }
}
```

## Use with Electron

Drop the library into your main process:

```ts
// main/services/ai.service.ts
import { createProvider } from 's-aiproviders-core';
import { ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('chat:start', async (event, args: { model: string; prompt: string; apiKey: string }) => {
  const provider = createProvider('openai-compatible', {
    apiKey: args.apiKey,
    baseURL: 'https://api.openai.com/v1',
  });
  const ac = new AbortController();
  const win = BrowserWindow.fromWebContents(event.sender);
  for await (const ev of provider.chat(
    { model: args.model, messages: [{ role: 'user', content: args.prompt }] },
    ac.signal,
  )) {
    win?.webContents.send('chat:chunk', ev);
  }
  return { ok: true };
});
```

The library is safely importable in the Electron main process. The renderer should not import the core directly to keep bundle size small — use IPC to bridge.

## Use on edge runtimes

Cloudflare Workers, Vercel Edge, Deno, Bun — all supported for the chat surface. Image-gen is **not** supported on edge runtimes (depends on `node:crypto` + `node:fs`).

## Frequently asked

**Why not just call OpenAI's SDK?** The SDK pulls its own HTTP client and retry middleware. Stacking three official SDKs in one process triples install size and yields three different error shapes. This package gives you one normalised shape across all three dialects in ~25 KB.

**Does it support tool / function calling?** Not yet. The roadmap adds a `tools` field to `ChatRequest`. Open an issue if you need it sooner.

**Does it support vision input (image messages)?** The transport supports any string content; for vision, pass the upstream's expected payload format inside the message content. A normalised image-message API is on the roadmap.

**Where do I put my API key?** Anywhere you want — the library never reads env vars or files. The optional companion CLI [`@s-aiproviders/cli`](https://www.npmjs.com/package/@s-aiproviders/cli) provides a 5-level resolution (CLI flag > project EXTEND.md > user EXTEND.md > env > preset) if you'd rather not hand-roll one.

## Companion packages

- [`@s-aiproviders/cli`](https://www.npmjs.com/package/@s-aiproviders/cli) — Skill / CLI built on top of this core. `npx @s-aiproviders/cli chat ...`. Bundles a `SKILL.md` consumable by AI agents (Claude Code / Cursor / Codebuddy …).

## License

[MIT](./LICENSE)
