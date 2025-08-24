import { ReactElement } from 'react';
import { z } from 'zod';

export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
}

export class Tool<TInput = any, TOutput = any> {
  private config: {
    name: string;
    inputSchema?: z.ZodType<TInput>;
    executeHandler?: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
    clientHandler?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
    renderHandler?: (props: { data: TOutput; input?: TInput; loading?: boolean; error?: Error }) => ReactElement;
  };

  constructor(name: string) {
    this.config = { name };
  }

  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this.config.inputSchema = schema as any;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: AUIContext }) => O | Promise<O>): Tool<TInput, O> {
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
    
    if (ctx && this.config.clientHandler) {
      return await Promise.resolve(this.config.clientHandler({ input: validated, ctx }));
    }
    
    if (!this.config.executeHandler) {
      throw new Error(`Tool ${this.config.name} has no execute handler`);
    }
    
    return await Promise.resolve(this.config.executeHandler({ input: validated, ctx }));
  }

  get name() { return this.config.name; }
  get schema() { return this.config.inputSchema; }
  get renderer() { return this.config.renderHandler; }
}

class LantosAUI {
  private tools = new Map<string, Tool>();

  tool(name: string): Tool {
    const t = new Tool(name);
    this.tools.set(name, t);
    return t;
  }

  get(name: string): Tool | undefined {
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

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  clear(): void {
    this.tools.clear();
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// Export the ultra-concise API
const aui = new LantosAUI();

export type InferInput<T> = T extends Tool<infer I, any> ? I : never;
export type InferOutput<T> = T extends Tool<any, infer O> ? O : never;

export { z } from 'zod';
export { aui, Tool, type AUIContext };
export default aui;