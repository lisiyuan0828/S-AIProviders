/**
 * Built-in image-generation provider presets.
 *
 * Two underlying protocols:
 *  1. OpenAI-compatible /v1/images/generations (DALL·E, CogView, lkeap-hosted Hunyuan)
 *  2. Tencent Cloud TC3-signed async API (aiart.tencentcloudapi.com → SubmitTextToImageJob)
 *
 * The protocol field on these presets is set to 'openai-compatible' for type
 * uniformity — the actual image-gen path is selected by baseURL inside
 * `generateImage()` (see ../image-gen).
 */

import type { ProviderPreset } from '../types.js';

/** OpenAI DALL·E / gpt-image-1 (OpenAI Images API) */
export const OPENAI_IMAGE_PRESET: ProviderPreset = {
  id: 'openai-image',
  displayName: 'OpenAI 生图',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.openai.com/v1',
  description: 'OpenAI Images API（DALL·E 3 / gpt-image-1）',
  docsUrl: 'https://platform.openai.com/docs/api-reference/images',
  kind: 'image',
  builtinModels: [
    {
      id: 'dall-e-3',
      label: 'DALL·E 3',
      capabilities: ['image-gen'],
      description: '高质量文生图，支持 1024×1024 / 1792×1024 / 1024×1792',
    },
    {
      id: 'gpt-image-1',
      label: 'gpt-image-1',
      capabilities: ['image-gen'],
      description: 'OpenAI 最新通用图像模型',
    },
  ],
};

/** Tencent Hunyuan (via lkeap OpenAI-compatible gateway). apiKey = lkeap key. */
export const HUNYUAN_IMAGE_PRESET: ProviderPreset = {
  id: 'hunyuan-image',
  displayName: '腾讯混元生图（lkeap）',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.lkeap.cloud.tencent.com/v1',
  description: '腾讯混元 / 走 lkeap OpenAI 兼容网关，apiKey 填 lkeap 的 API Key',
  docsUrl: 'https://cloud.tencent.com/document/product/1729',
  kind: 'image',
  builtinModels: [
    {
      id: 'hunyuan-dit',
      label: 'Hunyuan-DiT',
      capabilities: ['image-gen'],
      description: '腾讯混元中文文生图旗舰模型',
    },
  ],
};

/**
 * Tencent Hunyuan 3.0 (native Tencent Cloud API, TC3 signature, async job).
 * apiKey format: "SecretId:SecretKey"
 */
export const HUNYUAN_IMAGE_TC3_PRESET: ProviderPreset = {
  id: 'hunyuan-image-tc3',
  displayName: '腾讯混元生图 3.0',
  protocol: 'openai-compatible', // protocol is for chat routing only; image path keys off baseURL
  defaultBaseURL: 'https://aiart.tencentcloudapi.com',
  description:
    '腾讯云原生 API（SubmitTextToImageJob 异步模式），apiKey 格式为 SecretId:SecretKey',
  docsUrl: 'https://cloud.tencent.com/document/product/1668/124632',
  kind: 'image',
  builtinModels: [
    {
      id: 'SubmitTextToImageJob',
      label: '混元生图 3.0',
      capabilities: ['image-gen'],
      description: '腾讯混元文生图 3.0，异步任务，中文 prompt 优化 + 自动改写',
    },
  ],
};

/** Zhipu CogView */
export const ZHIPU_IMAGE_PRESET: ProviderPreset = {
  id: 'zhipu-image',
  displayName: '智谱 CogView',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
  description: '智谱 CogView 系列文生图（中文优化）',
  docsUrl: 'https://open.bigmodel.cn/dev/api',
  kind: 'image',
  builtinModels: [
    {
      id: 'cogview-3-plus',
      label: 'CogView-3 Plus',
      capabilities: ['image-gen'],
      description: '智谱新一代图像生成模型',
    },
    { id: 'cogview-3', label: 'CogView-3', capabilities: ['image-gen'] },
  ],
};

export const IMAGE_PRESETS: ProviderPreset[] = [
  OPENAI_IMAGE_PRESET,
  HUNYUAN_IMAGE_PRESET,
  HUNYUAN_IMAGE_TC3_PRESET,
  ZHIPU_IMAGE_PRESET,
];
