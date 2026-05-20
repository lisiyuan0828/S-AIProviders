# EXTEND.md schema

`EXTEND.md` is a per-project or per-user defaults file. It is loaded from:

1. `./.s-aiproviders/EXTEND.md`  (project-local; overrides user-level)
2. `~/.s-aiproviders/EXTEND.md`  (user-level fallback)

Either YAML frontmatter (`---` fenced) or a top-level YAML body works.

## Schema

```yaml
default_provider: tokenplan        # preset id used when --provider is absent
default_model:                      # per-provider default model id
  tokenplan: tc-code-latest
  openai: gpt-4o-mini
  anthropic: claude-sonnet-4
  gemini: gemini-2.5-flash
  openai-image: dall-e-3
providers:                          # per-provider credentials & overrides
  tokenplan:
    api_key: sk-tplan-xxxxx
    base_url: https://api.lkeap.cloud.tencent.com/plan/v3   # optional override
    model: tc-code-latest                                   # optional override
  openai:
    api_key: sk-xxxxx
  anthropic:
    api_key: sk-ant-xxxxx
  gemini:
    api_key: AIza-xxxxx
  hunyuan-image-tc3:
    api_key: "AKID...:secret-key..."   # SecretId:SecretKey
```

## Full example with frontmatter

```markdown
---
default_provider: tokenplan
default_model:
  tokenplan: tc-code-latest
  openai: gpt-4o-mini
providers:
  tokenplan:
    api_key: sk-tplan-AAAAA
  openai:
    api_key: sk-BBBBB
  anthropic:
    api_key: sk-ant-CCCCC
---

# Notes (free-form, ignored by the parser)

This is my personal default. Add per-project overrides under
`./.s-aiproviders/EXTEND.md`.
```

## Resolution order recap

For each field, the first source that supplies a value wins:

| Field | 1 (highest) | 2 | 3 | 4 | 5 (lowest) |
|---|---|---|---|---|---|
| provider id | `--provider` | project EXTEND.md `default_provider` | user EXTEND.md `default_provider` | env `SAIP_PROVIDER` | sniffed from per-provider env keys |
| apiKey | `--apikey` | project EXTEND.md `providers.<id>.api_key` | user EXTEND.md `providers.<id>.api_key` | provider-specific env (e.g. `OPENAI_API_KEY`) | env `SAIP_API_KEY` |
| baseURL | `--baseurl` | project `providers.<id>.base_url` | user `providers.<id>.base_url` | env `SAIP_BASE_URL` | preset `defaultBaseURL` |
| model | `--model` | project `providers.<id>.model` | project `default_model.<id>` | user equivalents | env `SAIP_MODEL`, then preset's first model |

## Security

Never commit a project-local EXTEND.md that contains real keys. Recommended `.gitignore`:

```
.s-aiproviders/
```

For shared repos, ship a `EXTEND.example.md` and let each developer copy it locally.
