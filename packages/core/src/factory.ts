import type { IProvider, ProviderInitConfig, ProviderProtocol } from './types';
import { OpenAICompatibleProvider } from './openai-compatible';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

export function createProvider(protocol: ProviderProtocol, cfg: ProviderInitConfig): IProvider {
  switch (protocol) {
    case 'openai-compatible':
      return new OpenAICompatibleProvider(cfg);
    case 'anthropic':
      return new AnthropicProvider(cfg);
    case 'gemini':
      return new GeminiProvider(cfg);
    default: {
      const _exhaust: never = protocol;
      throw new Error(`[s-aiproviders] unsupported protocol: ${String(_exhaust)}`);
    }
  }
}
