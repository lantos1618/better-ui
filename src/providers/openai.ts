/**
 * OpenAI provider adapter
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { Provider, ProviderConfig } from './types';

export function createOpenAIProvider(config: ProviderConfig): Provider {
  return {
    type: 'openai',
    modelId: config.model,
    model: (): LanguageModelV2 => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openai } = require('@ai-sdk/openai') as { openai: (model: string) => LanguageModelV2 };
      return openai(config.model);
    },
  };
}
