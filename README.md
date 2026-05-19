# S-AIProviders

> One package, every model. A unified AI provider abstraction shipped in two interchangeable forms — an installable **TypeScript library** and a runnable **CLI / Skill** — sharing a single source of truth.

[English](./README.md) · [简体中文](./README.zh.md)

[![npm core](https://img.shields.io/npm/v/%40s-aiproviders%2Fcore.svg?label=%40s-aiproviders%2Fcore)](https://www.npmjs.com/package/s-aiproviders-core)
[![npm cli](https://img.shields.io/npm/v/%40s-aiproviders%2Fcli.svg?label=%40s-aiproviders%2Fcli)](https://www.npmjs.com/package/@s-aiproviders/cli)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#requirements)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)

---

## Table of contents

- [Why S-AIProviders](#why-s-aiproviders)
- [Feature matrix](#feature-matrix)
- [Provider catalogue](#provider-catalogue)
- [Quick start](#quick-start)
- [Four ways to consume](#four-ways-to-consume)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Building from source](#building-from-source)
- [Publishing](#publishing)
- [Comparison with similar tools](#comparison-with-similar-tools)
- [FAQ](#faq)
- [Versioning](#versioning)
- [License](#license)

---

## Why S-AIProviders

Every project that touches AI ends up rewriting the same wiring: parse SSE, normalise the three big chat dialects, juggle API keys, support both DALL·E and Tencent Cloud's async signed image API, build a provider list for the settings UI. S-AIProviders distills that wiring into a single, dependency-free TypeScript core that can be consumed in **four** ways without changing the underlying contract:

1. As an **npm library** dropped into a Node service, an Electron main process, or a Vite app.
2. As a **CLI** invoked from shell scripts, automations, or `cron`.
3. As a **zero-install one-liner** via `npx @s-aiproviders/cli`.
4. As an **AI-Agent Skill** (Claude Code / Cursor / Codebuddy compatible) — agents read the bundled `SKILL.md` and call the CLI on the user's behalf.

**Design tenets**

- **Zero runtime dependencies.** The core ships pure TypeScript on top of the platform's `fetch` + `ReadableStream`. No `openai`, no `langchain`, no `axios`.
- **Single source of truth.** The provider catalogue, capability metadata, and protocol implementations all live in `s-aiproviders-core`. The CLI is a thin wrapper over the same code.
- **Browser-safe by construction.** The main entry never imports `node:*`. Node-only image generation lives behind the `/image-gen` subpath, so renderer bundles stay clean.
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

Run `npx @s-aiproviders/cli list-presets --json` for the machine-readable catalogue, or `import { BUILTIN_PRESETS } from 's-aiproviders-core'`.

> Adding a new OpenAI-compatible vendor is a one-line change: pick `--provider openai` and pass `--baseurl https://your-gateway/v1`. No code change needed.

## Quick start

### Try it without installing

```bash
npx @s-aiproviders/cli list-presets

npx @s-aiproviders/cli chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --prompt "Explain Server-Sent Events in one line."
```

### Install as a library

```bash
pnpm add s-aiproviders-core
# or: npm install s-aiproviders-core
# or: yarn add s-aiproviders-core
```

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

## Four ways to consume

| # | Mode | Command | Best for |
|---|---|---|---|
| 1 | **Zero-install** | `npx @s-aiproviders/cli <cmd>` | One-off tasks, CI/CD, sandboxes |
| 2 | **Global CLI** | `npm i -g @s-aiproviders/cli` then `s-aiproviders <cmd>` | Daily terminal workflows |
| 3 | **Library import** | `pnpm add s-aiproviders-core` then `import { createProvider }` | Embedding AI into your own product (Electron / Node service / Vite) |
| 4 | **AI-Agent Skill** | Symlink the installed `SKILL.md` into `~/.claude/skills/` | Claude Code / Cursor / Codebuddy auto-invocation |

Step-by-step instructions for each, including how to wire the Skill into Claude Code, live in [`INSTALL.md`](./INSTALL.md).

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

Full schema and security notes: [`skill/references/config/extend-md-schema.md`](./skill/references/config/extend-md-schema.md).

## API reference

### Public surface — `s-aiproviders-core`

All exports below are tree-shakable and ship complete `.d.ts` types.

#### Types

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

#### Provider factory

| Symbol | Signature |
|---|---|
| `createProvider` | `(protocol, cfg) => IProvider` |
| `OpenAICompatibleProvider` / `AnthropicProvider` / `GeminiProvider` | Direct class access if you need it |

#### Presets

`BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset(id)`, plus every individual constant: `TOKENPLAN_PRESET`, `OPENAI_PRESET`, `ANTHROPIC_PRESET`, `GEMINI_PRESET`, `DEEPSEEK_PRESET`, `KIMI_PRESET`, `QWEN_PRESET`, `DOUBAO_PRESET`, `ZHIPU_PRESET`, `OPENAI_IMAGE_PRESET`, `HUNYUAN_IMAGE_PRESET`, `HUNYUAN_IMAGE_TC3_PRESET`, `ZHIPU_IMAGE_PRESET`.

#### Capability helpers

| Symbol | Signature |
|---|---|
| `modelHasCapability` | `(model, cap) => boolean` |
| `isMultimodal` | `(model) => boolean` |
| `pickModel` | `(providers, { prefer, providerId? }) => PickedModel \| null` |

#### SSE primitive (advanced)

| Symbol | Signature |
|---|---|
| `parseSse` | `(stream: ReadableStream<Uint8Array>, signal: AbortSignal) => AsyncGenerator<SseEvent>` |

#### `s-aiproviders-core/image-gen` (Node-only subpath)

| Symbol | Signature |
|---|---|
| `generateImage` | `(input: ImageGenInput) => Promise<ImageGenResult>` |
| `generateImageStandalone` | Backward-compat alias |
| `ImageGenInput` | `{ protocol?; baseURL; apiKey; model; prompt; size; outputDir?; fileBaseName? }` |
| `ImageGenResult` | `{ filePath; size; model; latencyMs; revisedPrompt? }` |

### CLI reference — `@s-aiproviders/cli`

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

Full integration recipes (Electron main process, multi-provider fallback, Node service patterns): [`skill/references/integration-as-library.md`](./skill/references/integration-as-library.md).

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
│                  s-aiproviders-core                      │
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
└──────────────────────────────────────────────────────────┘
            │
            ▼
   fetch + ReadableStream + AbortSignal
   (no SDK dependencies, no axios, no OpenAI client)
```

The core never reaches "outside" — no env vars, no `fs`, no globals — except in the explicitly Node-only `image-gen` subpath. This keeps the chat surface fully isomorphic between browser, Electron renderer, Cloudflare Workers, Vercel Edge, and any other JS runtime that exposes WHATWG `fetch`.

## Repository layout

```
S-AIProviders/
├── packages/
│   └── core/                          # s-aiproviders-core (the npm library)
│       ├── src/
│       │   ├── types.ts               # IProvider · ChatRequest · ChatChunk · ProviderPreset
│       │   ├── sse.ts                 # Shared SSE parser
│       │   ├── openai-compatible.ts   # Protocol implementation
│       │   ├── anthropic.ts           # Protocol implementation
│       │   ├── gemini.ts              # Protocol implementation
│       │   ├── factory.ts             # createProvider(protocol, cfg)
│       │   ├── capabilities.ts        # pickModel · modelHasCapability · isMultimodal
│       │   ├── presets/{chat,image,index}.ts   # 9 chat + 4 image presets
│       │   ├── image-gen/index.ts     # generateImage (Node-only subpath)
│       │   └── index.ts               # public surface
│       ├── package.json
│       ├── tsconfig.json
│       ├── README.md / README.zh.md
│       └── dist/                      # build output (gitignored)
├── skill/                             # @s-aiproviders/cli (the publishable CLI/Skill)
│   ├── SKILL.md                       # Skill manifest read by AI agents
│   ├── scripts/
│   │   ├── main.ts                    # entry — chat/image/list subcommands
│   │   ├── args.ts                    # zero-dep argv parser
│   │   ├── config.ts                  # CLI > EXTEND.md > env > preset resolver
│   │   └── commands/{chat,image,list}.ts
│   ├── references/
│   │   ├── config/extend-md-schema.md
│   │   ├── config/first-time-setup.md
│   │   ├── integration-as-library.md
│   │   └── providers.md
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                          # build output (gitignored)
├── scripts/
│   └── postbuild-shebang.cjs          # restores #!/usr/bin/env node + chmod +x
├── INSTALL.md                         # end-user install guide (4 modes)
├── MIGRATION-FROM-S-CONTENT.md        # migration recipe for the originating project
├── README.md / README.zh.md
├── package.json                       # workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Building from source

### Requirements

- Node.js **≥ 18.17** (uses native `fetch` and `ReadableStream`)
- pnpm **≥ 9** (other package managers work but workflows below assume pnpm)

### Common workflows

```bash
pnpm install                                    # install workspace deps
pnpm -r build                                   # build core + cli
pnpm -r typecheck                               # strict tsc --noEmit on every package
pnpm --filter s-aiproviders-core clean         # remove dist
pnpm --filter @s-aiproviders/cli  clean

# Run CLI in dev mode (no build needed, uses tsx)
pnpm --filter @s-aiproviders/cli chat -- --provider tokenplan --prompt "hi"
pnpm --filter @s-aiproviders/cli list -- --kind chat

# Run CLI from compiled output
node skill/dist/main.js list-presets

# Pack tarballs locally and verify them in a sandbox
(cd packages/core && pnpm pack --pack-destination /tmp/saip)
(cd skill         && pnpm pack --pack-destination /tmp/saip)
mkdir -p /tmp/saip-test && cd /tmp/saip-test && npm init -y >/dev/null
npm install /tmp/saip/*.tgz
npx s-aiproviders list-presets
```

## Publishing

Both packages are published independently. The `prepublishOnly` hook ensures `dist/` is rebuilt; pnpm rewrites `workspace:*` to a concrete version at pack time.

```bash
# Core library
cd packages/core
pnpm build
npm publish --access public

# CLI / Skill
cd skill
pnpm build
npm publish --access public
```

For a private registry, override per-package `publishConfig.registry` in each `package.json`.

## Comparison with similar tools

| | S-AIProviders | `openai` SDK | `@anthropic-ai/sdk` | `langchain` | `ai` (Vercel) |
|---|---|---|---|---|---|
| Multi-provider | ✅ 13 presets, `pickModel` fallback | ❌ OpenAI only | ❌ Claude only | ✅ but heavyweight | ✅ |
| Runtime deps | **0** | several | several | many | several |
| Browser-safe core | ✅ | partial | partial | ❌ | ✅ |
| Image generation | ✅ OpenAI + Tencent TC3 | ✅ OpenAI only | ❌ | ✅ | ❌ |
| Streaming model | `AsyncIterable<ChatChunk>` | mixed (event emitters / streams) | iterators | callbacks / streams | hooks (React-centric) |
| CLI | ✅ shipped | ❌ | ❌ | ❌ | ❌ |
| AI-Agent Skill bundled | ✅ | ❌ | ❌ | ❌ | ❌ |
| TypeScript types | bundled | bundled | bundled | bundled | bundled |
| Install size (core) | ~25 KB | ~hundreds of KB | ~hundreds of KB | MBs | hundreds of KB |

S-AIProviders is intentionally minimal — it does not aim to replace `langchain`'s agent loops or `ai`'s React Server Component bindings. It is the layer **below** those frameworks: a portable wire-format adapter that you can use directly, or that you can build a heavier framework on top of.

## FAQ

**Q: Does it support tool/function calling?**
Not yet. The `chat()` shape is text-only. Tool calling is on the roadmap behind a `tools` field in `ChatRequest`. Open an issue if you need it sooner.

**Q: Why not just use the official SDKs?**
The official SDKs each pull in their own HTTP client, their own retry middleware, and their own streaming abstraction. Stacking three of them in the same process bloats install size and produces three different error shapes. S-AIProviders unifies all three behind one 25 KB ESM module with the platform's native `fetch`.

**Q: Can I add a provider that isn't in the catalogue?**
Yes — if it speaks the OpenAI `/chat/completions` wire format, just pass `--provider openai --baseurl https://your-gateway/v1`. If it's a fundamentally different protocol, implement `IProvider` and add it to the factory; we welcome PRs.

**Q: Is the image-gen module browser-safe?**
No. It uses `node:crypto` for TC3 signing and `node:fs` for output. The package's main entry intentionally does not re-export it; reach for `s-aiproviders-core/image-gen`. Building this in the browser is a Vite/Webpack hint to externalise.

**Q: How does cancellation work?**
Pass an `AbortSignal` to `chat()`. The signal is forwarded to `fetch` and to the SSE reader, so an abort severs both the HTTP socket and the iterator. The CLI maps `SIGINT` (Ctrl-C) to the same signal.

**Q: How is API-key safety handled?**
The library never logs, persists, or transmits the key beyond the upstream `Authorization` header. The CLI loads keys via the priority chain documented above; project-level `EXTEND.md` should be `.gitignore`d. There is no telemetry.

**Q: Does it work in Cloudflare Workers / Vercel Edge / Bun / Deno?**
The chat core works on any runtime exposing WHATWG `fetch` + `ReadableStream` + `AbortSignal`. Image-gen requires a Node-compatible `node:crypto` + `node:fs`; it does **not** run on edge runtimes.

## Versioning

Both packages follow semantic versioning starting at `0.1.x`. While the version is `0.x`, breaking changes may land between minor releases (and will always be called out in the CHANGELOG). The first `1.0.0` will lock the public API.

## License

[MIT](./LICENSE) © S-AIProviders contributors.
