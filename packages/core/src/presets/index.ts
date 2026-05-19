import type { ProviderPreset } from '../types';
import { CHAT_PRESETS } from './chat';
import { IMAGE_PRESETS } from './image';

export * from './chat';
export * from './image';

/** All built-in presets — chat first, then image. The order is the suggested UI order. */
export const BUILTIN_PRESETS: ProviderPreset[] = [...CHAT_PRESETS, ...IMAGE_PRESETS];

/** Look up a preset by id. */
export function findPreset(id: string): ProviderPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id);
}
