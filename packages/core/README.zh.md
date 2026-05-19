# s-aiproviders-core

> 统一的 AI Provider 抽象。一套 API 同时对接 OpenAI、Anthropic、Gemini、DeepSeek、Kimi、Qwen、豆包、智谱、腾讯 Token Plan，并通过 DALL·E / CogView / 混元提供图像生成。**零运行时依赖**。

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/%40s-aiproviders%2Fcore.svg)](https://www.npmjs.com/package/s-aiproviders-core)
[![install size](https://img.shields.io/badge/install%20size-%3C30KB-brightgreen.svg)](#)
[![runtime deps](https://img.shields.io/badge/runtime%20deps-0-success.svg)](#)
[![types](https://img.shields.io/badge/types-bundled-blue.svg)](#)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#环境要求)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#许可证)

---

## 亮点

- **流式对话** — `openai-compatible`、`anthropic`、`gemini` 三种方言归一到同一个 `IProvider.chat()`，返回 `AsyncIterable<ChatChunk>`。
- **图像生成** — 兼容 OpenAI Images（DALL·E 3 / gpt-image-1 / CogView / lkeap 网关下的混元）和**腾讯云 TC3**（`SubmitTextToImageJob` 异步任务，自带 TC3-HMAC-SHA256 签名 + 状态轮询）。模块挂在仅 Node 子路径下，绝不污染浏览器构建。
- **13 个内置 Preset** — Token Plan ★ · OpenAI · Anthropic · Gemini · DeepSeek · Kimi · 通义 · 豆包 · 智谱 · OpenAI Image · 混元 ×2 · CogView。每个 Preset 都带 `displayName`、`defaultBaseURL`、`builtinModels`（含 `capabilities`）。
- **跨厂商模型选择器** — `pickModel({ prefer: ['image-gen', 'vision', 'text'] })` 在已启用的 provider 中按能力优先级降级匹配，可指定 `providerId` 作为同级 tiebreaker。
- **零运行时依赖**。基于平台原生 `fetch` + `ReadableStream` + `AbortSignal` 的纯 ESM 实现。
- **构造上即浏览器安全**。主入口绝不 import `node:*`，仅 Node 模块挂在 `s-aiproviders-core/image-gen`。
- **诚实的流式语义**。`chat()` **不抛错** —— 网络/解析失败会以 `{ type: 'error' }` 事件下发。`AbortSignal` 端到端贯穿。
- **不读全局，不读环境变量**。配置全部由调用方注入。SaaS、多租户 Electron、边缘运行时全部安全可用。

## 安装

```bash
pnpm add s-aiproviders-core
# 或
npm install s-aiproviders-core
# 或
yarn add s-aiproviders-core
```

## 环境要求

- Node.js **≥ 18.17**（依赖原生 `fetch` + `ReadableStream`）
- 或任意暴露 WHATWG `fetch`、`ReadableStream`、`AbortSignal`、`TextDecoder` 的浏览器/运行时（Cloudflare Workers、Vercel Edge、Deno、Bun…）
- image-gen 子路径额外需要 Node 兼容的 `node:crypto` 和 `node:fs/promises`

## 流式对话

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
      { role: 'system', content: '请保持简洁。' },
      { role: 'user',   content: '一句话解释 SSE。' },
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

`chat()` 在 Anthropic 和 Gemini 上的形态完全一致，只需切换 `protocol`：

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

库内部会自动：为 Anthropic 抽出 `system` 消息、把 Gemini 的 `assistant` 映射为 `model`、把 `maxTokens` 翻译成各家正确的字段（`max_tokens` / `max_tokens` / `maxOutputTokens`）。

## 图像生成（仅 Node）

走子路径 —— 主入口刻意没有 re-export 它。

```ts
import { generateImage } from 's-aiproviders-core/image-gen';

const result = await generateImage({
  // 默认根据 baseURL 自动判定；也可显式指定：
  // protocol: 'openai-compatible' | 'tencent-cloud',
  baseURL: 'https://api.openai.com/v1',
  apiKey:  process.env.OPENAI_API_KEY!,
  model:   'dall-e-3',
  prompt:  '极简风格的猫图标，flat，SaaS 风',
  size:    '1024x1024',
  outputDir: './generated',
});

console.log(result.filePath, `（${result.latencyMs}ms）`);
```

接 **腾讯云 TC3**（混元生图 3.0）时，把 baseURL 指向原生端点，apiKey 用 `"SecretId:SecretKey"` 形式即可。协议自动识别，TC3-HMAC-SHA256 签名 + 异步任务轮询（默认超时 180s）由库内部完成：

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

## 跨厂商模型选择器

```ts
import { pickModel, type ProviderLike } from 's-aiproviders-core';

const inventory: ProviderLike[] = [
  { id: 'openai',    models: [{ id: 'gpt-4o-mini',  label: 'GPT-4o mini', capabilities: ['text', 'vision'] }] },
  { id: 'tokenplan', models: [{ id: 'tc-code-latest', label: 'Auto',      capabilities: ['text'] }] },
];

const picked = pickModel(inventory, { prefer: ['vision', 'text'] });
// → { providerId: 'openai', modelId: 'gpt-4o-mini', matched: 'vision' }
```

`pickModel` 按 `prefer` 顺序遍历你已启用的 provider（`enabled === false` 的会被跳过），返回首个匹配的模型。可传 `providerId` 在同等优先级下偏向某个 provider。

## 内置 Preset

```ts
import {
  BUILTIN_PRESETS,    // 13 个全部
  CHAT_PRESETS,       // 9 个对话
  IMAGE_PRESETS,      // 4 个生图
  findPreset,         // 按 id 查
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

// 比如做"快速添加 provider"的下拉
CHAT_PRESETS.forEach((p) => {
  console.log(`${p.id} — ${p.displayName} (${p.protocol}) → ${p.defaultBaseURL}`);
});
```

Preset 结构：

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

## 公共 API

| 名称 | 来源 | 浏览器安全 |
|---|---|---|
| `createProvider`、`OpenAICompatibleProvider`、`AnthropicProvider`、`GeminiProvider` | 主入口 | ✅ |
| `IProvider`、`ProviderInitConfig`、`ProviderProtocol`、`ChatRequest`、`ChatChunk`、`ChatMessageInput`、`ChatRole`、`ChatUsage` | 主入口 | ✅ |
| `ModelInfo`、`ModelCapability`、`ProviderKind`、`ProviderPreset` | 主入口 | ✅ |
| `BUILTIN_PRESETS`、`CHAT_PRESETS`、`IMAGE_PRESETS`、`findPreset`，以及 13 个 `*_PRESET` 常量 | 主入口 | ✅ |
| `modelHasCapability`、`isMultimodal`、`pickModel`、`ProviderLike`、`PickModelOptions`、`PickedModel` | 主入口 | ✅ |
| `parseSse`、`SseEvent` | 主入口 | ✅ |
| `KIT_VERSION` | 主入口 | ✅ |
| `generateImage`、`generateImageStandalone`、`ImageGenInput`、`ImageGenResult` | `/image-gen` | ❌ 仅 Node |

## 流式语义

`IProvider.chat(req, signal)` 返回 `AsyncIterable<ChatChunk>`：

```ts
type ChatChunk =
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: { promptTokens: number; completionTokens: number; totalTokens?: number } }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };
```

特性：

- 迭代器对协议级失败**不抛错**：网络异常、非 2xx 响应、JSON 解析失败一律以 `{ type: 'error' }` 事件下发并自然结束。`for await` 外面**不需要** `try/catch`。
- `AbortSignal` 同时作用于 `fetch()` 和 SSE 读取器。Abort 会同时切 socket 和迭代器，干净退出。
- `usage` 事件做了三方言归一化（OpenAI 的 `usage`、Anthropic 的 `message_delta.usage`、Gemini 的 `usageMetadata`）。
- 迭代器**总会终止** —— 每个实现都会在退出前 yield `{ type: 'done' }`（或 `error`）。

## 接入未列入的 OpenAI 兼容厂商

只要厂商讲 OpenAI 的 `/chat/completions` 协议 + Bearer 鉴权，**无需改一行代码**：

```ts
const provider = createProvider('openai-compatible', {
  apiKey: 'your-key',
  baseURL: 'https://your-gateway.example.com/v1',
});
```

完全不同的协议，可以自己实现 `IProvider`：

```ts
import type { IProvider, ChatChunk, ChatRequest } from 's-aiproviders-core';

class MyProvider implements IProvider {
  readonly protocol = 'openai-compatible' as const; // 选最接近的方言挂载即可
  async *chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk> {
    // 你的实现；记得 honour signal；不要 throw —— 用 yield {type:'error'}
  }
}
```

## 在 Electron 中使用

直接放进主进程：

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

主进程可以安全地直接 import 这个库；渲染端不要直接 import 核心，**通过 IPC 桥接**以保持 bundle 体积。

## 在边缘运行时使用

Cloudflare Workers、Vercel Edge、Deno、Bun —— 对话主面全部支持。Image-gen **不支持**边缘运行时（依赖 `node:crypto` + `node:fs`）。

## 常见问题

**为什么不直接用 OpenAI SDK？** 官方 SDK 自带 HTTP 客户端和重试中间件。三家叠在一起，安装体积翻三倍，错误形状还各不相同。本包用 ~25KB 的代码把三家归一化到一个流式契约。

**支持 tool / function calling 吗？** 暂未支持，路线图上会在 `ChatRequest` 增加 `tools` 字段。如果你急需，欢迎提 Issue。

**支持视觉输入（图片消息）吗？** 当前 transport 接受任意 string content；做视觉时把上游期望的 payload 编进 message content 即可。归一化的"图片消息"API 在路线图上。

**API Key 放哪里？** 想放哪都行 —— 库本身**不读环境变量、不读文件**。如果你需要现成的多源加载策略，可以用配套 CLI [`@s-aiproviders/cli`](https://www.npmjs.com/package/@s-aiproviders/cli)，它内置 5 级优先级（CLI flag > 项目 EXTEND.md > 用户 EXTEND.md > 环境变量 > Preset 默认）。

## 配套包

- [`@s-aiproviders/cli`](https://www.npmjs.com/package/@s-aiproviders/cli) — 基于此核心的 Skill / CLI。`npx @s-aiproviders/cli chat ...`。打包了一份 `SKILL.md`，可被 AI agent（Claude Code / Cursor / Codebuddy …）读取自动调用。

## 许可证

[MIT](./LICENSE)
