---
name: s-aiproviders
description: "Unified AI provider abstraction. One Skill, every model — OpenAI / Anthropic / Gemini / DeepSeek / Kimi / Qwen / Doubao / Zhipu / Tencent Token Plan / Hunyuan / DALL·E / CogView. Streaming chat, image generation, model auto-pick. Use this Skill whenever the user wants to call an LLM or generate an image without wiring up a fresh SDK in their project."
version: 0.1.0
metadata:
  homepage: https://github.com/lisiyuan0828/S-AIProviders
  requires:
    anyBins:
      - tsx
      - bun
      - npx
---

# S-AIProviders

Single Skill that gives any project a working AI integration:

| Capability | What you get |
|---|---|
| **Streaming chat** | OpenAI-compatible · Anthropic · Gemini, with token-usage reporting and `AbortSignal` support |
| **Image generation** | OpenAI Images (DALL·E / gpt-image-1 / CogView / Hunyuan@lkeap) and Tencent Cloud TC3 (混元生图 3.0) |
| **Built-in presets** | 9 chat + 4 image providers (Token Plan / OpenAI / Anthropic / Gemini / DeepSeek / Kimi / Qwen / Doubao / Zhipu / DALL·E / Hunyuan / CogView) |
| **Model auto-pick** | `pickModel(prefer: ['image-gen','vision','text'])` for fallback chains |
| **Two consumption modes** | (a) **Skill CLI** — run scripts directly. (b) **npm package `s-aiproviders-core`** — `import` it into any TS/JS project. |

> Two-track design: when the user just wants to "run a thing" (one-off scripts, automations, terminal pipelines) → use the **Skill CLI**. When the user is integrating into a real codebase (Electron / Node service / Vite app) → install the **npm package** instead. Both share the same provider catalogue.

---

## Step 0: Decide consumption mode (BLOCKING)

Before generating any code, decide which mode the user needs. Use these heuristics:

| Signal | Mode |
|---|---|
| User has an active TS/JS project (`package.json` present) and asks "add AI to my project" | **npm package** — install `s-aiproviders-core`, follow `references/integration-as-library.md` |
| User asks for a one-off LLM call, batch script, automation, terminal pipeline, `cron` task | **Skill CLI** — run `scripts/main.ts` |
| Ambiguous | Ask user: "Do you want me to wire this into your project (library), or just run it once (CLI)?" |

If `EXTEND.md` is missing → run `references/config/first-time-setup.md` to collect provider + apiKey + default model, then write `~/.s-aiproviders/EXTEND.md`.

---

## Skill CLI usage

`{baseDir}` = this `SKILL.md`'s directory. Resolve runner: prefer `tsx`; else `bun`; else `npx -y tsx`.

```bash
# List all built-in providers
${RUNNER} ${baseDir}/scripts/main.ts list-presets
${RUNNER} ${baseDir}/scripts/main.ts list-presets --kind image --json

# Chat (streams to stdout)
${RUNNER} ${baseDir}/scripts/main.ts chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --model tc-code-latest \
  --prompt "用一句话解释 SSE 协议"

# Chat from file + system prompt + JSON output
${RUNNER} ${baseDir}/scripts/main.ts chat \
  --provider anthropic --model claude-sonnet-4 \
  --system "You are a senior TS engineer." \
  --promptfile review.md \
  --json

# Pipe stdin
echo "summarise this" | ${RUNNER} ${baseDir}/scripts/main.ts chat --provider openai

# Image
${RUNNER} ${baseDir}/scripts/main.ts image \
  --provider openai-image --model dall-e-3 \
  --prompt "a minimalist cat icon, flat" \
  --size 1024x1024 --output ./out

# Image via Tencent Cloud TC3 (apiKey = "SecretId:SecretKey")
${RUNNER} ${baseDir}/scripts/main.ts image \
  --provider hunyuan-image-tc3 \
  --apikey "$TENCENTCLOUD_SECRET_ID:$TENCENTCLOUD_SECRET_KEY" \
  --prompt "极简风格的猫图标" \
  --size 1024x1024
```

### Common flags

| Flag | Description |
|---|---|
| `--provider <id>`, `-p` | One of `tokenplan` / `openai` / `anthropic` / `gemini` / `deepseek` / `kimi` / `qwen` / `doubao` / `zhipu` / `openai-image` / `hunyuan-image` / `hunyuan-image-tc3` / `zhipu-image` |
| `--apikey <key>`, `-k` | API key. For Tencent Cloud TC3 use `"SecretId:SecretKey"` |
| `--baseurl <url>`, `-b` | Override preset's default base URL (proxies, self-hosted gateways, OpenAI-compat clones) |
| `--model <id>`, `-m` | Upstream model id (e.g. `gpt-4o-mini`, `claude-sonnet-4`, `gemini-2.5-flash`, `tc-code-latest`) |
| `--json` | Emit one-line JSON to stdout (instead of streaming text) |
| `--verbose`, `-v` | Print resolution info (provider/baseURL/model) to stderr |

### Chat-only flags

| Flag | Description |
|---|---|
| `--prompt <text>` | User prompt. May be omitted if `--promptfile` or piped stdin is used |
| `--promptfile <path>` | Read prompt from a file |
| `--system <text>`, `-s` | System message |
| `--temperature <n>`, `-t` | Float, typically 0..1 |
| `--maxtokens <n>` | Max output tokens (Anthropic max_tokens / OpenAI max_tokens / Gemini maxOutputTokens) |

### Image-only flags

| Flag | Description |
|---|---|
| `--prompt <text>` | Required |
| `--size <WxH>` | Default `1024x1024`. OpenAI also supports `1792x1024` / `1024x1792`. Tencent TC3 accepts e.g. `1024x1024`, `1080x1920` |
| `--output <dir>`, `-o` | Output directory (default `./output`) |
| `--name <base>` | Output file base name without extension |

---

## Configuration priority (highest → lowest)

1. **CLI flags** — `--provider`, `--apikey`, `--baseurl`, `--model`, etc.
2. **Project-level** `./.s-aiproviders/EXTEND.md`
3. **User-level** `~/.s-aiproviders/EXTEND.md`
4. **Environment variables**:
   - Generic: `SAIP_PROVIDER`, `SAIP_API_KEY`, `SAIP_BASE_URL`, `SAIP_MODEL`
   - Per-provider: `TOKENPLAN_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (alias `GOOGLE_API_KEY`) / `DEEPSEEK_API_KEY` / `MOONSHOT_API_KEY` (alias `KIMI_API_KEY`) / `DASHSCOPE_API_KEY` (alias `QWEN_API_KEY`) / `ARK_API_KEY` (alias `DOUBAO_API_KEY`) / `ZHIPU_API_KEY` (alias `BIGMODEL_API_KEY`) / `LKEAP_API_KEY` (alias `HUNYUAN_API_KEY`) / `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`
5. **Preset defaults** — `defaultBaseURL` and `builtinModels[0].id` of the chosen preset.

EXTEND.md schema and an example: `references/config/extend-md-schema.md`.

---

## When this Skill should fire

Trigger this Skill whenever the user mentions any of:

- "调用大模型 / call an LLM / chat completion / streaming chat / SSE 流式输出"
- "AI provider / 大模型对接 / 模型接入 / 一键加 AI"
- A specific provider name (OpenAI / Claude / Gemini / DeepSeek / Kimi / 通义 / 豆包 / 智谱 / 腾讯 Token Plan / 混元生图 / DALL·E / CogView)
- "文生图 / image generation / generate an image" (text-to-image)
- "我想给项目加上 AI 能力 / AI 接口 / AI 集成"

Do **not** fire when the user only wants a one-off completion against an SDK they already have configured.

---

## npm package mode (when integrating into a project)

Install:

```bash
pnpm add s-aiproviders-core
# or: npm i s-aiproviders-core / yarn add s-aiproviders-core
```

Minimal chat:

```ts
import { createProvider, TOKENPLAN_PRESET } from 's-aiproviders-core';

const provider = createProvider('openai-compatible', {
  apiKey: process.env.TOKENPLAN_API_KEY!,
  baseURL: TOKENPLAN_PRESET.defaultBaseURL,
});

const ac = new AbortController();
for await (const ev of provider.chat(
  { model: 'tc-code-latest', messages: [{ role: 'user', content: 'hi' }] },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
  if (ev.type === 'error') console.error(ev.code, ev.message);
}
```

Image generation (Node only — uses `node:crypto` / `node:fs`):

```ts
import { generateImage } from 's-aiproviders-core/image-gen';

const result = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'dall-e-3',
  prompt: 'a minimalist cat icon',
  size: '1024x1024',
  outputDir: './out',
});
console.log(result.filePath);
```

Full integration recipes (model picker, multi-provider fallback, Electron main-process pattern):
`references/integration-as-library.md`.

---

## Error handling

- Missing apiKey → CLI exits with `2` and prints all valid sources
- Network / HTTP error → `chat` yields `{ type: 'error', code, message }` (never throws); CLI exit `1`
- Tencent Cloud async job timeout (180s) → image command exits `1` with explanation
- All commands honour `SIGINT` (Ctrl-C) → aborts the underlying fetch via `AbortSignal`

---

## References

| File | Content |
|---|---|
| `references/config/extend-md-schema.md` | EXTEND.md schema + full example |
| `references/config/first-time-setup.md` | Interactive first-time setup script |
| `references/integration-as-library.md` | Use the npm package directly inside a project |
| `references/providers.md` | Per-provider quirks, base URL gotchas, apiKey formats |

## Limitations

- Chat protocols implemented: `openai-compatible`, `anthropic`, `gemini`. Other "OpenAI-clone" providers can be added by setting `--baseurl` against `openai-compatible`.
- Image protocols implemented: OpenAI-compatible `/v1/images/generations` and Tencent Cloud TC3 (`SubmitTextToImageJob` async). No tool/function calling; no streaming for image; no batch parallelism (use shell `xargs -P` if needed).
- Browser-side: only the chat protocols are browser-safe. The image-gen submodule must run in Node.
