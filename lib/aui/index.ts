import { createToolBuilder, tool as toolBuilder } from './core/builder';
import { globalRegistry } from './core/registry';
import type { ToolDefinition, ToolRegistry, ToolBuilder, ToolContext } from './types';
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

  // Ultra-concise chainable API
  t(name: string) {
    return createToolBuilder(name);
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

  // One-liner tool creation with automatic registration
  create<TInput, TOutput>(
    name: string,
    config: {
      input: z.ZodType<TInput>;
      execute: (input: TInput) => Promise<TOutput> | TOutput;
      render?: (data: TOutput) => ReactElement;
      client?: (input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput;
    }
  ): ToolDefinition<TInput, TOutput> {
    const tool = this.tool(name)
      .input(config.input)
      .execute(config.execute as any);
    
    if (config.client) {
      tool.clientExecute(config.client as any);
    }
    
    if (config.render) {
      tool.render(config.render as any);
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

  // Define multiple tools at once
  defineTools(tools: Record<string, {
    input: z.ZodType<any>;
    execute: (input: any) => Promise<any> | any;
    render?: (data: any) => ReactElement;
    client?: (input: any, ctx: ToolContext) => Promise<any> | any;
  }>): Record<string, ToolDefinition> {
    const definitions: Record<string, ToolDefinition> = {};
    
    for (const [name, config] of Object.entries(tools)) {
      definitions[name] = this.create(name, config);
    }
    
    return definitions;
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

// Export convenience functions for ultra-concise usage
export const defineTool = <TInput, TOutput>(
  name: string,
  config: {
    input: z.ZodType<TInput>;
    execute: (input: TInput) => Promise<TOutput> | TOutput;
    render?: (data: TOutput) => ReactElement;
    client?: (input: TInput, ctx: ToolContext) => Promise<TOutput> | TOutput;
  }
) => aui.create(name, config);

export const t = (name: string) => aui.t(name);

// Export type helpers for better DX
export type Input<T> = T extends ToolDefinition<infer I, any> ? I : never;
export type Output<T> = T extends ToolDefinition<any, infer O> ? O : never;