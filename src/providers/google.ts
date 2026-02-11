/**
 * Google (Gemini) provider adapter
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { Provider, ProviderConfig } from './types';

export function createGoogleProvider(config: ProviderConfig): Provider {
  return {
    type: 'google',
    modelId: config.model,
    model: (): LanguageModelV2 => {
      // Dynamic require is used intentionally to keep model() synchronous.
      // Switching to async import() would change the Provider API contract.
      // Variable indirection prevents Turbopack/webpack from statically resolving
      // this optional peer dependency at build time.
      const id = '@ai-sdk/google';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { google } = require(id) as { google: (model: string) => LanguageModelV2 };
      return google(config.model);
    },
  };
}
