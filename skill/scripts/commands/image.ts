/**
 * `image` subcommand — text-to-image, saves PNG to disk.
 *
 * Usage:
 *   tsx main.ts image --prompt "a cat" --output ./out
 *   tsx main.ts image --provider openai-image --model dall-e-3 --size 1024x1024 --prompt "..."
 *   tsx main.ts image --provider hunyuan-image-tc3 --apikey "SecretId:SecretKey" --prompt "..."
 */

import path from 'node:path';
import { generateImage } from '@s-aiproviders/core/image-gen';

import { type ParsedArgs, getBool, getStr } from '../args';
import { resolveConfig } from '../config';

export async function runImage(args: ParsedArgs): Promise<number> {
  const cfg = resolveConfig({ args });
  const prompt = getStr(args, ['prompt']);
  if (!prompt) {
    console.error('Error: --prompt <text> is required for `image`.');
    return 2;
  }
  const size = getStr(args, ['size']) ?? '1024x1024';
  const outputDir = getStr(args, ['output', 'outdir', 'o']) ?? path.join(process.cwd(), 'output');
  const fileBaseName = getStr(args, ['name', 'filename']);
  const asJson = getBool(args, ['json']);
  const verbose = getBool(args, ['verbose', 'v']);

  if (verbose) {
    console.error(
      `[s-aiproviders] image provider=${cfg.providerId} model=${cfg.model} size=${size} baseURL=${cfg.baseURL}`,
    );
  }

  // baseURL drives the protocol fork inside generateImage:
  //   *.tencentcloudapi.com → TC3 async path
  //   anything else         → OpenAI-compatible /images/generations
  const useTencent = cfg.baseURL.includes('tencentcloudapi.com');

  try {
    const result = await generateImage({
      protocol: useTencent ? 'tencent-cloud' : 'openai-compatible',
      baseURL: cfg.baseURL,
      apiKey: cfg.apiKey,
      model: cfg.model,
      prompt,
      size,
      outputDir,
      ...(fileBaseName ? { fileBaseName } : {}),
    });

    if (asJson) {
      process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
    } else {
      console.log(`Saved: ${result.filePath}`);
      console.log(`Latency: ${result.latencyMs}ms  size=${result.size}  model=${result.model}`);
      if (result.revisedPrompt) console.log(`Revised prompt: ${result.revisedPrompt}`);
    }
    return 0;
  } catch (err) {
    const msg = (err as Error).message;
    if (asJson) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: msg })}\n`);
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}
