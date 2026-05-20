/**
 * Cross-cutting types shared by every protocol implementation.
 *
 * Design rule: this file MUST NOT depend on any external schema library
 * (e.g. zod). The types here are the public contract of s-aiproviders.
 */

/* ========== Protocol & messages ========== */

export type ProviderProtocol = 'openai-compatible' | 'anthropic' | 'gemini';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

/** Streaming chunk yielded by IProvider.chat() */
export type ChatChunk =
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: ChatUsage }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };

/**
 * What to send to a provider for one streaming turn.
 * Caller is responsible for assembling the full message history.
 */
export interface ChatRequest {
  /** Model id understood by the upstream provider */
  model: string;
  /** Full conversation context (caller-managed) */
  messages: ChatMessageInput[];
  temperature?: number;
  /** OpenAI calls it max_tokens; Anthropic max_tokens; Gemini maxOutputTokens. */
  maxTokens?: number;
}

/* ========== Provider config & abstraction ========== */

export interface ProviderInitConfig {
  apiKey: string;
  baseURL: string;
  /** Optional: request timeout (ms). Reserved — current implementations rely on AbortSignal. */
  timeoutMs?: number;
}

export interface IProvider {
  readonly protocol: ProviderProtocol;

  /**
   * Streaming chat. Yields ChatChunk events; never throws on network/HTTP/parse
   * errors — yields `{ type: 'error' }` instead. Must honour AbortSignal.
   */
  chat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk>;

  /**
   * Optional: pull live model list from the upstream (where supported, e.g.
   * OpenAI-compatible /v1/models). Returns null on failure so callers can
   * fall back to preset.builtinModels.
   */
  listModels?(): Promise<{ id: string; label?: string }[] | null>;
}

/* ========== Model & preset metadata ========== */

export type ModelCapability = 'text' | 'vision' | 'image-gen' | 'video-gen';

export interface ModelInfo {
  /** Upstream model id */
  id: string;
  /** Human-readable label */
  label: string;
  /** Context window in tokens */
  contextWindow?: number;
  description?: string;
  /** Multimodal capabilities. Missing → treated as ['text']. */
  capabilities?: ModelCapability[];
}

/** What kind of provider this is — affects routing in the host app. */
export type ProviderKind = 'chat' | 'image';

export interface ProviderPreset {
  id: string;
  displayName: string;
  protocol: ProviderProtocol;
  defaultBaseURL: string;
  builtinModels: ModelInfo[];
  recommended?: boolean;
  description?: string;
  docsUrl?: string;
  /** Extra fields the user must supply on top of apiKey/baseURL */
  extraFields?: Array<{ name: string; label: string; required: boolean }>;
  /** 'chat' (default) or 'image' */
  kind?: ProviderKind;
}
