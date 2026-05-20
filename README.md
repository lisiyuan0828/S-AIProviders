# s-aiproviders

> One package, every model. A unified, dependency-free AI provider toolkit that ships **both a TypeScript library and a CLI in a single npm install** — so you can `import { createProvider }` from your app and `npx s-aiproviders chat` from your terminal with the exact same protocol layer underneath.

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/s-aiproviders.svg)](https://www.npmjs.com/package/s-aiproviders)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#requirements)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)

---

## Table of contents

- [Why s-aiproviders](#why-s-aiproviders)
- [Feature matrix](#feature-matrix)
- [Provider catalogue](#provider-catalogue)
- [Quick start](#quick-start)
- [Three ways to consume](#three-ways-to-consume)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Building from source](#building-from-source)
- [Comparison with similar tools](#comparison-with-similar-tools)
- [FAQ](#faq)
- [Versioning](#versioning)
- [License](#license)

---

## Why s-aiproviders

Every project that touches AI ends up rewriting the same wiring: parse SSE, normalise the three big chat dialects, juggle API keys, support both DALL·E and Tencent Cloud's async signed image API, build a provider list for the settings UI. **s-aiproviders** distills that wiring into a single, dependency-free TypeScript package that can be consumed in **three** ways without changing the underlying contract:

1. As an **npm library** dropped into a Node service, an Electron main process, or a Vite app.
2. As a **CLI** (`npx s-aiproviders` or install globally) for shell scripts, automations, and `cron`.
3. As an **AI-Agent Skill** (Claude Code / Cursor / Codebuddy compatible) — agents read the bundled `SKILL.md` and call the CLI on the user's behalf.

**Design tenets**

- **Zero runtime dependencies.** Pure TypeScript on top of the platform's `fetch` + `ReadableStream`. No `openai`, no `langchain`, no `axios`.
- **Single source of truth.** Library, CLI, and Skill are the same install. The CLI is a thin wrapper over the same exported API.
- **Browser-safe by construction.** The main entry never imports `node:*`. Node-only image generation lives behind the `s-aiproviders/image-gen` subpath, so renderer bundles stay clean.
- **Honest streaming semantics.** `chat()` is an `AsyncIterable<ChatChunk>`. It never throws on network or parse errors — it yields `{ type: 'error' }` so callers don't need defensive try/catch around `for await`. `AbortSignal` is honoured end-to-end.
- **Explicit boundaries.** The library never reads environment variables, files, or globals. All configuration is caller-supplied — perfect for SaaS, multi-tenant Electron apps, and serverless.

## Feature matrix

| Capability | Implementations | Browser-safe |
|---|---|---|
| Streaming chat | `openai-compatible` · `anthropic` · `gemini` | ✅ |
| Image generation (text-to-image) | OpenAI Images compatible · Tencent Cloud TC3 (`SubmitTextToImageJob`, async polled) | ⚠️ Node only |
| Cross-provider model picker | Capability-priority fallback (`prefer: ['image-gen', 'vision', 'text']`) | ✅ |
| Built-in presets | 9 chat + 4 image (see below) | ✅ |
| Live model discovery | `provider.listModels()` for OpenAI-compatible endpoints | ✅ |
| SSE primitive | Reusable `parseSse(stream, signal)` | ✅ |
| Token-usage reporting | Normalised across all three dialects | ✅ |
| Cancellation | Native `AbortSignal` propagation | ✅ |

## Provider catalogue

| ID | Display | Protocol | Default base URL | Notes |
|---|---|---|---|---|
| `tokenplan` ★ | 腾讯云 Token Plan | openai-compatible | `https://api.lkeap.cloud.tencent.com/plan/v3` | One subscription, many upstream models. Recommended default in China. |
| `openai` | OpenAI | openai-compatible | `https://api.openai.com/v1` | GPT-4o family. |
| `anthropic` | Anthropic | anthropic | `https://api.anthropic.com/v1` | Claude Opus / Sonnet. |
| `gemini` | Google Gemini | gemini | `https://generativelanguage.googleapis.com/v1beta` | Server-Sent Events via `alt=sse`. |
| `deepseek` | DeepSeek | openai-compatible | `https://api.deepseek.com/v1` | Reasoner & chat. |
| `kimi` | Moonshot Kimi | openai-compatible | `https://api.moonshot.cn/v1` | 128k context. |
| `qwen` | 通义千问 | openai-compatible | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Aliyun DashScope, OpenAI-compat mode. |
| `doubao` | 字节豆包 / 火山方舟 | openai-compatible | `https://ark.cn-beijing.volces.com/api/v3` | Volcengine ARK. |
| `zhipu` | 智谱 GLM | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | GLM-4 family. |
| `openai-image` | OpenAI Image | openai-compatible | `https://api.openai.com/v1` | DALL·E 3 / gpt-image-1. |
| `hunyuan-image` | 腾讯混元生图 (lkeap) | openai-compatible | `https://api.lkeap.cloud.tencent.com/v1` | OpenAI-compat gateway in front of Hunyuan. |
| `hunyuan-image-tc3` | 腾讯混元生图 3.0 | TC3-signed async | `https://aiart.tencentcloudapi.com` | `apiKey: "SecretId:SecretKey"`. |
| `zhipu-image` | 智谱 CogView | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | CogView-3 / 3-Plus. |

Run `npx s-aiproviders list-presets --json` for the machine-readable catalogue, or `import { BUILTIN_PRESETS } from 's-aiproviders'`.

> Adding a new OpenAI-compatible vendor is a one-line change: pick `--provider openai` and pass `--baseurl https://your-gateway/v1`. No code change needed.

## Quick start

### Try it without installing

```bash
npx s-aiproviders list-presets

npx s-aiproviders chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --prompt "Explain Server-Sent Events in one line."
```

### Install as a library

```bash
pnpm add s-aiproviders
# or: npm install s-aiproviders
# or: yarn add s-aiproviders
```

```ts
import { createProvider } from 's-aiproviders';

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
      { role: 'user', content: 'Explain SSE in one sentence.' },
    ],
  },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
  if (ev.type === 'usage') console.error('usage:', ev.usage);
  if (ev.type === 'error') throw new Error(`${ev.code}: ${ev.message}`);
}
```

### Generate an image (Node)

```ts
import { generateImage } from 's-aiproviders/image-gen';

const { filePath } = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-image-1',
  prompt: 'a tiny ceramic capybara reading a book',
  size: '1024x1024',
  outputDir: './output',
});
console.log('saved:', filePath);
```

## Three ways to consume

| # | Mode | Command | Best for |
|---|---|---|---|
| 1 | **Zero-install** | `npx s-aiproviders <cmd>` | One-off tasks, CI/CD, sandboxes |
| 2 | **Global CLI** | `npm i -g s-aiproviders` then `s-aiproviders <cmd>` | Daily terminal workflows |
| 3 | **Library import** | `pnpm add s-aiproviders` then `import { createProvider }` | Embedding AI into your own product (Electron / Node service / Vite) |

Use as an **AI-Agent Skill**: after install, the package ships `SKILL.md` and `references/`. Symlink them into your agent's skills directory (e.g. `~/.claude/skills/s-aiproviders/`) and the agent will be able to read the manifest and invoke the CLI on the user's behalf. Step-by-step instructions: [`INSTALL.md`](./INSTALL.md).

## Configuration

The CLI resolves every parameter (`provider` / `apiKey` / `baseURL` / `model`) by walking five sources in priority order:

| Priority | Source | Example |
|---|---|---|
| 1 (highest) | CLI flags | `--apikey sk-xxx` |
| 2 | Project-level `./.s-aiproviders/EXTEND.md` | committed via `EXTEND.example.md` |
| 3 | User-level `~/.s-aiproviders/EXTEND.md` | personal defaults |
| 4 | Environment variables | `SAIP_API_KEY`, `OPENAI_API_KEY`, … |
| 5 (lowest) | Preset defaults | `BUILTIN_PRESETS[*].defaultBaseURL`, first `builtinModels[0]` |

### Generic environment variables

`SAIP_PROVIDER` · `SAIP_API_KEY` · `SAIP_BASE_URL` · `SAIP_MODEL` · `SAIP_PROTOCOL`

### Per-provider environment variables

| Provider | Variable(s) |
|---|---|
| Token Plan | `TOKENPLAN_API_KEY` |
| OpenAI / OpenAI Image | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` (alias `GOOGLE_API_KEY`) |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Kimi | `MOONSHOT_API_KEY` (alias `KIMI_API_KEY`) |
| Qwen | `DASHSCOPE_API_KEY` (alias `QWEN_API_KEY`) |
| Doubao | `ARK_API_KEY` (alias `DOUBAO_API_KEY`) |
| Zhipu / Zhipu Image | `ZHIPU_API_KEY` (alias `BIGMODEL_API_KEY`) |
| Hunyuan (lkeap) | `LKEAP_API_KEY` (alias `HUNYUAN_API_KEY`) |
| Hunyuan TC3 | `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY` |

### `EXTEND.md` schema

```yaml
default_provider: tokenplan
default_model:
  tokenplan: tc-code-latest
  openai: gpt-4o-mini
providers:
  tokenplan:
    api_key: sk-tplan-xxxxx
    base_url: https://api.lkeap.cloud.tencent.com/plan/v3   # optional
    model:    tc-code-latest                                 # optional
  openai:
    api_key: sk-xxxxx
```

Full schema and security notes: [`references/config/extend-md-schema.md`](./references/config/extend-md-schema.md).

## API reference

All exports below are tree-shakable and ship complete `.d.ts` types.

### Entry points

| Specifier | Surface |
|---|---|
| `s-aiproviders` | Library API — types, provider factory, presets, capability helpers, SSE parser. **Browser-safe.** |
| `s-aiproviders/image-gen` | `generateImage()` — Node-only (uses `node:crypto`, `node:fs`). |
| `s-aiproviders/presets` | Just the preset catalogue, when you want to tree-shake more aggressively. |

### Types

| Symbol | Description |
|---|---|
| `ProviderProtocol` | `'openai-compatible' \| 'anthropic' \| 'gemini'` |
| `ChatRole` | `'user' \| 'assistant' \| 'system'` |
| `ChatMessageInput` | `{ role: ChatRole; content: string }` |
| `ChatRequest` | `{ model; messages; temperature?; maxTokens? }` |
| `ChatChunk` | Discriminated union of `delta` / `usage` / `done` / `error` |
| `ChatUsage` | `{ promptTokens; completionTokens; totalTokens? }` |
| `ProviderInitConfig` | `{ apiKey; baseURL; timeoutMs? }` |
| `IProvider` | `{ protocol; chat(req, signal); listModels?() }` |
| `ModelInfo` | `{ id; label; contextWindow?; description?; capabilities? }` |
| `ModelCapability` | `'text' \| 'vision' \| 'image-gen' \| 'video-gen'` |
| `ProviderKind` | `'chat' \| 'image'` |
| `ProviderPreset` | Full preset shape (id, displayName, protocol, defaultBaseURL, builtinModels, …) |

### Provider factory

| Symbol | Signature |
|---|---|
| `createProvider` | `(protocol, cfg) => IProvider` |
| `OpenAICompatibleProvider` / `AnthropicProvider` / `GeminiProvider` | Direct class access if you need it |

### Presets

`BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset(id)`, plus every individual constant: `TOKENPLAN_PRESET`, `OPENAI_PRESET`, `ANTHROPIC_PRESET`, `GEMINI_PRESET`, `DEEPSEEK_PRESET`, `KIMI_PRESET`, `QWEN_PRESET`, `DOUBAO_PRESET`, `ZHIPU_PRESET`, `OPENAI_IMAGE_PRESET`, `HUNYUAN_IMAGE_PRESET`, `HUNYUAN_IMAGE_TC3_PRESET`, `ZHIPU_IMAGE_PRESET`.

### Capability helpers

| Symbol | Signature |
|---|---|
| `modelHasCapability` | `(model, cap) => boolean` |
| `isMultimodal` | `(model) => boolean` |
| `pickModel` | `(providers, { prefer, providerId? }) => PickedModel \| null` |

### SSE primitive (advanced)

| Symbol | Signature |
|---|---|
| `parseSse` | `(stream: ReadableStream<Uint8Array>, signal: AbortSignal) => AsyncGenerator<SseEvent>` |

### `s-aiproviders/image-gen` (Node-only subpath)

| Symbol | Signature |
|---|---|
| `generateImage` | `(input: ImageGenInput) => Promise<ImageGenResult>` |
| `generateImageStandalone` | Backward-compat alias |
| `ImageGenInput` | `{ protocol?; baseURL; apiKey; model; prompt; size; outputDir?; fileBaseName? }` |
| `ImageGenResult` | `{ filePath; size; model; latencyMs; revisedPrompt? }` |

### CLI — `s-aiproviders`

```
s-aiproviders <command> [flags]

Commands:
  chat              Stream a chat completion (text)
  image             Generate an image (PNG)
  list-presets      List built-in providers
  help              Show help

Common flags:
  --provider <id>     Preset id
  --apikey  <key>     API key (Tencent: "SecretId:SecretKey")
  --baseurl <url>     Override preset's default base URL
  --model   <id>      Upstream model id
  --json              Machine-readable JSON output
  --verbose           Print resolution info to stderr

chat-only:
  --prompt <text> | --promptfile <path> | (or pipe via stdin)
  --system <text>
  --temperature <n>
  --maxtokens <n>

image-only:
  --prompt <text>     Required
  --size <WxH>        Default 1024x1024
  --output <dir>      Default ./output
  --name <base>       Output file base name (no extension)

list-presets:
  --kind chat|image
  --json
```

Exit codes: `0` ok · `1` runtime error (network / HTTP / Tencent timeout) · `2` user error (bad flag, missing apiKey).

Full integration recipes (Electron main process, multi-provider fallback, Node service patterns): [`references/integration-as-library.md`](./references/integration-as-library.md).

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Consumer surface                      │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  Library API   │  │   CLI (npx)    │  │ Agent Skill │ │
│  │   (TS import)  │  │ s-aiproviders  │  │  SKILL.md   │ │
│  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘ │
└───────────┼───────────────────┼─────────────────┼────────┘
            │                   │                 │
            ▼                   ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                     s-aiproviders                         │
│                                                           │
│  createProvider() ──► IProvider                          │
│      │                  │                                 │
│      ├─ openai-compatible.ts   (chat/completions + SSE)  │
│      ├─ anthropic.ts           (messages + SSE)          │
│      ├─ gemini.ts              (streamGenerateContent)   │
│      └─ image-gen/             (DALL·E + TC3 async)      │
│                                                           │
│  presets/{chat,image}.ts  · capabilities.ts (pickModel)  │
│  sse.ts (shared SSE parser, fetch ReadableStream → events)│
│  cli/ (chat | image | list-presets — wraps the API above) │
└──────────────────────────────────────────────────────────┘
            │
            ▼
   fetch + ReadableStream + AbortSignal
   (no SDK dependencies, no axios, no OpenAI client)
```

The core never reaches "outside" — no env vars, no `fs`, no globals — except in the explicitly Node-only `image-gen` subpath and the CLI runtime. This keeps the chat surface fully isomorphic between browser, Electron renderer, Cloudflare Workers, Vercel Edge, and any other JS runtime that exposes WHATWG `fetch`.

## Repository layout

```
S-AIProviders/
├── src/
│   ├── index.ts                   # public library surface (browser-safe)
│   ├── types.ts                   # IProvider · ChatRequest · ChatChunk · ProviderPreset
│   ├── sse.ts                     # shared SSE parser
│   ├── openai-compatible.ts       # protocol implementation
│   ├── anthropic.ts               # protocol implementation
│   ├── gemini.ts                  # protocol implementation
│   ├── factory.ts                 # createProvider(protocol, cfg)
│   ├── capabilities.ts            # pickModel · modelHasCapability · isMultimodal
│   ├── presets/{chat,image,index}.ts   # 9 chat + 4 image presets
│   ├── image-gen/index.ts         # generateImage (Node-only subpath)
│   └── cli/                       # the s-aiproviders CLI (bin entry)
│       ├── main.ts                #   entry — chat/image/list-presets
│       ├── args.ts                #   zero-dep argv parser
│       ├── config.ts              #   CLI > EXTEND.md > env > preset resolver
│       └── commands/{chat,image,list}.ts
├── references/                    # documentation read by the AI-Agent Skill
│   ├── config/extend-md-schema.md
│   ├── config/first-time-setup.md
│   ├── integration-as-library.md
│   └── providers.md
├── scripts/
│   └── postbuild-shebang.cjs      # restores #!/usr/bin/env node + chmod +x
├── SKILL.md                       # Skill manifest read by AI agents
├── INSTALL.md                     # end-user install guide
├── README.md / README.zh.md
├── package.json
├── tsconfig.json
└── dist/                          # build output (gitignored)
```

## Building from source

### Requirements

- Node.js **≥ 18.17** (uses native `fetch` and `ReadableStream`)
- pnpm **≥ 9** (npm / yarn also work)

### Common workflows

```bash
pnpm install         # install deps
pnpm build           # tsc → dist/  +  restore shebang on dist/cli/main.js
pnpm typecheck       # strict tsc --noEmit
pnpm clean           # remove dist/

# Run CLI in dev mode (no build needed, uses tsx)
pnpm chat  -- --provider tokenplan --prompt "hi"
pnpm image -- --provider openai-image --prompt "a cat" --size 1024x1024
pnpm list  -- --kind chat

# Run CLI from compiled output
node dist/cli/main.js list-presets

# Pack the tarball locally and verify it in a sandbox
pnpm pack --pack-destination /tmp/saip
mkdir -p /tmp/saip-test && cd /tmp/saip-test && npm init -y >/dev/null
npm install /tmp/saip/s-aiproviders-*.tgz
npx s-aiproviders list-presets
```

### Publishing

`prepublishOnly` runs `clean` + `build`. `publishConfig.registry` is locked to `https://registry.npmjs.org/` with `access: public`, so the package is always published to the public npm registry regardless of your local `~/.npmrc` mirror.

```bash
pnpm build
npm publish        # uses publishConfig in package.json
```

## Comparison with similar tools

| | s-aiproviders | `openai` SDK | `@anthropic-ai/sdk` | `langchain` | `ai` (Vercel) |
|---|---|---|---|---|---|
| Multi-provider | ✅ 13 presets, `pickModel` fallback | ❌ OpenAI only | ❌ Claude only | ✅ but heavyweight | ✅ |
| Runtime deps | **0** | several | several | many | several |
| Browser-safe core | ✅ | partial | partial | ❌ | ✅ |
| Image generation | ✅ OpenAI + Tencent TC3 | ✅ OpenAI only | ❌ | ✅ | ❌ |
| Streaming model | `AsyncIterable<ChatChunk>` | mixed (event emitters / streams) | iterators | callbacks / streams | hooks (React-centric) |
| CLI bundled | ✅ same install | ❌ | ❌ | ❌ | ❌ |
| AI-Agent Skill bundled | ✅ | ❌ | ❌ | ❌ | ❌ |
| TypeScript types | bundled | bundled | bundled | bundled | bundled |
| Install size | ~60 KB tarball | hundreds of KB | hundreds of KB | MBs | hundreds of KB |

s-aiproviders is intentionally minimal — it does not aim to replace `langchain`'s agent loops or `ai`'s React Server Component bindings. It is the layer **below** those frameworks: a portable wire-format adapter that you can use directly, or that you can build a heavier framework on top of.

## FAQ

**Q: Does it support tool/function calling?**
Not yet. The `chat()` shape is text-only. Tool calling is on the roadmap behind a `tools` field in `ChatRequest`. Open an issue if you need it sooner.

**Q: Why not just use the official SDKs?**
The official SDKs each pull in their own HTTP client, their own retry middleware, and their own streaming abstraction. Stacking three of them in the same process bloats install size and produces three different error shapes. s-aiproviders unifies all three behind one small ESM module that uses the platform's native `fetch`.

**Q: Can I add a provider that isn't in the catalogue?**
Yes — if it speaks the OpenAI `/chat/completions` wire format, just pass `--provider openai --baseurl https://your-gateway/v1`. If it's a fundamentally different protocol, implement `IProvider` and add it to the factory; PRs welcome.

**Q: Is the image-gen module browser-safe?**
No. It uses `node:crypto` for TC3 signing and `node:fs` for output. The package's main entry intentionally does not re-export it; reach for `s-aiproviders/image-gen`. In a Vite/Webpack browser build this is a hint to externalise — or simply don't import that subpath from renderer code.

**Q: How does cancellation work?**
Pass an `AbortSignal` to `chat()`. The signal is forwarded to `fetch` and to the SSE reader, so an abort severs both the HTTP socket and the iterator. The CLI maps `SIGINT` (Ctrl-C) to the same signal.

**Q: How is API-key safety handled?**
The library never logs, persists, or transmits the key beyond the upstream `Authorization` header. The CLI loads keys via the priority chain documented above; project-level `EXTEND.md` should be `.gitignore`d. There is no telemetry.

**Q: Does it work in Cloudflare Workers / Vercel Edge / Bun / Deno?**
The chat core works on any runtime exposing WHATWG `fetch` + `ReadableStream` + `AbortSignal`. Image-gen requires a Node-compatible `node:crypto` + `node:fs`; it does **not** run on edge runtimes.

## Versioning

s-aiproviders follows semantic versioning starting at `0.1.x`. While the version is `0.x`, breaking changes may land between minor releases (and will always be called out in the CHANGELOG). The first `1.0.0` will lock the public API.

## License

[MIT](./LICENSE) © s-aiproviders contributors.
