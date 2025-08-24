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
  inputSchema?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input?: TInput }) => ReactElement;
  metadata?: Record<string, any>;
}

// Fluent builder interface that doesn't require .build()
class Tool<TInput = any, TOutput = any> {
  private definition: ToolDefinition<TInput, TOutput>;
  private aui?: AUI;
  
  constructor(name: string, aui?: AUI) {
    this.definition = {
      name,
      execute: async () => null as any,
    };
    this.aui = aui;
  }

  // Chainable methods that return the tool itself (not a builder)
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this.definition.inputSchema = schema as any;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: ToolContext }) => Promise<O> | O): Tool<TInput, O> {
    this.definition.execute = async (params) => await Promise.resolve(handler(params));
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput> {
    this.definition.clientExecute = async (params) => await Promise.resolve(handler(params));
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput }) => ReactElement): Tool<TInput, TOutput> {
    this.definition.render = component;
    return this;
  }

  // Properties to access the tool's configuration
  get name() { return this.definition.name; }
  get inputSchema() { return this.definition.inputSchema; }
  get metadata() { return this.definition.metadata; }

  // Execute the tool directly (for runtime use)
  async run(input: TInput, ctx?: ToolContext): Promise<TOutput> {
    const validatedInput = this.definition.inputSchema ? 
      this.definition.inputSchema.parse(input) : input;
    
    // Always use global context as base, merge with provided context
    const mergedContext = this.aui ? {
      ...this.aui.getContext(),
      ...(ctx || {})
    } : ctx;
    
    // Use client execution if available and context is provided
    if (this.definition.clientExecute && mergedContext) {
      return await Promise.resolve(this.definition.clientExecute({ input: validatedInput, ctx: mergedContext }));
    }
    
    return await Promise.resolve(this.definition.execute({ input: validatedInput, ctx: mergedContext }));
  }

  // Render the result
  renderResult(data: TOutput, input?: TInput): ReactElement | null {
    if (!this.definition.render) return null;
    return this.definition.render({ data, input });
  }

  // Export the tool definition (for serialization/registration)
  toDefinition(): ToolDefinition<TInput, TOutput> {
    return { ...this.definition };
  }
}

// Main AUI class
class AUI {
  private tools = new Map<string, Tool>();
  private defaultContext: ToolContext = {
    cache: new Map(),
    fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
  };

  // Set global context
  setContext(context: Partial<ToolContext>): this {
    this.defaultContext = {
      ...this.defaultContext,
      ...context,
    };
    return this;
  }

  // Get current context
  getContext(): ToolContext {
    return this.defaultContext;
  }

  // Create a tool - returns the tool directly (no .build() required!)
  tool(name: string): Tool {
    const tool = new Tool(name, this);
    this.tools.set(name, tool);
    return tool;
  }

  // Shorthand: t() instead of tool()
  t(name: string): Tool {
    return this.tool(name);
  }

  // One-liner for simple tools without input
  do<TOutput>(name: string, handler: () => TOutput | Promise<TOutput>): Tool<void, TOutput> {
    return this.tool(name)
      .execute(async () => await Promise.resolve(handler()));
  }

  // One-liner with input
  doWith<TInput, TOutput>(
    name: string, 
    inputSchema: z.ZodType<TInput>,
    handler: (input: TInput) => TOutput | Promise<TOutput>
  ): Tool<TInput, TOutput> {
    return this.tool(name)
      .input(inputSchema)
      .execute(async ({ input }) => await Promise.resolve(handler(input)));
  }

  // Simple tool with all basics
  simple<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    execute: (input: TInput) => Promise<TOutput> | TOutput,
    render?: (data: TOutput) => ReactElement
  ): Tool<TInput, TOutput> {
    const tool = this.tool(name)
      .input(inputSchema)
      .execute(async ({ input }) => await Promise.resolve(execute(input)));
    
    if (render) {
      tool.render(({ data }) => render(data));
    }
    
    return tool;
  }

  // AI-optimized tool with retry and caching
  ai<TInput, TOutput>(
    name: string,
    config: {
      input?: z.ZodType<TInput>;
      execute: (params: { input: TInput }) => Promise<TOutput> | TOutput;
      render?: (props: { data: TOutput }) => ReactElement;
      retry?: number;
      cache?: boolean;
    }
  ): Tool<TInput, TOutput> {
    const tool = this.tool(name);
    
    if (config.input) {
      tool.input(config.input);
    }

    // Wrap execute with retry logic
    const executeWithRetry = async (params: { input: TInput; ctx?: ToolContext }) => {
      let lastError: any;
      const retries = config.retry || 3;
      
      for (let i = 0; i < retries; i++) {
        try {
          return await Promise.resolve(config.execute(params));
        } catch (error) {
          lastError = error;
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          }
        }
      }
      throw lastError;
    };

    tool.execute(executeWithRetry);

    // Add client-side caching if requested
    if (config.cache) {
      tool.clientExecute(async ({ input, ctx }) => {
        const cacheKey = JSON.stringify({ name, input });
        const cached = ctx.cache.get(cacheKey);
        if (cached) return cached;
        
        const result = await executeWithRetry({ input, ctx });
        ctx.cache.set(cacheKey, result);
        return result;
      });
    }

    if (config.render) {
      tool.render(config.render);
    }

    return tool;
  }

  // Define multiple tools at once with better type safety
  defineTools<T extends Record<string, {
    input?: z.ZodType<any>;
    execute: (params: any) => any;
    clientExecute?: (params: any) => any;
    render?: (props: any) => ReactElement;
  }>>(definitions: T): { [K in keyof T]: Tool } {
    const tools = {} as { [K in keyof T]: Tool };
    
    for (const [name, def] of Object.entries(definitions)) {
      const tool = this.tool(name);
      
      if (def.input) tool.input(def.input);
      tool.execute(def.execute);
      if (def.clientExecute) tool.clientExecute(def.clientExecute);
      if (def.render) tool.render(def.render);
      
      tools[name as keyof T] = tool;
    }
    
    return tools;
  }

  // Batch create simple tools
  batch<T extends Record<string, (input: any) => any>>(
    tools: T
  ): { [K in keyof T]: Tool } {
    const result = {} as { [K in keyof T]: Tool };
    
    for (const [name, handler] of Object.entries(tools)) {
      result[name as keyof T] = this.tool(name)
        .execute(async ({ input }) => await Promise.resolve(handler(input)));
    }
    
    return result;
  }

  // Get a registered tool
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // Register an external tool
  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  // Register multiple tools
  registerAll(...tools: Tool[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  // List all tools
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Get tool names
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Check if tool exists
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // Execute a tool by name
  async execute<TInput = any, TOutput = any>(
    name: string, 
    input: TInput,
    ctx?: ToolContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    return await tool.run(input, ctx || this.defaultContext);
  }

  // Clear all tools
  clear(): void {
    this.tools.clear();
  }

  // Remove a specific tool
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  // Get context with custom additions
  createContext(additions?: Partial<ToolContext>): ToolContext {
    return {
      ...this.defaultContext,
      ...additions,
      cache: additions?.cache || new Map(),
    };
  }
}

// Create and export the global instance
const aui = new AUI();

// Type utilities for better DX
export type InferToolInput<T> = T extends Tool<infer I, any> ? I : never;
export type InferToolOutput<T> = T extends Tool<any, infer O> ? O : never;
export type ToolDef<TInput = any, TOutput = any> = {
  input?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input?: TInput }) => ReactElement;
};

// Helper to create a tool outside of aui
export function createTool<TInput = any, TOutput = any>(name: string): Tool<TInput, TOutput> {
  return new Tool(name);
}

// Re-export z from zod for convenience
export { z } from 'zod';
export { aui, Tool, type ToolContext, type ToolDefinition };
export default aui;