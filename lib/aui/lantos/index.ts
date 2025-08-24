import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface ToolContext {
  cache: Map<string, any>;
  fetch: (url: string, options?: any) => Promise<any>;
  user?: any;
  session?: any;
}

// Fluent builder interface
export interface ITool<TInput = any, TOutput = any> {
  // Properties
  name: string;
  inputSchema?: z.ZodType<TInput>;
  metadata?: Record<string, any>;
  
  // Chainable methods
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput>;
  execute<O>(handler: (params: { input: TInput; ctx?: ToolContext }) => Promise<O> | O): Tool<TInput, O>;
  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput>;
  render(component: (props: { data: TOutput; input?: TInput }) => ReactElement): Tool<TInput, TOutput>;
  
  // Runtime methods
  run(input: TInput, ctx?: ToolContext): Promise<TOutput>;
  renderResult(data: TOutput, input?: TInput): ReactElement | null;
}

export class Tool<TInput = any, TOutput = any> implements ITool<TInput, TOutput> {
  name: string;
  inputSchema?: z.ZodType<TInput>;
  metadata?: Record<string, any> = {};
  
  private registry?: Map<string, Tool>;
  private _execute: (params: { input: TInput; ctx?: ToolContext }) => Promise<TOutput> = async () => null as any;
  private _clientExecute?: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput>;
  private _render?: (props: { data: TOutput; input?: TInput }) => ReactElement;

  constructor(name: string, registry?: Map<string, Tool>) {
    this.name = name;
    this.registry = registry;
    // Auto-register when created
    if (registry) {
      registry.set(name, this as any);
    }
  }

  // Chainable methods
  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this.inputSchema = schema as any;
    return this as any;
  }

  execute<O>(handler: (params: { input: TInput; ctx?: ToolContext }) => Promise<O> | O): Tool<TInput, O> {
    this._execute = async (params) => await Promise.resolve(handler(params));
    return this as any;
  }

  clientExecute(handler: (params: { input: TInput; ctx: ToolContext }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput> {
    this._clientExecute = async (params) => await Promise.resolve(handler(params));
    return this;
  }

  render(component: (props: { data: TOutput; input?: TInput }) => ReactElement): Tool<TInput, TOutput> {
    this._render = component;
    return this;
  }

  // Runtime methods
  async run(input: TInput, ctx?: ToolContext): Promise<TOutput> {
    const validatedInput = this.inputSchema ? this.inputSchema.parse(input) : input;
    
    if (ctx && this._clientExecute) {
      return await this._clientExecute({ input: validatedInput, ctx });
    }
    
    return await this._execute({ input: validatedInput, ctx });
  }

  renderResult(data: TOutput, input?: TInput): ReactElement | null {
    return this._render ? this._render({ data, input }) : null;
  }
}

// Main AUI class
class AUI {
  private tools = new Map<string, Tool>();

  // Create a tool - returns a chainable builder
  tool(name: string): Tool {
    const tool = new Tool(name, this.tools);
    return tool;
  }

  // Get a registered tool
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // List all tools
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Clear all tools
  clear() {
    this.tools.clear();
  }

  // Check if a tool exists
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // Create a context with default values
  createContext(additions?: Partial<ToolContext>): ToolContext {
    return {
      cache: new Map(),
      fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('Fetch not available'))),
      ...additions
    };
  }
}

// Create the global instance
const aui = new AUI();

export { aui, z } from 'zod';
export default aui;