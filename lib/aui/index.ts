// Lantos AUI - Ultra Concise API for AI-controlled operations
// Main entry point - exports the complete AUI system

// Core exports from lantos-aui implementation
export { 
  default as aui,
  Tool,
  createTool,
  z,
  type ToolContext,
  type ToolDefinition,
  type InferToolInput,
  type InferToolOutput,
  type ToolDef
} from './lantos-aui';

// Client-side hooks and providers
export { 
  AUIProvider, 
  useAUIContext 
} from './client/provider';

export { 
  useAUITool,
  useAUITool as useTool,
  useAUI,
  type UseToolOptions,
  type UseToolResult,
  type UseAUIResult
} from './client/hooks';

// Example tools
export { 
  weatherTool,
  searchTool,
  databaseTool,
  calculatorTool,
  assistantTool,
  exampleTools,
  registerExampleTools
} from './tools/examples';