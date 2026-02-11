/**
 * Provider types for Better UI multi-provider support
 */

import type { LanguageModelV2 } from '@ai-sdk/provider';

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'openrouter';

export interface ProviderConfig {
  provider: ProviderType;
  model: string;
  apiKey?: string;
  baseURL?: string;
  options?: Record<string, unknown>;
}

export interface Provider {
  readonly type: ProviderType;
  readonly modelId: string;
  /** Get the AI SDK model instance */
  model: () => LanguageModelV2;
}
