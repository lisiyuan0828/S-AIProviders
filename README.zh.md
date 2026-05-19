# S-AIProviders

> 一个包，对接所有模型。统一的 AI Provider 抽象，提供两种可互换的形态 —— 可安装的 **TypeScript 库** 与可直接执行的 **CLI / Skill** —— 共享同一份核心代码。

[English](./README.md) · [简体中文](./README.zh.md)

[![npm core](https://img.shields.io/npm/v/%40s-aiproviders%2Fcore.svg?label=%40s-aiproviders%2Fcore)](https://www.npmjs.com/package/@s-aiproviders/core)
[![npm cli](https://img.shields.io/npm/v/%40s-aiproviders%2Fcli.svg?label=%40s-aiproviders%2Fcli)](https://www.npmjs.com/package/@s-aiproviders/cli)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#许可证)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#环境要求)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)

---

## 目录

- [为什么需要 S-AIProviders](#为什么需要-s-aiproviders)
- [能力矩阵](#能力矩阵)
- [Provider 目录](#provider-目录)
- [快速开始](#快速开始)
- [4 种使用方式](#4-种使用方式)
- [配置体系](#配置体系)
- [API 参考](#api-参考)
- [架构](#架构)
- [仓库结构](#仓库结构)
- [从源码构建](#从源码构建)
- [发布到 npm](#发布到-npm)
- [与同类项目对比](#与同类项目对比)
- [常见问题](#常见问题)
- [版本策略](#版本策略)
- [许可证](#许可证)

---

## 为什么需要 S-AIProviders

每个接 AI 的项目都在重复同一套底层管线：解析 SSE、抹平三大对话方言、管理 API Key、同时支持 DALL·E 和腾讯云的异步签名生图、为设置页拼一份 provider 列表。S-AIProviders 把这些管线提炼成一个**零运行时依赖**的 TypeScript 核心，并以**四种形态**复用同一份契约：

1. 作为 **npm 库**，引入到 Node 服务、Electron 主进程、Vite 应用中。
2. 作为 **CLI**，被 shell 脚本、自动化、`cron` 调用。
3. 作为 **零安装一行命令**，通过 `npx @s-aiproviders/cli` 直接跑。
4. 作为 **AI Agent Skill**（兼容 Claude Code / Cursor / Codebuddy），Agent 读取打包的 `SKILL.md` 后自动调 CLI。

**设计原则**

- **零运行时依赖**。核心包仅基于平台原生 `fetch` + `ReadableStream`，不依赖 `openai`、`langchain`、`axios` 等任何第三方 SDK。
- **唯一事实源**。Provider 目录、能力元数据、协议实现全部集中在 `@s-aiproviders/core`，CLI 只是它的薄包装。
- **构造上即浏览器安全**。主入口绝不 import `node:*`，仅 Node 可用的图像生成模块挂在 `/image-gen` 子路径，渲染端打包不会被污染。
- **诚实的流式语义**。`chat()` 返回 `AsyncIterable<ChatChunk>`，**不抛错**：网络/解析失败会以 `{ type: 'error' }` 事件下发，调用方无需在 `for await` 外面包 try/catch。`AbortSignal` 端到端贯穿。
- **边界明确**。库本身不读环境变量、不读文件、不依赖全局对象 —— 全部配置由调用方注入。这对 SaaS、多租户 Electron 应用、Serverless 都是必备特性。

## 能力矩阵

| 能力 | 实现 | 浏览器安全 |
|---|---|---|
| 流式对话 | `openai-compatible` · `anthropic` · `gemini` | ✅ |
| 图像生成（文生图） | OpenAI Images 兼容 · 腾讯云 TC3（`SubmitTextToImageJob` 异步轮询） | ⚠️ 仅 Node |
| 跨厂商模型选择器 | 按能力优先级降级（`prefer: ['image-gen', 'vision', 'text']`） | ✅ |
| 内置 Preset | 9 个对话 + 4 个生图（详见下表） | ✅ |
| 实时模型清单 | `provider.listModels()`（OpenAI 兼容端点） | ✅ |
| SSE 原语 | 可复用的 `parseSse(stream, signal)` | ✅ |
| Token 用量上报 | 三种方言归一化 | ✅ |
| 取消能力 | 原生 `AbortSignal` 透传 | ✅ |

## Provider 目录

| ID | 名称 | 协议 | 默认 baseURL | 备注 |
|---|---|---|---|---|
| `tokenplan` ★ | 腾讯云 Token Plan | openai-compatible | `https://api.lkeap.cloud.tencent.com/plan/v3` | 一份套餐覆盖多个上游模型，国内推荐默认 |
| `openai` | OpenAI | openai-compatible | `https://api.openai.com/v1` | GPT-4o 系列 |
| `anthropic` | Anthropic | anthropic | `https://api.anthropic.com/v1` | Claude Opus / Sonnet |
| `gemini` | Google Gemini | gemini | `https://generativelanguage.googleapis.com/v1beta` | 通过 `alt=sse` 走 SSE |
| `deepseek` | DeepSeek | openai-compatible | `https://api.deepseek.com/v1` | Reasoner & Chat |
| `kimi` | Moonshot Kimi | openai-compatible | `https://api.moonshot.cn/v1` | 128k 上下文 |
| `qwen` | 通义千问 | openai-compatible | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里 DashScope OpenAI 兼容模式 |
| `doubao` | 字节豆包 / 火山方舟 | openai-compatible | `https://ark.cn-beijing.volces.com/api/v3` | Volcengine ARK |
| `zhipu` | 智谱 GLM | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | GLM-4 系列 |
| `openai-image` | OpenAI 生图 | openai-compatible | `https://api.openai.com/v1` | DALL·E 3 / gpt-image-1 |
| `hunyuan-image` | 腾讯混元生图（lkeap） | openai-compatible | `https://api.lkeap.cloud.tencent.com/v1` | OpenAI 兼容网关包装的混元 |
| `hunyuan-image-tc3` | 腾讯混元生图 3.0 | TC3 异步签名 | `https://aiart.tencentcloudapi.com` | apiKey 格式 `"SecretId:SecretKey"` |
| `zhipu-image` | 智谱 CogView | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | CogView-3 / 3-Plus |

执行 `npx @s-aiproviders/cli list-presets --json` 获取机器可读目录，或 `import { BUILTIN_PRESETS } from '@s-aiproviders/core'`。

> 接入新的 OpenAI 兼容厂商无需改一行代码：`--provider openai --baseurl https://your-gateway/v1` 即可。

## 快速开始

### 不安装直接尝鲜

```bash
npx @s-aiproviders/cli list-presets

npx @s-aiproviders/cli chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --prompt "用一句话解释 SSE"
```

### 作为库引入

```bash
pnpm add @s-aiproviders/core
# 或：npm install @s-aiproviders/core
# 或：yarn add @s-aiproviders/core
```

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
      { role: 'system', content: '请保持简洁。' },
      { role: 'user', content: '一句话解释 SSE' },
    ],
  },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
  if (ev.type === 'usage') console.error('usage:', ev.usage);
  if (ev.type === 'error') throw new Error(`${ev.code}: ${ev.message}`);
}
```

## 4 种使用方式

| # | 方式 | 命令 | 适用场景 |
|---|---|---|---|
| 1 | **零安装** | `npx @s-aiproviders/cli <cmd>` | 一次性任务、CI/CD、沙箱 |
| 2 | **全局 CLI** | `npm i -g @s-aiproviders/cli` 后用 `s-aiproviders <cmd>` | 终端日常工作流 |
| 3 | **库引入** | `pnpm add @s-aiproviders/core` 后 `import { createProvider }` | 接入自家产品（Electron / Node 服务 / Vite） |
| 4 | **AI Agent Skill** | 将安装后的 `SKILL.md` 软链到 `~/.claude/skills/` | 让 Claude Code / Cursor / Codebuddy 自动调用 |

每种方式的完整步骤（包括如何把 Skill 接到 Claude Code）见 [`INSTALL.md`](./INSTALL.md)。

## 配置体系

CLI 解析每个参数（`provider` / `apiKey` / `baseURL` / `model`）时，按 5 级优先级遍历：

| 优先级 | 来源 | 示例 |
|---|---|---|
| 1（最高） | CLI 参数 | `--apikey sk-xxx` |
| 2 | 项目级 `./.s-aiproviders/EXTEND.md` | 团队通过 `EXTEND.example.md` 提交模板 |
| 3 | 用户级 `~/.s-aiproviders/EXTEND.md` | 个人默认 |
| 4 | 环境变量 | `SAIP_API_KEY`、`OPENAI_API_KEY` 等 |
| 5（最低） | Preset 默认值 | `BUILTIN_PRESETS[*].defaultBaseURL`、`builtinModels[0]` |

### 通用环境变量

`SAIP_PROVIDER` · `SAIP_API_KEY` · `SAIP_BASE_URL` · `SAIP_MODEL` · `SAIP_PROTOCOL`

### 各 Provider 的环境变量

| Provider | 变量 |
|---|---|
| Token Plan | `TOKENPLAN_API_KEY` |
| OpenAI / OpenAI Image | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY`（别名 `GOOGLE_API_KEY`） |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Kimi | `MOONSHOT_API_KEY`（别名 `KIMI_API_KEY`） |
| Qwen | `DASHSCOPE_API_KEY`（别名 `QWEN_API_KEY`） |
| Doubao | `ARK_API_KEY`（别名 `DOUBAO_API_KEY`） |
| Zhipu / Zhipu Image | `ZHIPU_API_KEY`（别名 `BIGMODEL_API_KEY`） |
| Hunyuan（lkeap） | `LKEAP_API_KEY`（别名 `HUNYUAN_API_KEY`） |
| Hunyuan TC3 | `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY` |

### `EXTEND.md` 模式

```yaml
default_provider: tokenplan
default_model:
  tokenplan: tc-code-latest
  openai: gpt-4o-mini
providers:
  tokenplan:
    api_key: sk-tplan-xxxxx
    base_url: https://api.lkeap.cloud.tencent.com/plan/v3   # 可选
    model:    tc-code-latest                                 # 可选
  openai:
    api_key: sk-xxxxx
```

完整 schema 与安全建议：[`skill/references/config/extend-md-schema.md`](./skill/references/config/extend-md-schema.md)。

## API 参考

### 公共导出 — `@s-aiproviders/core`

下列导出全部支持 tree-shaking，并附完整 `.d.ts` 类型。

#### 类型

| 名称 | 含义 |
|---|---|
| `ProviderProtocol` | `'openai-compatible' \| 'anthropic' \| 'gemini'` |
| `ChatRole` | `'user' \| 'assistant' \| 'system'` |
| `ChatMessageInput` | `{ role: ChatRole; content: string }` |
| `ChatRequest` | `{ model; messages; temperature?; maxTokens? }` |
| `ChatChunk` | `delta` / `usage` / `done` / `error` 的判别联合 |
| `ChatUsage` | `{ promptTokens; completionTokens; totalTokens? }` |
| `ProviderInitConfig` | `{ apiKey; baseURL; timeoutMs? }` |
| `IProvider` | `{ protocol; chat(req, signal); listModels?() }` |
| `ModelInfo` | `{ id; label; contextWindow?; description?; capabilities? }` |
| `ModelCapability` | `'text' \| 'vision' \| 'image-gen' \| 'video-gen'` |
| `ProviderKind` | `'chat' \| 'image'` |
| `ProviderPreset` | Preset 完整结构（id、displayName、protocol、defaultBaseURL、builtinModels …） |

#### Provider 工厂

| 名称 | 签名 |
|---|---|
| `createProvider` | `(protocol, cfg) => IProvider` |
| `OpenAICompatibleProvider` / `AnthropicProvider` / `GeminiProvider` | 直接访问类（高级用法） |

#### 内置 Preset

`BUILTIN_PRESETS`、`CHAT_PRESETS`、`IMAGE_PRESETS`、`findPreset(id)`，以及全部 13 个常量：`TOKENPLAN_PRESET`、`OPENAI_PRESET`、`ANTHROPIC_PRESET`、`GEMINI_PRESET`、`DEEPSEEK_PRESET`、`KIMI_PRESET`、`QWEN_PRESET`、`DOUBAO_PRESET`、`ZHIPU_PRESET`、`OPENAI_IMAGE_PRESET`、`HUNYUAN_IMAGE_PRESET`、`HUNYUAN_IMAGE_TC3_PRESET`、`ZHIPU_IMAGE_PRESET`。

#### 能力工具

| 名称 | 签名 |
|---|---|
| `modelHasCapability` | `(model, cap) => boolean` |
| `isMultimodal` | `(model) => boolean` |
| `pickModel` | `(providers, { prefer, providerId? }) => PickedModel \| null` |

#### SSE 原语（高级用法）

| 名称 | 签名 |
|---|---|
| `parseSse` | `(stream: ReadableStream<Uint8Array>, signal: AbortSignal) => AsyncGenerator<SseEvent>` |

#### `@s-aiproviders/core/image-gen`（仅 Node 子路径）

| 名称 | 签名 |
|---|---|
| `generateImage` | `(input: ImageGenInput) => Promise<ImageGenResult>` |
| `generateImageStandalone` | 旧名兼容 alias |
| `ImageGenInput` | `{ protocol?; baseURL; apiKey; model; prompt; size; outputDir?; fileBaseName? }` |
| `ImageGenResult` | `{ filePath; size; model; latencyMs; revisedPrompt? }` |

### CLI 参考 — `@s-aiproviders/cli`

```
s-aiproviders <command> [flags]

子命令：
  chat              流式对话（输出到 stdout）
  image             生成图片（PNG）
  list-presets      列出内置 provider
  help              查看帮助

通用参数：
  --provider <id>     Preset ID
  --apikey  <key>     API Key（腾讯云填 "SecretId:SecretKey"）
  --baseurl <url>     覆盖 preset 默认 baseURL
  --model   <id>      上游模型 ID
  --json              JSON 机器可读输出
  --verbose           将解析过程打到 stderr

仅 chat：
  --prompt <text> | --promptfile <path> | （或 stdin 管道）
  --system <text>
  --temperature <n>
  --maxtokens <n>

仅 image：
  --prompt <text>     必填
  --size <宽x高>      默认 1024x1024
  --output <dir>      默认 ./output
  --name <base>       输出文件名（不含扩展名）

list-presets：
  --kind chat|image
  --json
```

退出码：`0` 成功 · `1` 运行时错误（网络 / HTTP / 腾讯云超时） · `2` 用户错误（参数错、缺 apiKey）。

完整集成示例（Electron 主进程、多 provider 降级、Node 服务模式）见 [`skill/references/integration-as-library.md`](./skill/references/integration-as-library.md)。

## 架构

```
┌──────────────────────────────────────────────────────────┐
│                     使用方表面                              │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │   Library API  │  │   CLI（npx）   │  │ Agent Skill │ │
│  │   (TS import)  │  │ s-aiproviders  │  │  SKILL.md   │ │
│  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘ │
└───────────┼───────────────────┼─────────────────┼────────┘
            │                   │                 │
            ▼                   ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                  @s-aiproviders/core                      │
│                                                           │
│  createProvider() ──► IProvider                          │
│      │                                                    │
│      ├─ openai-compatible.ts   (chat/completions + SSE)  │
│      ├─ anthropic.ts           (messages + SSE)          │
│      ├─ gemini.ts              (streamGenerateContent)   │
│      └─ image-gen/             (DALL·E + TC3 异步)        │
│                                                           │
│  presets/{chat,image}.ts  · capabilities.ts (pickModel)  │
│  sse.ts（共用 SSE 解析器：fetch ReadableStream → 事件）    │
└──────────────────────────────────────────────────────────┘
            │
            ▼
   fetch + ReadableStream + AbortSignal
   （无 SDK 依赖，无 axios，无 OpenAI 客户端）
```

核心从不"伸手到外面" —— 不读环境变量、不读文件、不动全局对象，**唯一例外**就是被显式 Node 化的 `image-gen` 子路径。这保证了对话主面在浏览器、Electron 渲染端、Cloudflare Workers、Vercel Edge 等任何暴露 WHATWG `fetch` 的运行时上同构可用。

## 仓库结构

```
S-AIProviders/
├── packages/
│   └── core/                          # @s-aiproviders/core（npm 库）
│       ├── src/
│       │   ├── types.ts               # IProvider · ChatRequest · ChatChunk · ProviderPreset
│       │   ├── sse.ts                 # 共用 SSE 解析器
│       │   ├── openai-compatible.ts   # 协议实现
│       │   ├── anthropic.ts           # 协议实现
│       │   ├── gemini.ts              # 协议实现
│       │   ├── factory.ts             # createProvider(protocol, cfg)
│       │   ├── capabilities.ts        # pickModel · modelHasCapability · isMultimodal
│       │   ├── presets/{chat,image,index}.ts   # 9 个对话 + 4 个生图 preset
│       │   ├── image-gen/index.ts     # generateImage（Node 子路径）
│       │   └── index.ts               # 公共导出
│       ├── package.json
│       ├── tsconfig.json
│       ├── README.md / README.zh.md
│       └── dist/                      # 构建产物（已 gitignore）
├── skill/                             # @s-aiproviders/cli（可发布的 CLI / Skill）
│   ├── SKILL.md                       # 给 AI agent 读的 Skill 清单
│   ├── scripts/
│   │   ├── main.ts                    # 入口 — chat/image/list 子命令
│   │   ├── args.ts                    # 零依赖 argv 解析
│   │   ├── config.ts                  # CLI > EXTEND.md > env > preset 解析
│   │   └── commands/{chat,image,list}.ts
│   ├── references/
│   │   ├── config/extend-md-schema.md
│   │   ├── config/first-time-setup.md
│   │   ├── integration-as-library.md
│   │   └── providers.md
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                          # 构建产物（已 gitignore）
├── scripts/
│   └── postbuild-shebang.cjs          # 构建后回填 #!/usr/bin/env node + chmod +x
├── INSTALL.md                         # 终端用户安装指南（4 种方式）
├── MIGRATION-FROM-S-CONTENT.md        # 给原项目（S-Content）的迁移手册
├── README.md / README.zh.md
├── package.json                       # workspace 根
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 从源码构建

### 环境要求

- Node.js **≥ 18.17**（依赖原生 `fetch` 和 `ReadableStream`）
- pnpm **≥ 9**（其它包管理器也可，下面命令以 pnpm 为例）

### 常用命令

```bash
pnpm install                                    # 安装 workspace 依赖
pnpm -r build                                   # 构建 core + cli
pnpm -r typecheck                               # 严格 tsc --noEmit
pnpm --filter @s-aiproviders/core clean         # 清理 dist
pnpm --filter @s-aiproviders/cli  clean

# 开发模式跑 CLI（无需 build，走 tsx）
pnpm --filter @s-aiproviders/cli chat -- --provider tokenplan --prompt "你好"
pnpm --filter @s-aiproviders/cli list -- --kind chat

# 运行编译产物
node skill/dist/main.js list-presets

# 本地打 tarball 并在沙箱里 npx 验证
(cd packages/core && pnpm pack --pack-destination /tmp/saip)
(cd skill         && pnpm pack --pack-destination /tmp/saip)
mkdir -p /tmp/saip-test && cd /tmp/saip-test && npm init -y >/dev/null
npm install /tmp/saip/*.tgz
npx s-aiproviders list-presets
```

## 发布到 npm

两个包独立发布。`prepublishOnly` 钩子会自动 clean+build；`workspace:*` 会被 pnpm 在 pack 时改写为具体版本号。

```bash
# 库
cd packages/core
pnpm build
npm publish --access public

# CLI / Skill
cd skill
pnpm build
npm publish --access public
```

发到内网 registry 时，在每个 `package.json` 加 `publishConfig.registry` 字段即可。

## 与同类项目对比

| | S-AIProviders | `openai` SDK | `@anthropic-ai/sdk` | `langchain` | `ai`（Vercel） |
|---|---|---|---|---|---|
| 多 provider | ✅ 13 个 preset，`pickModel` 降级 | ❌ 仅 OpenAI | ❌ 仅 Claude | ✅ 但很重 | ✅ |
| 运行时依赖数 | **0** | 多个 | 多个 | 大量 | 多个 |
| 浏览器安全核心 | ✅ | 部分 | 部分 | ❌ | ✅ |
| 图像生成 | ✅ OpenAI + 腾讯 TC3 | ✅ 仅 OpenAI | ❌ | ✅ | ❌ |
| 流式模型 | `AsyncIterable<ChatChunk>` | 混合（事件 / stream） | 迭代器 | 回调 / stream | hooks（React 中心） |
| 自带 CLI | ✅ | ❌ | ❌ | ❌ | ❌ |
| 自带 AI Agent Skill | ✅ | ❌ | ❌ | ❌ | ❌ |
| TypeScript 类型 | 内置 | 内置 | 内置 | 内置 | 内置 |
| 安装体积（核心） | ~25 KB | 数百 KB | 数百 KB | MB 级 | 数百 KB |

S-AIProviders 刻意保持精简 —— 它**不**取代 `langchain` 的 Agent 循环，也不与 `ai` 的 React Server Component 绑定竞争。它是这些上层框架**之下**的一层：可移植的"协议适配器"。你可以直接用它，也可以基于它造更复杂的框架。

## 常见问题

**Q: 支持 tool / function calling 吗？**
暂未支持。`chat()` 当前只覆盖纯文本，工具调用在路线图上（计划在 `ChatRequest` 加 `tools` 字段）。如果你急需，欢迎提 Issue。

**Q: 为什么不直接用各家官方 SDK？**
官方 SDK 各自带 HTTP 客户端、各自的重试中间件、各自的流抽象。三家叠在同一个进程里既显著放大体积，又会产生三种不同的错误形状。S-AIProviders 把三家收敛在一个 25 KB 的 ESM 模块里，用平台原生 `fetch`。

**Q: 想接一个目录里没有的 provider？**
只要它讲 OpenAI `/chat/completions` 协议，直接 `--provider openai --baseurl https://your-gateway/v1` 就行。如果是完全不同的协议，实现 `IProvider` 接口并加进 factory 即可，欢迎 PR。

**Q: image-gen 模块能在浏览器里用吗？**
**不能**。它用了 `node:crypto` 做 TC3 签名、`node:fs` 落盘。主入口刻意不再 re-export 它，访问路径是 `@s-aiproviders/core/image-gen`。在浏览器构建里这是 Vite/Webpack 的 externalise 提示。

**Q: 如何取消正在进行的请求？**
`chat()` 接收 `AbortSignal`，会同时透传给底层 `fetch` 和 SSE 读取器，abort 时 HTTP 套接字与异步迭代器一起结束。CLI 把 `SIGINT`（Ctrl-C）映射到同一个 signal。

**Q: API Key 安全性怎么保证？**
库本身**不记录、不持久化、不对外发送** Key（除上游必须的 `Authorization` header）。CLI 按文档优先级链路加载；项目级 `EXTEND.md` 应加入 `.gitignore`。**全程无任何遥测上报**。

**Q: 能跑在 Cloudflare Workers / Vercel Edge / Bun / Deno 上吗？**
对话核心在任何暴露 WHATWG `fetch` + `ReadableStream` + `AbortSignal` 的运行时上都能跑。Image-gen 需要 Node 兼容的 `node:crypto` + `node:fs`，**不能**在 Edge 运行时跑。

## 版本策略

两个包都从 `0.1.x` 起按语义化版本发布。版本仍处于 `0.x` 时，破坏性变更可能在 minor 版本之间发生（CHANGELOG 会明确标注）；首个 `1.0.0` 会锁定公共 API。

## 许可证

[MIT](./LICENSE) © S-AIProviders contributors.
