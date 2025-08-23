import { createToolBuilder, tool as toolBuilder } from './core/builder';
import { globalRegistry } from './core/registry';
import type { ToolDefinition, ToolRegistry, ToolBuilder } from './types';
import { z } from 'zod';
import { ReactElement } from 'react';

export * from './types';
export { createRegistry } from './core/registry';
export { ClientToolExecutor } from './client/executor';

class AUI {
  private registry: ToolRegistry;
  
  z = z;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || globalRegistry;
  }

  tool(name: string) {
    return createToolBuilder(name);
  }

  // Ultra-concise: create and auto-register a simple tool
  simple<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    handler: (input: TInput) => Promise<TOutput> | TOutput,
    renderer?: (data: TOutput) => ReactElement
  ): ToolDefinition<TInput, TOutput> {
    const tool = this.tool(name)
      .input(inputSchema)
      .execute(handler as any);
    
    if (renderer) {
      tool.render(renderer as any);
    }
    
    const built = tool.build();
    this.register(built);
    return built;
  }

  // Quick mode: auto-build after execute and render
  quick(name: string) {
    return createToolBuilder(name).quick();
  }

  // Create a tool with full context support
  contextual<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    handler: (params: { input: TInput; ctx: any }) => Promise<TOutput> | TOutput,
    renderer?: (data: TOutput) => ReactElement
  ): ToolDefinition<TInput, TOutput> {
    const tool = this.tool(name)
      .input(inputSchema)
      .execute(handler as any);
    
    if (renderer) {
      tool.render(renderer as any);
    }
    
    const built = tool.build();
    this.register(built);
    return built;
  }

  // Create a server-only tool (no client execution)
  server<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    handler: (input: TInput) => Promise<TOutput> | TOutput,
    renderer?: (data: TOutput) => ReactElement
  ): ToolDefinition<TInput, TOutput> {
    const tool = this.tool(name)
      .input(inputSchema)
      .serverOnly()
      .execute(handler as any);
    
    if (renderer) {
      tool.render(renderer as any);
    }
    
    const built = tool.build();
    this.register(built);
    return built;
  }

  register(tool: ToolDefinition) {
    this.registry.register(tool);
    return this;
  }

  getTools() {
    return this.registry.list();
  }

  getTool(name: string) {
    return this.registry.get(name);
  }
}

// Create the global AUI instance
const aui = new AUI();

// Export everything
export { aui, z, toolBuilder };
export default aui;

// Export type helpers for better DX
export type Input<T> = T extends ToolDefinition<infer I, any> ? I : never;
export type Output<T> = T extends ToolDefinition<any, infer O> ? O : never;