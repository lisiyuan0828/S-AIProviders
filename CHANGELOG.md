# Changelog

All notable changes to **s-aiproviders** are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

[English](./CHANGELOG.md) · [简体中文](./CHANGELOG.zh.md)

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

## [0.1.1] — 2026-05-20

### Changed
- CLI `--help` output: removed stale `tsx skill/scripts/main.ts` dev-mode hint (artifact of the old monorepo layout); now points to `tsx src/cli/main.ts`. The shipped `s-aiproviders` bin name is unchanged.
- `SKILL.md` rewritten for single-package layout: `requires.anyBins` is now `s-aiproviders` / `npx` (was `tsx` / `bun` / `npx`); CLI examples no longer reference `${baseDir}/scripts/main.ts` and instead use the installed bin.
- Top-level docs (`README.md` / `README.zh.md` / `INSTALL.md` / `CHANGELOG*` / `MIGRATION-FROM-S-CONTENT.md`) rewritten to reflect that `s-aiproviders` is now a single npm package containing both the library and the CLI (no more `s-aiproviders-core` / `@s-aiproviders/cli` split).
- `KIT_VERSION` bumped to `0.1.1`.

### Fixed
- Source-code comments and the integration-as-library reference still mentioned the old `packages/core` / `skill/scripts` paths after the repo restructure; corrected.

---

## [0.1.0] — 2026-05-19

Initial public release. `s-aiproviders` ships as a single npm package containing both the library API and the CLI.

### Added — Library API (`s-aiproviders`)

- `IProvider` abstraction with three protocol implementations:
  - `OpenAICompatibleProvider` — covers OpenAI, Tencent Token Plan, DeepSeek, Kimi, Qwen, Doubao, Zhipu, and any OpenAI-clone gateway.
  - `AnthropicProvider` — Claude messages API with auto-extraction of `system` messages.
  - `GeminiProvider` — Google `streamGenerateContent` over SSE.
- Streaming chat returns `AsyncIterable<ChatChunk>` with normalised `delta` / `usage` / `done` / `error` events. Never throws on protocol-level failures.
- `AbortSignal` honoured end-to-end (fetch + SSE reader).
- `parseSse` — reusable SSE primitive over `ReadableStream<Uint8Array>`.
- 13 built-in `ProviderPreset` constants (9 chat + 4 image), `BUILTIN_PRESETS`, `CHAT_PRESETS`, `IMAGE_PRESETS`, `findPreset(id)`.
- Capability helpers: `modelHasCapability`, `isMultimodal`, `pickModel({ prefer })` for cross-provider fallback.
- Pure ESM, fully typed `.d.ts`, **zero runtime dependencies**.
- Browser-safe main entry — never imports `node:*`.

### Added — Subpath `s-aiproviders/image-gen` (Node only)

- OpenAI Images compatible (DALL·E 3 / gpt-image-1 / CogView / lkeap-gated Hunyuan).
- Tencent Cloud TC3 (`SubmitTextToImageJob`) — TC3-HMAC-SHA256 signing, async job polling with 180s timeout.
- Backward-compat alias `generateImageStandalone`.

### Added — Subpath `s-aiproviders/presets`

- Standalone preset catalogue export for aggressively tree-shaken consumers.

### Added — CLI (`s-aiproviders` bin)

- Three subcommands shipped as a `bin` entry inside the same package:
  - `chat` — streams a chat completion to stdout. Supports `--prompt` / `--promptfile` / piped stdin / `--system` / `--temperature` / `--maxtokens` / `--json`.
  - `image` — generates a PNG to disk. Supports `--size` / `--output` / `--name`.
  - `list-presets` — lists built-in providers (with `--kind chat|image` and `--json`).
- Five-level configuration resolver: CLI flags > project `./.s-aiproviders/EXTEND.md` > user `~/.s-aiproviders/EXTEND.md` > environment variables > preset defaults.
- 17 recognised environment variables (generic `SAIP_*` plus per-provider keys including `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`).
- Zero-dep argv parser; tiny YAML subset parser for `EXTEND.md`.
- Compiled to plain ESM JS with `#!/usr/bin/env node` shebang; runs on any Node ≥ 18.17 without `tsx`.

### Added — Agent Skill assets

- Bundled `SKILL.md` + `references/` ship in the same tarball, so AI agents (Claude Code / Cursor / Codebuddy) can discover and invoke the CLI from `~/.claude/skills/`.

### Documentation

- Bilingual `README.md` / `README.zh.md` and `CHANGELOG.md` / `CHANGELOG.zh.md`.
- `INSTALL.md` — end-user guide covering all four consumption modes (npx · global install · library · agent skill).
- `MIGRATION-FROM-S-CONTENT.md` — recipe for migrating the originating S-Content project off `@s-content/providers`.
- `SKILL.md` — Skill manifest with frontmatter, usage examples, configuration priority, error handling.
- Reference documents under `references/`: `config/extend-md-schema.md`, `config/first-time-setup.md`, `integration-as-library.md`, `providers.md`.

### Build / Tooling

- TypeScript strict mode (`noUncheckedIndexedAccess`, `verbatimModuleSyntax: false`) on top of bundler-style `moduleResolution`, with explicit `.js` import suffixes for ESM correctness.
- `scripts/postbuild-shebang.cjs` re-prepends the shebang and `chmod +x` after tsc compilation.
- `prepublishOnly` runs `clean` + `build`. `publishConfig.registry` is locked to `https://registry.npmjs.org/` with `access: public`.

[Unreleased]: https://github.com/lisiyuan0828/S-AIProviders/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/lisiyuan0828/S-AIProviders/releases/tag/v0.1.1
[0.1.0]: https://github.com/lisiyuan0828/S-AIProviders/releases/tag/v0.1.0
