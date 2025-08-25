import { ReactElement } from 'react';
import { z } from 'zod';

export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
  env?: Record<string, string>;
}

export class AUITool<TInput = any, TOutput = any> {
  private config: {
    name: string;
    inputSchema?: z.ZodType<TInput>;
    executeHandler?: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
    clientHandler?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
    renderHandler?: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement;
  } = { name: '' };

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
    
    // Use clientHandler if it exists and we have a context (indicating client-side execution)
    if (ctx && this.config.clientHandler) {
      return await Promise.resolve(this.config.clientHandler({ input: validated, ctx: context }));
    }
    
    if (!this.config.executeHandler) {
      throw new Error(`Tool ${this.config.name} has no execute handler`);
    }
    
    return await Promise.resolve(this.config.executeHandler({ input: validated, ctx: context }));
  }
  
  private createDefaultContext(): AUIContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
    };
  }

  get name() { return this.config.name; }
  get schema() { return this.config.inputSchema; }
  get renderer() { return this.config.renderHandler; }
  
  toJSON() {
    return {
      name: this.config.name,
      hasInput: !!this.config.inputSchema,
      hasExecute: !!this.config.executeHandler,
      hasClientExecute: !!this.config.clientHandler,
      hasRender: !!this.config.renderHandler
    };
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
}

const aui: AUI = new AUI();

export type InferToolInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferToolOutput<T> = T extends AUITool<any, infer O> ? O : never;

export { z } from 'zod';
export { AUITool };
export default aui;