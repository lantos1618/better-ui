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
export class Tool<TInput = any, TOutput = any> {
  private definition: ToolDefinition<TInput, TOutput>;
  
  constructor(name: string) {
    this.definition = {
      name,
      execute: async () => null as any,
    };
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
    
    // Use client execution if available and context is provided
    if (this.definition.clientExecute && ctx) {
      return await Promise.resolve(this.definition.clientExecute({ input: validatedInput, ctx }));
    }
    
    return await Promise.resolve(this.definition.execute({ input: validatedInput, ctx }));
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

  // Create a tool - returns the tool directly (no .build() required!)
  tool(name: string): Tool {
    const tool = new Tool(name);
    this.tools.set(name, tool);
    return tool;
  }

  // Shorthand: t() instead of tool()
  t(name: string): Tool {
    return this.tool(name);
  }

  // One-liner for simple tools
  do<TOutput>(name: string, handler: () => TOutput): Tool<void, TOutput> {
    return this.tool(name)
      .execute(async () => await Promise.resolve(handler()));
  }

  // Simple tool with all basics
  simple<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    execute: (input: TInput) => Promise<TOutput> | TOutput,
    render: (data: TOutput) => ReactElement
  ): Tool<TInput, TOutput> {
    return this.tool(name)
      .input(inputSchema)
      .execute(async ({ input }) => await Promise.resolve(execute(input)))
      .render(({ data }) => render(data));
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

  // Define multiple tools at once
  defineTools(definitions: Record<string, {
    input?: z.ZodType<any>;
    execute: (params: any) => any;
    render?: (props: any) => ReactElement;
  }>): Record<string, Tool> {
    const tools: Record<string, Tool> = {};
    
    for (const [name, def] of Object.entries(definitions)) {
      const tool = this.tool(name);
      
      if (def.input) tool.input(def.input);
      tool.execute(def.execute);
      if (def.render) tool.render(def.render);
      
      tools[name] = tool;
    }
    
    return tools;
  }

  // Get a registered tool
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // Register an external tool
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  // List all tools
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Clear all tools
  clear(): void {
    this.tools.clear();
  }
}

// Create and export the global instance
const aui = new AUI();

// Re-export z from zod for convenience
export { z } from 'zod';
export { aui };
export default aui;