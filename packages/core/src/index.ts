/**
 * @s-aiproviders/core
 *
 * Public surface — safe for both browser and Node bundles.
 *   - Provider abstraction & three protocol implementations (chat streaming)
 *   - Built-in presets for the major providers
 *   - Capability helpers + cross-provider model picker
 *
 * The Node-only image-gen module lives at the subpath:
 *     import { generateImage } from '@s-aiproviders/core/image-gen'
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
} from './types';

/* —— Protocol implementations —— */
export { OpenAICompatibleProvider } from './openai-compatible';
export { AnthropicProvider } from './anthropic';
export { GeminiProvider } from './gemini';
export { createProvider } from './factory';

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
} from './presets';

/* —— Capability helpers —— */
export {
  modelHasCapability,
  isMultimodal,
  pickModel,
} from './capabilities';
export type { ProviderLike, PickModelOptions, PickedModel } from './capabilities';

/* —— SSE primitive (advanced consumers) —— */
export { parseSse } from './sse';
export type { SseEvent } from './sse';

/* —— Version —— */
export const KIT_VERSION = '0.1.0' as const;
