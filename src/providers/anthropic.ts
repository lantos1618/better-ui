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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { anthropic } = require('@ai-sdk/anthropic') as { anthropic: (model: string) => LanguageModelV2 };
      return anthropic(config.model);
    },
  };
}
