/**
 * s-aiproviders
 *
 * Public surface — safe for both browser and Node bundles.
 *   - Provider abstraction & three protocol implementations (chat streaming)
 *   - Built-in presets for the major providers
 *   - Capability helpers + cross-provider model picker
 *
 * The Node-only image-gen module lives at the subpath:
 *     import { generateImage } from 's-aiproviders/image-gen'
 * It depends on node:crypto / node:fs and must NOT be imported from browser code.
 */

/* —— Types —— */
export type {
  ProviderProtocol,
  ChatRole,
  ChatMessageInput,
  ChatUsage,
  ChatChunk,
  ChatRequest,
  ProviderInitConfig,
  IProvider,
  ModelCapability,
  ModelInfo,
  ProviderKind,
  ProviderPreset,
} from './types.js';

/* —— Protocol implementations —— */
export { OpenAICompatibleProvider } from './openai-compatible.js';
export { AnthropicProvider } from './anthropic.js';
export { GeminiProvider } from './gemini.js';
export { createProvider } from './factory.js';

/* —— Presets —— */
export {
  TOKENPLAN_PRESET,
  OPENAI_PRESET,
  ANTHROPIC_PRESET,
  GEMINI_PRESET,
  DEEPSEEK_PRESET,
  KIMI_PRESET,
  QWEN_PRESET,
  DOUBAO_PRESET,
  ZHIPU_PRESET,
  CHAT_PRESETS,
  OPENAI_IMAGE_PRESET,
  HUNYUAN_IMAGE_PRESET,
  HUNYUAN_IMAGE_TC3_PRESET,
  ZHIPU_IMAGE_PRESET,
  IMAGE_PRESETS,
  BUILTIN_PRESETS,
  findPreset,
} from './presets/index.js';

/* —— Capability helpers —— */
export {
  modelHasCapability,
  isMultimodal,
  pickModel,
} from './capabilities.js';
export type { ProviderLike, PickModelOptions, PickedModel } from './capabilities.js';

/* —— SSE primitive (advanced consumers) —— */
export { parseSse } from './sse.js';
export type { SseEvent } from './sse.js';

/* —— Version —— */
export const KIT_VERSION = '0.1.1' as const;
