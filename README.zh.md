# s-aiproviders

> 一个包，对接所有模型。零依赖、统一抽象的 AI Provider 工具集 —— **库 + CLI 同一次安装**：你的应用里 `import { createProvider }`，命令行里 `npx s-aiproviders chat`，底层走的是同一份协议层代码。

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/s-aiproviders.svg)](https://www.npmjs.com/package/s-aiproviders)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#许可证)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#环境要求)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)

---

## 目录

- [为什么需要 s-aiproviders](#为什么需要-s-aiproviders)
- [能力矩阵](#能力矩阵)
- [Provider 目录](#provider-目录)
- [快速开始](#快速开始)
- [3 种使用方式](#3-种使用方式)
- [配置体系](#配置体系)
- [API 参考](#api-参考)
- [架构](#架构)
- [仓库结构](#仓库结构)
- [从源码构建](#从源码构建)
- [与同类项目对比](#与同类项目对比)
- [常见问题](#常见问题)
- [版本策略](#版本策略)
- [许可证](#许可证)

---

## 为什么需要 s-aiproviders

每个接 AI 的项目都在重复同一套底层管线：解析 SSE、抹平三大对话方言、管理 API Key、同时支持 DALL·E 和腾讯云的异步签名生图、为设置页拼一份 provider 列表。s-aiproviders 把这些管线提炼成一个**零运行时依赖**的 TypeScript 包，并以 **3 种形态**复用同一份契约：

1. 作为 **npm 库**，引入到 Node 服务、Electron 主进程、Vite 应用中。
2. 作为 **CLI**（`npx s-aiproviders` 或全局安装），被 shell 脚本、自动化、`cron` 调用。
3. 作为 **AI Agent Skill**（兼容 Claude Code / Cursor / Codebuddy），Agent 读取随包发布的 `SKILL.md` 后自动调 CLI。

**设计原则**

- **零运行时依赖**。仅基于平台原生 `fetch` + `ReadableStream`，不依赖 `openai`、`langchain`、`axios` 等任何第三方 SDK。
- **唯一事实源**。库、CLI、Skill 是同一次安装，CLI 只是把同一份导出 API 包了一层。
- **构造上即浏览器安全**。主入口绝不 import `node:*`，仅 Node 可用的图像生成模块挂在 `s-aiproviders/image-gen` 子路径，渲染端打包不会被污染。
- **诚实的流式语义**。`chat()` 返回 `AsyncIterable<ChatChunk>`，**不抛错**：网络/解析失败会以 `{ type: 'error' }` 事件下发，调用方无需在 `for await` 外面包 try/catch。`AbortSignal` 端到端贯穿。
- **边界明确**。库本身不读环境变量、不读文件、不依赖全局变量。所有配置由调用方传入 —— 适合 SaaS、多租户 Electron 应用、Serverless。

## 能力矩阵

| 能力 | 实现 | 浏览器安全 |
|---|---|---|
| 流式对话 | `openai-compatible` · `anthropic` · `gemini` | ✅ |
| 文生图 | OpenAI Images 兼容 · 腾讯云 TC3（`SubmitTextToImageJob`，异步轮询） | ⚠️ 仅 Node |
| 跨 provider 模型挑选 | 按能力优先级回退（`prefer: ['image-gen', 'vision', 'text']`） | ✅ |
| 内置预设 | 9 个 chat + 4 个 image | ✅ |
| 在线模型发现 | `provider.listModels()`（OpenAI 兼容端点） | ✅ |
| SSE 原语 | 通用 `parseSse(stream, signal)` | ✅ |
| Token 用量上报 | 三种方言归一化 | ✅ |
| 取消 | 原生 `AbortSignal` 透传 | ✅ |

## Provider 目录

| ID | 显示名 | 协议 | 默认 base URL | 说明 |
|---|---|---|---|---|
| `tokenplan` ★ | 腾讯云 Token Plan | openai-compatible | `https://api.lkeap.cloud.tencent.com/plan/v3` | 一份订阅对接多家上游模型，国内推荐默认。 |
| `openai` | OpenAI | openai-compatible | `https://api.openai.com/v1` | GPT-4o 系列。 |
| `anthropic` | Anthropic | anthropic | `https://api.anthropic.com/v1` | Claude Opus / Sonnet。 |
| `gemini` | Google Gemini | gemini | `https://generativelanguage.googleapis.com/v1beta` | 通过 `alt=sse` 走 SSE。 |
| `deepseek` | DeepSeek | openai-compatible | `https://api.deepseek.com/v1` | Reasoner 与 chat。 |
| `kimi` | Moonshot Kimi | openai-compatible | `https://api.moonshot.cn/v1` | 128k 上下文。 |
| `qwen` | 通义千问 | openai-compatible | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里云 DashScope OpenAI 兼容模式。 |
| `doubao` | 字节豆包 / 火山方舟 | openai-compatible | `https://ark.cn-beijing.volces.com/api/v3` | 火山引擎 ARK。 |
| `zhipu` | 智谱 GLM | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | GLM-4 系列。 |
| `openai-image` | OpenAI Image | openai-compatible | `https://api.openai.com/v1` | DALL·E 3 / gpt-image-1。 |
| `hunyuan-image` | 腾讯混元生图 (lkeap) | openai-compatible | `https://api.lkeap.cloud.tencent.com/v1` | 混元的 OpenAI 兼容网关。 |
| `hunyuan-image-tc3` | 腾讯混元生图 3.0 | TC3 签名异步 | `https://aiart.tencentcloudapi.com` | `apiKey: "SecretId:SecretKey"`。 |
| `zhipu-image` | 智谱 CogView | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | CogView-3 / 3-Plus。 |

获取机器可读列表：`npx s-aiproviders list-presets --json`，或 `import { BUILTIN_PRESETS } from 's-aiproviders'`。

> 接入一个 OpenAI 兼容的新厂商是一行的事：`--provider openai --baseurl https://your-gateway/v1`，无需改代码。

## 快速开始

### 不安装直接试

```bash
npx s-aiproviders list-presets

npx s-aiproviders chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --prompt "用一句话解释 Server-Sent Events。"
```

### 作为库安装

```bash
pnpm add s-aiproviders
# 或：npm install s-aiproviders
# 或：yarn add s-aiproviders
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

### 生成一张图（Node 环境）

```ts
import { generateImage } from 's-aiproviders/image-gen';

const { filePath } = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-image-1',
  prompt: '一只在看书的迷你陶瓷水豚',
  size: '1024x1024',
  outputDir: './output',
});
console.log('saved:', filePath);
```

## 3 种使用方式

| # | 形态 | 命令 | 适用 |
|---|---|---|---|
| 1 | **零安装** | `npx s-aiproviders <cmd>` | 一次性任务、CI/CD、沙箱 |
| 2 | **全局 CLI** | `npm i -g s-aiproviders` 后 `s-aiproviders <cmd>` | 日常终端 |
| 3 | **库引用** | `pnpm add s-aiproviders` 后 `import { createProvider }` | 嵌入到你自己的产品（Electron / Node 服务 / Vite） |

也可以作为 **AI Agent Skill** 使用：包里随附 `SKILL.md` 与 `references/` 目录，把它们软链到 Agent 的 skills 目录（如 `~/.claude/skills/s-aiproviders/`），Agent 即可读取 manifest 并代为调用 CLI。详细步骤见 [`INSTALL.md`](./INSTALL.md)。

## 配置体系

CLI 解析每个参数（`provider` / `apiKey` / `baseURL` / `model`）时，按以下优先级查找：

| 优先级 | 来源 | 示例 |
|---|---|---|
| 1（最高） | CLI flags | `--apikey sk-xxx` |
| 2 | 项目级 `./.s-aiproviders/EXTEND.md` | 通过 `EXTEND.example.md` 提交模板 |
| 3 | 用户级 `~/.s-aiproviders/EXTEND.md` | 个人默认值 |
| 4 | 环境变量 | `SAIP_API_KEY`、`OPENAI_API_KEY`… |
| 5（最低） | 预设默认 | `BUILTIN_PRESETS[*].defaultBaseURL`、`builtinModels[0]` |

### 通用环境变量

`SAIP_PROVIDER` · `SAIP_API_KEY` · `SAIP_BASE_URL` · `SAIP_MODEL` · `SAIP_PROTOCOL`

### 各 provider 专用环境变量

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
| Hunyuan (lkeap) | `LKEAP_API_KEY`（别名 `HUNYUAN_API_KEY`） |
| Hunyuan TC3 | `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY` |

### `EXTEND.md` 配置

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

完整 schema 与安全注意事项见 [`references/config/extend-md-schema.md`](./references/config/extend-md-schema.md)。

## API 参考

下列导出全部支持 tree-shaking，并附带完整 `.d.ts` 类型。

### 入口

| Specifier | 内容 |
|---|---|
| `s-aiproviders` | 库 API：类型、provider 工厂、预设、能力工具、SSE 解析器。**浏览器安全。** |
| `s-aiproviders/image-gen` | `generateImage()` —— 仅 Node（依赖 `node:crypto`、`node:fs`）。 |
| `s-aiproviders/presets` | 仅预设目录，便于更激进地 tree-shake。 |

### 类型

| 符号 | 说明 |
|---|---|
| `ProviderProtocol` | `'openai-compatible' \| 'anthropic' \| 'gemini'` |
| `ChatRole` | `'user' \| 'assistant' \| 'system'` |
| `ChatMessageInput` | `{ role: ChatRole; content: string }` |
| `ChatRequest` | `{ model; messages; temperature?; maxTokens? }` |
| `ChatChunk` | `delta` / `usage` / `done` / `error` 的判别联合类型 |
| `ChatUsage` | `{ promptTokens; completionTokens; totalTokens? }` |
| `ProviderInitConfig` | `{ apiKey; baseURL; timeoutMs? }` |
| `IProvider` | `{ protocol; chat(req, signal); listModels?() }` |
| `ModelInfo` | `{ id; label; contextWindow?; description?; capabilities? }` |
| `ModelCapability` | `'text' \| 'vision' \| 'image-gen' \| 'video-gen'` |
| `ProviderKind` | `'chat' \| 'image'` |
| `ProviderPreset` | 完整预设结构（id、displayName、protocol、defaultBaseURL、builtinModels…） |

### Provider 工厂

| 符号 | 签名 |
|---|---|
| `createProvider` | `(protocol, cfg) => IProvider` |
| `OpenAICompatibleProvider` / `AnthropicProvider` / `GeminiProvider` | 直接拿到类，需要时使用 |

### 预设

`BUILTIN_PRESETS`、`CHAT_PRESETS`、`IMAGE_PRESETS`、`findPreset(id)`，以及单独的常量：`TOKENPLAN_PRESET`、`OPENAI_PRESET`、`ANTHROPIC_PRESET`、`GEMINI_PRESET`、`DEEPSEEK_PRESET`、`KIMI_PRESET`、`QWEN_PRESET`、`DOUBAO_PRESET`、`ZHIPU_PRESET`、`OPENAI_IMAGE_PRESET`、`HUNYUAN_IMAGE_PRESET`、`HUNYUAN_IMAGE_TC3_PRESET`、`ZHIPU_IMAGE_PRESET`。

### 能力工具

| 符号 | 签名 |
|---|---|
| `modelHasCapability` | `(model, cap) => boolean` |
| `isMultimodal` | `(model) => boolean` |
| `pickModel` | `(providers, { prefer, providerId? }) => PickedModel \| null` |

### SSE 原语（进阶）

| 符号 | 签名 |
|---|---|
| `parseSse` | `(stream: ReadableStream<Uint8Array>, signal: AbortSignal) => AsyncGenerator<SseEvent>` |

### `s-aiproviders/image-gen`（仅 Node 子路径）

| 符号 | 签名 |
|---|---|
| `generateImage` | `(input: ImageGenInput) => Promise<ImageGenResult>` |
| `generateImageStandalone` | 向后兼容别名 |
| `ImageGenInput` | `{ protocol?; baseURL; apiKey; model; prompt; size; outputDir?; fileBaseName? }` |
| `ImageGenResult` | `{ filePath; size; model; latencyMs; revisedPrompt? }` |

### CLI —— `s-aiproviders`

```
s-aiproviders <command> [flags]

Commands:
  chat              流式对话（输出文本）
  image             生成一张图片（PNG）
  list-presets      列出内置 provider
  help              帮助

通用 flags：
  --provider <id>     预设 id
  --apikey  <key>     API key（腾讯：写成 "SecretId:SecretKey"）
  --baseurl <url>     覆盖预设默认 base URL
  --model   <id>      上游模型 id
  --json              机器可读 JSON 输出
  --verbose           将解析过程打到 stderr

chat 专属：
  --prompt <text> | --promptfile <path> | （或通过 stdin 管道）
  --system <text>
  --temperature <n>
  --maxtokens <n>

image 专属：
  --prompt <text>     必填
  --size <WxH>        默认 1024x1024
  --output <dir>      默认 ./output
  --name <base>       输出文件名（不含扩展名）

list-presets：
  --kind chat|image
  --json
```

退出码：`0` 成功 · `1` 运行时错误（网络 / HTTP / 腾讯超时）· `2` 用户错误（参数错、缺 apiKey）。

完整接入示例（Electron 主进程、多 provider 回退、Node 服务模式）见 [`references/integration-as-library.md`](./references/integration-as-library.md)。

## 架构

```
┌──────────────────────────────────────────────────────────┐
│                       消费侧                              │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │   库 API       │  │   CLI (npx)    │  │ Agent Skill │ │
│  │  (TS import)   │  │ s-aiproviders  │  │  SKILL.md   │ │
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
│      └─ image-gen/             (DALL·E + TC3 异步签名)    │
│                                                           │
│  presets/{chat,image}.ts  · capabilities.ts (pickModel)  │
│  sse.ts（共用 SSE 解析器，把 fetch ReadableStream 解成事件） │
│  cli/（chat | image | list-presets，包了一层上面的 API）   │
└──────────────────────────────────────────────────────────┘
            │
            ▼
   fetch + ReadableStream + AbortSignal
   （无 SDK 依赖、无 axios、无 OpenAI client）
```

除了显式的 Node-only `image-gen` 子路径与 CLI 运行时之外，核心**绝不向外伸手** —— 不读环境变量、不动 `fs`、不碰全局变量。这让 chat 主入口在浏览器、Electron 渲染进程、Cloudflare Workers、Vercel Edge 等任何提供 WHATWG `fetch` 的运行时之间真正同构。

## 仓库结构

```
S-AIProviders/
├── src/
│   ├── index.ts                   # 公开库入口（浏览器安全）
│   ├── types.ts                   # IProvider · ChatRequest · ChatChunk · ProviderPreset
│   ├── sse.ts                     # 共用 SSE 解析器
│   ├── openai-compatible.ts       # 协议实现
│   ├── anthropic.ts               # 协议实现
│   ├── gemini.ts                  # 协议实现
│   ├── factory.ts                 # createProvider(protocol, cfg)
│   ├── capabilities.ts            # pickModel · modelHasCapability · isMultimodal
│   ├── presets/{chat,image,index}.ts   # 9 chat + 4 image 预设
│   ├── image-gen/index.ts         # generateImage（仅 Node 子路径）
│   └── cli/                       # s-aiproviders CLI（bin 入口）
│       ├── main.ts                #   入口 — chat/image/list-presets
│       ├── args.ts                #   零依赖 argv 解析
│       ├── config.ts              #   CLI > EXTEND.md > env > preset 解析器
│       └── commands/{chat,image,list}.ts
├── references/                    # 给 AI Agent Skill 阅读的文档
│   ├── config/extend-md-schema.md
│   ├── config/first-time-setup.md
│   ├── integration-as-library.md
│   └── providers.md
├── scripts/
│   └── postbuild-shebang.cjs      # 构建后恢复 #!/usr/bin/env node 并 chmod +x
├── SKILL.md                       # 给 AI Agent 读的 Skill manifest
├── INSTALL.md                     # 终端用户安装指南
├── README.md / README.zh.md
├── package.json
├── tsconfig.json
└── dist/                          # 构建产物（已 gitignore）
```

## 从源码构建

### 环境要求

- Node.js **≥ 18.17**（使用原生 `fetch` 与 `ReadableStream`）
- pnpm **≥ 9**（npm / yarn 也行）

### 常用命令

```bash
pnpm install         # 安装依赖
pnpm build           # tsc → dist/  +  恢复 dist/cli/main.js 的 shebang
pnpm typecheck       # 严格模式 tsc --noEmit
pnpm clean           # 删除 dist/

# 开发模式跑 CLI（不需 build，走 tsx）
pnpm chat  -- --provider tokenplan --prompt "hi"
pnpm image -- --provider openai-image --prompt "a cat" --size 1024x1024
pnpm list  -- --kind chat

# 跑构建后的 CLI
node dist/cli/main.js list-presets

# 本地打包并在沙箱里验证 tarball
pnpm pack --pack-destination /tmp/saip
mkdir -p /tmp/saip-test && cd /tmp/saip-test && npm init -y >/dev/null
npm install /tmp/saip/s-aiproviders-*.tgz
npx s-aiproviders list-presets
```

### 发布到 npm

`prepublishOnly` 会自动跑 `clean` + `build`。`publishConfig.registry` 锁定到 `https://registry.npmjs.org/`，`access: public`，所以无论你本地 `~/.npmrc` 用哪个镜像源，发布永远走 npm 官方公网源。

```bash
pnpm build
npm publish        # 会读 package.json 里的 publishConfig
```

## 与同类项目对比

| | s-aiproviders | `openai` SDK | `@anthropic-ai/sdk` | `langchain` | `ai`（Vercel） |
|---|---|---|---|---|---|
| 多 provider | ✅ 13 个预设、`pickModel` 回退 | ❌ 仅 OpenAI | ❌ 仅 Claude | ✅ 但很重 | ✅ |
| 运行时依赖 | **0** | 多个 | 多个 | 非常多 | 多个 |
| 浏览器安全核心 | ✅ | 部分 | 部分 | ❌ | ✅ |
| 文生图 | ✅ OpenAI + 腾讯 TC3 | ✅ 仅 OpenAI | ❌ | ✅ | ❌ |
| 流式模型 | `AsyncIterable<ChatChunk>` | 混合（事件 / stream） | iterator | callback / stream | hooks（React 中心） |
| 自带 CLI | ✅ 同次安装 | ❌ | ❌ | ❌ | ❌ |
| 自带 AI Agent Skill | ✅ | ❌ | ❌ | ❌ | ❌ |
| TypeScript 类型 | 内置 | 内置 | 内置 | 内置 | 内置 |
| 安装体积 | ~60 KB tarball | 数百 KB | 数百 KB | MB 级 | 数百 KB |

s-aiproviders 刻意保持精简 —— 它不追求替代 `langchain` 的 agent 循环或 `ai` 的 React Server Component 绑定，而是这些框架**底层**那一层：一个可移植的 wire-format 适配层，你既可以直接用，也可以在它之上再叠重型框架。

## 常见问题

**Q：支持工具调用 / function calling 吗？**
暂不支持。当前 `chat()` 仅文本。工具调用在路线图上，会以 `ChatRequest.tools` 字段引入。如有需求请提 issue。

**Q：为啥不直接用各家官方 SDK？**
官方 SDK 各自带 HTTP client、各自的重试中间件、各自的流式抽象。三家叠在一个进程里既臃肿，错误形态又对不齐。s-aiproviders 用一份很小的 ESM 模块统一三家，全部走平台原生 `fetch`。

**Q：能接入目录里没有的 provider 吗？**
可以。如果它走 OpenAI `/chat/completions` wire 格式，直接 `--provider openai --baseurl https://your-gateway/v1`。如果协议完全不同，实现 `IProvider` 并加到工厂里就行，欢迎提 PR。

**Q：image-gen 模块浏览器能用吗？**
不能。它用 `node:crypto` 做 TC3 签名、用 `node:fs` 落盘。包的主入口故意不再导出它；要用请走 `s-aiproviders/image-gen` 子路径。Vite/Webpack 打浏览器包时，把它 externalise 掉，或干脆别在渲染端 import 这条子路径。

**Q：取消怎么用？**
往 `chat()` 传 `AbortSignal`。signal 会被透传给 `fetch` 和 SSE reader，所以 abort 会同时切断 HTTP 连接和迭代器。CLI 把 `SIGINT`（Ctrl-C）映射到同一个 signal。

**Q：API key 安全怎么保障？**
库本身**不**记录、不持久化、不上报 key —— 只在请求 `Authorization` 头里发给上游。CLI 按上文优先级链装载 key；建议把项目级 `EXTEND.md` 加到 `.gitignore`。无任何 telemetry。

**Q：能在 Cloudflare Workers / Vercel Edge / Bun / Deno 上跑吗？**
chat 主入口在任何提供 WHATWG `fetch` + `ReadableStream` + `AbortSignal` 的运行时上都能跑。image-gen 需要 Node 兼容的 `node:crypto` + `node:fs`，**不能**在 edge 运行时上跑。

## 版本策略

s-aiproviders 遵循语义化版本，从 `0.1.x` 起步。在 `0.x` 期间，minor 版本之间可能引入 break change，CHANGELOG 会显式标注。`1.0.0` 之后会锁定公开 API。

## 许可证

[MIT](./LICENSE) © s-aiproviders contributors。
