# 更新日志

**s-aiproviders** 的所有显著变更都记录在本文件。

格式参考 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

[English](./CHANGELOG.md) · [简体中文](./CHANGELOG.zh.md)

## 分类约定

变更按以下小节归类：

- **新增 (Added)** — 新功能
- **变更 (Changed)** — 既有行为的改动
- **弃用 (Deprecated)** — 即将删除的特性
- **移除 (Removed)** — 本次发布删除的特性
- **修复 (Fixed)** — 缺陷修复
- **安全 (Security)** — 漏洞修复

---

## [Unreleased]

### 新增
- _在这里登记进行中的条目，发布时晋升到对应版本号下。_

### 变更
### 弃用
### 移除
### 修复
### 安全

---

## [0.1.1] — 2026-05-20

### 变更
- CLI `--help` 输出：移除遗留的 `tsx skill/scripts/main.ts` 开发模式提示（原 monorepo 布局的残留），现指向 `tsx src/cli/main.ts`。发布的 `s-aiproviders` bin 名称未变。
- 重写 `SKILL.md` 以匹配单包布局：`requires.anyBins` 改为 `s-aiproviders` / `npx`（原为 `tsx` / `bun` / `npx`）；CLI 示例不再引用 `${baseDir}/scripts/main.ts`，改用已安装的 bin。
- 顶层文档（`README.md` / `README.zh.md` / `INSTALL.md` / `CHANGELOG*` / `MIGRATION-FROM-S-CONTENT.md`）重写，反映 `s-aiproviders` 现在是同时包含库与 CLI 的单一 npm 包（不再有 `s-aiproviders-core` / `@s-aiproviders/cli` 拆分）。
- `KIT_VERSION` 升级到 `0.1.1`。

### 修复
- 仓库重组后，源码注释与 integration-as-library 参考文档里仍残留 `packages/core` / `skill/scripts` 的旧路径，已修正。

---

## [0.1.0] — 2026-05-19

首个公开版本。`s-aiproviders` 作为**单一 npm 包**发布，库 API 与 CLI 同包内提供。

### 新增 —— 库 API（`s-aiproviders`）

- `IProvider` 抽象 + 三种协议实现：
  - `OpenAICompatibleProvider` —— 覆盖 OpenAI、腾讯 Token Plan、DeepSeek、Kimi、通义、豆包、智谱以及任何 OpenAI 兼容网关。
  - `AnthropicProvider` —— Claude messages API，自动从消息列表中抽出 `system` 内容。
  - `GeminiProvider` —— Google `streamGenerateContent` 走 SSE。
- 流式对话返回 `AsyncIterable<ChatChunk>`，事件归一化为 `delta` / `usage` / `done` / `error`。**协议层错误不抛**。
- `AbortSignal` 端到端贯穿（fetch + SSE 读取器）。
- `parseSse` —— 可复用的 SSE 原语（基于 `ReadableStream<Uint8Array>`）。
- 13 个内置 `ProviderPreset` 常量（9 个对话 + 4 个生图），以及 `BUILTIN_PRESETS`、`CHAT_PRESETS`、`IMAGE_PRESETS`、`findPreset(id)`。
- 能力工具：`modelHasCapability`、`isMultimodal`、`pickModel({ prefer })` —— 跨厂商按能力优先级降级。
- 纯 ESM，完整 `.d.ts` 类型，**零运行时依赖**。
- 主入口浏览器安全 —— 绝不 import `node:*`。

### 新增 —— 子路径 `s-aiproviders/image-gen`（仅 Node）

- OpenAI Images 兼容（DALL·E 3 / gpt-image-1 / CogView / lkeap 网关下的混元）。
- 腾讯云 TC3（`SubmitTextToImageJob`）—— TC3-HMAC-SHA256 签名 + 异步任务轮询（180s 超时）。
- 旧名兼容 alias `generateImageStandalone`。

### 新增 —— 子路径 `s-aiproviders/presets`

- 单独导出预设目录，便于更激进地 tree-shake。

### 新增 —— CLI（`s-aiproviders` bin）

- 与库同包发布的 `bin` 入口，3 个子命令：
  - `chat` —— 流式对话输出到 stdout。支持 `--prompt` / `--promptfile` / stdin 管道 / `--system` / `--temperature` / `--maxtokens` / `--json`。
  - `image` —— 生成 PNG 落盘。支持 `--size` / `--output` / `--name`。
  - `list-presets` —— 列出内置 provider（支持 `--kind chat|image` 和 `--json`）。
- 5 级配置解析：CLI 参数 > 项目 `./.s-aiproviders/EXTEND.md` > 用户 `~/.s-aiproviders/EXTEND.md` > 环境变量 > Preset 默认值。
- 识别 17 种环境变量（通用 `SAIP_*` + 各 provider 专属变量，包括腾讯云的 `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`）。
- 零依赖 argv 解析器；为 `EXTEND.md` 内置极小 YAML 子集解析器。
- 编译为纯 ESM JS，带 `#!/usr/bin/env node` shebang；任何 Node ≥ 18.17 直接跑，无需 `tsx`。

### 新增 —— Agent Skill 资源

- `SKILL.md` 与 `references/` 与 CLI 同包发布，AI Agent（Claude Code / Cursor / Codebuddy）可从 `~/.claude/skills/` 发现并调用 CLI。

### 文档

- 双语 `README.md` / `README.zh.md`、`CHANGELOG.md` / `CHANGELOG.zh.md`。
- `INSTALL.md` —— 终端用户视角的 4 种使用方式（npx · 全局安装 · 库引入 · agent skill）。
- `MIGRATION-FROM-S-CONTENT.md` —— 给原项目 S-Content 的迁移指南，从 `@s-content/providers` 切到本套。
- `SKILL.md` —— Skill 清单（含 frontmatter / 用法示例 / 配置优先级 / 错误处理）。
- `references/` 下的参考文档：`config/extend-md-schema.md`、`config/first-time-setup.md`、`integration-as-library.md`、`providers.md`。

### 构建 / 工程

- TypeScript 严格模式（`noUncheckedIndexedAccess`、`verbatimModuleSyntax: false`），bundler 风格 `moduleResolution`，并配合显式 `.js` 后缀 import 保持 ESM 正确性。
- `scripts/postbuild-shebang.cjs` 在 tsc 编译后回填 shebang + `chmod +x`。
- `prepublishOnly` 自动 `clean` + `build`。`publishConfig.registry` 锁定到 `https://registry.npmjs.org/`，`access: public`。

[Unreleased]: https://github.com/lisiyuan0828/S-AIProviders/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/lisiyuan0828/S-AIProviders/releases/tag/v0.1.1
[0.1.0]: https://github.com/lisiyuan0828/S-AIProviders/releases/tag/v0.1.0
