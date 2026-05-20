import type { ProviderPreset } from '../types.js';
import { CHAT_PRESETS } from './chat.js';
import { IMAGE_PRESETS } from './image.js';

export * from './chat.js';
export * from './image.js';

/** All built-in presets — chat first, then image. The order is the suggested UI order. */
export const BUILTIN_PRESETS: ProviderPreset[] = [...CHAT_PRESETS, ...IMAGE_PRESETS];

/** Look up a preset by id. */
export function findPreset(id: string): ProviderPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id);
}
