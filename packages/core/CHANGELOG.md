# Changelog — `@s-aiproviders/core`

All notable changes to the `@s-aiproviders/core` package are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and the package adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

> While the major version is `0.x`, breaking changes may land between minor versions and will always be flagged in the **Changed** / **Removed** sections.

---

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

---

## [0.1.0] — 2026-05-19

Initial public release.

### Added

- `IProvider` abstraction (`protocol`, `chat(req, signal)`, optional `listModels()`).
- `createProvider(protocol, cfg)` factory.
- Three protocol implementations:
  - `OpenAICompatibleProvider` — `POST {baseURL}/chat/completions` with Bearer auth, SSE-terminated `[DONE]`, `usage` parsing.
  - `AnthropicProvider` — `POST {baseURL}/messages` with `x-api-key`, `anthropic-version: 2023-06-01`, `message_*` event parsing.
  - `GeminiProvider` — `POST {baseURL}/models/{model}:streamGenerateContent?alt=sse&key={apiKey}`, role mapping (`assistant` → `model`), `systemInstruction` extraction.
- `ChatChunk` discriminated union: `delta` / `usage` / `done` / `error` — never throws on protocol failures.
- End-to-end `AbortSignal` propagation (forwarded to `fetch` and the SSE reader).
- `parseSse(stream, signal)` — reusable SSE primitive.
- 13 built-in `ProviderPreset` constants:
  - **Chat**: `TOKENPLAN_PRESET` ★, `OPENAI_PRESET`, `ANTHROPIC_PRESET`, `GEMINI_PRESET`, `DEEPSEEK_PRESET`, `KIMI_PRESET`, `QWEN_PRESET`, `DOUBAO_PRESET`, `ZHIPU_PRESET`.
  - **Image**: `OPENAI_IMAGE_PRESET`, `HUNYUAN_IMAGE_PRESET`, `HUNYUAN_IMAGE_TC3_PRESET`, `ZHIPU_IMAGE_PRESET`.
- Aggregations: `BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset(id)`.
- Capability helpers: `modelHasCapability`, `isMultimodal`.
- `pickModel(providers, { prefer, providerId? })` — cross-provider capability-priority fallback.
- Node-only subpath `@s-aiproviders/core/image-gen`:
  - `generateImage(input)` (alias `generateImageStandalone`).
  - OpenAI-compatible `POST /v1/images/generations` with `b64_json` response.
  - Tencent Cloud TC3 (`SubmitTextToImageJob` + `QueryTextToImageJob`) with TC3-HMAC-SHA256 signing, 2s polling, 180s timeout.
  - `ImageGenInput` / `ImageGenResult` types.
- `KIT_VERSION` constant.
- Pure ESM, complete `.d.ts`, **zero runtime dependencies**.
- Browser-safe main entry; `node:crypto` / `node:fs` confined to the `/image-gen` subpath.

### Notes

- `protocol` field on image-only presets is set to `'openai-compatible'` for type uniformity; the actual image-gen path is selected by `baseURL` inside `generateImage` (anything containing `tencentcloudapi.com` → TC3 path).
- The library never reads environment variables, files, or globals. Configuration is fully caller-supplied.

[Unreleased]: https://github.com/<your-org>/S-AIProviders/compare/core-v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/S-AIProviders/releases/tag/core-v0.1.0
