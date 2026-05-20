#!/usr/bin/env node
/**
 * Bump the package version across all source-of-truth locations in one go.
 *
 * Usage:
 *   node scripts/bump-version.cjs <newVersion>     e.g. 0.1.2
 *   node scripts/bump-version.cjs patch            shorthand: 0.1.1 -> 0.1.2
 *   node scripts/bump-version.cjs minor            shorthand: 0.1.1 -> 0.2.0
 *   node scripts/bump-version.cjs major            shorthand: 0.1.1 -> 1.0.0
 *   node scripts/bump-version.cjs --check          verify all 3 files agree (no write)
 *
 * Files updated:
 *   1. package.json                        ("version" field)
 *   2. src/index.ts                        (export const KIT_VERSION = '...' as const;)
 *   3. SKILL.md                            (frontmatter `version: ...`)
 *
 * Why a script: keeping these three in sync by hand is error-prone, and
 * `npm version` only touches package.json. This is single-package-friendly.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const INDEX_TS_PATH = path.join(REPO_ROOT, 'src', 'index.ts');
const SKILL_MD_PATH = path.join(REPO_ROOT, 'SKILL.md');

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function die(msg) {
  console.error(`\u274C  ${msg}`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJsonPreserveStyle(p, obj) {
  // package.json convention: 2-space indent + trailing newline.
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeText(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function bumpKind(currentVersion, kind) {
  const m = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) die(`current version "${currentVersion}" is not semver`);
  let [_, major, minor, patch] = m;
  major = +major;
  minor = +minor;
  patch = +patch;
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  die(`unknown bump kind "${kind}"`);
}

function getCurrentVersions() {
  const pkg = readJson(PKG_JSON_PATH);
  const indexTs = readText(INDEX_TS_PATH);
  const skillMd = readText(SKILL_MD_PATH);

  const indexMatch = indexTs.match(/export\s+const\s+KIT_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!indexMatch) die(`cannot locate KIT_VERSION in ${INDEX_TS_PATH}`);

  const skillMatch = skillMd.match(/^version:\s*([^\s\r\n]+)/m);
  if (!skillMatch) die(`cannot locate frontmatter "version:" in ${SKILL_MD_PATH}`);

  return {
    pkg: pkg.version,
    indexTs: indexMatch[1],
    skillMd: skillMatch[1],
  };
}

function commandCheck() {
  const v = getCurrentVersions();
  console.log(`package.json   : ${v.pkg}`);
  console.log(`src/index.ts   : ${v.indexTs}`);
  console.log(`SKILL.md       : ${v.skillMd}`);
  const allEqual = v.pkg === v.indexTs && v.indexTs === v.skillMd;
  if (!allEqual) {
    console.error('\u274C  versions are NOT in sync');
    process.exit(1);
  }
  console.log(`\u2705  all in sync at ${v.pkg}`);
}

function commandBump(arg) {
  const current = getCurrentVersions();

  let next;
  if (arg === 'patch' || arg === 'minor' || arg === 'major') {
    if (current.pkg !== current.indexTs || current.indexTs !== current.skillMd) {
      die(
        `versions are out of sync; refuse to auto-bump.\n` +
          `  package.json: ${current.pkg}\n` +
          `  src/index.ts: ${current.indexTs}\n` +
          `  SKILL.md    : ${current.skillMd}\n` +
          `Run with an explicit version (e.g. ${arg === 'patch' ? '0.1.2' : '0.2.0'}) to override.`,
      );
    }
    next = bumpKind(current.pkg, arg);
  } else {
    if (!SEMVER_RE.test(arg)) die(`"${arg}" is not a semver string and not patch|minor|major`);
    next = arg;
  }

  // 1. package.json
  const pkg = readJson(PKG_JSON_PATH);
  pkg.version = next;
  writeJsonPreserveStyle(PKG_JSON_PATH, pkg);

  // 2. src/index.ts
  const indexTs = readText(INDEX_TS_PATH);
  const indexTsNext = indexTs.replace(
    /(export\s+const\s+KIT_VERSION\s*=\s*['"])([^'"]+)(['"])/,
    `$1${next}$3`,
  );
  if (indexTsNext === indexTs) die('failed to rewrite KIT_VERSION in src/index.ts');
  writeText(INDEX_TS_PATH, indexTsNext);

  // 3. SKILL.md
  const skillMd = readText(SKILL_MD_PATH);
  const skillMdNext = skillMd.replace(/^(version:\s*)([^\s\r\n]+)/m, `$1${next}`);
  if (skillMdNext === skillMd) die('failed to rewrite version in SKILL.md frontmatter');
  writeText(SKILL_MD_PATH, skillMdNext);

  console.log(`\u2705  bumped to ${next}`);
  console.log(`     package.json   : ${current.pkg}  ->  ${next}`);
  console.log(`     src/index.ts   : ${current.indexTs}  ->  ${next}`);
  console.log(`     SKILL.md       : ${current.skillMd}  ->  ${next}`);
  console.log(``);
  console.log(`Next steps:`);
  console.log(`  1. update CHANGELOG.md / CHANGELOG.zh.md`);
  console.log(`  2. pnpm build && npm publish`);
}

function main() {
  const arg = process.argv[2];
  if (!arg || arg === '-h' || arg === '--help') {
    console.log(
      [
        'Usage:',
        '  node scripts/bump-version.cjs <newVersion>     e.g. 0.1.2',
        '  node scripts/bump-version.cjs patch|minor|major',
        '  node scripts/bump-version.cjs --check',
      ].join('\n'),
    );
    process.exit(arg ? 0 : 1);
  }
  if (arg === '--check') return commandCheck();
  return commandBump(arg);
}

main();
