import { ReactElement } from 'react';
import { z } from 'zod';

type AUIContext = {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  aiAgent?: string;
};

type ToolConfig<I, O> = {
  name: string;
  description?: string;
  input?: z.ZodType<I>;
  execute: (params: { input: I; ctx?: AUIContext }) => Promise<O> | O;
  clientExecute?: (params: { input: I; ctx: AUIContext }) => Promise<O> | O;
  render?: (props: { data: O; input?: I; loading?: boolean; error?: Error }) => ReactElement;
  cache?: number; // TTL in ms
  retry?: number;
  timeout?: number;
};

class Tool<I = any, O = any> {
  private config: ToolConfig<I, O>;
  private cacheStore = new Map<string, { data: any; expires: number }>();

  constructor(name: string) {
    this.config = { name, execute: async () => null as any };
  }

  description(desc: string): this {
    this.config.description = desc;
    return this;
  }

  input<T>(schema: z.ZodType<T>): Tool<T, O> {
    this.config.input = schema as any;
    return this as any;
  }

  execute<R>(fn: (params: { input: I; ctx?: AUIContext }) => Promise<R> | R): Tool<I, R> {
    this.config.execute = fn as any;
    return this as any;
  }

  clientExecute(fn: (params: { input: I; ctx: AUIContext }) => Promise<O> | O): this {
    this.config.clientExecute = fn;
    return this;
  }

  render(component: (props: { data: O; input?: I; loading?: boolean; error?: Error }) => ReactElement): this {
    this.config.render = component;
    return this;
  }

  cache(ttl: number): this {
    this.config.cache = ttl;
    return this;
  }

  retry(attempts: number): this {
    this.config.retry = attempts;
    return this;
  }

  timeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  private getCacheKey(input: any): string {
    return `${this.config.name}:${JSON.stringify(input)}`;
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
    if (this.config.cache) {
      this.cacheStore.set(key, {
        data,
        expires: Date.now() + this.config.cache
      });
    }
  }

  async run(input: I, ctx?: AUIContext): Promise<O> {
    const validated = this.config.input ? this.config.input.parse(input) : input;
    const cacheKey = this.getCacheKey(validated);
    
    // Check cache
    if (this.config.cache) {
      const cached = this.checkCache(cacheKey);
      if (cached !== null) return cached;
    }

    const isClient = typeof window !== 'undefined';
    const executor = isClient && this.config.clientExecute ? this.config.clientExecute : this.config.execute;
    
    let lastError: Error | undefined;
    const attempts = this.config.retry || 1;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const promise = executor({ 
          input: validated, 
          ctx: ctx || { cache: new Map(), fetch, aiAgent: 'assistant' } 
        });
        
        let result: O;
        if (this.config.timeout) {
          result = await Promise.race([
            promise,
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
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

  get definition() {
    return this.config;
  }

  // For AI agents to understand tool capabilities
  get schema() {
    return {
      name: this.config.name,
      description: this.config.description,
      input: this.config.input ? this.config.input._def : undefined,
      features: {
        hasClientExecution: !!this.config.clientExecute,
        hasCaching: !!this.config.cache,
        hasRetry: !!this.config.retry,
        hasTimeout: !!this.config.timeout,
        hasRender: !!this.config.render
      }
    };
  }
}

// Main AUI API
const aui = {
  // Create a new tool
  tool: (name: string) => new Tool(name),
  
  // Tool registry
  registry: new Map<string, Tool>(),
  
  // Register a tool
  register: (tool: Tool) => {
    aui.registry.set(tool.definition.name, tool);
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

export default aui;
export { Tool, type AUIContext };