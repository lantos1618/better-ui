/**
 * Multi-provider support for Better UI
 */

export type { ProviderType, ProviderConfig, Provider } from './types';
export { createOpenAIProvider } from './openai';
export { createAnthropicProvider } from './anthropic';
export { createGoogleProvider } from './google';
export { createOpenRouterProvider } from './openrouter';

import type { ProviderConfig, Provider, ProviderType } from './types';
import { createOpenAIProvider } from './openai';
import { createAnthropicProvider } from './anthropic';
import { createGoogleProvider } from './google';
import { createOpenRouterProvider } from './openrouter';

/**
 * Create a provider instance from a config object
 *
 * @example
 * ```typescript
 * const provider = createProvider({ provider: 'openai', model: 'gpt-4o' });
 * const provider = createProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });
 * const provider = createProvider({ provider: 'google', model: 'gemini-2.5-pro' });
 * const provider = createProvider({
 *   provider: 'openrouter',
 *   model: 'anthropic/claude-4-sonnet',
 *   apiKey: process.env.OPENROUTER_API_KEY,
 * });
 * ```
 */
export function createProvider(config: ProviderConfig): Provider {
  switch (config.provider) {
    case 'openai':
      return createOpenAIProvider(config);
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'google':
      return createGoogleProvider(config);
    case 'openrouter':
      return createOpenRouterProvider(config);
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`Unknown provider: ${exhaustiveCheck}`);
    }
  }
}
