import { ReactElement } from 'react';
import { z } from 'zod';

// Core types
export interface AUIContext {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
}

interface ToolDef<TInput = any, TOutput = any> {
  name: string;
  input?: z.ZodType<TInput>;
  execute: (params: { input: TInput; ctx?: AUIContext }) => Promise<TOutput> | TOutput;
  clientExecute?: (params: { input: TInput; ctx: AUIContext }) => Promise<TOutput> | TOutput;
  render?: (props: { data: TOutput; input?: TInput }) => ReactElement;
}

// Tool class - auto-builds via Proxy
class AUITool<TInput = any, TOutput = any> {
  private def: ToolDef<TInput, TOutput>;
  
  constructor(name: string) {
    this.def = { name, execute: async () => null as any };
    
    // Auto-build via Proxy when tool is accessed
    return new Proxy(this, {
      get: (target, prop) => {
        const value = target[prop as keyof AUITool<TInput, TOutput>];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        // Check if tool is complete (has execute and render)
        if (prop === 'run' || prop === 'render' || prop === 'toJSON') {
          return value;
        }
        return value;
      }
    }) as AUITool<TInput, TOutput>;
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

  render(component: (props: { data: TOutput; input?: TInput }) => ReactElement): this {
    this.def.render = component;
    return this;
  }

  // Runtime execution
  async run(input: TInput, ctx?: AUIContext): Promise<TOutput> {
    const validated = this.def.input ? this.def.input.parse(input) : input;
    if (this.def.clientExecute && ctx) {
      return await this.def.clientExecute({ input: validated, ctx });
    }
    return await this.def.execute({ input: validated, ctx });
  }

  // Get definition
  get name() { return this.def.name; }
  toJSON() { return this.def; }
}

// Main AUI class
class AUI {
  private tools = new Map<string, AUITool>();

  // Core method - creates auto-building tool
  tool(name: string): AUITool {
    const t = new AUITool(name);
    this.tools.set(name, t);
    return t;
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
  async execute<T = any>(name: string, input: any, ctx?: AUIContext): Promise<T> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx);
  }

  // List tools
  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Create global instance
const aui = new AUI();

// Type helpers
export type InferInput<T> = T extends AUITool<infer I, any> ? I : never;
export type InferOutput<T> = T extends AUITool<any, infer O> ? O : never;

// Exports
export { aui, AUITool, z };
export default aui;