/**
 * Capability helpers + cross-provider model picker.
 */

import type { ModelCapability, ModelInfo } from './types';

/** Does the model expose a given capability? Missing capabilities → treated as ['text']. */
export function modelHasCapability(model: ModelInfo, cap: ModelCapability): boolean {
  const caps = model.capabilities ?? ['text'];
  return caps.includes(cap);
}

/** Multimodal = has any of vision / image-gen / video-gen. */
export function isMultimodal(model: ModelInfo): boolean {
  const caps = model.capabilities ?? [];
  return caps.includes('vision') || caps.includes('image-gen') || caps.includes('video-gen');
}

export interface ProviderLike {
  id: string;
  models: ModelInfo[];
  enabled?: boolean;
}

export interface PickModelOptions {
  /** Capability priority queue — first match wins. */
  prefer: ModelCapability[];
  /** Optional: prefer this provider id when there is a tie. */
  providerId?: string;
}

export interface PickedModel {
  providerId: string;
  modelId: string;
  /** The capability slot that matched (one of options.prefer). */
  matched: ModelCapability;
}

/**
 * Pick the highest-priority model across providers.
 *
 * Example:
 *   pickModel(list, { prefer: ['image-gen', 'vision', 'text'] })
 *   // → image-gen first, then vision, then plain text fallback.
 *
 * Behaviour:
 *  - Skips providers with enabled === false
 *  - Walks `prefer` in order; returns the first matching model
 *  - Within a tier, the optional providerId is searched first, then the rest
 *    in input order
 */
export function pickModel(providers: ProviderLike[], options: PickModelOptions): PickedModel | null {
  const enabled = providers.filter((p) => p.enabled !== false);
  const sorted = options.providerId
    ? [
        ...enabled.filter((p) => p.id === options.providerId),
        ...enabled.filter((p) => p.id !== options.providerId),
      ]
    : enabled;

  for (const cap of options.prefer) {
    for (const p of sorted) {
      const m = p.models.find((mm) => modelHasCapability(mm, cap));
      if (m) return { providerId: p.id, modelId: m.id, matched: cap };
    }
  }
  return null;
}
