/**
 * Anthropic provider adapter
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { Provider, ProviderConfig } from './types';

export function createAnthropicProvider(config: ProviderConfig): Provider {
  return {
    type: 'anthropic',
    modelId: config.model,
    model: (): LanguageModelV2 => {
      // Dynamic require is used intentionally to keep model() synchronous.
      // Switching to async import() would change the Provider API contract.
      // Variable indirection prevents Turbopack/webpack from statically resolving
      // this optional peer dependency at build time.
      const id = '@ai-sdk/anthropic';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { anthropic } = require(id) as { anthropic: (model: string) => LanguageModelV2 };
      return anthropic(config.model);
    },
  };
}
