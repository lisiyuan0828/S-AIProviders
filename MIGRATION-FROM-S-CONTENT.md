# 从 S-Content 迁移到 s-aiproviders

S-Content 项目里 `packages/providers` 抽出后，原项目可以选择两条路径之一收敛过去。
**注意：image-prompt（5 维度风格画像 / style-vocab / cover prompt）属于 S-Content 自己的业务，不在 s-aiproviders 中，保留在原项目。**

## 路径 1：直接 `pnpm add`（推荐，已发布到 npm）

把 `@s-content/providers` 完全替换成 `s-aiproviders`。

### 步骤

1. 在原 S-Content 项目里安装：

   ```bash
   pnpm add s-aiproviders
   ```

2. 把 `packages/providers/` 整个删除（保留 `image-prompt/` 子目录到独立位置）：

   ```bash
   # 先把 image-prompt 抽出来
   mv packages/providers/src/image-prompt packages/style-prompt/src/   # 或留在 apps/desktop/.../style-prompt
   rm -rf packages/providers
   ```

3. 改 imports（搜索全局）：

   | 旧 import | 新 import |
   |---|---|
   | `from '@s-content/providers'` | `from 's-aiproviders'` |
   | `from '@s-content/providers/image-gen'` | `from 's-aiproviders/image-gen'` |
   | `generateImageStandalone` | `generateImage`（同名 alias 也仍可用） |
   | `BUILTIN_PRESETS` 中的那 13 个常量 | 完全同名导出 |
   | `pickModel` / `modelHasCapability` / `isMultimodal` | 完全同名导出 |

4. 处理类型边界。原代码里 `@s-content/shared-types` 的 `ChatChunk / ChatRequest` 与 s-aiproviders 的同名类型**结构等价但 nominal 不同**：

   - 如果你在 IPC 边界继续用 `@s-content/shared-types`（含 zod 校验）：保留，调用 `provider.chat()` 时把 `ChatRequest` 拆成 s-aiproviders 期望的字段（`model / messages / temperature / maxTokens`）即可。例如：

     ```ts
     // chat.service.ts
     import { createProvider, type ChatChunk as KitChunk } from 's-aiproviders';
     import type { ChatRequest, ChatChunk } from '@s-content/shared-types';

     for await (const ev of provider.chat(
       { model: req.model, messages: req.messages, temperature: req.temperature, maxTokens: req.maxTokens },
       signal,
     ) as AsyncIterable<KitChunk>) {
       // KitChunk 与 ChatChunk 字段一致；强转或 mapper 任选其一
     }
     ```

   - 如果你想去掉 `@s-content/shared-types` 里的 chat schema 直接用 s-aiproviders 类型：把 `provider.ts` 的 `ChatChunkSchema/ChatRequestSchema` 仍保留（IPC 边界要 zod 校验），其它消费侧用 s-aiproviders 类型即可。

5. `image-prompt` 包内部如果用了 `@s-content/shared-types/StyleProfile` 等业务类型，**不动**。

6. `packages/providers/src/image-gen/index.ts` 已被 `s-aiproviders/image-gen` 替代，函数名 `generateImage`（保留 alias `generateImageStandalone`）。

## 路径 2：vendor（不发包，把仓库当 git submodule）

适合还没决定是否公开发布、或想在私有 fork 上迭代的阶段。

```bash
cd S-Content
git submodule add <s-aiproviders-repo-url> vendor/s-aiproviders
```

然后在原 S-Content 项目里直接 `import` `s-aiproviders` 即可（pnpm 会通过 workspace 协议 / file 链接解析过去），与路径 1 完全一致。

> 注意：`s-aiproviders` 现在是**单包**仓库（`src/` 在仓库根），`vendor/s-aiproviders` 直接对应仓库根，**不再**是 `vendor/.../packages/*` 这种结构。

## 兼容性矩阵

| S-Content 旧导出 | s-aiproviders 中的等价物 |
|---|---|
| `IProvider`, `ProviderInitConfig` | 同名（`s-aiproviders`） |
| `OpenAICompatibleProvider`, `AnthropicProvider`, `GeminiProvider` | 同名 |
| `createProvider` | 同名 |
| `ProviderProtocol`, `ModelCapability`, `ModelInfo`, `ProviderKind`, `ProviderPreset` | 同名 |
| `TOKENPLAN_PRESET` …（13 个 preset 常量） | 同名 |
| `BUILTIN_PRESETS` | 同名 |
| `pickModel`, `modelHasCapability`, `isMultimodal` | 同名 |
| `PROVIDERS_VERSION` | 重命名为 `KIT_VERSION` |
| `generateImageStandalone` | 同名（alias），新规范名 `generateImage` |
| `autoSelectStyleProfile`, `buildCoverPrompt`, `buildStyleAutoSelectPrompt` | **未迁入**（业务相关，留在 S-Content） |

## 验证清单

- [ ] `pnpm --filter @s-content/desktop typecheck` 通过
- [ ] `pnpm --filter @s-content/renderer typecheck` 通过
- [ ] `chat.service.ts` 流式回包正常（IPC `chat:chunk:` 仍按原 zod 校验）
- [ ] `image.service.ts` 生图链路正常（DALL·E / Hunyuan TC3 / lkeap 三条都验过）
- [ ] `style-auto-select.service.ts` 正常（依赖未迁出的 image-prompt）
