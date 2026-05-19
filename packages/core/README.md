# @s-aiproviders/core

Unified AI provider abstraction.

- ✅ Streaming chat — OpenAI-compatible, Anthropic, Gemini
- ✅ Image generation — OpenAI Images & Tencent Cloud TC3
- ✅ Built-in presets for 13 providers (Token Plan, OpenAI, Claude, Gemini, DeepSeek, Kimi, Qwen, Doubao, Zhipu, DALL·E, Hunyuan ×2, CogView)
- ✅ Cross-provider model picker with capability priority queue
- ✅ Pure ESM, fully typed, **zero runtime dependencies**
- ✅ Browser-safe core; Node-only image-gen lives at the `/image-gen` subpath

## Install

```bash
pnpm add @s-aiproviders/core
```

## Usage — chat

```ts
import { createProvider } from '@s-aiproviders/core';

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
      { role: 'user', content: 'Explain SSE in one line.' },
    ],
  },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
  if (ev.type === 'usage') console.error('usage:', ev.usage);
  if (ev.type === 'error') console.error(ev.code, ev.message);
}
```

## Usage — image (Node only)

```ts
import { generateImage } from '@s-aiproviders/core/image-gen';

const r = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'dall-e-3',
  prompt: 'a minimalist cat icon',
  size: '1024x1024',
  outputDir: './out',
});
console.log(r.filePath);
```

For Tencent Cloud TC3 just point `baseURL` at `https://aiart.tencentcloudapi.com`
and pass `apiKey: "SecretId:SecretKey"` — protocol auto-detected.

## Usage — model picker

```ts
import { pickModel } from '@s-aiproviders/core';

const picked = pickModel(myProviderInventory, {
  prefer: ['image-gen', 'vision', 'text'],
});
// → first provider that has an image-gen model;
//   else first one with vision; else first one with text.
```

## API

See [the integration recipes](https://github.com/<your-org>/S-AIProviders/blob/main/skill/references/integration-as-library.md)
for the complete public surface.

## License

MIT
