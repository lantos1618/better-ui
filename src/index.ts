/**
 * Better UI - AI-first UI Framework
 *
 * A minimal, type-safe framework for building AI-powered tools
 * with seamless server/client execution and view integration.
 */

// ============================================
// Core Tool API
// ============================================

export { tool, Tool, ToolBuilder } from './tool';
export type {
  ToolConfig,
  ToolContext,
  ServerHandler,
  ClientHandler,
  StreamCallback,
  StreamHandler,
  ViewComponent,
  ViewState,
  CacheConfig,
  ClientFetchConfig,
} from './tool';

// ============================================
// React Hooks
// ============================================

export { useTool, useTools, useToolStream } from './react';
export type { UseToolOptions, UseToolResult, UseToolStreamResult } from './react';

// ============================================
// Providers
// ============================================

export { createProvider } from './providers';
export {
  createOpenAIProvider,
  createAnthropicProvider,
  createGoogleProvider,
  createOpenRouterProvider,
} from './providers';
export type { Provider, ProviderConfig, ProviderType } from './providers';

// ============================================
// Components
// ============================================
// Components are exported from a separate entry point to avoid
// pulling browser-only dependencies (@ai-sdk/react, TransformStream)
// into server-side code.
//
// Import from '@lantos1618/better-ui/components' or directly:
//   import { Chat, ChatProvider } from '@lantos1618/better-ui/components'
//
// Re-export types only (no runtime imports):
export type {
  ChatProviderProps,
  ToolPartInfo,
  ThreadProps,
  MessageProps,
  ComposerProps,
  ToolResultProps,
  ChatProps,
} from './components';
