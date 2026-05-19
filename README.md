# S-AIProviders

> One Skill, every model. Unified AI provider abstraction — usable as an **npm package** in a project, or as a **portable Skill** invoked by an AI agent.

| Mode | Path | When to use |
|---|---|---|
| 📦 npm package | [`packages/core`](./packages/core) → `@s-aiproviders/core` | You're integrating AI into a TS/JS project (Electron, Node service, Vite app, …) |
| 🧩 Skill / CLI | [`skill/`](./skill) | You want to drive AI from agents, scripts, automations, or shell pipelines without writing integration code |

Both modes share the same provider catalogue (`packages/core` is the source of truth) so they stay in sync forever.

## What's inside

| Capability | Implementations |
|---|---|
| Streaming chat | `openai-compatible` (OpenAI / Token Plan / DeepSeek / Kimi / Qwen / Doubao / Zhipu / clones) · `anthropic` (Claude) · `gemini` |
| Image generation | OpenAI Images compatible (DALL·E / gpt-image-1 / CogView / lkeap-gated Hunyuan) · Tencent Cloud TC3 (`SubmitTextToImageJob` async) |
| Capability helpers | `pickModel({ prefer: ['image-gen', 'vision', 'text'] })` for cross-provider fallback |
| Built-in presets | 9 chat + 4 image (`BUILTIN_PRESETS`, `findPreset(id)`) |

## Quickstart — Skill / CLI

```bash
pnpm install
pnpm --filter @s-aiproviders/skill list -- --kind chat
```

```bash
# Chat
tsx skill/scripts/main.ts chat \
  --provider tokenplan --apikey "$TOKENPLAN_API_KEY" \
  --prompt "用一句话解释 SSE"

# Image
tsx skill/scripts/main.ts image \
  --provider openai-image --apikey "$OPENAI_API_KEY" \
  --prompt "a minimalist cat icon" --output ./out
```

See [`skill/SKILL.md`](./skill/SKILL.md) for the full CLI reference and EXTEND.md schema.

## Quickstart — npm package

```bash
pnpm add @s-aiproviders/core
```

```ts
import { createProvider } from '@s-aiproviders/core';

const p = createProvider('openai-compatible', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
});

const ac = new AbortController();
for await (const ev of p.chat(
  { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
}
```

See [`skill/references/integration-as-library.md`](./skill/references/integration-as-library.md) for full library recipes.

## Repository layout

```
S-AIProviders/
├── packages/
│   └── core/                          # @s-aiproviders/core (the npm package)
│       ├── src/
│       │   ├── types.ts               # IProvider / ChatRequest / ChatChunk / ProviderPreset / ...
│       │   ├── sse.ts                 # Shared SSE parser
│       │   ├── openai-compatible.ts   # Protocol impl
│       │   ├── anthropic.ts           # Protocol impl
│       │   ├── gemini.ts              # Protocol impl
│       │   ├── factory.ts             # createProvider(protocol, cfg)
│       │   ├── capabilities.ts        # pickModel / modelHasCapability
│       │   ├── presets/
│       │   │   ├── chat.ts            # 9 chat presets
│       │   │   ├── image.ts           # 4 image presets
│       │   │   └── index.ts           # BUILTIN_PRESETS / findPreset
│       │   ├── image-gen/
│       │   │   └── index.ts           # generateImage (Node-only subpath)
│       │   └── index.ts               # public surface
│       ├── package.json
│       └── tsconfig.json
└── skill/
    ├── SKILL.md                       # the Skill manifest (fed to AI agents)
    ├── scripts/
    │   ├── main.ts                    # entry: chat / image / list-presets
    │   ├── args.ts                    # zero-dep argv parser
    │   ├── config.ts                  # CLI > EXTEND.md > env > preset resolver
    │   └── commands/
    │       ├── chat.ts
    │       ├── image.ts
    │       └── list.ts
    ├── references/
    │   ├── config/extend-md-schema.md
    │   ├── config/first-time-setup.md
    │   ├── integration-as-library.md
    │   └── providers.md
    └── package.json
```

## Building & testing

```bash
pnpm install
pnpm --filter @s-aiproviders/core build
pnpm --filter @s-aiproviders/core typecheck
pnpm --filter @s-aiproviders/skill typecheck
```

## License

MIT
