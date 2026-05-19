# @s-aiproviders/cli

> S-AIProviders 的 Skill / CLI —— 一行 `npx s-aiproviders <chat|image|list-presets>` 即可对接 OpenAI / Anthropic / Gemini / DeepSeek / Kimi / 通义 / 豆包 / 智谱 / Token Plan / DALL·E / CogView / 混元，不需要写任何 SDK 集成代码。

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/%40s-aiproviders%2Fcli.svg)](https://www.npmjs.com/package/@s-aiproviders/cli)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#环境要求)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#许可证)

这个包把 [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core) 包装成可移植 CLI，**同时**附带一份给 AI Agent（Claude Code / Cursor / Codebuddy …）读取的 `SKILL.md`。一次安装，三种用法：

1. **CLI** —— 全局装后 `s-aiproviders <cmd>`，或 `npx @s-aiproviders/cli <cmd>` 零安装直跑。
2. **AI Agent Skill** —— 把打包好的 `SKILL.md` 软链到 Agent 的 skills 目录，Agent 自动发现并调 CLI。
3. **库** —— 要嵌入自家产品，请直接装 [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core)。

---

## 快速开始

```bash
# 零安装
npx @s-aiproviders/cli list-presets
npx @s-aiproviders/cli chat \
  --provider tokenplan --apikey "$TOKENPLAN_API_KEY" \
  --prompt "用一句话解释 SSE"

# 或者全局安装，命令更短
npm install -g @s-aiproviders/cli
s-aiproviders chat --provider openai --apikey "$OPENAI_API_KEY" --prompt "你好"
s-aiproviders image --provider openai-image --apikey "$OPENAI_API_KEY" --prompt "一只猫的图标"
```

## 子命令

```
s-aiproviders chat              流式对话（输出到 stdout）
s-aiproviders image             生成图片（PNG）
s-aiproviders list-presets      列出内置 provider
s-aiproviders help              查看完整帮助
```

### 通用参数

| 参数 | 说明 |
|---|---|
| `--provider <id>` | Preset id：`tokenplan` / `openai` / `anthropic` / `gemini` / `deepseek` / `kimi` / `qwen` / `doubao` / `zhipu` / `openai-image` / `hunyuan-image` / `hunyuan-image-tc3` / `zhipu-image` |
| `--apikey <key>` | API Key。腾讯云 TC3 用 `"SecretId:SecretKey"` |
| `--baseurl <url>` | 覆盖 preset 默认 baseURL（代理、自部署网关） |
| `--model <id>` | 上游模型 ID |
| `--json` | 机器可读输出 |
| `--verbose` | 解析过程打到 stderr |

### chat

```bash
s-aiproviders chat --prompt "你好"
s-aiproviders chat --promptfile prompt.md --system "请保持简洁"
s-aiproviders chat --provider anthropic --model claude-sonnet-4 --temperature 0.2 --maxtokens 1024
echo "总结这段话：" | s-aiproviders chat --provider openai
```

### image

```bash
s-aiproviders image --provider openai-image \
  --prompt "极简风格的猫图标" --size 1024x1024 --output ./out

# 腾讯云 TC3（异步签名）
s-aiproviders image --provider hunyuan-image-tc3 \
  --apikey "$TENCENTCLOUD_SECRET_ID:$TENCENTCLOUD_SECRET_KEY" \
  --prompt "极简风格的猫图标"
```

### list-presets

```bash
s-aiproviders list-presets                 # 全部 13 个
s-aiproviders list-presets --kind chat
s-aiproviders list-presets --kind image --json
```

## 配置优先级

CLI 按以下 5 级顺序解析参数，**前一级有值则胜出**：

1. **CLI 参数** —— `--provider`、`--apikey`、`--baseurl`、`--model`
2. **项目级** `./.s-aiproviders/EXTEND.md`
3. **用户级** `~/.s-aiproviders/EXTEND.md`
4. **环境变量** —— 通用（`SAIP_PROVIDER` / `SAIP_API_KEY` / `SAIP_BASE_URL` / `SAIP_MODEL`）或各 provider 专属（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY`、`DASHSCOPE_API_KEY`、`ARK_API_KEY`、`ZHIPU_API_KEY`、`LKEAP_API_KEY`、`TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`、`TOKENPLAN_API_KEY`）
5. **Preset 默认值**

### 最小 `EXTEND.md`

```yaml
default_provider: tokenplan
default_model:
  tokenplan: tc-code-latest
providers:
  tokenplan:
    api_key: sk-tplan-xxxxx
  openai:
    api_key: sk-xxxxx
```

放在 `~/.s-aiproviders/EXTEND.md`（个人默认）或 `./.s-aiproviders/EXTEND.md`（项目级；记得把 `.s-aiproviders/` 目录加进 `.gitignore`）。

## 作为 AI Agent Skill 使用

`npm install -g @s-aiproviders/cli` 后，Skill 文件位于 `$(npm root -g)/@s-aiproviders/cli/`。以 Claude Code 为例：

```bash
mkdir -p ~/.claude/skills/s-aiproviders
ln -sfn "$(npm root -g)/@s-aiproviders/cli/SKILL.md"   ~/.claude/skills/s-aiproviders/SKILL.md
ln -sfn "$(npm root -g)/@s-aiproviders/cli/references" ~/.claude/skills/s-aiproviders/references
```

之后 Agent 会读 `SKILL.md` frontmatter，并在用户请求匹配 description 时自动调 `npx s-aiproviders ...`。

## 环境要求

- Node.js **≥ 18.17**
- 至少一个支持的 provider 的 API Key

## 退出码

| 码 | 含义 |
|---|---|
| `0` | 成功 |
| `1` | 运行时错误（网络、HTTP 错误、腾讯异步任务超时、缺 prompt body 等） |
| `2` | 用户错误（未知 provider、缺 apiKey、参数非法） |

## 底层库

如果你要把 AI 嵌入自己的 TypeScript 项目，**直接装底层库**更合适：

```bash
pnpm add s-aiproviders-core
```

然后 `import { createProvider } from 's-aiproviders-core'`。完整的编程式 API 见 [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core)。

## 许可证

[MIT](./LICENSE)
