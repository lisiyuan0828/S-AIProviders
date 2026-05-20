# 1. 改完代码并提交
git commit -am "feat: ..."

# 2. 升版本号（自动改 3 个文件）
pnpm version:bump patch

# 3. 在 CHANGELOG.md / CHANGELOG.zh.md 顶部加一段
#    描述 0.1.x → 0.1.y 的变更（这一步暂时人工写）

# 4. 提交 + 打 tag
git commit -am "chore: release 0.1.2"
git tag v0.1.2

# 5. 发布（prepublishOnly 自动跑 clean + build + version:check）
npm publish

# 6. 推到远程
git push && git push --tags
