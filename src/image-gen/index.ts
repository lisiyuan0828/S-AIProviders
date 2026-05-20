/**
 * Node-only image-gen core. Decoupled from any host framework.
 *
 * Two protocol families:
 *  1. OpenAI-compatible /v1/images/generations (DALL·E / CogView / Hunyuan@lkeap)
 *  2. Tencent Cloud TC3-signed async API (aiart.tencentcloudapi.com)
 *
 * Imports node:crypto / node:fs — DO NOT import this module from a browser
 * bundle. The package's main entry intentionally does not re-export it; reach
 * for it via `s-aiproviders/image-gen`.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageGenInput {
  /** Optional protocol override; otherwise auto-detected from baseURL. */
  protocol?: 'openai-compatible' | 'tencent-cloud';
  /** Base URL (must include /v1 prefix where applicable). For TC3 path: https://aiart.tencentcloudapi.com */
  baseURL: string;
  /** OpenAI-compat → API key. Tencent Cloud → "SecretId:SecretKey". */
  apiKey: string;
  model: string;
  prompt: string;
  /** e.g. 1024x1024 / 1080x1920 */
  size: string;
  /** Output directory (absolute). Defaults to process.cwd(). */
  outputDir?: string;
  /** File base name without extension (.png is appended). */
  fileBaseName?: string;
}

export interface ImageGenResult {
  filePath: string;
  size: string;
  model: string;
  latencyMs: number;
  revisedPrompt?: string;
}

export async function generateImage(input: ImageGenInput): Promise<ImageGenResult> {
  const useTencent =
    input.protocol === 'tencent-cloud' || input.baseURL.includes('tencentcloudapi.com');
  if (useTencent) return generateViaTencentCloud(input);
  return generateViaOpenAI(input);
}

/** Backward-compat alias matching the old S-Content function name. */
export const generateImageStandalone = generateImage;

/* ========== OpenAI-compatible ========== */

async function generateViaOpenAI(input: ImageGenInput): Promise<ImageGenResult> {
  const url = `${input.baseURL.replace(/\/+$/, '')}/images/generations`;
  const body = {
    model: input.model,
    prompt: input.prompt,
    n: 1,
    size: input.size,
    response_format: 'b64_json' as const,
  };
  const start = Date.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(
      `Image API ${resp.status}: ${tryExtractErrorMsg(text) || text.slice(0, 200)}`,
    );
  }
  const json = (await resp.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  } | null;
  const item = json?.data?.[0];
  if (!item || (!item.b64_json && !item.url)) {
    throw new Error('Image API returned empty data');
  }
  const filePath = await saveImage(input, item.b64_json, item.url);
  return {
    filePath,
    size: input.size,
    model: input.model,
    latencyMs: Date.now() - start,
    revisedPrompt: item.revised_prompt,
  };
}

/* ========== Tencent Cloud API 3.0 ========== */

const TC_HOST = 'aiart.tencentcloudapi.com';
const TC_SERVICE = 'aiart';
const TC_VERSION = '2022-12-29';
const TC_REGION = 'ap-guangzhou';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;

async function generateViaTencentCloud(input: ImageGenInput): Promise<ImageGenResult> {
  const { secretId, secretKey } = parseTencentKey(input.apiKey);
  const resolution = input.size.replace('x', ':');
  const start = Date.now();

  const submit = await tc3Request(
    secretId,
    secretKey,
    'SubmitTextToImageJob',
    JSON.stringify({
      Prompt: input.prompt,
      Resolution: resolution,
      LogoAdd: 0,
      Revise: 1,
    }),
  );
  if (submit.Error) {
    const e = submit.Error as { Code: string; Message: string };
    throw new Error(`Tencent submit failed: [${e.Code}] ${e.Message}`);
  }
  const jobId = submit.JobId as string;
  if (!jobId) throw new Error('Tencent submit returned no JobId');

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let resultImages: string[] = [];
  let revisedPrompt: string | undefined;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const q = await tc3Request(
      secretId,
      secretKey,
      'QueryTextToImageJob',
      JSON.stringify({ JobId: jobId }),
    );
    if (q.Error) {
      const e = q.Error as { Code: string; Message: string };
      throw new Error(`Tencent query failed: [${e.Code}] ${e.Message}`);
    }
    const statusCode = q.JobStatusCode as string;
    if (statusCode === '4') {
      throw new Error(
        `Tencent job failed: [${(q.JobErrorCode as string) ?? 'UNKNOWN'}] ${
          (q.JobErrorMsg as string) ?? 'processing failed'
        }`,
      );
    }
    if (statusCode === '5') {
      resultImages = (q.ResultImage as string[]) ?? [];
      const prompts = (q.RevisedPrompt as string[]) ?? [];
      revisedPrompt = prompts[0];
      break;
    }
  }

  if (resultImages.length === 0) {
    throw new Error('Tencent image-gen timed out');
  }

  const filePath = await saveImage(input, undefined, resultImages[0]);
  return {
    filePath,
    size: input.size,
    model: input.model,
    latencyMs: Date.now() - start,
    revisedPrompt,
  };
}

function parseTencentKey(apiKey: string): { secretId: string; secretKey: string } {
  const i = apiKey.indexOf(':');
  if (i < 1) {
    throw new Error('Tencent apiKey must be "SecretId:SecretKey" (colon-separated)');
  }
  return { secretId: apiKey.slice(0, i), secretKey: apiKey.slice(i + 1) };
}

async function tc3Request(
  secretId: string,
  secretKey: string,
  action: string,
  payload: string,
): Promise<Record<string, unknown>> {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const canonicalRequest = [
    'POST',
    '/',
    '',
    `content-type:application/json\nhost:${TC_HOST}\nx-tc-action:${action.toLowerCase()}\n`,
    'content-type;host;x-tc-action',
    sha256(payload),
  ].join('\n');

  const credentialScope = `${date}/${TC_SERVICE}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(timestamp),
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const secretDate = hmac256(`TC3${secretKey}`, date);
  const secretService = hmac256(secretDate, TC_SERVICE);
  const secretSigning = hmac256(secretService, 'tc3_request');
  const signature = hmac256(secretSigning, stringToSign).toString('hex');

  const authorization = [
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}`,
    `SignedHeaders=content-type;host;x-tc-action`,
    `Signature=${signature}`,
  ].join(', ');

  const resp = await fetch(`https://${TC_HOST}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: TC_HOST,
      'X-TC-Action': action,
      'X-TC-Version': TC_VERSION,
      'X-TC-Region': TC_REGION,
      'X-TC-Timestamp': String(timestamp),
      Authorization: authorization,
    },
    body: payload,
  });

  const raw = await resp.text();
  let json: { Response?: Record<string, unknown> };
  try {
    json = JSON.parse(raw) as { Response?: Record<string, unknown> };
  } catch {
    throw new Error(`Tencent API non-JSON response: ${raw.slice(0, 300)}`);
  }
  if (!json.Response) {
    throw new Error(`Tencent API abnormal response: ${raw.slice(0, 300)}`);
  }
  return json.Response;
}

/* ========== Common ========== */

async function saveImage(input: ImageGenInput, b64?: string, imageUrl?: string): Promise<string> {
  const dir = input.outputDir ?? process.cwd();
  await fs.mkdir(dir, { recursive: true });
  const fileBase = input.fileBaseName ?? `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const absPath = path.join(dir, `${fileBase}.png`);
  if (b64) {
    await fs.writeFile(absPath, Buffer.from(b64, 'base64'));
  } else if (imageUrl) {
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`Image download failed: HTTP ${r.status}`);
    const ab = await r.arrayBuffer();
    await fs.writeFile(absPath, Buffer.from(ab));
  } else {
    throw new Error('No image data available');
  }
  return absPath;
}

function tryExtractErrorMsg(raw: string): string | null {
  try {
    const o = JSON.parse(raw) as { error?: { message?: string } };
    return o.error?.message ?? null;
  } catch {
    return null;
  }
}

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

function hmac256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf-8').digest();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
