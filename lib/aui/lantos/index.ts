import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  inputSchema: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput>;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  render: (props: { data: TOutput; input?: TInput }) => ReactElement;
  metadata?: Record<string, any>;
}

// The magic: Tool definition that is ALSO a builder
export interface Tool<TInput = any, TOutput = any> extends ToolDefinition<TInput, TOutput> {
  // Builder methods that return the same tool
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput>;
  execute<O>(handler: (params: { input: TInput }) => Promise<O> | O): Tool<TInput, O>;
  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput>;
  render(component: (props: { data: TOutput }) => ReactElement): Tool<TInput, TOutput>;
}

class ToolImpl<TInput = any, TOutput = any> implements Tool<TInput, TOutput> {
  name: string;
  inputSchema: z.ZodType<TInput> = z.any() as any;
  execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> = async () => null as any;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  render: (props: { data: TOutput; input?: TInput }) => ReactElement = ({ data }) => data as any;
  metadata?: Record<string, any> = {};

  constructor(name: string) {
    this.name = name;
  }

  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    (this as any).inputSchema = schema;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput }) => Promise<O> | O): Tool<TInput, O> {
    (this as any).execute = async (params: { input: TInput }) => {
      return await Promise.resolve(handler(params));
    };
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput> {
    this.clientExecute = async (params) => {
      return await Promise.resolve(handler(params));
    };
    return this;
  }

  render(component: (props: { data: TOutput }) => ReactElement): Tool<TInput, TOutput> {
    this.render = component as any;
    return this;
  }
}

// Main AUI class
class AUI {
  private tools = new Map<string, Tool>();

  // Create a tool - returns a Tool that is BOTH a builder AND a definition
  tool(name: string): Tool {
    const tool = new ToolImpl(name);
    this.tools.set(name, tool);
    return tool;
  }

  // Get a registered tool
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // List all tools
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Clear all tools
  clear() {
    this.tools.clear();
  }
}

// Create the global instance
const aui = new AUI();

export { aui };
export default aui;