import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  isClient?: boolean;
}

interface ToolDef<TInput = any, TOutput = any> {
  name: string;
  input?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input?: TInput; error?: Error }) => ReactElement;
  onError?: (error: Error, input: TInput) => void;
  retry?: number;
  timeout?: number;
  cache?: boolean | number; // boolean or TTL in ms
}

// Enhanced Tool class with better server/client separation
class AUITool<TInput = any, TOutput = any> {
  private def: ToolDef<TInput, TOutput>;
  private aui?: EnhancedAUI;
  
  constructor(name: string, aui?: EnhancedAUI) {
    this.def = { name, execute: async () => null as any };
    this.aui = aui;
  }

  input<T>(schema: z.ZodType<T>): AUITool<T, TOutput> {
    this.def.input = schema as any;
    return this as any;
  }

  execute<O>(fn: (params: { input: TInput; ctx?: AUIContext }) => Promise<O> | O): AUITool<TInput, O> {
    this.def.execute = async (params) => await Promise.resolve(fn(params));
    return this as any;
  }

  clientExecute(fn: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput): this {
    this.def.clientExecute = async (params) => await Promise.resolve(fn(params));
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput; error?: Error }) => ReactElement): this {
    this.def.render = component;
    return this;
  }

  onError(handler: (error: Error, input: TInput) => void): this {
    this.def.onError = handler;
    return this;
  }

  retry(count: number): this {
    this.def.retry = count;
    return this;
  }

  timeout(ms: number): this {
    this.def.timeout = ms;
    return this;
  }

  cache(ttl?: boolean | number): this {
    this.def.cache = ttl ?? true;
    return this;
  }

  // Runtime execution with retry and timeout
  async run(input: TInput, ctx?: AUIContext): Promise<TOutput> {
    const validated = this.def.input ? this.def.input.parse(input) : input;
    
    // Merge global context with provided context
    const mergedContext = this.aui ? {
      ...this.aui.getContext(),
      ...(ctx || {})
    } : ctx;
    
    // Check cache if enabled
    if (this.def.cache && mergedContext?.cache) {
      const cacheKey = `${this.def.name}:${JSON.stringify(validated)}`;
      const cached = mergedContext.cache.get(cacheKey);
      if (cached) return cached;
    }

    // Determine which executor to use
    const isClient = typeof window !== 'undefined' || mergedContext?.isClient;
    const executor = isClient && this.def.clientExecute ? this.def.clientExecute : this.def.execute;
    
    let attempts = 0;
    const maxAttempts = this.def.retry || 1;
    
    while (attempts < maxAttempts) {
      try {
        const promise = executor({ input: validated, ctx: mergedContext });
        
        // Apply timeout if specified
        const result = this.def.timeout
          ? await Promise.race([
              promise,
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), this.def.timeout)
              )
            ])
          : await promise;
        
        // Cache result if enabled
        if (this.def.cache && mergedContext?.cache) {
          const cacheKey = `${this.def.name}:${JSON.stringify(validated)}`;
          mergedContext.cache.set(cacheKey, result);
          
          // Set TTL if specified as number
          if (typeof this.def.cache === 'number') {
            setTimeout(() => mergedContext.cache.delete(cacheKey), this.def.cache);
          }
        }
        
        return result;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          if (this.def.onError) {
            this.def.onError(error as Error, validated);
          }
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100));
      }
    }
    
    throw new Error('Max attempts reached');
  }

  // Get definition
  get name() { return this.def.name; }
  toJSON() { return this.def; }
}

// Main Enhanced AUI class
class EnhancedAUI {
  private tools = new Map<string, AUITool>();
  private globalContext: AUIContext = {
    cache: new Map(),
    fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available')))
  };

  // Core method - creates tool
  tool(name: string): AUITool {
    const t = new AUITool(name, this);
    this.tools.set(name, t);
    return t;
  }

  // Get global context
  getContext(): AUIContext {
    return this.globalContext;
  }

  // Shorthand alias
  t(name: string): AUITool {
    return this.tool(name);
  }

  // Get tool
  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  // Execute by name
  async execute<T = any>(name: string, input: any, ctx?: Partial<AUIContext>): Promise<T> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, { ...this.globalContext, ...ctx });
  }

  // List tools
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  // Set global context
  setContext(ctx: Partial<AUIContext>): void {
    Object.assign(this.globalContext, ctx);
  }

  // Clear cache
  clearCache(): void {
    this.globalContext.cache.clear();
  }

  // Batch execute multiple tools
  async batch<T extends Record<string, any>>(
    executions: Array<{ tool: string; input: any }>
  ): Promise<T[]> {
    return Promise.all(
      executions.map(({ tool, input }) => this.execute(tool, input))
    ) as Promise<T[]>;
  }

  // Create a server action (Next.js App Router)
  serverAction<TInput, TOutput>(
    name: string,
    schema: z.ZodType<TInput>,
    handler: (input: TInput) => Promise<TOutput>
  ) {
    'use server';
    return this.tool(name)
      .input(schema)
      .execute(async ({ input }) => await handler(input));
  }

  // Create a client action
  clientAction<TInput, TOutput>(
    name: string,
    schema: z.ZodType<TInput>,
    handler: (input: TInput, ctx: AUIContext) => Promise<TOutput>
  ) {
    return this.tool(name)
      .input(schema)
      .clientExecute(async ({ input, ctx }) => await handler(input, ctx));
  }
}

// Create global instance
const aui = new EnhancedAUI();

// Type helpers
export type InferInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferOutput<T> = T extends AUITool<any, infer O> ? O : never;

// Exports
export { aui, AUITool, EnhancedAUI, z };
export default aui;