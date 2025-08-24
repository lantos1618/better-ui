import { ReactElement } from 'react';
import { z } from 'zod';

export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
}

export class Tool<TInput = any, TOutput = any> {
  private config: {
    name: string;
    inputSchema?: z.ZodType<TInput>;
    executeHandler?: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> | TOutput;
    clientHandler?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput;
    renderHandler?: (props: { data: TOutput; input?: TInput }) => ReactElement;
  };

  constructor(name: string) {
    this.config = { name };
  }

  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this.config.inputSchema = schema as any;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: ToolContext }) => O | Promise<O>): Tool<TInput, O> {
    this.config.executeHandler = handler as any;
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => TOutput | Promise<TOutput>): this {
    this.config.clientHandler = handler;
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput }) => ReactElement): this {
    this.config.renderHandler = component;
    return this;
  }

  async run(input: TInput, ctx?: ToolContext): Promise<TOutput> {
    const validated = this.config.inputSchema ? this.config.inputSchema.parse(input) : input;
    
    if (ctx && this.config.clientHandler) {
      return await Promise.resolve(this.config.clientHandler({ input: validated, ctx }));
    }
    
    if (!this.config.executeHandler) {
      throw new Error(`Tool ${this.config.name} has no execute handler`);
    }
    
    return await Promise.resolve(this.config.executeHandler({ input: validated, ctx }));
  }

  renderResult(data: TOutput, input?: TInput): ReactElement | null {
    return this.config.renderHandler?.({ data, input }) || null;
  }

  get name() { return this.config.name; }
}

class AUI {
  private tools = new Map<string, Tool>();

  tool(name: string): Tool {
    const t = new Tool(name);
    this.tools.set(name, t);
    return t;
  }

  simple<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    execute: (input: TInput) => TOutput | Promise<TOutput>,
    render?: (data: TOutput) => ReactElement
  ): Tool<TInput, TOutput> {
    const t = this.tool(name)
      .input(inputSchema)
      .execute(({ input }) => execute(input));
    
    if (render) t.render(({ data }) => render(data));
    return t;
  }

  defineTools<T extends Record<string, {
    input?: z.ZodType<any>;
    execute: (input: any) => any;
    client?: (input: any, ctx: ToolContext) => any;
    render?: (data: any) => ReactElement;
  }>>(defs: T): { [K in keyof T]: Tool } {
    const result = {} as { [K in keyof T]: Tool };
    
    for (const [name, def] of Object.entries(defs)) {
      const t = this.tool(name);
      if (def.input) t.input(def.input);
      t.execute(({ input }) => def.execute(input));
      if (def.client) t.clientExecute(({ input, ctx }) => def.client(input, ctx));
      if (def.render) t.render(({ data }) => def.render(data));
      result[name as keyof T] = t;
    }
    
    return result;
  }

  aiTools<T extends Record<string, {
    input: z.ZodType<any>;
    execute: (input: any) => any;
    retry?: number;
    cache?: boolean;
    timeout?: number;
    render?: (data: any) => ReactElement;
  }>>(defs: T): { [K in keyof T]: Tool } {
    const result = {} as { [K in keyof T]: Tool };
    
    for (const [name, def] of Object.entries(defs)) {
      const t = this.tool(name).input(def.input);
      
      const executeWithRetry = async ({ input, ctx }: any) => {
        const retries = def.retry || 1;
        let lastError: any;
        
        for (let i = 0; i < retries; i++) {
          try {
            const promise = Promise.resolve(def.execute(input));
            if (def.timeout) {
              return await Promise.race([
                promise,
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), def.timeout)
                )
              ]);
            }
            return await promise;
          } catch (error) {
            lastError = error;
            if (i < retries - 1) {
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
            }
          }
        }
        throw lastError;
      };
      
      t.execute(executeWithRetry);
      
      if (def.cache) {
        t.clientExecute(async ({ input, ctx }) => {
          const key = `${name}:${JSON.stringify(input)}`;
          if (ctx.cache.has(key)) return ctx.cache.get(key);
          const result = await executeWithRetry({ input, ctx });
          ctx.cache.set(key, result);
          return result;
        });
      }
      
      if (def.render) t.render(({ data }) => def.render(data));
      result[name as keyof T] = t;
    }
    
    return result;
  }

  contextual<TInput, TOutput>(
    name: string,
    inputSchema: z.ZodType<TInput>,
    execute: (params: { input: TInput; ctx: ToolContext }) => TOutput | Promise<TOutput>,
    render?: (data: TOutput) => ReactElement
  ): Tool<TInput, TOutput> {
    const t = this.tool(name)
      .input(inputSchema)
      .execute(({ input, ctx }) => execute({ input, ctx: ctx || this.createContext() }));
    
    if (render) t.render(({ data }) => render(data));
    return t;
  }

  get(name: string): Tool | undefined { return this.tools.get(name); }

  async execute<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    ctx?: ToolContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx || this.createContext());
  }

  createContext(additions?: Partial<ToolContext>): ToolContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      ...additions,
    };
  }

  getTools(): Tool[] { return Array.from(this.tools.values()); }
  getToolNames(): string[] { return Array.from(this.tools.keys()); }
  has(name: string): boolean { return this.tools.has(name); }
  clear(): void { this.tools.clear(); }
  remove(name: string): boolean { return this.tools.delete(name); }
}

const aui = new AUI();

export type InferToolInput<T> = T extends Tool<infer I, any> ? I : never;
export type InferToolOutput<T> = T extends Tool<any, infer O> ? O : never;

export { z } from 'zod';
export { aui, Tool, type ToolContext };
export default aui;