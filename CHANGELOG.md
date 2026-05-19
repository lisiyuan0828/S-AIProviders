# Changelog

All notable changes to **S-AIProviders** are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

[English](./CHANGELOG.md) · [简体中文](./CHANGELOG.zh.md)

This file aggregates the high-level history across the monorepo. For
package-specific changes, see:

- [`packages/core/CHANGELOG.md`](./packages/core/CHANGELOG.md) — `@s-aiproviders/core`
- [`skill/CHANGELOG.md`](./skill/CHANGELOG.md) — `@s-aiproviders/cli`

## Categories

Changes are grouped under one of the following sections:

- **Added** — new features
- **Changed** — changes to existing behaviour
- **Deprecated** — soon-to-be-removed features
- **Removed** — features removed in this release
- **Fixed** — bug fixes
- **Security** — vulnerability fixes

---

## [Unreleased]

### Added
- _Place new entries here as you work; they will graduate to the next version._

### Changed
### Deprecated
### Removed
### Fixed
### Security

---

## [0.1.0] — 2026-05-19

Initial public release. Two packages ship together:

| Package | Version |
|---|---|
| `@s-aiproviders/core` | 0.1.0 |
| `@s-aiproviders/cli`  | 0.1.0 |

### Added

#### `@s-aiproviders/core`
- `IProvider` abstraction with three protocol implementations:
  - `OpenAICompatibleProvider` — covers OpenAI, Tencent Token Plan, DeepSeek, Kimi, Qwen, Doubao, Zhipu, and any OpenAI-clone gateway.
  - `AnthropicProvider` — Claude messages API with auto-extraction of `system` messages.
  - `GeminiProvider` — Google `streamGenerateContent` over SSE.
- Streaming chat returns `AsyncIterable<ChatChunk>` with normalised `delta` / `usage` / `done` / `error` events. Never throws on protocol-level failures.
- `AbortSignal` honoured end-to-end (fetch + SSE reader).
- `parseSse` — reusable SSE primitive over `ReadableStream<Uint8Array>`.
- 13 built-in `ProviderPreset` constants (9 chat + 4 image), `BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset(id)`.
- Capability helpers: `modelHasCapability`, `isMultimodal`, `pickModel({ prefer })` for cross-provider fallback.
- Node-only image-generation subpath `@s-aiproviders/core/image-gen`:
  - OpenAI Images compatible (DALL·E 3 / gpt-image-1 / CogView / lkeap-gated Hunyuan).
  - Tencent Cloud TC3 (`SubmitTextToImageJob`) — TC3-HMAC-SHA256 signing, async job polling with 180s timeout.
  - Backward-compat alias `generateImageStandalone`.
- Pure ESM, fully typed `.d.ts`, **zero runtime dependencies**.
- Browser-safe main entry — never imports `node:*`.

#### `@s-aiproviders/cli`
- `s-aiproviders` bin with three subcommands:
  - `chat` — streams a chat completion to stdout. Supports `--prompt` / `--promptfile` / piped stdin / `--system` / `--temperature` / `--maxtokens` / `--json`.
  - `image` — generates a PNG to disk. Supports `--size` / `--output` / `--name`.
  - `list-presets` — lists built-in providers (with `--kind chat|image` and `--json`).
- Five-level configuration resolver: CLI flags > project `./.s-aiproviders/EXTEND.md` > user `~/.s-aiproviders/EXTEND.md` > environment variables > preset defaults.
- 17 recognised environment variables (generic `SAIP_*` plus per-provider keys including `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`).
- Zero-dep argv parser; tiny YAML subset parser for `EXTEND.md`.
- Bundled `SKILL.md` + `references/` so AI agents (Claude Code / Cursor / Codebuddy) can discover and invoke the CLI from `~/.claude/skills/`.
- Compiled to plain ESM JS with `#!/usr/bin/env node` shebang; runs on any Node ≥ 18.17 without `tsx`.
- `prepublishOnly` hook auto-builds; `pnpm pack` rewrites `workspace:*` to a concrete version.

### Documentation
- Bilingual READMEs at three layers (repository · core · cli), each with a language-switch link.
- `INSTALL.md` — end-user guide covering all four consumption modes (npx · global install · library · agent skill).
- `MIGRATION-FROM-S-CONTENT.md` — recipe for migrating the originating S-Content project off `@s-content/providers`.
- `skill/SKILL.md` — Skill manifest with frontmatter, usage examples, configuration priority, error handling.
- Reference documents under `skill/references/`: `extend-md-schema.md`, `first-time-setup.md`, `integration-as-library.md`, `providers.md`.

### Build / Tooling
- pnpm workspace with three projects: `packages/core`, `skill`, root.
- TypeScript strict mode (`noUncheckedIndexedAccess`, `verbatimModuleSyntax: false`) on top of NodeNext-compatible explicit `.js` import suffixes.
- `scripts/postbuild-shebang.cjs` re-prepends the shebang and `chmod +x` after tsc compilation.

[Unreleased]: https://github.com/<your-org>/S-AIProviders/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/S-AIProviders/releases/tag/v0.1.0
