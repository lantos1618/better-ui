import { ReactElement } from 'react';
import { z } from 'zod';

export interface Context {
  cache: Map<string, any>;
  fetch: typeof fetch;
  user?: any;
  session?: any;
}

export class Tool<TInput = any, TOutput = any> {
  private _name: string;
  private _input?: z.ZodType<TInput>;
  private _execute: (params: { input: TInput; ctx?: Context }) => Promise<TOutput> | TOutput;
  private _clientExecute?: (params: { input: TInput; ctx: Context }) => Promise<TOutput> | TOutput;
  private _render?: (props: { data: TOutput; input?: TInput }) => ReactElement;

  constructor(name: string) {
    this._name = name;
    this._execute = async () => null as any;
  }

  input<T>(schema: z.ZodType<T>): Tool<T, TOutput> {
    this._input = schema as any;
    return this as any;
  }

  execute<O>(fn: (params: { input: TInput }) => Promise<O> | O): Tool<TInput, O> {
    this._execute = async (params) => await Promise.resolve(fn(params));
    return this as any;
  }

  clientExecute(fn: (params: { input: TInput; ctx: Context }) => Promise<TOutput> | TOutput): Tool<TInput, TOutput> {
    this._clientExecute = async (params) => await Promise.resolve(fn(params));
    return this;
  }

  render(component: (props: { data: TOutput }) => ReactElement): Tool<TInput, TOutput> {
    this._render = component;
    return this;
  }

  async run(input: TInput, ctx?: Context): Promise<TOutput> {
    const validated = this._input ? this._input.parse(input) : input;
    if (this._clientExecute && ctx) {
      return await Promise.resolve(this._clientExecute({ input: validated, ctx }));
    }
    return await Promise.resolve(this._execute({ input: validated, ctx }));
  }

  get name() { return this._name; }
  get schema() { return this._input; }
  get renderFn() { return this._render; }
}

class AUI {
  private tools = new Map<string, Tool>();

  tool(name: string): Tool {
    const t = new Tool(name);
    this.tools.set(name, t);
    return t;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  async execute<T = any>(name: string, input: T, ctx?: Context): Promise<any> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return await tool.run(input, ctx);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  clear(): void {
    this.tools.clear();
  }
}

export const aui = new AUI();
export { z } from 'zod';
export default aui;