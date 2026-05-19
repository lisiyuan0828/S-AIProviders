/**
 * `chat` subcommand — streams a single-turn (or multi-turn) chat to stdout.
 *
 * Usage:
 *   tsx main.ts chat --prompt "hello"
 *   tsx main.ts chat --provider openai --model gpt-4o-mini --prompt "hi" --system "be brief"
 *   tsx main.ts chat --promptfile prompt.md
 *   tsx main.ts chat --json   # final message printed as JSON instead of streaming
 */

import fs from 'node:fs';
import { createProvider, type ChatMessageInput } from 's-aiproviders-core';

import { type ParsedArgs, getBool, getNum, getStr } from '../args.js';
import { resolveConfig } from '../config.js';

export async function runChat(args: ParsedArgs): Promise<number> {
  const cfg = resolveConfig({ args });

  // Build messages
  const system = getStr(args, ['system', 's']);
  const promptFile = getStr(args, ['promptfile', 'prompt-file']);
  const prompt =
    getStr(args, ['prompt']) ??
    (promptFile ? fs.readFileSync(promptFile, 'utf-8') : undefined) ??
    (await readStdinIfPiped());

  if (!prompt) {
    console.error('Error: provide --prompt <text> or --promptfile <path> or pipe stdin.');
    return 2;
  }

  const messages: ChatMessageInput[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const temperature = getNum(args, ['temperature', 't']);
  const maxTokens = getNum(args, ['maxtokens', 'max-tokens', 'maxTokens']);
  const asJson = getBool(args, ['json']);
  const verbose = getBool(args, ['verbose', 'v']);

  if (verbose) {
    console.error(
      `[s-aiproviders] provider=${cfg.providerId} protocol=${cfg.protocol} model=${cfg.model} baseURL=${cfg.baseURL}`,
    );
  }

  const provider = createProvider(cfg.protocol, {
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });

  const ac = new AbortController();
  process.on('SIGINT', () => ac.abort());

  let full = '';
  let usage: { promptTokens: number; completionTokens: number; totalTokens?: number } | null =
    null;
  let errorChunk: { code: string; message: string } | null = null;

  for await (const ev of provider.chat(
    {
      model: cfg.model,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    },
    ac.signal,
  )) {
    switch (ev.type) {
      case 'delta':
        full += ev.text;
        if (!asJson) process.stdout.write(ev.text);
        break;
      case 'usage':
        usage = ev.usage;
        break;
      case 'error':
        errorChunk = { code: ev.code, message: ev.message };
        break;
      case 'done':
        break;
    }
  }

  if (errorChunk) {
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, error: errorChunk, partial: full })}\n`,
      );
    } else {
      process.stderr.write(`\n[error] ${errorChunk.code}: ${errorChunk.message}\n`);
    }
    return 1;
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ok: true, content: full, usage })}\n`);
  } else {
    process.stdout.write('\n');
    if (verbose && usage) {
      console.error(
        `[s-aiproviders] usage prompt=${usage.promptTokens} completion=${usage.completionTokens} total=${usage.totalTokens ?? '-'}`,
      );
    }
  }
  return 0;
}

async function readStdinIfPiped(): Promise<string | undefined> {
  if (process.stdin.isTTY) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const txt = Buffer.concat(chunks).toString('utf-8').trim();
  return txt.length > 0 ? txt : undefined;
}
