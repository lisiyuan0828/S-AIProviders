# 更新日志 — `@s-aiproviders/cli`

`@s-aiproviders/cli` 包的所有显著变更都记录在本文件。

格式参考 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

> CLI 是 [`@s-aiproviders/core`](../packages/core) 的薄包装。Provider 目录的变更记录在 core 包的 CHANGELOG 中。

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

- `s-aiproviders` 命令（同样可通过 `npx @s-aiproviders/cli` 运行）。
- 子命令 `chat`：
  - 实时把对话流推到 stdout。
  - 输入：`--prompt <text>`、`--promptfile <path>`，或 stdin 管道。
  - `--system <text>` 设定系统消息。
  - `--temperature <n>`、`--maxtokens <n>`。
  - `--json` 机器可读输出（`{ ok, content, usage }` 或 `{ ok:false, error, partial }`）。
  - `SIGINT`（Ctrl-C）经 `AbortSignal` 中止上游请求。
- 子命令 `image`：
  - 生成 PNG 落盘。
  - `--prompt`（必填）、`--size <宽x高>`（默认 `1024x1024`）、`--output <dir>`（默认 `./output`）、`--name <base>` 自定义文件基名。
  - 当 `baseURL` 含 `tencentcloudapi.com` 时自动走腾讯云 TC3 路径。
- 子命令 `list-presets`（别名 `list`）：列出内置目录。`--kind chat|image` 过滤、`--json` 原始 JSON。
- 帮助：`s-aiproviders help`（或 `-h` / `--help`）。
- 5 级配置解析器（`config.ts`）：
  1. CLI 参数。
  2. 项目级 `./.s-aiproviders/EXTEND.md`。
  3. 用户级 `~/.s-aiproviders/EXTEND.md`。
  4. 环境变量 —— 通用 `SAIP_PROVIDER` / `SAIP_API_KEY` / `SAIP_BASE_URL` / `SAIP_MODEL` / `SAIP_PROTOCOL`，以及各 provider 专属：`TOKENPLAN_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY` / `GOOGLE_API_KEY`、`DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY` / `KIMI_API_KEY`、`DASHSCOPE_API_KEY` / `QWEN_API_KEY`、`ARK_API_KEY` / `DOUBAO_API_KEY`、`ZHIPU_API_KEY` / `BIGMODEL_API_KEY`、`LKEAP_API_KEY` / `HUNYUAN_API_KEY`、`TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`。
  5. Preset 默认值（`defaultBaseURL`、`builtinModels[0].id`）。
- 当 `--provider` 缺省时，根据环境变量自动推断（`OPENAI_API_KEY` → `openai` 等）。
- 零依赖的极小 YAML 子集解析器，用于 `EXTEND.md`（支持 frontmatter 或顶层 YAML 文档）。
- 零依赖 argv 解析器，支持 `--key value`、`--key=value` 与单字母别名。
- npm tarball 内置文件：`dist/`、`SKILL.md`、`references/`、`README.md`、`README.zh.md`。
- 给 AI Agent（Claude Code / Cursor / Codebuddy）读的 `SKILL.md`：
  - frontmatter 含 `name` / `description` / `version` / `metadata.requires`。
  - Step-0 阻塞性检查 `EXTEND.md`，未命中走首次设置流程。
  - 各 provider 细节坑位记录在 `references/providers.md`。
- `references/` 下的参考文档：
  - `config/extend-md-schema.md` —— 完整 EXTEND.md schema + 示例。
  - `config/first-time-setup.md` —— 交互式首次设置流程。
  - `integration-as-library.md` —— 直接使用 `@s-aiproviders/core` 的集成示例。
  - `providers.md` —— 各 provider 的协议坑位与 apiKey 格式。
- 编译为纯 ESM JS，带 `#!/usr/bin/env node` shebang；任何 Node ≥ 18.17 无需 `tsx` 直接跑。Shebang 由 `scripts/postbuild-shebang.cjs` 在 build 后回填，bin 文件自动 `chmod +x`。
- `prepublishOnly` 钩子自动 `clean` + `build`；pnpm 在 pack 时把 `workspace:*` 改写为具体版本号。

### 退出码

- `0` —— 成功
- `1` —— 运行时错误（网络 / HTTP / 腾讯云异步任务超时 / 生图接口空数据 / 缺 prompt body）
- `2` —— 用户错误（未知 provider、缺 apiKey、参数非法、未知子命令）

[Unreleased]: https://github.com/lisiyuan0828/S-AIProviders/compare/cli-v0.1.0...HEAD
[0.1.0]: https://github.com/lisiyuan0828/S-AIProviders/releases/tag/cli-v0.1.0
