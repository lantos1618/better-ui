'use client';

import { useChatContext } from './ChatProvider';
import { useToolOutput, type ToolOutputResult } from './useToolOutput';

/**
 * Convenience wrapper that grabs the store from ChatProvider context.
 * Must be used within a <ChatProvider>.
 */
export function useChatToolOutput<T = unknown>(toolName: string): ToolOutputResult<T> {
  const { toolStateStore } = useChatContext();
  return useToolOutput<T>(toolStateStore, toolName);
}
