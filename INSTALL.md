# 安装与使用 s-aiproviders

`s-aiproviders` 是**单一 npm 包**，同时包含库 API 与 CLI。按场景挑一种使用方式即可。

---

## 方式 1：`npx` 一行用（最快，零安装）

适合：临时跑一次、写脚本、CI/CD、Cron。

```bash
# 列出所有内置 provider
npx s-aiproviders list-presets

# 一次对话
npx s-aiproviders chat \
  --provider tokenplan \
  --apikey "$TOKENPLAN_API_KEY" \
  --prompt "用一句话解释 SSE"

# 生成图片
npx s-aiproviders image \
  --provider openai-image \
  --apikey "$OPENAI_API_KEY" \
  --prompt "a minimalist cat icon" \
  --size 1024x1024 \
  --output ./out
```

> 第一次跑会把 `s-aiproviders` 拉到 npm 缓存（约 60 KB tarball），后续直接命中缓存。

---

## 方式 2：全局安装（最方便，长期使用）

```bash
npm install -g s-aiproviders
# 或 pnpm add -g s-aiproviders

# 之后随时用：
s-aiproviders list-presets
s-aiproviders chat --provider openai --prompt "hello"
```

配合 `EXTEND.md` 配置文件存默认 apiKey，每次调用就不用再传 `--apikey`：

```bash
mkdir -p ~/.s-aiproviders
cat > ~/.s-aiproviders/EXTEND.md <<EOF
default_provider: tokenplan
default_model:
  tokenplan: tc-code-latest
providers:
  tokenplan:
    api_key: sk-tplan-xxxxx
EOF

# 之后只需：
s-aiproviders chat --prompt "hello"
```

完整 schema 见 `node_modules/s-aiproviders/references/config/extend-md-schema.md`。

---

## 方式 3：作为项目依赖集成（推荐用于自己的产品）

适合：你在做一个 Node 服务 / Electron 应用 / Vite 项目，想把 AI 能力嵌进去。

```bash
pnpm add s-aiproviders
# 或 npm install s-aiproviders
```

```ts
import { createProvider } from 's-aiproviders';

const provider = createProvider('openai-compatible', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
});

const ac = new AbortController();
for await (const ev of provider.chat(
  { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
  ac.signal,
)) {
  if (ev.type === 'delta') process.stdout.write(ev.text);
  if (ev.type === 'error') console.error(ev.code, ev.message);
}
```

生图（Node only）：

```ts
import { generateImage } from 's-aiproviders/image-gen';

const { filePath } = await generateImage({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-image-1',
  prompt: 'a minimalist cat icon',
  size: '1024x1024',
  outputDir: './out',
});
```

完整集成示例（多 provider 降级、Electron 主进程模式、生图）见
`node_modules/s-aiproviders/references/integration-as-library.md` 或本仓库 `references/integration-as-library.md`。

> **浏览器打包提示**：主入口 `s-aiproviders` 是浏览器安全的；`s-aiproviders/image-gen` 因为依赖 `node:crypto`、`node:fs`，**不要**在渲染端 import，或在 Vite/Webpack 中 externalise。

---

## 方式 4：作为 AI Agent Skill（让 AI 自动调用）

`s-aiproviders` 同时是一份 [Anthropic Skill](https://docs.claude.com/en/docs/claude-code/skills) 兼容的能力包。装包后，`SKILL.md` 就在 `node_modules/s-aiproviders/SKILL.md`，AI agent 读到 frontmatter 里的 `description` 就会在适当时候自动调用 CLI。

### 4-A：Claude Code / Cursor / 类 Agent 自动加载

```bash
# 全局安装一份 + 把 skill 文件链到 ~/.claude/skills/
npm install -g s-aiproviders

# Linux/macOS
mkdir -p ~/.claude/skills/s-aiproviders
ln -sfn "$(npm root -g)/s-aiproviders/SKILL.md" ~/.claude/skills/s-aiproviders/SKILL.md
ln -sfn "$(npm root -g)/s-aiproviders/references" ~/.claude/skills/s-aiproviders/references
```

之后在 Claude Code 里说"帮我调用 deepseek 总结一下 README"，它会自动：

1. 读 `~/.claude/skills/s-aiproviders/SKILL.md`
2. 找到 `npx s-aiproviders chat ...` 的用法
3. 自己拼参数执行命令

### 4-B：在 Codebuddy / 其它 IDE Agent 内手动告诉它

让 AI 助手读一下：

```
请阅读 https://unpkg.com/s-aiproviders/SKILL.md，
之后我让你"调用大模型"或"生图"，按这份 SKILL 走。
```

之后 agent 就会按 SKILL.md 的契约去调 `npx s-aiproviders ...`。

---

## 配置加载优先级

无论哪种方式，CLI 都按这个顺序解析 apiKey / baseURL / model：

1. **CLI flags** — `--provider` / `--apikey` / `--baseurl` / `--model`
2. **项目级** `./.s-aiproviders/EXTEND.md`
3. **用户级** `~/.s-aiproviders/EXTEND.md`
4. **环境变量**：
   - 通用：`SAIP_PROVIDER` / `SAIP_API_KEY` / `SAIP_BASE_URL` / `SAIP_MODEL`
   - 各 provider：`TOKENPLAN_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `MOONSHOT_API_KEY` / `DASHSCOPE_API_KEY` / `ARK_API_KEY` / `ZHIPU_API_KEY` / `LKEAP_API_KEY` / `TENCENTCLOUD_SECRET_ID` + `TENCENTCLOUD_SECRET_KEY`
5. **Preset 内置默认** — base URL 与首个 builtin model

---

## 你当前怎么用？（场景对照）

| 你的场景 | 选哪种方式 |
|---|---|
| 我只是临时想用 AI 跑个脚本 | 方式 1（npx） |
| 我经常用，想短命令 | 方式 2（全局安装） |
| 我在做自己的产品，要把 AI 能力做进 UI | 方式 3（库依赖） |
| 我想让 Claude / Cursor 自动调用 AI 能力 | 方式 4（Skill 装入 ~/.claude/skills） |
| 我想从 S-Content 复用一份代码 | 方式 3 + 看 [`MIGRATION-FROM-S-CONTENT.md`](./MIGRATION-FROM-S-CONTENT.md) |

---

## 发布到 npm（仓库维护者）

```bash
pnpm build
npm publish        # 走 package.json 里的 publishConfig（registry.npmjs.org / public）
```

`prepublishOnly` 钩子已配置，会在 publish 前自动 `clean` + `build`，并通过 `scripts/postbuild-shebang.cjs` 给 `dist/cli/main.js` 回填 `#!/usr/bin/env node` 与可执行权限。
