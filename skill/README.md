# @s-aiproviders/cli

> S-AIProviders Skill / CLI — `npx s-aiproviders <chat|image|list-presets>` for instant access to OpenAI / Anthropic / Gemini / DeepSeek / Kimi / Qwen / Doubao / Zhipu / Token Plan / DALL·E / CogView / Hunyuan, no SDK wiring required.

[English](./README.md) · [简体中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/%40s-aiproviders%2Fcli.svg)](https://www.npmjs.com/package/@s-aiproviders/cli)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.17-brightgreen.svg)](#requirements)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](#license)

This package wraps [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core) into a portable CLI **and** ships a `SKILL.md` consumable by AI agents (Claude Code / Cursor / Codebuddy / …). One install, three modes:

1. **CLI** — `s-aiproviders <cmd>` after `npm i -g`, or `npx @s-aiproviders/cli <cmd>` zero-install.
2. **Agent Skill** — symlink the bundled `SKILL.md` into your agent's skills directory; the agent will discover and invoke the CLI on its own.
3. **Library** — for embedding into your own product, install [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core) directly.

---

## Quick start

```bash
# Zero-install
npx @s-aiproviders/cli list-presets
npx @s-aiproviders/cli chat \
  --provider tokenplan --apikey "$TOKENPLAN_API_KEY" \
  --prompt "Explain Server-Sent Events in one line."

# Or install globally for short commands
npm install -g @s-aiproviders/cli
s-aiproviders chat --provider openai --apikey "$OPENAI_API_KEY" --prompt "hi"
s-aiproviders image --provider openai-image --apikey "$OPENAI_API_KEY" --prompt "a cat icon"
```

## Subcommands

```
s-aiproviders chat              Stream a chat completion
s-aiproviders image             Generate an image (PNG)
s-aiproviders list-presets      List built-in providers
s-aiproviders help              Show full help
```

### Common flags

| Flag | Description |
|---|---|
| `--provider <id>` | Preset id: `tokenplan` / `openai` / `anthropic` / `gemini` / `deepseek` / `kimi` / `qwen` / `doubao` / `zhipu` / `openai-image` / `hunyuan-image` / `hunyuan-image-tc3` / `zhipu-image` |
| `--apikey <key>` | API key. Tencent Cloud TC3: `"SecretId:SecretKey"` |
| `--baseurl <url>` | Override preset's default base URL (proxies, self-hosted gateways) |
| `--model <id>` | Upstream model id |
| `--json` | Machine-readable output |
| `--verbose` | Log resolution info to stderr |

### chat

```bash
s-aiproviders chat --prompt "hello"
s-aiproviders chat --promptfile prompt.md --system "be brief"
s-aiproviders chat --provider anthropic --model claude-sonnet-4 --temperature 0.2 --maxtokens 1024
echo "summarise:" | s-aiproviders chat --provider openai
```

### image

```bash
s-aiproviders image --provider openai-image \
  --prompt "a minimalist cat icon, flat" --size 1024x1024 --output ./out

# Tencent Cloud TC3 (asynchronous, signed)
s-aiproviders image --provider hunyuan-image-tc3 \
  --apikey "$TENCENTCLOUD_SECRET_ID:$TENCENTCLOUD_SECRET_KEY" \
  --prompt "极简风格的猫图标"
```

### list-presets

```bash
s-aiproviders list-presets                 # all 13
s-aiproviders list-presets --kind chat
s-aiproviders list-presets --kind image --json
```

## Configuration priority

The CLI walks five sources in this order; the first one with a value wins:

1. **CLI flags** — `--provider`, `--apikey`, `--baseurl`, `--model`
2. **Project-level** `./.s-aiproviders/EXTEND.md`
3. **User-level** `~/.s-aiproviders/EXTEND.md`
4. **Environment variables** — generic (`SAIP_PROVIDER` / `SAIP_API_KEY` / `SAIP_BASE_URL` / `SAIP_MODEL`) or per-provider (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `DASHSCOPE_API_KEY`, `ARK_API_KEY`, `ZHIPU_API_KEY`, `LKEAP_API_KEY`, `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`, `TOKENPLAN_API_KEY`)
5. **Preset defaults**

### Minimal `EXTEND.md`

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

Place it at `~/.s-aiproviders/EXTEND.md` (personal default) or `./.s-aiproviders/EXTEND.md` (project-local; remember to `.gitignore` the directory).

## Use as an AI-Agent Skill

After `npm install -g @s-aiproviders/cli`, the bundled Skill files live at `$(npm root -g)/@s-aiproviders/cli/`. For Claude Code:

```bash
mkdir -p ~/.claude/skills/s-aiproviders
ln -sfn "$(npm root -g)/@s-aiproviders/cli/SKILL.md"   ~/.claude/skills/s-aiproviders/SKILL.md
ln -sfn "$(npm root -g)/@s-aiproviders/cli/references" ~/.claude/skills/s-aiproviders/references
```

The agent will read `SKILL.md`'s frontmatter and auto-invoke `npx s-aiproviders ...` whenever a request matches the skill description.

## Requirements

- Node.js **≥ 18.17**
- An API key for at least one supported provider

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Runtime error (network, HTTP error, Tencent async timeout, missing prompt body, …) |
| `2` | User error (unknown provider, missing apiKey, invalid flag) |

## Underlying library

For embedding AI into your own TypeScript project, prefer the underlying library directly:

```bash
pnpm add s-aiproviders-core
```

Then `import { createProvider } from 's-aiproviders-core'`. See [`s-aiproviders-core`](https://www.npmjs.com/package/s-aiproviders-core) for the full programmatic API.

## License

[MIT](./LICENSE)
