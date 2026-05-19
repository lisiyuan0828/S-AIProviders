# Library integration (`@s-aiproviders/core`)

Use this guide when the user wants AI capabilities embedded into their own
codebase — not invoked via Skill CLI.

## Install

```bash
pnpm add @s-aiproviders/core
# or
npm install @s-aiproviders/core
```

The package ships pure ESM with TypeScript types. Browser-safe entry:
`@s-aiproviders/core`. Node-only entry: `@s-aiproviders/core/image-gen`.

## Recipe 1 — minimal streaming chat

```ts
import { createProvider } from '@s-aiproviders/core';

const provider = createProvider('openai-compatible', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
});

const ac = new AbortController();
let full = '';
for await (const ev of provider.chat(
  {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are concise.' },
      { role: 'user', content: 'Explain SSE in one sentence.' },
    ],
  },
  ac.signal,
)) {
  if (ev.type === 'delta') full += ev.text;
  if (ev.type === 'usage') console.log('usage:', ev.usage);
  if (ev.type === 'error') throw new Error(`${ev.code}: ${ev.message}`);
}
console.log(full);
```

## Recipe 2 — Anthropic / Gemini

```ts
import { createProvider } from '@s-aiproviders/core';

const claude = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: 'https://api.anthropic.com/v1',
});

const gemini = createProvider('gemini', {
  apiKey: process.env.GEMINI_API_KEY!,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
});
```

The `chat()` shape is identical across all three protocols.

## Recipe 3 — multi-provider fallback with `pickModel`

```ts
import { pickModel, type ProviderLike } from '@s-aiproviders/core';

const inventory: ProviderLike[] = [
  { id: 'openai',   models: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini', capabilities: ['text', 'vision'] }] },
  { id: 'tokenplan',models: [{ id: 'tc-code-latest', label: 'Auto', capabilities: ['text'] }] },
];

const picked = pickModel(inventory, { prefer: ['vision', 'text'] });
// → { providerId: 'openai', modelId: 'gpt-4o-mini', matched: 'vision' }
```

## Recipe 4 — image generation (Node)

```ts
import { generateImage } from '@s-aiproviders/core/image-gen';

const result = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'dall-e-3',
  prompt: 'a flat minimalist cat icon, SaaS-style',
  size: '1024x1024',
  outputDir: './generated',
});
console.log(result.filePath, `${result.latencyMs}ms`);
```

For Tencent Cloud TC3 (混元生图 3.0), pass `apiKey: "SecretId:SecretKey"` and
`baseURL: 'https://aiart.tencentcloudapi.com'` — the protocol is auto-detected.

## Recipe 5 — Electron main-process integration

`packages/core` is plain ESM. In an Electron main process:

```ts
// main/services/ai.service.ts
import { createProvider } from '@s-aiproviders/core';
import { ipcMain } from 'electron';

ipcMain.handle('chat:send', async (_evt, args: { model: string; prompt: string; apiKey: string }) => {
  const p = createProvider('openai-compatible', {
    apiKey: args.apiKey,
    baseURL: 'https://api.openai.com/v1',
  });
  const ac = new AbortController();
  let out = '';
  for await (const ev of p.chat({ model: args.model, messages: [{ role: 'user', content: args.prompt }] }, ac.signal)) {
    if (ev.type === 'delta') out += ev.text;
    if (ev.type === 'error') return { ok: false, error: ev.message };
  }
  return { ok: true, content: out };
});
```

For streaming back to the renderer, replace the `out += ...` accumulation
with `webContents.send('chat:chunk', ev)` per delta event.

## Recipe 6 — typed presets (UI quick-add)

```ts
import { CHAT_PRESETS, IMAGE_PRESETS } from '@s-aiproviders/core';

// Render a "Quick add provider" dropdown:
CHAT_PRESETS.forEach((p) => {
  console.log(`${p.id} — ${p.displayName} (${p.protocol})`);
});
```

## Public API surface

| Symbol | Origin | Browser-safe? |
|---|---|---|
| `createProvider`, `OpenAICompatibleProvider`, `AnthropicProvider`, `GeminiProvider` | main entry | ✅ |
| `IProvider`, `ProviderInitConfig`, `ChatRequest`, `ChatChunk`, `ChatMessageInput`, `ChatUsage`, `ChatRole`, `ProviderProtocol` | main entry | ✅ |
| `ModelInfo`, `ModelCapability`, `ProviderKind`, `ProviderPreset` | main entry | ✅ |
| `BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset` + every individual `*_PRESET` | main entry | ✅ |
| `pickModel`, `modelHasCapability`, `isMultimodal` | main entry | ✅ |
| `parseSse`, `SseEvent` | main entry | ✅ |
| `generateImage`, `generateImageStandalone`, `ImageGenInput`, `ImageGenResult` | `/image-gen` subpath | ❌ Node only |

## Notes

- The package never reads env vars or files. Configuration is fully
  caller-controlled — perfect for SaaS / Electron / serverless.
- `chat()` never throws on protocol errors; consume `{ type: 'error' }`
  events instead.
- `AbortSignal` is honoured for both fetch + SSE reading; passing an aborted
  signal yields nothing and exits cleanly.
