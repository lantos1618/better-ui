import { ReactElement } from 'react';
import { z } from 'zod';

// Middleware type for intercepting tool execution
export type LantosMiddleware<TInput = any, TOutput = any> = (
  params: { input: TInput; ctx?: any; next: () => Promise<TOutput> }
) => Promise<TOutput>;

// Streaming support
export interface StreamingOptions {
  onChunk?: (chunk: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
}

// Core types for Lantos AUI
export interface LantosAUITool<TInput = any, TOutput = any> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: any }) => Promise<TOutput>;
  clientExecute?: (params: { input: TInput; ctx: any }) => Promise<TOutput>;
  render: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement;
  stream?: (params: { input: TInput; ctx?: any; options?: StreamingOptions }) => AsyncGenerator<any, void, unknown>;
  middleware?: LantosMiddleware<TInput, TOutput>[];
  isServerOnly?: boolean;
  description?: string;
  metadata?: Record<string, any>;
  retryOptions?: { maxRetries?: number; retryDelay?: number };
}

// Enhanced context for client-side execution
export interface LantosContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
  abortSignal?: AbortSignal;
  metrics?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

// Fluent builder that auto-finalizes when all required methods are called
class LantosToolBuilder<TInput = any, TOutput = any> {
  private tool: Partial<LantosAUITool<TInput, TOutput>> = {
    middleware: [],
    retryOptions: { maxRetries: 3, retryDelay: 1000 }
  };
  private finalized = false;
  
  constructor(name: string) {
    this.tool.name = name;
  }
  
  input<TSchema extends z.ZodType>(schema: TSchema): LantosToolBuilder<z.infer<TSchema>, TOutput> {
    this.tool.inputSchema = schema;
    return this as any;
  }
  
  execute<TNewOutput>(
    handler: (params: { input: TInput; ctx?: any }) => Promise<TNewOutput> | TNewOutput
  ): LantosToolBuilder<TInput, TNewOutput> & Partial<LantosAUITool<TInput, TNewOutput>> {
    this.tool.execute = async (params) => handler(params);
    
    // Check if we can auto-finalize
    if (this.tool.render && !this.finalized) {
      return this.finalize() as any;
    }
    
    // Return a proxy that allows render() to be called or properties to be accessed
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'render') {
          return target.render.bind(target);
        }
        if (prop === 'clientExecute') {
          return target.clientExecute.bind(target);
        }
        // Return tool properties if finalized
        if (this.finalized) {
          return (this.tool as any)[prop];
        }
        return (target as any)[prop];
      }
    }) as any;
  }
  
  clientExecute(
    handler: (params: { input: TInput; ctx: LantosContext }) => Promise<TOutput> | TOutput
  ): LantosToolBuilder<TInput, TOutput> & Partial<LantosAUITool<TInput, TOutput>> {
    this.tool.clientExecute = async (params) => handler(params);
    
    // Check if we can auto-finalize
    if (this.tool.execute && this.tool.render && !this.finalized) {
      return this.finalize() as any;
    }
    
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'render') {
          return target.render.bind(target);
        }
        // Return tool properties if finalized
        if (this.finalized) {
          return (this.tool as any)[prop];
        }
        return (target as any)[prop];
      }
    }) as any;
  }
  
  // Add middleware support
  use(
    middleware: LantosMiddleware<TInput, TOutput>
  ): LantosToolBuilder<TInput, TOutput> {
    if (!this.tool.middleware) {
      this.tool.middleware = [];
    }
    this.tool.middleware.push(middleware);
    return this;
  }
  
  // Add streaming support
  stream(
    handler: (params: { input: TInput; ctx?: any; options?: StreamingOptions }) => AsyncGenerator<any, void, unknown>
  ): LantosToolBuilder<TInput, TOutput> {
    this.tool.stream = handler;
    return this;
  }
  
  // Add retry configuration
  retry(maxRetries: number, retryDelay?: number): LantosToolBuilder<TInput, TOutput> {
    this.tool.retryOptions = { maxRetries, retryDelay: retryDelay || 1000 };
    return this;
  }
  
  // Add description for better documentation
  describe(description: string): LantosToolBuilder<TInput, TOutput> {
    this.tool.description = description;
    return this;
  }
  
  // Add metadata support
  meta(metadata: Record<string, any>): LantosToolBuilder<TInput, TOutput> {
    this.tool.metadata = { ...this.tool.metadata, ...metadata };
    return this;
  }
  
  render(
    component: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement
  ): LantosToolBuilder<TInput, TOutput> & LantosAUITool<TInput, TOutput> {
    this.tool.render = component;
    
    // Check if we have execute handler
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" must have an execute handler before render`);
    }
    
    // Return a proxy that allows clientExecute to be called or acts as the final tool
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'clientExecute' && !this.finalized) {
          return (handler: any) => {
            this.tool.clientExecute = async (params: any) => handler(params);
            return this.finalize();
          };
        }
        
        // Auto-finalize if accessing tool properties
        if (!this.finalized && prop !== 'clientExecute') {
          const finalTool = this.finalize();
          return (finalTool as any)[prop];
        }
        
        return (this.tool as any)[prop];
      }
    }) as any;
  }
  
  private finalize(): LantosAUITool<TInput, TOutput> {
    if (!this.tool.execute) {
      throw new Error(`Tool "${this.tool.name}" must have an execute handler`);
    }
    if (!this.tool.render) {
      throw new Error(`Tool "${this.tool.name}" must have a render method`);
    }
    
    // Set default input schema if not provided
    if (!this.tool.inputSchema) {
      this.tool.inputSchema = z.any() as any;
    }
    
    this.finalized = true;
    const finalTool = this.tool as LantosAUITool<TInput, TOutput>;
    
    // Register with global registry if needed
    if (typeof window !== 'undefined' && (window as any).__LANTOS_REGISTRY) {
      (window as any).__LANTOS_REGISTRY.register(finalTool);
    }
    
    return finalTool;
  }
}

// Main Lantos AUI API
class LantosAUI {
  tool(name: string): LantosToolBuilder {
    return new LantosToolBuilder(name);
  }
  
  // Registry for tools
  private registry = new Map<string, LantosAUITool>();
  
  register(tool: LantosAUITool): void {
    this.registry.set(tool.name, tool);
  }
  
  get(name: string): LantosAUITool | undefined {
    return this.registry.get(name);
  }
  
  list(): LantosAUITool[] {
    return Array.from(this.registry.values());
  }
  
  // Execute a tool by name with middleware and retry support
  async execute(name: string, input: any, ctx?: any): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    
    // Validate input if schema is provided
    if (tool.inputSchema) {
      const result = tool.inputSchema.safeParse(input);
      if (!result.success) {
        throw new Error(`Invalid input for tool "${name}": ${result.error.message}`);
      }
    }
    
    // Create execution function
    const executeFn = async () => {
      // Use client execute if available and we're on the client
      if (typeof window !== 'undefined' && tool.clientExecute && ctx) {
        return tool.clientExecute({ input, ctx });
      }
      return tool.execute({ input, ctx });
    };
    
    // Apply middleware chain
    let finalExecute = executeFn;
    if (tool.middleware && tool.middleware.length > 0) {
      finalExecute = async () => {
        let index = 0;
        const next = async (): Promise<any> => {
          if (index >= tool.middleware!.length) {
            return executeFn();
          }
          const middleware = tool.middleware![index++];
          return middleware({ input, ctx, next });
        };
        return next();
      };
    }
    
    // Execute with retry logic
    const { maxRetries = 3, retryDelay = 1000 } = tool.retryOptions || {};
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await finalExecute();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Use shorter delay for tests, exponential backoff in production
          const delay = process.env.NODE_ENV === 'test' 
            ? Math.min(retryDelay, 100) 
            : retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Execution failed');
  }
  
  // Stream execution for tools that support it
  async *stream(name: string, input: any, ctx?: any, options?: StreamingOptions): AsyncGenerator<any, void, unknown> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    
    if (!tool.stream) {
      throw new Error(`Tool "${name}" does not support streaming`);
    }
    
    // Validate input if schema is provided
    if (tool.inputSchema) {
      const result = tool.inputSchema.safeParse(input);
      if (!result.success) {
        throw new Error(`Invalid input for tool "${name}": ${result.error.message}`);
      }
    }
    
    try {
      for await (const chunk of tool.stream({ input, ctx, options })) {
        if (options?.onChunk) {
          options.onChunk(chunk);
        }
        yield chunk;
      }
      if (options?.onComplete) {
        options.onComplete(input);
      }
    } catch (error) {
      if (options?.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }
  
  // Batch execute multiple tools
  async executeBatch(
    requests: Array<{ name: string; input: any }>,
    ctx?: any
  ): Promise<Array<{ success: boolean; data?: any; error?: Error }>> {
    return Promise.all(
      requests.map(async ({ name, input }) => {
        try {
          const data = await this.execute(name, input, ctx);
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      })
    );
  }
}

// Export the singleton instance
export const aui = new LantosAUI();

// Also make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__LANTOS_AUI = aui;
  (window as any).__LANTOS_REGISTRY = aui;
}

export default aui;
export type { LantosAUITool, LantosContext };