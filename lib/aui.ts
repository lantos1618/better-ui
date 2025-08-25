import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  aiAgent?: string;
  metadata?: Record<string, any>;
  stream?: boolean;
}

interface ToolDef<TInput = any, TOutput = any> {
  name: string;
  description?: string;
  input?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement;
  cache?: number; // TTL in ms
  retry?: number;
  timeout?: number;
  stream?: boolean;
  permissions?: string[];
}

// Tool class - returns built tool on every method
class AUITool<TInput = any, TOutput = any> {
  private def: ToolDef<TInput, TOutput>;
  private cacheStore = new Map<string, { data: any; expires: number }>();
  
  constructor(name: string, def?: ToolDef<TInput, TOutput>) {
    this.def = def || { name, execute: async () => null as any };
  }

  private clone<I = TInput, O = TOutput>(): AUITool<I, O> {
    return new AUITool(this.def.name, { ...this.def } as any);
  }

  description(desc: string): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.description = desc;
    return tool;
  }

  input<T>(schema: z.ZodType<T>): AUITool<T, TOutput> {
    const tool = this.clone<T, TOutput>();
    tool.def.input = schema as any;
    return tool;
  }

  execute<O>(fn: (params: { input: TInput; ctx?: AUIContext }) => Promise<O> | O): AUITool<TInput, O> {
    const tool = this.clone<TInput, O>();
    tool.def.execute = fn as any;
    // Auto-register on execute
    aui.registry.set(tool.def.name, tool as any);
    return tool;
  }

  clientExecute(fn: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.clientExecute = fn;
    return tool;
  }

  render(component: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.render = component;
    return tool;
  }

  cache(ttl: number): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.cache = ttl;
    return tool;
  }

  retry(attempts: number): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.retry = attempts;
    return tool;
  }

  timeout(ms: number): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.timeout = ms;
    return tool;
  }

  stream(enabled: boolean = true): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.stream = enabled;
    return tool;
  }

  permissions(...perms: string[]): AUITool<TInput, TOutput> {
    const tool = this.clone();
    tool.def.permissions = perms;
    return tool;
  }

  private getCacheKey(input: any): string {
    return `${this.def.name}:${JSON.stringify(input)}`;
  }

  private checkCache(key: string): any | null {
    const cached = this.cacheStore.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cacheStore.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    if (this.def.cache) {
      this.cacheStore.set(key, {
        data,
        expires: Date.now() + this.def.cache
      });
    }
  }

  // Runtime execution
  async run(input: TInput, ctx?: AUIContext): Promise<TOutput> {
    const validated = this.def.input ? this.def.input.parse(input) : input;
    const cacheKey = this.getCacheKey(validated);
    
    // Create context
    const context = ctx || { 
      cache: new Map(), 
      fetch: typeof window !== 'undefined' ? window.fetch : global.fetch,
      aiAgent: 'assistant',
      stream: this.def.stream
    };
    
    // Check cache
    if (this.def.cache) {
      const cached = this.checkCache(cacheKey);
      if (cached !== null) return cached;
    }

    const isClient = typeof window !== 'undefined';
    const executor = isClient && this.def.clientExecute ? this.def.clientExecute : this.def.execute;
    
    let lastError: Error | undefined;
    const attempts = this.def.retry || 1;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const promise = executor({ 
          input: validated, 
          ctx: context
        });
        
        let result: TOutput;
        if (this.def.timeout) {
          result = await Promise.race([
            promise,
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), this.def.timeout)
            )
          ]);
        } else {
          result = await promise;
        }
        
        this.setCache(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError || new Error('Unknown error');
  }

  // Get definition
  get name() { return this.def.name; }
  get definition() { return this.def; }
  
  // For AI agents
  get schema() {
    return {
      name: this.def.name,
      description: this.def.description,
      input: this.def.input ? (this.def.input as any)._def : undefined,
      features: {
        hasClientExecution: !!this.def.clientExecute,
        hasCaching: !!this.def.cache,
        hasRetry: !!this.def.retry,
        hasTimeout: !!this.def.timeout,
        hasRender: !!this.def.render,
        hasStream: !!this.def.stream,
        hasPermissions: !!this.def.permissions
      }
    };
  }
}

// Main AUI API
const aui = {
  // Create a new tool - returns built tool immediately
  tool: (name: string) => new AUITool(name),
  
  // Tool registry
  registry: new Map<string, AUITool>(),
  
  // Register a tool
  register: (tool: AUITool) => {
    aui.registry.set(tool.name, tool);
    return tool;
  },
  
  // Get a registered tool
  get: (name: string) => aui.registry.get(name),
  
  // List all tools (for AI discovery)
  list: () => Array.from(aui.registry.values()).map(t => t.schema),
  
  // Execute any registered tool
  execute: async (name: string, input: any, ctx?: AUIContext) => {
    const tool = aui.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool.run(input, ctx);
  },
  
  // Batch execute multiple tools
  batch: async (executions: Array<{ tool: string; input: any }>, ctx?: AUIContext) => {
    return Promise.all(
      executions.map(({ tool, input }) => aui.execute(tool, input, ctx))
    );
  },
  
  // Create context for client/server
  context: (overrides?: Partial<AUIContext>): AUIContext => ({
    cache: new Map(),
    fetch: typeof window !== 'undefined' ? window.fetch : global.fetch,
    aiAgent: 'assistant',
    ...overrides
  })
};

// Type helpers
export type InferInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferOutput<T> = T extends AUITool<any, infer O> ? O : never;

// Exports
export { aui, AUITool, z };
export default aui;