/**
 * Config resolver.
 *
 * Resolves apiKey + baseURL + protocol + model with this priority:
 *   1. CLI args (--apikey / --baseurl / --protocol / --model)
 *   2. Per-project EXTEND.md  ($CWD/.s-aiproviders/EXTEND.md)
 *   3. Per-user EXTEND.md     ($HOME/.s-aiproviders/EXTEND.md)
 *   4. Environment variables  (SAIP_API_KEY / SAIP_BASE_URL / SAIP_PROTOCOL / SAIP_MODEL,
 *      plus per-preset *_API_KEY when --provider is given)
 *   5. Preset defaults        (resolved from --provider / default_provider)
 *
 * EXTEND.md is YAML-ish frontmatter. We accept either:
 *   ---
 *   default_provider: tokenplan
 *   default_model:
 *     tokenplan: tc-code-latest
 *     openai: gpt-4o-mini
 *   providers:
 *     tokenplan:
 *       api_key: sk-xxx
 *       base_url: https://api.lkeap.cloud.tencent.com/plan/v3
 *   ---
 *
 * Or a top-level YAML document (no fences). Both forms are parsed with the
 * same minimal parser. No external dep.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BUILTIN_PRESETS,
  findPreset,
  type ProviderPreset,
  type ProviderProtocol,
} from '../index.js';

import type { ParsedArgs } from './args.js';
import { getStr } from './args.js';

export interface ResolvedConfig {
  /** preset id, e.g. "tokenplan" */
  providerId: string;
  preset: ProviderPreset;
  protocol: ProviderProtocol;
  apiKey: string;
  baseURL: string;
  model: string;
}

export interface RawExtend {
  default_provider?: string;
  default_model?: Record<string, string>;
  providers?: Record<string, { api_key?: string; base_url?: string; model?: string }>;
}

const EXTEND_FILENAME = path.join('.s-aiproviders', 'EXTEND.md');

/* ========== EXTEND.md loader ========== */

export function loadExtendChain(): RawExtend {
  const candidates = [
    path.join(process.cwd(), EXTEND_FILENAME),
    path.join(os.homedir(), EXTEND_FILENAME),
  ];
  const merged: RawExtend = {};
  // user-level loaded first, project-level overrides
  for (const p of [...candidates].reverse()) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const yaml = stripFrontmatter(raw);
      const parsed = parseTinyYaml(yaml);
      mergeExtend(merged, parsed);
    } catch (err) {
      console.error(`[s-aiproviders] failed to parse ${p}: ${(err as Error).message}`);
    }
  }
  return merged;
}

function stripFrontmatter(raw: string): string {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (end > 0) return lines.slice(1, end).join('\n');
  }
  return raw;
}

/**
 * Minimal YAML subset parser tailored to RawExtend shape.
 * Supports:
 *   key: value
 *   key:
 *     subkey: value
 *     subkey:
 *       leaf: value
 *
 * Strings are taken as-is (after trim + optional quote stripping).
 * Comments start with #.
 */
function parseTinyYaml(src: string): RawExtend {
  const out: RawExtend = {};
  type Frame = { obj: Record<string, unknown>; indent: number };
  const root: Record<string, unknown> = out as unknown as Record<string, unknown>;
  const stack: Frame[] = [{ obj: root, indent: -1 }];

  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const content = line.trim();
    const m = content.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }
    const top = stack[stack.length - 1]!;

    if (rawVal === '' || rawVal === undefined) {
      const child: Record<string, unknown> = {};
      top.obj[key!] = child;
      stack.push({ obj: child, indent });
    } else {
      top.obj[key!] = stripQuotes(rawVal);
    }
  }
  return out;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function mergeExtend(into: RawExtend, from: RawExtend): void {
  if (from.default_provider) into.default_provider = from.default_provider;
  if (from.default_model) {
    into.default_model = { ...(into.default_model ?? {}), ...from.default_model };
  }
  if (from.providers) {
    into.providers = into.providers ?? {};
    for (const [k, v] of Object.entries(from.providers)) {
      into.providers[k] = { ...(into.providers[k] ?? {}), ...v };
    }
  }
}

/* ========== Resolver ========== */

export interface ResolveOpts {
  args: ParsedArgs;
  /** When true, model is required (chat/image); when false, only check provider. */
  requireModel?: boolean;
}

export function resolveConfig(opts: ResolveOpts): ResolvedConfig {
  const { args } = opts;
  const requireModel = opts.requireModel !== false;
  const ext = loadExtendChain();

  // 1. provider id
  const providerId =
    getStr(args, ['provider', 'p']) ??
    ext.default_provider ??
    process.env.SAIP_PROVIDER ??
    inferProviderFromEnv() ??
    'tokenplan';

  const preset = findPreset(providerId);
  if (!preset) {
    const ids = BUILTIN_PRESETS.map((p) => p.id).join(', ');
    throw new Error(
      `Unknown provider "${providerId}". Built-in providers: ${ids}. ` +
        `Pass --provider <id> or set default_provider in EXTEND.md.`,
    );
  }

  // 2. apiKey
  const apiKey =
    getStr(args, ['apikey', 'api-key', 'apiKey', 'k']) ??
    ext.providers?.[providerId]?.api_key ??
    readEnvApiKey(providerId) ??
    process.env.SAIP_API_KEY;
  if (!apiKey) {
    throw new Error(
      `Missing apiKey for provider "${providerId}". Provide it via:\n` +
        `  --apikey <key>\n` +
        `  EXTEND.md > providers.${providerId}.api_key\n` +
        `  env SAIP_API_KEY (or provider-specific env, see SKILL.md)\n`,
    );
  }

  // 3. baseURL
  const baseURL =
    getStr(args, ['baseurl', 'base-url', 'baseURL', 'b']) ??
    ext.providers?.[providerId]?.base_url ??
    process.env.SAIP_BASE_URL ??
    preset.defaultBaseURL;

  // 4. protocol — caller can force, otherwise use preset
  const protocolStr = getStr(args, ['protocol']) ?? preset.protocol;
  const protocol = assertProtocol(protocolStr);

  // 5. model
  let model = getStr(args, ['model', 'm']);
  if (!model) {
    model =
      ext.providers?.[providerId]?.model ??
      ext.default_model?.[providerId] ??
      process.env.SAIP_MODEL ??
      preset.builtinModels[0]?.id;
  }
  if (requireModel && !model) {
    throw new Error(
      `No model resolved for provider "${providerId}". Provide --model <id> or set EXTEND.md.`,
    );
  }

  return {
    providerId,
    preset,
    protocol,
    apiKey,
    baseURL,
    model: model ?? '',
  };
}

function assertProtocol(s: string): ProviderProtocol {
  if (s === 'openai-compatible' || s === 'anthropic' || s === 'gemini') return s;
  throw new Error(
    `Invalid protocol "${s}". Must be one of: openai-compatible, anthropic, gemini.`,
  );
}

/**
 * Best-effort: when caller hasn't picked a provider, sniff env vars to guess.
 */
function inferProviderFromEnv(): string | undefined {
  if (process.env.TOKENPLAN_API_KEY) return 'tokenplan';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY) return 'kimi';
  if (process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY) return 'qwen';
  if (process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY) return 'doubao';
  if (process.env.ZHIPU_API_KEY || process.env.BIGMODEL_API_KEY) return 'zhipu';
  return undefined;
}

function readEnvApiKey(providerId: string): string | undefined {
  switch (providerId) {
    case 'tokenplan':
      return process.env.TOKENPLAN_API_KEY;
    case 'openai':
    case 'openai-image':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY;
    case 'kimi':
      return process.env.MOONSHOT_API_KEY ?? process.env.KIMI_API_KEY;
    case 'qwen':
      return process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;
    case 'doubao':
      return process.env.ARK_API_KEY ?? process.env.DOUBAO_API_KEY;
    case 'zhipu':
    case 'zhipu-image':
      return process.env.ZHIPU_API_KEY ?? process.env.BIGMODEL_API_KEY;
    case 'hunyuan-image':
      return process.env.LKEAP_API_KEY ?? process.env.HUNYUAN_API_KEY;
    case 'hunyuan-image-tc3':
      // Tencent Cloud expects "SecretId:SecretKey"
      if (process.env.TENCENTCLOUD_SECRET_ID && process.env.TENCENTCLOUD_SECRET_KEY) {
        return `${process.env.TENCENTCLOUD_SECRET_ID}:${process.env.TENCENTCLOUD_SECRET_KEY}`;
      }
      return undefined;
    default:
      return undefined;
  }
}
