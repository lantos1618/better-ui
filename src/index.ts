/**
 * Better UI - AI-first UI Framework
 *
 * A minimal, type-safe framework for building AI-powered tools
 * with seamless server/client execution and view integration.
 *
 * This entry point is server-safe (no React hooks).
 * React hooks are available from '@lantos1618/better-ui/react'.
 */

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

export { createProvider } from './providers';
export {
  createOpenAIProvider,
  createAnthropicProvider,
  createGoogleProvider,
  createOpenRouterProvider,
} from './providers';
export type { Provider, ProviderConfig, ProviderType } from './providers';

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
  ThemeProviderProps,
} from './components';
