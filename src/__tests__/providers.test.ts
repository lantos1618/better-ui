/**
 * Tests for Better UI provider system
 */

import {
  createProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createGoogleProvider,
  createOpenRouterProvider,
} from '../providers';
import type { ProviderConfig } from '../providers';

// Mock the AI SDK modules (virtual: true for packages that may not be installed)
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((model: string) => ({ provider: 'openai', modelId: model })),
  createOpenAI: jest.fn((opts: Record<string, unknown>) => {
    return (model: string) => ({ provider: 'openai-custom', modelId: model, ...opts });
  }),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn((model: string) => ({ provider: 'anthropic', modelId: model })),
}), { virtual: true });

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn((model: string) => ({ provider: 'google', modelId: model })),
}), { virtual: true });

describe('Providers', () => {
  describe('createOpenAIProvider', () => {
    it('returns correct type and modelId', () => {
      const provider = createOpenAIProvider({ provider: 'openai', model: 'gpt-4o' });
      expect(provider.type).toBe('openai');
      expect(provider.modelId).toBe('gpt-4o');
    });

    it('model() returns an AI SDK model instance', () => {
      const provider = createOpenAIProvider({ provider: 'openai', model: 'gpt-4o' });
      const model = provider.model();
      expect(model).toEqual({ provider: 'openai', modelId: 'gpt-4o' });
    });
  });

  describe('createAnthropicProvider', () => {
    it('returns correct type and modelId', () => {
      const provider = createAnthropicProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });
      expect(provider.type).toBe('anthropic');
      expect(provider.modelId).toBe('claude-4-sonnet');
    });

    it('model() returns an AI SDK model instance', () => {
      const provider = createAnthropicProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });
      const model = provider.model();
      expect(model).toEqual({ provider: 'anthropic', modelId: 'claude-4-sonnet' });
    });
  });

  describe('createGoogleProvider', () => {
    it('returns correct type and modelId', () => {
      const provider = createGoogleProvider({ provider: 'google', model: 'gemini-2.5-pro' });
      expect(provider.type).toBe('google');
      expect(provider.modelId).toBe('gemini-2.5-pro');
    });

    it('model() returns an AI SDK model instance', () => {
      const provider = createGoogleProvider({ provider: 'google', model: 'gemini-2.5-pro' });
      const model = provider.model();
      expect(model).toEqual({ provider: 'google', modelId: 'gemini-2.5-pro' });
    });
  });

  describe('createOpenRouterProvider', () => {
    it('returns correct type and modelId', () => {
      const provider = createOpenRouterProvider({
        provider: 'openrouter',
        model: 'anthropic/claude-4-sonnet',
        apiKey: 'test-key',
      });
      expect(provider.type).toBe('openrouter');
      expect(provider.modelId).toBe('anthropic/claude-4-sonnet');
    });

    it('model() uses OpenAI SDK with OpenRouter baseURL', () => {
      const provider = createOpenRouterProvider({
        provider: 'openrouter',
        model: 'anthropic/claude-4-sonnet',
        apiKey: 'test-key',
      });
      const model = provider.model() as Record<string, unknown>;
      expect(model.baseURL).toBe('https://openrouter.ai/api/v1');
      expect(model.apiKey).toBe('test-key');
      expect(model.modelId).toBe('anthropic/claude-4-sonnet');
    });

    it('allows custom baseURL override', () => {
      const provider = createOpenRouterProvider({
        provider: 'openrouter',
        model: 'test-model',
        baseURL: 'https://custom.api.com/v1',
      });
      const model = provider.model() as Record<string, unknown>;
      expect(model.baseURL).toBe('https://custom.api.com/v1');
    });
  });

  describe('createProvider factory', () => {
    it('routes to OpenAI provider', () => {
      const provider = createProvider({ provider: 'openai', model: 'gpt-4o' });
      expect(provider.type).toBe('openai');
      expect(provider.modelId).toBe('gpt-4o');
    });

    it('routes to Anthropic provider', () => {
      const provider = createProvider({ provider: 'anthropic', model: 'claude-4-sonnet' });
      expect(provider.type).toBe('anthropic');
      expect(provider.modelId).toBe('claude-4-sonnet');
    });

    it('routes to Google provider', () => {
      const provider = createProvider({ provider: 'google', model: 'gemini-2.5-pro' });
      expect(provider.type).toBe('google');
      expect(provider.modelId).toBe('gemini-2.5-pro');
    });

    it('routes to OpenRouter provider', () => {
      const provider = createProvider({
        provider: 'openrouter',
        model: 'meta/llama-3-70b',
        apiKey: 'test-key',
      });
      expect(provider.type).toBe('openrouter');
      expect(provider.modelId).toBe('meta/llama-3-70b');
    });

    it('throws on invalid provider type', () => {
      expect(() => {
        // @ts-expect-error testing invalid provider type
        createProvider({ provider: 'invalid', model: 'test' });
      }).toThrow('Unknown provider: invalid');
    });
  });
});
