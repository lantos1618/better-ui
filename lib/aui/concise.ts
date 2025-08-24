import { z } from 'zod';
import { ReactElement } from 'react';
import { createToolBuilder } from './core/builder';
import { globalRegistry } from './core/registry';
import type { ToolDefinition, ToolContext } from './types';

// Ultra-concise AUI API
class ConciseAUI {
  // Single-method tool creation
  tool<I, O>(
    name: string,
    input: z.ZodType<I>,
    execute: (input: I) => O | Promise<O>,
    render?: (data: O) => ReactElement | string
  ): ToolDefinition<I, O> {
    const builder = createToolBuilder(name)
      .input(input)
      .execute(execute as any);
    
    if (render) {
      builder.render(render as any);
    }
    
    const tool = builder.build();
    globalRegistry.register(tool);
    return tool;
  }

  // Even more concise with array syntax
  t<I, O>(
    name: string,
    ...args: [z.ZodType<I>, (i: I) => O | Promise<O>, ((d: O) => ReactElement)?]
  ): ToolDefinition<I, O> {
    return this.tool(name, ...args);
  }

  // Client-optimized tool
  client<I, O>(
    name: string,
    input: z.ZodType<I>,
    server: (input: I) => O | Promise<O>,
    client: (input: I, ctx: ToolContext) => O | Promise<O>,
    render?: (data: O) => ReactElement
  ): ToolDefinition<I, O> {
    const tool = createToolBuilder(name)
      .input(input)
      .execute(server as any)
      .clientExecute(client as any);
    
    if (render) {
      tool.render(render as any);
    }
    
    const built = tool.build();
    globalRegistry.register(built);
    return built;
  }

  // Batch creation
  batch(tools: Record<string, {
    input: z.ZodType<any>;
    execute: (input: any) => any | Promise<any>;
    render?: (data: any) => ReactElement;
    client?: (input: any, ctx: ToolContext) => any | Promise<any>;
  }>): Record<string, ToolDefinition> {
    const result: Record<string, ToolDefinition> = {};
    
    for (const [name, config] of Object.entries(tools)) {
      const builder = createToolBuilder(name)
        .input(config.input)
        .execute(config.execute as any);
      
      if (config.client) {
        builder.clientExecute(config.client as any);
      }
      
      if (config.render) {
        builder.render(config.render as any);
      }
      
      result[name] = builder.build();
      globalRegistry.register(result[name]);
    }
    
    return result;
  }

  // Chainable builder for more control
  build(name: string) {
    return createToolBuilder(name);
  }
}

// Export singleton instance
export const aui = new ConciseAUI();

// Export shortcuts
export const tool = aui.tool.bind(aui);
export const t = aui.t.bind(aui);
export const batch = aui.batch.bind(aui);

// Export builder function
export const build = (name: string) => createToolBuilder(name);

// Type helpers
export type Input<T> = T extends ToolDefinition<infer I, any> ? I : never;
export type Output<T> = T extends ToolDefinition<any, infer O> ? O : never;