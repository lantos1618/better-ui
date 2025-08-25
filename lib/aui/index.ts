import { ReactElement } from 'react';
import { z } from 'zod';

export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  env?: Record<string, string>;
  headers?: HeadersInit;
  cookies?: Record<string, string>;
  isServer?: boolean;
}

export interface ToolConfig<TInput, TOutput> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  executeHandler?: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
  clientHandler?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
  renderHandler?: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement;
  middleware?: Array<(params: { input: TInput; ctx: AUIContext; next: () => Promise<TOutput> }) => Promise<TOutput>>;
  description?: string;
  tags?: string[];
}

export class AUITool<TInput = any, TOutput = any> {
  private config: ToolConfig<TInput, TOutput> = { name: '' };

  constructor(name: string) {
    this.config.name = name;
  }

  input<T>(schema: z.ZodType<T>): AUITool<T, TOutput> {
    this.config.inputSchema = schema as any;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: AUIContext }) => O | Promise<O>): AUITool<TInput, O> {
    this.config.executeHandler = handler as any;
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: AUIContext }) => TOutput | Promise<TOutput>): this {
    this.config.clientHandler = handler;
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement): this {
    this.config.renderHandler = component;
    return this;
  }

  async run(input: TInput, ctx?: AUIContext): Promise<TOutput> {
    const validated = this.config.inputSchema ? this.config.inputSchema.parse(input) : input;
    
    const context = ctx || this.createDefaultContext();
    
    // Apply middleware if present
    if (this.config.middleware && this.config.middleware.length > 0) {
      let index = 0;
      const next = async (): Promise<TOutput> => {
        if (index >= this.config.middleware!.length) {
          return this.executeCore(validated, context);
        }
        const middleware = this.config.middleware![index++];
        return middleware({ input: validated, ctx: context, next });
      };
      return next();
    }
    
    return this.executeCore(validated, context);
  }
  
  private async executeCore(input: TInput, ctx: AUIContext): Promise<TOutput> {
    // Use clientHandler if it exists and we're on the client
    if (!ctx.isServer && this.config.clientHandler) {
      return await Promise.resolve(this.config.clientHandler({ input, ctx }));
    }
    
    if (!this.config.executeHandler) {
      throw new Error(`Tool ${this.config.name} has no execute handler`);
    }
    
    return await Promise.resolve(this.config.executeHandler({ input, ctx }));
  }
  
  private createDefaultContext(): AUIContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      isServer: typeof window === 'undefined',
    };
  }
  
  middleware(fn: (params: { input: TInput; ctx: AUIContext; next: () => Promise<TOutput> }) => Promise<TOutput>): this {
    if (!this.config.middleware) {
      this.config.middleware = [];
    }
    this.config.middleware.push(fn);
    return this;
  }
  
  describe(description: string): this {
    this.config.description = description;
    return this;
  }
  
  tag(...tags: string[]): this {
    if (!this.config.tags) {
      this.config.tags = [];
    }
    this.config.tags.push(...tags);
    return this;
  }

  get name() { return this.config.name; }
  get schema() { return this.config.inputSchema; }
  get renderer() { return this.config.renderHandler; }
  get description() { return this.config.description; }
  get tags() { return this.config.tags || []; }
  
  toJSON() {
    return {
      name: this.config.name,
      description: this.config.description,
      tags: this.config.tags,
      hasInput: !!this.config.inputSchema,
      hasExecute: !!this.config.executeHandler,
      hasClientExecute: !!this.config.clientHandler,
      hasRender: !!this.config.renderHandler,
      hasMiddleware: !!(this.config.middleware && this.config.middleware.length > 0)
    };
  }
  
  getConfig(): Readonly<ToolConfig<TInput, TOutput>> {
    return { ...this.config };
  }
}

export class AUI {
  private tools = new Map<string, AUITool>();

  tool(name: string): AUITool {
    const t = new AUITool(name);
    this.tools.set(name, t);
    return t;
  }

  get(name: string): AUITool | undefined {
    return this.tools.get(name);
  }

  async execute<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    ctx?: AUIContext
  ): Promise<TOutput> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx || this.createContext());
  }

  createContext(additions?: Partial<AUIContext>): AUIContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      isServer: typeof window === 'undefined',
      ...additions,
    };
  }

  getTools(): AUITool[] {
    return Array.from(this.tools.values());
  }

  list(): AUITool[] {
    return this.getTools();
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  clear(): void {
    this.tools.clear();
  }

  remove(name: string): boolean {
    return this.tools.delete(name);
  }
  
  findByTag(tag: string): AUITool[] {
    return this.getTools().filter(tool => tool.tags.includes(tag));
  }
  
  findByTags(...tags: string[]): AUITool[] {
    return this.getTools().filter(tool => 
      tags.every(tag => tool.tags.includes(tag))
    );
  }
}

const aui: AUI = new AUI();

export type InferToolInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferToolOutput<T> = T extends AUITool<any, infer O> ? O : never;

export type ToolDefinition<TInput = any, TOutput = any> = {
  tool: AUITool<TInput, TOutput>;
  input: TInput;
  output: TOutput;
};

export type ExtractTools<T> = T extends { [K in keyof T]: AUITool<infer I, infer O> }
  ? { [K in keyof T]: ToolDefinition<InferToolInput<T[K]>, InferToolOutput<T[K]>> }
  : never;

export { z } from 'zod';
export default aui;