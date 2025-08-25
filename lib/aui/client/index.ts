'use client';

// Re-export from the new implementation
export { AUIProvider, useAUIContext } from './provider';
export { 
  useAUITool, 
  useAUI, 
  type UseToolOptions, 
  type UseToolResult, 
  type UseAUIResult 
} from './hooks';

// Aliases for backward compatibility
export { useAUITool as useTool } from './hooks';
export { AUIProvider as ToolExecutorProvider } from './provider';

// Legacy exports
export { ClientToolExecutor } from './executor';
export { ToolRenderer } from './components';