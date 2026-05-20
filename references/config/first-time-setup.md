# First-time setup flow

When `EXTEND.md` is not found, the Skill should drive an interactive setup:

## Step 1 — pick a provider

Prefer the host runtime's structured-question tool (`AskUserQuestion` /
`request_user_input` / `clarify` / equivalent). Fallback: numbered prompt.

> Which AI provider would you like as the default?
>
> 1. 腾讯云 Token Plan ★ (recommended — covers MiniMax / GLM / Kimi)
> 2. OpenAI (GPT-4o family)
> 3. Anthropic (Claude)
> 4. Google Gemini
> 5. DeepSeek
> 6. Kimi (Moonshot)
> 7. 通义千问 (Qwen)
> 8. 字节豆包 / 火山方舟
> 9. 智谱 GLM
> 10. (Image-only) OpenAI DALL·E
> 11. (Image-only) 腾讯混元生图 3.0

Map the answer to the preset id (`tokenplan` / `openai` / `anthropic` / …).

## Step 2 — collect the API key

> Paste your `<displayName>` API key.
> (For 腾讯混元生图 3.0, the format is `SecretId:SecretKey`.)

## Step 3 — pick the default model

Show `preset.builtinModels` for the chosen provider. Default to the first one.

## Step 4 — write EXTEND.md

Write to `~/.s-aiproviders/EXTEND.md` (user-level) unless the user
explicitly says "for this project only" — then write
`./.s-aiproviders/EXTEND.md` and append `.s-aiproviders/` to the
project's `.gitignore`.

Template:

```markdown
---
default_provider: <preset_id>
default_model:
  <preset_id>: <model_id>
providers:
  <preset_id>:
    api_key: <user_input>
---
```

## Step 5 — confirm

Run a smoke test:

```bash
tsx scripts/main.ts chat --prompt "say hi in one word"
```

If the response prints, setup is complete.
