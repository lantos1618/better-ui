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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { google } = require('@ai-sdk/google') as { google: (model: string) => LanguageModelV2 };
      return google(config.model);
    },
  };
}
