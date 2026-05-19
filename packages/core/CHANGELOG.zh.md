# 更新日志 — `@s-aiproviders/core`

`@s-aiproviders/core` 包的所有显著变更都记录在本文件。

格式参考 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

> 主版本仍处于 `0.x` 时，破坏性变更可能在 minor 版本之间发生，会在 **变更** / **移除** 小节显式标注。

---

## [Unreleased]

### 新增
### 变更
### 弃用
### 移除
### 修复
### 安全

---

## [0.1.0] — 2026-05-19

首个公开版本。

### 新增

- `IProvider` 抽象（`protocol`、`chat(req, signal)`、可选 `listModels()`）。
- `createProvider(protocol, cfg)` 工厂函数。
- 3 种协议实现：
  - `OpenAICompatibleProvider` —— `POST {baseURL}/chat/completions`，Bearer 鉴权，SSE 以 `[DONE]` 收尾，解析 `usage`。
  - `AnthropicProvider` —— `POST {baseURL}/messages`，`x-api-key` + `anthropic-version: 2023-06-01`，解析 `message_*` 事件。
  - `GeminiProvider` —— `POST {baseURL}/models/{model}:streamGenerateContent?alt=sse&key={apiKey}`，自动做角色映射（`assistant` → `model`）、抽出 `systemInstruction`。
- `ChatChunk` 判别联合：`delta` / `usage` / `done` / `error` —— **协议层错误不抛**。
- `AbortSignal` 端到端透传（同时作用于 `fetch` 和 SSE 读取器）。
- `parseSse(stream, signal)` —— 可复用的 SSE 原语。
- 13 个内置 `ProviderPreset` 常量：
  - **对话**：`TOKENPLAN_PRESET` ★、`OPENAI_PRESET`、`ANTHROPIC_PRESET`、`GEMINI_PRESET`、`DEEPSEEK_PRESET`、`KIMI_PRESET`、`QWEN_PRESET`、`DOUBAO_PRESET`、`ZHIPU_PRESET`。
  - **生图**：`OPENAI_IMAGE_PRESET`、`HUNYUAN_IMAGE_PRESET`、`HUNYUAN_IMAGE_TC3_PRESET`、`ZHIPU_IMAGE_PRESET`。
- 聚合导出：`BUILTIN_PRESETS`、`CHAT_PRESETS`、`IMAGE_PRESETS`、`findPreset(id)`。
- 能力工具：`modelHasCapability`、`isMultimodal`。
- `pickModel(providers, { prefer, providerId? })` —— 跨厂商按能力优先级降级。
- 仅 Node 子路径 `@s-aiproviders/core/image-gen`：
  - `generateImage(input)`（旧名 alias `generateImageStandalone`）。
  - OpenAI 兼容 `POST /v1/images/generations`（`b64_json` 响应）。
  - 腾讯云 TC3（`SubmitTextToImageJob` + `QueryTextToImageJob`），TC3-HMAC-SHA256 签名，2s 轮询，180s 超时。
  - 类型 `ImageGenInput` / `ImageGenResult`。
- `KIT_VERSION` 常量。
- 纯 ESM，完整 `.d.ts`，**零运行时依赖**。
- 主入口浏览器安全；`node:crypto` / `node:fs` 仅限 `/image-gen` 子路径。

### 备注

- 仅生图的 preset 上 `protocol` 字段统一写为 `'openai-compatible'`（类型一致性），实际生图路径由 `generateImage` 内部根据 `baseURL` 判定（含 `tencentcloudapi.com` → 走 TC3）。
- 库本身**不读环境变量、不读文件、不动全局对象**，配置全部由调用方注入。

[Unreleased]: https://github.com/<your-org>/S-AIProviders/compare/core-v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/S-AIProviders/releases/tag/core-v0.1.0
