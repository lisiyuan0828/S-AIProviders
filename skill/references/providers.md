# Provider catalogue & quirks

Run `tsx scripts/main.ts list-presets --json` for the machine-readable list.

## Chat providers

| id | protocol | baseURL | apiKey format | Notes |
|---|---|---|---|---|
| `tokenplan` ★ | openai-compatible | `https://api.lkeap.cloud.tencent.com/plan/v3` | normal API key | One subscription, many upstream models. Note `/plan/v3` suffix |
| `openai` | openai-compatible | `https://api.openai.com/v1` | `sk-...` | Native OpenAI |
| `anthropic` | anthropic | `https://api.anthropic.com/v1` | `sk-ant-...` | Header `x-api-key`, `anthropic-version: 2023-06-01` |
| `gemini` | gemini | `https://generativelanguage.googleapis.com/v1beta` | `AIza...` | Key passed as URL `?key=`; SSE via `alt=sse` |
| `deepseek` | openai-compatible | `https://api.deepseek.com/v1` | `sk-...` | OpenAI-clone |
| `kimi` | openai-compatible | `https://api.moonshot.cn/v1` | `sk-...` | Moonshot (月之暗面) |
| `qwen` | openai-compatible | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `sk-...` | Aliyun DashScope, OpenAI-compat mode |
| `doubao` | openai-compatible | `https://ark.cn-beijing.volces.com/api/v3` | `sk-...` | Volcengine ARK |
| `zhipu` | openai-compatible | `https://open.bigmodel.cn/api/paas/v4` | `*.<key>` | 智谱 GLM |

## Image providers

| id | protocol path | baseURL | apiKey format | Notes |
|---|---|---|---|---|
| `openai-image` | `POST /v1/images/generations` | `https://api.openai.com/v1` | `sk-...` | Sync; supports `1024x1024` / `1792x1024` / `1024x1792` |
| `hunyuan-image` | `POST /v1/images/generations` | `https://api.lkeap.cloud.tencent.com/v1` | lkeap key | OpenAI-compat gateway in front of 混元 |
| `hunyuan-image-tc3` | TC3-signed `SubmitTextToImageJob` | `https://aiart.tencentcloudapi.com` | `SecretId:SecretKey` | Async — submit + poll up to 180s |
| `zhipu-image` | `POST /v1/images/generations` | `https://open.bigmodel.cn/api/paas/v4` | zhipu key | CogView family |

## Common gotchas

- **Token Plan**: model ids are case-sensitive. `tc-code-latest` != `TC-Code-Latest`.
- **Anthropic**: `system` role inside `messages` is rejected. The Skill auto-extracts system messages and forwards them via top-level `system`. `max_tokens` defaults to 4096 if not provided.
- **Gemini**: The protocol is *not* a `/messages` POST; URL contains `:streamGenerateContent?alt=sse&key=...`. The SDK rejects `role: 'system'` inside contents — system goes into `systemInstruction`. Roles `user|assistant` are mapped to `user|model`.
- **Tencent Cloud TC3 (`hunyuan-image-tc3`)**:
  - apiKey **must** be `SecretId:SecretKey` (single colon).
  - Resolution wire format uses `:` not `x` (the kit converts automatically).
  - Async: the kit polls every 2s up to 180s. Beyond that it errors `Tencent image-gen timed out`.
- **OpenAI-clone gateways**: if your provider speaks the OpenAI wire format, you don't need a new protocol — just `--provider openai --baseurl https://your-gateway/v1`. The auth header is always `Authorization: Bearer <apiKey>`.

## Listing live models

For OpenAI-compatible providers the kit supports `provider.listModels()` →
`GET {baseURL}/models`. Most providers support it; Anthropic and Gemini do not
(returns `null`, fall back to `preset.builtinModels`).
