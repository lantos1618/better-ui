/**
 * OpenRouter provider adapter
 * Uses the OpenAI SDK with a custom baseURL pointing to OpenRouter
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { Provider, ProviderConfig } from './types';

interface OpenAIProviderSettings {
  baseURL?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export function createOpenRouterProvider(config: ProviderConfig): Provider {
  return {
    type: 'openrouter',
    modelId: config.model,
    model: (): LanguageModelV2 => {
      // Dynamic require is used intentionally to keep model() synchronous.
      // Switching to async import() would change the Provider API contract.
      // Variable indirection prevents Turbopack/webpack from statically resolving
      // this optional peer dependency at build time.
      const id = '@ai-sdk/openai';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createOpenAI } = require(id) as {
        createOpenAI: (settings: OpenAIProviderSettings) => (model: string) => LanguageModelV2;
      };
      const openrouter = createOpenAI({
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
        apiKey: config.apiKey,
        ...config.options,
      });
      return openrouter(config.model);
    },
  };
}
