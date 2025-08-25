import { AUITool, AUIContext, ToolConfig } from './core';

export { AUITool } from './core';
export type { AUIContext, ToolConfig } from './core';

export class AUI {
  private tools = new Map<string, AUITool>();

  tool(name: string): AUITool {
    const t = new AUITool(name);
    this.tools.set(name, t);
    return t;
  }

  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  async execute<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    ctx?: AUIContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx || this.createContext());
  }

  createContext(additions?: Partial<AUIContext>): AUIContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      isServer: typeof window === 'undefined',
      ...additions,
    };
  }

  getTools(): AUITool[] {
    return Array.from(this.tools.values());
  }

  list(): AUITool[] {
    return this.getTools();
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  remove(name: string): boolean {
    return this.tools.delete(name);
  }
  
  findByTag(tag: string): AUITool[] {
    return this.getTools().filter(tool => tool.tags.includes(tag));
  }
  
  findByTags(...tags: string[]): AUITool[] {
    return this.getTools().filter(tool => 
      tags.every(tag => tool.tags.includes(tag))
    );
  }
}

const aui: AUI = new AUI();

export type InferToolInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferToolOutput<T> = T extends AUITool<any, infer O> ? O : never;

export type ToolDefinition<TInput = any, TOutput = any> = {
  tool: AUITool<TInput, TOutput>;
  input: TInput;
  output: TOutput;
};

export type ExtractTools<T> = T extends { [K in keyof T]: AUITool<infer I, infer O> }
  ? { [K in keyof T]: ToolDefinition<InferToolInput<T[K]>, InferToolOutput<T[K]>> }
  : never;

// Re-export everything for convenience
export { z } from 'zod';
export { useAUITool, useAUI } from './hooks/useAUITool';
export { useAUITools } from './hooks/useAUITools';
export { AUIProvider, useAUIContext, useAUIInstance } from './provider';
export { 
  createAITool, 
  AIControlledTool, 
  aiControlSystem,
  aiTools,
  type AIControlOptions 
} from './ai-control';

// Export all pre-built tools
export * from './tools';

// Client control exports
export { 
  clientTools, 
  clientControlSystem, 
  createClientControlSystem,
  type ClientControlContext 
} from './client-control';

// Tool registry and discovery
export { 
  ToolRegistry,
  ToolDiscovery,
  globalToolRegistry,
  toolDiscovery,
  type ToolMetadata
} from './tool-registry';

// Example tools - exported separately to avoid circular dependencies

export default aui;