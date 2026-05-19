# Changelog — `@s-aiproviders/cli`

All notable changes to the `@s-aiproviders/cli` package are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and the package adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

> The CLI is a thin wrapper over [`@s-aiproviders/core`](../packages/core). Provider catalogue changes are tracked in the core package's CHANGELOG.

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

- `s-aiproviders` bin (also runnable via `npx @s-aiproviders/cli`).
- Subcommand `chat`:
  - Streams a chat completion to stdout in real time.
  - Inputs: `--prompt <text>`, `--promptfile <path>`, or piped stdin.
  - `--system <text>` for a system instruction.
  - `--temperature <n>`, `--maxtokens <n>`.
  - `--json` for machine-readable output (`{ ok, content, usage }` or `{ ok:false, error, partial }`).
  - `SIGINT` (Ctrl-C) aborts the upstream request via `AbortSignal`.
- Subcommand `image`:
  - Generates a PNG to disk.
  - `--prompt` (required), `--size <WxH>` (default `1024x1024`), `--output <dir>` (default `./output`), `--name <base>` for custom file base name.
  - Tencent Cloud TC3 path is selected automatically when `baseURL` contains `tencentcloudapi.com`.
- Subcommand `list-presets` (alias `list`): dumps the built-in catalogue. `--kind chat|image` filter, `--json` for raw JSON.
- Help: `s-aiproviders help` (or `-h` / `--help`).
- Five-level configuration resolver (`config.ts`):
  1. CLI flags.
  2. Project-level `./.s-aiproviders/EXTEND.md`.
  3. User-level `~/.s-aiproviders/EXTEND.md`.
  4. Environment variables — generic `SAIP_PROVIDER` / `SAIP_API_KEY` / `SAIP_BASE_URL` / `SAIP_MODEL` / `SAIP_PROTOCOL`, plus per-provider keys: `TOKENPLAN_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY` / `KIMI_API_KEY`, `DASHSCOPE_API_KEY` / `QWEN_API_KEY`, `ARK_API_KEY` / `DOUBAO_API_KEY`, `ZHIPU_API_KEY` / `BIGMODEL_API_KEY`, `LKEAP_API_KEY` / `HUNYUAN_API_KEY`, `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`.
  5. Preset defaults (`defaultBaseURL`, `builtinModels[0].id`).
- Provider auto-inference from environment when `--provider` is omitted (`OPENAI_API_KEY` → `openai`, etc.).
- Tiny dependency-free YAML subset parser for `EXTEND.md` (frontmatter or top-level body).
- Zero-dep argv parser supporting `--key value`, `--key=value`, and short-flag aliases.
- Bundled artefacts in npm tarball: `dist/`, `SKILL.md`, `references/`, `README.md`, `README.zh.md`.
- `SKILL.md` consumable by AI agents (Claude Code / Cursor / Codebuddy):
  - Frontmatter with `name` / `description` / `version` / `metadata.requires`.
  - Step-0 blocking check for `EXTEND.md` with first-time-setup flow.
  - Per-provider quirks documented in `references/providers.md`.
- Reference documents under `references/`:
  - `config/extend-md-schema.md` — full EXTEND.md schema and example.
  - `config/first-time-setup.md` — interactive setup flow.
  - `integration-as-library.md` — recipes for using `@s-aiproviders/core` directly.
  - `providers.md` — wire-format gotchas per provider.
- Compiled to plain ESM JS with `#!/usr/bin/env node` shebang; runs on any Node ≥ 18.17 without `tsx`. The shebang is restored by `scripts/postbuild-shebang.cjs` and the bin file is `chmod +x` automatically.
- `prepublishOnly` hook auto-`clean` + `build`; pnpm rewrites `workspace:*` to a concrete version at pack time.

### Exit codes

- `0` — success
- `1` — runtime error (network / HTTP / Tencent Cloud async timeout / image API empty data / missing prompt body)
- `2` — user error (unknown provider, missing apiKey, invalid flag value, unknown subcommand)

[Unreleased]: https://github.com/<your-org>/S-AIProviders/compare/cli-v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/S-AIProviders/releases/tag/cli-v0.1.0
