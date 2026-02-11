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
      // Dynamic require is used intentionally to keep model() synchronous.
      // Switching to async import() would change the Provider API contract.
      // Variable indirection prevents Turbopack/webpack from statically resolving
      // this optional peer dependency at build time.
      const id = '@ai-sdk/openai';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openai } = require(id) as { openai: (model: string) => LanguageModelV2 };
      return openai(config.model);
    },
  };
}
