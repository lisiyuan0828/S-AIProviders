# 从 S-Content 迁移到 S-AIProviders

S-Content 项目里 `packages/providers` 抽出后，原项目可以选择两条路径之一收敛过去。
**注意：image-prompt（5 维度风格画像 / style-vocab / cover prompt）属于 S-Content 自己的业务，不在 kit 中，保留在原项目。**

## 路径 1：直接 `pnpm add`（推荐，仓库 push 后立即可用）

把 `@s-content/providers` 完全替换成 `@s-aiproviders/core`。

### 步骤

1. 在新仓库发布到 npm 或私有 registry：

   ```bash
   cd S-AIProviders
   pnpm --filter @s-aiproviders/core build
   cd packages/core
   npm publish --access public        # 或 --registry <your-registry>
   ```

2. 在 S-Content 把 `packages/providers/` 整个删除（保留 `image-prompt/` 子目录到独立位置）：

   ```bash
   # 先把 image-prompt 抽出来
   mv packages/providers/src/image-prompt packages/style-prompt/src/   # 或留在 apps/desktop/.../style-prompt
   rm -rf packages/providers
   ```

3. 改 imports（搜索全局）：

   | 旧 import | 新 import |
   |---|---|
   | `from '@s-content/providers'` | `from '@s-aiproviders/core'` |
   | `from '@s-content/providers/image-gen'` | `from '@s-aiproviders/core/image-gen'` |
   | `generateImageStandalone` | `generateImage`（同名 alias 也仍可用） |
   | `BUILTIN_PRESETS` 中的那 13 个常量 | 完全同名导出 |
   | `pickModel` / `modelHasCapability` / `isMultimodal` | 完全同名导出 |

4. 处理类型边界。原代码里 `@s-content/shared-types` 的 `ChatChunk / ChatRequest` 与 kit 的同名类型**结构等价但 nominal 不同**：

   - 如果你在 IPC 边界继续用 `@s-content/shared-types`（含 zod 校验）：保留，调用 `provider.chat()` 时把 `ChatRequest` 拆成 kit 期望的字段（`model / messages / temperature / maxTokens`）即可。例如：

     ```ts
     // chat.service.ts
     import { createProvider, type ChatChunk as KitChunk } from '@s-aiproviders/core';
     import type { ChatRequest, ChatChunk } from '@s-content/shared-types';

     for await (const ev of provider.chat(
       { model: req.model, messages: req.messages, temperature: req.temperature, maxTokens: req.maxTokens },
       signal,
     ) as AsyncIterable<KitChunk>) {
       // KitChunk 与 ChatChunk 字段一致；强转或 mapper 任选其一
     }
     ```

   - 如果你想去掉 `@s-content/shared-types` 里的 chat schema 直接用 kit 类型：把 `provider.ts` 的 `ChatChunkSchema/ChatRequestSchema` 仍保留（IPC 边界要 zod 校验），其它消费侧用 kit 类型即可。

5. `image-prompt` 包内部如果用了 `@s-content/shared-types/StyleProfile` 等业务类型，**不动**。

6. `packages/providers/src/image-gen/index.ts` 已被 kit 的 `@s-aiproviders/core/image-gen` 替代，函数名 `generateImage`（保留 alias `generateImageStandalone`）。

## 路径 2：vendor（不发包，把 kit 仓库当 git submodule）

适合还没决定是否公开发布的阶段。

```bash
cd S-Content
git submodule add <kit-repo-url> vendor/S-AIProviders
```

然后 `pnpm-workspace.yaml` 加 `- 'vendor/S-AIProviders/packages/*'`，imports 直接走 `@s-aiproviders/core`，与路径 1 完全一致。

## 兼容性矩阵

| S-Content 旧导出 | kit 中的等价物 |
|---|---|
| `IProvider`, `ProviderInitConfig` | 同名（`@s-aiproviders/core`） |
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
