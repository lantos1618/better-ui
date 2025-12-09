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
  ViewComponent,
  CacheConfig,
  ClientFetchConfig,
} from './tool';

// ============================================
// React Hooks
// ============================================

export { useTool, useTools } from './react';
export type { UseToolOptions, UseToolResult } from './react';
